const { OpenAI } = require('openai');

exports.handler = async (event, context) => {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Método Não Permitido" };
    }

    try {
        const { userText } = JSON.parse(event.body);

        // 1. Geração de texto pela IA (GPT-3.5-turbo)
        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{
                role: "user",
                content: `Responda a seguinte pergunta de forma amigável e concisa, como um pet virtual de realidade aumentada chamado Kioto: ${userText}`
            }],
        });

        let aiResponseText = chatCompletion.choices[0].message.content;

        // **VERIFICAÇÃO DE MODERAÇÃO DA RESPOSTA DA IA**
        const moderation = await openai.moderations.create({
            input: aiResponseText,
        });

        const moderationResult = moderation.results[0];

        if (moderationResult.flagged) {
            console.warn("A resposta da IA foi sinalizada como insegura:", moderationResult);
            aiResponseText = "Não posso falar sobre isso. Vamos tentar outra coisa!";
        }

        // 2. Geração de áudio a partir do texto (Text-to-Speech da OpenAI)
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: aiResponseText,
        });

        const audioBuffer = Buffer.from(await mp3.arrayBuffer());
        
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "audio/mp3",
                "Access-Control-Allow-Origin": "*"
            },
            body: audioBuffer.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error("Erro na comunicação com a OpenAI:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erro ao gerar resposta.' })
        };
    };
};
