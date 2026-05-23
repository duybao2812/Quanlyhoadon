import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'step552_content.txt');

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  let found = false;
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.step_index === 552) {
        fs.writeFileSync(outputPath, obj.content, 'utf8');
        console.log('Successfully extracted step 552!');
        found = true;
        break;
      }
    } catch (e) {
      // Ignore
    }
  }
  if (!found) {
    console.log('Could not find step 552');
  }
} catch (err) {
  console.error('Error:', err);
}
