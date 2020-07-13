"use strict";
import * as THREE from '../build/three.module.js';
import {GLTFLoader} from "/jsm/loaders/GLTFLoader.js";
import { GUI } from '/jsm/libs/dat.gui.module.js';
import { OrbitControls } from '/jsm/controls/OrbitControls.js';
import { RectAreaLightHelper } from '/jsm/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from '/jsm/lights/RectAreaLightUniformsLib.js';

// shader injection for box projected cube environment mapping
var worldposReplace = /* glsl */`
#define BOX_PROJECTED_ENV_MAP
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )
  vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
  #ifdef BOX_PROJECTED_ENV_MAP
    vWorldPosition = worldPosition.xyz;
  #endif
#endif
`;

var envmapPhysicalParsReplace = /* glsl */`
#if defined( USE_ENVMAP )
  #define BOX_PROJECTED_ENV_MAP
  #ifdef BOX_PROJECTED_ENV_MAP
    uniform vec3 cubeMapSize;
    uniform vec3 cubeMapPos;
    varying vec3 vWorldPosition;
    vec3 parallaxCorrectNormal( vec3 v, vec3 cubeSize, vec3 cubePos ) {
      vec3 nDir = normalize( v );
      vec3 rbmax = ( .5 * cubeSize + cubePos - vWorldPosition ) / nDir;
      vec3 rbmin = ( -.5 * cubeSize + cubePos - vWorldPosition ) / nDir;
      vec3 rbminmax;
      rbminmax.x = ( nDir.x > 0. ) ? rbmax.x : rbmin.x;
      rbminmax.y = ( nDir.y > 0. ) ? rbmax.y : rbmin.y;
      rbminmax.z = ( nDir.z > 0. ) ? rbmax.z : rbmin.z;
      float correction = min( min( rbminmax.x, rbminmax.y ), rbminmax.z );
      vec3 boxIntersection = vWorldPosition + nDir * correction;
      return boxIntersection - cubePos;
    }
  #endif
  #ifdef ENVMAP_MODE_REFRACTION
    uniform float refractionRatio;
  #endif
  vec3 getLightProbeIndirectIrradiance( /*const in SpecularLightProbe specularLightProbe,*/ const in GeometricContext geometry, const in int maxMIPLevel ) {
    vec3 worldNormal = inverseTransformDirection( geometry.normal, viewMatrix );
    #ifdef ENVMAP_TYPE_CUBE
      #ifdef BOX_PROJECTED_ENV_MAP
        worldNormal = parallaxCorrectNormal( worldNormal, cubeMapSize, cubeMapPos );
      #endif
      vec3 queryVec = vec3( flipEnvMap * worldNormal.x, worldNormal.yz );
      // TODO: replace with properly filtered cubemaps and access the irradiance LOD level, be it the last LOD level
      // of a specular cubemap, or just the default level of a specially created irradiance cubemap.
      #ifdef TEXTURE_LOD_EXT
        vec4 envMapColor = textureCubeLodEXT( envMap, queryVec, float( maxMIPLevel ) );
      #else
        // force the bias high to get the last LOD level as it is the most blurred.
        vec4 envMapColor = textureCube( envMap, queryVec, float( maxMIPLevel ) );
      #endif
      envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;
    #elif defined( ENVMAP_TYPE_CUBE_UV )
      vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
    #else
      vec4 envMapColor = vec4( 0.0 );
    #endif
    return PI * envMapColor.rgb * envMapIntensity;
  }
  // Trowbridge-Reitz distribution to Mip level, following the logic of http://casual-effects.blogspot.ca/2011/08/plausible-environment-lighting-in-two.html
  float getSpecularMIPLevel( const in float roughness, const in int maxMIPLevel ) {
    float maxMIPLevelScalar = float( maxMIPLevel );
    float sigma = PI * roughness * roughness / ( 1.0 + roughness );
    float desiredMIPLevel = maxMIPLevelScalar + log2( sigma );
    // clamp to allowable LOD ranges.
    return clamp( desiredMIPLevel, 0.0, maxMIPLevelScalar );
  }
  vec3 getLightProbeIndirectRadiance( /*const in SpecularLightProbe specularLightProbe,*/ const in vec3 viewDir, const in vec3 normal, const in float roughness, const in int maxMIPLevel ) {
    #ifdef ENVMAP_MODE_REFLECTION
      vec3 reflectVec = reflect( -viewDir, normal );
      // Mixing the reflection with the normal is more accurate and keeps rough objects from gathering light from behind their tangent plane.
      reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
    #else
      vec3 reflectVec = refract( -viewDir, normal, refractionRatio );
    #endif
    reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
    float specularMIPLevel = getSpecularMIPLevel( roughness, maxMIPLevel );
    #ifdef ENVMAP_TYPE_CUBE
      #ifdef BOX_PROJECTED_ENV_MAP
        reflectVec = parallaxCorrectNormal( reflectVec, cubeMapSize, cubeMapPos );
      #endif
      vec3 queryReflectVec = vec3( flipEnvMap * reflectVec.x, reflectVec.yz );
      #ifdef TEXTURE_LOD_EXT
        vec4 envMapColor = textureCubeLodEXT( envMap, queryReflectVec, specularMIPLevel );
      #else
        vec4 envMapColor = textureCube( envMap, queryReflectVec, specularMIPLevel );
      #endif
      envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;
    #elif defined( ENVMAP_TYPE_CUBE_UV )
      vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
    #elif defined( ENVMAP_TYPE_EQUIREC )
      vec2 sampleUV = equirectUv( reflectVec );
      #ifdef TEXTURE_LOD_EXT
        vec4 envMapColor = texture2DLodEXT( envMap, sampleUV, specularMIPLevel );
      #else
        vec4 envMapColor = texture2D( envMap, sampleUV, specularMIPLevel );
      #endif
      envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;
    #endif
    return envMapColor.rgb * envMapIntensity;
  }
#endif
`;

