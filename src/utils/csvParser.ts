import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { getCompanyMeta, getFaviconUrl } from '../data/companies';
import { ComponentBreakdown, ModelRecord, RawBenchmarkScores, ScoreMode, CsvNotesMetadata, Row33Metadata } from '../types';

/**
 * Robust RFC-4180 CSV line parser handling quotes, embedded commas, and escaped quotes.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Extracts sheet date (e.g. "2026-10-11") from the first lines of the CSV.
 */
export function extractSheetDate(csvText: string): string | null {
  const rows = parseCsvRows(csvText.slice(0, 1500));
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    for (const cell of rows[r]) {
      const match = cell.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
  }
  return null;
}

export interface CsvHeaderMetadata {
  cellA1: string;
  cellB2: string;
  cellC1: string;
  combinedTitle: string;
  subtitle: string;
  titleDe?: string;
  subtitleDe?: string;
  categoryNames?: string[];
  row33?: Row33Metadata;
}

/**
 * Translates header title and subtitle dynamically from English to German
 */
export function translateHeaderToDe(titleEn: string, subtitleEn: string): { titleDe: string; subtitleDe: string } {
  let titleDe = titleEn;
  titleDe = titleDe.replace(/Science[\s-]+IQ\s+of\s+Chat[bB]ots/i, 'Wissenschafts-IQ von Chatbots');
  titleDe = titleDe.replace(/Science[\s-]+IQ\s+von\s+Chat[bB]ots/i, 'Wissenschafts-IQ von Chatbots');
  titleDe = titleDe.replace(/Science[\s-]+IQ/i, 'Wissenschafts-IQ');
  titleDe = titleDe.replace(/update to AA-Index version 5 in progress/i, 'Umstellung auf AA-Index Version 5 in Arbeit');
  titleDe = titleDe.replace(/update to AA-Index v5 in progress/i, 'Umstellung auf AA-Index v5 in Arbeit');
  titleDe = titleDe.replace(/\bupdate to\b/i, 'Umstellung auf');
  titleDe = titleDe.replace(/\bin progress\b/i, 'in Arbeit');

  let subtitleDe = subtitleEn;
  if (subtitleEn) {
    let s = subtitleEn;
    // Full replacement for the new long subtitle
    s = s.replace(
      /Unlike conventional tests that primarily measure text-based coding tasks or pure language skills,\s*this composite scoring focusses on capabilities important for science like factual accuracy \(non-hallucination\),\s*data analysis,\s*plot-reading,\s*and automated multi-step workflows like diagnostic\.\s*To counter potential dependencies of test-suite developers on major AI companies,\s*benchmarks from at least 3 different providers are included\.\s*The 3 final composite scores \(old, new, worst case\) are simple averages,\s*with some sub-scores adjusted for guessing probability\.\s*More details below\./i,
      'Im Gegensatz zu herkömmlichen Tests, die primär textbasierte Programmieraufgaben oder reine Sprachfähigkeiten messen, konzentriert sich dieser Gesamt-Score auf wissenschaftlich relevante Fähigkeiten wie faktische Genauigkeit (Non-Hallucination), Datenanalyse, Diagrammverständnis und automatisierte mehrstufige Workflows wie Diagnostik. Um möglichen Abhängigkeiten von Testsuite-Entwicklern zu großen KI-Unternehmen entgegenzuwirken, werden Benchmarks von mindestens 3 verschiedenen Anbietern einbezogen. Die 3 finalen Gesamt-Scores (Alt, Neu, Worst-Case) sind einfache Durchschnitte, wobei einige Teilwerte an die Ratewahrscheinlichkeit angepasst wurden. Weitere Details unten.'
    );
    // Legacy subtitle replacement
    s = s.replace(/The scoring focusses on factual accuracy \(non-hallucination\), scientific expertise, and data analysis skills instead of coding\./i, 'Die Bewertung konzentriert sich auf faktische Genauigkeit (Non-Hallucination), wissenschaftliche Expertise und Datenanalysefähigkeiten statt Coding.');
    s = s.replace(/The bots completed tests from ArtificialAnalysis\.ai, Simple-Bench\.com, and Vals\.ai\./i, 'Die Bots absolvierten Tests von ArtificialAnalysis.ai, Simple-Bench.com und Vals.ai.');
    // Component phrases for robustness
    s = s.replace(/Unlike conventional tests that primarily measure text-based coding tasks or pure language skills/i, 'Im Gegensatz zu herkömmlichen Tests, die primär textbasierte Programmieraufgaben oder reine Sprachfähigkeiten messen');
    s = s.replace(/this composite scoring focusses on capabilities important for science/i, 'konzentriert sich dieser Gesamt-Score auf wissenschaftlich relevante Fähigkeiten');
    s = s.replace(/like factual accuracy \(non-hallucination\), data analysis, plot-reading, and automated multi-step workflows like diagnostic/i, 'wie faktische Genauigkeit (Non-Hallucination), Datenanalyse, Diagrammverständnis und automatisierte mehrstufige Workflows wie Diagnostik');
    s = s.replace(/To counter potential dependencies of test-suite developers on major AI companies/i, 'Um möglichen Abhängigkeiten von Testsuite-Entwicklern zu großen KI-Unternehmen entgegenzuwirken');
    s = s.replace(/benchmarks from at least 3 different providers are included/i, 'werden Benchmarks von mindestens 3 verschiedenen Anbietern einbezogen');
    s = s.replace(/The 3 final composite scores \(old, new, worst case\) are simple averages/i, 'Die 3 finalen Gesamt-Scores (Alt, Neu, Worst-Case) sind einfache Durchschnitte');
    s = s.replace(/3 different benchmark providers/i, '3 verschiedenen Benchmark-Anbietern');
    s = s.replace(/from 3 different benchmark providers/i, 'von 3 verschiedenen Benchmark-Anbietern');
    s = s.replace(/Final scores are averages, with some sub-scores adjusted for guessing probability/i, 'Final Scores sind Durchschnitte, wobei einige Teilwerte an die Ratewahrscheinlichkeit angepasst wurden');
    s = s.replace(/The scoring focusses on/i, 'Die Bewertung konzentriert sich auf');
    s = s.replace(/factual accuracy/i, 'faktische Genauigkeit');
    s = s.replace(/scientific expertise/i, 'wissenschaftliche Expertise');
    s = s.replace(/and data analysis skills instead of coding/i, 'und Datenanalysefähigkeiten statt Coding');
    s = s.replace(/The bots completed tests from/i, 'Die Bots absolvierten Tests von');
    s = s.replace(/Final scores are averages/i, 'Final Scores sind Durchschnitte');
    s = s.replace(/with some sub-scores adjusted for guessing probability/i, 'wobei einige Teilwerte an die Ratewahrscheinlichkeit angepasst wurden');
    s = s.replace(/More details below\./i, 'Weitere Details unten.');
    subtitleDe = s;
  }

  return { titleDe, subtitleDe };
}

