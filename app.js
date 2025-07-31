import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer, mixer;
let model, clock = new THREE.Clock();
let reticle, controller;

init();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  const loader = new GLTFLoader();
  loader.load('kioto.glb', (gltf) => {
    model = gltf.scene;
    model.scale.set(1, 1, 1);
    model.position.set(0, 0, -1);
    scene.add(model);

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }
  });

  document.getElementById('micButton').addEventListener('click', startRecognition);
  document.getElementById('arButton').addEventListener('click', activateAR);

  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
  });
}

function activateAR() {
  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));
  renderer.xr.enabled = true;
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
    const transcript = event.results[0][0].transcript.toLowerCase();
    handleCommand(transcript);
  };

  recognition.onerror = (event) => {
    console.error('Erro no reconhecimento:', event.error);
    playAudio('nao_entendi.mp3');
  };
}

function handleCommand(cmd) {
  const comandos = {
    'olá': 'ola.mp3',
    'bom dia': 'bom_dia.mp3',
    'boa tarde': 'boa_tarde.mp3',
    'boa noite': 'boa_noite.mp3',
    'qual seu nome': 'qual_seu_nome.mp3',
    'quer ser meu amigo': 'quer_ser_meu_amigo.mp3',
    'comandos': 'comandos.mp3',
    'dançar': 'animar',
    'parar': 'pausar'
  };

  if (comandos[cmd]) {
    if (comandos[cmd] === 'animar') {
      if (mixer) mixer.timeScale = 1;
    } else if (comandos[cmd] === 'pausar') {
      if (mixer) mixer.timeScale = 0;
    } else {
      playAudio(comandos[cmd]);
    }
  } else {
    playAudio('nao_entendi.mp3');
  }
}

function playAudio(file) {
  const audio = new Audio(file);
  audio.play();
}
