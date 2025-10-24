const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

// Create a Bedrock client
const client = new BedrockRuntimeClient({ region: "us-west-2" }); // Use the region where you enabled model access

// The specific model ID for Claude 3 Sonnet
const modelId = "anthropic.claude-3-5-sonnet-20241022-v2:0";

exports.handler = async (event) => {
  try {
    // 1. Parse the incoming request body to get the image data
    const body = JSON.parse(event.body);
    const base64ImageData = body.image.split(',')[1]; // Remove the "data:image/jpeg;base64," prefix

    // 2. Prepare the prompt for the multimodal LLM (Claude 3)
    const systemPrompt = `You are a helpful pharmacy assistant. Analyze the user-provided image of a medication prescription.
    Extract all medications listed. For each medication, identify its name, dosage, and the prescribed schedule (times per day).
    Return the information ONLY as a valid JSON object with a single key "medications", which is an array.
    Each object in the array should have three keys: "name", "dosage", and "schedule". The schedule should be an array of strings in "HH:MM" format.
    If a prescription says "twice a day", use "09:00" and "21:00" as defaults. If it says "once a day", use "09:00".
    Do not include any other text, explanations, or apologies in your response.`;

    const userMessage = {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64ImageData } },
        { type: "text", text: "Please analyze this prescription and return the JSON." }
      ]
    };

    // 3. Create the payload for the Bedrock API call
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [userMessage]
    };

    // 4. Invoke the model
    const command = new InvokeModelCommand({
      body: JSON.stringify(payload),
      contentType: "application/json",
      accept: "application/json",
      modelId: modelId,
    });
    const apiResponse = await client.send(command);

    // 5. Decode and parse the response from Bedrock
    const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
    const responseBody = JSON.parse(decodedResponseBody);
    const llmResponseText = responseBody.content[0].text;
    const parsedLlmResponse = JSON.parse(llmResponseText); // The LLM's response is a stringified JSON

    // 6. Return a successful response to the frontend
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Required for CORS
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify(parsedLlmResponse),
    };

  } catch (error) {
    console.error("Error processing prescription:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Failed to process prescription.", error: error.message }),
    };
  }
};