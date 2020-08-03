"use strict";
import * as THREE from '../build/three.module.js';
import { GUI } from '../jsm/libs/dat.gui.module.js';
import { OrbitControls } from '../jsm/controls/OrbitControls.js';
import { RectAreaLightHelper } from '../jsm/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from '../jsm/lights/RectAreaLightUniformsLib.js';
//import { CSS3DRenderer, CSS3DObject } from '/jsm/renderers/CSS3DRenderer.js';
import {OBJLoader} from "../jsm/loaders/OBJLoader.js";
import {MTLLoader} from "../jsm/loaders/MTLLoader.js";
import {DDSLoader} from "../jsm/loaders/DDSLoader.js";
import {GLTFLoader} from "../jsm/loaders/GLTFLoader.js";





// scene size
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;

// camera
var VIEW_ANGLE = 70;
var ASPECT = WIDTH / HEIGHT;
var NEAR = 2;
var FAR =10000;

var camera, cubeCamera, scene, renderer;

var cameraControls;

var groundPlane, wallMat, secondPlane, light1;

init();

function init() {
  //crear escena
  createScene();


  //actualizar escena
  animate();

}

function createScene(){
  var container = document.getElementById( 'container' );

  // renderer
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( WIDTH, HEIGHT );
  container.appendChild( renderer.domElement );


  // scene
  scene = new THREE.Scene();

  // camera
  camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
  camera.position.set( 180, 80, 0 );


  cameraControls = new OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, - 10, 0 );
  cameraControls.maxDistance = 250;
  cameraControls.minDistance = 50;
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

  var defaultMat = new THREE.MeshBasicMaterial( {
     color:0x484848
  } );



  groundPlane = new THREE.Mesh( new THREE.PlaneBufferGeometry( 350, 300, 300 ), defaultMat );
  groundPlane.rotateX( - Math.PI / 2 );
  groundPlane.position.set( 25, - 100, 0 );
  scene.add( groundPlane );



  //columnas

  var entrePiso = new THREE.BoxBufferGeometry( 100, 10, 300);
  entrePiso.translate( 150, -50, 0 );
  entrePiso.rotateZ( Math.PI / 12);
  var material = new THREE.MeshLambertMaterial( { color: 0x484848, flatShading: true } );
  var ep = new THREE.Mesh( entrePiso, material );
  scene.add( ep );

  crearColumna(250,10,10,-10,-22,-150);
  crearColumna(250,10,10,-10,-22,150);
  crearColumna(10,250,10,-10,0,-150);
  crearColumna(10,250,10,-10,0,150);
  crearColumna(10,30,300,110,-10,0);
  crearColumna(10,10,300,200,100,0);
  //escenario
  crearColumna(50,40,300,-125,-100,0);
  //escaleras
  crearColumna(10,30,40,-100,-100,120);
  crearColumna(10,30,40,-100,-100,-120);
  crearColumna(10,15,40,-90,-100,120);
  crearColumna(10,15,40,-90,-100,-120);


  function crearColumna(x, y, z, a ,b ,c ){
    let col1 = new THREE.BoxBufferGeometry( x,y,z);
    col1.translate( a,b,c );
    let cola = new THREE.Mesh( col1, material );
    scene.add( cola );
  };

  // paredes de ladrillo
  var diffuseTex = loader.load( '/assets/models/textures/brick_diffuse.jpg', function () {

    //updateCubeMap();

  } );
  diffuseTex.wrapS = THREE.RepeatWrapping;
  diffuseTex.wrapT = THREE.RepeatWrapping;
  diffuseTex.repeat.set( 3,3 );



  wallMat = new THREE.MeshPhysicalMaterial( {
    map: diffuseTex,

    //bumpScale: 0.1,
  } );

