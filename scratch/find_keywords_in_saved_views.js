import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scratchDir = __dirname;
const files = fs.readdirSync(scratchDir);

const keywords = [
  'renderHDNTDocument',
  'renderHDTCDocument',
  'renderHDCMDocument',
  'renderGdnDocument',
  'InlineField',
  'GDNTableInputWordLike'
];

console.log('Scanning extracted view files for document rendering functions...');
const matches = [];

files.forEach(file => {
  if (file.endsWith('_view_file.txt')) {
    const filePath = path.join(scratchDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    const foundKeywords = keywords.filter(kw => content.includes(kw));
    if (foundKeywords.length > 0) {
      matches.push({
        file,
        keywords: foundKeywords,
        size: content.length,
        lines: content.split('\n').length
      });
    }
  }
});

matches.forEach(m => {
  console.log(`File: ${m.file} | Lines: ${m.lines} | Keywords: ${m.keywords.join(', ')}`);
});
