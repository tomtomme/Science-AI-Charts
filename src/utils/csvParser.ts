import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { getCompanyMeta, getFaviconUrl } from '../data/companies';
import { ComponentBreakdown, ModelRecord, RawBenchmarkScores, ScoreMode, CsvNotesMetadata } from '../types';

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
  categoryNames?: string[];
}

/**
 * Extracts Title (combined A1 and B2), Subtitle (cell C1), and Category Names (cells D2 to K2) directly from CSV
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

  return {
    cellA1,
    cellB2,
    cellC1,
    combinedTitle,
    subtitle: cellC1,
    categoryNames: categoryNames.length === 8 ? categoryNames : undefined,
  };
}

/**
 * Extracts Section 1 (Cell A34 title & Cell C34 content) and Section 2 (Cell N34 title & Cell O34 content)
 * directly from CSV, ensuring full synchronization with user updates in Google Sheets.
 */
export function extractCsvNotesMetadata(csvText: string): CsvNotesMetadata {
  const rows = parseCsvRows(csvText);
  let notesRow: string[] | null = null;

  // 1. Scan for any row containing 'How to read' or 'How To Read' or 'Sources & Notes' or long text in col 2/14
  for (let i = 0; i < Math.min(120, rows.length); i++) {
    const r = rows[i] || [];
    const col0 = (r[0] || '').toLowerCase();
    const col1 = (r[1] || '').toLowerCase();
    const col2 = r[2] || '';
    if (
      col0.includes('how to read') ||
      col1.includes('how to read') ||
      col0.includes('sources & notes') ||
      col1.includes('sources & notes') ||
      (col2.length > 300 && (col0.length > 0 || (r[13] && r[13].length > 0)))
    ) {
      notesRow = r;
      break;
    }
  }

  // 2. Check row index 33 (Row 34 in 1-based indexing: Cell A34 / C34)
  if (!notesRow && rows.length > 33) {
    const cand = rows[33];
    if (cand && (cand[0] || cand[2])) {
      notesRow = cand;
    }
  }

  // 3. Fallback scan between row 20 and 100 for any row with long documentation text
  if (!notesRow) {
    for (let i = 20; i < Math.min(100, rows.length); i++) {
      const cand = rows[i];
      if (cand && cand[2] && cand[2].length > 200) {
        notesRow = cand;
        break;
      }
    }
  }

  const section1Title = (notesRow?.[0] || 'How To Read').trim();
  const section1Content = (notesRow?.[2] || '').trim();
  const section2Title = (notesRow?.[13] || "What Bots can & can't do for you").trim();
  const section2Content = (notesRow?.[14] || '').trim();

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

  // 3. Locate start of history table: Row 36 (index 35) or row after "History"
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
    };

    // Transformed benchmark values (0-100 scale)
    const tD = valD !== null ? Math.max(0, Math.min(100, valD)) : null;
    const tE = valE !== null ? Math.max(0, Math.min(100, valE)) : null;
    const tF = valF !== null ? Math.max(0, Math.min(100, valF / 2 + 50)) : null;
    const tG = valG !== null ? Math.max(0, Math.min(100, 1.4085 * (valG - 29))) : null;
    const tH = valH !== null ? Math.max(0, Math.min(100, valH)) : null;
    const tI = valI !== null ? Math.max(0, Math.min(100, valI)) : null;
    const tJ = valJ !== null ? Math.max(0, Math.min(100, 1.2 * (valJ - 16.6666))) : null;
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

    // When values in columns change in the CSV (e.g. Cols D, E, F, G, J for Old Score, or H & K for New/WorstCase),
    // the composite scores dynamically reflect the updated values:
    const finalScoreOld = scoreOldReported ?? scoreOldCalculated;
    const finalScoreNew = scoreNewReported ?? scoreNewCalculated;
    const finalScoreWorstCase = scoreWorstCaseReported ?? scoreWorstCaseCalculated;

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

    allModels.push({
      id: `${displayName}-${r}`,
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
      .filter((m) => (m.scoreNew !== null && m.scoreNew > 0) || (m.scoreNewReported !== null && m.scoreNewReported > 0))
      .map((m) => {
        const score = (m.scoreNew ?? m.scoreNewReported) as number;
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
