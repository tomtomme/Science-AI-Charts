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

  const fallbackMap = new Map<string, LabEntry>(FALLBACK_LAB_ENTRIES.map((l) => [l.id, l]));
  const fallbackByCreator = new Map<string, LabEntry>(
    FALLBACK_LAB_ENTRIES.map((l) => [l.creator.toLowerCase().trim(), l])
  );

  // 1. Top LLM Labs (dynamic columns + live merged country headers + live cell green backgrounds)
  const rTop10 = findRow('top') !== -1 ? findRow('top') : 1;
  const rContenders = findRow('contender') !== -1 ? findRow('contender') : 18;

  const findTopRow = (keywords: string[], defaultOffset: number) => {
    const found = findRowInRange(rTop10 + 1, Math.max(rTop10 + 16, rContenders - 1), keywords);
    return found !== -1 ? found : rTop10 + defaultOffset;
  };

  const rTopCreator = findTopRow(['creator'], 1);
  const rTopFamous = findTopRow(['famous for'], 2);
  const rTopEngine = findTopRow(['chatbot family', 'engine'], 3);
  const rTopSmall = findTopRow(['small <'], 4);
  const rTopMedium = findTopRow(['medium <'], 5);
  const rTopLarge = findTopRow(['large <'], 6);
  const rTopMassive = findTopRow(['massive <'], 7);
  const rTopColossal = findTopRow(['colossal <'], 8);
  const rTopPlanetary = findTopRow(['planetary <'], 9);
  const rTopSingularity = findTopRow(['singularity <'], 10);
  const rTopGodTier = findTopRow(['god tier'], 11);
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

    const parameterSizes = {
      small: getCell(rTopSmall, c),
      medium: getCell(rTopMedium, c),
      large: getCell(rTopLarge, c),
      massive: getCell(rTopMassive, c),
      colossal: getCell(rTopColossal, c),
      planetary: getCell(rTopPlanetary, c),
      singularity: getCell(rTopSingularity, c),
      godTier: getCell(rTopGodTier, c),
    };

    const { weightsType, openWeights } = resolveWeightsFromGrid(
      [
        { key: 'small', rowIdx: rTopSmall, value: parameterSizes.small },
        { key: 'medium', rowIdx: rTopMedium, value: parameterSizes.medium },
        { key: 'large', rowIdx: rTopLarge, value: parameterSizes.large },
        { key: 'massive', rowIdx: rTopMassive, value: parameterSizes.massive },
        { key: 'colossal', rowIdx: rTopColossal, value: parameterSizes.colossal },
        { key: 'planetary', rowIdx: rTopPlanetary, value: parameterSizes.planetary },
        { key: 'singularity', rowIdx: rTopSingularity, value: parameterSizes.singularity },
        { key: 'godTier', rowIdx: rTopGodTier, value: parameterSizes.godTier },
      ],
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

  // 2. Contenders
  const rTweakers = findRow('tweaker') !== -1 ? findRow('tweaker') : 29;
  const rContenderNotes = findRowInRange(rContenders, rTweakers, ['note', 'famous']);
  const notesRowContender = rContenderNotes !== -1 ? rContenderNotes : rContenders + 9;
  const contenderNotesLabel = rContenderNotes !== -1 ? getCell(rContenderNotes, 0) : 'Notes';

  let curCountryContender = 'America (US)';
  const contenders: LabEntry[] = [];
  const contendersMaxCols = rows[rContenders + 1]?.length || 35;
  for (let c = 1; c < contendersMaxCols; c++) {
    const countryHeader = getCell(rContenders, c);
    if (countryHeader) curCountryContender = countryHeader;
    const creator = getCell(rContenders + 1, c);
    if (!creator) continue;

    const fb = fallbackMap.get(`contender-${c}`) || fallbackByCreator.get(creator.toLowerCase());
    const { country, flag } = normalizeCountry(curCountryContender);

    const parameterSizes = {
      small: getCell(rContenders + 3, c),
      medium: getCell(rContenders + 4, c),
      large: getCell(rContenders + 5, c),
      massive: getCell(rContenders + 6, c),
      colossal: getCell(rContenders + 7, c),
      planetary: getCell(rContenders + 8, c),
    };

    const { weightsType, openWeights } = resolveWeightsFromGrid(
      [
        { key: 'small', rowIdx: rContenders + 3, value: parameterSizes.small },
        { key: 'medium', rowIdx: rContenders + 4, value: parameterSizes.medium },
        { key: 'large', rowIdx: rContenders + 5, value: parameterSizes.large },
        { key: 'massive', rowIdx: rContenders + 6, value: parameterSizes.massive },
        { key: 'colossal', rowIdx: rContenders + 7, value: parameterSizes.colossal },
        { key: 'planetary', rowIdx: rContenders + 8, value: parameterSizes.planetary },
      ],
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
      engineName: getCell(rContenders + 2, c),
      famousFor: getCell(notesRowContender, c),
      notesLabel: contenderNotesLabel,
      weightsType,
      openWeights,
      parameterSizes,
      specialties: getCell(notesRowContender, c),
    });
  }

  // 3. Model Tweakers
  const tweakers: LabEntry[] = [];
  let curCountryTweaker = 'America (US)';
  const tweakersMaxCols = rows[rTweakers + 1]?.length || 30;
  for (let c = 1; c < tweakersMaxCols; c++) {
    const countryHeader = getCell(rTweakers, c);
    if (countryHeader) curCountryTweaker = countryHeader;
    const creator = getCell(rTweakers + 1, c);
    if (!creator) continue;

    const fb = fallbackMap.get(`tweaker-${c}`) || fallbackByCreator.get(creator.toLowerCase());
    const { country, flag } = normalizeCountry(curCountryTweaker);

    const parameterSizes = {
      small: getCell(rTweakers + 4, c),
      medium: getCell(rTweakers + 5, c),
      large: getCell(rTweakers + 6, c),
      massive: getCell(rTweakers + 7, c),
      colossal: getCell(rTweakers + 8, c),
      planetary: getCell(rTweakers + 9, c),
    };

    const { weightsType, openWeights } = resolveWeightsFromGrid(
      [
        { key: 'small', rowIdx: rTweakers + 4, value: parameterSizes.small },
        { key: 'medium', rowIdx: rTweakers + 5, value: parameterSizes.medium },
        { key: 'large', rowIdx: rTweakers + 6, value: parameterSizes.large },
        { key: 'massive', rowIdx: rTweakers + 7, value: parameterSizes.massive },
        { key: 'colossal', rowIdx: rTweakers + 8, value: parameterSizes.colossal },
        { key: 'planetary', rowIdx: rTweakers + 9, value: parameterSizes.planetary },
      ],
      c,
      greenMask,
      fb,
      'open'
    );

    tweakers.push({
      id: `tweaker-${c}`,
      group: 'tweakers',
      country,
      countryFlag: flag,
      creator,
      engineName: getCell(rTweakers + 2, c),
      basedOn: getCell(rTweakers + 3, c),
      famousFor: getCell(rTweakers + 3, c) ? `Based on ${getCell(rTweakers + 3, c)}` : '',
      weightsType,
      openWeights,
      parameterSizes,
      specialties: getCell(rTweakers + 3, c) ? `Based on ${getCell(rTweakers + 3, c)}` : '',
    });
  }

  // 4. Small Model Labs (live columns, no hardcoded Samsung merge)
  const rSmall = findRow('small model') !== -1 ? findRow('small model') : 40;
  const rHarness =
    findRow('harness labs') !== -1
      ? findRow('harness labs')
      : findRow('harness only') !== -1
      ? findRow('harness only')
      : 52;
  const rSmallNotes = findRowInRange(rSmall, rHarness, ['note', 'famous']);
  const notesRowSmall = rSmallNotes !== -1 ? rSmallNotes : rSmall + 9;
  const smallNotesLabel = rSmallNotes !== -1 ? getCell(rSmallNotes, 0) : 'Notes';

  const smallLabs: LabEntry[] = [];
  let curCountrySmall = 'America (US)';
  const smallMaxCols = rows[rSmall + 1]?.length || 30;
  for (let c = 1; c < smallMaxCols; c++) {
    const countryHeader = getCell(rSmall, c);
    if (countryHeader && !countryHeader.toLowerCase().includes('small llm') && !countryHeader.toLowerCase().includes('small model')) {
      curCountrySmall = countryHeader.trim();
    }
    const creator = getCell(rSmall + 1, c);
    if (!creator) continue;

    const fb = fallbackMap.get(`small-${c}`) || fallbackByCreator.get(creator.toLowerCase());
    const { country, flag } = normalizeCountry(curCountrySmall);

    const parameterSizes = {
      micro: getCell(rSmall + 3, c),
      mini: getCell(rSmall + 4, c),
      tiny: getCell(rSmall + 5, c),
      small: getCell(rSmall + 6, c),
      medium: getCell(rSmall + 7, c),
      large: getCell(rSmall + 8, c),
    };

    const { weightsType, openWeights } = resolveWeightsFromGrid(
      [
        { key: 'micro', rowIdx: rSmall + 3, value: parameterSizes.micro },
        { key: 'mini', rowIdx: rSmall + 4, value: parameterSizes.mini },
        { key: 'tiny', rowIdx: rSmall + 5, value: parameterSizes.tiny },
        { key: 'small', rowIdx: rSmall + 6, value: parameterSizes.small },
        { key: 'medium', rowIdx: rSmall + 7, value: parameterSizes.medium },
        { key: 'large', rowIdx: rSmall + 8, value: parameterSizes.large },
      ],
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
      engineName: getCell(rSmall + 2, c),
      famousFor: getCell(notesRowSmall, c),
      notesLabel: smallNotesLabel,
      weightsType,
      openWeights,
      parameterSizes,
      specialties: getCell(notesRowSmall, c),
    });
  }

  // 5. Harness Only Labs
  const harnessLabs: LabEntry[] = [];
  let curCountryHarness = 'America (US)';
  const harnessMaxCols = rows[rHarness + 1]?.length || 30;
  for (let c = 1; c < harnessMaxCols; c++) {
    const countryHeader = getCell(rHarness, c);
    if (countryHeader) curCountryHarness = countryHeader.trim();
    const creator = getCell(rHarness + 1, c);
    if (!creator) continue;
    const { country, flag } = normalizeCountry(curCountryHarness);
    harnessLabs.push({
      id: `harness-${c}`,
      group: 'harness',
      country,
      countryFlag: flag,
      creator,
      famousFor: '',
      engineName: getCell(rHarness + 2, c),
      harness: getCell(rHarness + 2, c),
      form: getCell(rHarness + 3, c),
      note: getCell(rHarness + 4, c),
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
}): Promise<{
  entries: LabEntry[];
  isLive: boolean;
  dataSource: 'sheets_api' | 'csv' | 'fallback';
}> {
  const accessToken = options?.accessToken;
  const spreadsheetId = options?.spreadsheetId || DEFAULT_SPREADSHEET_ID;

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
    const gridRes = await fetch('/api/labs-grid', { signal: controller.signal });
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

  return { entries: FALLBACK_LAB_ENTRIES, isLive: false, dataSource: 'fallback' };
}
