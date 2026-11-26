import type { ManualRowMapping } from './integrityMonitor';

export type AaMetricKey =
  | 'iq'
  | 'nonHallucination'
  | 'accuracy'
  | 'mmmuPro'
  | 'mlcr'
  | 'excelAgent';

export const AA_METRIC_KEYS: AaMetricKey[] = [
  'iq',
  'nonHallucination',
  'accuracy',
  'mmmuPro',
  'mlcr',
  'excelAgent',
];

export interface AaMetricValues {
  iq: number | null;
  nonHallucination: number | null;
  accuracy: number | null;
  mmmuPro: number | null;
  mlcr: number | null;
  excelAgent: number | null;
}

export interface AaMetricBoldMask {
  iq: boolean | null;
  nonHallucination: boolean | null;
  accuracy: boolean | null;
  mmmuPro: boolean | null;
  mlcr: boolean | null;
  excelAgent: boolean | null;
}

export interface AaLeaderboardModel {
  id: string;
  name: string;
  shortName: string;
  suffix: string;
  releaseSlug: string;
  releaseName: string;
  creator: string;
  deprecated: boolean;
  isReasoning: boolean;
  isOpenWeights: boolean;
  contextWindowTokens: number | null;
  price1mInputTokens: number | null;
  price1mOutputTokens: number | null;
  scores: AaMetricValues;
  rank: number;
  isNewToSource: boolean;
}

export interface AaSheetModelSnapshot {
  id: string;
  name: string;
  displayName: string;
  aaModelName?: string; // Exact Artificial Analysis model name from Column AH (if present)
  companyName: string;
  releaseDate: string;
  sheetRowNumber: number;
  scores: AaMetricValues;
  boldMask: AaMetricBoldMask;
}

export type AaMetricDiffStatus =
  | 'missing'
  | 'overwrite_estimate'
  | 'changed'
  | 'unchanged'
  | 'unavailable';

export interface AaMetricDiffItem {
  metric: AaMetricKey;
  liveScore: number | null;
  currentScore: number | null;
  currentIsBold: boolean | null;
  status: AaMetricDiffStatus;
}

export type AaDiffStatus =
  | 'new_unmatched'
  | 'missing'
  | 'overwrite_estimate'
  | 'changed'
  | 'unchanged'
  | 'ignored';

export interface AaDiffItem {
  aaId: string;
  aaName: string;
  releaseSlug: string;
  releaseName: string;
  suffix: string;
  creator: string;
  isOpenWeights: boolean;
  rank: number;
  liveScores: AaMetricValues;
  status: AaDiffStatus;
  matchSource?: 'manual' | 'col_ah' | 'auto';
  matchedModelId: string | null;
  matchedDisplayName: string | null;
  sheetRowNumber: number | null;
  metricDiffs: AaMetricDiffItem[];
  actionableMetricCount: number;
  reason: string;
}

export interface AaCheckReport {
  checkedAt: string;
  nextCheckDueAt: string;
  sourceUpdatedAt: string | null;
  sourceUrl: string;
  totalSourceModels: number;
  totalUniqueReleases: number;
  baselineKnownCount: number;
  newlyDiscoveredSourceIds: string[];
  trigger: 'manual' | 'daily_auto';
  models: AaLeaderboardModel[];
  diffs: AaDiffItem[];
  unmatchedCount: number;
  missingCount: number;
  overwriteEstimateCount: number;
  changedCount: number;
  unchangedCount: number;
  ignoredCount?: number;
  actionableCount: number;
  ignoredIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  summaryDe: string;
  summaryEn: string;
}

export interface AaMonitorStatusResponse {
  report: AaCheckReport | null;
  isDue: boolean;
  isRunning: boolean;
  checkIntervalHours: number;
  lastError: string | null;
}

export interface ResearchedBenchmarkCell {
  value: number | null;
  isOfficial: boolean;
  source?: string;
}

export interface NewModelRowDraft {
  sourceMonitor: 'aa' | 'gdpx' | 'vals' | 'simpleBench' | 'integrity';
  sourceId: string;
  sourceName: string;
  canonicalName: string;
  displayNameColB: string;
  companyName: string;
  countryFlag: string;
  releaseDate: string;
  isPaidOnly: boolean;
  hasFreeApi: boolean;
  isOpenWeights: boolean;
  storyline: string;
  chatLink: string;
  apiLink: string;
  priceDeMonthly: string;
  priceUsMonthly: string;
  benchmarks: {
    iq: ResearchedBenchmarkCell;
    nonHallucination: ResearchedBenchmarkCell;
    accuracy: ResearchedBenchmarkCell;
    mmmuPro: ResearchedBenchmarkCell;
    mlcr: ResearchedBenchmarkCell;
    excelAgent: ResearchedBenchmarkCell;
    gdpx: ResearchedBenchmarkCell;
    vals: ResearchedBenchmarkCell;
    simpleBench: ResearchedBenchmarkCell;
    integrity: ResearchedBenchmarkCell;
  };
  researchTier: 'gemini_grounded' | 'gemini_free' | 'deterministic';
  researchNote?: string;
  sources: Array<{ title: string; uri: string }>;
}

export interface ModelResearchRequest {
  sourceMonitor: 'aa' | 'gdpx' | 'vals' | 'simpleBench' | 'integrity';
  sourceId: string;
  modelName: string;
  creatorHint?: string;
  releaseDateHint?: string;
  isOpenWeightsHint?: boolean;
  knownScores?: Partial<Record<keyof NewModelRowDraft['benchmarks'], number | null>>;
  existingCompanies?: Array<{ name: string; flag: string; domain?: string }>;
}
