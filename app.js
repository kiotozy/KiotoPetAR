import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/OrbitControls.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer, model, mixer;
let clock = new THREE.Clock();

const canvas = document.getElementById('ar-canvas');

initScene();
loadModel();
setupMic();
animate();

document.getElementById('start-ar').addEventListener('click', () => {
  document.body.appendChild(ARButton.createButton(renderer));
});

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  const controls = new OrbitControls(camera, renderer.domElement);
  camera.position.set(0, 1.5, 2);
  controls.update();
}

function loadModel() {
  const loader = new GLTFLoader();
  loader.load('kioto.glb', (gltf) => {
    model = gltf.scene;
    scene.add(model);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }
  });
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (mixer) mixer.update(clock.getDelta());
    renderer.render(scene, camera);
  });
}

function setupMic() {
  const micBtn = document.getElementById('mic-button');
  micBtn.addEventListener('click', () => startRecognition());
}

function startRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Reconhecimento de voz não suportado neste navegador.');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onresult = (event) => {
    const command = event.results[0][0].transcript.toLowerCase();
    console.log('Comando:', command);
    handleCommand(command);
  };
}

function handleCommand(command) {
  if (command.includes('dançar') && mixer) {
    mixer.timeScale = 1;
  } else if (command.includes('parar') && mixer) {
    mixer.timeScale = 0;
  } else if (command.includes('comando') || command.includes('comandos')) {
    playAudio('comandos.mp3');
  }
}

function playAudio(file) {
  const audio = new Audio(file);
  audio.play();
}
