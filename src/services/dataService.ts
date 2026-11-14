import { FALLBACK_CSV_CONTENT, RAW_CSV_URL, DIRECT_EXPORT_CSV_URL } from '../data/rawCsvFallback';
import { ModelRecord, CsvNotesMetadata, SheetColumnLayout } from '../types';
import {
  extractHeaderMetadata,
  extractHeaderMetadataFromRows,
  extractSheetDate,
  extractSheetDateFromRows,
  parseModelDataset,
  parseModelDatasetFromRows,
  parseAllModels,
  parseAllModelsFromRows,
  extractCsvNotesMetadata,
  extractCsvNotesMetadataFromRows,
  findSheetStructuralRows,
  detectSheetColumns,
  parseCsvRows,
  CsvHeaderMetadata,
} from '../utils/csvParser';
import {
  DEFAULT_SPREADSHEET_ID,
  MAIN_SHEET_GID,
  fetchSpreadsheetMetadata,
  fetchSheetValues,
  resolveSheetTab,
  GoogleSheetsApiError,
} from './googleSheetsService';

export type LoadedDataSource = 'sheets_api' | 'csv' | 'fallback';

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
  models: ModelRecord[];
  allModels: ModelRecord[];
  newModels: ModelRecord[];
  oldModels: ModelRecord[];
  worstCaseModels: ModelRecord[];
  sheetFileDate: string | null;
  sheetHeaderDate: string | null;
  lastSyncedAt: Date;
  isLive: boolean;
  dataSource?: LoadedDataSource;
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  activeSheetId?: number;
  activeSheetTitle?: string;
  historyStartRow?: number;
  sourcesNotesRow?: number | null;
  notesRow?: number;
  rawRows?: string[][];
  columnLayout?: SheetColumnLayout;
  error: string | null;
  authError?: boolean;
  headerMeta: CsvHeaderMetadata;
  notesMeta: CsvNotesMetadata;
}

export interface LoadModelsOptions {
  accessToken?: string | null;
  spreadsheetId?: string;
  sheetGid?: number;
}

/**
 * Fallback CSV fetcher used strictly before Google Workspace authentication is established.
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
        cache: 'no-store',
        headers: {
          Accept: 'text/csv, text/plain, */*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const headerDate = response.headers.get('last-modified') || response.headers.get('date');
        const csvText = await response.text();

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
 * Loads model datasets.
 * - When an OAuth accessToken is provided, fetches directly via Google Sheets API v4 (no CSV).
 * - Otherwise falls back to public CSV / embedded snapshot so charts still render before sign-in.
 */
