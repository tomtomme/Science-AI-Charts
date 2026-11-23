import os from 'node:os';
import path from 'node:path';
import type { ManualRowMapping } from '../src/types/integrityMonitor.ts';
import type {
  SimpleBenchCheckReport,
  SimpleBenchDiffItem,
  SimpleBenchLeaderboardModel,
  SimpleBenchMonitorStatusResponse,
  SimpleBenchSheetModelSnapshot,
} from '../src/types/simpleBenchMonitor.ts';
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

const SIMPLE_BENCH_URL = 'https://simple-bench.com/';
const FALLBACK_DATA_URL = 'https://simple-bench.com/static/js/leaderboard-data.js';
const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-simplebench-monitor-cache-v2.json');

async function fetchSimpleBenchText(url: string, accept: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'simple-bench.com') {
    throw new Error(`Blocked unexpected URL host: ${parsed.hostname}`);
  }
  return fetchTextWithTimeout(
    parsed.href,
    'Science-AI-Charts-SimpleBenchMonitor/1.0 (+https://simple-bench.com/)',
    accept
  );
}

/**
 * Converts JS object-literal array syntax (`const leaderboardData = [ { rank: "1st", ... }, ];`)
 * into valid JSON cleanly without eval() or new Function().
 */
function parseLeaderboardArrayFromJs(js: string): Array<Record<string, unknown>> {
  const markerIdx = js.indexOf('leaderboardData');
  const startBracket = js.indexOf('[', markerIdx !== -1 ? markerIdx : 0);
  if (startBracket === -1) {
    throw new Error('Could not find leaderboardData array in leaderboard-data.js.');
  }

  let depth = 0;
  let inString = false;
  let quoteChar = '';
  let endBracket = -1;

  for (let i = startBracket; i < js.length; i++) {
    const ch = js[i];
    if (inString) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quoteChar) {
        inString = false;
      }
      continue;
    }

    if (ch === '/' && js[i + 1] === '/') {
      const nl = js.indexOf('\n', i + 2);
      if (nl === -1) break;
      i = nl;
      continue;
    }
    if (ch === '/' && js[i + 1] === '*') {
      const close = js.indexOf('*/', i + 2);
      if (close === -1) break;
      i = close + 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quoteChar = ch;
    } else if (ch === '[') {
      depth++;
    } else if (ch === ']') {
      depth--;
      if (depth === 0) {
        endBracket = i;
        break;
      }
    }
  }

  if (endBracket === -1) {
    throw new Error('Unterminated leaderboardData array in leaderboard-data.js.');
  }

  const slice = js.slice(startBracket, endBracket + 1);
  let jsonOut = '';
  inString = false;
  quoteChar = '';

  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];

    if (!inString) {
      if (ch === '/' && slice[i + 1] === '/') {
        const nl = slice.indexOf('\n', i + 2);
        if (nl === -1) break;
        i = nl;
        continue;
      }
      if (ch === '/' && slice[i + 1] === '*') {
        const close = slice.indexOf('*/', i + 2);
        if (close === -1) break;
        i = close + 1;
        continue;
      }

      if (ch === '"' || ch === "'") {
        inString = true;
        quoteChar = ch;
        jsonOut += '"';
        continue;
      }

      if (/[A-Za-z_$]/.test(ch)) {
        const prevSignificant = jsonOut.trimEnd().slice(-1);
        if (prevSignificant === '{' || prevSignificant === ',') {
          let j = i + 1;
          while (j < slice.length && /[A-Za-z0-9_$]/.test(slice[j])) j++;
          let k = j;
          while (k < slice.length && /\s/.test(slice[k])) k++;
          if (slice[k] === ':') {
            const keyName = slice.slice(i, j);
            jsonOut += `"${keyName}"`;
            i = j - 1;
            continue;
          }
        }
      }

      if (ch === ',') {
        let k = i + 1;
        while (k < slice.length && /\s/.test(slice[k])) k++;
        if (slice[k] === '}' || slice[k] === ']') {
          continue;
        }
      }

      jsonOut += ch;
    } else {
      if (ch === '\\') {
        const next = slice[i + 1];
        if (next === "'") {
          jsonOut += "'";
          i++;
          continue;
        }
        jsonOut += ch + (next ?? '');
        i++;
        continue;
      }
      if (ch === quoteChar) {
        inString = false;
        jsonOut += '"';
        continue;
      }
      if (quoteChar === "'" && ch === '"') {
        jsonOut += '\\"';
        continue;
      }
      jsonOut += ch;
    }
  }

  const parsed = JSON.parse(jsonOut);
  if (!Array.isArray(parsed)) {
    throw new Error('Parsed SimpleBench leaderboardData is not an array.');
  }
  return parsed as Array<Record<string, unknown>>;
}

