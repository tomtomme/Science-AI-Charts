import * as fs from 'fs';
import { parseAllModels } from './src/utils/csvParser';
import { BENCHMARK_COMPONENTS } from './src/data/benchmarks';

const csv = fs.readFileSync('live_sheet.csv', 'utf8');
const all = parseAllModels(csv);

BENCHMARK_COMPONENTS.forEach((c, idx) => {
  const count = all.filter(m => m.rawScores[c.key] !== null).length;
  console.log(`Cat #${idx + 1} (${c.nameDe}): ${count} models`);
});
