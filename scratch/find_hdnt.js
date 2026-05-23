import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'hdnt_search.txt');

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  const results = [];
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    if (line.includes('renderHDNTDocument')) {
      results.push(`Line ${idx} contains renderHDNTDocument`);
      try {
        const obj = JSON.parse(line);
        results.push(`  Step: ${obj.step_index}, Source: ${obj.source}, Type: ${obj.type}`);
        // Let's write the full text of the line to a separate file so we can analyze it
        const stepOut = path.join(__dirname, `step_${obj.step_index}.json`);
        fs.writeFileSync(stepOut, JSON.stringify(obj, null, 2), 'utf8');
        results.push(`  Saved step to step_${obj.step_index}.json`);
      } catch (e) {
        results.push(`  Failed to parse JSON: ${e.message}`);
      }
    }
  }
  
  fs.writeFileSync(outputPath, results.join('\n'), 'utf8');
  console.log('Search complete. Results:', results.join('\n'));
} catch (err) {
  console.error('Error:', err);
}
