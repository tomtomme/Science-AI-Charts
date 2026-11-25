import os from 'node:os';
import path from 'node:path';
import type {
  AaCheckReport,
  AaDiffItem,
  AaDiffStatus,
  AaLeaderboardModel,
  AaMetricDiffItem,
  AaMetricDiffStatus,
  AaMetricKey,
  AaMetricValues,
  AaMonitorStatusResponse,
  AaSheetModelSnapshot,
} from '../src/types/aaMonitor.ts';
import { AA_METRIC_KEYS } from '../src/types/aaMonitor.ts';
import type { ManualRowMapping } from '../src/types/integrityMonitor.ts';
import {
  computeReleaseDateTiebreaker,
  countDiffStatuses,
  createMonitorRuntime,
  fetchTextWithTimeout,
  matchCompanyName,
  reserveManualMappings,
} from './utils/monitorBase.ts';

const AA_LEADERBOARD_URL = 'https://artificialanalysis.ai/leaderboards/models';
const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-aa-monitor-cache-v1.json');

interface RawAaLeaderboardModel {
  id?: string;
  name?: string;
  shortName?: string;
  suffix?: string | null;
  release?: {
    slug?: string;
    name?: string;
  } | null;
  deprecated?: boolean;
  isReasoning?: boolean;
  isOpenWeights?: boolean;
  modelCreatorName?: string;
  contextWindowTokens?: number | null;
  intelligenceIndex?: number | null;
  scores?: Record<string, number | null | undefined> | null;
  price1mInputTokens?: number | null;
  price1mOutputTokens?: number | null;
}

function roundOneDecimal(val: number | null | undefined, multiplyBy100 = false): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  const scaled = multiplyBy100 ? val * 100 : val;
  return Math.round(scaled * 10 + 1e-9) / 10;
}

function countPopulatedMetrics(scores: AaMetricValues): number {
  let count = 0;
  for (const key of AA_METRIC_KEYS) {
    if (scores[key] !== null) count += 1;
  }
  return count;
}

function extractBalancedJsonArray(text: string, arrayStartIdx: number): string | null {
  if (arrayStartIdx < 0 || text[arrayStartIdx] !== '[') return null;
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = arrayStartIdx; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (!inStr) {
      if (ch === '[') depth += 1;
      else if (ch === ']') {
        depth -= 1;
        if (depth === 0) {
          return text.slice(arrayStartIdx, i + 1);
        }
      }
    }
  }
  return null;
}

function extractInitialModelsFromNextHtml(html: string): RawAaLeaderboardModel[] {
  const chunks: string[] = [];
  const pushRegex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let match: RegExpExecArray | null;
  while ((match = pushRegex.exec(html)) !== null) {
    try {
      chunks.push(JSON.parse(`"${match[1]}"`) as string);
    } catch {
      // Ignore malformed individual RSC chunks
    }
  }

  const combined = chunks.join('');
  const marker = '"initialModels":[';
  const markerIdx = combined.indexOf(marker);
  if (markerIdx === -1) {
    throw new Error('Could not locate embedded initialModels dataset on artificialanalysis.ai.');
  }

  const arrayStart = markerIdx + '"initialModels":'.length;
  const jsonText = extractBalancedJsonArray(combined, arrayStart);
  if (!jsonText) {
    throw new Error('Could not parse initialModels JSON array from artificialanalysis.ai.');
  }

  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Artificial Analysis initialModels dataset was empty.');
  }
  return parsed as RawAaLeaderboardModel[];
}