/**
 * Extracts Row 33 synced text and source URLs from the CSV.
 * Row 33 in the Google Sheet contains the benchmark acronyms/subtitles and sources.
 */
export function extractRow33Metadata(rows: string[][]): Row33Metadata {
  let targetRow: string[] | null = null;

  for (let r = 0; r < Math.min(60, rows.length); r++) {
    const row = rows[r];
    if (!row) continue;
    const col1 = (row[1] || '').toLowerCase();
    const col2 = (row[2] || '').toLowerCase();
    if (
      col2.includes('sources & notes') ||
      (col1.includes('current') && col1.includes('history')) ||
      (r === 32 && row.length > 10)
    ) {
      targetRow = row;
      break;
    }
  }

  const getCell = (colIdx: number, fallback: string) => {
    if (!targetRow || !targetRow[colIdx]) return fallback;
    const text = targetRow[colIdx].trim();
    return text || fallback;
  };

  const resolveUrl = (text: string, defaultUrl: string) => {
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.includes('semianalysis.com') || trimmed.includes('gdpx')) return 'https://gdpx.semianalysis.com';
    if (trimmed.includes('simplebench.com') || trimmed.includes('simple-bench')) return 'https://epoch.ai/benchmarks/simplebench?view=graph&tab=leaderboard';
    if (trimmed.includes('vals.ai')) return 'https://www.vals.ai';
    if (trimmed.includes('artificialanalysis.ai')) return 'https://artificialanalysis.ai';
    if (trimmed.includes('mmmu')) return 'https://artificialanalysis.ai/evaluations/mmmu-pro';
    return defaultUrl;
  };

  const moreSourcesText = targetRow?.[14]?.trim() || '';
  const urlMatches = moreSourcesText.match(/https?:\/\/[^\s]+/g) || [];

  const colD = getCell(3, 'AA-Int-Index in % v5');
  const colE = getCell(4, 'Non-Hallu-Rate v1.1 in %');
  const colF = getCell(5, 'Accuracy v1.1 in %');
  const colG = getCell(6, 'MMMU-Pro in %');
  const colH = getCell(7, 'MLCR-AA in %');
  const colI = getCell(8, 'ExcelAgent in %');
  const colJ = getCell(9, 'gdpx.semianalysis.com');
  const colK = getCell(10, 'Vals Econ Index 2.2 in %');

  const colL = getCell(11, 'historic persp.');
  const colM = getCell(12, 'if hallus are a small problem');
  const colN = getCell(13, 'times non hallu-rate');

  const colU = getCell(20, 'AA-Int-Index in % v4.3');
  const colV = getCell(21, 'Non-Hallu-Rate v1 in %');
  const colW = getCell(22, 'Omniscience v1 in PTS');
  const colX = getCell(23, 'simple-bench in %');

  return {
    scoreNewColM: {
      text: colM,
      sourceUrl: '#final-scores-section',
    },
    scoreOldColL: {
      text: colL,
      sourceUrl: '#final-scores-section',
    },
    scoreWorstCaseColN: {
      text: colN,
      sourceUrl: '#final-scores-section',
    },
    benchmarks: {
      actCodeReason: {
        text: colD,
        sourceUrl: resolveUrl(colD, 'https://artificialanalysis.ai/methodology/intelligence-benchmarking'),
      },
      nonHallucination: {
        text: colE,
        sourceUrl: resolveUrl(colE, 'https://artificialanalysis.ai/evaluations/omniscience#aa-omniscience-hallucination-rate'),
      },
      scienceKnowledge: {
        text: colF,
        sourceUrl: resolveUrl(colF, 'https://artificialanalysis.ai/evaluations/omniscience'),
      },
      visionPlot: {
        text: colG,
        sourceUrl: resolveUrl(colG, 'https://artificialanalysis.ai/evaluations/mmmu-pro'),
      },
      medReasoning: {
        text: colH,
        sourceUrl: resolveUrl(colH, 'https://artificialanalysis.ai/evaluations/mlcr-aa'),
      },
      excelAgent: {
        text: colI,
        sourceUrl: resolveUrl(colI, 'https://artificialanalysis.ai/evaluations/aa-analyst-agent'),
      },
      trickQuestions: {
        text: colJ,
        sourceUrl: resolveUrl(colJ, 'https://gdpx.semianalysis.com'),
      },
      econLegal: {
        text: colK,
        sourceUrl: resolveUrl(colK, 'https://www.vals.ai'),
      },
    },
    retiredBenchmarks: {
      iqOld: {
        text: colU,
        sourceUrl: resolveUrl(colU, 'https://artificialanalysis.ai/methodology/intelligence-benchmarking'),
      },
      nonHalluOld: {
        text: colV,
        sourceUrl: resolveUrl(colV, 'https://artificialanalysis.ai/evaluations/omniscience#aa-omniscience-hallucination-rate'),
      },
      scienceKnowledgeOld: {
        text: colW,
        sourceUrl: resolveUrl(colW, 'https://artificialanalysis.ai/evaluations/omniscience'),
      },
      trickQuestionsOld: {
        text: colX,
        sourceUrl: resolveUrl(colX, 'https://epoch.ai/benchmarks/simplebench?view=graph&tab=leaderboard'),
      },
    },
    moreSourcesText,
    moreSourcesUrls: urlMatches,
  };
}

