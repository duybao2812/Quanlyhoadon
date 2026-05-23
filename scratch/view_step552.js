import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const txtPath = path.join(__dirname, 'step552_content.txt');

try {
  const content = fs.readFileSync(txtPath, 'utf8');
  console.log('--- STEP 552 CONTENT Snippet ---');
  // We want to find the InlineField component definition in step 552 content
  const idx = content.indexOf('const InlineField');
  if (idx !== -1) {
    console.log(content.substring(idx, idx + 2500));
  } else {
    console.log('Could not find const InlineField in step 552');
    console.log(content.substring(0, 1000));
  }
} catch (err) {
  console.error('Error:', err);
}