// scene size
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;

// camera
var VIEW_ANGLE = 45;
var ASPECT = WIDTH / HEIGHT;
var NEAR = 1;
var FAR = 800;

var camera, cubeCamera, scene, renderer;

var cameraControls;

var groundPlane, wallMat;

init();

function init() {

  var container = document.getElementById( 'container' );

  // renderer
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( WIDTH, HEIGHT );
  container.appendChild( renderer.domElement );

  // gui controls
  var gui = new GUI();
  var params = {
    'box projected': true
  };
  var bpcemGui = gui.add( params, 'box projected' );

  bpcemGui.onChange( function ( value ) {

    if ( value ) {

      groundPlane.material = boxProjectedMat;

    } else {

      groundPlane.material = defaultMat;

    }

    render();

  } );

  // scene
  scene = new THREE.Scene();

  // camera
  camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
  camera.position.set( 256, 106, - 5 );

  cameraControls = new OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, - 10, 0 );
  cameraControls.maxDistance = 400;
  cameraControls.minDistance = 10;
  cameraControls.addEventListener( 'change', render );
  cameraControls.update();

  // cube camera for environment map

  var cubeRenderTarget = new THREE.WebGLCubeRenderTarget( 512, {
    format: THREE.RGBFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
  } );
  cubeCamera = new THREE.CubeCamera( 2, 1, cubeRenderTarget );

  cubeCamera.position.set( 0, 1000, 0 );
  scene.add( cubeCamera );

  // ground floor ( with box projected environment mapping )
  var loader = new THREE.TextureLoader();
  var rMap = loader.load( '/assets/models/textures/hardwood2_diffuse.jpg' );
  rMap.wrapS = THREE.RepeatWrapping;
  rMap.wrapT = THREE.RepeatWrapping;
  rMap.repeat.set( 10, 10 );

  var defaultMat = new THREE.MeshPhysicalMaterial( {
    roughness: 1,
    envMap: cubeRenderTarget.texture,
    roughnessMap: rMap
  } );

  var boxProjectedMat = new THREE.MeshPhysicalMaterial( {
    color: new THREE.Color( '#ffffff' ),
    roughness: 1,
    envMap: cubeRenderTarget.texture,
    roughnessMap: rMap
  } );

  boxProjectedMat.onBeforeCompile = function ( shader ) {

    //these parameters are for the cubeCamera texture
    shader.uniforms.cubeMapSize = { value: new THREE.Vector3( 200, 200, 100 ) };
    shader.uniforms.cubeMapPos = { value: new THREE.Vector3( 0, - 50, 0 ) };

    //replace shader chunks with box projection chunks
    shader.vertexShader = 'varying vec3 vWorldPosition;\n' + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      worldposReplace
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <envmap_physical_pars_fragment>',
      envmapPhysicalParsReplace
    );

  };

  groundPlane = new THREE.Mesh( new THREE.PlaneBufferGeometry( 500, 300, 300 ), boxProjectedMat );
  groundPlane.rotateX( - Math.PI / 2 );
  groundPlane.position.set( 0, - 100, 0 );
  scene.add( groundPlane );

  // paredes de ladrillo
  var diffuseTex = loader.load( '/assets/models/textures/brick_diffuse.jpg', function () {

    updateCubeMap();

  } );
  diffuseTex.wrapS = THREE.RepeatWrapping;
  diffuseTex.wrapT = THREE.RepeatWrapping;
  diffuseTex.repeat.set( 5,5 );

  var bumpTex = loader.load( '/assets/models/textures/brick_bump.jpg', function () {

    updateCubeMap();

  } );
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set( 100, 100 );

  wallMat = new THREE.MeshPhysicalMaterial( {
    map: diffuseTex,
    bumpMap: bumpTex,
    bumpScale: 0.1,
  } );

