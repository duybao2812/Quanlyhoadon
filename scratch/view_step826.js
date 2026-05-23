import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const txtPath = path.join(__dirname, 'step_826_file_content.txt');

try {
  const content = fs.readFileSync(txtPath, 'utf8');
  console.log('--- STEP 826 CONTENT ---');
  console.log(content.substring(0, 1000));
  console.log('--- ... ---');
  console.log(content.substring(content.length - 1000));
} catch (err) {
  console.error('Error:', err);
}
