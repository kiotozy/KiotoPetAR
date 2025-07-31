// ... (imports e variáveis globais)

// Ajuste ligeiro no mapeamento para ser mais robusto
const audioCommands = {
    'olá': 'ola.mp3', // Mais comum que 'oi' para reconhecimento
    'oi': 'ola.mp3',
    'bom dia': 'bom_dia.mp3',
    'boa tarde': 'boa_tarde.mp3',
    'boa noite': 'boa_noite.mp3',
    'qual seu nome': 'qual_seu_nome.mp3',
    'quer ser meu': 'quer_ser_meu.mp3',
    'comandos': 'comandos.mp3',
    'comando': 'comandos.mp3',
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

    // Carrega o modelo GLB primeiro
    await loadModel(); // Garante que o modelo esteja carregado antes de tentar iniciar AR

    // Tenta iniciar a sessão AR
    let arSessionAttempted = false; // Flag para controlar se a tentativa AR já ocorreu

    if (navigator.xr) { // Verifica se a API WebXR está disponível
        try {
            // A função ARButton.createButton já lida com a verificação de suporte
            // e cria um botão que inicia a sessão.
            // Para iniciar automaticamente, podemos tentar requestSession diretamente.
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test', 'dom-overlay'],
                domOverlay: { root: document.body }
            });
            renderer.xr.setSession(session);
            arSessionAttempted = true;
            console.log("Sessão AR iniciada automaticamente.");

            session.addEventListener('end', () => {
                console.log('Sessão AR finalizada.');
                modelPlacedInAR = false;
                if (model && model.parent) {
                    scene.remove(model);
                }
                // Talvez redirecionar ou mostrar um botão para tentar AR novamente
            });

            session.requestReferenceSpace('viewer').then((referenceSpace) => {
                session.requestHitTestSource({ space: referenceSpace }).then((source) => {
                    hitTestSource = source;
                    hitTestSourceInitialized = true;
                    console.log("Hit test source inicializado.");
                }).catch(e => {
                    console.error("Erro ao inicializar hit test source:", e);
                    // Mesmo com erro no hit-test, a sessão AR pode estar ativa, mas sem posicionamento automático.
                });
            }).catch(e => {
                console.error("Erro ao solicitar reference space:", e);
                // Mesmo com erro no reference space, a sessão AR pode estar ativa.
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
                            // Ajuste a escala inicial para que o modelo não apareça muito grande ou muito pequeno
                            model.scale.set(0.5, 0.5, 0.5); 
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

        } catch (e) {
            console.error("Erro ao iniciar sessão AR:", e);
            arSessionAttempted = true; // Marca que a tentativa foi feita
            // Se falhar a sessão AR, cai para o modo 3D normal
            setup3DNormalMode();
        }
    } else {
        console.warn("WebXR API não detectada neste navegador.");
        setup3DNormalMode(); // Se WebXR não existe, vai direto para 3D normal
    }

    // Função para configurar o modo 3D normal (fallback)
    function setup3DNormalMode() {
        console.log("Configurando modo 3D normal (fallback).");
        if (model && !model.parent) { // Adiciona o modelo apenas se ainda não estiver na cena
            scene.add(model);
        }
        model.position.set(0, 0, -3); // Posição mais visível para o fallback 3D
        model.scale.set(1, 1, 1); // Escala para o modo 3D normal
        camera.position.set(0, 1.5, 2); // Posição da câmera para visualização padrão
        
        // Adiciona controles orbitais para o modo 3D normal, se desejar
        // import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/OrbitControls.js';
        // const controls = new OrbitControls(camera, renderer.domElement);
        // controls.update(); // Será necessário chamar controls.update() no loop de renderização também

        if (mixer && model.animations && model.animations.length > 0) {
            mixer.clipAction(model.animations[0]).play();
            console.log("Animação iniciada em modo 3D normal.");
        } else {
            console.warn("Nenhuma animação para reproduzir em modo 3D normal.");
        }
        
        renderer.setAnimationLoop(() => {
            if (mixer) mixer.update(clock.getDelta());
            // if (controls) controls.update(); // Se usar OrbitControls
            renderer.render(scene, camera);
        });
    }

    window.addEventListener('resize', onWindowResize);
}

// ... (restante das funções loadModel, setupMic, startRecognition, handleCommand, playAudio)

// A função loadModel não precisa de mudanças significativas, apenas garantir que
// as animações sejam armazenadas no `model` para o mixer.
async function loadModel() {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load('kioto.glb', (gltf) => {
            model = gltf.scene;
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                model.animations = gltf.animations; // Armazena as animações no modelo
                console.log("Modelo GLB carregado com animações.");
            } else {
                console.warn("Nenhuma animação encontrada no arquivo GLB.");
                model.animations = []; // Garante que model.animations exista mesmo vazio
            }
            resolve();
        }, undefined, (error) => {
            console.error('Erro ao carregar o modelo GLB:', error);
            reject(error);
        });
    });
}
