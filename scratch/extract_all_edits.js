import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';
const outputDir = 'd:\\GitHub\\Quanlyhoadon\\scratch\\extracted_edits';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
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
    
    if (line.includes('App.tsx') && (line.includes('replace_file_content') || line.includes('multi_replace_file_content'))) {
      try {
        const step = JSON.parse(line);
        const stepNum = step.step_index;
        
        if (step.tool_calls && Array.isArray(step.tool_calls)) {
          step.tool_calls.forEach((tc, tcIdx) => {
            const name = tc.name;
            const args = tc.args || {};
            
            if (args.TargetFile && args.TargetFile.endsWith('App.tsx')) {
              // Extract replace_file_content
              if (name === 'replace_file_content' && args.ReplacementContent) {
                const outPath = path.join(outputDir, `step_${stepNum}_tc_${tcIdx}_replace_file.tsx`);
                fs.writeFileSync(outPath, args.ReplacementContent, 'utf8');
                console.log(`Saved replace_file_content for step ${stepNum} -> ${outPath}`);
                matchCount++;
              }
              
              // Extract multi_replace_file_content chunks
              if (name === 'multi_replace_file_content' && args.ReplacementChunks) {
                args.ReplacementChunks.forEach((chunk, cIdx) => {
                  if (chunk.ReplacementContent) {
                    const outPath = path.join(outputDir, `step_${stepNum}_tc_${tcIdx}_multi_chunk_${cIdx}_lines_${chunk.StartLine}_to_${chunk.EndLine}.tsx`);
                    fs.writeFileSync(outPath, chunk.ReplacementContent, 'utf8');
                    console.log(`Saved multi chunk for step ${stepNum}, chunk ${cIdx} -> ${outPath}`);
                    matchCount++;
                  }
                });
              }
            }
          });
        }
      } catch (e) {
        // Suppress parsing errors
      }
    }
  }
  console.log(`Scanning complete. Extracted ${matchCount} edit chunks.`);
} catch (err) {
  console.error('Error scanning transcript:', err);
}
