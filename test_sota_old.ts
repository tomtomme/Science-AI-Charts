import * as fs from 'fs';
import { parseAllModels } from './src/utils/csvParser';
import { extractFrontierPoints } from './src/utils/mathRegression';

const csv = fs.readFileSync('live_sheet.csv', 'utf8');
const allModels = parseAllModels(csv);

const eligible = allModels
  .filter((m) => typeof m.scoreOld === 'number' && m.scoreOld > 0)
  .map((m) => ({
    id: m.id,
    name: m.name,
    displayName: m.displayName,
    releaseDate: m.releaseDate,
    timestamp: new Date(m.releaseDate).getTime(),
    score: m.scoreOld as number,
  }));

const sota = extractFrontierPoints(eligible as any);
console.log('SOTA count with scoreOld:', sota.length);
sota.forEach((s: any) => console.log(s.releaseDate, s.displayName, s.score));
