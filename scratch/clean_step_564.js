import fs from 'fs';
import path from 'path';

const inputPath = 'd:\\GitHub\\Quanlyhoadon\\scratch\\extracted_perfect\\step_564_tc_0_replace.tsx';
const outputPath = 'd:\\GitHub\\Quanlyhoadon\\scratch\\step_564_clean.tsx';

try {
  let rawContent = fs.readFileSync(inputPath, 'utf8');
  
  // Check if it's wrapped in double quotes (JSON style)
  if (rawContent.startsWith('"') && rawContent.endsWith('"')) {
    // We can parse it as JSON
    try {
      const parsed = JSON.parse(rawContent);
      fs.writeFileSync(outputPath, parsed, 'utf8');
      console.log(`Successfully cleaned JSON string and saved to ${outputPath} (${parsed.length} chars)`);
    } catch (e) {
      // If direct parse fails, try parsing it as a JSON fragment
      const parsed = JSON.parse(`{"code": ${rawContent}}`).code;
      fs.writeFileSync(outputPath, parsed, 'utf8');
      console.log(`Successfully parsed as fragment and saved to ${outputPath} (${parsed.length} chars)`);
    }
  } else {
    // If not wrapped, maybe it has some escaped characters or is already clean
    fs.writeFileSync(outputPath, rawContent, 'utf8');
    console.log(`Saved as-is to ${outputPath} (${rawContent.length} chars)`);
  }
} catch (err) {
  console.error('Error:', err);
}
