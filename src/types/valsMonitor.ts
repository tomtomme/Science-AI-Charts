export type ValsDiffStatus =
  | 'new_unmatched'
  | 'missing'
  | 'overwrite_estimate'
  | 'changed'
  | 'unchanged'
  | 'ignored';

export interface ValsLeaderboardModel {
  id: string;
  name: string;
  company: string;
  rank: number;
  score: number; // Exact reported accuracy percentage (e.g. 71.31)
  roundedScore: number; // Integer score written to Column K (e.g. 71)
  cost: number | null;
  isNewToSource: boolean;
}

export interface ValsSheetModelSnapshot {
  id: string;
  name: string;
  displayName: string;
  companyName: string;
  releaseDate: string;
  sheetRowNumber: number;
  colK: number | null;
  colKIsBold: boolean | null;
}

export interface ValsDiffItem {
  valsId: string;
  valsName: string;
  company: string;
  rank: number;
  liveScore: number; // Exact Vals accuracy (e.g. 71.31)
  writeScore: number; // Integer Sheet Col K score (e.g. 71)
  status: ValsDiffStatus;
  matchedModelId: string | null;
  matchedDisplayName: string | null;
  sheetRowNumber: number | null;
  currentColK: number | null;
  currentColKIsBold: boolean | null;
  reason: string;
}

export interface ValsCheckReport {
  checkedAt: string;
  nextCheckDueAt: string;
  sourceUpdatedAt: string | null;
  versionLabel: string;
  sourceUrl: string;
  totalSourceModels: number;
  baselineKnownCount: number;
  newlyDiscoveredSourceIds: string[];
  trigger: 'manual' | 'daily_auto';
  models: ValsLeaderboardModel[];
  diffs: ValsDiffItem[];
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

export interface ValsMonitorStatusResponse {
  report: ValsCheckReport | null;
  isDue: boolean;
  isRunning: boolean;
  checkIntervalHours: number;
  lastError: string | null;
}