export async function fetchLiveAaLeaderboard(
  previousKnownIds: string[] = []
): Promise<{
  updatedAt: string | null;
  models: AaLeaderboardModel[];
  totalUniqueReleases: number;
  newlyDiscoveredIds: string[];
}> {
  const userAgent =
    'Mozilla/5.0 (compatible; Science-AI-Charts-AAMonitor/1.0; +https://artificialanalysis.ai/leaderboards/models)';
  const html = await fetchTextWithTimeout(
    AA_LEADERBOARD_URL,
    userAgent,
    'text/html,application/xhtml+xml,*/*',
    20000
  );

  const rawModels = extractInitialModelsFromNextHtml(html);
  const prevSet = new Set(previousKnownIds);
  const hasBaseline = prevSet.size > 0;

  const parsed: Omit<AaLeaderboardModel, 'rank'>[] = [];
  const seenIds = new Set<string>();
  const uniqueReleaseSlugs = new Set<string>();

  for (const raw of rawModels) {
    const id = String(raw.id || '').trim();
    const name = String(raw.name || '').trim();
    if (!id || !name || seenIds.has(id)) continue;

    const sc = raw.scores && typeof raw.scores === 'object' ? raw.scores : {};
    const scores: AaMetricValues = {
      iq: roundOneDecimal(raw.intelligenceIndex, false),
      nonHallucination: roundOneDecimal(sc['omniscience-non-hallucination'], true),
      accuracy: roundOneDecimal(sc['omniscience-accuracy'], true),
      mmmuPro: roundOneDecimal(sc['mmmu-pro'], true),
      mlcr: roundOneDecimal(sc['mlcr-aa'], true),
      excelAgent: roundOneDecimal(sc['aa-analyst-agent'], true),
    };

    if (countPopulatedMetrics(scores) === 0) continue;

    seenIds.add(id);
    const releaseSlug = String(raw.release?.slug || id).trim();
    const releaseName = String(raw.release?.name || name).trim();
    if (!raw.deprecated) {
      uniqueReleaseSlugs.add(releaseSlug);
    }

    parsed.push({
      id,
      name,
      shortName: String(raw.shortName || name).trim(),
      suffix: String(raw.suffix || '').trim(),
      releaseSlug,
      releaseName,
      creator: String(raw.modelCreatorName || '').trim(),
      deprecated: Boolean(raw.deprecated),
      isReasoning: Boolean(raw.isReasoning),
      isOpenWeights: Boolean(raw.isOpenWeights),
      contextWindowTokens:
        typeof raw.contextWindowTokens === 'number' && Number.isFinite(raw.contextWindowTokens)
          ? raw.contextWindowTokens
          : null,
      price1mInputTokens:
        typeof raw.price1mInputTokens === 'number' && Number.isFinite(raw.price1mInputTokens)
          ? raw.price1mInputTokens
          : null,
      price1mOutputTokens:
        typeof raw.price1mOutputTokens === 'number' && Number.isFinite(raw.price1mOutputTokens)
          ? raw.price1mOutputTokens
          : null,
      scores,
      isNewToSource: hasBaseline && !prevSet.has(id),
    });
  }

  parsed.sort((a, b) => {
    const iqA = a.scores.iq ?? -1;
    const iqB = b.scores.iq ?? -1;
    if (iqB !== iqA) return iqB - iqA;
    return countPopulatedMetrics(b.scores) - countPopulatedMetrics(a.scores);
  });

  const models: AaLeaderboardModel[] = parsed.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  const newlyDiscoveredIds = models.filter((m) => m.isNewToSource).map((m) => m.id);

  return {
    updatedAt: new Date().toISOString(),
    models,
    totalUniqueReleases: uniqueReleaseSlugs.size,
    newlyDiscoveredIds,
  };
}

type EffortTier = 'max' | 'xhigh' | 'high' | 'medium' | 'low' | 'nonreasoning' | null;

function detectEffortTier(raw: string): EffortTier {
  const low = (raw || '').toLowerCase();
  if (/\b(non[-\s]?reasoning|no[-\s]?thinking|instant)\b/.test(low)) return 'nonreasoning';
  if (/\b(xhigh|extra\s*high|highest)\b/.test(low)) return 'xhigh';
  if (/\bmax\b/.test(low)) return 'max';
  if (/\bhigh\b/.test(low)) return 'high';
  if (/\b(med|medium)\b/.test(low)) return 'medium';
  if (/\b(low|minimal|min)\b/.test(low)) return 'low';
  return null;
}

function effortRankValue(tier: EffortTier): number {
  switch (tier) {
    case 'max':
      return 6;
    case 'xhigh':
      return 5;
    case 'high':
      return 4;
    case 'medium':
      return 3;
    case 'low':
      return 2;
    case 'nonreasoning':
      return 1;
    default:
      return 0;
  }
}

