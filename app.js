import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let model, mixer, clock;
let currentAudio = null; // Para gerenciar a reprodução de áudios
let hitTestSource = null; // Para posicionamento em AR
let hitTestSourceInitialized = false; // Flag para indicar se o hit test está pronto
let modelPlacedInAR = false; // Flag para controlar se o modelo já foi posicionado no AR

// Elementos do DOM
const canvas = document.getElementById('ar-canvas');
const micButton = document.getElementById('mic-button');

// Mapeamento de comandos de voz para arquivos de áudio
// Baseado nos nomes de arquivo que você forneceu na imagem.
const audioCommands = {
    'oi': 'ola.mp3',
    'olá': 'ola.mp3', // Sinônimo para 'olá'
    'bom dia': 'bom_dia.mp3',
    'boa tarde': 'boa_tarde.mp3',
    'boa noite': 'boa_noite.mp3',
    'qual seu nome': 'qual_seu_nome.mp3',
    'quer ser meu': 'quer_ser_meu.mp3',
    'comandos': 'comandos.mp3',
    'comando': 'comandos.mp3', // Sinônimo para 'comando'
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
    renderer.xr.enabled = true; // Habilita o módulo WebXR

    // Adiciona uma luz ambiente
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // O reticle é um círculo que ajuda o usuário a posicionar o objeto no ambiente AR
    const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true })
    );
    reticle.matrixAutoUpdate = false; // Permite controle manual da posição
    reticle.visible = false;
    scene.add(reticle);

    // Carrega o modelo GLB
    await loadModel();

    // Tenta iniciar a sessão AR automaticamente
    try {
        // Verifica se WebXR é suportado e se o modo 'immersive-ar' está disponível
        const isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!isARSupported) {
            throw new Error("Sessão AR imersiva não suportada neste dispositivo/navegador.");
        }

        const session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test', 'dom-overlay'],
            domOverlay: { root: document.body }
        });
        renderer.xr.setSession(session);
        console.log("Sessão AR iniciada automaticamente.");

        // Adiciona um listener para quando a sessão AR é finalizada
        session.addEventListener('end', () => {
            console.log('Sessão AR finalizada.');
            // Se precisar resetar o estado ou voltar para um modo 3D padrão:
            modelPlacedInAR = false;
            // Opcional: remover o modelo da cena ou reposicioná-lo
            if (model && model.parent) {
                scene.remove(model);
            }
        });

        // Configura o hit test para posicionar o modelo no ambiente AR
        session.requestReferenceSpace('viewer').then((referenceSpace) => {
            session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                hitTestSource = source;
                hitTestSourceInitialized = true;
                console.log("Hit test source inicializado.");
            });
        });

        // Loop de renderização para AR
        renderer.setAnimationLoop((timestamp, frame) => {
            if (frame && hitTestSourceInitialized && !modelPlacedInAR) {
                const referenceSpace = renderer.xr.getReferenceSpace();
                const hitTestResults = frame.getHitTestResults(hitTestSource);

                if (hitTestResults.length) {
                    const hit = hitTestResults[0];
                    const pose = hit.getPose(referenceSpace);

                    reticle.matrix.copy(pose.transform.matrix);
                    reticle.visible = true;

                    // Posiciona o modelo automaticamente quando uma superfície é encontrada
                    if (!modelPlacedInAR && model) {
                        model.position.setFromMatrixPosition(reticle.matrix);
                        model.scale.set(0.5, 0.5, 0.5); // Ajuste a escala conforme necessário
                        scene.add(model);
                        modelPlacedInAR = true;
                        reticle.visible = false; // Esconde o reticle depois de posicionar

                        if (mixer && model.animations.length > 0) {
                            mixer.clipAction(model.animations[0]).play(); // Inicia a animação
                            console.log("Modelo posicionado e animação iniciada em AR.");
                        } else {
                            console.warn("Animações não disponíveis ou mixer não inicializado.");
                        }
                    }
                } else {
                    reticle.visible = false;
                }
            }

            if (mixer) {
                mixer.update(clock.getDelta());
            }
            renderer.render(scene, camera);
        });

    } catch (e) {
        console.error("WebXR não suportado ou sessão AR não iniciada:", e);
        alert("Seu navegador não suporta Realidade Aumentada ou a sessão não pôde ser iniciada automaticamente. Tentando exibir em 3D normal.");
        // Se AR não for suportado, exiba o modelo em um modo 3D normal
        scene.add(model);
        model.position.set(0, 0, -3); // Posiciona o modelo à frente da câmera para visualização padrão
        model.scale.set(1, 1, 1); // Escala padrão
        if (mixer && model.animations.length > 0) {
            const action = mixer.clipAction(model.animations[0]);
            action.play();
            console.log("Animação iniciada em modo 3D normal.");
        } else {
            console.warn("Nenhuma animação para reproduzir em modo 3D normal.");
        }
        // Configura um loop de animação básico para o modo 3D
        renderer.setAnimationLoop(() => {
            if (mixer) mixer.update(clock.getDelta());
            renderer.render(scene, camera);
        });
    }

    // Listener para redimensionamento da janela
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

