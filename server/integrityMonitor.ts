import os from 'node:os';
import path from 'node:path';
import { decodeHtmlEntities } from './utils/html.ts';
import type {
  IntegrityCheckReport,
  IntegrityDiffItem,
  IntegrityLeaderboardModel,
  IntegrityMonitorStatusResponse,
  IntegritySheetModelSnapshot,
  ManualRowMapping,
} from '../src/types/integrityMonitor.ts';
import {
  SCORE_DIFF_THRESHOLD,
  computeReleaseDateTiebreaker,
  countDiffStatuses,
  createMonitorRuntime,
  fetchTextWithTimeout,
  formatExactScore,
  reserveManualMappings,
} from './utils/monitorBase.ts';

const INTEGRITY_URL = 'https://integrity-bench.com/';
const INTEGRITY_INDEX_URL = 'https://integrity-bench.com/data/index.json';
const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-integrity-monitor-cache-v2.json');

// The 43 baseline models present in the Integrity-Bench Table view when initialized.
// Any model outside this set is a new leaderboard entry; if a Sheet row already has an estimate in Col AN, it is flagged to overwrite.
const INITIAL_BASELINE_INTEGRITY_IDS = new Set<string>([
  'claude-fable-5.2',
  'claude-opus-5.5',
  'muse-spark-1.2',
  'muse-glimmer-30b',
  'gpt-6.2-astra',
  'muse-spark-1.1',
  'claude-opus-5',
  'claude-opus-4.8',
  'claude-sonnet-5',
  'claude-fable-5.1',
  'muse-wonder',
  'gemini-3.1-pro',
  'grok-4.5',
  'gemini-4-neon',
  'muse-spark-1.3',
  'grok-4.6',
  'gemini-4-carbon',
  'claude-fable-5',
  'kimi-k3',
  'gpt-6-astra',
  'gpt-5.5',
  'gpt-6.2-sol',
  'gpt-6-sol',
  'deepseek-v4.1-flash',
  'gpt-6-luna',
  'gpt-5.6-sol',
  'gemini-4-hydrogen',
  'gpt-6.1-sol',
  'gpt-5.6-terra',
  'gemini-4-argon',
  'gemini-3.8-flash',
  'gpt-5.6-luna',
  'glm-5.3-flash',
  'gemma-4-26b',
  'inkling',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'qwen-3.6',
  'gemini-3.6-flash',
  'deepseek-v4-pro',
  'glm-5.2',
  'gpt-4o',
  'gpt-3.5-turbo',
]);

function toCanonicalIntegrityId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseIntegrityTableRowsFromHtml(
  html: string,
  previousKnownIds: string[]
): IntegrityLeaderboardModel[] {
  const mountIdx = html.indexOf('id="cal-table-mount"');
  if (mountIdx === -1) {
    throw new Error('Could not find #cal-table-mount Table container on integrity-bench.com.');
  }

  const sectionEndIdx = html.indexOf('</section>', mountIdx);
  const tableSectionHtml =
    sectionEndIdx !== -1
      ? html.slice(mountIdx, sectionEndIdx)
      : html.slice(mountIdx, mountIdx + 200000);

  const prevSet = new Set(previousKnownIds);
  const hasBaseline = prevSet.size > 0;
  const models: IntegrityLeaderboardModel[] = [];
  const seenIds = new Set<string>();

  const trRegex = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(tableSectionHtml)) !== null) {
    const attrs = trMatch[1] || '';
    const rowHtml = trMatch[2] || '';
    if (!/\bdata-i=/.test(attrs)) continue;

    const nameMatch = rowHtml.match(/<span[^>]*class="m-name"[^>]*>([\s\S]*?)<\/span>/i);
    if (!nameMatch) continue;
    const name = decodeHtmlEntities(nameMatch[1].replace(/<[^>]+>/g, ''));
    if (!name) continue;

    const rankMatch = rowHtml.match(/<span[^>]*class="m-rank"[^>]*>(\d+)/i);
    const rank = rankMatch ? Number(rankMatch[1]) : models.length + 1;

    const numCells = Array.from(rowHtml.matchAll(/<td[^>]*class="num"[^>]*>([\s\S]*?)<\/td>/gi));
    if (numCells.length === 0) continue;

    const scoreCell = numCells[0][1];
    const scoreMatch = scoreCell.match(/([-+]?\d+(?:\.\d+)?)/);
    if (!scoreMatch) continue;
    const rawScoreStr = scoreMatch[1];
    const score = Number(rawScoreStr);
    if (!Number.isFinite(score)) continue;
    const dotIdx = rawScoreStr.indexOf('.');
    const scoreDecimals = dotIdx !== -1 ? rawScoreStr.length - dotIdx - 1 : 0;

    const scoreErrMatch = scoreCell.match(/±\s*([\d.]+)/);
    const scoreError = scoreErrMatch ? Number(scoreErrMatch[1]) : null;

    let accuracy: number | null = null;
    let accuracyError: number | null = null;
    if (numCells.length >= 2) {
      const accCell = numCells[1][1];
      const accMatch = accCell.match(/([-+]?\d+(?:\.\d+)?)\s*%/);
      if (accMatch) {
        accuracy = Number(accMatch[1]);
      }
      const accErrMatch = accCell.match(/±\s*([\d.]+)/);
      if (accErrMatch) {
        accuracyError = Number(accErrMatch[1]);
      }
    }

    const isSiteNew = /class="m-new"/i.test(rowHtml);
    const id = toCanonicalIntegrityId(name);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    models.push({
      id,
      name,
      rank: Number.isFinite(rank) ? rank : models.length + 1,
      score,
      scoreDecimals,
      scoreError: typeof scoreError === 'number' && Number.isFinite(scoreError) ? scoreError : null,
      accuracy: typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : null,
      accuracyError:
        typeof accuracyError === 'number' && Number.isFinite(accuracyError) ? accuracyError : null,
      isSiteNew,
      isNewToSource: hasBaseline && !prevSet.has(id),
    });
  }

  if (models.length < 25) {
    throw new Error(
      `Parsed unexpectedly few Integrity-Bench rows (${models.length}) from #cal-table-mount.`
    );
  }

  models.sort((a, b) => a.rank - b.rank);
  return models;
}

