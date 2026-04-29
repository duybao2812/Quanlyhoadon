export async function extractFromInvoice(file: File): Promise<any> {
  try {
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });

    // Call the Google Apps Script Web App instead of the local server
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

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.details || errorData.error || "Backend processing failed");
    }

    return await res.json();
  } catch (error: any) {
    console.error("Extraction error:", error);
    const message = "Không thể trích xuất dữ liệu. " + (error.message || "");
    throw new Error(message);
  }
}

export async function classifyInvoice(items: any[]): Promise<string> {
  // We can also move this to backend if needed, but for now we'll do a simple fallback
  // Or we can create another backend endpoint. For simplicity, we'll use a local heuristic
  // since the main extraction already returns a classification from the server.
  const itemsText = items.map(i => `${i.name}`).join(', ').toLowerCase();
  
  if (itemsText.includes('ca máy') || itemsText.includes('xe cuốc') || itemsText.includes('xe ủi')) return 'BB_CM';
  if (itemsText.includes('bê tông') || itemsText.includes('xi măng') || itemsText.includes('vật tư')) return 'BB_VT';
  return 'BB_TC';
}
