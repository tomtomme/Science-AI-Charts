import { ModelRecord } from '../types';
import {
  GdpxCheckReport,
  GdpxMonitorStatusResponse,
  GdpxSheetModelSnapshot,
} from '../types/gdpxMonitor';
import { createMonitorApiClient } from './monitorApiClient';

export const GDPX_COL_INDEX = 9; // Default Column J (0-based index 9)

export function extractGdpxSheetSnapshots(
  models: ModelRecord[],
  boldMask?: boolean[][],
  colIndex: number = GDPX_COL_INDEX,
  minHistoryRow: number = 36
): GdpxSheetModelSnapshot[] {
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
        colJ: typeof m.rawScores.trickQuestions === 'number' ? m.rawScores.trickQuestions : null,
        colJIsBold: typeof maskCell === 'boolean' ? maskCell : null,
      };
    });
}

export const gdpxMonitorApi = createMonitorApiClient<
  GdpxMonitorStatusResponse,
  GdpxCheckReport,
  GdpxSheetModelSnapshot
>('/api/gdpx-monitor');

export const fetchGdpxMonitorStatus = gdpxMonitorApi.fetchStatus;
export const triggerGdpxCheck = gdpxMonitorApi.triggerCheck;
export const updateGdpxPreferencesApi = gdpxMonitorApi.updatePreferences;
