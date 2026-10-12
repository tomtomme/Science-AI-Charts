import { FALLBACK_CSV_CONTENT, RAW_CSV_URL } from '../data/rawCsvFallback';
import { ModelRecord } from '../types';
import { extractSheetDate, parseModelDataset } from '../utils/csvParser';

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
  sheetFileDate: string | null;
  sheetHeaderDate: string | null;
  lastSyncedAt: Date;
  isLive: boolean;
  error: string | null;
}

/**
 * Fetch raw CSV from Google Sheets with cache-busting query parameter
 */
export async function fetchLiveCsv(): Promise<{
  csvText: string;
  isLive: boolean;
  headerDate: string | null;
}> {
  try {
    const cacheBuster = `_t=${Date.now()}`;
    const url = `${RAW_CSV_URL}&${cacheBuster}`;
    
    // Attempt live fetch with an 8-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/csv, text/plain, */*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Google Sheets responded with HTTP status ${response.status}`);
    }

    const headerDate = response.headers.get('last-modified') || response.headers.get('date');
    const csvText = await response.text();

    // Verify that we received valid CSV content rather than an HTML error page
    if (csvText.includes('<HTML>') || csvText.includes('<!DOCTYPE') || csvText.length < 200) {
      throw new Error('Received HTML response instead of CSV');
    }

    return { csvText, isLive: true, headerDate };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('Google Sheets live fetch warning (using embedded fallback):', errorMsg);
    return { csvText: FALLBACK_CSV_CONTENT, isLive: false, headerDate: null };
  }
}

/**
 * Loads both NEW and OLD models along with sheet metadata
 */
export async function loadModelsData(): Promise<LoadedDatasets> {
  const { csvText, isLive, headerDate } = await fetchLiveCsv();
  const now = new Date();
  try {
    const newModels = parseModelDataset(csvText, 'new');
    const oldModels = parseModelDataset(csvText, 'old');
    const sheetFileDate = extractSheetDate(csvText);

    if (newModels.length === 0 && oldModels.length === 0) {
      throw new Error('Keine Datensätze gefunden');
    }
    return {
      models: newModels,
      newModels,
      oldModels,
      sheetFileDate,
      sheetHeaderDate: headerDate,
      lastSyncedAt: now,
      isLive,
      error: null,
    };
  } catch (err) {
    const fallbackNew = parseModelDataset(FALLBACK_CSV_CONTENT, 'new');
    const fallbackOld = parseModelDataset(FALLBACK_CSV_CONTENT, 'old');
    const sheetFileDate = extractSheetDate(FALLBACK_CSV_CONTENT);

    return {
      models: fallbackNew,
      newModels: fallbackNew,
      oldModels: fallbackOld,
      sheetFileDate,
      sheetHeaderDate: null,
      lastSyncedAt: now,
      isLive: false,
      error: err instanceof Error ? err.message : 'Parser-Fehler',
    };
  }
}
