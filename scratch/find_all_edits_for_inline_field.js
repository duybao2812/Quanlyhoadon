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
    if (line.includes('CODE_ACTION') && line.includes('InlineField')) {
      try {
        const obj = JSON.parse(line);
        results.push({
          lineIdx: idx,
          step: obj.step_index,
          length: line.length,
          snippet: obj.content ? obj.content.substring(0, 200) : 'No content'
        });
      } catch (e) {
        results.push({
          lineIdx: idx,
          failed: true,
          length: line.length
        });
      }
    }
  }
  
  console.log(`Found ${results.length} CODE_ACTION steps containing InlineField:`);
  results.forEach(r => {
    console.log(`Line ${r.lineIdx} | Step ${r.step} | Length ${r.length} | Snippet: ${r.snippet}`);
  });
} catch (err) {
  console.error('Error:', err);
}
