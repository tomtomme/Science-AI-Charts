import { FALLBACK_CSV_CONTENT } from './src/data/rawCsvFallback';
import * as fs from 'fs';

const liveCsv = fs.readFileSync('live_sheet.csv', 'utf8');

function countRows(text: string) {
  return text.split('\n').length;
}

console.log('Fallback lines:', countRows(FALLBACK_CSV_CONTENT));
console.log('Live lines:', countRows(liveCsv));