//posiciones de las paredes y tamano
  var paredes = new THREE.PlaneBufferGeometry( 350, 250 );

  var planeBack1 = new THREE.Mesh( paredes, wallMat );
  planeBack1.position.z = - 150;
  planeBack1.position.x = 25;
  scene.add( planeBack1 );



  var planeFront1 = new THREE.Mesh( paredes, wallMat );
  planeFront1.position.z = 150;
  planeFront1.position.x = 25;
  planeFront1.rotateY( Math.PI );
  scene.add( planeFront1 );

  var paredes2 = new THREE.PlaneBufferGeometry(300, 250 );

  var planeRight = new THREE.Mesh( paredes2, wallMat );
  planeRight.position.x =200;
  planeRight.rotateY( - Math.PI / 2 );
  scene.add( planeRight );

  var planeLeft = new THREE.Mesh( paredes2, wallMat );
  planeLeft.position.x = -150;
  planeLeft.rotateY( Math.PI / 2 );
  scene.add( planeLeft );

  //lights
  var width = 250;
  var height = 100;
  var intensity = 10;

  RectAreaLightUniformsLib.init();
//reflectores


  crearReflectores(-80,-30,-148,0xf3aaaa);
  crearReflectores(50,-30,-148,0xf3aaaa);
  crearReflectores(-80,-30,148,0xf3aaaa);
  crearReflectores(50,-30,148,0xf3aaaa);
  crearReflectores(198,95,-40,0xf3aaaa);
  crearReflectores(198,95,60,0xf3aaaa);
  crearReflectores(198,-10,-40,0xf3aaaa);
  crearReflectores(198,-10,60,0xf3aaaa);





//luz pantalla
  var redRectLight = new THREE.RectAreaLight( 0xf3aaaa, intensity, width, height );
  redRectLight.position.set( -150, 5, 0 );
  redRectLight.lookAt( 100, 5, 0 );
  scene.add( redRectLight );

  var redRectLightHelper = new RectAreaLightHelper( redRectLight, 0xffffff );
  redRectLight.add( redRectLightHelper );

  var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
scene.add( directionalLight );

  var posiX=-40;
  var posiya=-90;
  var posiz=-125;
  var poszb=95;
//crear sillas laterales
for(let j=0;j<3;j++){

    createSillas2(posiX, posiya,posiz, 0.1,6);
    createSillas2(130,-5, posiz, 0.1,1);
    createSillas2(160,5, posiz, 0.1,1);

    createSillas2(posiX,posiya,poszb,-0.1,6);
    createSillas2(130,-5,poszb,-0.1,1);
    createSillas2(160,5,poszb,-0.1,1);
    posiz+=18;
    poszb+=18;

}
//sillas del medio
var posiz=-45
for(let j=0;j<6;j++){

  createSillas2(posiX, posiya,posiz,0,6);
  createSillas2(130, -5,posiz,0,1);
  createSillas2(160, 5,posiz,0,1);

    posiz+=18;

}


var planeGeoImg = new THREE.PlaneGeometry(200, 100, 1, 1);
var textureImg = new THREE.TextureLoader().load( '/assets/models/textures/fdld22-logo.png' );
var planeImg = new THREE.MeshLambertMaterial( {
  map: textureImg,
  color:0xffffff,
  transparent:true,
  opacity: 0.2

 } );
var plane = new THREE.Mesh(planeGeoImg, planeImg);
plane.rotateY( Math.PI/2 );

//plane.receiveShadow = true;
plane.position.set( -140, 5, 0 );
scene.add(plane);

//telon
crearCortinas(-140,-80,-120);
crearCortinas(-140,-80,120);



  render();


  // instantiate a loader
}

