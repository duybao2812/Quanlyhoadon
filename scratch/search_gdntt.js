import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  const results = [];
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    if (line.includes('GDNTT') || line.includes('Template GDN TT')) {
      try {
        const obj = JSON.parse(line);
        results.push(`Line ${idx}: Step ${obj.step_index} | Type: ${obj.type} | Source: ${obj.source}`);
      } catch (e) {
        results.push(`Line ${idx}: Raw line matches (failed to parse JSON)`);
      }
    }
  }
  
  console.log(`Found ${results.length} references:`);
  console.log(results.join('\n'));
} catch (err) {
  console.error('Error:', err);
}
