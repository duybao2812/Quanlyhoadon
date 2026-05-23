import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';
const outputDir = 'd:\\GitHub\\Quanlyhoadon\\scratch\\extracted_perfect';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function cleanString(str) {
  if (!str) return '';
  let res = str.trim();
  if (res.startsWith('"') && res.endsWith('"')) {
    res = res.substring(1, res.length - 1);
  }
  return res.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

try {
  console.log('Reading transcript.jsonl...');
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  console.log(`Scanning ${lines.length} lines...`);
  
  let matchCount = 0;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    
    // Parse step
    try {
      const step = JSON.parse(line);
      const stepNum = step.step_index;
      
      if (step.tool_calls && Array.isArray(step.tool_calls)) {
        step.tool_calls.forEach((tc, tcIdx) => {
          const name = tc.name;
          const args = tc.args || {};
          
          const rawTargetFile = args.TargetFile || args.AbsolutePath || args.targetFile || '';
          const targetFile = cleanString(rawTargetFile);
          
          if (targetFile.toLowerCase().includes('app.tsx')) {
            console.log(`Found App.tsx tool call at Step ${stepNum}: name=${name}`);
            
            // Check write_to_file
            if (name === 'write_to_file' && args.CodeContent) {
              const code = args.CodeContent;
              const outPath = path.join(outputDir, `step_${stepNum}_tc_${tcIdx}_write.tsx`);
              fs.writeFileSync(outPath, code, 'utf8');
              console.log(`  Saved write_to_file -> ${outPath}`);
              matchCount++;
            }
            
            // Check replace_file_content
            if (name === 'replace_file_content' && args.ReplacementContent) {
              const code = args.ReplacementContent;
              const outPath = path.join(outputDir, `step_${stepNum}_tc_${tcIdx}_replace.tsx`);
              fs.writeFileSync(outPath, code, 'utf8');
              console.log(`  Saved replace_file_content -> ${outPath}`);
              matchCount++;
            }
            
            // Check multi_replace_file_content
            if (name === 'multi_replace_file_content' && args.ReplacementChunks) {
              args.ReplacementChunks.forEach((chunk, cIdx) => {
                const code = chunk.ReplacementContent;
                if (code) {
                  const outPath = path.join(outputDir, `step_${stepNum}_tc_${tcIdx}_multi_chunk_${cIdx}_lines_${chunk.StartLine}_to_${chunk.EndLine}.tsx`);
                  fs.writeFileSync(outPath, code, 'utf8');
                  console.log(`  Saved multi chunk ${cIdx} -> ${outPath}`);
                  matchCount++;
                }
              });
            }
          }
        });
      }
    } catch (e) {
      // JSON parse error
    }
  }
  console.log(`Scanning complete. Saved ${matchCount} match items.`);
} catch (err) {
  console.error('Error scanning:', err);
}
