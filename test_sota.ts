import * as fs from 'fs';
import { parseAllModels } from './src/utils/csvParser';
import { extractFrontierPoints } from './src/utils/mathRegression';

const csv = fs.readFileSync('live_sheet.csv', 'utf8');
const allModels = parseAllModels(csv);

const eligible = allModels
  .filter((m) => {
    const sc = m.scoreOld ?? m.scoreNewReported;
    return typeof sc === 'number' && sc > 0;
  })
  .map((m) => ({
    id: m.id,
    name: m.name,
    displayName: m.displayName,
    releaseDate: m.releaseDate,
    timestamp: new Date(m.releaseDate).getTime(),
    score: (m.scoreOld ?? m.scoreNewReported) as number,
  }));

const sota = extractFrontierPoints(eligible as any);
console.log('Current SOTA count:', sota.length);
sota.forEach((s: any) => console.log(s.releaseDate, s.displayName, s.score));
