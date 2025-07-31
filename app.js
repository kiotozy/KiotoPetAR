const comandos = {
  "olá": "ola.mp3",
  "bom dia": "bom_dia.mp3",
  "boa tarde": "boa_tarde.mp3",
  "boa noite": "boa_noite.mp3",
  "qual seu nome": "qual_seu_nome.mp3",
  "quer ser meu amigo": "quer_ser_meu_amigo.mp3",
  "comandos": "comandos.mp3"
};

const botaoFalar = document.getElementById("falar");
const botaoAR = document.getElementById("ativar-ar");

const dica = document.getElementById("dica");

function reproduzirAudio(nomeArquivo) {
  const audio = new Audio(nomeArquivo);
  audio.play();
}

function iniciarReconhecimento() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Seu navegador não suporta reconhecimento de voz.");
    return;
  }

  const reconhecimento = new SpeechRecognition();
  reconhecimento.lang = "pt-BR";
  reconhecimento.interimResults = false;
  reconhecimento.maxAlternatives = 1;

  reconhecimento.start();

  reconhecimento.onresult = (event) => {
    const comando = event.results[0][0].transcript.toLowerCase().trim();
    console.log("Comando:", comando);
    if (comandos[comando]) {
      reproduzirAudio(comandos[comando]);
    } else {
      reproduzirAudio("nao_entendi.mp3");
    }
  };

  reconhecimento.onerror = (event) => {
    console.error("Erro:", event.error);
  };
}

botaoFalar.addEventListener("click", iniciarReconhecimento);

botaoAR.addEventListener("click", () => {
  document.querySelector("model-viewer").activateAR();
});