function normalizeModelNameForAa(raw: string): {
  compactFull: string;
  compactBase: string;
  effort: EffortTier;
} {
  let s = (raw || '').toLowerCase().trim();
  s = s.replace(/[^\p{L}\p{N}\s()._-]/gu, ' ');
  s = s.replace(/\bchatgpt[-\s]*/g, 'gpt ');
  s = s.replace(/\bdeepseek\s+v(?=\d)/g, 'deepseek ');
  s = s.replace(/\bqwen(?=\d)/g, 'qwen ');
  s = s.replace(/\bminimax[-\s]*/g, 'minimax ');
  s = s.replace(/\b(\d+)\.0\b/g, '$1');

  const parenTexts: string[] = [];
  const baseWithoutParens = s.replace(/\(([^)]+)\)/g, (_m, inner: string) => {
    parenTexts.push(inner.trim().toLowerCase());
    return ' ';
  });

  const effort = detectEffortTier(parenTexts.join(' '));
  return {
    compactFull: s.replace(/[^a-z0-9]/g, ''),
    compactBase: baseWithoutParens.replace(/[^a-z0-9]/g, ''),
    effort,
  };
}

function scoreAaCandidateForSheet(
  aa: AaLeaderboardModel,
  sheet: AaSheetModelSnapshot
): number {
  const aaNameNorm = normalizeModelNameForAa(aa.name);
  const aaRelNorm = normalizeModelNameForAa(aa.releaseName);
  const aaEffort = detectEffortTier(aa.suffix) ?? aaNameNorm.effort;

  const sheetCandidates = [
    normalizeModelNameForAa(sheet.displayName),
    normalizeModelNameForAa(sheet.name),
  ];

  let bestNameScore = 0;
  let sheetEffort: EffortTier = null;

  for (const sc of sheetCandidates) {
    let score = 0;
    if (sc.compactFull === aaNameNorm.compactFull) {
      score = 940;
    } else if (
      (sc.compactBase === aaRelNorm.compactBase || sc.compactBase === aaNameNorm.compactBase) &&
      sc.compactBase.length >= 4
    ) {
      score = 880;
    } else if (
      sc.compactBase.length >= 6 &&
      aaRelNorm.compactBase.length >= 6 &&
      ((sc.compactBase.startsWith(aaRelNorm.compactBase) &&
        /^\d{4}$/.test(sc.compactBase.slice(aaRelNorm.compactBase.length))) ||
        (aaRelNorm.compactBase.startsWith(sc.compactBase) &&
          /^\d{4}$/.test(aaRelNorm.compactBase.slice(sc.compactBase.length))))
    ) {
      score = 730;
    }

    if (score > bestNameScore) {
      bestNameScore = score;
      sheetEffort = sc.effort;
    }
  }

  if (bestNameScore === 0) return 0;

  let total = bestNameScore;

  // Preview mismatch guard
  const sheetIsPrev = /\bprev(iew)?\b/i.test(sheet.displayName) || /\bprev(iew)?\b/i.test(sheet.name);
  const aaIsPrev = /\bprev(iew)?\b/i.test(aa.name) || /\bprev(iew)?\b/i.test(aa.releaseName);
  if (sheetIsPrev !== aaIsPrev) {
    total -= 160;
  }

  // Effort-level alignment
  if (sheetEffort !== null) {
    if (aaEffort === sheetEffort) {
      total += 80;
    } else if (aaEffort !== null) {
      total -= 140;
    } else {
      total -= 40;
    }
  } else {
    // Sheet row has no explicit effort qualifier: prefer the flagship / highest-IQ / highest-effort variant
    total += effortRankValue(aaEffort) * 8;
    if (aa.scores.iq !== null) {
      total += Math.min(40, aa.scores.iq * 0.5);
    }
    if (aaEffort === 'nonreasoning') total -= 120;
    if (aaEffort === 'low') total -= 80;
    if (aaEffort === 'medium') total -= 35;
  }

  if (aa.deprecated) total -= 45;
  if (matchCompanyName(aa.creator, sheet.companyName, { includeMetaLlama: true })) {
    total += 20;
  }
  total += countPopulatedMetrics(aa.scores) * 3;
  total += computeReleaseDateTiebreaker(sheet.releaseDate, 2025);

  return total;
}