/**
 * Extracts Title (combined A1 and B2), Subtitle (cell C1), Category Names (cells D2 to K2),
 * and Row 33 synced benchmark metadata directly from CSV.
 */
export function extractHeaderMetadata(csvText: string): CsvHeaderMetadata {
  const rows = parseCsvRows(csvText);
  const cellA1 = (rows[0]?.[0] || 'Science-IQ of ChatBots').trim();
  const rawB2 = (rows[1]?.[1] || '').trim();
  const cellB2 = rawB2
    .replace(/[\r\n]+/g, ' ')
    .replace(/\|\s*\|+/g, '|')
    .replace(/\s+/g, ' ')
    .trim();
  const cellC1 = (rows[0]?.[2] || '').trim();
  // Title is strictly cell A1 (cell B2 is excluded as requested)
  const combinedTitle = cellA1;

  // Extract category names from row 1, cols 3 to 10 (cells D2 to K2)
  const categoryNames: string[] = [];
  const row1 = rows[1] || [];
  for (let c = 3; c <= 10; c++) {
    const raw = (row1[c] || '').replace(/\s+/g, ' ').trim();
    if (raw) {
      categoryNames.push(raw);
    }
  }

  const { titleDe, subtitleDe } = translateHeaderToDe(combinedTitle, cellC1);
  const row33 = extractRow33Metadata(rows);

  return {
    cellA1,
    cellB2,
    cellC1,
    combinedTitle,
    subtitle: cellC1,
    titleDe,
    subtitleDe,
    categoryNames: categoryNames.length === 8 ? categoryNames : undefined,
    row33,
  };
}

