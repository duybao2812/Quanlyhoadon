import fs from 'fs';
import path from 'path';

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  console.log(`Scanning ${lines.length} lines from transcript...`);
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    if (line.includes('renderHDNTDocument') && line.includes('multi_replace_file_content')) {
      try {
        const obj = JSON.parse(line);
        console.log(`Found step ${obj.step_index} with multi_replace_file_content`);
        if (obj.tool_calls) {
          obj.tool_calls.forEach((tc, tIdx) => {
            if (tc.name === 'multi_replace_file_content' || tc.name === 'replace_file_content') {
              console.log(`  Tool call ${tIdx} name: ${tc.name}`);
              const args = tc.args || {};
              console.log(`  TargetFile: ${args.TargetFile}`);
              if (args.ReplacementChunks) {
                console.log(`  Number of chunks: ${args.ReplacementChunks.length}`);
                args.ReplacementChunks.forEach((c, cIdx) => {
                  console.log(`    Chunk ${cIdx}: Lines ${c.StartLine}-${c.EndLine}, Length: ${c.ReplacementContent ? c.ReplacementContent.length : 0}`);
                  if (c.ReplacementContent && c.ReplacementContent.includes('renderHDNTDocument')) {
                    const outPath = `scratch/step_${obj.step_index}_chunk_${cIdx}.tsx`;
                    fs.writeFileSync(outPath, c.ReplacementContent, 'utf8');
                    console.log(`    SAVED chunk to ${outPath}`);
                  }
                });
              }
            }
          });
        }
      } catch (e) {
        console.log(`  Error parsing line ${idx}: ${e.message}`);
      }
    }
  }
} catch (err) {
  console.error('Error:', err);
}
