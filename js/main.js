"use strict";

import * as THREE from "/build/three.module.js";
import {OrbitControls} from "/jsm/controls/OrbitControls.js";
import {GLTFLoader} from "/jsm/loaders/GLTFLoader.js";


//var globales: se declaran globales porque se necesita utilizar en varias funciones

var container;
var sceneWidth, sceneHeight;
var scene;
var renderer;
var camera;
var controls;


init()

//funcion constructora
function init(){

  //crear escena
  createScene();


  //actualizar escena
  update();
}

//funcion para crear la escena
function createScene(){

  //tamano de la escena
  sceneWidth = window.innerWidth;
  sceneHeight = window.innerHeight;
  //Escena
  scene= new THREE.Scene();
  scene.background = new THREE.Color( 0x443333 );

  //render

  renderer = new THREE.WebGLRenderer({});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(sceneWidth,sceneHeight);

  //canvas
  container = document.getElementById("container");
  container.appendChild(renderer.domElement);

  //Camara

  camera = new THREE.PerspectiveCamera(75, sceneWidth / sceneHeight, 5,1000);
  camera.position.set(-310,313,500);

  //luces> es importante para poder visualizar las figuras, aca define 2 la directional y la hemi

  var light= new THREE.DirectionalLight(0xffffff);
  light.position.set(1,0,1);
  scene.add(light);
  //(colordelCielo, color del suelo, gradiente)
  var hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5);
  hemi.position.set(0,0,5);
  scene.add(hemi);

  //el controlador me que va a ayudar a mover la camara
  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  //para crear un cubo u otras estructuras geometricas, box es un cubo pero hay varias, por cada
  //figura hay un constructor
  //var cubeGeo = new THREE.IcosahedronGeometry(10,1);
  //var cubeMaterial = new THREE.MeshLambertMaterial({color:0xee1122});
  //var mesh = new THREE.Mesh( cubeGeo, cubeMaterial);
  //objeto silla

var posiX=-400;
var posiz=300;
var posiy=40;

for (let i = 0; i <2; i++) {
   createSillas(posiX, posiz,posiy);
   posiz-=75;
}




  //agregamos el cubo a la Escena
  //scene.add(mesh);
  createPlane();

//aca se crea el piso
  function createPlane() {



    var plane = new THREE.Mesh(
				new THREE.PlaneBufferGeometry( 8, 8 ),
				new THREE.MeshPhongMaterial( { color: 0x999999, specular: 0x101010 } )
			);
			plane.rotation.x = - Math.PI / 2;
			plane.position.y = 0.03;
			plane.receiveShadow = true;
			scene.add( plane );
  }

  function createSillas(x,z,y){

    var chair;
    var groupSillas = new THREE.Group();
      for(let i=0;i<=10;i++){


      new GLTFLoader().load( "/assets/models/scene.gltf", function ( gltf ) {
      chair = gltf.scene;
      //posicion silla,
      if (chair){
        chair.position.y = y;
        chair.position.x = x;
        chair.position.z = z;
        x+=50;
        chair.rotation.y+=0.5;
        //escala
        chair.scale.set(0.02,0.02,0.02);

        groupSillas.add(chair);
        if(i==4){
          x+=200;
        }
      }


      }, undefined, function ( error ) {

              console.error( error );

      } );

    }

  scene.add(groupSillas);
}

}
//esto va actualizando el render
function update(){
    //la libreria tiene una funcion requestAnimationFrame(update) para generar el loop
    requestAnimationFrame(update);
    render();

}
//en el render puedo agragar movimientos a las figuras entonces cada vez que se actualiza el render se realiza el movimiento, pueder ser del cubo o la camara el movimiento
function render(){
    //actualizar controles
    controls.update();
    camera.position.z += Math.sin( Math.cos( 10 ) ) / 100;
    camera.position.x += Math.cos( Math.sin( 10 ) ) / 100;
    //camera.position.z -= 0.1; para rotar la camara en z
    //camera.position.x
    //camera.lookAt(objeto)
    //renderizar la escena y la camara
    renderer.render(scene, camera);
}
