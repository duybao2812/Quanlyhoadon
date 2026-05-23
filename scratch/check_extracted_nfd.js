import fs from 'fs';
import path from 'path';

const scratchDir = 'C:\\Users\\gunfi\\.gemini\\antigravity\\scratch';
const files = ['HDNT_extracted.txt', 'HDTC_extracted.txt', 'HDCM_extracted.txt'];

files.forEach(file => {
  const filePath = path.join(scratchDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const normalized = content.normalize('NFC');
    
    if (content !== normalized) {
      console.log(`File ${file} contains NFD characters!`);
      let diffCount = 0;
      for (let i = 0; i < content.length; i++) {
        if (content[i] !== normalized[i]) {
          diffCount++;
          if (diffCount < 5) {
            console.log(`  Diff at char ${i}: [${content.substring(i, i+5)}] vs [${normalized.substring(i, i+5)}]`);
          }
        }
      }
      console.log(`  Total NFD characters: ${diffCount}`);
    } else {
      console.log(`File ${file} is fully in NFC format.`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