function evaluateMetricDiff(
  metric: AaMetricKey,
  liveScore: number | null,
  currentScore: number | null,
  currentIsBold: boolean | null
): AaMetricDiffItem {
  if (liveScore === null) {
    return {
      metric,
      liveScore: null,
      currentScore,
      currentIsBold,
      status: 'unavailable',
    };
  }

  if (currentScore === null) {
    return {
      metric,
      liveScore,
      currentScore: null,
      currentIsBold,
      status: 'missing',
    };
  }

  if (currentIsBold === false) {
    return {
      metric,
      liveScore,
      currentScore,
      currentIsBold: false,
      status: 'overwrite_estimate',
    };
  }

  const delta = Math.abs(currentScore - liveScore);
  if (delta < 0.05) {
    return {
      metric,
      liveScore,
      currentScore,
      currentIsBold,
      status: 'unchanged',
    };
  }

  // User often transcribed AA chart-rounded integers (e.g. 62,0 for 61.5 or 41,0 for 40.7) as bold official values.
  // Avoid noisy false alarms for pure integer rounding while catching genuine shifts (> 0.55) or decimal diffs.
  const isSheetWholeInteger = Math.abs(currentScore - Math.round(currentScore)) < 1e-4;
  if (isSheetWholeInteger && delta <= 0.55) {
    return {
      metric,
      liveScore,
      currentScore,
      currentIsBold,
      status: 'unchanged',
    };
  }

  const status: AaMetricDiffStatus = 'changed';
  return {
    metric,
    liveScore,
    currentScore,
    currentIsBold,
    status,
  };
}

function resolveOverallMatchedStatus(metricDiffs: AaMetricDiffItem[]): AaDiffStatus {
  if (metricDiffs.some((m) => m.status === 'overwrite_estimate')) return 'overwrite_estimate';
  if (metricDiffs.some((m) => m.status === 'changed')) return 'changed';
  if (metricDiffs.some((m) => m.status === 'missing')) return 'missing';
  return 'unchanged';
}

export interface AaPreferencesInput {
  ignoredIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
}

