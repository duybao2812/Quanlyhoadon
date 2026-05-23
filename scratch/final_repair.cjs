const fs = require('fs');
const path = require('path');

const appPath = 'd:/GitHub/Quanlyhoadon/src/App.tsx';
const compPath = 'd:/GitHub/Quanlyhoadon/scratch/ContractView.tsx';

const appContent = fs.readFileSync(appPath, 'utf8');
const compContent = fs.readFileSync(compPath, 'utf8');

const lines = appContent.split('\n');

// Find the start and end of ContractView
// It starts at line 2011 (index 2010)
// and ends at line 3250 (index 3249)

const startIndex = 2010;
const endIndex = 3249;

const part1 = lines.slice(0, startIndex);
const part2 = lines.slice(endIndex + 1);

const finalContent = part1.join('\n') + '\n' + compContent + '\n' + part2.join('\n');

fs.writeFileSync(appPath, finalContent);
console.log('Successfully updated App.tsx');
