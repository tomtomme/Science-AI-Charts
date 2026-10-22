import * as fs from 'fs';
import { parseAllModels } from './src/utils/csvParser';

const csv = fs.readFileSync('live_sheet.csv', 'utf8');
const allModels = parseAllModels(csv);

const both = allModels.filter(m => m.scoreOld !== null && m.scoreNewReported !== null);
console.log('Sample of models with both scores:');
both.slice(0, 10).forEach(m => {
  console.log(`${m.displayName} (${m.releaseDate}): Old=${m.scoreOld}, New=${m.scoreNewReported}`);
});
