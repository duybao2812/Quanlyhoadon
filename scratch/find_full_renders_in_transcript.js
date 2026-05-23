import fs from 'fs';
import path from 'path';

const logPath = 'C:\\\\Users\\\\gunfi\\\\.gemini\\\\antigravity\\\\brain\\\\e946d253-0355-489b-8d49-b22d313858bb\\\\.system_generated\\\\logs\\\\transcript.jsonl';
const outputDir = 'd:\\\\GitHub\\\\Quanlyhoadon\\\\scratch\\\\extracted_pristine';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Loaded ${lines.length} lines from transcript.`);

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    
    // Look for steps containing the render function names
    if (line.includes('renderHDNTDocument') || line.includes('renderGdnDocument') || line.includes('GDNTableInputWordLike')) {
      try {
        const step = JSON.parse(line);
        const stepNum = step.step_index;
        
        console.log(`Found match at step ${stepNum} (type: ${step.type})`);
        
        // Extract from tool_calls
        if (step.tool_calls) {
          step.tool_calls.forEach((tc, tcIdx) => {
            const name = tc.name;
            const args = tc.args || {};
            
            let code = '';
            if (name === 'write_to_file' && args.CodeContent) {
              code = args.CodeContent;
            } else if (name === 'replace_file_content' && args.ReplacementContent) {
              code = args.ReplacementContent;
            } else if (name === 'multi_replace_file_content' && args.ReplacementChunks) {
              code = args.ReplacementChunks.map((c, chunkIdx) => `// Chunk ${chunkIdx}\n` + (c.ReplacementContent || '')).join('\n\n');
            }
            
            if (code && (code.includes('renderHDNTDocument') || code.includes('renderGdnDocument') || code.includes('GDNTableInputWordLike'))) {
              const outPath = path.join(outputDir, `step_${stepNum}_tc_${tcIdx}_${name}.tsx`);
              fs.writeFileSync(outPath, code, 'utf8');
              console.log(`  Saved tool call code to ${outPath} (${code.length} chars)`);
            }
          });
        }
        
        // Extract from content (e.g. system responses or model text output)
        if (step.content && (step.content.includes('renderHDNTDocument') || step.content.includes('renderGdnDocument') || step.content.includes('GDNTableInputWordLike'))) {
          // Find if there are markdown code blocks
          const codeBlockRegex = /```(?:typescript|tsx|javascript|js)?\n([\s\S]*?)```/g;
          let match;
          let blockIdx = 0;
          while ((match = codeBlockRegex.exec(step.content)) !== null) {
            const codeBlock = match[1];
            if (codeBlock.includes('renderHDNTDocument') || codeBlock.includes('renderGdnDocument') || codeBlock.includes('GDNTableInputWordLike')) {
              const outPath = path.join(outputDir, `step_${stepNum}_block_${blockIdx}.tsx`);
              fs.writeFileSync(outPath, codeBlock, 'utf8');
              console.log(`  Saved markdown block to ${outPath} (${codeBlock.length} chars)`);
              blockIdx++;
            }
          }
        }
      } catch (e) {
        // Suppress parsing errors for long/broken lines
      }
    }
  }
  console.log('Finished scanning.');
} catch (err) {
  console.error('Error scanning transcript:', err);
}
