import { FALLBACK_CSV_CONTENT, RAW_CSV_URL, DIRECT_EXPORT_CSV_URL } from '../data/rawCsvFallback';
import { ModelRecord, CsvNotesMetadata } from '../types';
import { extractHeaderMetadata, extractSheetDate, parseModelDataset, extractCsvNotesMetadata, CsvHeaderMetadata } from '../utils/csvParser';

export interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  sheetFileDate: string | null;
  sheetHeaderDate: string | null;
  error: string | null;
  isUsingFallback: boolean;
  dataSource: 'live' | 'fallback';
}

export interface LoadedDatasets {
  models: ModelRecord[]; // default to newModels for backwards-compatibility
  newModels: ModelRecord[];
  oldModels: ModelRecord[];
  worstCaseModels: ModelRecord[];
  sheetFileDate: string | null;
  sheetHeaderDate: string | null;
  lastSyncedAt: Date;
  isLive: boolean;
  error: string | null;
  headerMeta: CsvHeaderMetadata;
  notesMeta: CsvNotesMetadata;
}

/**
 * Fetch raw CSV from Google Sheets with cache-busting query parameter.
 * Tries direct export URL first for immediate, real-time Google Sheets changes,
 * then falls back to public published CSV URL, and finally to embedded fallback.
 */
export async function fetchLiveCsv(): Promise<{
  csvText: string;
  isLive: boolean;
  headerDate: string | null;
}> {
  const cacheBuster = `_t=${Date.now()}`;
  const endpoints = [
    `${DIRECT_EXPORT_CSV_URL}&${cacheBuster}`,
    `${RAW_CSV_URL}&${cacheBuster}`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/csv, text/plain, */*',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const headerDate = response.headers.get('last-modified') || response.headers.get('date');
        const csvText = await response.text();

        // Verify that we received valid CSV content rather than an HTML error page
        if (!csvText.includes('<HTML>') && !csvText.includes('<!DOCTYPE') && csvText.length >= 200) {
          return { csvText, isLive: true, headerDate };
        }
      }
    } catch (err) {
      console.warn(`Failed fetching from ${url}:`, err);
    }
  }

  return { csvText: FALLBACK_CSV_CONTENT, isLive: false, headerDate: null };
}

/**
 * Loads both NEW and OLD models along with sheet metadata and notes metadata
 */
export async function loadModelsData(): Promise<LoadedDatasets> {
  const { csvText, isLive, headerDate } = await fetchLiveCsv();
  const now = new Date();
  try {
    const newModels = parseModelDataset(csvText, 'new');
    const oldModels = parseModelDataset(csvText, 'old');
    const worstCaseModels = parseModelDataset(csvText, 'worstCase');
    const sheetFileDate = extractSheetDate(csvText);

    const headerMeta = extractHeaderMetadata(csvText);
    const notesMeta = extractCsvNotesMetadata(csvText);

    if (newModels.length === 0 && oldModels.length === 0 && worstCaseModels.length === 0) {
      throw new Error('Keine Datensätze gefunden');
    }
    return {
      models: newModels,
      newModels,
      oldModels,
      worstCaseModels,
      sheetFileDate,
      sheetHeaderDate: headerDate,
      lastSyncedAt: now,
      isLive,
      error: null,
      headerMeta,
      notesMeta,
    };
  } catch (err) {
    const fallbackNew = parseModelDataset(FALLBACK_CSV_CONTENT, 'new');
    const fallbackOld = parseModelDataset(FALLBACK_CSV_CONTENT, 'old');
    const fallbackWorstCase = parseModelDataset(FALLBACK_CSV_CONTENT, 'worstCase');
    const sheetFileDate = extractSheetDate(FALLBACK_CSV_CONTENT);
    const headerMeta = extractHeaderMetadata(FALLBACK_CSV_CONTENT);
    const notesMeta = extractCsvNotesMetadata(FALLBACK_CSV_CONTENT);

    return {
      models: fallbackNew,
      newModels: fallbackNew,
      oldModels: fallbackOld,
      worstCaseModels: fallbackWorstCase,
      sheetFileDate,
      sheetHeaderDate: null,
      lastSyncedAt: now,
      isLive: false,
      error: err instanceof Error ? err.message : 'Parser-Fehler',
      headerMeta,
      notesMeta,
    };
  }
}
