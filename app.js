// app.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer, controller;
let model, mixer;

init();
animate();

function init() {
  // Cena
  scene = new THREE.Scene();

  // Câmera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: document.getElementById('xr-canvas') });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(ARButton.createButton(renderer));

  // Luz
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Carrega modelo
  const loader = new GLTFLoader();
  loader.load('kioto.glb', gltf => {
    model = gltf.scene;
    model.scale.set(0.5, 0.5, 0.5);
    scene.add(model);

    if (gltf.animations && gltf.animations.length) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(clip => mixer.clipAction(clip).play());
    }
  });

  // Controller AR
  controller = renderer.xr.getController(0);
  scene.add(controller);

  // Eventos botão microfone
  const micBtn = document.getElementById('micBtn');
  micBtn.addEventListener('click', () => {
    const utter = new SpeechSynthesisUtterance('Oi! Eu sou o Kioto Pet!');
    speechSynthesis.speak(utter);
  });

  // Resize
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
  });
}

const clock = new THREE.Clock();
