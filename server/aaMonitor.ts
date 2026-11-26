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

type EffortTier = 'max' | 'xhigh' | 'high' | 'reasoning' | 'medium' | 'low' | 'nonreasoning' | null;

function detectEffortTier(raw: string): EffortTier {
  const low = (raw || '').toLowerCase();
  if (/\b(non[-\s]?reasoning|no[-\s]?thinking|instant)\b/.test(low)) return 'nonreasoning';
  if (/\b(xhigh|extra\s*high|highest)\b/.test(low)) return 'xhigh';
  if (/\bmax\b/.test(low)) return 'max';
  if (/\bhigh\b/.test(low)) return 'high';
  if (/\b(med|medium)\b/.test(low)) return 'medium';
  if (/\b(low|minimal|min)\b/.test(low)) return 'low';
  if (/\b(reasoning|thinking)\b/.test(low)) return 'reasoning';
  return null;
}

function effortPriorityScore(aa: AaLeaderboardModel): number {
  const tier = detectEffortTier(aa.suffix) ?? detectEffortTier(aa.name);
  switch (tier) {
    case 'max':
      return 70;
    case 'xhigh':
      return 60;
    case 'high':
      return 50;
    case 'reasoning':
      return 45;
    case 'medium':
      return 30;
    case 'low':
      return 20;
    case 'nonreasoning':
      return 10;
    default:
      return aa.isReasoning ? 42 : 35;
  }
}

function isPureEffortParen(inner: string): boolean {
  const cleaned = inner
    .toLowerCase()
    .replace(/\b(default\s*fallback|adaptive\s*reasoning|adaptive|reasoning|thinking|non[-\s]?reasoning|no[-\s]?thinking|max|xhigh|extra\s*high|highest|high|medium|med|low|minimal|min|effort|instant)\b/g, '')
    .replace(/[,;/\s_-]+/g, '')
    .trim();
  return cleaned.length === 0;
}

function normalizeModelNameForAa(raw: string): {
  compactFull: string;
  compactBase: string;
  numberTokens: string[];
  effort: EffortTier;
} {
  let s = (raw || '').toLowerCase().trim();
  s = s.replace(/[^\p{L}\p{N}\s()._-]/gu, ' ');
  s = s.replace(/\bchatgpt[-\s]*/g, 'gpt ');
  s = s.replace(/\bdeepseek\s+v(?=\d)/g, 'deepseek ');
  s = s.replace(/\bqwen(?=\d)/g, 'qwen ');
  s = s.replace(/\bminimax[-\s]*/g, 'minimax ');
  s = s.replace(/\bprev\b/g, 'preview');
  s = s.replace(/\b(\d+)\.0\b/g, '$1');

  const effortParenTexts: string[] = [];
  const baseWithoutEffortParens = s.replace(/\(([^)]+)\)/g, (fullMatch, inner: string) => {
    const trimmed = inner.trim().toLowerCase();
    if (isPureEffortParen(trimmed)) {
      effortParenTexts.push(trimmed);
      return ' ';
    }
    // Keep non-effort parenthesized qualifiers (e.g. "(Preview)" or "(2025)") in base,
    // while still scanning for any effort keyword inside.
    if (detectEffortTier(trimmed)) {
      effortParenTexts.push(trimmed);
    }
    return ` ${trimmed} `;
  });

  const effort = detectEffortTier(effortParenTexts.join(' '));
  const numberTokens = (baseWithoutEffortParens.match(/\d+(?:\.\d+)?/g) || []).map((t) =>
    t.replace(/\.0$/, '')
  );

  return {
    compactFull: s.replace(/[^a-z0-9]/g, ''),
    compactBase: baseWithoutEffortParens.replace(/[^a-z0-9]/g, ''),
    numberTokens,
    effort,
  };
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function compareReleaseVariantRank(a: AaLeaderboardModel, b: AaLeaderboardModel): number {
  // 1. Non-deprecated beats deprecated
  if (a.deprecated !== b.deprecated) return a.deprecated ? 1 : -1;
  // 2. Highest reasoning effort tier ALWAYS wins (max > xhigh > high > reasoning > medium > low > nonreasoning)
  const effDiff = effortPriorityScore(b) - effortPriorityScore(a);
  if (effDiff !== 0) return effDiff;
  // 3. Higher IQ wins ties
  const iqDiff = (b.scores.iq ?? -1) - (a.scores.iq ?? -1);
  if (iqDiff !== 0) return iqDiff;
  // 4. More populated metrics
  const cntDiff = countPopulatedMetrics(b.scores) - countPopulatedMetrics(a.scores);
  if (cntDiff !== 0) return cntDiff;
  return a.rank - b.rank;
}

/**
 * Deduplicates AA variants strictly to ONE single highest-reasoning variant per releaseSlug.
 * Lower reasoning variants (e.g. High / Medium / Low / Non-reasoning when Max or Xhigh exists)
 * are excluded so they never leak into other Sheet rows or unmatched diffs.
 */
