import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanDir = path.join(__dirname, 'restored_code');
const files = [
  'step_826_clean.tsx',
  'step_846_clean.tsx',
  'step_856_clean.tsx',
  'step_860_clean.tsx',
  'step_752_clean.tsx'
];

files.forEach(file => {
  const filePath = path.join(cleanDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    console.log(`=========================================`);
    console.log(`File: ${file} | Lines: ${lines.length}`);
    console.log(`=========================================`);
    console.log('--- START ---');
    console.log(lines.slice(0, 15).join('\n'));
    console.log('--- ... ---');
    console.log(lines.slice(-15).join('\n'));
    console.log('\n');
  } else {
    console.log(`File not found: ${file}`);
  }
});