/**
 * Extracts Section 1 (Cell A34 title & Cell C34 content) and Section 2 (Cell N34 title & Cell O34 content)
 * directly from CSV, ensuring full synchronization with user updates in Google Sheets.
 */
export function extractCsvNotesMetadata(csvText: string): CsvNotesMetadata {
  const rows = parseCsvRows(csvText);
  let notesRow: string[] | null = null;

  // 1. Direct check at Row 34 (row index 33 in 0-based indexing)
  if (rows.length > 33) {
    const cand = rows[33];
    if (cand && cand[2] && cand[2].length > 500) {
      notesRow = cand;
    }
  }

  // 2. Scan rows from index 10 onward (skipping header rows 0-9 to avoid picking cell C1 subtitle)
  if (!notesRow) {
    for (let i = 10; i < Math.min(120, rows.length); i++) {
      const r = rows[i] || [];
      const col0 = (r[0] || '').toLowerCase();
      const col1 = (r[1] || '').toLowerCase();
      const col2 = r[2] || '';
      const col13 = (r[13] || '').toLowerCase();
      if (
        col0.includes('how to read') ||
        col1.includes('how to read') ||
        col0.includes('sources & notes') ||
        col1.includes('sources & notes') ||
        col13.includes('what bot') ||
        (col2.length > 500 && (col0.length > 0 || (r[13] && r[13].length > 0)))
      ) {
        notesRow = r;
        break;
      }
    }
  }

  // 3. Fallback scan between row 20 and 100 for any row with long documentation text
  if (!notesRow) {
    for (let i = 20; i < Math.min(100, rows.length); i++) {
      const cand = rows[i];
      if (cand && cand[2] && cand[2].length > 300) {
        notesRow = cand;
        break;
      }
    }
  }

  let section1Title = (notesRow?.[0] || notesRow?.[1] || 'How To Read').trim();
  let section1Content = (notesRow?.[2] || '').trim();
  if (!section1Content && notesRow?.[1] && notesRow[1].length > 100) {
    section1Content = notesRow[1].trim();
  }

  let section2Title = (notesRow?.[13] || "What Bots can & can't do for you").trim();
  let section2Content = (notesRow?.[14] || '').trim();

  // If section 2 content is empty at col 14 (O), scan adjacent columns in notesRow for long text
  if (notesRow && section2Content.length < 50) {
    for (let c = 12; c < Math.min(notesRow.length, 20); c++) {
      if (notesRow[c] && notesRow[c].length > 150) {
        section2Content = notesRow[c].trim();
        if (c > 0 && notesRow[c - 1] && notesRow[c - 1].length < 80) {
          section2Title = notesRow[c - 1].trim();
        }
        break;
      }
    }
  }

  return {
    section1Title: section1Title || 'How To Read',
    section1Content,
    section2Title: section2Title || "What Bots can & can't do for you",
    section2Content,
  };
}

/**
 * Parse numeric string safely, supporting European commas like "81,6" or "-40"
 */
