import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';

try {
  if (!fs.existsSync(logPath)) {
    console.error('Transcript log not found at', logPath);
    process.exit(1);
  }
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  console.log(`Loaded ${lines.length} lines from transcript.`);

  const matches = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    
    if (line.includes('renderHDNTDocument')) {
      try {
        const step = JSON.parse(line);
        const stepNum = step.step_index;
        
        let toolCallsInfo = [];
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
            
            if (code && code.includes('renderHDNTDocument')) {
              toolCallsInfo.push({
                index: tcIdx,
                name,
                size: code.length,
                hasHDNT: code.includes('renderHDNTDocument'),
                hasHDTC: code.includes('renderHDTCDocument'),
                hasHDCM: code.includes('renderHDCMDocument'),
                hasGdn: code.includes('renderGdnDocument'),
                snippet: code.substring(0, 150).replace(/\n/g, ' ')
              });
            }
          });
        }
        
        let blockCount = 0;
        if (step.content) {
          const codeBlockRegex = /```(?:typescript|tsx|javascript|js)?\n([\s\S]*?)```/g;
          let match;
          while ((match = codeBlockRegex.exec(step.content)) !== null) {
            const code = match[1];
            if (code.includes('renderHDNTDocument')) {
              blockCount++;
            }
          }
        }
        
        if (toolCallsInfo.length > 0 || blockCount > 0) {
          matches.push({
            stepNum,
            type: step.type,
            source: step.source,
            toolCalls: toolCallsInfo,
            markdownBlocksCount: blockCount
          });
        }
      } catch (e) {
        // Ignore parse error
      }
    }
  }

  console.log(`\nFound ${matches.length} matching steps:\n`);
  matches.forEach(m => {
    console.log(`Step ${m.stepNum} | Type: ${m.type} | Source: ${m.source}`);
    if (m.toolCalls.length > 0) {
      console.log('  Tool Calls:');
      m.toolCalls.forEach(tc => {
        console.log(`    - [Tool ${tc.index}] Name: ${tc.name} | Size: ${tc.size} chars`);
        console.log(`      Contains: HDNT: ${tc.hasHDNT}, HDTC: ${tc.hasHDTC}, HDCM: ${tc.hasHDCM}, Gdn: ${tc.hasGdn}`);
        console.log(`      Snippet: ${tc.snippet}`);
      });
    }
    if (m.markdownBlocksCount > 0) {
      console.log(`  Markdown Code Blocks: ${m.markdownBlocksCount}`);
    }
  });

} catch (err) {
  console.error('Error:', err);
}
