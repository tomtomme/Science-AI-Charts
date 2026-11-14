import { ModelRecord } from '../types';
import {
  ModelPricingSnapshot,
  PricingCheckReport,
  PricingMonitorStatusResponse,
} from '../types/pricingMonitor';

const MONITORED_LAB_KEYWORDS = ['openai', 'anthropic', 'google', 'meta'];

export function isMonitoredLabCompany(companyName: string): boolean {
  const low = (companyName || '').toLowerCase();
  return MONITORED_LAB_KEYWORDS.some((kw) => low.includes(kw));
}

export function extractMonitoredModelSnapshots(models: ModelRecord[]): ModelPricingSnapshot[] {
  return models
    .filter(
      (m) =>
        typeof m.sheetRowNumber === 'number' &&
        m.sheetRowNumber >= 36 &&
        isMonitoredLabCompany(m.companyName) &&
        m.isAvailable &&
        (m.isPaid || Boolean(m.priceDeMonthly) || Boolean(m.priceUsMonthly))
    )
    .map((m) => ({
      id: m.id,
      displayName: m.displayName,
      companyName: m.companyName,
      sheetRowNumber: m.sheetRowNumber as number,
      isAvailable: m.isAvailable,
      isPaid: m.isPaid,
      priceDeMonthly: m.priceDeMonthly,
      priceUsMonthly: m.priceUsMonthly,
    }));
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Pricing monitor API is unavailable in static preview mode. Run with the full-stack server.'
    );
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
  }
  return data as T;
}

export async function fetchPricingMonitorStatus(): Promise<PricingMonitorStatusResponse> {
  const res = await fetch('/api/pricing-monitor/status');
  return parseJsonResponse<PricingMonitorStatusResponse>(res);
}

export async function triggerPricingCheck(
  models: ModelPricingSnapshot[],
  trigger: 'manual' | 'daily_auto' = 'manual'
): Promise<PricingCheckReport> {
  const res = await fetch('/api/pricing-monitor/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ models, trigger }),
  });
  const data = await parseJsonResponse<{ report: PricingCheckReport }>(res);
  return data.report;
}
