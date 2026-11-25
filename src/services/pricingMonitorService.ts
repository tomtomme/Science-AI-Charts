import { ModelRecord } from '../types';
import {
  ModelPricingSnapshot,
  PricingCheckReport,
  PricingMonitorStatusResponse,
} from '../types/pricingMonitor';
import { isStarterSubscriptionFreeModel } from '../utils/starterPlanPricing';

const MONITORED_LAB_KEYWORDS = [
  'openai',
  'anthropic',
  'google',
  'meta',
  'xai',
  'spacex',
  'grok',
  'moonshot',
  'kimi',
];

export function isIgnoredPricingMonitorModel(displayName: string): boolean {
  return /\bgpt[-\s]?4[-\s]?turbo\b/i.test(displayName || '');
}

export function isMonitoredLabCompany(companyName: string): boolean {
  const low = (companyName || '').toLowerCase();
  return MONITORED_LAB_KEYWORDS.some((kw) => low.includes(kw));
}

function isReleasedModel(m: ModelRecord): boolean {
  return (
    m.hasConcreteReleaseDate ||
    m.scoreNew !== null ||
    m.scoreOld !== null ||
    m.scoreWorstCase !== null
  );
}

export function extractMonitoredModelSnapshots(
  models: ModelRecord[],
  minHistoryRow: number = 36
): ModelPricingSnapshot[] {
  return models
    .filter(
      (m) =>
        typeof m.sheetRowNumber === 'number' &&
        m.sheetRowNumber >= minHistoryRow &&
        isMonitoredLabCompany(m.companyName) &&
        !isIgnoredPricingMonitorModel(m.displayName) &&
        m.isAvailable &&
        (m.isPaid ||
          Boolean(m.priceDeMonthly) ||
          Boolean(m.priceUsMonthly) ||
          (isReleasedModel(m) &&
            isStarterSubscriptionFreeModel(m.companyName, m.displayName, m.isPaid, m.name)))
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

export class StaticPreviewApiError extends Error {
  readonly isStaticPreview = true;
  constructor() {
    super('Pricing monitor API is unavailable in static preview mode. Run with the full-stack server.');
    this.name = 'StaticPreviewApiError';
  }
}

export function isStaticPreviewError(err: unknown): boolean {
  return err instanceof StaticPreviewApiError || (err as { isStaticPreview?: boolean })?.isStaticPreview === true;
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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ models, trigger }),
  });
  const data = await parseJsonResponse<{ report: PricingCheckReport }>(res);
  return data.report;
}
