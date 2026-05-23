import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, 'step565_diff.json');

try {
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(jsonContent);
  
  console.log('JSON Keys:', Object.keys(data));
  console.log('Type:', data.type);
  console.log('Source:', data.source);
  
  if (data.tool_calls) {
    console.log('Number of tool calls:', data.tool_calls.length);
    data.tool_calls.forEach((tc, idx) => {
      console.log(`Tool Call ${idx}:`, tc.type, tc.status, Object.keys(tc));
      if (tc.tool_call) {
        console.log(`  Nested tool_call name:`, tc.tool_call.name);
        console.log(`  Has arguments:`, !!tc.tool_call.arguments);
      }
    });
  }
} catch (err) {
  console.error('Error:', err);
}
