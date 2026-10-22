import * as fs from 'fs';
import { parseCsvRows, parseAllModels, parseModelDataset } from './src/utils/csvParser';

const csv = fs.readFileSync('live_sheet.csv', 'utf8');
const all = parseAllModels(csv);
const oldM = parseModelDataset(csv, 'old');
const newM = parseModelDataset(csv, 'new');
const worstM = parseModelDataset(csv, 'worstCase');

console.log('Total allModels:', all.length);
console.log('Total oldModels (Col L):', oldM.length);
console.log('Total newModels (Col M):', newM.length);
console.log('Total worstCaseModels (Col N):', worstM.length);
