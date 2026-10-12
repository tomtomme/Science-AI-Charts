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
}

/**
 * Extracts Title (combined A1 and B2) and Subtitle (cell C1) directly from CSV
 */
export function extractHeaderMetadata(csvText: string): CsvHeaderMetadata {
  const rows = parseCsvRows(csvText.slice(0, 2000));
  const cellA1 = (rows[0]?.[0] || 'Chatbots with Image-Input for Science').trim();
  const rawB2 = (rows[1]?.[1] || 'Paid Chat💲\nFree Chat+API 🌐').trim();
  const cellB2 = rawB2.replace(/[\r\n]+/g, ' | ').replace(/\s+/g, ' ');
  const cellC1 = (rows[0]?.[2] || 'How To Read: Scroll down').trim();
  const combinedTitle = cellA1 && cellB2 ? `${cellA1} | ${cellB2}` : cellA1 || cellB2;
  return {
    cellA1,
    cellB2,
    cellC1,
    combinedTitle,
    subtitle: cellC1,
  };
}

/**
 * Extracts Section 1 (Cell A34 title & Cell C34 content) and Section 2 (Cell N34 title & Cell O34 content)
 * directly from CSV, ensuring full synchronization with user updates in Google Sheets.
 */
export function extractCsvNotesMetadata(csvText: string): CsvNotesMetadata {
  const rows = parseCsvRows(csvText);
  let notesRow: string[] | null = null;

  // 1. Check row immediately following "Sources & Notes"
  for (let i = 0; i < Math.min(100, rows.length); i++) {
    const rowStr = (rows[i] || []).join(' ');
    if (rowStr.includes('Sources & Notes')) {
      if (i + 1 < rows.length && rows[i + 1] && (rows[i + 1][0] || rows[i + 1][2])) {
        notesRow = rows[i + 1];
        break;
      }
    }
  }

  // 2. Check row index 33 (Row 34 in 1-based indexing: Cell A34 / C34)
  if (!notesRow && rows.length > 33) {
    const cand = rows[33];
    if (cand && (cand[0] || cand[2])) {
      notesRow = cand;
    }
  }

  // 3. Fallback scan between row 25 and 80 for any row with long documentation text
  if (!notesRow) {
    for (let i = 20; i < Math.min(80, rows.length); i++) {
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
 */
export function parseModelDataset(csvText: string, mode: ScoreMode = 'new'): ModelRecord[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 3) return [];

  const isOld = mode === 'old';

  // Find header row containing "10 Evals" or "Act Code" or "Creator | Release"
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const rowStr = rows[r].join(' ');
    if (rowStr.includes('10 Evals') || rowStr.includes('Non-Hallucination') || rowStr.includes('Creator | Release')) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 1;
  }

  // Find timeline row index before parsing models
  let timelineRowIndex = -1;
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const rowStr = (rows[r] || []).join(' ');
    if (rowStr.includes('Full Timeline:') || rowStr.includes('Full Timeline')) {
      timelineRowIndex = r;
      break;
    }
  }

  const parseRowToModel = (row: string[], rIdx: number): ModelRecord | null => {
    if (!row || row.length < 5) return null;

    const rawNameCell = (row[1] || '').trim();
    const rawCreatorCell = (row[2] || '').trim();

    if (!rawNameCell && !rawCreatorCell) return null;
    if (
      rawNameCell.includes('Sources & Notes') ||
      rawNameCell.includes('Full Timeline') ||
      rawNameCell.includes('Expectations') ||
      rawNameCell.includes('Rumors') ||
      rawNameCell === 'min' ||
      rawNameCell === 'mean' ||
      rawNameCell === 'median' ||
      rawNameCell === 'max' ||
      rawNameCell.startsWith('count')
    ) {
      return null;
    }
    if (rawCreatorCell.includes('Sources & Notes') || rawCreatorCell.includes('Company')) {
      return null;
    }

    // Extract Flag and Name
    const { flag: nameFlag, cleanText: cleanedName } = extractFlag(rawNameCell);
    const { flag: creatorFlag, cleanText: cleanedCreator } = extractFlag(rawCreatorCell);
    const flag = nameFlag || creatorFlag || '🌐';

    // Model badges
    const isPaid = rawNameCell.includes('💲');
    const isFreeApi = rawNameCell.includes('🌐');
    const isNew = rawNameCell.includes('🆕');

    const displayName = cleanedName
      .replace(/💲/g, '')
      .replace(/🌐/g, '')
      .replace(/🆕/g, '')
      .trim();

    if (!displayName || displayName.length < 2) return null;

    // Parse Benchmark Columns (D through K):
    const valD = parseNum(row[3]);
    const valE = parseNum(row[4]);
    const valF = parseNum(row[5]);
    const valG = parseNum(row[6]);
    const valH = parseNum(row[7]);
    const valI = parseNum(row[8]);
    const valJ = parseNum(row[9]);
    const valK = parseNum(row[10]);

    const hasAll8 =
      valD !== null &&
      valE !== null &&
      valF !== null &&
      valG !== null &&
      valH !== null &&
      valI !== null &&
      valJ !== null &&
      valK !== null;

    const rawScores: RawBenchmarkScores = {
      actCodeReason: valD ?? 0,
      nonHallucination: valE ?? 0,
      scienceKnowledge: valF ?? 0,
      visionPlot: valG ?? 0,
      medReasoning: valH ?? 0,
      excelAgent: valI ?? 0,
      trickQuestions: valJ ?? 0,
      econLegal: valK ?? 0,
    };

    const scoreNewReported = parseNum(row[12]); // Col M
    const scoreOld = parseNum(row[11]);         // Col L
    const scoreWorstCase = parseNum(row[13]);

    // Strictly enforce selected mode without blending/fallback!
    const targetScore = isOld ? scoreOld : scoreNewReported;
    if (targetScore === null || targetScore <= 0) {
      return null;
    }

    // Calculate components according to formula:
    const rawContributions: { comp: typeof BENCHMARK_COMPONENTS[0]; raw: number; transformed: number; pts: number }[] = [];
    let sumTransformed = 0;

    BENCHMARK_COMPONENTS.forEach((comp) => {
      const raw = rawScores[comp.key];
      const transformed = comp.transform(raw);
      const pts = transformed / 8;
      rawContributions.push({ comp, raw, transformed, pts });
      sumTransformed += pts;
    });

    // Normalize points contribution to match the target score height exactly
    const normFactor = sumTransformed > 0 ? targetScore / sumTransformed : 1;

    const breakdown: ComponentBreakdown[] = rawContributions.map(({ comp, raw, transformed, pts }) => {
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
    // Modell-Link: Link aus Spalte P; wenn Spalte P kein Link, dann Link aus Spalte Q; sonst undefined
    const modelUrl = parsedChatLink || parsedApiLink;

    const company = getCompanyMeta(cleanedCreator);
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

    // Availability: Spalte P (Index 15) "Link to Chat or App if still available"
    // Chatbots in the top table (before timeline) are current available bots.
    // In timeline: only available if not superseded/discontinued and has active link or paid access.
    const chatLinkLow = chatLinkRaw.toLowerCase();
    const isSupersededOrDiscontinued =
      chatLinkLow.includes('better') ||
      chatLinkLow.includes('discontinued') ||
      chatLinkRaw === '';

    const isAvailable =
      (timelineRowIndex !== -1 && rIdx < timelineRowIndex && rIdx >= 2) ||
      (!isSupersededOrDiscontinued && (chatLinkLow.startsWith('http') || chatLinkLow.includes('paid') || chatLinkLow.includes('api') || !!parsedApiLink));

    return {
      id: `${displayName}-${rIdx}`,
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
      breakdown,
      score: targetScore,
      scoreOld,
      scoreNew: scoreNewReported,
      scoreNewCalculated: targetScore,
      scoreNewReported: targetScore,
      scoreWorstCase,
      storyline,
      chatLink: parsedChatLink,
      apiLink: parsedApiLink,
      modelUrl,
      isAvailable,
      companyDomain: company.domain,
      companyColor: company.color,
      faviconUrl,
    };
  };

  const topModels: ModelRecord[] = [];
  const seenNames = new Set<string>();

  // 1. Parse top table (stop when hitting section break or timeline)
  const stopIndex = timelineRowIndex !== -1 ? timelineRowIndex : rows.length;
  for (let r = headerRowIndex + 1; r < stopIndex; r++) {
    const row = rows[r];
    const rowStr = (row || []).join(' ');
    if (rowStr.includes('Sources & Notes')) {
      continue;
    }

    const model = parseRowToModel(row, r);
    if (model) {
      const cleanKey = model.displayName.toLowerCase();
      if (!seenNames.has(cleanKey)) {
        seenNames.add(cleanKey);
        topModels.push(model);
      }
    }
  }

  // 2. Parse timeline starting from timelineRowIndex
  const timelineModels: ModelRecord[] = [];
  if (timelineRowIndex !== -1) {
    for (let r = timelineRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      const model = parseRowToModel(row, r);
      if (model) {
        const cleanKey = model.displayName.toLowerCase();
        if (!seenNames.has(cleanKey)) {
          seenNames.add(cleanKey);
          timelineModels.push(model);
        }
      }
    }
  }

  // Combine and sort all deduplicated models descending by active score
  const allModels = [...topModels, ...timelineModels];
  allModels.sort((a, b) => b.score - a.score);

  // Assign sequential ranks 1..N
  allModels.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  return allModels;
}
