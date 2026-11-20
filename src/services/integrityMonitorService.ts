import { ModelRecord } from '../types';
import {
  IntegrityCheckReport,
  IntegrityMonitorStatusResponse,
  IntegritySheetModelSnapshot,
  ManualRowMapping,
} from '../types/integrityMonitor';
import { StaticPreviewApiError } from './pricingMonitorService';

export const INTEGRITY_COL_INDEX = 39; // Column AN (0-based index 39)

export function parseIntegrityCellNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/\s+/g, '').replace(',', '.').replace(/%$/, '');
  if (!clean || clean === '-' || clean === '—' || !/^-?\d+(\.\d+)?$/.test(clean)) {
    return null;
  }
  const num = Number(clean);
  return Number.isFinite(num) ? Math.round(num * 10) / 10 : null;
}

export function extractIntegritySheetSnapshots(
  models: ModelRecord[],
  rawRows?: string[][]
): IntegritySheetModelSnapshot[] {
  return models
    .filter((m) => typeof m.sheetRowNumber === 'number' && m.sheetRowNumber >= 36)
    .map((m) => {
      const rowNum = m.sheetRowNumber as number;
      const rawCell = rawRows?.[rowNum - 1]?.[INTEGRITY_COL_INDEX];
      return {
        id: m.id,
        name: m.name,
        displayName: m.displayName,
        companyName: m.companyName,
        releaseDate: m.releaseDate,
        sheetRowNumber: rowNum,
        colAN: parseIntegrityCellNumber(rawCell),
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

export async function fetchIntegrityMonitorStatus(): Promise<IntegrityMonitorStatusResponse> {
  const res = await fetch('/api/integrity-monitor/status');
  return parseJsonResponse<IntegrityMonitorStatusResponse>(res);
}

export async function triggerIntegrityCheck(
  models: IntegritySheetModelSnapshot[] = [],
  trigger: 'manual' | 'daily_auto' = 'manual'
): Promise<IntegrityCheckReport> {
  const res = await fetch('/api/integrity-monitor/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ models, trigger }),
  });
  const data = await parseJsonResponse<{ report: IntegrityCheckReport }>(res);
  return data.report;
}

export async function updateIntegrityPreferencesApi(options: {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  models?: IntegritySheetModelSnapshot[];
}): Promise<IntegrityCheckReport | null> {
  const res = await fetch('/api/integrity-monitor/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
  const data = await parseJsonResponse<{ report: IntegrityCheckReport | null }>(res);
  return data.report;
}
