/**
 * CLOUDFLARE WORKER: MISTRAL PROXY & OCR PROCESSOR
 * Triển khai tại: workers.cloudflare.com
 * Biến môi trường cần thiết: MISTRAL_API_KEY
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const payload = await request.json();
      const { base64Data, fileType } = payload;

      // 1. Gọi Mistral OCR (hoặc xử lý AI tùy ý)
      // Lưu ý: Hiện tại Mistral OCR yêu cầu tích hợp cụ thể, 
      // ở đây ta giả định luồng bóc tách dữ liệu từ text hoặc ảnh.
      
      const MISTRAL_API_KEY = env.MISTRAL_API_KEY;
      
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages: [
            {
              role: "system",
              content: "You are a professional accountant. Extract invoice data into JSON. Classification: BB_VT (Materials), BB_CM (Machines), BB_TC (Construction)."
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract data from this invoice content." },
                { type: "image_url", image_url: { url: `data:${fileType};base64,${base64Data}` } }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      const result = await response.json();
      const content = result.choices[0].message.content;

      return new Response(content, {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.toString() }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
