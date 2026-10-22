const fs = require('fs');
if (fs.existsSync('live_sheet.csv')) {
  const liveCsv = fs.readFileSync('live_sheet.csv', 'utf8');
  console.log('Live CSV length:', liveCsv.length);
  // Read rawCsvFallback.ts
  const fbPath = 'src/data/rawCsvFallback.ts';
  const fbContent = fs.readFileSync(fbPath, 'utf8');
  // Check how FALLBACK_CSV_CONTENT is declared
  const prefixMatch = fbContent.match(/export const FALLBACK_CSV_CONTENT = `([\s\S]*?)`;/);
  if (prefixMatch) {
    const updated = fbContent.replace(/export const FALLBACK_CSV_CONTENT = `[\s\S]*?`;/, 'export const FALLBACK_CSV_CONTENT = `' + liveCsv.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$') + '`;');
    fs.writeFileSync(fbPath, updated, 'utf8');
    console.log('Updated rawCsvFallback.ts with live CSV successfully!');
  } else {
    console.log('Regex did not match');
  }
} else {
  console.log('live_sheet.csv does not exist');
}
