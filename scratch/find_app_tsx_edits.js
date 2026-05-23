import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  const edits = [];
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    if (line.includes('App.tsx') && (line.includes('CODE_ACTION') || line.includes('REPLACE_FILE') || line.includes('WRITE_TO_FILE') || line.includes('replace_file_content') || line.includes('write_to_file'))) {
      try {
        const obj = JSON.parse(line);
        edits.push({
          lineIndex: idx,
          step: obj.step_index,
          type: obj.type,
          source: obj.source,
          length: line.length,
          snippet: line.substring(0, 200)
        });
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }
  
  console.log(`Found ${edits.length} edits targeting App.tsx:`);
  edits.forEach(e => {
    console.log(`Line ${e.lineIndex}: Step ${e.step} | Type ${e.type} | Length ${e.length} | Snippet: ${e.snippet}`);
  });
} catch (err) {
  console.error('Error:', err);
}
