export async function extractFromInvoice(file: File): Promise<any> {
  try {
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });

    const gasUrl = (import.meta as any).env.VITE_GAS_WEB_APP_URL;
    
    if (!gasUrl) {
      throw new Error("Vui lòng cấu hình VITE_GAS_WEB_APP_URL trong biến môi trường.");
    }

    console.log("Starting GAS call to:", gasUrl);
    const startTime = Date.now();

    const res = await fetch(gasUrl, {
      method: 'POST',
      body: JSON.stringify({
        base64Data,
        fileType: file.type
      })
    });

    console.log(`GAS response received in ${((Date.now() - startTime)/1000).toFixed(2)}s`);

    const responseText = await res.text();
    
    if (!res.ok) {
      let errorMsg = "Backend processing failed";
      try {
        const errorData = JSON.parse(responseText);
        errorMsg = errorData.details || errorData.error || errorMsg;
      } catch (e) {
        errorMsg = responseText || errorMsg;
      }
      throw new Error(errorMsg);
    }

    if (!responseText || responseText.trim() === "") {
      throw new Error("Máy chủ trả về kết quả rỗng.");
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse GAS response as JSON:", responseText);
      throw new Error("Dữ liệu trả về từ máy chủ không hợp lệ (không phải JSON).");
    }
  } catch (error: any) {
    console.error("Extraction error:", error);
    const message = "Không thể trích xuất dữ liệu. " + (error.message || "");
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
