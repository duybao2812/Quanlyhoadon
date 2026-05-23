import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.step_index === 722 || obj.step_index === 724) {
        console.log(`Step ${obj.step_index}: type=${obj.type}, source=${obj.source}`);
        console.log(`  Content snippet:`, obj.content ? obj.content.substring(0, 500) : 'No content');
      }
    } catch (e) {
      // Ignore
    }
  }
} catch (err) {
  console.error('Error:', err);
}
