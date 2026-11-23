import { ModelRecord } from '../types';
import {
  SimpleBenchCheckReport,
  SimpleBenchMonitorStatusResponse,
  SimpleBenchSheetModelSnapshot,
} from '../types/simpleBenchMonitor';
import { createMonitorApiClient } from './monitorApiClient';

export const DEFAULT_SIMPLEBENCH_COL_INDEX = 24; // Column Y (0-based index 24 when Col U US pricing is present)

export function extractSimpleBenchSheetSnapshots(
  models: ModelRecord[],
  boldMask?: boolean[][],
  colIndex: number = DEFAULT_SIMPLEBENCH_COL_INDEX,
  minHistoryRow: number = 36
): SimpleBenchSheetModelSnapshot[] {
  return models
    .filter((m) => typeof m.sheetRowNumber === 'number' && m.sheetRowNumber >= minHistoryRow)
    .map((m) => {
      const rowNum = m.sheetRowNumber as number;
      const rawVal = m.rawScores.trickQuestionsOld;
      const colY = typeof rawVal === 'number' && Number.isFinite(rawVal) ? rawVal : null;
      const maskCell = boldMask?.[rowNum - 1]?.[colIndex];
      return {
        id: m.id,
        name: m.name,
        displayName: m.displayName,
        companyName: m.companyName,
        releaseDate: m.releaseDate,
        sheetRowNumber: rowNum,
        colY,
        colYIsBold: typeof maskCell === 'boolean' ? maskCell : null,
      };
    });
}

export const simpleBenchMonitorApi = createMonitorApiClient<
  SimpleBenchMonitorStatusResponse,
  SimpleBenchCheckReport,
  SimpleBenchSheetModelSnapshot
>('/api/simplebench-monitor');

export const fetchSimpleBenchMonitorStatus = simpleBenchMonitorApi.fetchStatus;
export const triggerSimpleBenchCheck = simpleBenchMonitorApi.triggerCheck;
export const updateSimpleBenchPreferencesApi = simpleBenchMonitorApi.updatePreferences;