export async function loadModelsData(options: LoadModelsOptions = {}): Promise<LoadedDatasets> {
  const { accessToken, spreadsheetId = DEFAULT_SPREADSHEET_ID, sheetGid = MAIN_SHEET_GID } = options;
  const now = new Date();

  if (accessToken) {
    try {
      const meta = await fetchSpreadsheetMetadata(spreadsheetId, accessToken);
      const tab = resolveSheetTab(meta, sheetGid);
      const rows = await fetchSheetValues(spreadsheetId, tab.title, accessToken, 'FORMATTED_VALUE');

      const allModels = parseAllModelsFromRows(rows);
      const newModels = parseModelDatasetFromRows(rows, 'new');
      const oldModels = parseModelDatasetFromRows(rows, 'old');
      const worstCaseModels = parseModelDatasetFromRows(rows, 'worstCase');
      const sheetFileDate = extractSheetDateFromRows(rows);
      const headerMeta = extractHeaderMetadataFromRows(rows);
      const notesMeta = extractCsvNotesMetadataFromRows(rows);
      const structure = findSheetStructuralRows(rows);
      const columnLayout = detectSheetColumns(rows);

      if (newModels.length === 0 && oldModels.length === 0 && worstCaseModels.length === 0 && allModels.length === 0) {
        throw new Error(`No model records found in sheet "${tab.title}".`);
      }

      return {
        models: newModels,
        allModels,
        newModels,
        oldModels,
        worstCaseModels,
        sheetFileDate,
        sheetHeaderDate: null,
        lastSyncedAt: now,
        isLive: true,
        dataSource: 'sheets_api',
        spreadsheetId: meta.spreadsheetId,
        spreadsheetTitle: meta.title,
        activeSheetId: tab.sheetId,
        activeSheetTitle: tab.title,
        historyStartRow: structure.historyStartRow,
        sourcesNotesRow: structure.sourcesNotesRow,
        notesRow: structure.notesRow,
        rawRows: rows,
        columnLayout,
        error: null,
        headerMeta,
        notesMeta,
      };
    } catch (err) {
      const isAuthError = err instanceof GoogleSheetsApiError && err.isAuthError;
      const errMsg = err instanceof Error ? err.message : 'Google Sheets API error';
      console.warn('Google Sheets API load failed, using fallback snapshot:', err);

      const fallbackAll = parseAllModels(FALLBACK_CSV_CONTENT);
      const fallbackNew = parseModelDataset(FALLBACK_CSV_CONTENT, 'new');
      const fallbackOld = parseModelDataset(FALLBACK_CSV_CONTENT, 'old');
      const fallbackWorstCase = parseModelDataset(FALLBACK_CSV_CONTENT, 'worstCase');
      const sheetFileDate = extractSheetDate(FALLBACK_CSV_CONTENT);
      const headerMeta = extractHeaderMetadata(FALLBACK_CSV_CONTENT);
      const notesMeta = extractCsvNotesMetadata(FALLBACK_CSV_CONTENT);
      const fallbackRows = parseCsvRows(FALLBACK_CSV_CONTENT);
      const columnLayout = detectSheetColumns(fallbackRows);

      return {
        models: fallbackNew,
        allModels: fallbackAll,
        newModels: fallbackNew,
        oldModels: fallbackOld,
        worstCaseModels: fallbackWorstCase,
        sheetFileDate,
        sheetHeaderDate: null,
        lastSyncedAt: now,
        isLive: false,
        dataSource: 'fallback',
        spreadsheetId,
        columnLayout,
        error: errMsg,
        authError: isAuthError,
        headerMeta,
        notesMeta,
      };
    }
  }

  const { csvText, isLive, headerDate } = await fetchLiveCsv();
  try {
    const allModels = parseAllModels(csvText);
    const newModels = parseModelDataset(csvText, 'new');
    const oldModels = parseModelDataset(csvText, 'old');
    const worstCaseModels = parseModelDataset(csvText, 'worstCase');
    const sheetFileDate = extractSheetDate(csvText);
    const headerMeta = extractHeaderMetadata(csvText);
    const notesMeta = extractCsvNotesMetadata(csvText);
    const parsedRows = parseCsvRows(csvText);
    const columnLayout = detectSheetColumns(parsedRows);

    if (newModels.length === 0 && oldModels.length === 0 && worstCaseModels.length === 0 && allModels.length === 0) {
      throw new Error('Keine Datensätze gefunden');
    }

    return {
      models: newModels,
      allModels,
      newModels,
      oldModels,
      worstCaseModels,
      sheetFileDate,
      sheetHeaderDate: headerDate,
      lastSyncedAt: now,
      isLive,
      dataSource: isLive ? 'csv' : 'fallback',
      spreadsheetId,
      columnLayout,
      error: null,
      headerMeta,
      notesMeta,
    };
  } catch (err) {
    const fallbackAll = parseAllModels(FALLBACK_CSV_CONTENT);
    const fallbackNew = parseModelDataset(FALLBACK_CSV_CONTENT, 'new');
    const fallbackOld = parseModelDataset(FALLBACK_CSV_CONTENT, 'old');
    const fallbackWorstCase = parseModelDataset(FALLBACK_CSV_CONTENT, 'worstCase');
    const sheetFileDate = extractSheetDate(FALLBACK_CSV_CONTENT);
    const headerMeta = extractHeaderMetadata(FALLBACK_CSV_CONTENT);
    const notesMeta = extractCsvNotesMetadata(FALLBACK_CSV_CONTENT);
    const columnLayout = detectSheetColumns(parseCsvRows(FALLBACK_CSV_CONTENT));

    return {
      models: fallbackNew,
      allModels: fallbackAll,
      newModels: fallbackNew,
      oldModels: fallbackOld,
      worstCaseModels: fallbackWorstCase,
      sheetFileDate,
      sheetHeaderDate: null,
      lastSyncedAt: now,
      isLive: false,
      dataSource: 'fallback',
      spreadsheetId,
      columnLayout,
      error: err instanceof Error ? err.message : 'Parser-Fehler',
      headerMeta,
      notesMeta,
    };
  }
}