export function buildAaDiffs(
  aaModels: AaLeaderboardModel[],
  sheetModels: AaSheetModelSnapshot[],
  preferences?: AaPreferencesInput
): AaDiffItem[] {
  const ignoredSet = new Set(preferences?.ignoredIds ?? []);
  const { usedSheetRows, resolvedMatches } = reserveManualMappings(
    aaModels,
    sheetModels,
    ignoredSet,
    preferences?.manualMappings ?? {}
  );

  const usedAaIds = new Set<string>(resolvedMatches.keys());

  // 1. Match Sheet rows (explicit effort-qualified rows first so e.g. "(med)" doesn't get stolen by "(max)")
  const orderedSheetModels = [...sheetModels].sort((a, b) => {
    const aHasEffort = normalizeModelNameForAa(a.displayName).effort !== null ? 0 : 1;
    const bHasEffort = normalizeModelNameForAa(b.displayName).effort !== null ? 0 : 1;
    if (aHasEffort !== bHasEffort) return aHasEffort - bHasEffort;
    return a.sheetRowNumber - b.sheetRowNumber;
  });

  for (const sheet of orderedSheetModels) {
    if (usedSheetRows.has(sheet.sheetRowNumber)) continue;

    let bestAa: AaLeaderboardModel | null = null;
    let bestScore = 0;

    for (const aa of aaModels) {
      if (usedAaIds.has(aa.id) || ignoredSet.has(aa.id) || ignoredSet.has(aa.releaseSlug)) continue;
      const score = scoreAaCandidateForSheet(aa, sheet);
      if (score >= 720 && score > bestScore) {
        bestScore = score;
        bestAa = aa;
      }
    }

    if (bestAa) {
      usedSheetRows.add(sheet.sheetRowNumber);
      usedAaIds.add(bestAa.id);
      resolvedMatches.set(bestAa.id, sheet);
    }
  }

  const matchedReleaseSlugs = new Set<string>();
  for (const aaId of resolvedMatches.keys()) {
    const m = aaModels.find((item) => item.id === aaId);
    if (m?.releaseSlug) matchedReleaseSlugs.add(m.releaseSlug);
  }

  // 2. Build diffs for all matched AA models
  const diffs: AaDiffItem[] = [];
  for (const aa of aaModels) {
    const matchedSheet = resolvedMatches.get(aa.id);
    if (!matchedSheet) continue;

    const metricDiffs = AA_METRIC_KEYS.map((metric) =>
      evaluateMetricDiff(
        metric,
        aa.scores[metric],
        matchedSheet.scores[metric],
        matchedSheet.boldMask[metric]
      )
    );
    const actionableMetricCount = metricDiffs.filter(
      (m) => m.status === 'missing' || m.status === 'overwrite_estimate' || m.status === 'changed'
    ).length;
    const status = resolveOverallMatchedStatus(metricDiffs);

    diffs.push({
      aaId: aa.id,
      aaName: aa.name,
      releaseSlug: aa.releaseSlug,
      releaseName: aa.releaseName,
      suffix: aa.suffix,
      creator: aa.creator,
      isOpenWeights: aa.isOpenWeights,
      rank: aa.rank,
      liveScores: aa.scores,
      status,
      matchedModelId: matchedSheet.id,
      matchedDisplayName: matchedSheet.displayName,
      sheetRowNumber: matchedSheet.sheetRowNumber,
      metricDiffs,
      actionableMetricCount,
      reason:
        actionableMetricCount > 0
          ? `${actionableMetricCount} von 6 AA-Indizes aktualisierbar.`
          : 'Alle verfügbaren AA-Indizes sind synchron.',
    });
  }

  // 3. Collect unmatched top releases (deduplicated by releaseSlug, non-deprecated, notable IQ/coverage)
  const unmatchedByRelease = new Map<string, AaLeaderboardModel>();
  for (const aa of aaModels) {
    if (aa.deprecated) continue;
    if (resolvedMatches.has(aa.id)) continue;
    if (matchedReleaseSlugs.has(aa.releaseSlug)) continue;

    const cur = unmatchedByRelease.get(aa.releaseSlug);
    if (
      !cur ||
      (aa.scores.iq ?? -1) > (cur.scores.iq ?? -1) ||
      ((aa.scores.iq ?? -1) === (cur.scores.iq ?? -1) &&
        countPopulatedMetrics(aa.scores) > countPopulatedMetrics(cur.scores))
    ) {
      unmatchedByRelease.set(aa.releaseSlug, aa);
    }
  }

  const candidateUnmatched = Array.from(unmatchedByRelease.values())
    .filter((aa) => {
      if (ignoredSet.has(aa.id) || ignoredSet.has(aa.releaseSlug)) return true;
      const iq = aa.scores.iq ?? 0;
      const metricCount = countPopulatedMetrics(aa.scores);
      return iq >= 22 || (iq >= 15 && metricCount >= 3);
    })
    .sort((a, b) => (b.scores.iq ?? -1) - (a.scores.iq ?? -1));

  for (const aa of candidateUnmatched) {
    const isIgnored = ignoredSet.has(aa.id) || ignoredSet.has(aa.releaseSlug);
    const metricDiffs: AaMetricDiffItem[] = AA_METRIC_KEYS.map((metric) => ({
      metric,
      liveScore: aa.scores[metric],
      currentScore: null,
      currentIsBold: null,
      status: aa.scores[metric] !== null ? 'missing' : 'unavailable',
    }));

    diffs.push({
      aaId: aa.id,
      aaName: aa.releaseName || aa.name,
      releaseSlug: aa.releaseSlug,
      releaseName: aa.releaseName,
      suffix: aa.suffix,
      creator: aa.creator,
      isOpenWeights: aa.isOpenWeights,
      rank: aa.rank,
      liveScores: aa.scores,
      status: isIgnored ? 'ignored' : 'new_unmatched',
      matchedModelId: null,
      matchedDisplayName: null,
      sheetRowNumber: null,
      metricDiffs,
      actionableMetricCount: countPopulatedMetrics(aa.scores),
      reason: isIgnored
        ? 'Vom Benutzer ignoriert.'
        : 'Neues Modell auf Artificial Analysis — zuordnen oder komplette Zeile recherchieren.',
    });
  }

  // Sort: matched actionable first, then new_unmatched, then unchanged, then ignored
  const statusOrder: Record<AaDiffStatus, number> = {
    overwrite_estimate: 0,
    changed: 1,
    missing: 2,
    new_unmatched: 3,
    unchanged: 4,
    ignored: 5,
  };
  diffs.sort((a, b) => {
    const oa = statusOrder[a.status];
    const ob = statusOrder[b.status];
    if (oa !== ob) return oa - ob;
    return a.rank - b.rank;
  });

  return diffs;
}

