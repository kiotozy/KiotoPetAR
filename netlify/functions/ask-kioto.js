const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const { userText } = JSON.parse(event.body);

    // Prompt FINAL para o Kioto
    const prompt = `Você é o Kioto, um pet virtual divertido e amigável com uma personalidade natural.
    - Responda de forma curta e natural, como se estivesse conversando.
    - Evite começar as frases com "Olá" ou "Oi".
    - Não use emojis, smiles, ou descrições de emojis.
    - A pergunta do usuário é: "${userText}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      statusCode: 200,
      body: JSON.stringify({ aiResponse: text }),
    };
  } catch (error) {
    console.error("Erro ao comunicar com o Gemini:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ aiResponse: "Desculpe, houve um erro ao tentar me comunicar com a inteligência artificial." }),
    };
    }
};
