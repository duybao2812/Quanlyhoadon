import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const txtPath = path.join(__dirname, 'step565_content.txt');

try {
  const content = fs.readFileSync(txtPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Total lines in step565_content.txt: ${lines.length}`);
  console.log('--- FIRST 120 LINES ---');
  console.log(lines.slice(0, 120).join('\n'));
} catch (err) {
  console.error('Error:', err);
}
