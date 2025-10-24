
const { PollyClient, SynthesizeSpeechCommand } = require("@aws-sdk/client-polly");

const pollyClient = new PollyClient({ region: "eu-west-1" });

exports.handler = async (event) => {
  try {
    const { text } = JSON.parse(event.body);

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Text to speak is required." }),
      };
    }

    const params = {
      Text: text,
      OutputFormat: "mp3",
      VoiceId: "Zeina", // Arabic
    };

    const command = new SynthesizeSpeechCommand(params);
    const { AudioStream } = await pollyClient.send(command);

    const audioBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        AudioStream.on('data', (chunk) => chunks.push(chunk));
        AudioStream.on('end', () => resolve(Buffer.concat(chunks)));
        AudioStream.on('error', reject);
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": "attachment; filename=speech.mp3",
        // "Access-Control-Allow-Origin": "*",
      },
      body: audioBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to synthesize speech." }),
    };
  }
};
