import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'step_860_view_file.txt');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  console.log(`Split into ${lines.length} lines.`);
  
  let matchesCount = 0;
  lines.forEach((line, i) => {
    const match = line.match(/^\s*(\d+):(.*)$/);
    if (match) {
      matchesCount++;
      if (matchesCount < 10) {
        console.log(`Line ${i} matched: number=${match[1]}, code=[${match[2]}]`);
      }
    } else {
      if (i < 10) {
        console.log(`Line ${i} DID NOT match: [${line}]`);
      }
    }
  });
  console.log(`Total matched lines: ${matchesCount}`);
} catch (err) {
  console.error('Error:', err);
}
