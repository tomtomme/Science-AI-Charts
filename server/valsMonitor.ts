import os from 'node:os';
import path from 'node:path';
import type { ManualRowMapping } from '../src/types/integrityMonitor.ts';
import type {
  ValsCheckReport,
  ValsDiffItem,
  ValsLeaderboardModel,
  ValsMonitorStatusResponse,
  ValsSheetModelSnapshot,
} from '../src/types/valsMonitor.ts';
import {
  SCORE_DIFF_THRESHOLD,
  computeReleaseDateTiebreaker,
  countDiffStatuses,
  createMonitorRuntime,
  fetchTextWithTimeout,
  formatExactScore,
  matchCompanyName,
  reserveManualMappings,
} from './utils/monitorBase.ts';

const VALS_INDEX_URL = 'https://www.vals.ai/benchmarks/vals_index';
const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-vals-monitor-cache-v2.json');

function decodeHtmlAttr(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function decodeAstroValue(val: unknown): unknown {
  if (Array.isArray(val) && val.length === 2 && (val[0] === 0 || val[0] === 1)) {
    if (val[0] === 0) {
      const inner = val[1];
      if (inner && typeof inner === 'object') {
        if (Array.isArray(inner)) {
          return inner.map(decodeAstroValue);
        }
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(inner as Record<string, unknown>)) {
          out[k] = decodeAstroValue(v);
        }
        return out;
      }
      return inner;
    }
    if (val[0] === 1 && Array.isArray(val[1])) {
      return val[1].map(decodeAstroValue);
    }
  }
  if (Array.isArray(val)) {
    return val.map(decodeAstroValue);
  }
  return val;
}

interface RawValsAstroItem {
  position?: unknown;
  model?: unknown;
  accuracy?: unknown;
  company?: unknown;
  slug?: unknown;
  cost?: unknown;
}

export async function fetchLiveValsLeaderboard(
  previousKnownIds: string[] = []
): Promise<{
  updatedAt: string | null;
  versionLabel: string;
  models: ValsLeaderboardModel[];
  newlyDiscoveredIds: string[];
}> {
  const html = await fetchTextWithTimeout(
    VALS_INDEX_URL,
    'Science-AI-Charts-ValsMonitor/1.0 (+https://www.vals.ai/benchmarks/vals_index)',
    'text/html,*/*'
  );
  const islandMatches = Array.from(html.matchAll(/<astro-island\b([^>]*)>/gi));

  let rawItems: RawValsAstroItem[] | null = null;
  let graphDate: string | null = null;
  let versionLabel = 'v2.2';

  for (const m of islandMatches) {
    const attrs = m[1] || '';
    const propsMatch = attrs.match(/\bprops="([^"]+)"/i);
    if (!propsMatch) continue;
    const decodedAttr = decodeHtmlAttr(propsMatch[1]);

    if (decodedAttr.includes('BenchmarkVersionSelector') || decodedAttr.includes('currentVersion')) {
      try {
        const verObj = JSON.parse(decodedAttr) as Record<string, unknown>;
        const decodedVer = decodeAstroValue(verObj) as Record<string, unknown>;
        if (typeof decodedVer.currentVersion === 'string' && decodedVer.currentVersion) {
          versionLabel = decodedVer.currentVersion;
        }
      } catch {
        // Optional version metadata
      }
    }

    if (!decodedAttr.includes('regularLeaderboardItems')) continue;

    let parsedObj: Record<string, unknown>;
    try {
      parsedObj = JSON.parse(decodedAttr) as Record<string, unknown>;
    } catch {
      continue;
    }

    const items = decodeAstroValue(parsedObj.regularLeaderboardItems);
    if (Array.isArray(items) && items.length > 0) {
      rawItems = items as RawValsAstroItem[];
      const gd = decodeAstroValue(parsedObj.graphDate);
      if (typeof gd === 'string' && gd.trim()) {
        graphDate = gd.trim();
      }
      const badge = decodeAstroValue(parsedObj.badgeLabel);
      if (typeof badge === 'string' && /v\d+(?:\.\d+)?/i.test(badge)) {
        const bm = badge.match(/(v\d+(?:\.\d+)?)/i);
        if (bm) versionLabel = bm[1];
      }
      break;
    }
  }

  if (!rawItems || rawItems.length === 0) {
    throw new Error('Could not find regularLeaderboardItems on vals.ai/benchmarks/vals_index.');
  }

  const prevSet = new Set(previousKnownIds);
  const hasBaseline = prevSet.size > 0;
  const seenIds = new Set<string>();
  const models: ValsLeaderboardModel[] = [];

  for (let i = 0; i < rawItems.length; i++) {
    const raw = rawItems[i];
    const name = String(raw.model || '').trim();
    if (!name) continue;

    const company = String(raw.company || '').trim();
    const accRaw = String(raw.accuracy ?? '').replace(/%$/, '').trim();
    const score = Number(accRaw);
    if (!Number.isFinite(score)) continue;

    const dotIdx = accRaw.indexOf('.');
    const scoreDecimals = dotIdx !== -1 ? accRaw.length - dotIdx - 1 : 0;
    const rankNum = Number(raw.position);
    const rank = Number.isFinite(rankNum) && rankNum > 0 ? rankNum : i + 1;
    const costNum = raw.cost !== null && raw.cost !== undefined ? Number(raw.cost) : null;
    const slugRaw = String(raw.slug || '').trim();
    const id =
      slugRaw ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    models.push({
      id,
      name,
      company,
      rank,
      score,
      scoreDecimals,
      roundedScore: score,
      cost: costNum !== null && Number.isFinite(costNum) ? Math.round(costNum * 100) / 100 : null,
      isNewToSource: hasBaseline && !prevSet.has(id),
    });
  }

  if (models.length < 20) {
    throw new Error(`Parsed unexpectedly few Vals Index rows (${models.length}).`);
  }

  models.sort((a, b) => a.rank - b.rank);
  const newlyDiscoveredIds = models.filter((m) => m.isNewToSource).map((m) => m.id);

  return {
    updatedAt: graphDate,
    versionLabel,
    models,
    newlyDiscoveredIds,
  };
}

