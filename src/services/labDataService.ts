import { LabEntry } from '../types';
import { parseCsvRows } from '../utils/csvParser';
import { DIRECT_EXPORT_LAB_CSV_URL, FALLBACK_LAB_ENTRIES, RAW_LAB_CSV_URL } from '../data/rawLabCsvFallback';
import {
  DEFAULT_SPREADSHEET_ID,
  LABS_SHEET_GID,
  fetchSpreadsheetMetadata,
  fetchSheetGridWithFormatting,
  resolveSheetTab,
} from './googleSheetsService';

const flagMap: Record<string, string> = {
  'America (US)': '🇺🇸',
  US: '🇺🇸',
  USA: '🇺🇸',
  China: '🇨🇳',
  Canada: '🇨🇦',
  French: '🇫🇷',
  France: '🇫🇷',
  Israel: '🇮🇱',
  Singapore: '🇸🇬',
  Singapur: '🇸🇬',
  'South Korea': '🇰🇷',
  UAE: '🇦🇪',
  Japan: '🇯🇵',
  'Saudi Arabia': '🇸🇦',
  Spain: '🇪🇸',
  Germany: '🇩🇪',
  UK: '🇬🇧',
  India: '🇮🇳',
};

export function normalizeCountry(raw: string): { country: string; flag: string } {
  const trimmed = raw ? raw.trim() : '';
  if (trimmed === 'Singapur' || trimmed === 'Singapore') {
    return { country: 'Singapore', flag: '🇸🇬' };
  }
  if (trimmed === 'French' || trimmed === 'France') {
    return { country: 'France', flag: '🇫🇷' };
  }
  if (trimmed === 'US' || trimmed === 'USA' || trimmed === 'America (US)') {
    return { country: 'America (US)', flag: '🇺🇸' };
  }
  if (trimmed === 'South Korea' || trimmed.startsWith('South Korea')) {
    return { country: 'South Korea', flag: '🇰🇷' };
  }
  return {
    country: trimmed,
    flag: flagMap[trimmed] || '🌐',
  };
}

function slugifyLabId(creator: string, colIdx: number): string {
  const slug = creator
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
  return slug || `lab-${colIdx}`;
}

/**
 * Derives per-tier openWeights booleans and lab-level weightsType ('open' | 'hybrid' | 'closed')
 * directly from live cell background colors (mint green = OpenWeights).
 * Falls back to static metadata only when greenMask is unavailable (e.g. unstyled CSV-only mode).
 */
function resolveWeightsFromGrid(
  tierRows: Array<{ key: keyof NonNullable<LabEntry['openWeights']>; rowIdx: number; value: string }>,
  colIdx: number,
  greenMask?: boolean[][],
  fallbackEntry?: LabEntry,
  defaultTypeIfNoGrid: 'open' | 'closed' | 'hybrid' = 'open'
): {
  weightsType?: 'open' | 'closed' | 'hybrid';
  openWeights?: LabEntry['openWeights'];
} {
  if (greenMask && greenMask.length > 0) {
    const openWeights: NonNullable<LabEntry['openWeights']> = {};
    let openCount = 0;
    let closedCount = 0;

    for (const tier of tierRows) {
      if (!tier.value) continue;
      const isOpen = Boolean(greenMask[tier.rowIdx]?.[colIdx]);
      openWeights[tier.key] = isOpen;
      if (isOpen) openCount += 1;
      else closedCount += 1;
    }

    if (openCount === 0 && closedCount === 0) {
      return { weightsType: undefined, openWeights: undefined };
    }

    const weightsType: 'open' | 'closed' | 'hybrid' =
      openCount > 0 && closedCount > 0
        ? 'hybrid'
        : openCount > 0
        ? 'open'
        : 'closed';

    return { weightsType, openWeights };
  }

  return {
    weightsType: fallbackEntry?.weightsType || defaultTypeIfNoGrid,
    openWeights: fallbackEntry?.openWeights,
  };
}

