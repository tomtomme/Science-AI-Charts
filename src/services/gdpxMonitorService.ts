import { ModelRecord } from '../types';
import {
  GdpxCheckReport,
  GdpxMonitorStatusResponse,
  GdpxSheetModelSnapshot,
} from '../types/gdpxMonitor';
import { ManualRowMapping } from '../types/integrityMonitor';
import { StaticPreviewApiError } from './pricingMonitorService';

export function extractGdpxSheetSnapshots(models: ModelRecord[]): GdpxSheetModelSnapshot[] {
  return models
    .filter((m) => typeof m.sheetRowNumber === 'number' && m.sheetRowNumber >= 36)
    .map((m) => ({
      id: m.id,
      name: m.name,
      displayName: m.displayName,
      companyName: m.companyName,
      releaseDate: m.releaseDate,
      sheetRowNumber: m.sheetRowNumber as number,
      colJ: typeof m.rawScores.trickQuestions === 'number' ? m.rawScores.trickQuestions : null,
    }));
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

export async function fetchGdpxMonitorStatus(): Promise<GdpxMonitorStatusResponse> {
  const res = await fetch('/api/gdpx-monitor/status');
  return parseJsonResponse<GdpxMonitorStatusResponse>(res);
}

export async function triggerGdpxCheck(
  models: GdpxSheetModelSnapshot[] = [],
  trigger: 'manual' | 'daily_auto' = 'manual'
): Promise<GdpxCheckReport> {
  const res = await fetch('/api/gdpx-monitor/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ models, trigger }),
  });
  const data = await parseJsonResponse<{ report: GdpxCheckReport }>(res);
  return data.report;
}

export async function updateGdpxPreferencesApi(options: {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  models?: GdpxSheetModelSnapshot[];
}): Promise<GdpxCheckReport | null> {
  const res = await fetch('/api/gdpx-monitor/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
  const data = await parseJsonResponse<{ report: GdpxCheckReport | null }>(res);
  return data.report;
}
