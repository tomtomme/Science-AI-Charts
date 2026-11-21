import { ModelRecord } from '../types';
import { ManualRowMapping } from '../types/integrityMonitor';
import {
  SimpleBenchCheckReport,
  SimpleBenchMonitorStatusResponse,
  SimpleBenchSheetModelSnapshot,
} from '../types/simpleBenchMonitor';
import { StaticPreviewApiError } from './pricingMonitorService';

export const DEFAULT_SIMPLEBENCH_COL_INDEX = 24; // Column Y (0-based index 24 when Col U US pricing is present)

export function extractSimpleBenchSheetSnapshots(
  models: ModelRecord[],
  boldMask?: boolean[][],
  colIndex: number = DEFAULT_SIMPLEBENCH_COL_INDEX
): SimpleBenchSheetModelSnapshot[] {
  return models
    .filter((m) => typeof m.sheetRowNumber === 'number' && m.sheetRowNumber >= 36)
    .map((m) => {
      const rowNum = m.sheetRowNumber as number;
      const rawVal = m.rawScores.trickQuestionsOld;
      const colY =
        typeof rawVal === 'number' && Number.isFinite(rawVal)
          ? Math.round(rawVal * 10) / 10
          : null;
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

export async function fetchSimpleBenchMonitorStatus(): Promise<SimpleBenchMonitorStatusResponse> {
  const res = await fetch('/api/simplebench-monitor/status');
  return parseJsonResponse<SimpleBenchMonitorStatusResponse>(res);
}

export async function triggerSimpleBenchCheck(
  models: SimpleBenchSheetModelSnapshot[] = [],
  trigger: 'manual' | 'daily_auto' = 'manual'
): Promise<SimpleBenchCheckReport> {
  const res = await fetch('/api/simplebench-monitor/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ models, trigger }),
  });
  const data = await parseJsonResponse<{ report: SimpleBenchCheckReport }>(res);
  return data.report;
}

export async function updateSimpleBenchPreferencesApi(options: {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  models?: SimpleBenchSheetModelSnapshot[];
}): Promise<SimpleBenchCheckReport | null> {
  const res = await fetch('/api/simplebench-monitor/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
  const data = await parseJsonResponse<{ report: SimpleBenchCheckReport | null }>(res);
  return data.report;
}
