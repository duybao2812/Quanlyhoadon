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
  const normalized = content.normalize('NFC');
  
  if (content !== normalized) {
    console.log(`File ${file} contains NFD characters!`);
    let diffCount = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] !== normalized[i]) {
        diffCount++;
        if (diffCount < 5) {
          console.log(`  Diff at char ${i}: [${content.substring(i, i+10)}] vs [${normalized.substring(i, i+10)}]`);
        }
      }
    }
    console.log(`  Total NFD characters: ${diffCount}`);
  } else {
    console.log(`File ${file} is fully in NFC format.`);
  }
});
