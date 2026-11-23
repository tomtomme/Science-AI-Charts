import { ModelRecord } from '../types';
import {
  ValsCheckReport,
  ValsMonitorStatusResponse,
  ValsSheetModelSnapshot,
} from '../types/valsMonitor';
import { createMonitorApiClient } from './monitorApiClient';

export const VALS_COL_INDEX = 10; // Default Column K (0-based index 10)

export function extractValsSheetSnapshots(
  models: ModelRecord[],
  boldMask?: boolean[][],
  colIndex: number = VALS_COL_INDEX,
  minHistoryRow: number = 36
): ValsSheetModelSnapshot[] {
  return models
    .filter((m) => typeof m.sheetRowNumber === 'number' && m.sheetRowNumber >= minHistoryRow)
    .map((m) => {
      const rowNum = m.sheetRowNumber as number;
      const maskCell = boldMask?.[rowNum - 1]?.[colIndex];
      return {
        id: m.id,
        name: m.name,
        displayName: m.displayName,
        companyName: m.companyName,
        releaseDate: m.releaseDate,
        sheetRowNumber: rowNum,
        colK: typeof m.rawScores.econLegal === 'number' ? m.rawScores.econLegal : null,
        colKIsBold: typeof maskCell === 'boolean' ? maskCell : null,
      };
    });
}

export const valsMonitorApi = createMonitorApiClient<
  ValsMonitorStatusResponse,
  ValsCheckReport,
  ValsSheetModelSnapshot
>('/api/vals-monitor');

export const fetchValsMonitorStatus = valsMonitorApi.fetchStatus;
export const triggerValsCheck = valsMonitorApi.triggerCheck;
export const updateValsPreferencesApi = valsMonitorApi.updatePreferences;
