import express from 'express';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import multer from 'multer';
import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import OpenAI from 'openai';
import os from 'os';
import { JSDOM } from 'jsdom';
import { exec } from 'child_process';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

dotenv.config();

const app = express();
const PORT = 3000;

// Tang gioi han body parser len 500MB de xu ly PDF lon (base64 tang ~33% kich thuoc)
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
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

async function createDevViteServer() {
  return createViteServer({
    server: {
      middlewareMode: true,
      host: true,
      hmr: {
        port: 24679,
      },
    },
    appType: 'custom',
  });
}

function killProcessOnPort(port: number): Promise<void> {
  return new Promise((resolve) => {
    const cmdFind = `netstat -ano | findstr :${port}`;
    exec(cmdFind, (err, stdout) => {
      if (err || !stdout) {
        resolve();
        return;
      }
      const lines = stdout.split('\n');
      const pids = new Set<string>();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0' && pid !== String(process.pid)) {
          pids.add(pid);
        }
      }
      
      if (pids.size === 0) {
        resolve();
        return;
      }

      console.log(`[SERVER] Phat hien ${pids.size} tien trinh dang chiem dung cong ${port}. Dang giai phong...`);
      const killPromises = Array.from(pids).map(pid => {
        return new Promise<void>((resKill) => {
          exec(`taskkill /F /PID ${pid}`, (killErr) => {
            if (killErr) {
              console.error(`[SERVER] Khong the tat tien trinh ${pid}:`, killErr.message);
            } else {
              console.log(`[SERVER] Da tat tien trinh ${pid} dang chiem dung cong ${port}.`);
            }
            resKill();
          });
        });
      });

      Promise.all(killPromises).then(() => {
        setTimeout(resolve, 1000);
      });
    });
  });
}

