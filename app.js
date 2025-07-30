import * as THREE from 'https://cdn.skypack.dev/three@0.160.0';
import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'https://cdn.skypack.dev/three/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let controller, reticle, mixer, model;
let clock = new THREE.Clock();

init();

function init() {
  // Cena
  scene = new THREE.Scene();

  // Câmera
  camera = new THREE.PerspectiveCamera();

  // Renderizador com WebXR
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('xr-canvas'), alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  // Botão AR
  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  // Luz
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  // Retículo para posicionar o modelo
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.15, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Controlador
  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // Sessão XR
  renderer.xr.addEventListener('sessionstart', () => {
    const session = renderer.xr.getSession();
    session.requestReferenceSpace('viewer').then(refSpace => {
      session.requestHitTestSource({ space: refSpace }).then(source => {
        renderer.setAnimationLoop((timestamp, frame) => {
          if (frame) {
            const viewerPose = frame.getViewerPose(renderer.xr.getReferenceSpace());
            if (viewerPose) {
              const hitTestResults = frame.getHitTestResults(source);
              if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(renderer.xr.getReferenceSpace());
                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
              }
            }
          }

          if (mixer) mixer.update(clock.getDelta());
          renderer.render(scene, camera);
        });
      });
    });
  });

  // Botão de voz
  document.getElementById('micButton').addEventListener('click', startVoice);
}

// Posicionar modelo ao tocar
function onSelect() {
  if (!reticle.visible) return;

  const loader = new GLTFLoader();
  loader.load('kioto.glb', gltf => {
    model = gltf.scene;
    model.position.setFromMatrixPosition(reticle.matrix);
    model.rotation.y = Math.PI;
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(gltf.animations[0]).play();
  });
}

// Reconhecimento de voz
function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.start();

  recognition.onresult = event => {
    const command = event.results[0][0].transcript.toLowerCase();
    console.log('Comando:', command);

    if (command.includes('dançar') && mixer) {
      mixer.timeScale = 1;
    } else if (command.includes('parar') && mixer) {
      mixer.timeScale = 0;
    } else if (command.includes('olá')) {
      playAudio('ola.mp3');
    } else if (command.includes('bom dia')) {
      playAudio('bom_dia.mp3');
    } else if (command.includes('boa tarde')) {
      playAudio('boa_tarde.mp3');
    } else if (command.includes('boa noite')) {
      playAudio('boa_noite.mp3');
    } else if (command.includes('qual seu nome')) {
      playAudio('qual_seu_nome.mp3');
    } else if (command.includes('quer ser meu amigo')) {
      playAudio('quer_ser_meu_amigo.mp3');
    } else {
      playAudio('comandos.mp3');
    }
  };

  recognition.onerror = e => {
    alert('Erro ao capturar voz: ' + e.error);
  };
}

// Reprodução de áudio
function playAudio(file) {
  const audio = new Audio(file);
  audio.play();
}
