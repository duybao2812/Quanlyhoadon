import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import multer from 'multer';
import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limit for base64 payloads
app.use(express.json({ limit: '50mb' }));

const upload = multer({ dest: 'uploads/temp' });

// Initialize Mistral on server-side
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'da1QD7MoXhRA2JRujftHQOEOmRE6lpVj';
const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });

const EXTRACTION_PROMPT = `
You are a specialized document parser for Vietnamese invoices.
Extract structured data from the provided document.
Map the data into this EXACT JSON structure:

{
  "seller": { "name": "", "taxCode": "", "address": "" },
  "buyer": { "name": "", "taxCode": "", "address": "" },
  "invoice": { "number": "", "serial": "", "date": "", "vatRate": 8 },
  "items": [{ "name": "", "unit": "", "quantity": 0, "unitPrice": 0, "total": 0 }],
  "totals": { "subtotal": 0, "vatAmount": 0, "grandTotal": 0, "amountInWords": "" },
  "classification": "BB_CM | BB_VT | BB_TC"
}

Notes:
- Tax code = MST.
- classification: "BB_CM" (Machine/Ca máy), "BB_VT" (Materials/Vật tư), "BB_TC" (Construction/Thi công).
- If invoice has "Bê tông", it's BB_VT.
- vatRate = Thuế suất (8, 10).
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
  if (isNaN(n)) return '0';
  return n.toLocaleString('vi-VN');
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

  // NEW: Secure Extraction API (Backend proxy for Mistral)
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

  app.post('/api/generate', (req, res) => {
    const { templateType, data, partnerA, partnerB } = req.body;
    const templatePath = path.join(process.cwd(), 'uploads/templates', `${templateType}.docx`);

    try {
      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ error: `Template ${templateType} not found.` });
      }

      const binaryContent = fs.readFileSync(templatePath, 'binary');
      const rawVat = data.invoice.vatRate !== undefined && data.invoice.vatRate !== null && data.invoice.vatRate !== '' ? data.invoice.vatRate : '8';
      const vatRateStr = rawVat.toString().includes('%') ? rawVat.toString() : `${rawVat}%`;
      
      const tableRows = (data.items || []).map((item: any, index: number) => ({
        STT: (index + 1).toString(),
        NOIDUNG: item.name || '',
        DVT: item.unit || '',
        SOLUONG: item.quantity ? formatVNNumber(item.quantity) : '',
        DONGIA: item.unitPrice ? formatVNNumber(item.unitPrice) : '',
        THANHTIEN: item.total ? formatVNNumber(item.total) : '0'
      }));

      const generateDocxTable = (items: any[]) => {
        const columns = [
          { header: "STT", key: "STT", width: "600" },
          { header: "TÊN HÀNG HÓA, DỊCH VỤ", key: "NOIDUNG", width: "4500" },
          { header: "ĐVT", key: "DVT", width: "800" },
          { header: "SỐ LƯỢNG", key: "SOLUONG", width: "800" },
          { header: "ĐƠN GIÁ", key: "DONGIA", width: "1200" },
          { header: "THÀNH TIỀN", key: "THANHTIEN", width: "1600" }
        ];

        let xml = `
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
    ${columns.map(col => `
      <w:tc>
        <w:tcPr><w:tcW w:w="${col.width}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(col.header)}</w:t></w:r></w:p>
      </w:tc>`).join('')}
  </w:tr>
  ${items.map(item => `
  <w:tr>
    <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.STT)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.NOIDUNG)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.DVT)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.SOLUONG)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.DONGIA)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.THANHTIEN)}</w:t></w:r></w:p></w:tc>
  </w:tr>`).join('')}
  <w:tr>
    <w:tc><w:tcPr><w:gridSpan w:val="5"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>CỘNG TIỀN HÀNG:</w:t></w:r></w:p></w:tc>
    <w:tc><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(formatVNNumber(data.totals.subtotal))}</w:t></w:r></w:p></w:tc>
  </w:tr>
  <w:tr>
    <w:tc><w:tcPr><w:gridSpan w:val="5"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(`THUẾ GTGT (${vatRateStr}):`)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(formatVNNumber(data.totals.vatAmount))}</w:t></w:r></w:p></w:tc>
  </w:tr>
  <w:tr>
    <w:tc><w:tcPr><w:gridSpan w:val="5"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>TỔNG CỘNG THANH TOÁN:</w:t></w:r></w:p></w:tc>
    <w:tc><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(formatVNNumber(data.totals.grandTotal))}</w:t></w:r></w:p></w:tc>
  </w:tr>
</w:tbl>`;
        return xml;
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

      const variables = {
        SO_HOPDONG: ".../HĐ-...",
        NGAYKYHOPDONG: ".../.../...",
        NGAY_BB: formatDocDate(data.invoice?.date),
        BEN_A: partnerA.name || data.seller.name,
        BEN_B: partnerB.name || data.buyer.name,
        DAIDIENBENA: partnerA.representative || "....................",
        DAIDIENBENB: partnerB.representative || "....................",
        CHUCVUBENA: partnerA.position || "....................",
        CHUCVUBENB: partnerB.position || "....................",
        GIOITINHBENA: partnerA.gender || "Ông/Bà",
        GIOITINHBENB: partnerB.gender || "Ông/Bà",
        DIACHIBENA: partnerA.address || data.seller.address,
        DIACHIBENB: partnerB.address || data.buyer.address,
        MSTBENA: partnerA.taxCode || data.seller.taxCode,
        MSTBENB: partnerB.taxCode || data.buyer.taxCode,
        
        // Pass the raw XML string for the modified placeholders
        BB_BANGGIATHUEXE: tableXml,
        BB_BANGVATTU: tableXml,
        BB_BANGTHICONG: tableXml,
        items: tableXml,
        
        TONGCONG: formatVNNumber(data.totals.subtotal),
        THUE_VAT: formatVNNumber(data.totals.vatAmount),
        TONG_THANH_TOAN: formatVNNumber(data.totals.grandTotal),
        SO_TIEN_CHU: data.totals.amountInWords || "",
        TONG_TIEN_BANG_CHU: data.totals.amountInWords || "",
        VAT_RATE: vatRateStr
      };

      doc.render(variables);

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

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
