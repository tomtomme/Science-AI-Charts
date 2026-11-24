export type IntegrityDiffStatus =
  | 'new_unmatched'
  | 'missing'
  | 'overwrite_estimate'
  | 'changed'
  | 'unchanged'
  | 'ignored';

export interface ManualRowMapping {
  sheetRowNumber: number;
  matchedModelId?: string;
  matchedDisplayName?: string;
}

export interface IntegrityLeaderboardModel {
  id: string;
  name: string;
  rank: number;
  score: number;
  scoreDecimals?: number;
  scoreError: number | null;
  accuracy: number | null;
  accuracyError: number | null;
  isSiteNew: boolean;
  isNewToSource: boolean;
}

export interface IntegritySheetModelSnapshot {
  id: string;
  name: string;
  displayName: string;
  companyName: string;
  releaseDate: string;
  sheetRowNumber: number;
  colAN: number | null;
  colANIsBold: boolean | null;
}

export interface IntegrityDiffItem {
  integrityId: string;
  integrityName: string;
  rank: number;
  liveScore: number;
  scoreDecimals?: number;
  scoreError: number | null;
  accuracy: number | null;
  isSiteNew: boolean;
  isNewToSource: boolean;
  status: IntegrityDiffStatus;
  matchedModelId: string | null;
  matchedDisplayName: string | null;
  sheetRowNumber: number | null;
  currentColAN: number | null;
  currentColANIsBold: boolean | null;
  reason: string;
}

export interface IntegrityCheckReport {
  checkedAt: string;
  nextCheckDueAt: string;
  sourceUpdatedAt: string | null;
  sourceUrl: string;
  totalSourceModels: number;
  baselineKnownCount: number;
  newlyDiscoveredSourceIds: string[];
  trigger: 'manual' | 'daily_auto';
  models: IntegrityLeaderboardModel[];
  diffs: IntegrityDiffItem[];
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

export interface IntegrityMonitorStatusResponse {
  report: IntegrityCheckReport | null;
  isDue: boolean;
  isRunning: boolean;
  checkIntervalHours: number;
  lastError: string | null;
}
