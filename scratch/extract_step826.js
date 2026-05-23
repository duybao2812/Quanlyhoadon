import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, 'step_826.json');
const outputPath = path.join(__dirname, 'step_826_file_content.txt');

try {
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(jsonContent);
  
  if (data.content) {
    fs.writeFileSync(outputPath, data.content, 'utf8');
    console.log('Successfully wrote step 826 content!');
  } else {
    console.log('No content in step 826.');
  }
} catch (err) {
  console.error('Error:', err);
}
