const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

function extractDocxText(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    return `File not found: ${absolutePath}`;
  }
  
  try {
    const buffer = fs.readFileSync(absolutePath);
    const zip = new PizZip(buffer);
    const docXml = zip.file("word/document.xml")?.asText() || "";
    
    let text = docXml;
    
    // Replace paragraphs with newlines
    text = text.replace(/<\/w:p>/g, "\n");
    // Replace tabs
    text = text.replace(/<w:tab\/>/g, "\t");
    // Strip all XML tags
    text = text.replace(/<[^>]+>/g, "");
    
    // Decode common XML entities
    text = text.replace(/&amp;/g, "&")
               .replace(/&lt;/g, "<")
               .replace(/&gt;/g, ">")
               .replace(/&quot;/g, '"')
               .replace(/&apos;/g, "'");
               
    return text.trim();
  } catch (error) {
    return `Error reading ${filePath}: ${error.message}`;
  }
}

const templates = [
  { name: 'HDNT', path: 'templatesHopDong/Template_HDNT.docx' },
  { name: 'HDTC', path: 'templatesHopDong/Template_HDTC.docx' },
  { name: 'HDCM', path: 'templatesHopDong/Template_HDCM.docx' },
  { name: 'GDNTT', path: 'templates_muc_phu/Template GDN TT.docx' }
];

templates.forEach(t => {
  console.log(`=== EXTRACTING ${t.name} ===`);
  const text = extractDocxText(t.path);
  const outPath = `C:\\Users\\gunfi\\.gemini\\antigravity\\scratch\\${t.name}_extracted.txt`;
  fs.writeFileSync(outPath, text, 'utf8');
  console.log(`Wrote ${t.name} text to ${outPath}`);
  
  // Print first 15 lines of each
  const lines = text.split('\n').slice(0, 15).join('\n');
  console.log("--- First 15 lines: ---");
  console.log(lines);
  console.log("\n");
});
