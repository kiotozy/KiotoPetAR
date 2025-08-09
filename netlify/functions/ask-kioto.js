import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handler = async (event) => {
    try {
        const { userText } = JSON.parse(event.body);

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const result = await model.generateContent(userText);
        const response = await result.response;
        const text = response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ aiResponse: text })
        };
    } catch (error) {
        console.error("Erro ao comunicar com o Gemini:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Erro ao comunicar com a inteligência artificial." })
        };
    }
};
