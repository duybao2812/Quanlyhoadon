import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, 'step565_diff.json');
const outputPath = path.join(__dirname, 'step565_content.txt');

try {
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(jsonContent);
  
  if (data.tool_calls && data.tool_calls.length > 0) {
    const toolCall = data.tool_calls[0];
    if (toolCall.function && toolCall.function.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      if (args.ReplacementContent) {
        fs.writeFileSync(outputPath, args.ReplacementContent, 'utf8');
        console.log('Successfully extracted ReplacementContent to step565_content.txt!');
      } else if (args.ReplacementChunks) {
        fs.writeFileSync(outputPath, JSON.stringify(args.ReplacementChunks, null, 2), 'utf8');
        console.log('Successfully extracted ReplacementChunks to step565_content.txt!');
      } else {
        fs.writeFileSync(outputPath, JSON.stringify(args, null, 2), 'utf8');
        console.log('Successfully extracted tool arguments to step565_content.txt!');
      }
    } else {
      console.log('No function arguments found.');
    }
  } else if (data.content) {
    fs.writeFileSync(outputPath, data.content, 'utf8');
    console.log('Successfully extracted content to step565_content.txt!');
  } else {
    console.log('No content or tool calls found.');
  }
} catch (err) {
  console.error('Error:', err);
}
