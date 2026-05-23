import fs from 'fs';
import path from 'path';

const appPath = 'd:\\GitHub\\Quanlyhoadon\\src\\App.tsx';

try {
  if (fs.existsSync(appPath)) {
    const content = fs.readFileSync(appPath, 'utf8');
    const normalized = content.normalize('NFC');
    
    if (content !== normalized) {
      console.log('The file App.tsx contains NFD (decomposed) characters!');
      // Find where they are
      let diffCount = 0;
      for (let i = 0; i < content.length; i++) {
        if (content[i] !== normalized[i]) {
          diffCount++;
          if (diffCount < 10) {
            console.log(`Diff at char ${i}: [${content.substring(i, i+10)}] vs [${normalized.substring(i, i+10)}]`);
          }
        }
      }
      console.log(`Total NFD differences: ${diffCount}`);
    } else {
      console.log('App.tsx is already fully in NFC (precomposed) format.');
    }
  }
} catch (err) {
  console.error('Error:', err);
}
