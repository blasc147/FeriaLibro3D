"use strict";
import * as THREE from '../build/three.module.js';
import { CSS3DRenderer, CSS3DObject } from '../jsm/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'https://unpkg.com/three/examples/jsm/controls/TrackballControls.js';
import { OrbitControls } from '../jsm/controls/OrbitControls.js';
import { RectAreaLightHelper } from '../jsm/helpers/RectAreaLightHelper.js';


var camera, webglscene, webglrenderer, cubeCamera;
var cssscene, cssrenderer;
var controls;
var geometry, material, mesh;
var groundPlane, wallMat, secondPlane, light1;

// scene size
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;

var VIEW_ANGLE = 70;
var ASPECT = WIDTH / HEIGHT;
var NEAR = 1;
var FAR =400;


init();
animate();

function createYoutubeVideo ( id, x, y, z, ry ) {

  var div = document.createElement( 'div' );
  div.style.width = '600px';
  div.style.height = '400px';
  div.style.backgroundColor = '#fff';

  var iframe = document.createElement( 'iframe' );
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0px';
  iframe.src = [ 'https://www.youtube.com/embed/', id, '?rel=0' ].join( '' );
  iframe.autoplay=1;
  div.appendChild( iframe );

  var cssobject = new CSS3DObject( div );
  cssobject.position.set( x, y, z );
  cssobject.rotation.y = ry;
  cssobject.scale.set(0.03, 0.03, 0.03);

  cssscene.add(cssobject);

  var material = new THREE.MeshPhongMaterial({
    opacity	: 0.0,
    color	: new THREE.Color('black'),
    blending: THREE.NoBlending,
    side	: THREE.DoubleSide,
  });

  var geometry = new THREE.PlaneGeometry( 480, 360 );
  var webglrepresentation = new THREE.Mesh( geometry, material );
  webglrepresentation.position.copy( cssobject.position );
  webglrepresentation.rotation.copy( cssobject.rotation );
  webglrepresentation.scale.copy( cssobject.scale );
  webglscene.add( webglrepresentation );
}

function init() {
  camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
  camera.position.z = 10;



  webglscene = new THREE.Scene();

  webglrenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  webglrenderer.setClearColor( 0x000000, 0 );
  webglrenderer.setSize( window.innerWidth, window.innerHeight );
  document.querySelector('#webgl').appendChild( webglrenderer.domElement );


  controls = new OrbitControls( camera, webglrenderer.domElement );
  controls.target.set( 0, 0, 0 );
  controls.maxDistance = 250;
  controls.minDistance = 20;
  controls.addEventListener( 'change', render );
  controls.update();

  //piso
  var loader = new THREE.TextureLoader();
  var rMap = loader.load( '/assets/models/textures/brick_diffuse.jpg' );
  rMap.wrapS = THREE.RepeatWrapping;
  rMap.wrapT = THREE.RepeatWrapping;
  rMap.repeat.set(2, 2);

  var defaultMat = new THREE.MeshPhysicalMaterial( {
     map: rMap,
     bumpScale: 0.1,
     roughness:0.4,
     reflectivity:0.4
  } );



  groundPlane = new THREE.Mesh( new THREE.PlaneBufferGeometry( 30, 25, 2 ), defaultMat );
  groundPlane.rotateY( -Math.PI/2 );
  groundPlane.position.set( 20, 1, 0 );
  webglscene.add( groundPlane );

  var groundPlane2 = new THREE.Mesh( new THREE.PlaneBufferGeometry( 30, 25, 2 ), defaultMat );
  groundPlane2.rotateY( Math.PI/2);
  groundPlane2.position.set( -20, 1, 0 );
  webglscene.add( groundPlane2 );

  var groundPlane3 = new THREE.Mesh( new THREE.PlaneBufferGeometry( 60, 25, 2 ), defaultMat );
  groundPlane3.rotateX( -Math.PI/2);
  groundPlane3.position.set( 0,20,-18 );
  groundPlane3.material.side= THREE.DoubleSide;
  webglscene.add( groundPlane3 );

  var groundPlane4 = new THREE.Mesh( new THREE.PlaneBufferGeometry( 40, 25, 2 ), defaultMat );
  //groundPlane4.rotateX( Math.PI/2);
  groundPlane4.position.set( 0, 1, -13.5 );
  webglscene.add( groundPlane4 );



  cssscene = new THREE.Scene();
  cssrenderer = new CSS3DRenderer();
  cssrenderer.setSize( window.innerWidth, window.innerHeight );
  cssrenderer.domElement.style.position = 'absolute';
  cssrenderer.domElement.style.top = 0;
  document.querySelector('#css').appendChild( cssrenderer.domElement );



  material = new THREE.MeshNormalMaterial();

  mesh = new THREE.Mesh( geometry, material );
  webglscene.add( mesh );

  createYoutubeVideo( 'FHVD9ft_ANw', 0, 1, -4, 0 );


  //paredes


  window.addEventListener( 'resize', onWindowResize, false );

  var trideo = document.getElementById( 'css' );
  //trideo.style.display = 'none';

  //luces


  var width = 30;
  var height = 15;
  var intensity =1;

  var redRectLight = new THREE.RectAreaLight( 0xf3aaaa, intensity, width, height );
  redRectLight.position.set( 0, 0, -10 );
  redRectLight.lookAt( 0, 0, -10 );
  webglscene.add( redRectLight );

  var redRectLightHelper = new RectAreaLightHelper( redRectLight, 0xffffff );
  redRectLight.add( redRectLightHelper );




}

function animate() {

  setTimeout( function() {

      requestAnimationFrame( animate );

  }, 200 );

  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.02;
  controls.update();
  webglrenderer.render( webglscene, camera );
  cssrenderer.render( cssscene, camera );

}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  webglrenderer.setSize( window.innerWidth, window.innerHeight );
  cssrenderer.setSize( window.innerWidth, window.innerHeight );
}

function render() {

  webglrenderer.render( webglscene, camera );
  requestAnimationFrame(render);

};