function toCanonicalSimpleBenchId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function fetchLiveSimpleBenchLeaderboard(
  previousKnownIds: string[] = []
): Promise<{
  updatedAt: string | null;
  models: SimpleBenchLeaderboardModel[];
  newlyDiscoveredIds: string[];
}> {
  const html = await fetchSimpleBenchText(SIMPLE_BENCH_URL, 'text/html,*/*');
  const scriptMatch = html.match(/<script[^>]*src=["']([^"']*leaderboard-data[^"']*)["']/i);
  const resolvedJsUrl = scriptMatch
    ? new URL(scriptMatch[1], SIMPLE_BENCH_URL).href
    : FALLBACK_DATA_URL;

  const js = await fetchSimpleBenchText(resolvedJsUrl, 'application/javascript,text/javascript,*/*');
  const rawEntries = parseLeaderboardArrayFromJs(js);

  const prevSet = new Set(previousKnownIds);
  const hasBaseline = prevSet.size > 0;
  const seenIds = new Set<string>();
  const models: SimpleBenchLeaderboardModel[] = [];

  let latestDate: string | null = null;
  let llmRankCounter = 0;

  for (const entry of rawEntries) {
    const rankLabel = String(entry.rank ?? '').trim();
    const name = String(entry.model ?? '').trim();
    const org = String(entry.organization ?? '').trim();
    const scoreRaw = String(entry.score ?? '').trim().replace(/%$/, '');
    const dateAdded =
      typeof entry.dateAdded === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.dateAdded.trim())
        ? entry.dateAdded.trim()
        : null;

    if (!name) continue;
    if (rankLabel === '-' || /\bhuman\b/i.test(name)) continue;

    const score = Number(scoreRaw);
    if (!Number.isFinite(score)) continue;
    const dotIdx = scoreRaw.indexOf('.');
    const scoreDecimals = dotIdx !== -1 ? scoreRaw.length - dotIdx - 1 : 0;

    llmRankCounter++;
    const rankMatch = rankLabel.match(/^(\d+)/);
    const rank = rankMatch ? Number(rankMatch[1]) : llmRankCounter;

    const id = toCanonicalSimpleBenchId(name);
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    if (dateAdded && (!latestDate || dateAdded > latestDate)) {
      latestDate = dateAdded;
    }

    models.push({
      id,
      name,
      organization: org,
      rank,
      rankLabel: rankLabel || `${rank}`,
      score,
      scoreDecimals,
      dateAdded,
      isNewToSource: hasBaseline && !prevSet.has(id),
    });
  }

  if (models.length < 30) {
    throw new Error(`Parsed unexpectedly few SimpleBench rows (${models.length}).`);
  }

  models.sort((a, b) => a.rank - b.rank || b.score - a.score);
  const newlyDiscoveredIds = models.filter((m) => m.isNewToSource).map((m) => m.id);

  return {
    updatedAt: latestDate,
    models,
    newlyDiscoveredIds,
  };
}

interface ParsedSimpleBenchName {
  compactFull: string;
  compactBase: string;
  compactWithoutParams: string;
  compactNoDate: string;
  paramTokens: string[];
  variantTokens: Set<string>;
  alnumTokens: string[];
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
  'air',
  'open',
  'oss',
  'sonnet',
  'opus',
  'haiku',
  'fable',
  'spark',
  'glimmer',
  'wonder',
  'full',
  'ember',
  'coder',
  'thinking',
];

