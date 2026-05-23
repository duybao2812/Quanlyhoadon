import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scratchDir = __dirname;
const outputDir = path.join(scratchDir, 'restored_code');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(scratchDir);
const viewFiles = files.filter(f => f.endsWith('_view_file.txt'));

const keywords = [
  'renderHDNTDocument',
  'renderHDTCDocument',
  'renderHDCMDocument',
  'renderGdnDocument',
  'InlineField',
  'GDNTableInputWordLike'
];

viewFiles.forEach(file => {
  const filePath = path.join(scratchDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const hasKeyword = keywords.some(kw => content.includes(kw));
  if (!hasKeyword) return;
  
  const lines = content.split(/\r?\n/);
  const cleanedLines = [];
  let minLine = 999999;
  let maxLine = 0;
  
  for (const line of lines) {
    const match = line.match(/^\s*(\d+):(.*)$/);
    if (match) {
      const lineNum = parseInt(match[1]);
      if (lineNum < minLine) minLine = lineNum;
      if (lineNum > maxLine) maxLine = lineNum;
      
      const code = match[2];
      cleanedLines.push(code);
    }
  }
  
  if (cleanedLines.length > 0) {
    const outName = file.replace('_view_file.txt', `_lines_${minLine}_to_${maxLine}.tsx`);
    const outPath = path.join(outputDir, outName);
    fs.writeFileSync(outPath, cleanedLines.join('\n'), 'utf8');
    console.log(`Cleaned ${file} (lines ${minLine}-${maxLine}) -> ${outName}`);
  }
});