export async function fetchLiveIntegrityLeaderboard(
  previousKnownIds: string[] = []
): Promise<{
  updatedAt: string | null;
  models: IntegrityLeaderboardModel[];
  newlyDiscoveredIds: string[];
}> {
  const userAgent = 'Science-AI-Charts-IntegrityMonitor/1.0 (+https://integrity-bench.com/)';
  const [html, indexJsonResult] = await Promise.all([
    fetchTextWithTimeout(INTEGRITY_URL, userAgent, 'text/html,*/*'),
    fetchTextWithTimeout(INTEGRITY_INDEX_URL, userAgent, 'application/json,*/*').catch(() => null),
  ]);

  let updatedAt: string | null = null;
  if (indexJsonResult) {
    try {
      const parsed = JSON.parse(indexJsonResult) as { generated_at?: string };
      if (typeof parsed?.generated_at === 'string' && parsed.generated_at) {
        updatedAt = parsed.generated_at;
      }
    } catch {
      // Optional metadata only
    }
  }

  const models = parseIntegrityTableRowsFromHtml(html, previousKnownIds);
  const newlyDiscoveredIds = models.filter((m) => m.isNewToSource).map((m) => m.id);

  return {
    updatedAt,
    models,
    newlyDiscoveredIds,
  };
}

interface ParsedModelName {
  compactFull: string;
  compactBase: string;
  compactWithoutParams: string;
  paramTokens: string[];
  qualifiers: string[];
}

function normalizeIntegrityModelName(raw: string): ParsedModelName {
  let s = (raw || '').toLowerCase().trim();
  s = s.replace(/[^\p{L}\p{N}\s()._-]/gu, ' ');
  s = s.replace(/\bchatgpt[-\s]*/g, 'gpt ');
  s = s.replace(/\bdeepseek\s+v(?=\d)/g, 'deepseek ');
  s = s.replace(/\bqwen(?=\d)/g, 'qwen ');
  s = s.replace(/\bminimax[-\s]*/g, 'minimax ');
  s = s.replace(/(\b\d+)\.0\b/g, '$1');

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

  return {
    compactFull: s.replace(/[^a-z0-9]/g, ''),
    compactBase: baseWithoutParens.replace(/[^a-z0-9]/g, ''),
    compactWithoutParams: withoutParams.replace(/[^a-z0-9]/g, ''),
    paramTokens,
    qualifiers,
  };
}

