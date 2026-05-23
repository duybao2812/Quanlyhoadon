import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  let viewCount = 0;
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    if (line.includes('App.tsx') && line.includes('VIEW_FILE')) {
      try {
        const obj = JSON.parse(line);
        const stepNum = obj.step_index;
        const outPath = path.join(__dirname, `step_${stepNum}_view_file.txt`);
        fs.writeFileSync(outPath, obj.content, 'utf8');
        console.log(`Saved View File for Step ${stepNum} (Length: ${obj.content.length})`);
        viewCount++;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }
  console.log(`Total VIEW_FILE steps saved: ${viewCount}`);
} catch (err) {
  console.error('Error:', err);
}
