import fs from 'fs';
import path from 'path';

const logPath = 'C:\\\\Users\\\\gunfi\\\\.gemini\\\\antigravity\\\\brain\\\\e946d253-0355-489b-8d49-b22d313858bb\\\\.system_generated\\\\logs\\\\transcript.jsonl';
const outputDir = 'd:\\\\GitHub\\\\Quanlyhoadon\\\\scratch\\\\extracted_steps';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  // Steps to inspect
  const targetSteps = [565, 808, 858, 862, 888];
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    
    try {
      const step = JSON.parse(line);
      const stepNum = step.step_index;
      
      if (targetSteps.includes(stepNum) || (step.content && step.content.includes('renderHDNTDocument') && step.type === 'CODE_ACTION')) {
        const outPath = path.join(outputDir, `step_${stepNum}_full.json`);
        fs.writeFileSync(outPath, JSON.stringify(step, null, 2), 'utf8');
        console.log(`Saved step ${stepNum} to ${outPath}`);
      }
    } catch (e) {
      // Ignore JSON parsing errors
    }
  }
} catch (err) {
  console.error('Error:', err);
}
