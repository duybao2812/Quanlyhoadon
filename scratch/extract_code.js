import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'step565_diff.json');

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  let found = false;
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.step_index === 565) {
        fs.writeFileSync(outputPath, JSON.stringify(obj, null, 2), 'utf8');
        console.log('Successfully extracted step 565!');
        found = true;
        break;
      }
    } catch (e) {
      // Ignore JSON parse errors on incomplete lines
    }
  }
  if (!found) {
    console.log('Could not find step 565 in transcript.jsonl');
  }
} catch (err) {
  console.error('Error:', err);
}
