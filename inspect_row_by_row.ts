import * as fs from 'fs';
import { parseCsvRows } from './src/utils/csvParser';

const csv = fs.readFileSync('live_sheet.csv', 'utf8');
const rows = parseCsvRows(csv);

console.log('Row count in CSV:', rows.length);
// Row 36 is index 35
for (let r = 34; r < 42; r++) {
  console.log(`Row ${r + 1} (idx ${r}): Col B="${rows[r]?.[1] || ''}" | Col C="${rows[r]?.[2] || ''}" | Col S="${rows[r]?.[18] || ''}"`);
}

for (let r = 270; r < 282; r++) {
  console.log(`Row ${r + 1} (idx ${r}): Col B="${rows[r]?.[1] || ''}" | Col C="${rows[r]?.[2] || ''}" | Col S="${rows[r]?.[18] || ''}"`);
}
