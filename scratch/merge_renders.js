import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scratchDir = __dirname;
const files = fs.readdirSync(scratchDir);
const viewFiles = files.filter(f => f.endsWith('_view_file.txt'));

console.log(`Found ${viewFiles.length} view file logs to merge.`);

const linesMap = new Map();

viewFiles.forEach(file => {
  const filePath = path.join(scratchDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  
  lines.forEach(line => {
    // Match line numbers like "2382: const InlineField = ..."
    const match = line.match(/^\s*(\d+):(.*)$/);
    if (match) {
      const lineNum = parseInt(match[1]);
      const code = match[2];
      
      // If we don't have this line yet, or it's longer (sometimes lines get truncated), store it
      if (!linesMap.has(lineNum) || code.length > linesMap.get(lineNum).length) {
        linesMap.set(lineNum, code);
      }
    }
  });
});

// Sort lines by line number
const sortedLineNums = Array.from(linesMap.keys()).sort((a, b) => a - b);
console.log(`Merged a total of ${sortedLineNums.length} unique lines.`);

if (sortedLineNums.length === 0) {
  console.log('No lines found to write.');
  process.exit(0);
}

// Let's find contiguous segments of lines
const segments = [];
let currentSegment = [sortedLineNums[0]];

for (let i = 1; i < sortedLineNums.length; i++) {
  const prev = sortedLineNums[i - 1];
  const curr = sortedLineNums[i];
  if (curr === prev + 1) {
    currentSegment.push(curr);
  } else {
    segments.push(currentSegment);
    currentSegment = [curr];
  }
}
segments.push(currentSegment);

console.log(`Found ${segments.length} contiguous line segments:`);
segments.forEach((seg, idx) => {
  const start = seg[0];
  const end = seg[seg.length - 1];
  console.log(`  Segment ${idx}: Lines ${start}-${end} (${seg.length} lines)`);
  
  // Let's write each segment to a separate file so we can view them easily
  const segmentLines = seg.map(num => linesMap.get(num));
  const segmentCode = segmentLines.join('\n');
  const outPath = path.join(scratchDir, 'restored_code', `segment_${start}_to_${end}.tsx`);
  
  // Ensure restored_code dir exists
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  fs.writeFileSync(outPath, segmentCode, 'utf8');
  console.log(`    Saved segment to ${outPath}`);
});
