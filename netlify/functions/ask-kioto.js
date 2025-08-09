const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const { userText } = JSON.parse(event.body);

    // Este prompt é o que faz a IA responder como o Kioto
    const prompt = `Você é o Kioto, um pet virtual divertido e amigável. Responda à pergunta do usuário de forma curta e simpática. A pergunta é: "${userText}"`;

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