async function listenOnPort(port: number) {
  await killProcessOnPort(port);
  return new Promise<void>((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      const networkIP = getNetworkAddress();
      console.log('');
      console.log('========================================');
      console.log(`👉 May chu dang chay tai: http://localhost:${port}`);
      if (networkIP) {
        console.log(`👉 Truy cap trong mang noi bo: http://${networkIP}:${port}`);
      }
      console.log('========================================');
      console.log('');
      resolve();
    });

    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Cong ${port} dang duoc su dung. Hay dung tien trinh cu hoac doi cong khac.`));
        return;
      }
      reject(error);
    });
  });
}

async function startServer() {
  console.log("👉 Buoc 1: Bat dau khoi dong...");
  console.log('[SERVER] Bat dau khoi dong ung dung...');

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

  interface ContractTask {
    status: 'pending' | 'processing' | 'success' | 'failed';
    progress: string;
    result?: any;
    error?: string;
    updatedAt: number;
  }
  const contractTasks: Record<string, ContractTask> = {};

  // Don dep task cu sau moi 30 phut de tranh ro ri RAM
  setInterval(() => {
    const now = Date.now();
    const expiryTime = 30 * 60 * 1000; // 30 phut
    for (const taskId of Object.keys(contractTasks)) {
      if (now - contractTasks[taskId].updatedAt > expiryTime) {
        console.log(`[CONTRACT-TASK] Dang xoa task het han: ${taskId}`);
        delete contractTasks[taskId];
      }
    }
  }, 10 * 60 * 1000); // chay moi 10 phut

  async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
    try {
      const data = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      // Chi parse toi da 5 trang dau tien de tranh loi Out of Memory (OOM) tren server Node.js khi load file rat lon
      const pagesToScan = Math.min(5, pdf.numPages);
      console.log(`[PDF-PARSE] Dang quet nhanh local ${pagesToScan}/${pdf.numPages} trang...`);

      for (let i = 1; i <= pagesToScan; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `--- PAGE ${i} ---\n` + pageText + '\n\n';
      }
      return fullText;
    } catch (error) {
      console.error('[PDF-PARSE] Loi khi parse PDF local:', error);
      return '';
    }
  }

  // API kiem tra trang thai cua task hop dong
  app.get('/api/process-contract/status/:taskId', (req, res) => {
    const { taskId } = req.params;
    const task = contractTasks[taskId];
    if (!task) {
      return res.status(404).json({ error: 'Khong tim thay nhiem vu boc tach.' });
    }
    res.json(task);
  });

  // API xu ly va trich xuat du lieu Hop Dong (Bat dong bo - Polling)
  app.post('/api/process-contract', async (req, res) => {
    try {
      const { base64Data, fileType, prompt } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: 'Thieu base64Data' });
      }

      const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      contractTasks[taskId] = {
        status: 'pending',
        progress: 'Đang chuẩn bị dữ liệu tệp tin...',
        updatedAt: Date.now()
      };

      console.log(`[CONTRACT-TASK] Khoi tao task ${taskId} cho tep ${fileType}`);

      // Phan hoi ngay lap tuc ma taskId cho client
      res.json({ taskId });

      // Chay xu ly ngam o background
      (async () => {
        let uploadedFileId: string | null = null;
        try {
          contractTasks[taskId].status = 'processing';
          const isPdf = fileType === 'application/pdf';
          const buffer = Buffer.from(base64Data, 'base64');
          
          let fullText = '';
          let isDigitalPdf = false;

          // Chi thuc hien doc local neu la file PDF
          if (isPdf) {
            contractTasks[taskId].progress = 'Đang kiểm tra định dạng PDF local...';
            try {
              // Lay so trang cua PDF de tinh toan trung binh ky tu tren moi trang
              const data = new Uint8Array(buffer);
              const loadingTask = pdfjsLib.getDocument({ data });
              const pdf = await loadingTask.promise;
              const numPages = pdf.numPages;

              const localText = await extractTextFromPdfBuffer(buffer);
              const textLength = localText.trim().length;

              const pagesToScan = Math.min(5, numPages);
              const avgCharsPerPage = pagesToScan > 0 ? textLength / pagesToScan : 0;
              console.log(`[CONTRACT] Kiem tra Hybrid: So trang = ${numPages}, So trang da quet = ${pagesToScan}, Tong ky tu quet = ${textLength}, Trung binh/trang = ${avgCharsPerPage.toFixed(1)}`);

              // Dieu kien de duoc coi la Digital PDF hop le:
              // 1. Tong so ky tu quet phai lon hon 500 (vi chi quet toi da 5 trang dau)
              // 2. Trung binh moi trang phai co it nhat 150 ky tu (loai bo truong hop file scan chua text an rac)
              if (textLength > 500 && avgCharsPerPage >= 150) {
                fullText = localText;
                isDigitalPdf = true;
                contractTasks[taskId].progress = `Đang đọc nội dung văn bản (${numPages} trang)...`;
                
                // Neu la Digital PDF, chúng ta can doc not phan text con lai cua cac trang sau de AI phan tich day du
                if (numPages > 5) {
                  console.log(`[CONTRACT] PDF co ${numPages} trang. Dang doc tiep cac trang con lai...`);
                  let remainingText = '';
                  for (let i = 6; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    remainingText += `--- PAGE ${i} ---\n` + pageText + '\n\n';
                  }
                  fullText += remainingText;
                  console.log(`[CONTRACT] Da doc xong toan bo ${numPages} trang.`);
                }
              } else {
                console.log('[CONTRACT] PDF co the la ban scan hoac chua text an rac/it. Fallback sang Mistral OCR Cloud...');
              }
            } catch (pdfError) {
              console.error('[CONTRACT] Loi khi doc cau truc trang PDF local, fallback sang OCR:', pdfError);
            }
          }

          // Neu khong phai Digital PDF, dung Mistral OCR Cloud nhu binh thuong
          if (!isDigitalPdf) {
            const fileName = isPdf ? 'contract.pdf' : 'contract_image.png';
            contractTasks[taskId].progress = 'Đang tải tệp tin lên máy chủ Mistral AI...';
            
            const formData = new FormData();
            formData.append('purpose', 'ocr');
            formData.append('file', buffer, { filename: fileName, contentType: fileType });

            const uploadRes = await axios.post('https://api.mistral.ai/v1/files', formData, {
              headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                ...formData.getHeaders()
              },
              timeout: 900000, // 15 phut
              maxContentLength: Infinity,
              maxBodyLength: Infinity
            });
            uploadedFileId = uploadRes.data.id;
            
            contractTasks[taskId].progress = 'Đang tạo liên kết tạm thời...';
            const signedUrlRes = await axios.get(
              `https://api.mistral.ai/v1/files/${uploadedFileId}/url?expiry=24`,
              {
                headers: {
                  'Authorization': `Bearer ${MISTRAL_API_KEY}`
                },
                timeout: 180000 // 3 phut
              }
            );
            const signedUrlValue = signedUrlRes.data.url;

            contractTasks[taskId].progress = 'Đang nhận diện chữ quang học (Mistral OCR Cloud)...';
            
            // Dung Axios thay cho global fetch de tranh timeout 300s mac dinh cua Node
            const ocrAxiosRes = await axios.post('https://api.mistral.ai/v1/ocr', {
              model: "mistral-ocr-latest",
              document: {
                type: "document_url",
                document_url: signedUrlValue,
              }
            }, {
              headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 900000 // 15 phut
            });

            const ocrResponse = ocrAxiosRes.data;
            fullText = (ocrResponse as any).pages.map((page: any) => page.markdown).join('\n\n');
          }

          contractTasks[taskId].progress = 'Đang bóc tách dữ liệu và dựng Markdown bằng Mistral Large...';

          // Buoc 2: Trich xuat du lieu Hop Dong qua Mistral Large
          const contractPrompt = `Ban la chuyen gia phan tich van ban Hop Dong tai chanh Vietnamese.
Trich xuat du lieu cau truc tu tai lieu hop dong, tra ve JSON chinh xac theo cau truc:
{
  "contract": { 
    "templateId": "HDCM hoac HDTC hoac HDNT", // HDCM: hop dong thue ca may/xe/thiet bi, HDTC: hop dong thi cong xay dung/xay lap, HDNT: hop dong mua ban vat tu/nguyen tac cung cap
    "number": "So hop dong", 
    "date": "Ngay ky (DD/MM/YYYY)", 
    "effectiveDate": "Ngay hieu luc", 
    "expiredDate": "Ngay het han" 
  },
  "parties": {
    "partyA": { "name": "", "taxCode": "", "address": "", "representative": "", "position": "", "gender": "", "accountNumber": "", "bankName": "", "phone": "", "email": "" },
    "partyB": { "name": "", "taxCode": "", "address": "", "representative": "", "position": "", "gender": "", "accountNumber": "", "bankName": "", "phone": "", "email": "" }
  },
  "project": { "name": "", "address": "", "value": 0, "valueInWords": "" },
  "work": { 
    "description": "", 
    "startDate": "", 
    "endDate": "", 
    "items": [] // Danh sach hang muc tu bang gia tri hop dong. Khóa cua cac truong trong doi tuong phai la ten cot chu HOA tieng Viet co dau dung nhu tren bang. Chi dien vao day neu trong van ban hop dong thuc su co bang phan ra chi tiet kem don gia/thanh tien. Neu khong co bang chi tiet, de "items" la [] (mang rong). Tuyet doi khong tu tao/gia lap ra mot dong du lieu.
  },
  "payment": { 
    "method": "", 
    "term": "", 
    "advancePercentage": 0, 
    "vatRate": 10,
    "values": [
      {
        "type": "Loai gia tri (VD: Gia tri tam ung, Gia tri bao hanh, Gia tri bao lanh thuc hien hop dong, Phat vi pham...)",
        "value": 0,
        "valueInWords": "So tien bang chu cua gia tri nay",
        "description": "Mo ta chi tiet ve phan tram %, dieu kien tam ung/giai ngan hoac cac rang buoc lien quan"
      }
    ]
  },
  "terms": { "warranty": "", "penalty": "", "termination": "", "disputeResolution": "", "other": "" },
  "markdownContent": "Toan bo noi dung hop dong da duoc dinh dang lai sang Markdown co cau truc. Dung # cho ten hop dong, ## cho cac dieu khoan lon (VD: ## Dieu 1: Pham vi cong viec), ### cho muc con, - cho danh sach, va | cho bang. Hay lam sach, sua cac loi ky tu (neu co) va cai thien van phong tieng Viet mot cach tu nhien, chuyen nghiep nhat."
}`;

          const chatRes = await axios.post('https://api.mistral.ai/v1/chat/completions', {
            model: "mistral-large-latest",
            messages: [
              {
                role: "user",
                content: `${contractPrompt}\n\nNOI DUNG HOP DONG THO:\n${fullText}`
              }
            ],
            response_format: { type: "json_object" }
          }, {
            headers: {
              'Authorization': `Bearer ${MISTRAL_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 900000 // 15 phut
          });

          const result = chatRes.data.choices?.[0]?.message?.content;
          
          let parsedResult: any;
          try {
            parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
          } catch (e) {
            console.error('[CONTRACT] Loi parse JSON:', result);
            throw new Error("Dữ liệu trả về từ AI không hợp lệ, không thể parse JSON.");
          }

          console.log(`[CONTRACT-TASK] Task ${taskId} hoan thanh thanh cong.`);
          contractTasks[taskId].status = 'success';
          contractTasks[taskId].result = parsedResult;
          contractTasks[taskId].updatedAt = Date.now();
          
        } catch (error: any) {
          console.error(`[CONTRACT-TASK] Task ${taskId} bi loi:`, error);
          contractTasks[taskId].status = 'failed';
          contractTasks[taskId].error = error.message || 'Lỗi không xác định trong quá trình bóc tách.';
          contractTasks[taskId].updatedAt = Date.now();
        } finally {
          // Don dep file tren Mistral storage
          if (uploadedFileId) {
            try {
              console.log(`[CONTRACT] Dang xoa file tam tren Mistral storage: ${uploadedFileId}`);
              await axios.delete(`https://api.mistral.ai/v1/files/${uploadedFileId}`, {
                headers: {
                  'Authorization': `Bearer ${MISTRAL_API_KEY}`
                },
                timeout: 60000 // 1 phut
              });
              console.log(`[CONTRACT] Da xoa file tam thanh cong.`);
            } catch (delError: any) {
              console.error(`[CONTRACT] Loi khi xoa file tam tren Mistral:`, delError.message);
            }
          }
        }
      })();

    } catch (error: any) {
      console.error("[CONTRACT] Mistral Backend Initial Error:", error);
      res.status(500).json({ 
        error: "Không thể khởi tạo tiến trình xử lý hợp đồng.",
        details: error.message 
      });
    }
  });

  // API luu hop dong vao database
  app.post('/api/contracts/save', async (req, res) => {
    try {
      const contractData = req.body;
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_ANON_KEY || ''
      );

      const { data, error } = await supabase
        .from('contracts')
        .upsert({
          id: contractData.id,
          template_id: contractData.templateId || 'default',
          party_a_id: contractData.partyAId,
          party_b_id: contractData.partyBId,
          form_data: contractData.formData,
          file_name: contractData.fileName || 'hop-dong.pdf',
          owner_id: contractData.ownerId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("[CONTRACT] Loi luu hop dong:", error);
      res.status(500).json({ 
        error: "Khong the luu hop dong.",
        details: error.message 
      });
    }
  });

  // API lay danh sach hop dong
  app.get('/api/contracts', async (req, res) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_ANON_KEY || ''
      );

      const ownerId = req.headers['x-custom-user-id'] as string || req.query.ownerId as string;
      
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error("[CONTRACT] Loi lay danh sach:", error);
      res.status(500).json({ 
        error: "Khong the lay danh sach hop dong.",
        details: error.message 
      });
    }
  });

  // API xoa hop dong
  app.delete('/api/contracts/:id', async (req, res) => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_ANON_KEY || ''
      );

      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', req.params.id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("[CONTRACT] Loi xoa hop dong:", error);
      res.status(500).json({ 
        error: "Khong the xoa hop dong.",
        details: error.message 
      });
    }
  });

  // API upload tai lieu hop dong
  app.post('/api/contracts/upload', (req: any, res) => {
    const uploadHandler = upload.single('contractFile');
    uploadHandler(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ error: 'Loi upload file', details: err.message });
      }
      
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Khong co file' });
      }

      try {
        const fileUrl = `/uploads/contracts/${file.filename}`;
        res.json({
          success: true,
          fileName: file.originalname,
          fileUrl: fileUrl,
          filePath: file.path
        });
      } catch (error: any) {
        res.status(500).json({ error: 'Loi xu ly file', details: error.message });
      }
    });
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
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate document' });
    }
  });

  if (!process.env.VERCEL) {
    console.log(`[SERVER] Dang khoi tao che do ${process.env.NODE_ENV || 'development'}...`);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[SERVER] Dang ket noi Vite middleware vao Express...');
      console.log("👉 Buoc 2: Nap cau hinh Vite...");
      const vite = await createDevViteServer();
      console.log("👉 Da nap cau hinh Vite xong.");
      app.use(vite.middlewares);

      app.use('*', async (req, res, next) => {
        try {
          const url = req.originalUrl;
          const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
          let template = fs.readFileSync(indexHtmlPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (error) {
          vite.ssrFixStacktrace(error as Error);
          next(error);
        }
      });
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    console.log("👉 Buoc 3: Chuan bi listen...");
    await listenOnPort(PORT);
    console.log("👉 Da listen thanh cong tren port " + PORT);
  }
}

startServer().catch((error: any) => {
  console.error('[SERVER] Loi khoi dong:', error.message || error);
  process.exit(1);
});

export default app;
