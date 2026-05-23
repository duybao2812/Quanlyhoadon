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
      if (content.includes('type === \'select\'') || content.includes('type === "select"')) {
        console.log(`Found type === 'select' in ${path.relative(scratchDir, filePath)}`);
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (l.includes('type === \'select\'') || l.includes('type === "select"')) {
            const start = Math.max(0, idx - 5);
            const end = Math.min(lines.length - 1, idx + 25);
            console.log(`--- ${path.basename(filePath)} : Lines ${start+1}-${end+1} ---`);
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
