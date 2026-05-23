import fs from 'fs';

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.step_index === 1235) {
        console.log(`Step 1235: type=${obj.type}, source=${obj.source}`);
        console.log(`Keys:`, Object.keys(obj));
        if (obj.tool_calls) {
          console.log(`Number of tool calls: ${obj.tool_calls.length}`);
          obj.tool_calls.forEach((tc, idx) => {
            console.log(`  Tool call ${idx}: name=${tc.name}`);
            const args = tc.args || {};
            console.log(`    TargetFile: ${args.TargetFile}`);
            console.log(`    Has ReplacementChunks: ${!!args.ReplacementChunks}`);
            if (args.ReplacementChunks) {
              console.log(`    Number of chunks: ${args.ReplacementChunks.length}`);
              args.ReplacementChunks.forEach((chunk, cIdx) => {
                console.log(`      Chunk ${cIdx}: Start=${chunk.StartLine}, End=${chunk.EndLine}`);
                console.log(`      TargetContent length: ${chunk.TargetContent ? chunk.TargetContent.length : 0}`);
                console.log(`      ReplacementContent length: ${chunk.ReplacementContent ? chunk.ReplacementContent.length : 0}`);
                
                // Save this chunk's replacement content to check
                const outPath = `scratch/step_1235_chunk_${cIdx}.txt`;
                fs.writeFileSync(outPath, chunk.ReplacementContent || '', 'utf8');
                console.log(`      Saved chunk to ${outPath}`);
              });
            }
          });
        }
      }
    } catch (e) {
      // Ignore
    }
  }
} catch (err) {
  console.error('Error:', err);
}
