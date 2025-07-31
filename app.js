import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer, model, mixer, clock;
let currentAudio = null; // Para controlar o áudio atual e evitar sobreposições

// Referências aos elementos do DOM
const canvas = document.getElementById('ar-canvas');
const startARButton = document.getElementById('start-ar');
const micButton = document.getElementById('mic-button');

initScene(); // Inicializa a cena (câmera, renderer, luzes)
loadModel(); // Carrega o modelo GLB
setupMic(); // Configura o botão do microfone

// O ARButton deve ser criado e adicionado ao body *após* a inicialização do renderer
// O ARButton irá gerenciar o ciclo de vida da sessão AR e o loop de renderização XR.
// Portanto, a função animate() que você tinha anteriormente será substituída
// pelo loop de animação gerado pelo THREE.WebXRManager.
startARButton.addEventListener('click', () => {
    document.body.appendChild(ARButton.createButton(renderer));
    startARButton.style.display = 'none'; // Esconde o botão após clicar
});

function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; // Habilita o módulo WebXR

    clock = new THREE.Clock(); // Inicializa o clock aqui

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // Redimensionamento da janela
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadModel() {
    const loader = new GLTFLoader();
    loader.load('kioto.glb', (gltf) => {
        model = gltf.scene;
        // Posicione o modelo em um local razoável para a cena AR
        // Em AR, o modelo aparecerá onde você apontar a câmera inicialmente
        // Mas para uma visualização inicial sem AR, ele precisa de uma posição.
        model.position.set(0, 0, -2); // Exemplo: 2 metros à frente da câmera
        scene.add(model);

        if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();
            console.log("Animação carregada e iniciada.");
        } else {
            console.warn("Nenhuma animação encontrada no arquivo GLB.");
        }
    }, undefined, (error) => {
        console.error('Erro ao carregar o modelo GLB:', error);
    });
}

// A função animate() é chamada automaticamente pelo renderer.setAnimationLoop
// quando uma sessão XR está ativa.
renderer.setAnimationLoop(() => {
    if (mixer) {
        mixer.update(clock.getDelta());
    }
    renderer.render(scene, camera);
});

function setupMic() {
    micButton.addEventListener('click', () => {
        startRecognition();
        micButton.textContent = 'Ouvindo...'; // Feedback visual
        micButton.disabled = true; // Desabilita o botão enquanto ouve
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

    recognition.start();

    recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        console.log('Comando detectado:', command);
        handleCommand(command);
        micButton.textContent = '🎤'; // Volta ao ícone padrão
        micButton.disabled = false; // Reabilita o botão
    };

    recognition.onerror = (event) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        alert('Ocorreu um erro no reconhecimento de voz. Tente novamente.');
        micButton.textContent = '🎤';
        micButton.disabled = false;
    };

    recognition.onend = () => {
        console.log('Reconhecimento de voz encerrado.');
        // O botão já foi reabilitado em onresult ou onerror, mas garantimos aqui também.
        if (micButton.disabled) {
            micButton.textContent = '🎤';
            micButton.disabled = false;
        }
    };
}

function handleCommand(command) {
    if (command.includes('dançar') && mixer) {
        // Reinicia a animação para a primeira animação do GLB
        // Se você tiver várias animações, precisaria de uma lógica mais elaborada para selecionar.
        const action = mixer.clipAction(model.animations[0]);
        action.reset().play(); // Reseta e toca a animação
        console.log("Comando 'dançar' detectado. Animação iniciada.");
        playAudio('dancar.mp3'); // Assumindo que você tem um áudio para "dançar"
    } else if (command.includes('parar') && mixer) {
        mixer.stopAllAction(); // Para todas as animações
        console.log("Comando 'parar' detectado. Animação parada.");
        playAudio('parar.mp3'); // Assumindo que você tem um áudio para "parar"
    } else if (command.includes('comando') || command.includes('comandos')) {
        playAudio('comandos.mp3');
        console.log("Comando 'comandos' detectado. Áudio 'comandos.mp3' reproduzido.");
    } else {
        playAudio('nao_entendi.mp3'); // Áudio para comando não reconhecido
        console.log("Comando não reconhecido.");
    }
}

function playAudio(file) {
    // Para evitar sobreposições, pare o áudio anterior se houver
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    currentAudio = new Audio(file);
    currentAudio.play().catch(e => console.error("Erro ao reproduzir áudio:", e));
}
