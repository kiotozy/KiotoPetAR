import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let controller, mixer;
let clock = new THREE.Clock();

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
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  const loader = new GLTFLoader();
  loader.load('kioto.glb', function (gltf) {
    const model = gltf.scene;
    model.scale.set(0.5, 0.5, 0.5);
    model.position.set(0, 0, -0.5);
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(gltf.animations[0]).play();
  });

  controller = renderer.xr.getController(0);
  scene.add(controller);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
}

// 🎤 Reconhecimento de voz
const comandos = {
  "olá": "ola.mp3",
  "bom dia": "bom_dia.mp3",
  "boa tarde": "boa_tarde.mp3",
  "boa noite": "boa_noite.mp3",
  "qual seu nome": "qual_seu_nome.mp3",
  "quer ser meu amigo": "quer_ser_meu_amigo.mp3"
};

let reconhecimento;

window.iniciarReconhecimento = () => {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Reconhecimento de voz não suportado.");
    return;
  }

  if (reconhecimento) {
    reconhecimento.stop();
    reconhecimento = null;
    return;
  }

  reconhecimento = new webkitSpeechRecognition();
  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = false;
  reconhecimento.interimResults = false;

  reconhecimento.onresult = function (event) {
    const comando = event.results[0][0].transcript.toLowerCase().trim();
    console.log("Comando reconhecido:", comando);

    if (comando === "dançar" && mixer) {
      mixer.timeScale = 1;
    } else if (comando === "parar" && mixer) {
      mixer.timeScale = 0;
    } else if (comandos[comando]) {
      new Audio(comandos[comando]).play();
    } else {
      new Audio("comandos.mp3").play();
    }
  };

  reconhecimento.onerror = function () {
    reconhecimento.stop();
    reconhecimento = null;
  };

  reconhecimento.start();
};
