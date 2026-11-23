import { ModelRecord } from '../types';
import {
  IntegrityCheckReport,
  IntegrityMonitorStatusResponse,
  IntegritySheetModelSnapshot,
} from '../types/integrityMonitor';
import { createMonitorApiClient } from './monitorApiClient';

export const INTEGRITY_COL_INDEX = 39; // Default Column AN (0-based index 39)

export function parseIntegrityCellNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/\s+/g, '').replace(',', '.').replace(/%$/, '');
  if (!clean || clean === '-' || clean === '—' || !/^-?\d+(\.\d+)?$/.test(clean)) {
    return null;
  }
  const num = Number(clean);
  return Number.isFinite(num) ? num : null;
}

export function extractIntegritySheetSnapshots(
  models: ModelRecord[],
  rawRows?: string[][],
  boldMask?: boolean[][],
  colIndex: number = INTEGRITY_COL_INDEX,
  minHistoryRow: number = 36
): IntegritySheetModelSnapshot[] {
  return models
    .filter((m) => typeof m.sheetRowNumber === 'number' && m.sheetRowNumber >= minHistoryRow)
    .map((m) => {
      const rowNum = m.sheetRowNumber as number;
      const rawCell = rawRows?.[rowNum - 1]?.[colIndex];
      const maskCell = boldMask?.[rowNum - 1]?.[colIndex];
      return {
        id: m.id,
        name: m.name,
        displayName: m.displayName,
        companyName: m.companyName,
        releaseDate: m.releaseDate,
        sheetRowNumber: rowNum,
        colAN: parseIntegrityCellNumber(rawCell),
        colANIsBold: typeof maskCell === 'boolean' ? maskCell : null,
      };
    });
}

export const integrityMonitorApi = createMonitorApiClient<
  IntegrityMonitorStatusResponse,
  IntegrityCheckReport,
  IntegritySheetModelSnapshot
>('/api/integrity-monitor');

export const fetchIntegrityMonitorStatus = integrityMonitorApi.fetchStatus;
export const triggerIntegrityCheck = integrityMonitorApi.triggerCheck;
export const updateIntegrityPreferencesApi = integrityMonitorApi.updatePreferences;