interface ParsedValsModelName {
  compactFull: string;
  compactBase: string;
  compactWithoutParams: string;
  paramTokens: string[];
  variantTokens: Set<string>;
  qualifiers: string[];
}

const STRICT_VARIANT_TOKENS = [
  'mini',
  'nano',
  'micro',
  'flash',
  'lite',
  'pro',
  'ultra',
  'max',
  'plus',
  'prev',
  'turbo',
  'open',
  'oss',
  'ember',
  'glimmer',
  'spark',
  'wonder',
  'full',
  'thinking',
  'fast',
];

function normalizeValsModelName(raw: string): ParsedValsModelName {
  let s = (raw || '').toLowerCase().trim();
  s = s.replace(/[^\p{L}\p{N}\s()._-]/gu, ' ');
  s = s.replace(/\bchatgpt[-\s]*/g, 'gpt ');
  s = s.replace(/\bdeepseek\s+v(?=\d)/g, 'deepseek ');
  s = s.replace(/\bqwen(?=\d)/g, 'qwen ');
  s = s.replace(/\bminimax[-\s]*/g, 'minimax ');
  s = s.replace(/\bpreview\b/g, 'prev');
  s = s.replace(/(\b\d+)\.0\b/g, '$1');

  if (/^\s*wonder(?:\s+full)?\s*$/i.test(s)) {
    s = `muse ${s}`;
  }
  if (/^\s*hy4(?:\b|\s|$)/i.test(s) && !/\btencent\b/.test(s)) {
    s = `tencent ${s}`;
  }

  const qualifiers: string[] = [];
  const baseWithoutParens = s.replace(/\(([^)]+)\)/g, (_m, inner: string) => {
    qualifiers.push(inner.trim().toLowerCase());
    return ' ';
  });

  const paramTokens: string[] = [];
  const withoutParams = baseWithoutParens.replace(/\b(\d+(?:\.\d+)?)\s*([bm])\b/gi, (_m, n, u) => {
    paramTokens.push(`${n}${String(u).toLowerCase()}`);
    return ' ';
  });

  const variantTokens = new Set<string>();
  const words = baseWithoutParens.split(/[^a-z0-9]+/).filter(Boolean);
  for (const w of words) {
    if (STRICT_VARIANT_TOKENS.includes(w)) {
      variantTokens.add(w);
    }
  }

  return {
    compactFull: s.replace(/[^a-z0-9]/g, ''),
    compactBase: baseWithoutParens.replace(/[^a-z0-9]/g, ''),
    compactWithoutParams: withoutParams.replace(/[^a-z0-9]/g, ''),
    paramTokens,
    variantTokens,
    qualifiers,
  };
}

function haveCompatibleVariants(a: ParsedValsModelName, b: ParsedValsModelName): boolean {
  if (a.paramTokens.length > 0 && b.paramTokens.length > 0) {
    const sameParams =
      a.paramTokens.length === b.paramTokens.length &&
      a.paramTokens.every((p, idx) => b.paramTokens[idx] === p);
    if (!sameParams) return false;
  }

  for (const tok of STRICT_VARIANT_TOKENS) {
    if (a.variantTokens.has(tok) !== b.variantTokens.has(tok)) {
      return false;
    }
  }
  return true;
}