function selectHighestReasoningVariantPerRelease(aaModels: AaLeaderboardModel[]): {
  topVariants: AaLeaderboardModel[];
  topVariantBySlug: Map<string, AaLeaderboardModel>;
  variantsBySlug: Map<string, AaLeaderboardModel[]>;
} {
  const variantsBySlug = new Map<string, AaLeaderboardModel[]>();
  for (const aa of aaModels) {
    const slug = aa.releaseSlug || normalizeModelNameForAa(aa.name).compactBase || aa.id;
    const list = variantsBySlug.get(slug);
    if (list) list.push(aa);
    else variantsBySlug.set(slug, [aa]);
  }

  const topVariantBySlug = new Map<string, AaLeaderboardModel>();
  const topVariants: AaLeaderboardModel[] = [];

  for (const [slug, variants] of variantsBySlug.entries()) {
    const sorted = [...variants].sort(compareReleaseVariantRank);
    variantsBySlug.set(slug, sorted);
    const best = sorted[0];
    if (best) {
      topVariantBySlug.set(slug, best);
      topVariants.push(best);
    }
  }

  topVariants.sort((a, b) => a.rank - b.rank);
  return { topVariants, topVariantBySlug, variantsBySlug };
}

function findReleaseSlugByColAh(
  aaModelName: string,
  aaModels: AaLeaderboardModel[],
  topVariants: AaLeaderboardModel[]
): string | null {
  const needleExact = aaModelName.trim().toLowerCase();
  if (!needleExact) return null;

  // 1. Exact case-insensitive match against full name, shortName, or releaseName
  for (const aa of aaModels) {
    if (
      aa.name.trim().toLowerCase() === needleExact ||
      aa.shortName.trim().toLowerCase() === needleExact ||
      aa.releaseName.trim().toLowerCase() === needleExact
    ) {
      return aa.releaseSlug;
    }
  }

  const ahNorm = normalizeModelNameForAa(aaModelName);
  if (ahNorm.compactBase.length < 3) return null;

  // 2. Exact compactFull match
  for (const aa of aaModels) {
    if (normalizeModelNameForAa(aa.name).compactFull === ahNorm.compactFull) {
      return aa.releaseSlug;
    }
  }

  // 3. Exact compactBase + identical numeric version/snapshot tokens against top variants
  for (const aa of topVariants) {
    const aaNameNorm = normalizeModelNameForAa(aa.name);
    const aaRelNorm = normalizeModelNameForAa(aa.releaseName);
    if (
      (ahNorm.compactBase === aaNameNorm.compactBase &&
        arraysEqual(ahNorm.numberTokens, aaNameNorm.numberTokens)) ||
      (ahNorm.compactBase === aaRelNorm.compactBase &&
        arraysEqual(ahNorm.numberTokens, aaRelNorm.numberTokens))
    ) {
      return aa.releaseSlug;
    }
  }

  return null;
}

