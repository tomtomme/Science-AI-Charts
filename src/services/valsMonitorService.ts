import { ModelRecord } from '../types';
import { ManualRowMapping } from '../types/integrityMonitor';
import {
  ValsCheckReport,
  ValsMonitorStatusResponse,
  ValsSheetModelSnapshot,
} from '../types/valsMonitor';
import { StaticPreviewApiError } from './pricingMonitorService';

export const VALS_COL_INDEX = 10; // Column K (0-based index 10)

export function extractValsSheetSnapshots(
  models: ModelRecord[],
  boldMask?: boolean[][]
): ValsSheetModelSnapshot[] {
  return models
    .filter((m) => typeof m.sheetRowNumber === 'number' && m.sheetRowNumber >= 36)
    .map((m) => {
      const rowNum = m.sheetRowNumber as number;
      const maskCell = boldMask?.[rowNum - 1]?.[VALS_COL_INDEX];
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

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new StaticPreviewApiError();
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
  }
  return data as T;
}

export async function fetchValsMonitorStatus(): Promise<ValsMonitorStatusResponse> {
  const res = await fetch('/api/vals-monitor/status');
  return parseJsonResponse<ValsMonitorStatusResponse>(res);
}

export async function triggerValsCheck(
  models: ValsSheetModelSnapshot[] = [],
  trigger: 'manual' | 'daily_auto' = 'manual'
): Promise<ValsCheckReport> {
  const res = await fetch('/api/vals-monitor/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ models, trigger }),
  });
  const data = await parseJsonResponse<{ report: ValsCheckReport }>(res);
  return data.report;
}

export async function updateValsPreferencesApi(options: {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  models?: ValsSheetModelSnapshot[];
}): Promise<ValsCheckReport | null> {
  const res = await fetch('/api/vals-monitor/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
  const data = await parseJsonResponse<{ report: ValsCheckReport | null }>(res);
  return data.report;
}
