import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    if (line.includes('replace_file_content') && line.includes('PLANNER_RESPONSE')) {
      try {
        const obj = JSON.parse(line);
        if (obj.tool_calls && obj.tool_calls.length > 0) {
          obj.tool_calls.forEach((tc, i) => {
            if (tc.name === 'replace_file_content') {
              const fileTarget = tc.args ? tc.args.TargetFile : 'unknown';
              const textLen = tc.args && tc.args.ReplacementContent ? tc.args.ReplacementContent.length : 0;
              const hasTrunc = line.includes('<truncated');
              console.log(`Step ${obj.step_index} | Tool call ${i} | File: ${fileTarget} | Length: ${textLen} | Truncated: ${hasTrunc}`);
              if (!hasTrunc && textLen > 0) {
                const outPath = path.join(__dirname, `step_${obj.step_index}_replacement.txt`);
                fs.writeFileSync(outPath, tc.args.ReplacementContent, 'utf8');
                console.log(`  Saved untruncated ReplacementContent to step_${obj.step_index}_replacement.txt`);
              }
            }
          });
        }
      } catch (e) {
        // Ignore
      }
    }
  }
} catch (err) {
  console.error('Error:', err);
}
