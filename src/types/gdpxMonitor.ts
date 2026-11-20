export type GdpxDiffStatus =
  | 'new_unmatched'
  | 'missing'
  | 'overwrite_estimate'
  | 'changed'
  | 'unchanged'
  | 'ignored';

export interface GdpxLeaderboardModel {
  id: string;
  name: string;
  lab: string;
  openWeights: boolean;
  harness: string;
  reasoning: string;
  score: number;
  costPerTask: number | null;
  tokensPerTask: number | null;
  rank: number;
  isNewToSource: boolean;
}

export interface GdpxSheetModelSnapshot {
  id: string;
  name: string;
  displayName: string;
  companyName: string;
  releaseDate: string;
  sheetRowNumber: number;
  colJ: number | null;
}

export interface GdpxDiffItem {
  gdpxId: string;
  gdpxName: string;
  lab: string;
  harness: string;
  reasoning: string;
  openWeights: boolean;
  rank: number;
  liveScore: number;
  costPerTask: number | null;
  status: GdpxDiffStatus;
  matchedModelId: string | null;
  matchedDisplayName: string | null;
  sheetRowNumber: number | null;
  currentColJ: number | null;
  reason: string;
}

export interface GdpxCheckReport {
  checkedAt: string;
  nextCheckDueAt: string;
  sourceUpdatedAt: string | null;
  sourceUrl: string;
  totalSourceModels: number;
  baselineKnownCount: number;
  newlyDiscoveredSourceIds: string[];
  trigger: 'manual' | 'daily_auto';
  models: GdpxLeaderboardModel[];
  diffs: GdpxDiffItem[];
  unmatchedCount: number;
  missingCount: number;
  overwriteEstimateCount: number;
  changedCount: number;
  unchangedCount: number;
  ignoredCount?: number;
  actionableCount: number;
  summaryDe: string;
  summaryEn: string;
}

export interface GdpxMonitorStatusResponse {
  report: GdpxCheckReport | null;
  isDue: boolean;
  isRunning: boolean;
  checkIntervalHours: number;
  lastError: string | null;
}
