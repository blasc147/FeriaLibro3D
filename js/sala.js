"use strict";
import * as THREE from '../build/three.module.js';
import { GUI } from '../jsm/libs/dat.gui.module.js';
import { OrbitControls } from '../jsm/controls/OrbitControls.js';
import { RectAreaLightHelper } from '../jsm/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from '../jsm/lights/RectAreaLightUniformsLib.js';
//import { CSS3DRenderer, CSS3DObject } from '/jsm/renderers/CSS3DRenderer.js';
import {OBJLoader} from "../jsm/loaders/OBJLoader.js";


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
var Element = function ( id, x, y, z, ry ) {

				var div = document.createElement( 'div' );
				div.style.width = '480px';
				div.style.height = '360px';
				div.style.backgroundColor = '#000';

				var iframe = document.createElement( 'iframe' );
				iframe.style.width = '480px';
				iframe.style.height = '360px';
				iframe.style.border = '0px';
				iframe.src = [ 'https://www.youtube.com/embed/', id, '?rel=0' ].join( '' );
				div.appendChild( iframe );

				var object = new CSS3DObject( div );
				object.position.set( x, y, z );
				object.rotation.y = ry;

				return object;

			};
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
  //crear escena
  createScene();


  //actualizar escena
  update();

}

function createScene(){
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
  camera.position.set( 312, 56, - 130 );


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

  // piso
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



  groundPlane = new THREE.Mesh( new THREE.PlaneBufferGeometry( 500, 300, 300 ), defaultMat );
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
  var intensity = 6;

  RectAreaLightUniformsLib.init();

  //var blueRectLight = new THREE.RectAreaLight( 0xf3aaaa, intensity, width, height );
  //blueRectLight.position.set( 200, 5, 0 );
  //blueRectLight.lookAt( 10, 5, 0 );
  //scene.add( blueRectLight );

//  var blueRectLightHelper = new RectAreaLightHelper( blueRectLight, 0xffffff );
  //blueRectLight.add( blueRectLightHelper );

  var redRectLight = new THREE.RectAreaLight( 0x9aaeff, intensity, width, height );
  redRectLight.position.set( -200, 5, 0 );
  redRectLight.lookAt( 100, 5, 0 );
  scene.add( redRectLight );

  var redRectLightHelper = new RectAreaLightHelper( redRectLight, 0xffffff );
  redRectLight.add( redRectLightHelper );

  //groupSillas
  //chair.position.y = -90;
  //chair.position.x = -70;
  //chair.position.z = 0;

  var posiX=-75;
  var posiz=-45;
  var posiy=-90;

createSillas(-80, -130,-90, 1.4);
createSillas(posiX, posiz,posiy,1.58);
createSillas(posiX, 0,posiy,1.58);
createSillas(posiX, 85,posiy,1.8);





  render();
}

function createSillas(x,z,y, rota){

  var chair;
  var groupSillas = new THREE.Group();
    for(let i=0;i<=6;i++){
      // instantiate a loader
        var loader = new OBJLoader();

        // load a resource
        loader.load(
        // resource URL
        "/assets/models/theater-chair.obj",
        // called when resource is loaded
        function ( object ) {
        chair = object;
        if (chair){

            chair.position.y = y;
            chair.position.x = x;
            chair.position.z = z;
            chair.rotation.y-=rota;
            chair.scale.set(0.2,0.2,0.2);
            x+=30;

            groupSillas.add(chair);
        }


        },
        // called when loading is in progresses
        function ( xhr ) {

            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

        },
        // called when loading has errors
        function ( error ) {

            console.log( 'An error happened' );

        }
        );


          }
        scene.add(groupSillas);
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

function update(){
    //la libreria tiene una funcion requestAnimationFrame(update) para generar el loop
    requestAnimationFrame(update);
    render();

}


function render() {

  renderer.render( scene, camera );
  camera.position.x -= Math.cos( Math.sin( 10 ) ) / 10;
  camera.position.z += Math.cos( Math.sin( 10 ) ) / 10;

}
