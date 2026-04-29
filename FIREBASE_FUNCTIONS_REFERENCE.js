const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Mistral } = require("@mistralai/mistralai");

admin.initializeApp();

/**
 * Firebase Function to process documents securely.
 * This hides the Mistral API Key on the server.
 */
exports.processDocument = functions.https.onCall(async (data, context) => {
  // 1. Check Authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Vui lòng đăng nhập để sử dụng tính năng này."
    );
  }

  const { base64Data, fileType } = data;
  if (!base64Data || !fileType) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Thiếu dữ liệu tệp tin hoặc loại tệp."
    );
  }

  // 2. Get API Key from Environment/Secret Manager
  // Use: firebase functions:secrets:set MISTRAL_API_KEY=YOUR_KEY
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY; 
  
  if (!MISTRAL_API_KEY) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Hệ thống chưa được cấu hình API Key."
    );
  }

  const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

  const EXTRACTION_PROMPT = `
    You are a specialized document parser for Vietnamese invoices.
    Extract structured data into the specified JSON format.
    (Giữ nguyên prompt bóc tách như trong mã nguồn...)
  `;

  try {
    // OCR Step
    const isPdf = fileType === "application/pdf";
    const ocrResponse = await mistral.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: isPdf ? "document_url" : "image_url",
        [isPdf ? "documentUrl" : "imageUrl"]: `data:${fileType};base64,${base64Data}`,
      },
    });

    const fullText = ocrResponse.pages.map((p) => p.markdown).join("\n\n");

    // Extraction Step
    const response = await mistral.chat.complete({
      model: "mistral-large-latest",
      messages: [{ role: "user", content: `${EXTRACTION_PROMPT}\n\n${fullText}` }],
      responseFormat: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return { success: true, data: result };
  } catch (error) {
    console.error("Functions Error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
