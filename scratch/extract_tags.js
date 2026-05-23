const fs = require('fs');
const PizZip = require('pizzip');

function extractTags(buffer) {
  const zip = new PizZip(buffer);
  const docXml = zip.file("word/document.xml")?.asText() || "";
  // Strip XML tags to get clean content
  const cleanText = docXml.replace(/<[^>]+>/g, "");
  
  // Search for [TAG] in the clean text
  const regex = /\[([^\]]+)\]/g;
  const tags = new Set();
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

try {
  const fileBuffer = fs.readFileSync('d:/GitHub/Quanlyhoadon/templates_muc_phu/Template GDN TT.docx');
  const tags = extractTags(fileBuffer);
  console.log("TAGS_EXTRACTED_SUCCESSFULLY");
  console.log(JSON.stringify(tags, null, 2));
} catch (err) {
  console.error("Error reading docx file:", err);
}