function createSillas2(x,y,z,r,cant){

    for (let i = 0; i < cant; i++) {
      var silla = new THREE.Group();
      var cubo1 = new THREE.BoxGeometry( 14,3,14,1, 1, 1 );
      var materialsilla = new THREE.MeshLambertMaterial( {color: 0xf5d91, emissive:0x000000} );
      var cube1 = new THREE.Mesh( cubo1, materialsilla );
      cube1.position.set(x,y,z)
      cube1.rotation.y+=r;
      silla.add( cube1 );

      var cubo2 = new THREE.BoxGeometry( 3,18,14,1, 1, 1 );
      var cube2 = new THREE.Mesh( cubo2, materialsilla );
      cube2.position.set(x+6,y+8,z);
      cube2.rotation.y+=r;
      silla.add( cube2 );

      var cubo3 = new THREE.BoxGeometry( 10,3,2,1, 1, 1 );
      var cube3 = new THREE.Mesh( cubo3, materialsilla );
      cube3.position.set(x,y+8,z+6);
      cube3.rotation.y+=r;
      silla.add( cube3 );

      var cubo4 = new THREE.BoxGeometry( 10,3,2,1, 1, 1 );
      var cube4 = new THREE.Mesh( cubo4, materialsilla );
      cube4.position.set(x,y+8,z-6);
      cube4.rotation.y+=r;
      silla.add( cube4 );

      var cubo5 = new THREE.BoxGeometry( 8,10,3,1, 1, 1 );
      var cube5 = new THREE.Mesh( cubo5, materialsilla );
      cube5.position.set(x,y-5,z-5);
      cube5.rotation.y+=r;
      silla.add( cube5 );

      var cubo6 = new THREE.BoxGeometry( 8,10,3,1, 1, 1 );
      var cube6 = new THREE.Mesh( cubo6, materialsilla );
      cube6.position.set(x,y-5,z+5);
      cube6.rotation.y+=r;
      silla.add( cube6 );

      scene.add(silla);
      x+=30;
    }


}

function createSillas(x,z,y, rota, cant){

  var chair;
  var groupSillas = new THREE.Group();
  // model

				var onProgress = function ( xhr ) {

					if ( xhr.lengthComputable ) {

						var percentComplete = xhr.loaded / xhr.total * 100;
						console.log( Math.round( percentComplete, 2 ) + '% downloaded' );

					}

				};

		var onError = function () { };

    var manager = new THREE.LoadingManager();
    manager.addHandler( /\.dds$/i, new DDSLoader() );
    for(let i=0;i<=cant;i++){
      // instantiate a loader



        var loader = new MTLLoader( manager )
					.setPath( '/assets/models/' )
					.load( 'untitled.mtl', function ( materials ) {

						materials.preload();

						new OBJLoader( manager )
							.setMaterials( materials )
							.setPath( '/assets/models/' )
							.load( 'untitled.obj', function ( object ) {
                chair = object;

                if (chair){

                    chair.position.y = y;
                    chair.position.x = x;
                    chair.position.z = z;
                    chair.rotation.y-=rota;
                    chair.scale.set(0.6,0.6,0.6);
                    x+=30;
                    groupSillas.add(chair);
                    render();
                }

							}, onProgress, onError );

					} );



          }
        scene.add(groupSillas);
}

function crearReflectores(x, y, z, color){
  var intensidad = 4;
	var distance = 150;
	var decay = 3.0;
  light1 = new THREE.PointLight( color, intensidad, distance, decay );
  light1.position.set(x,y,z);
  var sphere = new THREE.CylinderGeometry( 2, 5, 5, 8 );
	light1.add( new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( { color: color } ) ) );
	scene.add( light1 );

}

function crearCortinas(x,y,z){
  var cortinas = new GLTFLoader();
  cortinas.load(
  	'assets/models/telon.gltf',
  	function ( gltf ) {

  		var telon = gltf.scene;
      if(telon){
        telon.scale.set(30,50,20);
        telon.position.set(x,y,z);
        scene.add(telon);
        render();
      }
  	},
  	// called while loading is progressing
  	function ( xhr ) {

  		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

  	},
  	// called when loading has errors
  	function ( error ) {

  		console.log( 'An error happened' );

  	}
  );
}

function animate() {

    //setTimeout( function() {

        requestAnimationFrame( animate );

    //}, 200 );

    renderer.render(scene, camera);
    camera.position.x -= Math.cos( Math.sin( 10 ) ) / 50;
    camera.position.y -= Math.cos( Math.sin( 10 ) ) / 50;

};


function render() {

  renderer.render( scene, camera );
  //requestAnimationFrame(render);

};
