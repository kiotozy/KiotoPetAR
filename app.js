import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.152.2/examples/jsm/loaders/GLTFLoader.js';

let mixer, model;
let isAnimating = false;

// Cena e renderizador
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: document.getElementById('xr-canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(THREE.WEBGL.isWebGLAvailable() ? renderer.domElement : document.createElement('div'));

// Iluminação
const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
scene.add(light);

// Carrega o modelo GLB
const loader = new GLTFLoader();
loader.load('kioto.glb', (gltf) => {
  model = gltf.scene;
  scene.add(model);

  mixer = new THREE.AnimationMixer(model);
  gltf.animations.forEach((clip) => {
    const action = mixer.clipAction(clip);
    action.play();
    action.paused = true; // Começa pausado
  });
}, undefined, console.error);

// Áudios
const sounds = {
  "olá": new Audio("ola.mp3"),
  "bom dia": new Audio("bom_dia.mp3"),
  "boa tarde": new Audio("boa_tarde.mp3"),
  "boa noite": new Audio("boa_noite.mp3"),
  "qual seu nome": new Audio("qual_seu_nome.mp3"),
  "quer ser meu amigo": new Audio("quer_ser_meu_amigo.mp3"),
  "comando": new Audio("comandos.mp3"),
  "comandos": new Audio("comandos.mp3")
};

// Reconhecimento de voz
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "pt-BR";
recognition.continuous = false;
recognition.interimResults = false;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript.toLowerCase();
  console.log("Comando:", transcript);

  if (transcript.includes("dançar")) {
    if (mixer) {
      mixer._actions.forEach(action => action.paused = false);
      isAnimating = true;
    }
  } else if (transcript.includes("parar")) {
    if (mixer) {
      mixer._actions.forEach(action => action.paused = true);
      isAnimating = false;
    }
  } else {
    for (const key in sounds) {
      if (transcript.includes(key)) {
        sounds[key].play();
        break;
      }
    }
  }
};

document.getElementById("micButton").addEventListener("click", () => {
  recognition.start();
});

// Inicia sessão AR
document.body.addEventListener('click', () => {
  navigator.xr?.isSessionSupported('immersive-ar').then((supported) => {
    if (supported) {
      navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor']
      }).then(onSessionStarted);
    }
  });
}, { once: true });

function onSessionStarted(session) {
  renderer.xr.setSession(session);
  const refSpacePromise = session.requestReferenceSpace('local-floor');
  const viewerSpacePromise = session.requestReferenceSpace('viewer');

  Promise.all([refSpacePromise, viewerSpacePromise]).then(([refSpace, viewerSpace]) => {
    session.requestHitTestSource({ space: viewerSpace }).then((hitTestSource) => {
      session.addEventListener('end', () => {
        hitTestSource.cancel();
      });

      renderer.setAnimationLoop((timestamp, frame) => {
        if (model && frame) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length > 0 && !model.placed) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(refSpace);
            model.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
            model.placed = true;
          }
        }

        const delta = clock.getDelta();
        if (mixer && isAnimating) mixer.update(delta);
        renderer.render(scene, camera);
      });
    });
  });
}

const clock = new THREE.Clock();
