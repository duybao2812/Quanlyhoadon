import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bundlePath = 'd:\\GitHub\\Quanlyhoadon\\dist\\assets\\index-D-ljyPTR.js';

try {
  if (fs.existsSync(bundlePath)) {
    const content = fs.readFileSync(bundlePath, 'utf8');
    console.log(`Bundle size: ${content.length} characters.`);
    
    const keywords = [
      'renderGdnDocument',
      'renderHDNTDocument',
      'renderHDTCDocument',
      'renderHDCMDocument',
      'GDNTableInputWordLike'
    ];
    
    keywords.forEach(kw => {
      const found = content.includes(kw);
      console.log(`Keyword "${kw}" found: ${found}`);
      if (found) {
        // Let's print the index and surrounding 500 characters
        const idx = content.indexOf(kw);
        console.log(`  Snippet: ${content.substring(idx - 100, idx + 400)}`);
      }
    });
  } else {
    console.log('Bundle not found at', bundlePath);
  }
} catch (err) {
  console.error('Error:', err);
}
