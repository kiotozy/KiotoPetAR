import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer, mixer, model;
const clock = new THREE.Clock();

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  const loader = new GLTFLoader();
  loader.load('kioto.glb', gltf => {
    model = gltf.scene;
    model.scale.set(0.3, 0.3, 0.3);
    model.visible = false;
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(gltf.animations[0]).play();
  });

  const controller = renderer.xr.getController(0);
  controller.addEventListener('select', () => {
    if (model) {
      model.visible = true;
      model.position.set(0, 0, -0.5).applyMatrix4(controller.matrixWorld);
    }
  });
  scene.add(controller);

  setupVoice();
}

function animate() {
  renderer.setAnimationLoop(() => {
    if (mixer) mixer.update(clock.getDelta());
    renderer.render(scene, camera);
  });
}

function setupVoice() {
  const micBtn = document.getElementById('micBtn');
  if (!micBtn) {
    console.error('Botão com ID micBtn não encontrado');
    return;
  }

  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    micBtn.addEventListener('click', () => alert('Reconhecimento de voz não suportado.'));
    return;
  }

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new Recognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = false;

  micBtn.addEventListener('click', () => {
    recognition.start();
    micBtn.textContent = '🎙️...';
  });

  recognition.onresult = event => {
    const comando = event.results[0][0].transcript.toLowerCase();
    console.log('Comando:', comando);

    if (comando.includes('dançar')) {
      if (mixer) mixer.clipAction(model.animations[0]).play();
    } else if (comando.includes('parar')) {
      if (mixer) mixer.clipAction(model.animations[0]).stop();
    } else if (comando.includes('olá')) playAudio('ola.mp3');
    else if (comando.includes('bom dia')) playAudio('bom_dia.mp3');
    else if (comando.includes('boa tarde')) playAudio('boa_tarde.mp3');
    else if (comando.includes('boa noite')) playAudio('boa_noite.mp3');
    else if (comando.includes('qual seu nome')) playAudio('qual_seu_nome.mp3');
    else if (comando.includes('quer ser meu amigo')) playAudio('quer_ser_meu_amigo.mp3');

    micBtn.textContent = '🎙️';
  };

  recognition.onerror = err => {
    console.error('Erro reconhecimento de voz:', err);
    micBtn.textContent = '🎙️';
    recognition.stop();
  };
}

function playAudio(filename) {
  new Audio(filename).play();
}