function scoreAaCandidateForSheet(
  aa: AaLeaderboardModel,
  sheet: AaSheetModelSnapshot
): number {
  const aaNameNorm = normalizeModelNameForAa(aa.name);
  const aaRelNorm = normalizeModelNameForAa(aa.releaseName);

  const sheetCandidates = [
    normalizeModelNameForAa(sheet.displayName),
    normalizeModelNameForAa(sheet.name),
  ];

  let bestNameScore = 0;

  for (const sc of sheetCandidates) {
    if (sc.compactBase.length < 4) continue;
    let score = 0;

    if (sc.compactFull === aaNameNorm.compactFull && sc.compactFull.length >= 4) {
      score = 940;
    } else if (
      (sc.compactBase === aaNameNorm.compactBase &&
        arraysEqual(sc.numberTokens, aaNameNorm.numberTokens)) ||
      (sc.compactBase === aaRelNorm.compactBase &&
        arraysEqual(sc.numberTokens, aaRelNorm.numberTokens))
    ) {
      // Strict exact base + exact version/date-snapshot numbers (e.g. 1017 NEVER matches undated)
      score = 890;
    }

    if (score > bestNameScore) {
      bestNameScore = score;
    }
  }

  if (bestNameScore === 0) return 0;

  let total = bestNameScore;

  // Preview mismatch guard
  const sheetIsPrev = /\bprev(iew)?\b/i.test(sheet.displayName) || /\bprev(iew)?\b/i.test(sheet.name);
  const aaIsPrev = /\bprev(iew)?\b/i.test(aa.name) || /\bprev(iew)?\b/i.test(aa.releaseName);
  if (sheetIsPrev !== aaIsPrev) {
    return 0;
  }

  if (aa.deprecated) total -= 45;
  if (aa.creator && sheet.companyName) {
    if (matchCompanyName(aa.creator, sheet.companyName, { includeMetaLlama: true })) {
      total += 25;
    } else {
      total -= 180;
    }
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
  const { topVariants, topVariantBySlug } = selectHighestReasoningVariantPerRelease(aaModels);
  const aaById = new Map(aaModels.map((m) => [m.id, m]));

  // Pass 0: User manual overrides (highest priority — always wins over Column AH and auto-matching)
  const { usedSheetRows, resolvedMatches } = reserveManualMappings(
    aaModels,
    sheetModels,
    ignoredSet,
    preferences?.manualMappings ?? {}
  );

  const matchSourceByAaId = new Map<string, 'manual' | 'col_ah' | 'auto'>();
  const usedReleaseSlugs = new Set<string>();

  // Upgrade any manually mapped ID to its release's highest-reasoning variant if needed,
  // and reserve its releaseSlug so no lower reasoning sibling can ever match another row.
  const normalizedManualMatches = new Map<string, AaSheetModelSnapshot>();
  for (const [aaId, sheet] of resolvedMatches.entries()) {
    const rawAa = aaById.get(aaId);
    if (!rawAa) continue;
    const topAa = topVariantBySlug.get(rawAa.releaseSlug) || rawAa;
    normalizedManualMatches.set(topAa.id, sheet);
    matchSourceByAaId.set(topAa.id, 'manual');
    usedReleaseSlugs.add(topAa.releaseSlug);
  }
  resolvedMatches.clear();
  for (const [aaId, sheet] of normalizedManualMatches.entries()) {
    resolvedMatches.set(aaId, sheet);
  }

  // Pass 1: Exact Column AH match (`sheet.aaModelName`) -> ALWAYS resolves to the release's highest reasoning variant
  const sheetsWithAh = sheetModels
    .filter((s) => Boolean(s.aaModelName?.trim()) && !usedSheetRows.has(s.sheetRowNumber))
    .sort((a, b) => {
      // If two rows accidentally share the same Column AH value (e.g. Inkling 2 Small copied into Inkling 2 Mini),
      // let the row whose own name agrees with Column AH claim it first!
      const aNormAh = normalizeModelNameForAa(a.aaModelName || '').compactBase;
      const bNormAh = normalizeModelNameForAa(b.aaModelName || '').compactBase;
      const aAgrees =
        aNormAh === normalizeModelNameForAa(a.displayName).compactBase ||
        aNormAh === normalizeModelNameForAa(a.name).compactBase
          ? 0
          : 1;
      const bAgrees =
        bNormAh === normalizeModelNameForAa(b.displayName).compactBase ||
        bNormAh === normalizeModelNameForAa(b.name).compactBase
          ? 0
          : 1;
      if (aAgrees !== bAgrees) return aAgrees - bAgrees;
      return a.sheetRowNumber - b.sheetRowNumber;
    });

  for (const sheet of sheetsWithAh) {
    if (usedSheetRows.has(sheet.sheetRowNumber)) continue;
    const slug = findReleaseSlugByColAh(sheet.aaModelName || '', aaModels, topVariants);
    if (!slug || usedReleaseSlugs.has(slug)) continue;

    const topAa = topVariantBySlug.get(slug);
    if (!topAa) continue;
    if (ignoredSet.has(topAa.id) || ignoredSet.has(slug)) continue;

    usedSheetRows.add(sheet.sheetRowNumber);
    usedReleaseSlugs.add(slug);
    resolvedMatches.set(topAa.id, sheet);
    matchSourceByAaId.set(topAa.id, 'col_ah');
  }

  // Pass 2: Strict auto-match ONLY against unclaimed highest-reasoning release representatives
  const remainingSheets = [...sheetModels]
    .filter((s) => !usedSheetRows.has(s.sheetRowNumber))
    .sort((a, b) => a.sheetRowNumber - b.sheetRowNumber);

  for (const sheet of remainingSheets) {
    if (usedSheetRows.has(sheet.sheetRowNumber)) continue;

    let bestAa: AaLeaderboardModel | null = null;
    let bestScore = 0;

    for (const aa of topVariants) {
      if (
        usedReleaseSlugs.has(aa.releaseSlug) ||
        ignoredSet.has(aa.id) ||
        ignoredSet.has(aa.releaseSlug)
      ) {
        continue;
      }
      const score = scoreAaCandidateForSheet(aa, sheet);
      if (score >= 820 && score > bestScore) {
        bestScore = score;
        bestAa = aa;
      }
    }

    if (bestAa) {
      usedSheetRows.add(sheet.sheetRowNumber);
      usedReleaseSlugs.add(bestAa.releaseSlug);
      resolvedMatches.set(bestAa.id, sheet);
      matchSourceByAaId.set(bestAa.id, 'auto');
    }
  }

  // Build diffs ONLY for matched highest-reasoning representatives
  const diffs: AaDiffItem[] = [];
  for (const aa of topVariants) {
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
      matchSource: matchSourceByAaId.get(aa.id) || 'auto',
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

  // Pass 3: Unmatched top releases (strictly highest-reasoning variant per release, non-deprecated, notable IQ/coverage)
  const candidateUnmatched = topVariants
    .filter((aa) => {
      if (aa.deprecated) return false;
      if (usedReleaseSlugs.has(aa.releaseSlug)) return false;
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
      aaName: aa.name,
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