function parseNum(val: string | undefined): number | null {
  if (!val) return null;
  const clean = val.trim().replace(',', '.').replace(/%/g, '');
  if (clean === '' || clean === '-' || clean.toLowerCase() === 'max' || clean.toLowerCase() === 'min') {
    return null;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Extracts flag emoji from text if present
 */
function extractFlag(text: string): { flag: string; cleanText: string } {
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/;
  const match = text.match(flagRegex);
  if (match) {
    return {
      flag: match[0],
      cleanText: text.replace(flagRegex, '').trim()
    };
  }
  return { flag: '', cleanText: text.trim() };
}

/**
 * Parses raw CSV into structured model records.
 * Supports distinct score modes:
 * - 'new': strictly models with Col M ("NEW Score").
 * - 'old': strictly models with Col L ("OLD Score").
 * - 'worstCase': strictly models with Col N ("Worst Case Score").
 */
/**
 * Parses all LLM model records by scanning from Row 36 down to where Column S ends.
 * - Collects the 29 current bots from rows 2-31 to identify active chatbots.
 * - Scans from row 36 (index 35) downwards, dynamically expanding as new LLMs are added.
 * - Stops at summary / notes rows (Sources & Notes, min, mean, median, max, count).
 * - Treats empty cells as missing (null) rather than zero.
 */
export function parseAllModels(csvText: string): ModelRecord[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 3) return [];

  // 1. Current bot names from top table (rows 2 to 31)
  const currentBotNames = new Set<string>();
  for (let r = 1; r < Math.min(32, rows.length); r++) {
    const row = rows[r];
    if (!row) continue;
    const s = (row[18] || '').trim().toLowerCase();
    const b = (row[1] || '').trim().toLowerCase();
    if (s) currentBotNames.add(s);
    if (b) currentBotNames.add(b);
  }

  // 2. Parse dynamic company lookup table from Column AJ (index 35) onwards
  const companyLookupMap: Record<string, { name: string; domain: string; color: string; flag: string }> = {};
  for (let r = 180; r < rows.length; r++) {
    const row = rows[r];
    if (row && row.length > 35 && row[35]) {
      const comp = row[35].trim();
      if (!comp || comp.toLowerCase().includes('lookup') || comp.toLowerCase() === 'company') continue;
      const domain = (row[36] || '').trim();
      const color = (row[37] || '').trim();
      const flag = (row[38] || '').trim();
      if (flag || domain) {
        companyLookupMap[comp.toLowerCase()] = { name: comp, domain, color, flag };
      }
    }
  }

  // 3. Pre-collect Column T (index 19: model costs in Euro) and Column AL (index 37: notes) by displayName & cleaned name
  const colPriceMap = new Map<string, string>();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const valT = (row[19] || '').trim();
    const valAL = (row[37] || '').trim();
    const isHeaderT = valT.toLowerCase().includes('abokosten') || valT.toLowerCase().includes('creator') || valT.toLowerCase().includes('release');
    const val = (valT && !isHeaderT)
      ? valT
      : (valAL && !valAL.toLowerCase().includes('abokosten'))
        ? valAL
        : '';
    if (val) {
      const s = (row[18] || '').trim().toLowerCase();
      const b = (row[1] || '').trim().toLowerCase();
      const { cleanText: cleanB } = extractFlag(b);
      if (s) colPriceMap.set(s, val);
      if (cleanB) colPriceMap.set(cleanB.toLowerCase(), val);
    }
  }

  // 4. Locate start of history table: Row 36 (index 35) or row after "History"
  let startIndex = 35; // Row 36 in 1-based indexing
  for (let r = 0; r < Math.min(45, rows.length); r++) {
    const b = (rows[r]?.[1] || '').trim().toLowerCase();
    const c = (rows[r]?.[2] || '').trim().toLowerCase();
    if (b === 'history' || c.includes('full timeline')) {
      startIndex = r + 1;
      break;
    }
  }

  const allModels: ModelRecord[] = [];

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 5) continue;

    const rawNameCell = (row[1] || '').trim();
    const rawCreatorCell = (row[2] || '').trim();
    const colS = (row[18] || '').trim();

    // Termination: when hitting summary rows, min/mean/median/max/count, or notes
    if (
      rawNameCell.includes('Sources & Notes') ||
      rawCreatorCell.includes('Sources & Notes') ||
      rawCreatorCell === 'min' ||
      rawCreatorCell === 'mean' ||
      rawCreatorCell === 'median' ||
      rawCreatorCell === 'max' ||
      rawCreatorCell.startsWith('count') ||
      rawNameCell === 'min' ||
      rawNameCell === 'mean' ||
      rawNameCell === 'median' ||
      rawNameCell === 'max' ||
      rawNameCell.startsWith('count')
    ) {
      break;
    }

    // Skip section placeholders / rumors where Column S is empty
    if (!colS || rawNameCell.toLowerCase().includes('expectations') || rawNameCell.toLowerCase().includes('rumors')) {
      continue;
    }

    // Extract Flag and Name
    const { flag: nameFlag, cleanText: cleanedName } = extractFlag(rawNameCell);
    const { flag: creatorFlag, cleanText: cleanedCreator } = extractFlag(rawCreatorCell);

    // Lookup flag from CSV lookup table (cell AJ:232 onwards)
    let lookupFlag = '';
    const creatorLow = cleanedCreator.toLowerCase();
    for (const [key, info] of Object.entries(companyLookupMap)) {
      if (info.flag && (creatorLow.includes(key) || key.includes(creatorLow))) {
        lookupFlag = info.flag;
        break;
      }
    }

    const company = getCompanyMeta(cleanedCreator);
    const flag = nameFlag || creatorFlag || lookupFlag || company.flag || '🌐';

    // Model badges
    const isPaid = rawNameCell.includes('💲');
    const isFreeApi = rawNameCell.includes('🌐');
    const isNew =
      rawNameCell.includes('🆕') ||
      rawNameCell.includes('✦') ||
      rawNameCell.includes('✧') ||
      rawNameCell.includes('★') ||
      rawNameCell.includes('⭐') ||
      /\bNEW\b/i.test(rawNameCell);

    // Canonical display name from Column S
    const displayName = colS;

    // Parse Benchmark Columns (D through K) - Empty cells remain null (missing)
    const valD = parseNum(row[3]);
    const valE = parseNum(row[4]);
    const valF = parseNum(row[5]);
    const valG = parseNum(row[6]);
    const valH = parseNum(row[7]);
    const valI = parseNum(row[8]);
    const valJ = parseNum(row[9]);
    const valK = parseNum(row[10]);

    // Parse Retired Benchmark Columns (U through X: IQ_old, Non-Hallu-Rate_old, Science Knowledge_old, Trick Questions_old)
    const valU = parseNum(row[20]); // Col U
    const valV = parseNum(row[21]); // Col V
    const valW = parseNum(row[22]); // Col W
    const valX = parseNum(row[23]); // Col X

    // Benchmark raw scores
    const rawScores: RawBenchmarkScores = {
      actCodeReason: valD,
      nonHallucination: valE,
      scienceKnowledge: valF,
      visionPlot: valG,
      medReasoning: valH,
      excelAgent: valI,
      trickQuestions: valJ,
      econLegal: valK,
      iqOld: valU,
      nonHalluOld: valV,
      scienceKnowledgeOld: valW,
      trickQuestionsOld: valX,
    };

    // Transformed benchmark values (0-100 scale)
    const tD = valD !== null ? Math.max(0, Math.min(100, valD)) : null;
    const tE = valE !== null ? Math.max(0, Math.min(100, valE)) : null;
    const tF = valF !== null ? Math.max(0, Math.min(100, valF)) : null;
    const tG = valG !== null ? Math.max(0, Math.min(100, 1.4085 * (valG - 29))) : null;
    const tH = valH !== null ? Math.max(0, Math.min(100, valH)) : null;
    const tI = valI !== null ? Math.max(0, Math.min(100, valI)) : null;
    const tJ = valJ !== null ? Math.max(0, Math.min(100, valJ)) : null;
    const tK = valK !== null ? Math.max(0, Math.min(100, valK)) : null;

    const hasAll8 =
      tD !== null && tE !== null && tF !== null && tG !== null &&
      tH !== null && tI !== null && tJ !== null && tK !== null;

    const hasAll5Old =
      tD !== null && tE !== null && tF !== null && tG !== null && tJ !== null;

    // Dynamically calculate OLD score from 5 benchmarks (averaging Col D, E, F, G, J)
    const scoreOldCalculated = hasAll5Old
      ? Math.round((tD! + tE! + tF! + tG! + tJ!) / 5)
      : null;

    // Dynamically calculate NEW score from all 8 benchmarks (averaging all 8 benchmarks)
    const scoreNewCalculated = hasAll8
      ? Math.round((tD! + tE! + tF! + tG! + tH! + tI! + tJ! + tK!) / 8)
      : null;

    // Dynamically calculate Worst Case score (7-benchmark average multiplied by non-hallucination rate)
    const scoreWorstCaseCalculated = hasAll8
      ? Math.round((((tD! + tF! + tG! + tH! + tI! + tJ! + tK!) / 7) * tE!) / 100)
      : null;

    const scoreOldReported = parseNum(row[11]);         // Col L
    const scoreNewReported = parseNum(row[12]); // Col M
    const scoreWorstCaseReported = parseNum(row[13]);   // Col N

    // When score cells in the CSV are emptied (e.g. updating AA-Intelligence-Index to v5),
    // empty cells must strictly remain empty / null rather than falling back to synthetic calculations:
    const finalScoreOld = scoreOldReported;
    const finalScoreNew = scoreNewReported;
    const finalScoreWorstCase = scoreWorstCaseReported;

    const activeScore = finalScoreNew ?? finalScoreOld ?? finalScoreWorstCase ?? 0;
    const activeMode: ScoreMode = finalScoreNew !== null ? 'new' : finalScoreOld !== null ? 'old' : 'worstCase';

    const breakdown = createModelBreakdown(rawScores, activeScore, activeMode);

    const storyline = (row[14] || '').trim();
    const chatLinkRaw = (row[15] || '').trim();
    const apiLinkRaw = (row[16] || '').trim();

    // Helper to extract first valid http URL from a cell string
    const extractHttpUrl = (str: string): string | undefined => {
      if (!str) return undefined;
      const match = str.match(/https?:\/\/[^\s,]+/);
      return match ? match[0].trim() : undefined;
    };

    const parsedChatLink = extractHttpUrl(chatLinkRaw);
    const parsedApiLink = extractHttpUrl(apiLinkRaw);
    const modelUrl = parsedChatLink || parsedApiLink;

    const faviconUrl = getFaviconUrl(company.domain);

    // Release date from Column Y (index 24) with robust fallback
    const rawReleaseDate = (row[24] || '').trim();
    let releaseDate = rawReleaseDate;
    if (!releaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
      const combined = `${rawCreatorCell} ${rawNameCell}`;
      const m = combined.match(/(Jan|Feb|Mär|Mar|Apr|Mai|May|Jun|Jul|Aug|Sep|Sept|Okt|Oct|Nov|Dez|Dec)\s*(\d{2})/i);
      if (m) {
        const monthMap: Record<string, string> = {
          jan: '01', feb: '02', mär: '03', mar: '03', apr: '04', mai: '05', may: '05',
          jun: '06', jul: '07', aug: '08', sep: '09', sept: '09', okt: '10', oct: '10',
          nov: '11', dez: '12', dec: '12'
        };
        const month = monthMap[m[1].toLowerCase()] || '01';
        const year = '20' + m[2];
        releaseDate = `${year}-${month}-01`;
      } else {
        releaseDate = '2024-01-01';
      }
    }

    const chatLinkLow = chatLinkRaw.toLowerCase();
    const isSupersededOrDiscontinued =
      chatLinkLow.includes('better') ||
      chatLinkLow.includes('discontinued') ||
      chatLinkRaw === '';

    const isAvailable =
      currentBotNames.has(colS.toLowerCase()) ||
      currentBotNames.has(cleanedName.toLowerCase()) ||
      (!isSupersededOrDiscontinued && (chatLinkLow.startsWith('http') || chatLinkLow.includes('paid') || chatLinkLow.includes('api') || !!parsedApiLink));

    const rawColT = (row[19] || '').trim();
    const rawColAL = (row[37] || '').trim();
    const isHeaderT = rawColT.toLowerCase().includes('abokosten') || rawColT.toLowerCase().includes('creator') || rawColT.toLowerCase().includes('release');
    const priceDeMonthly = (rawColT && !isHeaderT)
      ? rawColT
      : (rawColAL && !rawColAL.toLowerCase().includes('abokosten'))
        ? rawColAL
        : colPriceMap.get(displayName.toLowerCase()) || colPriceMap.get(cleanedName.toLowerCase()) || undefined;

    allModels.push({
      id: `model-${r}-${displayName.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      rank: 0,
      flag,
      name: rawNameCell,
      displayName,
      isPaid,
      isFreeApi,
      isNew,
      creator: rawCreatorCell,
      creatorClean: cleanedCreator,
      companyName: company.name,
      releaseDate,
      releaseText: cleanedCreator,
      rawScores,
      hasAll8Benchmarks: hasAll8,
      hasAll5OldBenchmarks: hasAll5Old,
      breakdown,
      score: activeScore,
      scoreOld: finalScoreOld,
      scoreOldReported,
      scoreOldCalculated,
      scoreNew: finalScoreNew,
      scoreNewCalculated: scoreNewCalculated ?? activeScore,
      scoreNewReported,
      scoreWorstCase: finalScoreWorstCase,
      scoreWorstCaseReported,
      scoreWorstCaseCalculated,
      storyline,
      chatLink: parsedChatLink,
      apiLink: parsedApiLink,
      modelUrl,
      isAvailable,
      companyDomain: company.domain,
      companyColor: company.color,
      faviconUrl,
      priceDeMonthly: priceDeMonthly || undefined,
    });
  }

  return allModels;
}

/**
 * Calculates the 8-component segment breakdown strictly tailored to the selected score mode:
 * - 'new': strictly proportional to all 8 benchmarks (Col D through K, 12.5% each), normalized to targetScore.
 * - 'worstCase': strictly proportional to all 8 benchmarks scaled down to match the conservative Worst Case score.
 * - 'old': strictly proportional to the 5 benchmarks of the old score (Col D, E, F, G, J), normalized to targetScore.
 */
export function createModelBreakdown(
  rawScores: RawBenchmarkScores,
  targetScore: number,
  mode: ScoreMode = 'new'
): ComponentBreakdown[] {
  if (mode === 'old') {
    const oldKeys = ['actCodeReason', 'nonHallucination', 'scienceKnowledge', 'visionPlot', 'trickQuestions'];
    const oldComponents = BENCHMARK_COMPONENTS.filter((comp) => oldKeys.includes(comp.id));

    const rawContributions = oldComponents.map((comp) => {
      const raw = rawScores[comp.key] ?? 0;
      const transformed = comp.transform(raw);
      const pts = transformed / 5;
      return { comp, raw, transformed, pts };
    });

    const sumTransformed = rawContributions.reduce((acc, c) => acc + c.pts, 0);
    const effectiveScore = targetScore > 0 ? targetScore : Math.round(sumTransformed);
    const normFactor = sumTransformed > 0 && effectiveScore > 0 ? effectiveScore / sumTransformed : 1;

    return rawContributions.map(({ comp, raw, transformed, pts }) => {
      const normalizedContribution = parseFloat((pts * normFactor).toFixed(2));
      return {
        id: comp.id,
        name: comp.nameDe,
        color: comp.color,
        rawValue: raw,
        transformedValue: transformed,
        pointsContribution: normalizedContribution,
        percentageOfTotal: effectiveScore > 0 ? parseFloat(((normalizedContribution / effectiveScore) * 100).toFixed(1)) : 0,
      };
    });
  }

  // mode === 'new' or 'worstCase'
  // When values in columns H (Diagnostics) or K (Vals.ai) change in the CSV,
  // each segment is recalculated proportionally from its raw value and scaled to targetScore.
  const rawContributions = BENCHMARK_COMPONENTS.map((comp) => {
    const raw = rawScores[comp.key] ?? 0;
    const transformed = comp.transform(raw);
    const pts = transformed / 8;
    return { comp, raw, transformed, pts };
  });

  const sumTransformed = rawContributions.reduce((acc, c) => acc + c.pts, 0);
  const normFactor = sumTransformed > 0 && targetScore > 0 ? targetScore / sumTransformed : 1;

  return rawContributions.map(({ comp, raw, transformed, pts }) => {
    const normalizedContribution = parseFloat((pts * normFactor).toFixed(2));
    return {
      id: comp.id,
      name: comp.nameDe,
      color: comp.color,
      rawValue: raw,
      transformedValue: transformed,
      pointsContribution: normalizedContribution,
      percentageOfTotal: targetScore > 0 ? parseFloat(((normalizedContribution / targetScore) * 100).toFixed(1)) : 0,
    };
  });
}

/**
 * Parses models filtered and ranked by specific score mode:
 * - 'new': strictly models with Col M ("NEW Score"), recalculating segment breakdown to match target score
 * - 'old': strictly models with Col L ("OLD Score"), recalculating segment breakdown to match target score
 * - 'worstCase': strictly models with Col N ("Worst Case Score"), recalculating segment breakdown to match target score
 */
export function parseModelDataset(csvText: string, mode: ScoreMode = 'new'): ModelRecord[] {
  const all = parseAllModels(csvText);

  let filtered: ModelRecord[] = [];
  if (mode === 'old') {
    filtered = all
      .filter((m) => m.scoreOld !== null && m.scoreOld > 0)
      .map((m) => {
        const score = m.scoreOld as number;
        return {
          ...m,
          score,
          scoreNewCalculated: score,
          breakdown: createModelBreakdown(m.rawScores, score, 'old'),
        };
      });
  } else if (mode === 'worstCase') {
    filtered = all
      .filter((m) => m.scoreWorstCase !== null && m.scoreWorstCase > 0)
      .map((m) => {
        const score = m.scoreWorstCase as number;
        return {
          ...m,
          score,
          scoreNewCalculated: score,
          breakdown: createModelBreakdown(m.rawScores, score, 'worstCase'),
        };
      });
  } else {
    filtered = all
      .filter((m) => m.scoreNew !== null && m.scoreNew > 0)
      .map((m) => {
        const score = m.scoreNew as number;
        return {
          ...m,
          score,
          scoreNewCalculated: score,
          breakdown: createModelBreakdown(m.rawScores, score, 'new'),
        };
      });
  }

  // Sort descending by target score
  filtered.sort((a, b) => b.score - a.score);

  // Assign sequential ranks 1..N
  filtered.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  return filtered;
}
