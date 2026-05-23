import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scratchDir = __dirname;

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walkDir(filePath, callback);
      }
    } else {
      callback(filePath);
    }
  });
}

console.log('Searching for rendering templates in all scratch files...');

const candidates = [];

walkDir(scratchDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.txt') || filePath.endsWith('.js')) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      const hasHDNT = content.includes('renderHDNTDocument');
      const hasHDTC = content.includes('renderHDTCDocument');
      const hasHDCM = content.includes('renderHDCMDocument');
      const hasGdn = content.includes('renderGdnDocument');
      
      if (hasHDNT || hasHDTC || hasHDCM || hasGdn) {
        const lines = content.split('\n');
        const keywordCount = (content.match(/renderHDNTDocument|renderHDTCDocument|renderHDCMDocument|renderGdnDocument/g) || []).length;
        
        // Let's count how many non-comment lines of code there are
        const codeLinesCount = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;
        
        candidates.push({
          path: filePath,
          relative: path.relative(scratchDir, filePath),
          size: content.length,
          lines: lines.length,
          codeLines: codeLinesCount,
          keywords: { hasHDNT, hasHDTC, hasHDCM, hasGdn },
          keywordCount
        });
      }
    } catch (e) {
      // Ignore
    }
  }
});

candidates.sort((a, b) => b.codeLines - a.codeLines);

candidates.slice(0, 15).forEach((c, idx) => {
  console.log(`[${idx + 1}] File: ${c.relative}`);
  console.log(`    Total Size: ${c.size} bytes | Lines: ${c.lines} | Code Lines: ${c.codeLines}`);
  console.log(`    Keywords found (Count: ${c.keywordCount}):`);
  if (c.keywords.hasHDNT) console.log('      - renderHDNTDocument');
  if (c.keywords.hasHDTC) console.log('      - renderHDTCDocument');
  if (c.keywords.hasHDCM) console.log('      - renderHDCMDocument');
  if (c.keywords.hasGdn) console.log('      - renderGdnDocument');
});