async function loadModel() {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load('kioto.glb', (gltf) => {
            model = gltf.scene;
            // O mixer é inicializado aqui, mas a animação só será iniciada quando o modelo for adicionado à cena AR
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                // Não inicia a animação aqui, pois ela será iniciada após o posicionamento em AR.
                model.animations = gltf.animations; // Armazena as animações no modelo para fácil acesso
                console.log("Modelo GLB carregado com animações. Animação aguardando posicionamento em AR.");
            } else {
                console.warn("Nenhuma animação encontrada no arquivo GLB.");
            }
            resolve();
        }, undefined, (error) => {
            console.error('Erro ao carregar o modelo GLB:', error);
            reject(error);
        });
    });
}

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
        alert('Reconhecimento de voz não suportado neste navegador. Tente usar Chrome ou Edge.');
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
        console.log('Comando de voz detectado:', command);
        handleCommand(command);
    };

    recognition.onerror = (event) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        alert('Ocorreu um erro no reconhecimento de voz. Por favor, verifique as permissões do microfone e tente novamente.');
        micButton.textContent = '🎤';
        micButton.disabled = false;
    };

    recognition.onend = () => {
        console.log('Reconhecimento de voz encerrado.');
        micButton.textContent = '🎤'; // Volta ao ícone padrão
        micButton.disabled = false; // Reabilita o botão
    };
}

function handleCommand(command) {
    // Comando para iniciar a animação (primeira animação do GLB)
    if (command.includes('dançar') && mixer && model.animations && model.animations.length > 0) {
        const action = mixer.clipAction(model.animations[0]);
        action.reset().play(); // Reinicia e reproduz a primeira animação
        console.log("Comando 'dançar': Animação iniciada.");
    }
    // Comando para parar a animação
    else if (command.includes('parar') && mixer) {
        mixer.stopAllAction(); // Para todas as animações
        console.log("Comando 'parar': Animação parada.");
    }
    // Comandos de áudio gerais (usando o mapeamento audioCommands)
    else {
        let foundMatch = false;
        // Itera sobre as chaves do audioCommands para encontrar uma correspondência parcial
        for (const key in audioCommands) {
            // Verifica se o comando falado contém a chave.
            // A ordem das chaves em audioCommands pode influenciar se houver sobreposição.
            // Para "qual seu nome" ser preferido a "nome", "qual seu nome" deve vir antes ou a verificação ser mais específica.
            if (command.includes(key)) {
                playAudio(audioCommands[key]);
                console.log(`Comando '${command}' corresponde a '${key}': Áudio '${audioCommands[key]}' reproduzido.`);
                foundMatch = true;
                break; // Sai do loop assim que encontrar o primeiro comando
            }
        }

        // Caso o comando não seja reconhecido ou não tenha ação específica
        if (!foundMatch) {
            playAudio('nao_entendi.mp3'); // Áudio padrão para "não entendi"
            console.log(`Comando '${command}' não reconhecido ou sem ação associada.`);
        }
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
