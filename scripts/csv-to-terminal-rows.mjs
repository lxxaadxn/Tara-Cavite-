import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const csvPath = path.join(root, 'data', 'terminals_cavite_updated.csv');
const outPath = path.join(root, 'data', 'terminals_cavite_rows.json');

const txt = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const rows = [];
for (let i = 1; i < txt.length; i++) {
  const line = txt[i];
  if (!line.trim()) continue;
  const m = line.match(/^(\d+),(.+),Cavite,([^,]+),([^,]*),([^,]*),([^,]*)$/);
  if (!m) {
    console.error('Unparseable line:', line);
    process.exit(1);
  }
  rows.push({
    Terminal_Id: m[1],
    Terminal_Name: m[2],
    Terminal_Province: 'Cavite',
    Terminal_City: m[3],
    Terminal_Brgy: m[4] || '',
    First_Trip: m[5],
    Last_Trip: m[6],
  });
}
fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
console.log('Wrote', rows.length, 'rows to', path.relative(root, outPath));