function normalizeSimpleBenchName(raw: string): ParsedSimpleBenchName {
  let s = (raw || '').toLowerCase().trim();
  s = s.replace(/[^\p{L}\p{N}\s()._-]/gu, ' ');

  s = s.replace(/\bchatgpt[-\s]*/g, 'gpt ');
  s = s.replace(/\bdeepseek\s+v(?=\d)/g, 'deepseek ');
  s = s.replace(/\bqwen(?=\d)/g, 'qwen ');
  s = s.replace(/\bminimax[-\s]*/g, 'minimax ');
  s = s.replace(/\bpreview\b/g, 'prev');
  s = s.replace(/\bv(?=\d+(?:\.\d+)?\b)/g, '');
  s = s.replace(/(\b\d+)\.0\b/g, '$1');

  s = s.replace(/\(oct\s*'?24\)/g, ' 10-22 ');
  s = s.replace(/\(june?\s*'?24\)/g, ' 06-20 ');
  s = s.replace(/\(aug\s*'?24\)/g, ' 08-06 ');
  s = s.replace(/\(sep\s*'?24\)/g, ' 09-24 ');

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

  const withoutDates = baseWithoutParens
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{4}\b/g, ' ')
    .replace(/\b00\d\b/g, ' ');

  const variantTokens = new Set<string>();
  const baseWords = baseWithoutParens.split(/[^a-z0-9]+/).filter(Boolean);
  for (const w of baseWords) {
    if (STRICT_VARIANT_TOKENS.includes(w)) {
      variantTokens.add(w);
    }
  }

  const alnumTokens = withoutDates
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0 && w !== 'instruct' && w !== 'chat');

  return {
    compactFull: s.replace(/[^a-z0-9]/g, ''),
    compactBase: baseWithoutParens.replace(/[^a-z0-9]/g, ''),
    compactWithoutParams: withoutParams.replace(/[^a-z0-9]/g, ''),
    compactNoDate: withoutDates.replace(/[^a-z0-9]/g, ''),
    paramTokens,
    variantTokens,
    alnumTokens,
    qualifiers,
  };
}

function haveCompatibleVariants(a: ParsedSimpleBenchName, b: ParsedSimpleBenchName): boolean {
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

function sameTokenSet(a: string[], b: string[]): boolean {
  if (a.length < 2 || b.length < 2) return false;
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const t of setA) {
    if (!setB.has(t)) return false;
  }
  return true;
}

function scoreSimpleBenchCandidate(
  src: SimpleBenchLeaderboardModel,
  sheet: SimpleBenchSheetModelSnapshot
): number {
  const sNorm = normalizeSimpleBenchName(src.name);
  const candidates = [
    normalizeSimpleBenchName(sheet.displayName),
    normalizeSimpleBenchName(sheet.name),
  ];

  let bestNameScore = 0;
  let matchedParsed = candidates[0];

  for (const c of candidates) {
    if (!haveCompatibleVariants(sNorm, c)) continue;

    let score = 0;
    if (c.compactFull === sNorm.compactFull) {
      score = 930;
    } else if (c.compactBase === sNorm.compactBase && c.compactBase.length >= 2) {
      score = 890;
    } else if (c.compactNoDate === sNorm.compactNoDate && c.compactNoDate.length >= 2) {
      score = 850;
    } else if (sameTokenSet(sNorm.alnumTokens, c.alnumTokens)) {
      score = 830;
    } else if (
      sNorm.paramTokens.length > 0 &&
      c.paramTokens.length === 0 &&
      c.compactBase === sNorm.compactWithoutParams &&
      c.compactBase.length >= 6
    ) {
      score = 805;
    } else if (
      sNorm.paramTokens.length === 0 &&
      c.paramTokens.length > 0 &&
      sNorm.compactBase === c.compactWithoutParams &&
      sNorm.compactBase.length >= 6
    ) {
      score = 785;
    } else if (
      c.compactNoDate.length >= 6 &&
      sNorm.compactNoDate.length >= 6 &&
      (c.compactNoDate.startsWith(sNorm.compactNoDate) ||
        sNorm.compactNoDate.startsWith(c.compactNoDate))
    ) {
      const longer =
        c.compactNoDate.length >= sNorm.compactNoDate.length
          ? c.compactNoDate
          : sNorm.compactNoDate;
      const shorter =
        c.compactNoDate.length < sNorm.compactNoDate.length
          ? c.compactNoDate
          : sNorm.compactNoDate;
      const suffix = longer.slice(shorter.length);
      if (/^(\d{4}|a22b|instruct)+$/.test(suffix)) {
        score = 735;
      }
    }

    if (score > bestNameScore) {
      bestNameScore = score;
      matchedParsed = c;
    }
  }

  if (bestNameScore === 0) return 0;

  let totalScore = bestNameScore;
  const sQual = sNorm.qualifiers.join(' ');
  const cQual = matchedParsed.qualifiers.join(' ');
  if (/\b(max|xhigh|highest|high)\b/.test(cQual) && !/\b(med|low)\b/.test(sQual)) {
    totalScore += 30;
  }
  if (/\b(med|medium|low|fast|lite)\b/.test(cQual) && !/\b(med|medium|low)\b/.test(sQual)) {
    totalScore -= 85;
  }

  if (sheet.colY !== null) totalScore += 40;
  if (sheet.colYIsBold === true) totalScore += 20;
  if (matchCompanyName(src.organization, sheet.companyName, { includeMetaLlama: true })) {
    totalScore += 20;
  }
  totalScore += computeReleaseDateTiebreaker(sheet.releaseDate, 2024);

  return totalScore;
}

export interface SimpleBenchPreferencesInput {
  ignoredIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
}

export function buildSimpleBenchDiffs(
  sourceModels: SimpleBenchLeaderboardModel[],
  sheetModels: SimpleBenchSheetModelSnapshot[],
  preferences?: SimpleBenchPreferencesInput
): SimpleBenchDiffItem[] {
  const ignoredSet = new Set(preferences?.ignoredIds ?? []);
  const { usedSheetRows, resolvedMatches } = reserveManualMappings(
    sourceModels,
    sheetModels,
    ignoredSet,
    preferences?.manualMappings ?? {}
  );

  // Pass 2: Automatic matching sorted by specificity/rank so exact matches reserve their row first
  const candidatesScored: Array<{
    src: SimpleBenchLeaderboardModel;
    sheet: SimpleBenchSheetModelSnapshot;
    score: number;
  }> = [];

  for (const src of sourceModels) {
    if (ignoredSet.has(src.id) || resolvedMatches.has(src.id)) continue;
    for (const candidate of sheetModels) {
      if (usedSheetRows.has(candidate.sheetRowNumber)) continue;
      const sc = scoreSimpleBenchCandidate(src, candidate);
      if (sc >= 700) {
        candidatesScored.push({ src, sheet: candidate, score: sc });
      }
    }
  }

  candidatesScored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.src.rank - b.src.rank;
  });

  for (const pair of candidatesScored) {
    if (resolvedMatches.has(pair.src.id) || usedSheetRows.has(pair.sheet.sheetRowNumber)) {
      continue;
    }
    usedSheetRows.add(pair.sheet.sheetRowNumber);
    resolvedMatches.set(pair.src.id, pair.sheet);
  }

  return sourceModels.map((src): SimpleBenchDiffItem => {
    const base = {
      simpleBenchId: src.id,
      simpleBenchName: src.name,
      organization: src.organization,
      rank: src.rank,
      liveScore: src.score,
      scoreDecimals: src.scoreDecimals,
      dateAdded: src.dateAdded,
    };

    if (ignoredSet.has(src.id)) {
      return {
        ...base,
        status: 'ignored',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColY: null,
        currentColYIsBold: null,
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
        currentColY: null,
        currentColYIsBold: null,
        reason: 'Kein passendes Modell im Sheet gefunden — zuordnen oder als neue Zeile ergänzen.',
      };
    }

    if (bestMatch.colY === null) {
      return {
        ...base,
        status: 'missing',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColY: null,
        currentColYIsBold: bestMatch.colYIsBold,
        reason:
          'Spalte Y ist in dieser Zeile noch leer (wird fett als offizieller Wert eingetragen).',
      };
    }

    const isEstimateNonBold = bestMatch.colYIsBold === false;
    const delta = Math.abs(bestMatch.colY - src.score);
    const liveFormatted = formatExactScore(src.score, src.scoreDecimals);

    if (isEstimateNonBold) {
      return {
        ...base,
        status: 'overwrite_estimate',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColY: bestMatch.colY,
        currentColYIsBold: false,
        reason: `Nicht-fetter Schätzwert (${bestMatch.colY}) → offiziellen SimpleBench-Score (${liveFormatted}, fett) übernehmen.`,
      };
    }

    if (delta >= SCORE_DIFF_THRESHOLD) {
      return {
        ...base,
        status: 'changed',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColY: bestMatch.colY,
        currentColYIsBold: bestMatch.colYIsBold,
        reason: `Offizieller Score weicht ab (${bestMatch.colY} → ${liveFormatted}).`,
      };
    }

    return {
      ...base,
      status: 'unchanged',
      matchedModelId: bestMatch.id,
      matchedDisplayName: bestMatch.displayName,
      sheetRowNumber: bestMatch.sheetRowNumber,
      currentColY: bestMatch.colY,
      currentColYIsBold: bestMatch.colYIsBold,
      reason: 'Synchron (fett/offiziell).',
    };
  });
}

function summarizeSimpleBenchReportCounts(
  totalSourceModels: number,
  diffs: SimpleBenchDiffItem[],
  hasSheetModels: boolean
) {
  const counts = countDiffStatuses(diffs);
  let summaryDe = '';
  let summaryEn = '';

  if (!hasSheetModels) {
    summaryDe = `${totalSourceModels} Modelle live auf SimpleBench geladen.`;
    summaryEn = `Loaded ${totalSourceModels} live models from SimpleBench.`;
  } else if (counts.actionableCount > 0) {
    const partsDe: string[] = [];
    const partsEn: string[] = [];
    if (counts.unmatchedCount > 0) {
      partsDe.push(`${counts.unmatchedCount} neu ohne Zeile`);
      partsEn.push(`${counts.unmatchedCount} new unmatched`);
    }
    if (counts.missingCount > 0) {
      partsDe.push(`${counts.missingCount} fehlend in Y`);
      partsEn.push(`${counts.missingCount} missing in Y`);
    }
    if (counts.overwriteEstimateCount > 0) {
      partsDe.push(`${counts.overwriteEstimateCount} nicht-fette Schätzwerte`);
      partsEn.push(`${counts.overwriteEstimateCount} non-bold estimate(s)`);
    }
    if (counts.changedCount > 0) {
      partsDe.push(`${counts.changedCount} geänderte Score(s)`);
      partsEn.push(`${counts.changedCount} changed score(s)`);
    }
    summaryDe = `${partsDe.join(', ')} (${totalSourceModels} LLMs auf SimpleBench).`;
    summaryEn = `${partsEn.join(', ')} (${totalSourceModels} LLMs on SimpleBench).`;
  } else {
    summaryDe = `Alle ${totalSourceModels} SimpleBench-Einträge sind in Spalte Y aktuell (fett).`;
    summaryEn = `All ${totalSourceModels} SimpleBench entries are synced & bold in Column Y.`;
  }

  return { ...counts, summaryDe, summaryEn };
}

const runtime = createMonitorRuntime<
  SimpleBenchLeaderboardModel,
  SimpleBenchSheetModelSnapshot,
  SimpleBenchDiffItem,
  SimpleBenchCheckReport
>({
  label: 'SimpleBench',
  cacheFilePath: CACHE_FILE_PATH,
  sourceUrl: SIMPLE_BENCH_URL,
  checkFailureFallbackMessage: 'SimpleBench check failed.',
  fetchLiveLeaderboard: fetchLiveSimpleBenchLeaderboard,
  buildDiffs: buildSimpleBenchDiffs,
  summarizeCounts: (live, diffs, hasSheetModels) =>
    summarizeSimpleBenchReportCounts(live.models.length, diffs, hasSheetModels),
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
    sourceUrl: SIMPLE_BENCH_URL,
    totalSourceModels: live.models.length,
    baselineKnownCount,
    newlyDiscoveredSourceIds: live.newlyDiscoveredIds,
    trigger,
    models: live.models,
    diffs,
    ...counts,
  }),
  getDiffSourceId: (d) => d.simpleBenchId,
  markDiffIgnored: (d) => ({
    ...d,
    status: 'ignored',
    matchedModelId: null,
    matchedDisplayName: null,
    sheetRowNumber: null,
    currentColY: null,
    currentColYIsBold: null,
    reason: 'Vom Benutzer ignoriert.',
  }),
});

export const isSimpleBenchReportDue = runtime.isReportDue;

export async function getSimpleBenchMonitorStatus(): Promise<SimpleBenchMonitorStatusResponse> {
  return runtime.getStatus();
}

export async function runSimpleBenchCheck(options?: {
  models?: SimpleBenchSheetModelSnapshot[];
  trigger?: 'manual' | 'daily_auto';
}): Promise<SimpleBenchCheckReport> {
  return runtime.runCheck(options);
}

export async function updateSimpleBenchPreferences(options: {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  unmapIds?: string[];
  models?: SimpleBenchSheetModelSnapshot[];
}): Promise<SimpleBenchCheckReport | null> {
  return runtime.updatePreferences(options);
}
