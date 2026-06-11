/**
 * GOOGLE APPS SCRIPT BACKEND
 * Deployment: Deploy as Web App -> Execute as: Me -> Access: Anyone
 */

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    
    // Check if it is a list files request
    if (requestData.action === "list_files") {
      const files = listAllDriveFiles();
      return createJsonResponse({ success: true, files: files }, 200);
    }

    // Check if it is a get file content request (e.g. for XML parsing on Client side)
    if (requestData.action === "get_file_content") {
      const { fileName } = requestData;
      if (!fileName) {
        return createJsonResponse({ error: "Missing fileName" }, 400);
      }
      
      const folders = getOrCreateFolderStructure();
      let files = folders.xmlFolder.getFilesByName(fileName);
      if (!files.hasNext()) {
        files = folders.pdfFolder.getFilesByName(fileName);
      }
      
      if (!files.hasNext()) {
        return createJsonResponse({ error: "File not found on Google Drive: " + fileName }, 404);
      }
      
      const file = files.next();
      const textContent = file.getBlob().getDataAsString("UTF-8");
      return createJsonResponse({ 
        success: true, 
        content: textContent, 
        url: file.getUrl() 
      }, 200);
    }
    
    // Check if it is an extract file request from Drive directly
    if (requestData.action === "extract_file") {
      const { fileName } = requestData;
      if (!fileName) {
        return createJsonResponse({ error: "Missing fileName for extraction" }, 400);
      }
      
      const folders = getOrCreateFolderStructure();
      let files = folders.pdfFolder.getFilesByName(fileName);
      if (!files.hasNext()) {
        files = folders.xmlFolder.getFilesByName(fileName);
      }
      
      if (!files.hasNext()) {
        return createJsonResponse({ error: "File not found on Google Drive: " + fileName }, 404);
      }
      
      const file = files.next();
      const blob = file.getBlob();
      const base64Data = Utilities.base64Encode(blob.getBytes());
      const fileType = blob.getContentType();
      
      // Let's run the Mistral OCR and AI extraction using this file's data!
      return runOcrAndExtraction(base64Data, fileType, fileName, false); // false = do not save file again
    }

    // Action to save a contract file (.docx) generated in React frontend to Drive
    if (requestData.action === "save_contract_file") {
      const { base64Data, fileName, contractFolder } = requestData;
      if (!base64Data || !fileName) {
        return createJsonResponse({ error: "Missing base64Data or fileName" }, 400);
      }
      
      const folders = getOrCreateFolderStructure();
      const folderName = contractFolder || fileName.replace(/\.docx$/i, '');
      const contractSubfolder = getOrCreateContractSubfolder(folders, folderName);
      
      // Delete any duplicate files in the contract's unique folder
      const existing = contractSubfolder.getFilesByName(fileName);
      while (existing.hasNext()) {
        existing.next().setTrashed(true);
      }
      
      const blob = Utilities.newBlob(
        Utilities.base64Decode(base64Data), 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        fileName
      );
      const file = contractSubfolder.createFile(blob);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        Logger.log("Failed to set file sharing: " + e.toString());
      }
      
      return createJsonResponse({ 
        success: true, 
        driveUrl: file.getUrl(), 
        fileId: file.getId() 
      }, 200);
    }

    // Action to overwrite/update a contract file on Drive with new React data
    if (requestData.action === "update_contract_file") {
      const { base64Data, fileId, fileName, contractFolder } = requestData;
      if (!base64Data) {
        return createJsonResponse({ error: "Missing base64Data" }, 400);
      }
      
      const folders = getOrCreateFolderStructure();
      const folderName = contractFolder || (fileName ? fileName.replace(/\.docx$/i, '') : "Hợp Đồng Cập Nhật");
      const contractSubfolder = getOrCreateContractSubfolder(folders, folderName);
      let file;
      
      if (fileId) {
        try {
          file = DriveApp.getFileById(fileId);
        } catch (e) {
          Logger.log("Failed to find file by ID: " + fileId);
        }
      }
      
      if (!file && fileName) {
        const files = contractSubfolder.getFilesByName(fileName);
        if (files.hasNext()) {
          file = files.next();
        }
      }
      
      // Trash existing file to overwrite contents cleanly
      if (file) {
        file.setTrashed(true);
      }
      
      const blob = Utilities.newBlob(
        Utilities.base64Decode(base64Data), 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        fileName || "Hop_Dong_Cap_Nhat.docx"
      );
      const newFile = contractSubfolder.createFile(blob);
      try {
        newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        Logger.log("Failed to set file sharing: " + e.toString());
      }
      
      return createJsonResponse({ 
        success: true, 
        driveUrl: newFile.getUrl(), 
        fileId: newFile.getId() 
      }, 200);
    }

    // Action to save a contract PDF scan to its AI-extraction subfolder
    // Supports: contractFolder (name of subfolder), parentFolderName (optional override for root folder)
    if (requestData.action === "save_contract_pdf") {
      const { base64Data, fileName, contractFolder, parentFolderName } = requestData;
      if (!base64Data || !fileName) {
        return createJsonResponse({ error: "Missing base64Data or fileName" }, 400);
      }
      
      // Step 1: Find or create root folder (default: "Hệ Thống Quản Lý Hóa Đơn")
      const rootFolderName = parentFolderName || "Hệ Thống Quản Lý Hóa Đơn";
      let rootFolder;
      const rootFolderIter = DriveApp.getFoldersByName(rootFolderName);
      if (rootFolderIter.hasNext()) {
        rootFolder = rootFolderIter.next();
      } else {
        rootFolder = DriveApp.createFolder(rootFolderName);
        try {
          rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (e) {
          Logger.log("Could not set sharing on root folder: " + e.toString());
        }
      }
      
      // Step 2: Find or create contractFolder directly inside root folder
      // e.g. "Hợp đồng trích xuất AI" inside "Hệ Thống Quản Lý Hóa Đơn"
      const subfolderName = contractFolder || "Hợp đồng trích xuất AI";
      let contractSubfolder;
      const subIter = rootFolder.getFoldersByName(subfolderName);
      if (subIter.hasNext()) {
        contractSubfolder = subIter.next();
      } else {
        contractSubfolder = rootFolder.createFolder(subfolderName);
        try {
          contractSubfolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (e) {
          Logger.log("Could not set sharing on contract subfolder: " + e.toString());
        }
      }
      
      // Step 3: Delete any duplicate PDF scan with the same name in the target folder
      const existing = contractSubfolder.getFilesByName(fileName);
      while (existing.hasNext()) {
        existing.next().setTrashed(true);
      }
      
      // Step 4: Create the file
      const blob = Utilities.newBlob(
        Utilities.base64Decode(base64Data), 
        "application/pdf", 
        fileName
      );
      const file = contractSubfolder.createFile(blob);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        Logger.log("Failed to set file sharing: " + e.toString());
      }
      
      return createJsonResponse({ 
        success: true, 
        driveUrl: file.getUrl(), 
        fileId: file.getId(),
        folderUrl: contractSubfolder.getUrl()
      }, 200);
    }

    // Action to save an advance payment voucher file to the contract's dedicated "Chứng từ Tạm ứng" subfolder
    if (requestData.action === "save_advance_voucher") {
      const { base64Data, fileName, fileType, contractFolder } = requestData;
      if (!base64Data || !fileName || !fileType || !contractFolder) {
        return createJsonResponse({ error: "Missing base64Data, fileName, fileType or contractFolder" }, 400);
      }
      
      const folders = getOrCreateFolderStructure();
      const contractSubfolder = getOrCreateContractSubfolder(folders, contractFolder);
      
      // Get or create "Chứng từ Tạm ứng" subfolder inside the contract's subfolder
      let voucherSubfolder;
      const subfolderName = "Chứng từ Tạm ứng";
      const existingSub = contractSubfolder.getFoldersByName(subfolderName);
      if (existingSub.hasNext()) {
        voucherSubfolder = existingSub.next();
      } else {
        voucherSubfolder = contractSubfolder.createFolder(subfolderName);
      }
      
      // Set sharing permission to "Anyone with the link - Viewer" so it can be viewed by others
      try {
        voucherSubfolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        Logger.log("Failed to set voucher folder permissions: " + e.toString());
      }
      
      // Delete duplicate file with the same name in the voucher folder
      const existing = voucherSubfolder.getFilesByName(fileName);
      while (existing.hasNext()) {
        existing.next().setTrashed(true);
      }
      
      const blob = Utilities.newBlob(
        Utilities.base64Decode(base64Data), 
        fileType, 
        fileName
      );
      const file = voucherSubfolder.createFile(blob);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {
        Logger.log("Failed to set file sharing: " + e.toString());
      }
      
      return createJsonResponse({ 
        success: true, 
        driveUrl: file.getUrl(), 
        fileId: file.getId() 
      }, 200);
    }

    // Action to delete contract files/folder on Google Drive
    if (requestData.action === "delete_contract_folder") {
      const { folderName, fileId, pdfFileId } = requestData;
      
      if (fileId) {
        try {
          const file = DriveApp.getFileById(fileId);
          file.setTrashed(true);
        } catch (e) {
          Logger.log("Error trashing fileId " + fileId + ": " + e.toString());
        }
      }
      
      if (pdfFileId) {
        try {
          const file = DriveApp.getFileById(pdfFileId);
          file.setTrashed(true);
        } catch (e) {
          Logger.log("Error trashing pdfFileId " + pdfFileId + ": " + e.toString());
        }
      }
      
      if (folderName) {
        try {
          const folders = getOrCreateFolderStructure();
          const subfolders = folders.contractsFolder.getFoldersByName(folderName);
          while (subfolders.hasNext()) {
            const subfolder = subfolders.next();
            subfolder.setTrashed(true);
          }
        } catch (e) {
          Logger.log("Error trashing contract folder " + folderName + ": " + e.toString());
        }
      }
      
      return createJsonResponse({ success: true }, 200);
    }

    // Action to download a contract file from Google Drive as Base64
    if (requestData.action === "download_file") {
      const { fileId } = requestData;
      if (!fileId) {
        return createJsonResponse({ error: "Missing fileId" }, 400);
      }
      try {
        const file = DriveApp.getFileById(fileId);
        const blob = file.getBlob();
        const base64Data = Utilities.base64Encode(blob.getBytes());
        return createJsonResponse({ 
          success: true, 
          base64Data: base64Data,
          fileName: file.getName(),
          contentType: blob.getContentType()
        }, 200);
      } catch (err) {
        return createJsonResponse({ error: "Failed to read file from Drive: " + err.toString() }, 500);
      }
    }

    const { base64Data, fileType, fileName } = requestData;
    if (!base64Data) {
      return createJsonResponse({ error: "Missing file data" }, 400);
    }
    
    return runOcrAndExtraction(base64Data, fileType, fileName, true); // true = save file to Drive
  } catch (err) {
    return createJsonResponse({ error: err.toString() }, 500);
  }
}

