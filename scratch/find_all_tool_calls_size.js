import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';

try {
  if (!fs.existsSync(logPath)) {
    console.error('Log file not found');
    process.exit(1);
  }
  
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  const results = [];
  
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    try {
      const step = JSON.parse(line);
      const stepNum = step.step_index;
      
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
            code = args.ReplacementChunks.map(c => c.ReplacementContent || '').join('\n');
          }
          
          const hasRenders = code.includes('renderHDNTDocument') || code.includes('renderGdnDocument') || code.includes('InlineField');
          if (hasRenders) {
            results.push({
              stepNum,
              toolIndex: tcIdx,
              toolName: name,
              size: code.length,
              targetFile: args.TargetFile || '',
              hasHDNT: code.includes('renderHDNTDocument'),
              hasHDTC: code.includes('renderHDTCDocument'),
              hasHDCM: code.includes('renderHDCMDocument'),
              hasGdn: code.includes('renderGdnDocument'),
              hasInlineField: code.includes('InlineField')
            });
          }
        });
      }
      
      // Also check content blocks
      if (step.content) {
        const codeBlockRegex = /```(?:typescript|tsx|javascript|js)?\n([\s\S]*?)```/g;
        let match;
        let blockIdx = 0;
        while ((match = codeBlockRegex.exec(step.content)) !== null) {
          const code = match[1];
          const hasRenders = code.includes('renderHDNTDocument') || code.includes('renderGdnDocument') || code.includes('InlineField');
          if (hasRenders) {
            results.push({
              stepNum,
              toolIndex: `block_${blockIdx}`,
              toolName: 'markdown_block',
              size: code.length,
              targetFile: 'content',
              hasHDNT: code.includes('renderHDNTDocument'),
              hasHDTC: code.includes('renderHDTCDocument'),
              hasHDCM: code.includes('renderHDCMDocument'),
              hasGdn: code.includes('renderGdnDocument'),
              hasInlineField: code.includes('InlineField')
            });
            blockIdx++;
          }
        }
      }
    } catch (e) {
      // Skip parsing errors
    }
  });
  
  results.sort((a, b) => b.size - a.size);
  
  console.log(`Found ${results.length} total blocks containing templates/fields, sorted by size:`);
  results.forEach((r, idx) => {
    console.log(`[${idx + 1}] Step: ${r.stepNum} | Source: ${r.toolName} (Index: ${r.toolIndex}) | Size: ${r.size} chars | File: ${r.targetFile}`);
    console.log(`    Contains: HDNT: ${r.hasHDNT}, HDTC: ${r.hasHDTC}, HDCM: ${r.hasHDCM}, Gdn: ${r.hasGdn}, InlineField: ${r.hasInlineField}`);
  });
  
  // Let's write out the top 3 largest blocks to scratch so we can use them!
  results.slice(0, 3).forEach((r, idx) => {
    // We need to re-parse the line to get the exact content
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const step = JSON.parse(line);
        if (step.step_index === r.stepNum) {
          let code = '';
          if (r.toolName === 'markdown_block') {
            const codeBlockRegex = /```(?:typescript|tsx|javascript|js)?\n([\s\S]*?)```/g;
            let match;
            let blockIdx = 0;
            while ((match = codeBlockRegex.exec(step.content)) !== null) {
              if (`block_${blockIdx}` === r.toolIndex) {
                code = match[1];
                break;
              }
              blockIdx++;
            }
          } else {
            const tc = step.tool_calls[parseInt(r.toolIndex)];
            const args = tc.args || {};
            if (tc.name === 'write_to_file' && args.CodeContent) {
              code = args.CodeContent;
            } else if (tc.name === 'replace_file_content' && args.ReplacementContent) {
              code = args.ReplacementContent;
            } else if (tc.name === 'multi_replace_file_content' && args.ReplacementChunks) {
              code = args.ReplacementChunks.map(c => c.ReplacementContent || '').join('\n');
            }
          }
          
          if (code) {
            const outPath = `scratch/largest_block_${idx + 1}_step_${r.stepNum}.tsx`;
            fs.writeFileSync(outPath, code, 'utf8');
            console.log(`Saved largest block [${idx + 1}] to ${outPath} (${code.length} characters)`);
          }
        }
      } catch (e) {
        // Skip
      }
    }
  });

} catch (err) {
  console.error(err);
}
