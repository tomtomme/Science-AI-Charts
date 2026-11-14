export type MonitoredLab = 'OpenAI' | 'Anthropic' | 'Google' | 'Meta';

export type PriceDiffStatus = 'changed' | 'missing' | 'unchanged';

export interface LabPlanInfo {
  lab: MonitoredLab;
  planName: string;
  tierKey: 'standard' | 'pro' | 'ultra' | 'free';
  usMonthly: string;
  deMonthly: string;
  billingNotes: string;
  sourceUrl?: string;
}

export interface ModelPricingSnapshot {
  id: string;
  displayName: string;
  companyName: string;
  sheetRowNumber: number;
  isAvailable: boolean;
  isPaid: boolean;
  priceDeMonthly?: string;
  priceUsMonthly?: string;
}

export interface PricingDiffItem {
  modelId: string;
  displayName: string;
  lab: MonitoredLab;
  sheetRowNumber: number;
  isAvailable: boolean;
  matchedPlanName: string;
  currentDe: string;
  liveDe: string;
  deStatus: PriceDiffStatus;
  currentUs: string;
  liveUs: string;
  usStatus: PriceDiffStatus;
  reason: string;
  sourceUrl?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface PricingCheckReport {
  checkedAt: string;
  nextCheckDueAt: string;
  trigger: 'manual' | 'daily_auto';
  labs: LabPlanInfo[];
  diffs: PricingDiffItem[];
  changedCount: number;
  missingCount: number;
  unchangedCount: number;
  summaryDe: string;
  summaryEn: string;
  sources: GroundingSource[];
}

export interface PricingMonitorStatusResponse {
  report: PricingCheckReport | null;
  isDue: boolean;
  isRunning: boolean;
  checkIntervalHours: number;
  hasGeminiKey: boolean;
  lastError: string | null;
}