function runOcrAndExtraction(base64Data, fileType, fileName, shouldSaveToDrive) {
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

  // 3. Save to Google Drive if needed
  let driveUrl = "";
  if (shouldSaveToDrive) {
    try {
      driveUrl = saveToDrive(base64Data, fileType, fileName || ("Invoice_" + Date.now()));
    } catch (e) {
      console.error("Drive Save Error:", e);
    }
  } else {
    // If we are extracting an existing file on Drive, find its Drive URL instead
    try {
      const folders = getOrCreateFolderStructure();
      let files = folders.pdfFolder.getFilesByName(fileName);
      if (!files.hasNext()) {
        files = folders.xmlFolder.getFilesByName(fileName);
      }
      if (files.hasNext()) {
        driveUrl = files.next().getUrl();
      }
    } catch (e) {
      console.error("Error finding existing Drive URL:", e);
    }
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
}

// Helper to manage hierarchical folder structure automatically
function getOrCreateFolderStructure() {
  const rootFolderName = "Hệ Thống Quản Lý Hóa Đơn";
  const uploadSubfolderName = "Hóa Đơn Gốc";
  const reportSubfolderName = "Bảng Tính & Báo Cáo";
  const backupSubfolderName = "Sao Lưu Bảng Tính Cũ";
  const contractsSubfolderName = "Lưu Trữ Hợp Đồng";
  
  const pdfSubfolderName = "Hóa Đơn PDF";
  const xmlSubfolderName = "Hóa Đơn XML";
  
  let rootFolder;
  let rootFolders = DriveApp.getFoldersByName(rootFolderName);
  if (rootFolders.hasNext()) {
    rootFolder = rootFolders.next();
  } else {
    rootFolder = DriveApp.createFolder(rootFolderName);
  }
  
  // Set root folder sharing permission to "Anyone with the link - Viewer"
  try {
    rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log("Failed to set root folder sharing permissions: " + e.toString());
  }
  
  let uploadFolder;
  let uploadFolders = rootFolder.getFoldersByName(uploadSubfolderName);
  if (uploadFolders.hasNext()) {
    uploadFolder = uploadFolders.next();
  } else {
    uploadFolder = rootFolder.createFolder(uploadSubfolderName);
  }
  
  // Create/retrieve "Hóa Đơn PDF" subfolder inside "Hóa Đơn Gốc"
  let pdfFolder;
  let pdfFolders = uploadFolder.getFoldersByName(pdfSubfolderName);
  if (pdfFolders.hasNext()) {
    pdfFolder = pdfFolders.next();
  } else {
    pdfFolder = uploadFolder.createFolder(pdfSubfolderName);
  }
  
  // Create/retrieve "Hóa Đơn XML" subfolder inside "Hóa Đơn Gốc"
  let xmlFolder;
  let xmlFolders = uploadFolder.getFoldersByName(xmlSubfolderName);
  if (xmlFolders.hasNext()) {
    xmlFolder = xmlFolders.next();
  } else {
    xmlFolder = uploadFolder.createFolder(xmlSubfolderName);
  }
  
  let reportFolder;
  let reportFolders = rootFolder.getFoldersByName(reportSubfolderName);
  if (reportFolders.hasNext()) {
    reportFolder = reportFolders.next();
  } else {
    reportFolder = rootFolder.createFolder(reportSubfolderName);
  }

  let backupFolder;
  let backupFolders = rootFolder.getFoldersByName(backupSubfolderName);
  if (backupFolders.hasNext()) {
    backupFolder = backupFolders.next();
  } else {
    backupFolder = rootFolder.createFolder(backupSubfolderName);
  }
  
  let contractsFolder;
  let contractsFolders = rootFolder.getFoldersByName(contractsSubfolderName);
  if (contractsFolders.hasNext()) {
    contractsFolder = contractsFolders.next();
  } else {
    contractsFolder = rootFolder.createFolder(contractsSubfolderName);
  }
  
  return {
    rootFolder: rootFolder,
    uploadFolder: uploadFolder,
    reportFolder: reportFolder,
    backupFolder: backupFolder,
    pdfFolder: pdfFolder,
    xmlFolder: xmlFolder,
    contractsFolder: contractsFolder
  };
}

// Helper to open/create a single consolidated spreadsheet inside Bảng Tính & Báo Cáo
function getOrCreateConsolidatedSpreadsheet(reportFolder) {
  const ssName = "Danh_Sach_Hoa_Don_Tong_Hop";
  let files = reportFolder.getFilesByName(ssName);
  let ss;
  
  if (files.hasNext()) {
    const file = files.next();
    ss = SpreadsheetApp.open(file);
  } else {
    ss = SpreadsheetApp.create(ssName);
    const ssFile = DriveApp.getFileById(ss.getId());
    
    // Move the newly created sheet file into the subfolder
    reportFolder.addFile(ssFile);
    DriveApp.getRootFolder().removeFile(ssFile);
  }
  
  return ss;
}

function saveToDrive(base64, type, name) {
  const folders = getOrCreateFolderStructure();
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), type, name);
  
  // 1. Tự động nhận diện định dạng để lưu vào đúng thư mục con
  const ext = name.split('.').pop()?.toLowerCase();
  let targetFolder = ext === 'xml' ? folders.xmlFolder : folders.pdfFolder;
  
  // 2. Tự động dọn dẹp file cũ trùng tên trong thư mục đích trước khi tạo file mới
  const existingFiles = targetFolder.getFilesByName(name);
  while (existingFiles.hasNext()) {
    const existingFile = existingFiles.next();
    existingFile.setTrashed(true); // Đưa file cũ trùng tên vào thùng rác để tránh trùng lặp
    Logger.log("Đã tự động dọn dẹp tệp cũ trùng tên: " + name);
  }
  
  const file = targetFolder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log("Failed to set file sharing: " + e.toString());
  }
  return file.getUrl();
}