//posiciones de las paredes y tamano
  var planeGeo = new THREE.PlaneBufferGeometry( 300, 250 );

  var planeBack1 = new THREE.Mesh( planeGeo, wallMat );
  planeBack1.position.z = - 150;
  planeBack1.position.x = - 50;
  scene.add( planeBack1 );

  var planeBack2 = new THREE.Mesh( planeGeo, wallMat );
  planeBack2.position.z = - 150;
  planeBack2.position.x = 50;
  scene.add( planeBack2 );

  var planeFront1 = new THREE.Mesh( planeGeo, wallMat );
  planeFront1.position.z = 150;
  planeFront1.position.x = - 50;
  planeFront1.rotateY( Math.PI );
  scene.add( planeFront1 );

  var planeFront2 = new THREE.Mesh( planeGeo, wallMat );
  planeFront2.position.z = 150;
  planeFront2.position.x = 50;
  planeFront2.rotateY( Math.PI );
  scene.add( planeFront2 );

  var planeRight = new THREE.Mesh( planeGeo, wallMat );
  planeRight.position.x =200;
  planeRight.rotateY( - Math.PI / 2 );
  scene.add( planeRight );

  var planeLeft = new THREE.Mesh( planeGeo, wallMat );
  planeLeft.position.x = - 200;
  planeLeft.rotateY( Math.PI / 2 );
  scene.add( planeLeft );

  //lights
  var width = 200;
  var height = 100;
  var intensity = 5;

  RectAreaLightUniformsLib.init();

  var blueRectLight = new THREE.RectAreaLight( 0xf3aaaa, intensity, width, height );
  blueRectLight.position.set( 200, 5, 0 );
  blueRectLight.lookAt( 10, 5, 0 );
  //scene.add( blueRectLight );

  var blueRectLightHelper = new RectAreaLightHelper( blueRectLight, 0xffffff );
  blueRectLight.add( blueRectLightHelper );

  var redRectLight = new THREE.RectAreaLight( 0x9aaeff, intensity, width, height );
  redRectLight.position.set( -200, 5, 0 );
  redRectLight.lookAt( 100, 5, 0 );
  scene.add( redRectLight );

  var redRectLightHelper = new RectAreaLightHelper( redRectLight, 0xffffff );
  redRectLight.add( redRectLightHelper );

  //groupSillas

  var chair = new GLTFLoader().load( "/assets/models/scene.gltf", function ( gltf ) {
  chair = gltf.scene;
  //posicion silla,
  if (chair){
    chair.position.y = -90;
    chair.position.x = -70;
    chair.position.z = 0;
    //x+=50;
    chair.rotation.y+=-1;
    //escala
    chair.scale.set(0.02,0.02,0.02);

    scene.add(chair);
    //if(i==4){
    //  x+=200;
    //}
  }


  }, undefined, function ( error ) {

          console.error( error );

  } );


  render();

}

function updateCubeMap() {

  //disable specular highlights on walls in the environment map
  wallMat.roughness = 1;

  groundPlane.visible = false;

  cubeCamera.position.copy( groundPlane.position );

  cubeCamera.update( renderer, scene );

  wallMat.roughness = 0.6;

  groundPlane.visible = true;

  render();

}

function render() {

  renderer.render( scene, camera );

}
