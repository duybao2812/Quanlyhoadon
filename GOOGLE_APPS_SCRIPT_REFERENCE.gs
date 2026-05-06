/**
 * GOOGLE APPS SCRIPT BACKEND
 * Deployment: Deploy as Web App -> Execute as: Me -> Access: Anyone
 */

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const { base64Data, fileType } = requestData;
    
    if (!base64Data) {
      return createJsonResponse({ error: "Missing file data" }, 400);
    }

    const MISTRAL_API_KEY = PropertiesService.getScriptProperties().getProperty('MISTRAL_API_KEY');
    
    if (!MISTRAL_API_KEY) {
      return createJsonResponse({ error: "MISTRAL_API_KEY not configured in Script Properties" }, 500);
    }

    // 1. Mistral OCR Step (Using UrlFetchApp)
    const ocrUrl = "https://api.mistral.ai/v1/ocr";
    const ocrPayload = {
      model: "mistral-ocr-latest",
      document: {
        type: fileType === "application/pdf" ? "document_url" : "image_url",
        [fileType === "application/pdf" ? "document_url" : "image_url"]: `data:${fileType};base64,${base64Data}`
      }
    };

    const ocrOptions = {
      method: "post",
      contentType: "application/json",
      headers: { "Authorization": "Bearer " + MISTRAL_API_KEY },
      payload: JSON.stringify(ocrPayload),
      muteHttpExceptions: true
    };

    const ocrResponse = UrlFetchApp.fetch(ocrUrl, ocrOptions);
    if (ocrResponse.getResponseCode() !== 200) {
      return createJsonResponse({ error: "Mistral OCR Error", details: ocrResponse.getContentText() }, 500);
    }

    const ocrData = JSON.parse(ocrResponse.getContentText());
    const fullText = ocrData.pages.map(p => p.markdown).join("\n\n");

    // 2. Data Extraction Step (Using Mistral Large with a more robust prompt)
    const chatUrl = "https://api.mistral.ai/v1/chat/completions";
    const EXTRACTION_PROMPT = `Bạn là một chuyên gia kế toán Việt Nam. Hãy bóc tách dữ liệu từ hóa đơn (OCR) sang JSON chính xác 100%. 
    
    LUẬT PHÂN LOẠI (Classification):
    - "BB_VT" (Vật tư): Nếu nội dung có: "Thép", "Bê tông", "Xi măng", "Nhũ tương", "Vật liệu", "Cát", "Đá", "Gạch", "Sắt"...
    - "BB_CM" (Ca máy): Nếu nội dung có: "Xe", "Máy xúc", "Máy ủi", "Ca máy", "Thuê máy", "Vận chuyển", "Lu rung", "Cẩu"...
    - "BB_TC" (Thi công): Nếu nội dung có: "Thi công", "Nghiệm thu", "Khối lượng HT", "Giá trị hoàn thành", "Hoàn thành", "Gia công", "Lắp đặt"...
    - Tuyệt đối KHÔNG sử dụng cụm từ "Hóa đơn GTGT" cho trường classification.
    - Mặc định là "BB_VT".

    Cấu trúc JSON BẮT BUỘC:
    {
      "invoice": { "number": "Số hóa đơn", "serial": "Ký hiệu", "date": "YYYY-MM-DD" },
      "seller": { "name": "...", "taxCode": "..." },
      "buyer": { "name": "...", "taxCode": "..." },
      "items": [
        { "description": "Tên hàng hóa", "unit": "ĐVT", "quantity": 0, "unitPrice": 0, "amount": 0 }
      ],
      "totals": { "subtotal": 0, "vatAmount": 0, "grandTotal": 0 },
      "classification": "MÃ_PHÂN_LOẠI"
    }`;
    
    const chatPayload = {
      model: "mistral-large-latest",
      messages: [
        { role: "system", content: "You are a specialized document parser for Vietnamese invoices. Output ONLY valid raw JSON." },
        { role: "user", content: EXTRACTION_PROMPT + "\n\nDOCUMENT TEXT (OCR):\n" + fullText }
      ],
      response_format: { type: "json_object" }
    };

    const chatOptions = {
      method: "post",
      contentType: "application/json",
      headers: { "Authorization": "Bearer " + MISTRAL_API_KEY },
      payload: JSON.stringify(chatPayload),
      muteHttpExceptions: true
    };

    const chatResponse = UrlFetchApp.fetch(chatUrl, chatOptions);
    const finalContent = JSON.parse(chatResponse.getContentText()).choices[0].message.content;
    const extractedJson = JSON.parse(finalContent);

    // 3. Optional: Save to Google Drive (Free Storage Alternative)
    let driveUrl = "";
    try {
      driveUrl = saveToDrive(base64Data, fileType, "Invoice_" + Date.now());
    } catch (e) {
      console.error("Drive Save Error:", e);
    }

    // 4. Optional: Save to Google Sheets
    try {
      saveToSheet(extractedJson, driveUrl);
    } catch (sheetError) {
      console.error("Sheet Sync Error:", sheetError);
    }

    const response = {
      ...extractedJson,
      driveUrl: driveUrl
    };

    return createJsonResponse(response, 200);

  } catch (err) {
    return createJsonResponse({ error: err.toString() }, 500);
  }
}

function saveToDrive(base64, type, name) {
  const folderName = "Invoice_Uploads";
  let folder = DriveApp.getFoldersByName(folderName);
  folder = folder.hasNext() ? folder.next() : DriveApp.createFolder(folderName);
  
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), type, name);
  const file = folder.createFile(blob);
  return file.getUrl();
}

function saveToSheet(data, driveUrl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.create("Invoice_Management_DB");
  let sheet = ss.getSheetByName("Invoices");
  if (!sheet) {
    sheet = ss.insertSheet("Invoices");
    sheet.appendRow(["Số HĐ", "Ngày", "Người Bán", "Người Mua", "Tổng Tiền", "Link File", "Thời gian xử lý"]);
  }
  
  sheet.appendRow([
    data.invoice?.number || "",
    data.invoice?.date || "",
    data.seller?.name || "",
    data.buyer?.name || "",
    data.totals?.grandTotal || 0,
    driveUrl,
    new Date()
  ]);
}

function createJsonResponse(data, code) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
