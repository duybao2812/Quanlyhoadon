import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';

const targetSteps = [1194, 1172, 1158, 1156, 1136];

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (targetSteps.includes(obj.step_index)) {
        console.log(`\n==================================================`);
        console.log(`STEP ${obj.step_index} | Type: ${obj.type} | Source: ${obj.source}`);
        console.log(`==================================================`);
        if (obj.content) {
          console.log(`Content length: ${obj.content.length}`);
          const snippet = obj.content.substring(0, 1000);
          console.log(`Content prefix:\n${snippet}`);
          
          // Write full content to a file
          const outPath = `scratch/step_${obj.step_index}_content.txt`;
          fs.writeFileSync(outPath, obj.content, 'utf8');
          console.log(`Saved full content to ${outPath}`);
        }
      }
    } catch (e) {
      // Ignore
    }
  }
} catch (err) {
  console.error('Error:', err);
}
