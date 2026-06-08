export async function extractFromInvoice(file: File): Promise<any> {
  const logPrefix = `[AI-EXTRACTOR][${file.name}]`;
  console.log(`${logPrefix} Initializing extraction pipeline...`);
  
  try {
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error("Không thể đọc tệp tin dưới dạng base64."));
      reader.readAsDataURL(file);
    });

    // Use local server's process-document endpoint which handles Mistral OCR server-side
    // This avoids CORS issues and uses the server's MISTRAL_API_KEY
    const processUrl = '/api/process-document';

    console.log(`${logPrefix} Sending request to: ${processUrl}`);
    const startTime = Date.now();

    const res = await fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64Data,
        fileType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/xml')
      })
    });

    const duration = ((Date.now() - startTime)/1000).toFixed(2);
    console.log(`${logPrefix} Received response in ${duration}s. Status: ${res.status}`);

    const responseText = await res.text();
    
    if (!res.ok) {
      console.error(`${logPrefix} Backend error (HTTP ${res.status}):`, responseText);
      let errorMsg = "Lỗi xử lý tại máy chủ.";
      try {
        const errorData = JSON.parse(responseText);
        errorMsg = errorData.details || errorData.error || errorMsg;
      } catch (e) {
        errorMsg = responseText || errorMsg;
      }
      throw new Error(errorMsg);
    }

    if (!responseText || responseText.trim() === "") {
      console.error(`${logPrefix} Empty response received.`);
      throw new Error("Máy chủ trả về kết quả rỗng.");
    }

    try {
      const parsedData = JSON.parse(responseText);
      console.log(`${logPrefix} Data successfully extracted and parsed.`);
      return parsedData;
    } catch (e) {
      console.error(`${logPrefix} JSON Parse Error:`, responseText);
      throw new Error("Dữ liệu trả về từ máy chủ không hợp lệ (không phải JSON).");
    }
  } catch (error: any) {
    console.error(`${logPrefix} Critical Extraction Failure:`, error);
    const message = error.message || "Lỗi không xác định trong quá trình bóc tách.";
    throw new Error(message);
  }
}

export async function classifyInvoice(items: any[]): Promise<string> {
  const contentText = items.map(i => `${i.description || i.name || ''}`).join(' ').toLowerCase();
  
  // Rules for Materials (Vật tư)
  const materialKeywords = ["thép", "bê tông", "xi măng", "nhũ tương", "cát", "đá", "vật liệu", "gạch", "sắt"];
  if (materialKeywords.some(kw => contentText.includes(kw))) return 'BB_VT';

  // Rules for Machines (Ca máy)
  const machineKeywords = ["xe", "máy xúc", "máy ủi", "vận chuyển", "thuê máy", "lu rung", "cẩu", "uỉ"];
  if (machineKeywords.some(kw => contentText.includes(kw))) return 'BB_CM';

  // Rules for Construction (Thi công)
  const constructionKeywords = ["giá trị hoàn thành", "thi công", "nghiệm thu", "khối lượng hoàn thành", "gia công", "lắp đặt"];
  if (constructionKeywords.some(kw => contentText.includes(kw))) return 'BB_TC';

  // Default fallback
  return 'BB_VT';
}