function summarizeAaReportCounts(
  totalModels: number,
  totalUniqueReleases: number,
  diffs: AaDiffItem[],
  hasSheetModels: boolean
) {
  const counts = countDiffStatuses(diffs);
  let summaryDe = '';
  let summaryEn = '';

  if (!hasSheetModels) {
    summaryDe = `Live-Daten geladen (${totalUniqueReleases} Releases / ${totalModels} Varianten).`;
    summaryEn = `Live data loaded (${totalUniqueReleases} releases / ${totalModels} variants).`;
  } else if (counts.actionableCount > 0) {
    const partsDe: string[] = [];
    const partsEn: string[] = [];
    if (counts.unmatchedCount > 0) {
      partsDe.push(`${counts.unmatchedCount} neu`);
      partsEn.push(`${counts.unmatchedCount} new`);
    }
    if (counts.missingCount > 0) {
      partsDe.push(`${counts.missingCount} fehlend`);
      partsEn.push(`${counts.missingCount} missing`);
    }
    if (counts.overwriteEstimateCount > 0) {
      partsDe.push(
        counts.overwriteEstimateCount === 1
          ? '1 Schätzwert'
          : `${counts.overwriteEstimateCount} Schätzwerte`
      );
      partsEn.push(`${counts.overwriteEstimateCount} estimate(s)`);
    }
    if (counts.changedCount > 0) {
      partsDe.push(`${counts.changedCount} geändert`);
      partsEn.push(`${counts.changedCount} changed`);
    }
    summaryDe = `${partsDe.join(', ')}.`;
    summaryEn = `${partsEn.join(', ')}.`;
  } else {
    summaryDe = 'Alle 6 AA-Indizes sind aktuell.';
    summaryEn = 'All 6 AA benchmarks are up to date.';
  }

  return { ...counts, summaryDe, summaryEn };
}

const runtime = createMonitorRuntime<
  AaLeaderboardModel,
  AaSheetModelSnapshot,
  AaDiffItem,
  AaCheckReport,
  {
    updatedAt: string | null;
    models: AaLeaderboardModel[];
    totalUniqueReleases: number;
    newlyDiscoveredIds: string[];
  }
>({
  label: 'Artificial Analysis',
  cacheFilePath: CACHE_FILE_PATH,
  sourceUrl: AA_LEADERBOARD_URL,
  checkFailureFallbackMessage: 'Artificial Analysis leaderboard check failed.',
  fetchLiveLeaderboard: fetchLiveAaLeaderboard,
  buildDiffs: buildAaDiffs,
  summarizeCounts: (live, diffs, hasSheetModels, existingReport) =>
    summarizeAaReportCounts(
      live.models.length,
      typeof live.totalUniqueReleases === 'number'
        ? live.totalUniqueReleases
        : existingReport?.totalUniqueReleases ?? live.models.length,
      diffs,
      hasSheetModels
    ),
  createReport: ({
    checkedAt,
    nextCheckDueAt,
    live,
    baselineKnownCount,
    trigger,
    diffs,
    counts,
  }) => ({
    checkedAt,
    nextCheckDueAt,
    sourceUpdatedAt: live.updatedAt,
    sourceUrl: AA_LEADERBOARD_URL,
    totalSourceModels: live.models.length,
    totalUniqueReleases: live.totalUniqueReleases,
    baselineKnownCount,
    newlyDiscoveredSourceIds: live.newlyDiscoveredIds,
    trigger,
    models: live.models,
    diffs,
    ...counts,
  }),
  getDiffSourceId: (d) => d.aaId,
  markDiffIgnored: (d) => ({
    ...d,
    status: 'ignored',
    matchedModelId: null,
    matchedDisplayName: null,
    sheetRowNumber: null,
    reason: 'Vom Benutzer ignoriert.',
  }),
});

export const isAaReportDue = runtime.isReportDue;

export async function getAaMonitorStatus(): Promise<AaMonitorStatusResponse> {
  return runtime.getStatus();
}

export async function runAaCheck(options?: {
  models?: AaSheetModelSnapshot[];
  trigger?: 'manual' | 'daily_auto';
  replaceAll?: boolean;
  ignoredIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
}): Promise<AaCheckReport> {
  return runtime.runCheck(options);
}

export async function updateAaPreferences(options: {
  replaceAll?: boolean;
  ignoredIds?: string[];
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  unmapIds?: string[];
  models?: AaSheetModelSnapshot[];
}): Promise<AaCheckReport | null> {
  return runtime.updatePreferences(options);
}