function scoreValsSheetCandidate(
  src: ValsLeaderboardModel,
  sheet: ValsSheetModelSnapshot
): number {
  const sNorm = normalizeValsModelName(src.name);
  const candidates = [
    normalizeValsModelName(sheet.displayName),
    normalizeValsModelName(sheet.name),
  ];

  let bestNameScore = 0;
  let matchedParsed = candidates[0];

  for (const c of candidates) {
    if (!haveCompatibleVariants(sNorm, c)) continue;

    let score = 0;
    if (c.compactFull === sNorm.compactFull) {
      score = 920;
    } else if (c.compactBase === sNorm.compactBase && c.compactBase.length >= 4) {
      score = 880;
    } else if (
      sNorm.paramTokens.length > 0 &&
      c.paramTokens.length === 0 &&
      c.compactBase === sNorm.compactWithoutParams &&
      c.compactBase.length >= 6
    ) {
      score = 810;
    } else if (
      sNorm.paramTokens.length === 0 &&
      c.paramTokens.length > 0 &&
      sNorm.compactBase === c.compactWithoutParams &&
      sNorm.compactBase.length >= 6
    ) {
      score = 790;
    } else if (
      c.compactBase.length >= 6 &&
      sNorm.compactBase.length >= 6 &&
      c.compactBase.startsWith(sNorm.compactBase) &&
      /^\d{4}$/.test(c.compactBase.slice(sNorm.compactBase.length))
    ) {
      score = 730;
    }

    if (score > bestNameScore) {
      bestNameScore = score;
      matchedParsed = c;
    }
  }

  if (bestNameScore === 0) return 0;

  let totalScore = bestNameScore;
  const qStr = matchedParsed.qualifiers.join(' ');
  if (/\b(max|xhigh|highest|high)\b/.test(qStr)) totalScore += 35;
  if (/\b(med|medium|low|fast|lite)\b/.test(qStr)) totalScore -= 90;

  if (sheet.colK !== null) totalScore += 40;
  if (sheet.colKIsBold === true) totalScore += 20;
  if (matchCompanyName(src.company, sheet.companyName)) totalScore += 25;
  totalScore += computeReleaseDateTiebreaker(sheet.releaseDate, 2025);

  return totalScore;
}

export interface ValsPreferencesInput {
  ignoredIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
}

