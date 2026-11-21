export type SimpleBenchDiffStatus =
  | 'new_unmatched'
  | 'missing'
  | 'overwrite_estimate'
  | 'changed'
  | 'unchanged'
  | 'ignored';

export interface SimpleBenchLeaderboardModel {
  id: string;
  name: string;
  organization: string;
  rank: number;
  rankLabel: string;
  score: number; // 1-decimal percentage (e.g. 94.9)
  dateAdded: string | null;
  isNewToSource: boolean;
}

export interface SimpleBenchSheetModelSnapshot {
  id: string;
  name: string;
  displayName: string;
  companyName: string;
  releaseDate: string;
  sheetRowNumber: number;
  colY: number | null;
  colYIsBold: boolean | null;
}

export interface SimpleBenchDiffItem {
  simpleBenchId: string;
  simpleBenchName: string;
  organization: string;
  rank: number;
  liveScore: number;
  dateAdded: string | null;
  status: SimpleBenchDiffStatus;
  matchedModelId: string | null;
  matchedDisplayName: string | null;
  sheetRowNumber: number | null;
  currentColY: number | null;
  currentColYIsBold: boolean | null;
  reason: string;
}

export interface SimpleBenchCheckReport {
  checkedAt: string;
  nextCheckDueAt: string;
  sourceUpdatedAt: string | null;
  sourceUrl: string;
  totalSourceModels: number;
  baselineKnownCount: number;
  newlyDiscoveredSourceIds: string[];
  trigger: 'manual' | 'daily_auto';
  models: SimpleBenchLeaderboardModel[];
  diffs: SimpleBenchDiffItem[];
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

export interface SimpleBenchMonitorStatusResponse {
  report: SimpleBenchCheckReport | null;
  isDue: boolean;
  isRunning: boolean;
  checkIntervalHours: number;
  lastError: string | null;
}
