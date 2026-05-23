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
      if (content.includes('const InlineField') || content.includes('function InlineField')) {
        console.log(`Found InlineField in ${path.relative(scratchDir, filePath)}`);
        // Print lines containing InlineField definition
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (l.includes('InlineField') && (l.includes('const ') || l.includes('function ') || l.includes('interface '))) {
            // print 30 surrounding lines
            const start = Math.max(0, idx - 5);
            const end = Math.min(lines.length - 1, idx + 45);
            console.log(`--- Lines ${start+1} to ${end+1} of ${path.basename(filePath)} ---`);
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
