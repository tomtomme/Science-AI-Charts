import * as fs from 'fs';
import * as path from 'path';

const RAW_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR8QbYqPYx_PnohNVTT-hAU-NkOt9hVh-INeH_SJPwoYJpoRsBUGdmanYRZiz3ll1J0scf5U_vju3nG/pub?gid=170267419&single=true&output=csv';
const DIRECT_EXPORT_CSV_URL = 'https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/export?format=csv&gid=170267419';

async function fetchLiveCsv(): Promise<string> {
  console.log('Fetching live CSV from Google Sheets...');
  try {
    const res = await fetch(RAW_CSV_URL, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (res.ok) {
      const text = await res.text();
      if (text.length > 500) return text;
    }
  } catch (err) {
    console.warn('Failed to fetch from published CSV URL, trying direct export...', err);
  }

  const resDirect = await fetch(DIRECT_EXPORT_CSV_URL, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    },
  });
  if (!resDirect.ok) {
    throw new Error(`Direct CSV fetch failed with status: ${resDirect.status}`);
  }
  return await resDirect.text();
}

async function main() {
  const csvText = await fetchLiveCsv();
  console.log(`Fetched CSV successfully (${csvText.length} bytes).`);

  // 1. Update src/data/rawCsvFallback.ts
  const fbPath = path.resolve(process.cwd(), 'src/data/rawCsvFallback.ts');
  if (fs.existsSync(fbPath)) {
    const fbContent = fs.readFileSync(fbPath, 'utf8');
    const escaped = csvText.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const updated = fbContent.replace(/export const FALLBACK_CSV_CONTENT = `[\s\S]*?`;/, `export const FALLBACK_CSV_CONTENT = \`${escaped}\`;`);
    fs.writeFileSync(fbPath, updated, 'utf8');
    console.log('Updated src/data/rawCsvFallback.ts with latest CSV.');
  }

  console.log('Sheet & translation update complete!');
}

main().catch((err) => {
  console.error('Error running update script:', err);
  process.exit(1);
});
