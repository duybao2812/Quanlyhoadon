import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { formatVNNumber } from './utils';

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

  const structuralMapping: Record<string, string> = {
    'cong': 'Công', 'ty': 'ty', 'co': 'Cổ', 'phan': 'phần', 'dau': 'Đầu', 'tu': 'tư',
    'xay': 'Xây', 'dung': 'dựng', 'thuong': 'Thương', 'mai': 'mại', 'dich': 'Dịch',
    'vu': 'vụ', 'san': 'Sản', 'xuat': 'xuất', 'nhap': 'nhập', 'khau': 'khẩu',
    'quoc': 'Quốc', 'thinh': 'Thịnh'
  };

  const titleCaseUnsigned = ['an', 'thanh', 'thuan', 'le', 'nguyen', 'tran', 'pham', 'vu', 'vo', 'dang', 'bui', 'do', 'ho', 'ngo', 'duong', 'minh', 'nam'];
  const upperCaseTerms = ['INT', 'VNCN', 'E&C', 'TNHH', 'CP', 'MTV', 'VN', 'JS', 'JSC', 'VAT', 'STK', 'HTX', 'PCCC', 'GTVT', 'XD', 'TM', 'DV', 'CN', 'KCN', 'SX', 'XNK'];

  const words = val.trim().split(/\s+/);

  return words.map((word, index) => {
    if (!word) return '';
    const lowerWord = word.toLowerCase();
    const upperWord = word.toUpperCase();
    if (hasDiacritics(word)) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    if (structuralMapping[lowerWord]) {
      let result = structuralMapping[lowerWord];
      if (index === 0) result = result.charAt(0).toUpperCase() + result.slice(1);
      return result;
    }
    if (titleCaseUnsigned.includes(lowerWord)) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    if (upperCaseTerms.includes(upperWord) || /[&/.\-]/.test(word)) return upperWord;
    if (word.length <= 2) return upperWord;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

export function extractTags(buffer: ArrayBuffer): string[] {
  const zip = new PizZip(buffer);
  const docXml = zip.file("word/document.xml")?.asText() || "";
  // Strip XML tags to get clean content
  const cleanText = docXml.replace(/<[^>]+>/g, "");

  // Search for [TAG] in the clean text
  const regex = /\[([^\]]+)\]/g;
  const tags = new Set<string>();
  let match;
  while ((match = regex.exec(cleanText)) !== null) {
    const tag = match[1].trim();
    // Ignore internal tags or empty matches
    if (tag && !tag.startsWith('@') && !tag.startsWith('#') && !tag.startsWith('/')) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}

export async function generateDocxBlob({
  templateBuffer,
  templateType,
  data,
  partnerA,
  partnerB,
  contractNumber,
  contractDate
}: {
  templateBuffer: ArrayBuffer,
  templateType: string,
  data: any,
  partnerA: any,
  partnerB: any,
  contractNumber: string,
  contractDate: string
}): Promise<Blob> {
  const rawVat = data.invoice.vatRate !== undefined && data.invoice.vatRate !== null && data.invoice.vatRate !== '' ? data.invoice.vatRate : '8';
  const vatRateStr = rawVat.toString().includes('%') ? rawVat.toString() : `${rawVat}%`;

  const tableRows = (data.items || [])
    .filter((item: any) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || parseFloat(item.price) || 0;
      const amount = Number(item.amount || item.total || item.totalAmount || item.lineTotal) || (qty * price);

      const isZero = qty === 0 && price === 0 && amount === 0;
      const isEmptyUnit = !item.unit || item.unit.toString().trim() === "" || item.unit.toString().trim() === "-" || item.unit.toString().trim() === ".";

      return !(isZero && isEmptyUnit);
    })
    .map((item: any, index: number) => {
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.unitPrice);
      const amount = Number(item.amount || item.total || item.totalAmount || item.lineTotal) || (!isNaN(qty) && !isNaN(price) ? qty * price : 0);

      const displayUnit = (item.unit && !item.unit.toString().match(/^[. -]+$/)) ? item.unit.toString() : "";
      const displayQty = (item.quantity !== undefined && item.quantity !== null && item.quantity !== "" && !isNaN(qty) && qty !== 0) ? formatVNNumber(qty) : "";

      return {
        STT: (index + 1).toString(),
        NOIDUNG: item.description || item.name || "",
        DVT: displayUnit,
        SOLUONG: displayQty,
        DONGIA: (!isNaN(price) && price > 0) ? formatVNNumber(price) : "",
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
    <w:trPr><w:trHeight w:val="450"/><w:tblHeader/></w:trPr>
    ${columns.map(col => `
      <w:tc>
        <w:tcPr><w:tcW w:w="${col.width}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(col.header)}</w:t></w:r></w:p>
      </w:tc>`).join('')}
  </w:tr>
  ${items.map(item => `
  <w:tr>
    <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.STT)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.NOIDUNG)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.DVT)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.SOLUONG)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.DONGIA)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(item.THANHTIEN)}</w:t></w:r></w:p></w:tc>
  </w:tr>`).join('')}
  <w:tr>
    <w:tc><w:tcPr><w:gridSpan w:val="5"/><w:tcW w:w="7900" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>CỘNG TIỀN HÀNG:</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(formatVNNumber(data.totals.subtotal))}</w:t></w:r></w:p></w:tc>
  </w:tr>
  <w:tr>
    <w:tc><w:tcPr><w:gridSpan w:val="5"/><w:tcW w:w="7900" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(`THUẾ GTGT (${vatRateStr}):`)}</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(formatVNNumber(data.totals.vatAmount))}</w:t></w:r></w:p></w:tc>
  </w:tr>
  <w:tr>
    <w:tc><w:tcPr><w:gridSpan w:val="5"/><w:tcW w:w="7900" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="100" w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>TỔNG CỘNG THANH TOÁN:</w:t></w:r></w:p></w:tc>
    <w:tc><w:tcPr><w:tcW w:w="1600" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${escapeXml(formatVNNumber(data.totals.grandTotal))}</w:t></w:r></w:p></w:tc>
  </w:tr>
</w:tbl>`;
  };

  const tableXml = generateDocxTable(tableRows);
  const zip = new PizZip(templateBuffer);

  let docXml = zip.file("word/document.xml")?.asText() || "";
  ["BB_BANGGIATHUEXE", "BB_BANGVATTU", "BB_BANGTHICONG", "items"].forEach(p => {
    docXml = docXml.replace(new RegExp(`\\[${p}\\]`, 'g'), `[@${p}]`);
  });
  zip.file("word/document.xml", docXml);

  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: "[", end: "]" } });

  const today = new Date();
  const formatDocDate = (dateStr: string | undefined): string => {
    if (!dateStr) return `ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr || "";
      return `ngày ${d.getDate().toString().padStart(2, '0')} tháng ${(d.getMonth() + 1).toString().padStart(2, '0')} năm ${d.getFullYear()}`;
    } catch { return dateStr || ""; }
  };

  const mergerDate = new Date('2025-07-01');
  const d = new Date(data.invoice?.date);
  const isAfterMerger = !isNaN(d.getTime()) && d >= mergerDate;

  const getEffectiveAddress = (partner: any, extractedAddr: string) => (isAfterMerger && partner.addressPostMerger) ? partner.addressPostMerger : (partner.address || extractedAddr);

  const isSwapped = templateType.includes('VT') || templateType.includes('CM') || templateType.includes('TC');
  let pA = partnerA || {}, pB = partnerB || {}, sData = data.seller, bData = data.buyer;
  if (isSwapped) {
    [pA, pB] = [pB, pA];
    [sData, bData] = [bData, sData];
  }

  const formatGender = (gender?: string) => {
    if (!gender || gender === "....................") return "Ông/Bà";
    const g = gender.toLowerCase();
    if (g.includes('nam') || g.includes('ông') || g.includes('ong')) return "Ông";
    if (g.includes('nữ') || g.includes('nu') || g.includes('bà') || g.includes('ba')) return "Bà";
    return "Ông/Bà";
  };

  doc.render({
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
    GIOITINHBENA: formatGender(pA.gender),
    GIOITINHBENB: formatGender(pB.gender),
    DIACHIBENA: fallbackDots(getEffectiveAddress(pA, sData.address)),
    DIACHIBENB: fallbackDots(getEffectiveAddress(pB, bData.address)),
    MSTBENA: fallbackDots(pA.taxCode || sData.taxCode),
    MSTBENB: fallbackDots(pB.taxCode || bData.taxCode),
    STK_BENA: fallbackDots(pA.accountNumber || sData.accountNumber),
    NH_BENA: fallbackDots(pA.bankName || sData.bankName),
    STK_BENB: fallbackDots(pB.accountNumber || bData.accountNumber),
    NH_BENB: fallbackDots(pB.bankName || bData.bankName),
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
  });

  const documentXml = doc.getZip().file("word/document.xml")?.asText() || "";
  if (documentXml) {
    // 1. Autofix table inside paragraph
    const fixedXml = documentXml.replace(/<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?<w:tbl\b[\s\S]*?<\/w:tbl>(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, (match) => {
      const tblMatch = match.match(/<w:tbl\b[\s\S]*?<\/w:tbl>/);
      return tblMatch ? tblMatch[0] + '<w:p/>' : match;
    });
    
    // 2. Validate XML and ensure no w:tbl is nested inside w:p
    try {
      const parser = new DOMParser();
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
      console.error("XML Validation Error in generated DOCX:", e);
      throw new Error("Tệp hợp đồng xuất ra bị lỗi XML cấu trúc: " + e.message);
    }
    
    doc.getZip().file("word/document.xml", fixedXml);
  }

  const zipData = doc.getZip().generate({ type: 'uint8array', compression: 'DEFLATE' });
  return new Blob([zipData], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