function saveToSheet(data, driveUrl) {
  const folders = getOrCreateFolderStructure();
  const ss = getOrCreateConsolidatedSpreadsheet(folders.reportFolder);
  
  let sheet = ss.getSheetByName("Invoices");
  if (!sheet) {
    sheet = ss.insertSheet("Invoices");
    sheet.appendRow(["Số HĐ", "Ngày", "Người Bán", "Người Mua", "Tổng Tiền", "Link File", "Thời gian xử lý"]);
    sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f3f3");
    
    const defaultSheet = ss.getSheetByName("Sheet1");
    if (defaultSheet) {
      ss.deleteSheet(defaultSheet);
    }
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

// Function to migrate all old Invoice_Management_DB sheets into the single consolidated sheet
function mergeOldSheets() {
  const folders = getOrCreateFolderStructure();
  const targetSs = getOrCreateConsolidatedSpreadsheet(folders.reportFolder);
  let targetSheet = targetSs.getSheetByName("Invoices");
  
  if (!targetSheet) {
    targetSheet = targetSs.insertSheet("Invoices");
    targetSheet.appendRow(["Số HĐ", "Ngày", "Người Bán", "Người Mua", "Tổng Tiền", "Link File", "Thời gian xử lý"]);
    targetSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#f3f3f3");
    
    const defaultSheet = targetSs.getSheetByName("Sheet1");
    if (defaultSheet) {
      targetSs.deleteSheet(defaultSheet);
    }
  }

  const oldFiles = DriveApp.getFilesByName("Invoice_Management_DB");
  let mergeCount = 0;
  let oldSpreadsheets = [];

  while (oldFiles.hasNext()) {
    const file = oldFiles.next();
    oldSpreadsheets.push(file);
  }

  for (let i = 0; i < oldSpreadsheets.length; i++) {
    const file = oldSpreadsheets[i];
    try {
      const oldSs = SpreadsheetApp.open(file);
      const oldSheet = oldSs.getSheetByName("Invoices") || oldSs.getSheets()[0];
      
      if (oldSheet) {
        const lastRow = oldSheet.getLastRow();
        if (lastRow > 1) {
          const dataRange = oldSheet.getRange(2, 1, lastRow - 1, 7);
          const values = dataRange.getValues();
          
          for (let r = 0; r < values.length; r++) {
            targetSheet.appendRow(values[r]);
            mergeCount++;
          }
        }
      }
      
      // Move old sheet to backup folder
      folders.backupFolder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
      
    } catch (e) {
      Logger.log("Error merging old file " + file.getName() + ": " + e.toString());
    }
  }

  return {
    success: true,
    mergedRowsCount: mergeCount,
    mergedFilesCount: oldSpreadsheets.length
  };
}

// Helper to list all files in Hóa Đơn PDF and Hóa Đơn XML subfolders
function listAllDriveFiles() {
  const folders = getOrCreateFolderStructure();
  const list = [];
  
  // 1. Scan PDF folder
  const pdfFiles = folders.pdfFolder.getFiles();
  while (pdfFiles.hasNext()) {
    const file = pdfFiles.next();
    list.push({
      name: file.getName(),
      url: file.getUrl()
    });
  }
  
  // 2. Scan XML folder
  const xmlFiles = folders.xmlFolder.getFiles();
  while (xmlFiles.hasNext()) {
    const file = xmlFiles.next();
    list.push({
      name: file.getName(),
      url: file.getUrl()
    });
  }
  
  return list;
}

// Hàm xóa file trùng lặp trong một thư mục chỉ định (Dựa trên cả Tên file và mã MD5 nội dung)
function removeDuplicatesInFolder(folder) {
  const files = folder.getFiles();
  const seenNames = {};
  const seenHashes = {};
  let deleteCount = 0;
  
  const filesList = [];
  while (files.hasNext()) {
    filesList.push(files.next());
  }
  
  // Sắp xếp file theo thời gian tạo (từ cũ nhất đến mới nhất) để giữ lại file đầu tiên (file gốc)
  filesList.sort(function(a, b) {
    return a.getDateCreated() - b.getDateCreated();
  });
  
  for (let i = 0; i < filesList.length; i++) {
    const file = filesList[i];
    const fileName = file.getName().trim().toLowerCase();
    const fileHash = file.getMd5Checksum(); // Lấy mã băm MD5 để so khớp nội dung chính xác 100%
    
    let isDuplicate = false;
    
    // 1. So khớp theo Tên file
    if (seenNames[fileName]) {
      isDuplicate = true;
      Logger.log("Trùng tên file: " + file.getName() + " (Giữ lại file cũ hơn)");
    } 
    // 2. So khớp theo Nội dung (MD5 Hash) - Phòng trường hợp cùng nội dung nhưng đổi tên
    else if (fileHash && seenHashes[fileHash]) {
      isDuplicate = true;
      Logger.log("Trùng nội dung file: " + file.getName() + " (Mã băm MD5: " + fileHash + ")");
    }
    
    if (isDuplicate) {
      file.setTrashed(true); // Đưa file trùng lặp vào Thùng rác (an toàn, có thể khôi phục)
      deleteCount++;
    } else {
      seenNames[fileName] = true;
      if (fileHash) {
        seenHashes[fileHash] = true;
      }
    }
  }
  
  return deleteCount;
}

// Hàm chạy dọn dẹp trùng lặp cho cả 2 thư mục PDF và XML
function cleanAllDuplicateInvoices() {
  const folders = getOrCreateFolderStructure();
  
  Logger.log("Bắt đầu dọn dẹp file trùng lặp...");
  
  const pdfDeleted = removeDuplicatesInFolder(folders.pdfFolder);
  Logger.log("Đã dọn dẹp xong thư mục Hóa Đơn PDF. Số file trùng lặp đã xóa: " + pdfDeleted);
  
  const xmlDeleted = removeDuplicatesInFolder(folders.xmlFolder);
  Logger.log("Đã dọn dẹp xong thư mục Hóa Đơn XML. Số file trùng lặp đã xóa: " + xmlDeleted);
  
  return {
    success: true,
    pdfDeleted: pdfDeleted,
    xmlDeleted: xmlDeleted,
    totalDeleted: pdfDeleted + xmlDeleted
  };
}

function createJsonResponse(data, code) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper to get or create a dedicated subfolder for each contract inside "Hợp Đồng Đã Tạo"
function getOrCreateContractSubfolder(folders, contractFolderName) {
  const cleanFolderName = (contractFolderName || "Hợp Đồng Chung").trim();
  let contractSubfolder;
  const existing = folders.contractsFolder.getFoldersByName(cleanFolderName);
  if (existing.hasNext()) {
    contractSubfolder = existing.next();
  } else {
    contractSubfolder = folders.contractsFolder.createFolder(cleanFolderName);
    try {
      contractSubfolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      Logger.log("Failed to set folder sharing: " + e.toString());
    }
  }
  return contractSubfolder;
}
