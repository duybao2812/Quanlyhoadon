const fs = require('fs');
const PizZip = require('pizzip');

try {
  const fileBuffer = fs.readFileSync('d:/GitHub/Quanlyhoadon/templates_muc_phu/Template GDN TT.docx');
  const zip = new PizZip(fileBuffer);
  const docXml = zip.file("word/document.xml")?.asText() || "";
  const cleanText = docXml.replace(/<[^>]+>/g, " ");
  
  // Find context of TEN_CTY_VIET_TAT
  const keyword = "TEN_CTY_VIET_TAT";
  let idx = cleanText.indexOf(keyword);
  while (idx !== -1) {
    const start = Math.max(0, idx - 150);
    const end = Math.min(cleanText.length, idx + keyword.length + 150);
    console.log(`--- CONTEXT OF ${keyword} ---`);
    console.log(cleanText.slice(start, end).replace(/\s+/g, ' '));
    console.log("-----------------------------\n");
    idx = cleanText.indexOf(keyword, idx + 1);
  }
} catch (err) {
  console.error(err);
}
