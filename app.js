import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/webxr/ARButton.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/OrbitControls.js';

let camera, scene, renderer;
let model, mixer, clock;
let currentAudio = null;
let hitTestSource = null;
let hitTestSourceInitialized = false;
let modelPlacedInAR = false;
let controls;

const canvas = document.getElementById('ar-canvas');
const micButton = document.getElementById('mic-button');
const arButtonContainer = document.getElementById('ar-button-container');

const audioCommands = {
    'olá': 'ola.mp3',
    'oi': 'ola.mp3',
    'bom dia': 'bom_dia.mp3',
    'boa tarde': 'boa_tarde.mp3',
    'boa noite': 'boa_noite.mp3',
    'qual seu nome': 'qual_seu_nome.mp3',
    'quer ser meu': 'quer_ser_meu_amigo.mp3',
    'comandos': 'comandos.mp3',
    'comando': 'comandos.mp3',
    'não entendi': 'nao_entendi.mp3',
};

init();
setupMic();

async function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    await loadModel();
    setup3DNormalMode();

    const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.body }
    });
    arButton.textContent = 'Entrar em AR';
    arButtonContainer.appendChild(arButton);

    renderer.xr.addEventListener('sessionstart', (event) => {
        if (controls) controls.dispose();

        event.session.requestReferenceSpace('viewer').then((referenceSpace) => {
            event.session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                hitTestSource = source;
                hitTestSourceInitialized = true;
            });
        });

        renderer.setAnimationLoop((timestamp, frame) => {
            if (frame && hitTestSourceInitialized && !modelPlacedInAR) {
                const referenceSpace = renderer.xr.getReferenceSpace();
                const hitTestResults = frame.getHitTestResults(hitTestSource);

                if (hitTestResults.length) {
                    const hit = hitTestResults[0];
                    const pose = hit.getPose(referenceSpace);

                    reticle.matrix.copy(pose.transform.matrix);
                    reticle.visible = true;

                    if (!modelPlacedInAR && model) {
                        model.position.setFromMatrixPosition(reticle.matrix);
                        model.scale.set(0.5, 0.5, 0.5);
                        scene.add(model);
                        modelPlacedInAR = true;
                        reticle.visible = false;

                        if (mixer && model.animations && model.animations.length > 0) {
                            mixer.clipAction(model.animations[0]).play();
                        }
                    }
                } else {
                    reticle.visible = false;
                }
            }

            if (mixer) mixer.update(clock.getDelta());
            renderer.render(scene, camera);
        });
    });

    renderer.xr.addEventListener('sessionend', () => {
        modelPlacedInAR = false;
        if (model && model.parent) scene.remove(model);
        reticle.visible = false;
        hitTestSourceInitialized = false;
        setup3DNormalMode();
    });

    window.addEventListener('resize', onWindowResize);
}

function setup3DNormalMode() {
    renderer.setAnimationLoop(null);
    if (model && !model.parent) scene.add(model);
    model.position.set(0, 0, -3);
    model.scale.set(1, 1, 1);
    camera.position.set(0, 1.5, 2);
    if (!controls) controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();
    if (mixer && model.animations && model.animations.length > 0) mixer.clipAction(model.animations[0]).play();
    renderer.setAnimationLoop(() => {
        if (mixer) mixer.update(clock.getDelta());
        if (controls) controls.update();
        renderer.render(scene, camera);
    });
}

async function loadModel() {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load('kioto.glb', (gltf) => {
            model = gltf.scene;
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                model.animations = gltf.animations;
            } else {
                model.animations = [];
            }
            resolve();
        }, undefined, (error) => {
            alert('Erro ao carregar o modelo 3D.');
            reject(error);
        });
    });
}

function setupMic() {
    if (!micButton) return;
    micButton.addEventListener('click', () => {
        startRecognition();
        micButton.textContent = 'Ouvindo...';
        micButton.disabled = true;
    });
}

function startRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('Reconhecimento de voz não suportado neste navegador.');
        micButton.textContent = '🎤';
        micButton.disabled = false;
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    try {
        recognition.start();
    } catch (e) {
        alert('Erro ao iniciar microfone: ' + e.message);
        micButton.textContent = '🎤';
        micButton.disabled = false;
        return;
    }

    recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        handleCommand(command);
    };

    recognition.onerror = (event) => {
        alert('Erro no reconhecimento de voz: ' + event.error);
        micButton.textContent = '🎤';
        micButton.disabled = false;
    };

    recognition.onend = () => {
        micButton.textContent = '🎤';
        micButton.disabled = false;
    };
}

function handleCommand(command) {
    if (command.includes('dançar') && mixer && model.animations && model.animations.length > 0) {
        const action = mixer.clipAction(model.animations[0]);
        action.reset().play();
    } else if (command.includes('parar') && mixer) {
        mixer.stopAllAction();
    } else {
        let foundMatch = false;
        for (const key in audioCommands) {
            if (command.includes(key)) {
                playAudio(audioCommands[key]);
                foundMatch = true;
                break;
            }
        }
        if (!foundMatch) playAudio('nao_entendi.mp3');
    }
}

function playAudio(file) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    currentAudio = new Audio(file);
    currentAudio.play().catch(console.error);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
