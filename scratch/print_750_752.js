import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanDir = path.join(__dirname, 'restored_code');

try {
  const f750 = path.join(cleanDir, 'step_750_lines_2391_to_2490.tsx');
  const f752 = path.join(cleanDir, 'step_752_lines_2490_to_2550.tsx');
  
  if (fs.existsSync(f750)) {
    console.log('--- step_750_lines_2391_to_2490.tsx ---');
    console.log(fs.readFileSync(f750, 'utf8'));
  }
  
  if (fs.existsSync(f752)) {
    console.log('--- step_752_lines_2490_to_2550.tsx ---');
    console.log(fs.readFileSync(f752, 'utf8'));
  }
} catch (err) {
  console.error('Error:', err);
}
