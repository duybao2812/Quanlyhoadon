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

walkDir(scratchDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.txt')) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasHDTC = content.includes('renderHDTCDocument');
      const hasHDCM = content.includes('renderHDCMDocument');
      
      if (hasHDTC || hasHDCM) {
        console.log(`Found match in ${path.relative(scratchDir, filePath)}`);
        const lines = content.split('\n');
        
        // Find line numbers for renderHDTCDocument
        lines.forEach((l, idx) => {
          if (l.includes('renderHDTCDocument') && (l.includes('const ') || l.includes('function '))) {
            console.log(`--- renderHDTCDocument in ${path.basename(filePath)} : Line ${idx+1} ---`);
            const start = Math.max(0, idx - 2);
            const end = Math.min(lines.length - 1, idx + 40);
            for (let i = start; i <= end; i++) {
              console.log(`${i+1}: ${lines[i]}`);
            }
          }
          if (l.includes('renderHDCMDocument') && (l.includes('const ') || l.includes('function '))) {
            console.log(`--- renderHDCMDocument in ${path.basename(filePath)} : Line ${idx+1} ---`);
            const start = Math.max(0, idx - 2);
            const end = Math.min(lines.length - 1, idx + 40);
            for (let i = start; i <= end; i++) {
              console.log(`${i+1}: ${lines[i]}`);
            }
          }
        });
      }
    } catch (e) {
      // Ignore
    }
  }
});
