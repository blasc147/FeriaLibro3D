"use strict";
import * as THREE from '../build/three.module.js';
import { CSS3DRenderer, CSS3DObject } from '../jsm/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'https://unpkg.com/three/examples/jsm/controls/TrackballControls.js';
import crearColumna from './sala.js';

var camera, webglscene, webglrenderer;
var cssscene, cssrenderer;
var controls;
var geometry, material, mesh;


init();
animate();

function createYoutubeVideo ( id, x, y, z, ry ) {

  var div = document.createElement( 'div' );
  div.style.width = '480px';
  div.style.height = '360px';
  div.style.backgroundColor = '#fff';

  var iframe = document.createElement( 'iframe' );
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0px';
  iframe.src = [ 'https://www.youtube.com/embed/', id, '?rel=0' ].join( '' );
  div.appendChild( iframe );

  var cssobject = new CSS3DObject( div );
  cssobject.position.set( x, y, z );
  cssobject.rotation.y = ry;
  cssobject.scale.set(0.01, 0.01, 0.01);

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
  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 100 );
  camera.position.z = 10;

  webglscene = new THREE.Scene();

  webglrenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  webglrenderer.setClearColor( 0x000000, 0 );
  webglrenderer.setSize( window.innerWidth, window.innerHeight );
  document.querySelector('#webgl').appendChild( webglrenderer.domElement );

  cssscene = new THREE.Scene();
  cssrenderer = new CSS3DRenderer();
  cssrenderer.setSize( window.innerWidth, window.innerHeight );
  cssrenderer.domElement.style.position = 'absolute';
  cssrenderer.domElement.style.top = 0;
  document.querySelector('#css').appendChild( cssrenderer.domElement );



  geometry = new THREE.BoxGeometry( 1, 1, 1 );
  material = new THREE.MeshNormalMaterial();

  mesh = new THREE.Mesh( geometry, material );
  webglscene.add( mesh );

  createYoutubeVideo( 'FHVD9ft_ANw', 0, 0, -2, 0 );

  var backPlaneGeometry = new THREE.PlaneGeometry(20, 10)

  var backPlane = new THREE.Mesh(backPlaneGeometry, material);
  backPlane.position.set(0,0,-5);
  webglscene.add(backPlane);

  window.addEventListener( 'resize', onWindowResize, false );

  var trideo = document.getElementById( 'css' );
  //trideo.style.display = 'none';




}

function animate() {

  requestAnimationFrame( animate );

  //mesh.rotation.x += 0.01;
  //mesh.rotation.y += 0.02;
  //controls.update();
  webglrenderer.render( webglscene, camera );
  cssrenderer.render( cssscene, camera );

}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  webglrenderer.setSize( window.innerWidth, window.innerHeight );
  cssrenderer.setSize( window.innerWidth, window.innerHeight );
}
