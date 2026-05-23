import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanDir = path.join(__dirname, 'restored_code');

try {
  const filePath = path.join(cleanDir, 'step_598_lines_2300_to_2420.tsx');
  if (fs.existsSync(filePath)) {
    console.log('--- step_598_lines_2300_to_2420.tsx ---');
    console.log(fs.readFileSync(filePath, 'utf8'));
  } else {
    console.log('File not found');
  }
} catch (err) {
  console.error('Error:', err);
}