export function parseLabRows(rows: string[][], greenMask?: boolean[][]): LabEntry[] {
  if (rows.length < 17) {
    return FALLBACK_LAB_ENTRIES;
  }

  const getCell = (r: number, c: number): string => {
    return rows[r] && rows[r][c] ? rows[r][c].trim() : '';
  };

  const findRow = (keyword: string): number => {
    const kw = keyword.toLowerCase();
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] && rows[i][0].toLowerCase().includes(kw)) {
        return i;
      }
    }
    return -1;
  };

  const findRowInRange = (startRow: number, endRow: number, keywords: string[]): number => {
    for (let i = startRow; i <= Math.min(endRow, rows.length - 1); i++) {
      const col0 = rows[i]?.[0]?.toLowerCase() || '';
      if (keywords.some((kw) => col0.includes(kw))) {
        return i;
      }
    }
    return -1;
  };

  type TierKey = keyof LabEntry['parameterSizes'];
  const TIER_ROW_SPECS: Array<{ key: TierKey; keywords: string[] }> = [
    { key: 'micro', keywords: ['micro <', 'micro'] },
    { key: 'mini', keywords: ['mini <', 'mini'] },
    { key: 'tiny', keywords: ['tiny <', 'tiny'] },
    { key: 'small', keywords: ['small <', 'small'] },
    { key: 'medium', keywords: ['medium <', 'medium'] },
    { key: 'large', keywords: ['large <', 'large'] },
    { key: 'massive', keywords: ['massive <', 'massive'] },
    { key: 'colossal', keywords: ['colossal <', 'colossal'] },
    { key: 'planetary', keywords: ['planetary <', 'planetary'] },
    { key: 'singularity', keywords: ['singularity <', 'singularity'] },
    { key: 'godTier', keywords: ['god tier', 'godtier'] },
  ];

  const resolveTierRowIndices = (
    startRow: number,
    endRow: number,
    defaults?: Partial<Record<TierKey, number>>
  ): Partial<Record<TierKey, number>> => {
    const map: Partial<Record<TierKey, number>> = {};
    for (let i = Math.max(0, startRow); i <= Math.min(endRow, rows.length - 1); i++) {
      const col0 = (rows[i]?.[0] || '').toLowerCase().trim();
      if (!col0) continue;
      // Ignore notes/metadata/footer lines that happen to include a tier word (e.g. "**Local AI...", "Small Model Labs")
      if (col0.includes('notes') || col0.includes('model lab') || col0.includes('local ai') || col0.includes('based on')) {
        continue;
      }
      for (const spec of TIER_ROW_SPECS) {
        if (map[spec.key] !== undefined) continue;
        if (spec.keywords.some((kw) => col0.startsWith(kw) || col0.includes(`${kw} `))) {
          map[spec.key] = i;
          break;
        }
      }
    }
    if (defaults) {
      for (const [k, rowIdx] of Object.entries(defaults)) {
        const key = k as TierKey;
        if (map[key] === undefined && rowIdx !== undefined) {
          map[key] = rowIdx;
        }
      }
    }
    return map;
  };

  const buildTierValuesAndGrid = (
    tierRowIndices: Partial<Record<TierKey, number>>,
    colIdx: number
  ) => {
    const parameterSizes: LabEntry['parameterSizes'] = {};
    const tierRowsForGrid: Array<{ key: TierKey; rowIdx: number; value: string }> = [];
    for (const spec of TIER_ROW_SPECS) {
      const rowIdx = tierRowIndices[spec.key];
      if (rowIdx === undefined) continue;
      const val = getCell(rowIdx, colIdx);
      parameterSizes[spec.key] = val;
      tierRowsForGrid.push({ key: spec.key, rowIdx, value: val });
    }
    return { parameterSizes, tierRowsForGrid };
  };

  const fallbackMap = new Map<string, LabEntry>(FALLBACK_LAB_ENTRIES.map((l) => [l.id, l]));
  const fallbackByCreator = new Map<string, LabEntry>(
    FALLBACK_LAB_ENTRIES.map((l) => [l.creator.toLowerCase().trim(), l])
  );

  // Locate section header rows dynamically so row insertions never shift parsing
  const rTop10 =
    findRow('top llm') !== -1 ? findRow('top llm') : findRow('top') !== -1 ? findRow('top') : 2;
  const rContenders = findRow('contender') !== -1 ? findRow('contender') : 19;
  const rTweakers = findRow('tweaker') !== -1 ? findRow('tweaker') : 31;
  const rSmall = findRow('small model') !== -1 ? findRow('small model') : 42;
  const rHarness =
    findRow('harness labs') !== -1
      ? findRow('harness labs')
      : findRow('harness only') !== -1
      ? findRow('harness only')
      : 54;

  // 1. Top LLM Labs
  const topBoundEnd = Math.max(rTop10 + 16, rContenders - 1);
  const findTopRow = (keywords: string[], defaultOffset: number) => {
    const found = findRowInRange(rTop10 + 1, topBoundEnd, keywords);
    return found !== -1 ? found : rTop10 + defaultOffset;
  };

  const rTopCreator = findTopRow(['creator'], 1);
  const rTopFamous = findTopRow(['famous for'], 2);
  const rTopEngine = findTopRow(['chatbot family', 'engine'], 3);
  const topTierRows = resolveTierRowIndices(rTop10 + 1, topBoundEnd, {
    small: rTop10 + 4,
    medium: rTop10 + 5,
    large: rTop10 + 6,
    massive: rTop10 + 7,
    colossal: rTop10 + 8,
    planetary: rTop10 + 9,
    singularity: rTop10 + 10,
    godTier: rTop10 + 11,
  });
  const rTopSubs = findTopRow(['subscription tier'], 12);
  const rTopHarness = findTopRow(['the harness'], 13);
  const rTopDaily = findTopRow(['daily agent'], 14);
  const rTopCoding = findTopRow(['coding agent'], 15);

  const top10Entries: LabEntry[] = [];
  let curCountryTop10 = 'America (US)';
  const top10MaxCols = Math.max(rows[rTop10]?.length || 0, rows[rTopCreator]?.length || 0, 15);

  for (let c = 1; c < top10MaxCols; c++) {
    const countryHeader = getCell(rTop10, c);
    if (countryHeader) curCountryTop10 = countryHeader;
    const creator = getCell(rTopCreator, c);
    if (!creator) continue;

    const fb =
      fallbackByCreator.get(creator.toLowerCase()) ||
      fallbackMap.get(slugifyLabId(creator, c));
    const { country, flag } = normalizeCountry(curCountryTop10);

    const { parameterSizes, tierRowsForGrid } = buildTierValuesAndGrid(topTierRows, c);
    const { weightsType, openWeights } = resolveWeightsFromGrid(
      tierRowsForGrid,
      c,
      greenMask,
      fb,
      'hybrid'
    );

    top10Entries.push({
      id: fb?.id || slugifyLabId(creator, c),
      group: 'top10',
      country,
      countryFlag: flag,
      creator,
      famousFor: getCell(rTopFamous, c),
      engineName: getCell(rTopEngine, c),
      weightsType,
      openWeights,
      parameterSizes,
      subscriptionTiers: getCell(rTopSubs, c),
      harnessSdk: getCell(rTopHarness, c),
      dailyAgent: getCell(rTopDaily, c),
      codingAgent: getCell(rTopCoding, c),
    });
  }

  // 2. Contenders (dynamic rows incl. Tiny < 8B & Planetary < 5T)
  const contenderBoundEnd = Math.max(rContenders + 10, rTweakers - 1);
  const findContenderRow = (keywords: string[], defaultOffset: number) => {
    const found = findRowInRange(rContenders + 1, contenderBoundEnd, keywords);
    return found !== -1 ? found : rContenders + defaultOffset;
  };
  const rContenderCreator = findContenderRow(['creator'], 1);
  const rContenderEngine = findContenderRow(['chatbot family', 'engine'], 2);
  const rContenderNotes = findRowInRange(rContenders + 1, contenderBoundEnd, ['note', 'famous']);
  const notesRowContender = rContenderNotes !== -1 ? rContenderNotes : rContenders + 10;
  const contenderNotesLabel = rContenderNotes !== -1 ? getCell(rContenderNotes, 0) : 'Notes';
  const contenderTierRows = resolveTierRowIndices(rContenders + 1, contenderBoundEnd, {
    tiny: rContenders + 3,
    small: rContenders + 4,
    medium: rContenders + 5,
    large: rContenders + 6,
    massive: rContenders + 7,
    colossal: rContenders + 8,
    planetary: rContenders + 9,
  });

  let curCountryContender = 'America (US)';
  const contenders: LabEntry[] = [];
  const contendersMaxCols = rows[rContenderCreator]?.length || 35;
  for (let c = 1; c < contendersMaxCols; c++) {
    const countryHeader = getCell(rContenders, c);
    if (countryHeader) curCountryContender = countryHeader;
    const creator = getCell(rContenderCreator, c);
    if (!creator) continue;

    const fb = fallbackMap.get(`contender-${c}`) || fallbackByCreator.get(creator.toLowerCase());
    const { country, flag } = normalizeCountry(curCountryContender);

    const { parameterSizes, tierRowsForGrid } = buildTierValuesAndGrid(contenderTierRows, c);
    const { weightsType, openWeights } = resolveWeightsFromGrid(
      tierRowsForGrid,
      c,
      greenMask,
      fb,
      'open'
    );

    contenders.push({
      id: `contender-${c}`,
      group: 'contender',
      country,
      countryFlag: flag,
      creator,
      engineName: getCell(rContenderEngine, c),
      famousFor: getCell(notesRowContender, c),
      notesLabel: contenderNotesLabel,
      weightsType,
      openWeights,
      parameterSizes,
      specialties: getCell(notesRowContender, c),
    });
  }

  // 3. Model Tweakers
  const tweakerBoundEnd = Math.max(rTweakers + 9, rSmall - 1);
  const findTweakerRow = (keywords: string[], defaultOffset: number) => {
    const found = findRowInRange(rTweakers + 1, tweakerBoundEnd, keywords);
    return found !== -1 ? found : rTweakers + defaultOffset;
  };
  const rTweakerCreator = findTweakerRow(['players building', 'creator'], 1);
  const rTweakerEngine = findTweakerRow(['chatbot family', 'engine'], 2);
  const rTweakerBasedOn = findTweakerRow(['based on'], 3);
  const tweakerTierRows = resolveTierRowIndices(rTweakers + 1, tweakerBoundEnd, {
    small: rTweakers + 4,
    medium: rTweakers + 5,
    large: rTweakers + 6,
    massive: rTweakers + 7,
    colossal: rTweakers + 8,
    planetary: rTweakers + 9,
  });

  const tweakers: LabEntry[] = [];
  let curCountryTweaker = 'America (US)';
  const tweakersMaxCols = rows[rTweakerCreator]?.length || 30;
  for (let c = 1; c < tweakersMaxCols; c++) {
    const countryHeader = getCell(rTweakers, c);
    if (countryHeader) curCountryTweaker = countryHeader;
    const creator = getCell(rTweakerCreator, c);
    if (!creator) continue;

    const fb = fallbackMap.get(`tweaker-${c}`) || fallbackByCreator.get(creator.toLowerCase());
    const { country, flag } = normalizeCountry(curCountryTweaker);

    const { parameterSizes, tierRowsForGrid } = buildTierValuesAndGrid(tweakerTierRows, c);
    const { weightsType, openWeights } = resolveWeightsFromGrid(
      tierRowsForGrid,
      c,
      greenMask,
      fb,
      'open'
    );

    const basedOnVal = getCell(rTweakerBasedOn, c);
    tweakers.push({
      id: `tweaker-${c}`,
      group: 'tweakers',
      country,
      countryFlag: flag,
      creator,
      engineName: getCell(rTweakerEngine, c),
      basedOn: basedOnVal,
      famousFor: basedOnVal ? `Based on ${basedOnVal}` : '',
      weightsType,
      openWeights,
      parameterSizes,
      specialties: basedOnVal ? `Based on ${basedOnVal}` : '',
    });
  }

  // 4. Small Model Labs (live columns, no hardcoded Samsung merge)
  const smallBoundEnd = Math.max(rSmall + 9, rHarness - 1);
  const findSmallRow = (keywords: string[], defaultOffset: number) => {
    const found = findRowInRange(rSmall + 1, smallBoundEnd, keywords);
    return found !== -1 ? found : rSmall + defaultOffset;
  };
  const rSmallCreator = findSmallRow(['creator'], 1);
  const rSmallEngine = findSmallRow(['chatbot family', 'engine'], 2);
  const rSmallNotes = findRowInRange(rSmall + 1, smallBoundEnd, ['note', 'famous']);
  const notesRowSmall = rSmallNotes !== -1 ? rSmallNotes : rSmall + 9;
  const smallNotesLabel = rSmallNotes !== -1 ? getCell(rSmallNotes, 0) : 'Notes';
  const smallTierRows = resolveTierRowIndices(rSmall + 1, smallBoundEnd, {
    micro: rSmall + 3,
    mini: rSmall + 4,
    tiny: rSmall + 5,
    small: rSmall + 6,
    medium: rSmall + 7,
    large: rSmall + 8,
  });

  const smallLabs: LabEntry[] = [];
  let curCountrySmall = 'America (US)';
  const smallMaxCols = rows[rSmallCreator]?.length || 30;
  for (let c = 1; c < smallMaxCols; c++) {
    const countryHeader = getCell(rSmall, c);
    if (countryHeader && !countryHeader.toLowerCase().includes('small llm') && !countryHeader.toLowerCase().includes('small model')) {
      curCountrySmall = countryHeader.trim();
    }
    const creator = getCell(rSmallCreator, c);
    if (!creator) continue;

    const fb = fallbackMap.get(`small-${c}`) || fallbackByCreator.get(creator.toLowerCase());
    const { country, flag } = normalizeCountry(curCountrySmall);

    const { parameterSizes, tierRowsForGrid } = buildTierValuesAndGrid(smallTierRows, c);
    const { weightsType, openWeights } = resolveWeightsFromGrid(
      tierRowsForGrid,
      c,
      greenMask,
      fb,
      'open'
    );

    smallLabs.push({
      id: `small-${c}`,
      group: 'small',
      country,
      countryFlag: flag,
      creator,
      engineName: getCell(rSmallEngine, c),
      famousFor: getCell(notesRowSmall, c),
      notesLabel: smallNotesLabel,
      weightsType,
      openWeights,
      parameterSizes,
      specialties: getCell(notesRowSmall, c),
    });
  }

  // 5. Harness Only Labs
  const harnessBoundEnd = Math.min(rows.length - 1, rHarness + 8);
  const findHarnessRow = (keywords: string[], defaultOffset: number) => {
    const found = findRowInRange(rHarness + 1, harnessBoundEnd, keywords);
    return found !== -1 ? found : rHarness + defaultOffset;
  };
  const rHarnessCreator = findHarnessRow(['creator'], 1);
  const rHarnessName = findHarnessRow(['harness'], 2);
  const rHarnessForm = findHarnessRow(['form'], 3);
  const rHarnessNote = findHarnessRow(['note'], 4);

  const harnessLabs: LabEntry[] = [];
  let curCountryHarness = 'America (US)';
  const harnessMaxCols = rows[rHarnessCreator]?.length || 30;
  for (let c = 1; c < harnessMaxCols; c++) {
    const countryHeader = getCell(rHarness, c);
    if (countryHeader) curCountryHarness = countryHeader.trim();
    const creator = getCell(rHarnessCreator, c);
    if (!creator) continue;
    const { country, flag } = normalizeCountry(curCountryHarness);
    harnessLabs.push({
      id: `harness-${c}`,
      group: 'harness',
      country,
      countryFlag: flag,
      creator,
      famousFor: '',
      engineName: getCell(rHarnessName, c),
      harness: getCell(rHarnessName, c),
      form: getCell(rHarnessForm, c),
      note: getCell(rHarnessNote, c),
      specialties: '',
      parameterSizes: {},
    });
  }

  const all = [...top10Entries, ...contenders, ...tweakers, ...smallLabs, ...harnessLabs];
  return all.length > 0 ? all : FALLBACK_LAB_ENTRIES;
}

