import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logPath = 'C:\\Users\\gunfi\\.gemini\\antigravity\\brain\\e946d253-0355-489b-8d49-b22d313858bb\\.system_generated\\logs\\transcript.jsonl';
const outputDir = path.join(__dirname, 'extracted_full');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

try {
  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');
  console.log(`Scanning ${lines.length} lines from transcript...`);
  
  let matchCount = 0;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    
    // We search for lines that mention our templates
    if (line.includes('renderHDNTDocument') || line.includes('renderHDTCDocument') || line.includes('renderGdnDocument')) {
      try {
        const obj = JSON.parse(line);
        const stepNum = obj.step_index;
        
        // Let's check tool_calls
        if (obj.tool_calls) {
          obj.tool_calls.forEach((tc, tIdx) => {
            const name = tc.name;
            const args = tc.args || {};
            
            // Check replacement content or code content
            let code = '';
            if (name === 'write_to_file' && args.CodeContent) {
              code = args.CodeContent;
            } else if (name === 'replace_file_content' && args.ReplacementContent) {
              code = args.ReplacementContent;
            } else if (name === 'multi_replace_file_content' && args.ReplacementChunks) {
              code = args.ReplacementChunks.map(c => c.ReplacementContent || '').join('\n');
            }
            
            if (code && (code.includes('renderHDNTDocument') || code.includes('renderHDTCDocument') || code.includes('renderGdnDocument'))) {
              const outPath = path.join(outputDir, `step_${stepNum}_tool_${tIdx}_${name}.tsx`);
              fs.writeFileSync(outPath, code, 'utf8');
              console.log(`Saved step ${stepNum} tool ${tIdx} (${name}) to ${outPath} (length: ${code.length})`);
              matchCount++;
            }
          });
        }
        
        // Also look at prompt/response text
        if (obj.content && (obj.content.includes('renderHDNTDocument') || obj.content.includes('renderHDTCDocument'))) {
          // If it is a big model response containing the code
          if (obj.content.length > 5000) {
            const outPath = path.join(outputDir, `step_${stepNum}_content.txt`);
            fs.writeFileSync(outPath, obj.content, 'utf8');
            console.log(`Saved step ${stepNum} content to ${outPath} (length: ${obj.content.length})`);
            matchCount++;
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  console.log(`Finished extraction. Saved ${matchCount} matches.`);
} catch (err) {
  console.error('Error during extraction:', err);
}
