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

console.log('Searching for renderHDTCDocument or renderHDCMDocument or renderHDNTDocument or renderGdnDocument...');

walkDir(scratchDir, (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.json') || filePath.endsWith('.txt') || filePath.endsWith('.tsx')) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasHDTC = content.includes('renderHDTCDocument');
      const hasHDCM = content.includes('renderHDCMDocument');
      const hasHDNT = content.includes('renderHDNTDocument');
      const hasGdn = content.includes('renderGdnDocument');
      
      if (hasHDTC || hasHDCM || hasHDNT || hasGdn) {
        console.log(`File: ${path.relative(scratchDir, filePath)}:`);
        if (hasHDTC) console.log('  - contains renderHDTCDocument');
        if (hasHDCM) console.log('  - contains renderHDCMDocument');
        if (hasHDNT) console.log('  - contains renderHDNTDocument');
        if (hasGdn) console.log('  - contains renderGdnDocument');
      }
    } catch (e) {
      // Ignore
    }
  }
});
