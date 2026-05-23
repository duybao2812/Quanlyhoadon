import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const steps = [801, 823, 824, 825, 826, 857, 860, 861, 947];

steps.forEach(step => {
  const filePath = path.join(__dirname, `step_${step}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`Step ${step}:`);
    console.log(`  Source: ${data.source}`);
    console.log(`  Type: ${data.type}`);
    console.log(`  Keys: ${Object.keys(data)}`);
    if (data.content) {
      console.log(`  Content length: ${data.content.length}`);
      console.log(`  Content snippet: ${data.content.substring(0, 150).replace(/\n/g, ' ')}...`);
    }
    if (data.tool_calls) {
      console.log(`  Number of tool_calls: ${data.tool_calls.length}`);
      data.tool_calls.forEach((tc, i) => {
        console.log(`    Tool call ${i}: type=${tc.type}, status=${tc.status}`);
        if (tc.content) console.log(`      Content length: ${tc.content.length}`);
      });
    }
  }
});
