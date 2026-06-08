import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import multer from 'multer';
import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';
import axios from 'axios';
import OpenAI from 'openai';
import os from 'os';
import { JSDOM } from 'jsdom';
import { exec } from 'child_process';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limit for base64 payloads
app.use(express.json({ limit: '50mb' }));
app.use('/templates', express.static(path.join(process.cwd(), 'templates')));
app.use('/templatesHopDong', express.static(path.join(process.cwd(), 'templatesHopDong')));
app.use('/templates_muc_phu', express.static(path.join(process.cwd(), 'templates_muc_phu')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const upload = multer({ dest: 'uploads/temp' });

// Initialize Mistral on server-side
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'da1QD7MoXhRA2JRujftHQOEOmRE6lpVj';
const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

const EXTRACTION_PROMPT = `
You are a specialized document parser for Vietnamese invoices.
Extract structured data from the provided document.
Map the data into this EXACT JSON structure:

{
  "seller": { "name": "", "taxCode": "", "address": "", "accountNumber": "", "bankName": "" },
  "buyer": { "name": "", "taxCode": "", "address": "", "accountNumber": "", "bankName": "" },
  "invoice": { "number": "", "serial": "", "date": "", "vatRate": 8, "note": "" },
  "items": [{ "name": "", "unit": "", "quantity": 0, "unitPrice": 0, "total": 0 }],
  "totals": { "subtotal": 0, "vatAmount": 0, "grandTotal": 0, "amountInWords": "" },
  "classification": "BB_CM | BB_VT | BB_TC"
}

Notes:
- Tax code = MST.
- address: Full address including province/city.
- accountNumber: Số tài khoản ngân hàng (nếu có).
- bankName: Tên ngân hàng (nếu có).
- classification: "BB_CM" (Machine/Ca máy), "BB_VT" (Materials/Vật tư), "BB_TC" (Construction/Thi công).
- If invoice has "Bê tông", it's BB_VT.
- vatRate = Thuế suất (8, 10).
- invoice.note: Trích xuất nội dung ghi chú đặc biệt nếu có (VD: "Điều chỉnh cho hóa đơn mẫu số...", "Thay thế hóa đơn...", "Hóa đơn điều chỉnh giảm/tăng"). Nếu không có thì để trống.
- RETURN ONLY THE JSON.
`;

function escapeXml(unsafe: string) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function formatVNNumber(num: number | string) {
  const n = typeof num === 'string' ? parseFloat(num.replace(/[^0-9]/g, '')) : num;
  if (isNaN(n) || n === null) return null;
  return n.toLocaleString('vi-VN');
}

function fallbackDots(val: any) {
  if (val === undefined || val === null || val === '' || val === 'undefined' || val === 'null') {
    return "....................";
  }
  return val;
}

function formatCompanyName(name: any) {
  const val = fallbackDots(name);
  if (val === "....................") return val;
  if (typeof val !== 'string') return val;
  
  const hasDiacritics = (word: string) => /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(word);

  // Mapping for common structural words that are often input without accents
  const structuralMapping: Record<string, string> = {
    'cong': 'Công',
    'ty': 'ty',
    'co': 'Cổ',
    'phan': 'phần',
    'dau': 'Đầu',
    'tu': 'tư',
    'xay': 'Xây',
    'dung': 'dựng',
    'thuong': 'Thương',
    'mai': 'mại',
    'dich': 'Dịch',
    'vu': 'vụ',
    'san': 'Sản',
    'xuat': 'xuất',
    'nhap': 'nhập',
    'khau': 'khẩu',
    'quoc': 'Quốc',
    'thinh': 'Thịnh'
  };

  // Words that should definitely be Title Case even if unsigned (Names, etc.)
  const titleCaseUnsigned = ['an', 'thanh', 'thuan', 'le', 'nguyen', 'tran', 'pham', 'vu', 'vo', 'dang', 'bui', 'do', 'ho', 'ngo', 'duong', 'minh', 'nam'];

  // Higher priority acronyms
  const upperCaseTerms = ['INT', 'VNCN', 'E&C', 'TNHH', 'CP', 'MTV', 'VN', 'JS', 'JSC', 'VAT', 'STK', 'HTX', 'PCCC', 'GTVT', 'XD', 'TM', 'DV', 'CN', 'KCN', 'SX', 'XNK'];

  const words = val.trim().split(/\s+/);
  
  return words.map((word, index) => {
    if (!word) return '';
    
    const lowerWord = word.toLowerCase();
    const upperWord = word.toUpperCase();

    // 1. If it has diacritics, keep as Title Case (don't map)
    if (hasDiacritics(word)) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }

    // 2. Check structural mapping (unsigned -> signed)
    if (structuralMapping[lowerWord]) {
      let result = structuralMapping[lowerWord];
      if (index === 0) result = result.charAt(0).toUpperCase() + result.slice(1);
      return result;
    }

    // 3. Check names/words that should be Title Case
    if (titleCaseUnsigned.includes(lowerWord)) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }

    // 4. Check acronyms
    if (upperCaseTerms.includes(upperWord) || /[&/.\-]/.test(word)) {
      return upperWord;
    }

    // 5. Short words (<= 2 chars) that aren't 'An' or 'Ty' or structural are usually acronyms
    if (word.length <= 2) {
      return upperWord;
    }

    // Default to Title Case for longer words to be safe
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function getNetworkAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceArray = interfaces[name];
    if (ifaceArray) {
      for (const iface of ifaceArray) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return null;
}

async function startServer() {
  if (!fs.existsSync('uploads/templates')) {
    fs.mkdirSync('uploads/templates', { recursive: true });
  }
  if (!fs.existsSync('uploads/temp')) {
    fs.mkdirSync('uploads/temp', { recursive: true });
  }

  app.get('/api/templates', (req, res) => {
    if (!fs.existsSync('uploads/templates')) {
      return res.json({ templates: [] });
    }
    const files = fs.readdirSync('uploads/templates');
    const templates = files
      .filter(f => f.endsWith('.docx'))
      .map(f => f.replace('.docx', ''));
    res.json({ templates });
  });

  app.post('/api/upload-template', upload.single('template'), (req: any, res) => {
    const templateType = req.body.templateType;
    if (!templateType || !req.file) {
      return res.status(400).json({ error: 'Missing templateType or file' });
    }

    const ext = path.extname(req.file.originalname);
    const targetPath = path.join(process.cwd(), 'uploads/templates', `${templateType}${ext}`);
    
    try {
      // Use renameSync to move from temp multer destination to target name
      fs.renameSync(req.file.path, targetPath);
      res.json({ message: 'Template uploaded successfully', templateId: templateType });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save template file' });
    }
  });

  // NEW: Google Apps Script Proxy to avoid CORS issues
  app.post('/api/proxy-gas', async (req, res) => {
    try {
      const gasUrl = process.env.VITE_GAS_WEB_APP_URL;
      if (!gasUrl) {
        console.error("GAS Proxy Error: VITE_GAS_WEB_APP_URL is missing in .env");
        return res.status(500).json({ error: 'VITE_GAS_WEB_APP_URL is not configured on server' });
      }

      console.log(`[PROXY] Forwarding request to GAS...`);
      
      // Node 18+ global fetch
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      const responseText = await response.text();
      console.log(`[PROXY] GAS responded with status: ${response.status}`);
      console.log(`[PROXY] GAS response body:`, responseText.substring(0, 2000));

      if (!response.ok) {
        console.error(`[PROXY] GAS error response:`, responseText);
        return res.status(response.status).send(responseText);
      }

      if (!responseText || responseText.trim() === "") {
        console.error(`[PROXY] Empty response from GAS`);
        return res.status(500).json({ error: 'Máy chủ GAS trả về kết quả rỗng.' });
      }

      try {
        const json = JSON.parse(responseText);
        res.json(json);
      } catch (e) {
        res.send(responseText);
      }
    } catch (error: any) {
      console.error("GAS Proxy Critical Error:", error);
      res.status(500).json({ 
        error: "Lỗi kết nối đến Google Script từ máy chủ (Proxy Error).",
        details: error.message 
      });
    }
  });

  // NEW: Cas AddressKit Proxy API
  app.post('/api/convert-address', async (req, res) => {
    try {
      const { oldAddress } = req.body;
      if (!oldAddress) {
        return res.status(400).json({ error: 'Missing oldAddress' });
      }

      console.log(`Proxying Cas AddressKit for: ${oldAddress}`);

      const response = await fetch('https://production.cas.so/address-kit/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldAddress })
      });

      const result = await response.json();
      console.log("Cas API Response:", JSON.stringify(result, null, 2));
      res.json(result);
    } catch (error: any) {
      console.error("Cas Proxy Error:", error);
      res.status(500).json({ 
        error: "Lỗi kết nối đến dịch vụ Cas AddressKit từ máy chủ.",
        details: error.message 
      });
    }
  });

  app.post('/api/process-document', async (req, res) => {
    try {
      const { base64Data, fileType } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: 'Missing base64Data' });
      }

      console.log(`Processing ${fileType} document via Mistral server-side...`);

      // Step 1: Mistral OCR
      const isPdf = fileType === 'application/pdf';
      const ocrResponse = await mistral.ocr.process({
        model: "mistral-ocr-latest",
        document: {
          type: isPdf ? "document_url" : "image_url",
          [isPdf ? "documentUrl" : "imageUrl"]: `data:${fileType};base64,${base64Data}`,
        } as any,
      });

      const fullText = (ocrResponse as any).pages.map((page: any) => page.markdown).join('\n\n');

      // Step 2: Extraction via Mistral Large
      const response = await mistral.chat.complete({
        model: "mistral-large-latest",
        messages: [
          {
            role: "user",
            content: `${EXTRACTION_PROMPT}\n\nDOCUMENT TEXT:\n${fullText}`
          }
        ],
        responseFormat: { type: "json_object" }
      });

      const result = response.choices?.[0]?.message?.content;
      res.json(typeof result === 'string' ? JSON.parse(result) : result);
    } catch (error: any) {
      console.error("Mistral Backend Error:", error);
      res.status(500).json({ 
        error: "Mistral AI không thể trích xuất dữ liệu từ máy chủ.",
        details: error.message 
      });
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    const { messages, stream = true } = req.body;
    
    // Add system message if not present
    const finalMessages = [...messages];
    if (!messages.find((m: any) => m.role === 'system')) {
      finalMessages.unshift({
        role: 'system',
        content: 'Bạn là một trợ lý AI thông minh tích hợp trong hệ thống quản lý hóa đơn và hợp đồng. Bạn hỗ trợ tiếng Việt rất tốt. Bạn có thể giúp người dùng phân tích dữ liệu, tóm tắt nội dung, hoặc thực hiện các thao tác trên dashboard. Hãy trả lời ngắn gọn, súc tích và chuyên nghiệp.'
      });
    }

    const providers = [
      {
        name: 'Cerebras',
        apiKey: process.env.CEREBRAS_API_KEY,
        baseURL: 'https://api.cerebras.ai/v1',
        model: 'llama3.1-8b' 
      },
      {
        name: 'Gemini',
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        model: 'gemini-1.5-flash'
      },
      {
        name: 'Groq',
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile'
      },
      {
        name: 'OpenRouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        model: 'qwen/qwen-2.5-72b-instruct:free'
      }
    ];

    const errors = [];

    for (const provider of providers) {
      if (!provider.apiKey) {
        const errorMsg = `Provider ${provider.name} skipped: Missing API Key`;
        console.warn(`[SYSTEM_AI_LOG] ${errorMsg}`);
        errors.push({ provider: provider.name, error: 'Missing API Key' });
        continue;
      }
      
      try {
        console.log(`[SYSTEM_AI_LOG] Attempting: ${provider.name} (${provider.model})`);
        const client = new OpenAI({
          apiKey: provider.apiKey,
          baseURL: provider.baseURL,
        });

        if (stream) {
          const aiStream = await client.chat.completions.create({
            model: provider.model,
            messages: finalMessages,
            stream: true,
          });

          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          try {
            for await (const chunk of aiStream) {
              const data = JSON.stringify(chunk);
              res.write(`data: ${data}\n\n`);
            }
            res.write('data: [DONE]\n\n');
            console.log(`[SYSTEM_AI_LOG] Successfully completed with ${provider.name}`);
            return res.end();
          } catch (streamError: any) {
            console.error(`[SYSTEM_AI_ERROR] Streaming error with ${provider.name}:`, streamError.message);
            errors.push({ provider: provider.name, error: streamError.message, type: 'stream' });
            if (!res.headersSent) throw streamError;
            return res.end();
          }
        } else {
          const response = await client.chat.completions.create({
            model: provider.model,
            messages: finalMessages,
          });
          console.log(`[SYSTEM_AI_LOG] Successfully completed with ${provider.name}`);
          return res.json(response);
        }
      } catch (error: any) {
        console.error(`[SYSTEM_AI_ERROR] ${provider.name} failed:`, error.message);
        errors.push({ provider: provider.name, error: error.message });
        // Continue to next provider
      }
    }

    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Tất cả các nhà cung cấp AI đều thất bại hoặc chưa được cấu hình.',
        systemLogs: errors
      });
    }
  });

  // NEW: System launcher API to bypass browser sandbox in Wallpaper Engine
  app.post('/api/system/launch', (req, res) => {
    const { appName } = req.body;
    console.log(`[SYSTEM] Nhận yêu cầu khởi chạy ứng dụng: ${appName}`);
    
    let command = '';
    switch (appName) {
      case 'vscode':
        command = 'code .'; // Open VS Code at current project directory
        break;
      case 'spotify':
        command = 'start spotify:';
        break;
      case 'steam':
        command = 'start steam:';
        break;
      case 'chrome':
        command = 'start chrome https://www.google.com';
        break;
      case 'explorer':
        command = 'explorer .'; // Open explorer at current project directory
        break;
      default:
        return res.status(400).json({ error: `Ứng dụng ${appName} không được hỗ trợ.` });
    }

    exec(command, (err) => {
      if (err) {
        console.error(`Lỗi khởi chạy ${appName}:`, err);
        return res.status(500).json({ error: `Không thể mở ${appName}`, details: err.message });
      }
      res.json({ success: true, message: `Đã mở ${appName} thành công!` });
    });
  });

  // NEW: Save and Retrieve Firebase Auth Session for Wallpaper Engine Integration
  app.post('/api/auth/save-session', (req, res) => {
    const sessionData = req.body;
    console.log(`[AUTH] Lưu phiên đăng nhập từ trình duyệt bên ngoài cho user: ${sessionData?.email}`);
    
    try {
      const sessionPath = path.join(process.cwd(), 'uploads', 'session_auth.json');
      fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
      res.json({ success: true, message: 'Đã lưu phiên đăng nhập thành công!' });
    } catch (err: any) {
      console.error('Lỗi khi lưu phiên đăng nhập:', err);
      res.status(500).json({ error: 'Không thể lưu phiên đăng nhập', details: err.message });
    }
  });

  app.get('/api/auth/get-session', (req, res) => {
    try {
      const sessionPath = path.join(process.cwd(), 'uploads', 'session_auth.json');
      if (fs.existsSync(sessionPath)) {
        const rawData = fs.readFileSync(sessionPath, 'utf-8');
        const sessionData = JSON.parse(rawData);
        return res.json(sessionData);
      }
      res.status(404).json({ error: 'Không tìm thấy phiên đăng nhập đã lưu.' });
    } catch (err: any) {
      console.error('Lỗi khi đọc phiên đăng nhập:', err);
      res.status(500).json({ error: 'Không thể đọc phiên đăng nhập', details: err.message });
    }
  });

  app.post('/api/parse-xml', async (req, res) => {
    try {
      const { xmlString } = req.body;
      if (!xmlString) return res.status(400).json({ error: 'Missing xmlString' });

      const { parseStringPromise } = await import('xml2js');
      const result = await parseStringPromise(xmlString, { 
        explicitArray: false,
        tagNameProcessors: [(name) => name.replace(/^.*:/, '')] // Remove namespaces
      });
      
      // Helper to clean and parse numbers
      const parseInvoiceNumber = (val: any): number => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return val;
        // Remove non-digit characters except for decimal separator if it's a string
        const cleanStr = String(val).replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleanStr);
        return isNaN(num) ? 0 : num;
      };

      // Deep search helper
      const deepSearch = (obj: any, targetKey: string): any => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj[targetKey] !== undefined) return obj[targetKey];
        
        for (const key in obj) {
          const res = deepSearch(obj[key], targetKey);
          if (res) return res;
        }
        return null;
      };

      const findNode = (obj: any, keys: string[]) => {
        for (const key of keys) {
          const found = deepSearch(obj, key);
          if (found !== null && found !== undefined) return found;
        }
        return null;
      };

      // 1. Get Main Blocks
      const nBan = findNode(result, ['NBan']) || {};
      const nMua = findNode(result, ['NMua']) || {};
      const tTChung = findNode(result, ['TTChung']) || {};
      const tToan = findNode(result, ['TToan', 'THTToan']) || {};
      
      // 2. Items extraction (Try finding HHDVu list)
      let itemsList: any[] = [];
      const dshhdvu = findNode(result, ['DSHHDVu', 'DSHHoa', 'ListData']);
      if (dshhdvu) {
        const hhdvu = findNode(dshhdvu, ['HHDVu', 'HHoa', 'Item']);
        if (hhdvu) {
          itemsList = Array.isArray(hhdvu) ? hhdvu : [hhdvu];
        }
      } else {
        // Fallback: look for HHDVu anywhere
        const hhdvuNode = findNode(result, ['HHDVu', 'HHoa']);
        if (hhdvuNode) {
          itemsList = Array.isArray(hhdvuNode) ? hhdvuNode : [hhdvuNode];
        }
      }
      
      // 3. Map values carefully
      const parsedData = {
        seller: {
          name: nBan.Ten || nBan.SellerName || "",
          taxCode: nBan.MST || nBan.TaxCode || "",
          address: nBan.DChi || nBan.Address || "",
          accountNumber: nBan.STK || nBan.SoTK || nBan.AccountNumber || "",
          bankName: nBan.TNHang || nBan.TenNH || nBan.BankName || ""
        },
        buyer: {
          name: nMua.Ten || nMua.BuyerName || "",
          taxCode: nMua.MST || nMua.TaxCode || "",
          address: nMua.DChi || nMua.Address || "",
          accountNumber: nMua.STK || nMua.SoTK || nMua.AccountNumber || "",
          bankName: nMua.TNHang || nMua.TenNH || nMua.BankName || ""
        },
        invoice: {
          number: tTChung.SHDon || tTChung.InvoiceNo || "",
          serial: tTChung.KHHDon || tTChung.Series || "",
          date: tTChung.NLap || tTChung.InvoiceDate || "",
          vatRate: 8 // default
        },
        items: itemsList.map((item: any) => ({
          description: item.THHDVu || item.Ten || item.TenHHoa || item.ItemName || "",
          unit: item.DVTinh || item.Unit || "",
          quantity: parseInvoiceNumber(item.SLuong),
          unitPrice: parseInvoiceNumber(item.DGia),
          amount: parseInvoiceNumber(item.ThTien || item.ThanhTien || item.TotalAmount)
        })),
        totals: {
          subtotal: parseInvoiceNumber(tToan.TgTCThue || tToan.SubTotal),
          vatAmount: parseInvoiceNumber(tToan.TgTThue || tToan.VATAmount),
          grandTotal: parseInvoiceNumber(tToan.TgTTTBSo || tToan.TgTTToan || tToan.TotalAmountWithVAT),
          amountInWords: tToan.TgTTTBChu || tToan.AmountInWords || ""
        },
        classification: "BB_VT"
      };

      res.json(parsedData);
    } catch (error: any) {
      console.error("XML Parse Error:", error);
      res.status(500).json({ error: 'Lỗi phân tích XML', details: error.message });
    }
  });

  app.post('/api/generate', (req, res) => {
    const { templateType, data, partnerA, partnerB, contractNumber, contractDate } = req.body;
    let templatePath = path.join(process.cwd(), 'uploads/templates', `${templateType}.docx`);

    try {
      if (!fs.existsSync(templatePath)) {
        // Fallback for default templates
        if (templateType.startsWith('Template_HD')) {
          templatePath = path.join(process.cwd(), 'templatesHopDong', `${templateType}.docx`);
        } else {
          templatePath = path.join(process.cwd(), 'templates', `${templateType}.docx`);
        }
      }

      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ error: `Template ${templateType} not found.` });
      }

      const binaryContent = fs.readFileSync(templatePath, 'binary');
      const rawVat = data.invoice.vatRate !== undefined && data.invoice.vatRate !== null && data.invoice.vatRate !== '' ? data.invoice.vatRate : '8';
      const vatRateStr = rawVat.toString().includes('%') ? rawVat.toString() : `${rawVat}%`;
      
      const tableRows = (data.items || []).map((item: any, index: number) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        const amount = item.amount || item.total || (qty * price);
        
        return {
          STT: (index + 1).toString(),
          NOIDUNG: fallbackDots(item.description || item.name),
          DVT: fallbackDots(item.unit),
          SOLUONG: qty > 0 ? formatVNNumber(qty) : fallbackDots(null),
          DONGIA: price > 0 ? formatVNNumber(price) : fallbackDots(null),
          THANHTIEN: amount > 0 ? formatVNNumber(amount) : '0'
        };
      });

      const generateDocxTable = (items: any[]) => {
        const columns = [
          { header: "STT", key: "STT", width: "600" },
          { header: "TÊN HÀNG HÓA, DỊCH VỤ", key: "NOIDUNG", width: "4500" },
          { header: "ĐVT", key: "DVT", width: "800" },
          { header: "SỐ LƯỢNG", key: "SOLUONG", width: "800" },
          { header: "ĐƠN GIÁ", key: "DONGIA", width: "1200" },
          { header: "THÀNH TIỀN", key: "THANHTIEN", width: "1600" }
        ];

        const makeCell = (text: string, width: string, align: string, bold = false, span = 0, vAlign = '', shade = '') => {
          const escaped = escapeXml(text);
          const bTag = bold ? '<w:b/><w:bCs/>' : '';
          const runTag = escaped ? `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>${bTag}<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>` : '';
          const spanTag = span ? `<w:gridSpan w:val="${span}"/>` : '';
          const vAlignTag = vAlign ? `<w:vAlign w:val="${vAlign}"/>` : '';
          const shadeTag = shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : '';
          const spacingBefore = (span || vAlign === 'center') ? '100' : '60';
          const spacingAfter = (span || vAlign === 'center') ? '100' : '60';
          return `<w:tc><w:tcPr>${spanTag}<w:tcW w:w="${width}" w:type="dxa"/>${shadeTag}${vAlignTag}</w:tcPr><w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:before="${spacingBefore}" w:after="${spacingAfter}"/></w:pPr>${runTag}</w:p></w:tc>`;
        };

        return `
<w:tbl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tblPr>
    <w:tblW w:w="5000" w:type="pct"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>${columns.map(c => `<w:gridCol w:w="${c.width}"/>`).join('')}</w:tblGrid>
  <w:tr>
    <w:trPr><w:trHeight w:val="450"/></w:trPr>
    ${columns.map(col => makeCell(col.header, col.width, 'center', true, 0, 'center', 'F2F2F2')).join('')}
  </w:tr>
  ${items.map(item => `
  <w:tr>
    ${makeCell(item.STT, '600', 'center')}
    ${makeCell(item.NOIDUNG, '4500', 'left')}
    ${makeCell(item.DVT, '800', 'center')}
    ${makeCell(item.SOLUONG, '800', 'right')}
    ${makeCell(item.DONGIA, '1200', 'right')}
    ${makeCell(item.THANHTIEN, '1600', 'right')}
  </w:tr>`).join('')}
  <w:tr>
    ${makeCell('CỘNG TIỀN HÀNG:', '7900', 'right', true, 5, 'center')}
    ${makeCell(formatVNNumber(data.totals.subtotal), '1600', 'right', true)}
  </w:tr>
  <w:tr>
    ${makeCell(`THUẾ GTGT (${vatRateStr}):`, '7900', 'right', true, 5, 'center')}
    ${makeCell(formatVNNumber(data.totals.vatAmount), '1600', 'right', true)}
  </w:tr>
  <w:tr>
    ${makeCell('TỔNG CỘNG THANH TOÁN:', '7900', 'right', true, 5, 'center')}
    ${makeCell(formatVNNumber(data.totals.grandTotal), '1600', 'right', true)}
  </w:tr>
</w:tbl>`;
      };

      const tableXml = generateDocxTable(tableRows);

      const zip = new PizZip(binaryContent);
      
      // PRE-PROCESS document.xml to convert placeholders to raw XML markers (@prefix)
      let docXml = zip.file("word/document.xml")?.asText() || "";
      const placeholders = ["BB_BANGGIATHUEXE", "BB_BANGVATTU", "BB_BANGTHICONG", "items"];
      placeholders.forEach(p => {
        const regex = new RegExp(`\\[${p}\\]`, 'g');
        docXml = docXml.replace(regex, `[@${p}]`);
      });
      zip.file("word/document.xml", docXml);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "[", end: "]" }
      });

      const today = new Date();
      const formatDocDate = (dateStr: string | undefined): string => {
        if (!dateStr) return `ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr || "";
          const day = d.getDate().toString().padStart(2, '0');
          const month = (d.getMonth() + 1).toString().padStart(2, '0');
          const year = d.getFullYear();
          return `ngày ${day} tháng ${month} năm ${year}`;
        } catch (e) {
          return dateStr || "";
        }
      };

      const invoiceDateRaw = data.invoice?.date;
      const mergerDate = new Date('2025-07-01');
      let isAfterMerger = false;
      if (invoiceDateRaw) {
        const d = new Date(invoiceDateRaw);
        if (!isNaN(d.getTime())) {
          isAfterMerger = d >= mergerDate;
        }
      }

      const getEffectiveAddress = (partner: any, extractedAddr: string) => {
        if (isAfterMerger && partner.addressPostMerger) {
          return partner.addressPostMerger;
        }
        return partner.address || extractedAddr;
      };

      // Đối với template Ca máy (BB_CM), hoán đổi vai trò A và B theo yêu cầu
      let pA = partnerA || {};
      let pB = partnerB || {};
      let sData = data.seller;
      let bData = data.buyer;

      if (templateType === 'BB_CM') {
        const tempP = pA;
        pA = pB;
        pB = tempP;
        
        const tempD = sData;
        sData = bData;
        bData = tempD;
      }

      const variables = {
        SO_HOPDONG: contractNumber || "....................",
        NGAYKYHOPDONG: contractDate || "....................",
        NGAY_BB: formatDocDate(data.invoice?.date),
        BEN_A: fallbackDots(pA.name || sData.name),
        BEN_B: fallbackDots(pB.name || bData.name),
        BEN_A_TITLE: formatCompanyName(pA.name || sData.name),
        BEN_B_TITLE: formatCompanyName(pB.name || bData.name),
        DAIDIENBENA: fallbackDots(pA.representative),
        DAIDIENBENB: fallbackDots(pB.representative),
        CHUCVUBENA: fallbackDots(pA.position),
        CHUCVUBENB: fallbackDots(pB.position),
        GIOITINHBENA: fallbackDots(pA.gender || "Ông/Bà"),
        GIOITINHBENB: fallbackDots(pB.gender || "Ông/Bà"),
        DIACHIBENA: fallbackDots(getEffectiveAddress(pA, sData.address)),
        DIACHIBENB: fallbackDots(getEffectiveAddress(pB, bData.address)),
        MSTBENA: fallbackDots(pA.taxCode || sData.taxCode),
        MSTBENB: fallbackDots(pB.taxCode || bData.taxCode),
        STK_BENA: fallbackDots(pA.accountNumber || sData.accountNumber),
        NH_BENA: fallbackDots(pA.bankName || sData.bankName),
        STK_BENB: fallbackDots(pB.accountNumber || bData.accountNumber),
        NH_BENB: fallbackDots(pB.bankName || bData.bankName),
        
        // Pass the raw XML string for the modified placeholders
        BB_BANGGIATHUEXE: tableXml,
        BB_BANGVATTU: tableXml,
        BB_BANGTHICONG: tableXml,
        items: tableXml,
        
        TONGCONG: fallbackDots(formatVNNumber(data.totals.subtotal)),
        THUE_VAT: fallbackDots(formatVNNumber(data.totals.vatAmount)),
        TONG_THANH_TOAN: fallbackDots(formatVNNumber(data.totals.grandTotal)),
        SO_TIEN_CHU: fallbackDots(data.totals.amountInWords),
        TONG_TIEN_BANG_CHU: fallbackDots(data.totals.amountInWords),
        VAT_RATE: vatRateStr
      };

      doc.render(variables);
      
      let documentXml = doc.getZip().file("word/document.xml")?.asText() || "";
      if (documentXml) {
        // 1. Autofix table inside paragraph
        const fixedXml = documentXml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?<w:tbl\b[\s\S]*?<\/w:tbl>(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, (match) => {
          const tblMatch = match.match(/<w:tbl\b[\s\S]*?<\/w:tbl>/);
          return tblMatch ? tblMatch[0] + '<w:p/>' : match;
        });

        // 2. Validate XML syntax using Node's jsdom DOMParser and ensure no w:tbl is nested inside w:p
        try {
          const dom = new JSDOM();
          const parser = new dom.window.DOMParser();
          const xmlDoc = parser.parseFromString(fixedXml, "text/xml");
          const parserError = xmlDoc.getElementsByTagName("parsererror");
          if (parserError.length > 0) {
            throw new Error(parserError[0].textContent || "XML parse error");
          }

          const tables = xmlDoc.getElementsByTagName("w:tbl");
          for (let i = 0; i < tables.length; i++) {
            let parent = tables[i].parentNode;
            while (parent) {
              if (parent.nodeName === "w:p") {
                throw new Error("Phát hiện lỗi cấu trúc OOXML nghiêm trọng: Thẻ bảng <w:tbl> nằm bên trong thẻ đoạn văn <w:p>.");
              }
              parent = parent.parentNode;
            }
          }
        } catch (e: any) {
          console.error("XML Validation Error in generated server DOCX:", e);
          throw new Error("Tệp hợp đồng xuất ra bị lỗi XML cấu trúc: " + e.message);
        }

        doc.getZip().file("word/document.xml", fixedXml);
      }

      const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=${templateType}_${data.invoice.number || 'DOC'}.docx`,
      });
      res.send(buf);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate document' });
    }
  });

  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          host: true 
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const networkIP = getNetworkAddress();
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n----------------------------------------');
      console.log('  Server running:');
      console.log(`  Local:   http://localhost:${PORT}`);
      if (networkIP) {
        console.log(`  Network: http://${networkIP}:${PORT}`);
      }
      console.log('----------------------------------------\n');
    });
  }
}

startServer();

export default app;
