import * as fs from 'fs';
import * as path from 'path';
import { parseCsvRows, translateHeaderToDe, extractHeaderMetadata, extractCsvNotesMetadata } from '../src/utils/csvParser';

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

  // 2. Extract Title (cell A1) and Subtitle (cell C1)
  const headerMeta = extractHeaderMetadata(csvText);
  const rows = parseCsvRows(csvText);
  const cellA1 = (rows[0]?.[0] || '').trim();
  const cellC1 = (rows[0]?.[2] || '').trim();

  console.log(`Extracted Cell A1 (Title): "${cellA1}"`);
  console.log(`Extracted Cell C1 (Subtitle): "${cellC1}"`);

  const { titleDe, subtitleDe } = translateHeaderToDe(cellA1 || headerMeta.combinedTitle, cellC1 || headerMeta.subtitle);
  console.log(`Translated Title (DE): "${titleDe}"`);
  console.log(`Translated Subtitle (DE): "${subtitleDe}"`);

  // 3. Update src/utils/i18n.ts with translated title & subtitle
  const i18nPath = path.resolve(process.cwd(), 'src/utils/i18n.ts');
  if (fs.existsSync(i18nPath) && cellA1) {
    let i18nContent = fs.readFileSync(i18nPath, 'utf8');

    // Escape quotes for TS single-quoted string literals
    const safeTitleDe = titleDe.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeSubtitleDe = subtitleDe.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeTitleEn = cellA1.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeSubtitleEn = cellC1.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    // Update DE title & subtitle
    i18nContent = i18nContent.replace(
      /(\bde:\s*\{[\s\S]*?\btitle:\s*)'[^']*'/,
      `$1'${safeTitleDe}'`
    );
    i18nContent = i18nContent.replace(
      /(\bde:\s*\{[\s\S]*?\bsubtitle:\s*)'[^']*'/,
      `$1'${safeSubtitleDe}'`
    );

    // Update EN title & subtitle
    i18nContent = i18nContent.replace(
      /(\ben:\s*\{[\s\S]*?\btitle:\s*)'[^']*'/,
      `$1'${safeTitleEn}'`
    );
    if (safeSubtitleEn) {
      i18nContent = i18nContent.replace(
        /(\ben:\s*\{[\s\S]*?\bsubtitle:\s*)'[^']*'/,
        `$1'${safeSubtitleEn}'`
      );
    }

    fs.writeFileSync(i18nPath, i18nContent, 'utf8');
    console.log('Updated src/utils/i18n.ts with latest Title & Subtitle in EN and DE.');
  }

  // 4. Notes metadata check
  const notesMeta = extractCsvNotesMetadata(csvText);
  if (notesMeta.section1Content || notesMeta.section2Content) {
    console.log('Notes metadata verified from sheet:', {
      section1Title: notesMeta.section1Title,
      section1ContentLength: notesMeta.section1Content.length,
      section2Title: notesMeta.section2Title,
      section2ContentLength: notesMeta.section2Content.length,
    });
  }

  console.log('Weekly Sheet & translation update complete!');
}

main().catch((err) => {
  console.error('Error running update script:', err);
  process.exit(1);
});
