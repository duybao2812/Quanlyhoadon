import fs from 'fs';
import path from 'path';

const txtPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\scratch\\HDNT_extracted.txt';

try {
  if (fs.existsSync(txtPath)) {
    const content = fs.readFileSync(txtPath, 'utf8');
    const lines = content.split('\n');
    
    // Look for lines containing "nhu c" or "ký k"
    lines.forEach((line, idx) => {
      if (line.includes('Căn cứ') || line.includes('nhu c') || line.includes('ký k')) {
        console.log(`Line ${idx + 1}: ${line}`);
        // Print character codes
        const chars = [];
        for (let i = 0; i < line.length; i++) {
          chars.push(`${line[i]}(${line.charCodeAt(i)})`);
        }
        console.log(`  Codes: ${chars.join(' ')}`);
      }
    });
  } else {
    console.log('File not found:', txtPath);
  }
} catch (err) {
  console.error('Error:', err);
}