export function buildValsDiffs(
  sourceModels: ValsLeaderboardModel[],
  sheetModels: ValsSheetModelSnapshot[],
  preferences?: ValsPreferencesInput
): ValsDiffItem[] {
  const ignoredSet = new Set(preferences?.ignoredIds ?? []);
  const { usedSheetRows, resolvedMatches } = reserveManualMappings(
    sourceModels,
    sheetModels,
    ignoredSet,
    preferences?.manualMappings ?? {}
  );

  for (const src of sourceModels) {
    if (ignoredSet.has(src.id) || resolvedMatches.has(src.id)) continue;

    let bestMatch: ValsSheetModelSnapshot | null = null;
    let bestScore = 0;

    for (const candidate of sheetModels) {
      if (usedSheetRows.has(candidate.sheetRowNumber)) continue;
      const score = scoreValsSheetCandidate(src, candidate);
      if (score >= 700 && score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestMatch) {
      usedSheetRows.add(bestMatch.sheetRowNumber);
      resolvedMatches.set(src.id, bestMatch);
    }
  }

  return sourceModels.map((src): ValsDiffItem => {
    const base = {
      valsId: src.id,
      valsName: src.name,
      company: src.company,
      rank: src.rank,
      liveScore: src.score,
      scoreDecimals: src.scoreDecimals,
      writeScore: src.score,
    };

    if (ignoredSet.has(src.id)) {
      return {
        ...base,
        status: 'ignored',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColK: null,
        currentColKIsBold: null,
        reason: 'Vom Benutzer ignoriert.',
      };
    }

    const bestMatch = resolvedMatches.get(src.id) ?? null;
    if (!bestMatch) {
      return {
        ...base,
        status: 'new_unmatched',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColK: null,
        currentColKIsBold: null,
        reason: 'Kein passendes Modell gefunden — zuordnen oder neu ergänzen.',
      };
    }

    if (bestMatch.colK === null) {
      return {
        ...base,
        status: 'missing',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColK: null,
        currentColKIsBold: bestMatch.colKIsBold,
        reason: 'Wert fehlt noch (wird offiziell übernommen).',
      };
    }

    const isEstimateNonBold = bestMatch.colKIsBold === false;
    const delta = Math.abs(bestMatch.colK - src.score);
    const liveFormatted = formatExactScore(src.score, src.scoreDecimals);

    if (isEstimateNonBold) {
      return {
        ...base,
        status: 'overwrite_estimate',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColK: bestMatch.colK,
        currentColKIsBold: false,
        reason: `Schätzwert (${bestMatch.colK}) → offiziellen Wert (${liveFormatted}) übernehmen.`,
      };
    }

    if (delta >= SCORE_DIFF_THRESHOLD) {
      return {
        ...base,
        status: 'changed',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColK: bestMatch.colK,
        currentColKIsBold: bestMatch.colKIsBold,
        reason: `Offizieller Wert weicht ab (${bestMatch.colK} → ${liveFormatted}).`,
      };
    }

    return {
      ...base,
      status: 'unchanged',
      matchedModelId: bestMatch.id,
      matchedDisplayName: bestMatch.displayName,
      sheetRowNumber: bestMatch.sheetRowNumber,
      currentColK: bestMatch.colK,
      currentColKIsBold: bestMatch.colKIsBold,
      reason: 'Synchron.',
    };
  });
}

function summarizeValsReportCounts(
  _totalSourceModels: number,
  versionLabel: string,
  diffs: ValsDiffItem[],
  hasSheetModels: boolean
) {
  const counts = countDiffStatuses(diffs);
  let summaryDe = '';
  let summaryEn = '';

  if (!hasSheetModels) {
    summaryDe = `Live-Daten für Vals Index ${versionLabel} geladen.`;
    summaryEn = `Live data loaded for Vals Index ${versionLabel}.`;
  } else if (counts.actionableCount > 0) {
    const partsDe: string[] = [];
    const partsEn: string[] = [];
    if (counts.unmatchedCount > 0) {
      partsDe.push(`${counts.unmatchedCount} nicht zugeordnet`);
      partsEn.push(`${counts.unmatchedCount} unmatched`);
    }
    if (counts.missingCount > 0) {
      partsDe.push(`${counts.missingCount} fehlend`);
      partsEn.push(`${counts.missingCount} missing`);
    }
    if (counts.overwriteEstimateCount > 0) {
      partsDe.push(
        counts.overwriteEstimateCount === 1 ? '1 Schätzwert' : `${counts.overwriteEstimateCount} Schätzwerte`
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
    summaryDe = 'Alle Einträge sind aktuell.';
    summaryEn = 'All entries are up to date.';
  }

  return { ...counts, summaryDe, summaryEn };
}

type ValsLiveResult = {
  updatedAt: string | null;
  versionLabel: string;
  models: ValsLeaderboardModel[];
  newlyDiscoveredIds: string[];
};

const runtime = createMonitorRuntime<
  ValsLeaderboardModel,
  ValsSheetModelSnapshot,
  ValsDiffItem,
  ValsCheckReport,
  ValsLiveResult
>({
  label: 'Vals',
  cacheFilePath: CACHE_FILE_PATH,
  sourceUrl: VALS_INDEX_URL,
  checkFailureFallbackMessage: 'Vals Index v2.2 check failed.',
  fetchLiveLeaderboard: fetchLiveValsLeaderboard,
  buildDiffs: buildValsDiffs,
  summarizeCounts: (live, diffs, hasSheetModels, existingReport) =>
    summarizeValsReportCounts(
      live.models.length,
      live.versionLabel || existingReport?.versionLabel || 'v2.2',
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
    versionLabel: live.versionLabel,
    sourceUrl: VALS_INDEX_URL,
    totalSourceModels: live.models.length,
    baselineKnownCount,
    newlyDiscoveredSourceIds: live.newlyDiscoveredIds,
    trigger,
    models: live.models,
    diffs,
    ...counts,
  }),
  getDiffSourceId: (d) => d.valsId,
  markDiffIgnored: (d) => ({
    ...d,
    status: 'ignored',
    matchedModelId: null,
    matchedDisplayName: null,
    sheetRowNumber: null,
    currentColK: null,
    currentColKIsBold: null,
    reason: 'Vom Benutzer ignoriert.',
  }),
});

export const isValsReportDue = runtime.isReportDue;

export async function getValsMonitorStatus(): Promise<ValsMonitorStatusResponse> {
  return runtime.getStatus();
}

export async function runValsCheck(options?: {
  models?: ValsSheetModelSnapshot[];
  trigger?: 'manual' | 'daily_auto';
  replaceAll?: boolean;
  ignoredIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
}): Promise<ValsCheckReport> {
  return runtime.runCheck(options);
}

export async function updateValsPreferences(options: {
  replaceAll?: boolean;
  ignoredIds?: string[];
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  unmapIds?: string[];
  models?: ValsSheetModelSnapshot[];
}): Promise<ValsCheckReport | null> {
  return runtime.updatePreferences(options);
}
