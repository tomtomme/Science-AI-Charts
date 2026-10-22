import * as fs from 'fs';
import { parseModelDataset, parseAllModels } from './src/utils/csvParser';

const csv = fs.readFileSync('live_sheet.csv', 'utf8');
const oldM = parseModelDataset(csv, 'old');
const paid = oldM.filter(m => m.isPaid);
const free = oldM.filter(m => !m.isPaid);
console.log('Old models total:', oldM.length);
console.log('Old models paid:', paid.length);
console.log('Old models free:', free.length);
