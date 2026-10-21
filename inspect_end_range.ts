import * as fs from 'fs';

const csvText = fs.readFileSync('live_sheet.csv', 'utf8');

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (insideQuotes && next === '"') {
        currentVal += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (c === ',' && !insideQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((c === '\r' || c === '\n') && !insideQuotes) {
      if (c === '\r' && next === '\n') i++;
      currentRow.push(currentVal);
      rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += c;
    }
  }
  if (currentRow.length > 0 || currentVal) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }
  return rows;
}

const rows = parseCsvRows(csvText);

for (let r = 265; r < Math.min(290, rows.length); r++) {
  const row = rows[r];
  console.log(`Row ${r+1} (idx ${r}): B="${(row[1]||'').slice(0,20)}" | C="${(row[2]||'').slice(0,20)}" | S(col18)="${row[18]||''}" | L="${row[11]||''}" | M="${row[12]||''}"`);
}
