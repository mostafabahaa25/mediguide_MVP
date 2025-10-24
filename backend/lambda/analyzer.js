const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

// Create a Bedrock client
const client = new BedrockRuntimeClient({ region: "us-west-2" }); // Use the region where you enabled model access

// The specific model ID for Claude 3.5 Sonnet
const modelId = "anthropic.claude-3-5-sonnet-20241022-v2:0";

exports.handler = async (event) => {
  try {
    // 1. Parse the incoming request body to get the image data and medications
    const body = JSON.parse(event.body);
    const base64ImageData = body.image.split(',')[1]; // Remove the "data:image/jpeg;base64," prefix
    const userMedications = body.medications;
    const alreadyTaken = body.takenToday;
    const currentTime = body.time;
    
    // Get the current time in HH:MM format to pass to the model
    // 2. Prepare the prompt for the multimodal LLM (Claude 3)
    const systemPrompt = `You are a helpful medication analysis assistant. Your task is to analyze a user-provided image of a medication and cross-reference it with their list of prescribed medications and schedules.

    You will be given:
    1. An image of a single medication.
    2. A JSON array of the user's saved medications, including their names, dosages, and scheduled times , and the mediccations that the user has already taken today and when.
    3. The current time.

    Your instructions are:
    1.  First, identify the name of the medication in the image.
    2.  Then, check if this medication name exists in the user's saved medication list.
    3.  If it exists, check its schedule to determine if it is the correct time to take it and make sure it is not taken earlier to prevent overdose. A medication should be taken if the current time is within a 30-minute window (before or after) of a scheduled time and taken it now will not be an overdose.
    5.  Based on your analysis, create a summary and a list of recommendations.

    Return the information ONLY as a valid JSON object with a single key "analysis".
    The "analysis" object should have the following keys:
    - "summary": A short, human-readable summary of the analysis (e.g., "It looks like it's time to take your Metformin 500mg.","It looks like you already took this Salbutamol 30 mins before dont take it it will be an overdose " , "This medication is not on your list.", or "It is not the right time for this medication.").
    - "recommendations": An array of strings with helpful next steps or information. For example:
        - If it's the correct time: ["Remember to log this dose after you take it by swipe up or down.", "Take with a full glass of water."]
        - If it's the correct time but taken before: ["You already took this 1 hour before and it is dangerous take a second dose.", "Do not take this medication now unless instructed by your doctor."]
        - If it's not the correct time: ["Your next scheduled dose is at 21:00.", "Do not take this medication now unless instructed by your doctor."]
        - If unrecognized: ["Please ensure the medication label is clear in the photo.", "You can add this medication to your list manually if it's a new prescription."]
    - "medication_id_found": The ID of the medication from the user's list if found, otherwise null.
    Do not include any other text, explanations, or apologies in your response. and make sure the response in Arabic language.`;

    const userMessage = {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64ImageData } },
        { type: "text", text: `Here is the list of my medications and their schedules: ${JSON.stringify(userMedications)}. The current time is ${currentTime}. and here is the medication already taken today ${JSON.stringify(alreadyTaken)} , Please analyze the medication in the image and provide the JSON output.` }
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
    const parsedLlmResponse = JSON.parse(llmResponseText);

    // 6. Return a successful response to the frontend
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Required for CORS
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify(parsedLlmResponse.analysis),
    };

  } catch (error) {
    console.error("Error analyzing medication:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Failed to analyze medication.", error: error.message }),
    };
  }
};