export function parseLabCsv(csvText: string): LabEntry[] {
  return parseLabRows(parseCsvRows(csvText));
}

export async function fetchLiveLabEntries(options?: {
  accessToken?: string | null;
  spreadsheetId?: string;
  forceRefresh?: boolean;
}): Promise<{
  entries: LabEntry[];
  isLive: boolean;
  dataSource: 'sheets_api' | 'csv' | 'fallback';
}> {
  const accessToken = options?.accessToken;
  const spreadsheetId = options?.spreadsheetId || DEFAULT_SPREADSHEET_ID;
  const forceRefresh = options?.forceRefresh ?? false;

  // 1. Authenticated Google Sheets API v4 with includeGridData=true (reads live values + cell green formatting)
  if (accessToken) {
    try {
      const meta = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
      const tab = meta.sheets.find((s) => s.sheetId === LABS_SHEET_GID) || resolveSheetTab(meta, LABS_SHEET_GID);
      const grid = await fetchSheetGridWithFormatting(spreadsheetId, tab.title, accessToken);
      const parsed = parseLabRows(grid.rows, grid.greenMask);
      if (parsed.length > 0) {
        return { entries: parsed, isLive: true, dataSource: 'sheets_api' };
      }
    } catch (err) {
      console.warn('Failed fetching lab grid via Google Sheets API:', err);
    }
  }

  // 2. Full-stack backend endpoint parsing published HTML grid (values + #d9ead3 mint green cells)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const gridRes = await fetch(`/api/labs-grid${forceRefresh ? '?refresh=1' : ''}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (gridRes.ok && (gridRes.headers.get('content-type') || '').includes('application/json')) {
      const gridData = (await gridRes.json()) as { rows?: string[][]; greenMask?: boolean[][] };
      if (Array.isArray(gridData.rows) && gridData.rows.length >= 17) {
        const parsed = parseLabRows(gridData.rows, gridData.greenMask);
        if (parsed.length > 0) {
          return { entries: parsed, isLive: true, dataSource: 'csv' };
        }
      }
    }
  } catch {
    // Static preview mode or offline: fall through to public CSV export
  }

  // 3. Direct CSV export fallback (no cell colors in CSV, uses static openWeights fallback)
  const cacheBuster = `_t=${Date.now()}`;
  const endpoints = [
    `${RAW_LAB_CSV_URL}&${cacheBuster}`,
    `${DIRECT_EXPORT_LAB_CSV_URL}&${cacheBuster}`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'text/csv, text/plain, */*',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (!text.includes('<HTML>') && !text.includes('<!DOCTYPE') && text.length >= 200) {
          const parsed = parseLabCsv(text);
          if (parsed.length > 0) {
            return { entries: parsed, isLive: true, dataSource: 'csv' };
          }
        }
      }
    } catch (e) {
      console.warn(`Failed fetching lab data from ${url}:`, e);
    }
  }

  // 4. Weekly server-cached backup snapshot before static bundle fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const snapRes = await fetch('/api/snapshots/weekly', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    if (snapRes.ok && (snapRes.headers.get('content-type') || '').includes('application/json')) {
      const snap = (await snapRes.json()) as { labRows?: string[][] | null; labGreenMask?: boolean[][] | null };
      if (Array.isArray(snap?.labRows) && snap.labRows.length >= 17) {
        const parsed = parseLabRows(snap.labRows, snap.labGreenMask ?? undefined);
        if (parsed.length > 0) {
          return { entries: parsed, isLive: false, dataSource: 'fallback' };
        }
      }
    }
  } catch {
    // Fall through to embedded bundle fallback
  }

  return { entries: FALLBACK_LAB_ENTRIES, isLive: false, dataSource: 'fallback' };
}