function scoreIntegrityCandidate(
  source: IntegrityLeaderboardModel,
  sheet: IntegritySheetModelSnapshot
): number {
  const sNorm = normalizeIntegrityModelName(source.name);
  const candidates = [
    normalizeIntegrityModelName(sheet.displayName),
    normalizeIntegrityModelName(sheet.name),
  ];

  let bestNameScore = 0;
  let matchedParsed = candidates[0];

  for (const c of candidates) {
    // Hard-reject explicit parameter-size mismatch (e.g. Gemma 4 26B MUST NOT match Gemma 4 31B)
    if (sNorm.paramTokens.length > 0 && c.paramTokens.length > 0) {
      const sameParams =
        sNorm.paramTokens.length === c.paramTokens.length &&
        sNorm.paramTokens.every((p, idx) => c.paramTokens[idx] === p);
      if (!sameParams) continue;
    }

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
  if (/\b(low|default)\b/.test(qStr)) totalScore += 25;
  if (/\b(high|xhigh|max)\b/.test(qStr)) totalScore -= 15;
  if (/\bprev(iew)?\b/i.test(sheet.displayName) || /\bprev(iew)?\b/i.test(sheet.name)) {
    if (!/\bprev(iew)?\b/i.test(source.name)) totalScore -= 120;
  }

  if (sheet.colAN !== null) totalScore += 40;
  if (sheet.colANIsBold === true) totalScore += 20;
  totalScore += computeReleaseDateTiebreaker(sheet.releaseDate, 2025);

  return totalScore;
}

export interface IntegrityPreferencesInput {
  ignoredIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
}

export function buildIntegrityDiffs(
  sourceModels: IntegrityLeaderboardModel[],
  sheetModels: IntegritySheetModelSnapshot[],
  preferences?: IntegrityPreferencesInput
): IntegrityDiffItem[] {
  const ignoredSet = new Set(preferences?.ignoredIds ?? []);
  const { usedSheetRows, resolvedMatches } = reserveManualMappings(
    sourceModels,
    sheetModels,
    ignoredSet,
    preferences?.manualMappings ?? {}
  );

  for (const src of sourceModels) {
    if (ignoredSet.has(src.id) || resolvedMatches.has(src.id)) continue;

    let bestMatch: IntegritySheetModelSnapshot | null = null;
    let bestScore = 0;

    for (const candidate of sheetModels) {
      if (usedSheetRows.has(candidate.sheetRowNumber)) continue;
      const score = scoreIntegrityCandidate(src, candidate);
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

  return sourceModels.map((src): IntegrityDiffItem => {
    const base = {
      integrityId: src.id,
      integrityName: src.name,
      rank: src.rank,
      liveScore: src.score,
      scoreDecimals: src.scoreDecimals,
      scoreError: src.scoreError,
      accuracy: src.accuracy,
      isSiteNew: src.isSiteNew,
      isNewToSource: src.isNewToSource,
    };

    if (ignoredSet.has(src.id)) {
      return {
        ...base,
        status: 'ignored',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColAN: null,
        currentColANIsBold: null,
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
        currentColAN: null,
        currentColANIsBold: null,
        reason:
          'Kein passendes Modell im Sheet gefunden — manuell zuordnen oder Zeile im Sheet anlegen.',
      };
    }

    if (bestMatch.colAN === null) {
      return {
        ...base,
        status: 'missing',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColAN: null,
        currentColANIsBold: bestMatch.colANIsBold,
        reason: 'Spalte AN ist in dieser Zeile noch leer (wird fett als offizieller Wert eingetragen).',
      };
    }

    const isEstimateNonBold = bestMatch.colANIsBold === false;
    const delta = Math.abs(bestMatch.colAN - src.score);
    const liveFormatted = formatExactScore(src.score, src.scoreDecimals);

    if (isEstimateNonBold) {
      return {
        ...base,
        status: 'overwrite_estimate',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColAN: bestMatch.colAN,
        currentColANIsBold: false,
        reason: `Nicht-fetter Schätzwert (${bestMatch.colAN}) → offiziellen Integrity-Score (${liveFormatted}, fett) übernehmen.`,
      };
    }

    if (delta >= SCORE_DIFF_THRESHOLD) {
      return {
        ...base,
        status: 'changed',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColAN: bestMatch.colAN,
        currentColANIsBold: bestMatch.colANIsBold,
        reason: `Offizieller Score weicht ab (${bestMatch.colAN} → ${liveFormatted}).`,
      };
    }

    return {
      ...base,
      status: 'unchanged',
      matchedModelId: bestMatch.id,
      matchedDisplayName: bestMatch.displayName,
      sheetRowNumber: bestMatch.sheetRowNumber,
      currentColAN: bestMatch.colAN,
      currentColANIsBold: bestMatch.colANIsBold,
      reason: 'Synchron (fett/offiziell).',
    };
  });
}

function summarizeIntegrityReportCounts(
  totalSourceModels: number,
  diffs: IntegrityDiffItem[],
  hasSheetModels: boolean
) {
  const counts = countDiffStatuses(diffs);
  let summaryDe = '';
  let summaryEn = '';

  if (!hasSheetModels) {
    summaryDe = `${totalSourceModels} LLMs live auf Integrity-Bench geladen.`;
    summaryEn = `Loaded ${totalSourceModels} live LLMs from Integrity-Bench.`;
  } else if (counts.actionableCount > 0) {
    const partsDe: string[] = [];
    const partsEn: string[] = [];
    if (counts.unmatchedCount > 0) {
      partsDe.push(`${counts.unmatchedCount} ohne Sheet-Zeile`);
      partsEn.push(`${counts.unmatchedCount} without Sheet match`);
    }
    if (counts.missingCount > 0) {
      partsDe.push(`${counts.missingCount} fehlend in AN`);
      partsEn.push(`${counts.missingCount} missing in AN`);
    }
    if (counts.overwriteEstimateCount > 0) {
      partsDe.push(`${counts.overwriteEstimateCount} nicht-fette Schätzwerte`);
      partsEn.push(`${counts.overwriteEstimateCount} non-bold estimate(s)`);
    }
    if (counts.changedCount > 0) {
      partsDe.push(`${counts.changedCount} geänderte Score(s)`);
      partsEn.push(`${counts.changedCount} changed score(s)`);
    }
    summaryDe = `${partsDe.join(', ')} (${totalSourceModels} LLMs auf Integrity-Bench).`;
    summaryEn = `${partsEn.join(', ')} (${totalSourceModels} LLMs on Integrity-Bench).`;
  } else {
    summaryDe = `Alle ${totalSourceModels} Integrity-Bench-LLMs sind in Spalte AN aktuell (fett).`;
    summaryEn = `All ${totalSourceModels} Integrity-Bench LLMs are synced & bold in Column AN.`;
  }

  return { ...counts, summaryDe, summaryEn };
}

const runtime = createMonitorRuntime<
  IntegrityLeaderboardModel,
  IntegritySheetModelSnapshot,
  IntegrityDiffItem,
  IntegrityCheckReport
>({
  label: 'Integrity',
  cacheFilePath: CACHE_FILE_PATH,
  sourceUrl: INTEGRITY_URL,
  initialBaselineIds: INITIAL_BASELINE_INTEGRITY_IDS,
  checkFailureFallbackMessage: 'Integrity-Bench check failed.',
  fetchLiveLeaderboard: fetchLiveIntegrityLeaderboard,
  buildDiffs: buildIntegrityDiffs,
  summarizeCounts: (live, diffs, hasSheetModels) =>
    summarizeIntegrityReportCounts(live.models.length, diffs, hasSheetModels),
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
    sourceUrl: INTEGRITY_URL,
    totalSourceModels: live.models.length,
    baselineKnownCount,
    newlyDiscoveredSourceIds: live.newlyDiscoveredIds,
    trigger,
    models: live.models,
    diffs,
    ...counts,
  }),
  getDiffSourceId: (d) => d.integrityId,
  markDiffIgnored: (d) => ({
    ...d,
    status: 'ignored',
    matchedModelId: null,
    matchedDisplayName: null,
    sheetRowNumber: null,
    currentColAN: null,
    currentColANIsBold: null,
    reason: 'Vom Benutzer ignoriert.',
  }),
});

export const isIntegrityReportDue = runtime.isReportDue;

export async function getIntegrityMonitorStatus(): Promise<IntegrityMonitorStatusResponse> {
  return runtime.getStatus();
}

export async function runIntegrityCheck(options?: {
  models?: IntegritySheetModelSnapshot[];
  trigger?: 'manual' | 'daily_auto';
}): Promise<IntegrityCheckReport> {
  return runtime.runCheck(options);
}

export async function updateIntegrityPreferences(options: {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  unmapIds?: string[];
  models?: IntegritySheetModelSnapshot[];
}): Promise<IntegrityCheckReport | null> {
  return runtime.updatePreferences(options);
}
