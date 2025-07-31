import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
// Importa ARButton para criar o botão de entrada em AR
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/webxr/ARButton.js';
// Importa OrbitControls para o modo 3D padrão
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/OrbitControls.js';


let camera, scene, renderer;
let model, mixer, clock;
let currentAudio = null;
let hitTestSource = null;
let hitTestSourceInitialized = false;
let modelPlacedInAR = false;
let controls; // Para OrbitControls

// Elementos do DOM
const canvas = document.getElementById('ar-canvas');
const micButton = document.getElementById('mic-button');
const arButtonContainer = document.getElementById('ar-button-container'); // O novo container

// Mapeamento de comandos de voz para arquivos de áudio
const audioCommands = {
    'olá': 'ola.mp3',
    'oi': 'ola.mp3',
    'bom dia': 'bom_dia.mp3',
    'boa tarde': 'boa_tarde.mp3',
    'boa noite': 'boa_noite.mp3',
    'qual seu nome': 'qual_seu_nome.mp3',
    'quer ser meu': 'quer_ser_meu.mp3',
    'comandos': 'comandos.mp3',
    'comando': 'comandos.mp3',
    'não entendi': 'nao_entendi.mp3',
};

init(); // Inicia a aplicação
setupMic(); // Configura o botão do microfone

async function init() {
    console.log("Iniciando init() da aplicação.");

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; // Habilita o módulo WebXR para uso futuro

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // Reticle para o modo AR (inicialmente invisível)
    const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Carrega o modelo GLB primeiro.
    await loadModel();
    console.log("Modelo GLB carregado. Preparando para modo 3D padrão.");

    // Configura o modo 3D normal por padrão
    setup3DNormalMode();


    // === Configuração do Botão AR ===
    // ARButton.createButton verifica a compatibilidade e adiciona o botão ao DOM
    // Ele gerencia a solicitação de sessão AR ao ser clicado
    const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.body }
    });
    arButtonContainer.appendChild(arButton);
    arButton.textContent = 'Entrar em AR'; // Personaliza o texto do botão

    // Adiciona listener para quando a sessão AR é iniciada (pelo botão)
    renderer.xr.addEventListener('sessionstart', (event) => {
        console.log('Sessão AR iniciada pelo botão. Configurando cena AR...');
        // Remove controles de órbita do modo 3D
        if (controls) controls.dispose();

        // Configura o hit test para posicionar o modelo no ambiente AR
        event.session.requestReferenceSpace('viewer').then((referenceSpace) => {
            event.session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                hitTestSource = source;
                hitTestSourceInitialized = true;
                console.log("Hit test source inicializado para AR.");
            }).catch(e => {
                console.error("Erro ao inicializar hit test source em AR:", e);
                alert("Não foi possível iniciar o posicionamento AR. Tente novamente.");
                renderer.xr.setSession(null); // Aborta a sessão se hit-test falhar
            });
        }).catch(e => {
            console.error("Erro ao solicitar reference space em AR:", e);
            alert("Não foi possível preparar o ambiente AR. Tente novamente.");
            renderer.xr.setSession(null); // Aborta a sessão se reference space falhar
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

                    if (!modelPlacedInAR && model) {
                        model.position.setFromMatrixPosition(reticle.matrix);
                        model.scale.set(0.5, 0.5, 0.5); // Escala para AR
                        scene.add(model);
                        modelPlacedInAR = true;
                        reticle.visible = false;

                        if (mixer && model.animations && model.animations.length > 0) {
                            mixer.clipAction(model.animations[0]).play();
                            console.log("Modelo posicionado e animação iniciada em AR.");
                        } else {
                            console.warn("Animações não disponíveis ou mixer não inicializado em AR.");
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
    });

    // Adiciona listener para quando a sessão AR é finalizada
    renderer.xr.addEventListener('sessionend', () => {
        console.log('Sessão AR finalizada. Voltando para modo 3D normal.');
        modelPlacedInAR = false;
        if (model && model.parent) {
            scene.remove(model); // Remove o modelo da cena AR
        }
        reticle.visible = false; // Garante que o reticle seja invisível
        hitTestSourceInitialized = false; // Reseta o hit test
        setup3DNormalMode(); // Volta para o modo 3D normal
    });

    // Listener para redimensionamento da janela
    window.addEventListener('resize', onWindowResize);
}


// Função para configurar o modo 3D normal (fallback)
function setup3DNormalMode() {
    console.log("Configurando modo 3D normal (fallback).");
    // Certifica-se de que o loop de animação do AR esteja parado
    renderer.setAnimationLoop(null);

    // Se o modelo já estiver na cena (ex: veio do AR), não o adicione novamente
    if (model && !model.parent) {
        scene.add(model);
    }
    model.position.set(0, 0, -3); // Posição mais visível para o fallback 3D
    model.scale.set(1, 1, 1); // Escala padrão para o modo 3D normal

    camera.position.set(0, 1.5, 2); // Posição inicial da câmera

    // Adiciona controles orbitais para o modo 3D normal
    if (!controls) { // Cria apenas se não existir (evita recriar após sair do AR)
        controls = new OrbitControls(camera, renderer.domElement);
    }
    controls.target.set(0, 1, 0); // Foca os controles no centro do modelo
    controls.update();

    if (mixer && model.animations && model.animations.length > 0) {
        mixer.clipAction(model.animations[0]).play();
        console.log("Animação iniciada em modo 3D normal.");
    } else {
        console.warn("Nenhuma animação para reproduzir em modo 3D normal.");
    }

    // Loop de renderização para o modo 3D normal
    renderer.setAnimationLoop(() => {
        if (mixer) mixer.update(clock.getDelta());
        if (controls) controls.update(); // Atualiza os controles de órbita
        renderer.render(scene, camera);
    });
}


async function loadModel() {
    return new Promise((resolve, reject) => {
        console.log("Iniciando carregamento do modelo GLB: kioto.glb");
        const loader = new GLTFLoader();
        loader.load('kioto.glb', (gltf) => {
            model = gltf.scene;
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                model.animations = gltf.animations; // Armazena as animações no modelo
                console.log("Modelo GLB 'kioto.glb' carregado com sucesso e contém animações.");
            } else {
                console.warn("Modelo GLB 'kioto.glb' carregado, mas nenhuma animação encontrada.");
                model.animations = [];
            }
            resolve();
        },
        // Opcional: callback de progresso
        (xhr) => {
            console.log(`Progresso de carregamento GLB: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
        },
        // Callback de erro
        (error) => {
            console.error('Erro ao carregar o modelo GLB:', error);
            // Se o modelo não carregar, setup3DNormalMode() será chamado mas não terá modelo.
            alert('Erro ao carregar o modelo 3D. Verifique o caminho e o arquivo GLB no console.');
            reject(error);
        });
    });
}

function setupMic() {
    const micBtn = document.getElementById('mic-button');
    if (micBtn) {
        console.log("setupMic(): Botão do microfone encontrado. Adicionando listener.");
        micBtn.addEventListener('click', () => {
            console.log("LOG 1: Botão do microfone clicado!");
            startRecognition();
            micBtn.textContent = 'Ouvindo...';
            micBtn.disabled = true;
        });
    } else {
        console.error("Erro: Botão do microfone com ID 'mic-button' não encontrado no DOM. Verifique index.html.");
    }
}

function startRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error("LOG 2: API SpeechRecognition não disponível neste navegador. Não é possível iniciar reconhecimento.");
        alert('Reconhecimento de voz não suportado neste navegador. Tente usar Chrome ou Edge.');
        micButton.textContent = '🎤';
        micButton.disabled = false;
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    console.log("LOG 3: Tentando chamar recognition.start()...");
    try {
        recognition.start();
        console.log("LOG 4: recognition.start() chamado com sucesso (ou sem erro imediato no try).");
    } catch (e) {
        console.error("LOG 5: Erro direto (exceção) ao chamar recognition.start():", e);
        alert('Erro ao iniciar microfone: ' + e.message + '. Verifique permissões.');
        micButton.textContent = '🎤';
        micButton.disabled = false;
        return;
    }


    recognition.onresult = (event) => {
        console.log("LOG 6: Resultado do reconhecimento recebido.");
        const command = event.results[0][0].transcript.toLowerCase();
        console.log('Comando de voz detectado:', command);
        handleCommand(command);
    };

    recognition.onerror = (event) => {
        console.error('LOG 7: Erro no reconhecimento de voz (evento onerror):', event.error);
        alert('Ocorreu um erro no reconhecimento de voz: ' + event.error + '. Por favor, verifique as permissões do microfone e tente novamente.');
        micButton.textContent = '🎤';
        micButton.disabled = false;
    };

    recognition.onend = () => {
        console.log('LOG 8: Reconhecimento de voz encerrado.');
        // Se o botão não foi reabilitado por onresult ou onerror, reabilita aqui
        if (micButton.disabled) {
            micButton.textContent = '🎤';
            micButton.disabled = false;
        }
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
        for (const key in audioCommands) {
            if (command.includes(key)) {
                playAudio(audioCommands[key]);
                console.log(`Comando '${command}' corresponde a '${key}': Áudio '${audioCommands[key]}' reproduzido.`);
                foundMatch = true;
                break;
            }
        }
        if (!foundMatch) {
            playAudio('nao_entendi.mp3'); // Áudio padrão para "não entendi"
            console.log(`Comando '${command}' não reconhecido ou sem ação associada.`);
        }
    }
}

function playAudio(file) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    currentAudio = new Audio(file);
    currentAudio.play().catch(e => console.error("Erro ao reproduzir áudio:", e));
}
