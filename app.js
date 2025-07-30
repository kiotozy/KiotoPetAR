import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let controller;
let mixer;
let model;
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
    scene.add(light);

    const loader = new GLTFLoader();
    loader.load('kioto.glb', function (gltf) {
        model = gltf.scene;
        model.scale.set(0.3, 0.3, 0.3);
        model.visible = false;
        scene.add(model);

        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
    });

    const controller = renderer.xr.getController(0);
    controller.addEventListener('select', (event) => {
        if (model) {
            model.position.set(0, 0, -0.5).applyMatrix4(controller.matrixWorld);
            model.visible = true;
        }
    });
    scene.add(controller);

    // Microfone (Speech Recognition)
    const micBtn = document.getElementById('micBtn');
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'pt-BR';

    micBtn.addEventListener('click', () => {
        recognition.start();
        micBtn.textContent = '🎙️...';
    });

    recognition.onresult = (event) => {
        const comando = event.results[0][0].transcript.toLowerCase();
        console.log('Comando:', comando);

        if (comando.includes('dançar') || comando.includes('dance')) {
            if (mixer) mixer.clipAction(model.animations[0]).play();
            playAudio('dancar.mp3');
        } else if (comando.includes('parar')) {
            if (mixer) mixer.clipAction(model.animations[0]).stop();
            playAudio('parar.mp3');
        } else if (comando.includes('olá')) {
            playAudio('ola.mp3');
        } else if (comando.includes('bom dia')) {
            playAudio('bomdia.mp3');
        } else if (comando.includes('boa tarde')) {
            playAudio('boatarde.mp3');
        } else if (comando.includes('boa noite')) {
            playAudio('boanoite.mp3');
        } else if (comando.includes('qual seu nome')) {
            playAudio('nome.mp3');
        } else if (comando.includes('quer ser meu amigo')) {
            playAudio('amigo.mp3');
        }

        micBtn.textContent = '🎙️';
    };
}

function playAudio(filename) {
    const audio = new Audio(filename);
    audio.play();
}

function animate() {
    renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        if (mixer) mixer.update(delta);
        renderer.render(scene, camera);
    });
}
