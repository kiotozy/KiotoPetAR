import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let model, inAR = false;

init();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444);
  scene.add(light);

  const loader = new GLTFLoader();
  loader.load('kioto.glb', (gltf) => {
    model = gltf.scene;
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, -1);
    scene.add(model);
  });

  document.getElementById('arButton').addEventListener('click', () => {
    if (!inAR) {
      document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));
      inAR = true;
    }
  });

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}
