import * as fs from 'fs';
import { parseAllModels } from './src/utils/csvParser';

const csv = fs.readFileSync('live_sheet.csv', 'utf8');
const allModels = parseAllModels(csv);

let both = 0;
let onlyOld = 0;
let onlyNew = 0;
let neither = 0;
for (const m of allModels) {
  if (m.scoreOld !== null && m.scoreNewReported !== null) both++;
  else if (m.scoreOld !== null) onlyOld++;
  else if (m.scoreNewReported !== null) onlyNew++;
  else neither++;
}
console.log({ both, onlyOld, onlyNew, neither });
