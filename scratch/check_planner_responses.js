import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      // Let's inspect step 552 and see what it contains
      if (obj.step_index === 552) {
        console.log(`Step 552 keys:`, Object.keys(obj));
        if (obj.tool_calls) {
          console.log(`Step 552 has tool_calls of length:`, obj.tool_calls.length);
          const tc = obj.tool_calls[0];
          console.log(`Tool call type:`, tc.type);
          console.log(`Tool call function:`, tc.function ? tc.function.name : 'none');
          if (tc.function && tc.function.arguments) {
            console.log(`Arguments length:`, tc.function.arguments.length);
            console.log(`Arguments sample:`, tc.function.arguments.substring(0, 300));
            // Let's check if the arguments are truncated in the log
            if (tc.function.arguments.includes('<truncated')) {
              console.log('--- ARGUMENTS ARE TRUNCATED IN LOG ---');
            } else {
              console.log('--- ARGUMENTS ARE COMPLETE IN LOG ---');
              fs.writeFileSync(path.join(__dirname, 'step552_args.json'), tc.function.arguments, 'utf8');
            }
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }
} catch (err) {
  console.error('Error:', err);
}
