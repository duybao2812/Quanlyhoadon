import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanDir = path.join(__dirname, 'restored_code');
const files = fs.readdirSync(cleanDir);

files.forEach(file => {
  const filePath = path.join(cleanDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log(`File: ${file} | Number of lines: ${lines.length} | Characters: ${content.length}`);
});
