import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';
const outputDir = 'd:\\GitHub\\Quanlyhoadon\\scratch\\extracted_perfect';

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
    
    // Check if the line contains key renderers
    if (line.includes('renderHDNTDocument') || line.includes('renderGdnDocument') || line.includes('GDNTableInputWordLike')) {
      try {
        const step = JSON.parse(line);
        const stepNum = step.step_index;
        
        // 1. Check tool calls (replace_file_content, multi_replace_file_content, write_to_file)
        if (step.tool_calls && Array.isArray(step.tool_calls)) {
          step.tool_calls.forEach((tc, tcIdx) => {
            const name = tc.name;
            const args = tc.args || {};
            
            // Check write_to_file
            if (name === 'write_to_file' && args.CodeContent) {
              const code = args.CodeContent;
              if (code.includes('renderHDNTDocument') || code.includes('renderGdnDocument') || code.includes('GDNTableInputWordLike')) {
                const outPath = path.join(outputDir, `step_${stepNum}_tc_${tcIdx}_write.tsx`);
                fs.writeFileSync(outPath, code, 'utf8');
                console.log(`Saved write_to_file code at step ${stepNum} -> ${outPath}`);
                matchCount++;
              }
            }
            
            // Check replace_file_content
            if (name === 'replace_file_content' && args.ReplacementContent) {
              const code = args.ReplacementContent;
              if (code.includes('renderHDNTDocument') || code.includes('renderGdnDocument') || code.includes('GDNTableInputWordLike')) {
                const outPath = path.join(outputDir, `step_${stepNum}_tc_${tcIdx}_replace.tsx`);
                fs.writeFileSync(outPath, code, 'utf8');
                console.log(`Saved replace_file_content code at step ${stepNum} -> ${outPath}`);
                matchCount++;
              }
            }
            
            // Check multi_replace_file_content
            if (name === 'multi_replace_file_content' && args.ReplacementChunks) {
              args.ReplacementChunks.forEach((chunk, cIdx) => {
                const code = chunk.ReplacementContent;
                if (code && (code.includes('renderHDNTDocument') || code.includes('renderGdnDocument') || code.includes('GDNTableInputWordLike'))) {
                  const outPath = path.join(outputDir, `step_${stepNum}_tc_${tcIdx}_multi_chunk_${cIdx}.tsx`);
                  fs.writeFileSync(outPath, code, 'utf8');
                  console.log(`Saved multi_replace_file_content chunk at step ${stepNum}, chunk ${cIdx} -> ${outPath}`);
                  matchCount++;
                }
              });
            }
          });
        }
        
        // 2. Check content (e.g. models listing code in markdown codeblocks)
        if (step.content && (step.content.includes('renderHDNTDocument') || step.content.includes('renderGdnDocument') || step.content.includes('GDNTableInputWordLike'))) {
          const codeBlockRegex = /```(?:typescript|tsx|javascript|js)?\n([\s\S]*?)```/g;
          let match;
          let blockIdx = 0;
          while ((match = codeBlockRegex.exec(step.content)) !== null) {
            const code = match[1];
            if (code.includes('renderHDNTDocument') || code.includes('renderGdnDocument') || code.includes('GDNTableInputWordLike')) {
              const outPath = path.join(outputDir, `step_${stepNum}_block_${blockIdx}.tsx`);
              fs.writeFileSync(outPath, code, 'utf8');
              console.log(`Saved markdown codeblock at step ${stepNum}, block ${blockIdx} -> ${outPath}`);
              matchCount++;
              blockIdx++;
            }
          }
        }
      } catch (e) {
        // Suppress parsing errors for malformed lines
      }
    }
  }
  console.log(`Scanning complete. Found and saved ${matchCount} match items.`);
} catch (err) {
  console.error('Error scanning:', err);
}
