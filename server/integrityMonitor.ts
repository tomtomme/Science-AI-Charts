import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {
  IntegrityCheckReport,
  IntegrityDiffItem,
  IntegrityLeaderboardModel,
  IntegrityMonitorStatusResponse,
  IntegritySheetModelSnapshot,
  ManualRowMapping,
} from '../src/types/integrityMonitor.ts';

const INTEGRITY_URL = 'https://integrity-bench.com/';
const INTEGRITY_INDEX_URL = 'https://integrity-bench.com/data/index.json';
const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-integrity-monitor-cache-v1.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
// Integrity scores are reported with 1 decimal place (e.g. 33.4, -0.2, -277.7)
const SCORE_DIFF_THRESHOLD = 0.05;

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

interface PersistedIntegrityCache {
  report: IntegrityCheckReport | null;
  knownSourceIds: string[];
  ignoredIds: string[];
  manualMappings: Record<string, ManualRowMapping>;
  lastError: string | null;
}

let inMemoryCache: PersistedIntegrityCache | null = null;
let inFlightCheck: Promise<IntegrityCheckReport> | null = null;

function sanitizeManualMappings(raw: unknown): Record<string, ManualRowMapping> {
  const out: Record<string, ManualRowMapping> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v && typeof v === 'object') {
      const rec = v as Partial<ManualRowMapping>;
      if (typeof rec.sheetRowNumber === 'number' && rec.sheetRowNumber >= 36) {
        out[k] = {
          sheetRowNumber: rec.sheetRowNumber,
          ...(typeof rec.matchedModelId === 'string' && rec.matchedModelId
            ? { matchedModelId: rec.matchedModelId }
            : {}),
          ...(typeof rec.matchedDisplayName === 'string' && rec.matchedDisplayName
            ? { matchedDisplayName: rec.matchedDisplayName }
            : {}),
        };
      }
    }
  }
  return out;
}

async function readCache(): Promise<PersistedIntegrityCache> {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  try {
    const raw = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedIntegrityCache>;
    if (parsed && typeof parsed === 'object') {
      inMemoryCache = {
        report: parsed.report ?? null,
        knownSourceIds: Array.isArray(parsed.knownSourceIds)
          ? parsed.knownSourceIds.map(String)
          : [],
        ignoredIds: Array.isArray(parsed.ignoredIds) ? parsed.ignoredIds.map(String) : [],
        manualMappings: sanitizeManualMappings(parsed.manualMappings),
        lastError: parsed.lastError ?? null,
      };
      return inMemoryCache;
    }
  } catch {
    // Cache file may not exist yet
  }

  inMemoryCache = {
    report: null,
    knownSourceIds: [],
    ignoredIds: [],
    manualMappings: {},
    lastError: null,
  };
  return inMemoryCache;
}

async function writeCache(cache: PersistedIntegrityCache): Promise<void> {
  inMemoryCache = cache;
  try {
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist Integrity monitor cache to temp dir:', err);
  }
}

export function isIntegrityReportDue(report: IntegrityCheckReport | null): boolean {
  if (!report?.checkedAt) return true;
  const checkedMs = new Date(report.checkedAt).getTime();
  if (!Number.isFinite(checkedMs)) return true;
  return Date.now() - checkedMs >= CHECK_INTERVAL_MS;
}

export async function getIntegrityMonitorStatus(): Promise<IntegrityMonitorStatusResponse> {
  const cache = await readCache();
  return {
    report: cache.report,
    isDue: isIntegrityReportDue(cache.report),
    isRunning: inFlightCheck !== null,
    checkIntervalHours: 24,
    lastError: cache.lastError,
  };
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function toCanonicalIntegrityId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchTextWithTimeout(url: string, accept: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Science-AI-Charts-IntegrityMonitor/1.0 (+https://integrity-bench.com/)',
      Accept: accept,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} while fetching ${url}`);
  }
  return res.text();
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
    sectionEndIdx !== -1 ? html.slice(mountIdx, sectionEndIdx) : html.slice(mountIdx, mountIdx + 200000);

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
    const rawScore = Number(scoreMatch[1]);
    if (!Number.isFinite(rawScore)) continue;
    const score = Math.round(rawScore * 10) / 10;

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
  const [html, indexJsonResult] = await Promise.all([
    fetchTextWithTimeout(INTEGRITY_URL, 'text/html,*/*'),
    fetchTextWithTimeout(INTEGRITY_INDEX_URL, 'application/json,*/*').catch(() => null),
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
  // Remove leading flags / emojis / decorative markers
  s = s.replace(/[^\p{L}\p{N}\s()._-]/gu, ' ');
  // Normalize OpenAI naming: ChatGPT-6 -> GPT 6
  s = s.replace(/\bchatgpt[-\s]*/g, 'gpt ');
  // Normalize DeepSeek V4.1 -> DeepSeek 4.1
  s = s.replace(/\bdeepseek\s+v(?=\d)/g, 'deepseek ');
  // Normalize Qwen3.6 -> Qwen 3.6
  s = s.replace(/\bqwen(?=\d)/g, 'qwen ');
  // Normalize MiniMax-M3.1 -> MiniMax M3.1
  s = s.replace(/\bminimax[-\s]*/g, 'minimax ');
  // Normalize integer .0 versions: "Gemini 4.0 Hydrogen" -> "Gemini 4 Hydrogen", "Claude Opus 5.0" -> "Claude Opus 5"
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

  const compactFull = s.replace(/[^a-z0-9]/g, '');
  const compactBase = baseWithoutParens.replace(/[^a-z0-9]/g, '');
  const compactWithoutParams = withoutParams.replace(/[^a-z0-9]/g, '');

  return { compactFull, compactBase, compactWithoutParams, paramTokens, qualifiers };
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
      // e.g. "Muse Glimmer 30B" -> Sheet "Muse Glimmer" (when Sheet omits parameter count)
      score = 810;
    } else if (
      sNorm.paramTokens.length === 0 &&
      c.paramTokens.length > 0 &&
      sNorm.compactBase === c.compactWithoutParams &&
      sNorm.compactBase.length >= 6
    ) {
      // e.g. "Qwen 3.6" -> Sheet "Qwen 3.6 35B" (when Sheet appends parameter count)
      score = 790;
    } else if (
      c.compactBase.length >= 6 &&
      sNorm.compactBase.length >= 6 &&
      c.compactBase.startsWith(sNorm.compactBase) &&
      /^\d{4}$/.test(c.compactBase.slice(sNorm.compactBase.length))
    ) {
      // e.g. "DeepSeek V4 Pro" -> Sheet "DeepSeek V4 Pro 0813"
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
  // Integrity-Bench default Table view runs low/default reasoning when models have split med/max arms
  if (/\b(low|default)\b/.test(qStr)) totalScore += 25;
  if (/\b(high|xhigh|max)\b/.test(qStr)) totalScore -= 15;
  if (/\bprev(iew)?\b/i.test(sheet.displayName) || /\bprev(iew)?\b/i.test(sheet.name)) {
    if (!/\bprev(iew)?\b/i.test(source.name)) totalScore -= 120;
  }

  // Strongly prefer rows that already have a Column AN value recorded
  if (sheet.colAN !== null) totalScore += 60;

  // Prefer newer release date as tiebreaker (e.g. DeepSeek V4 Pro 0813 over 0424)
  if (/^\d{4}-\d{2}-\d{2}$/.test(sheet.releaseDate || '')) {
    const ts = Date.parse(sheet.releaseDate);
    if (Number.isFinite(ts)) {
      totalScore += Math.max(0, Math.min(10, Math.floor((ts - Date.parse('2025-01-01')) / 31536000000)));
    }
  }

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
  const manualMappings = preferences?.manualMappings ?? {};
  const usedSheetRows = new Set<number>();
  const resolvedMatches = new Map<string, IntegritySheetModelSnapshot>();

  // Pass 1: Reserve explicit user manual mappings first (survives row inserts via matchedModelId)
  for (const src of sourceModels) {
    if (ignoredSet.has(src.id)) continue;
    const mapping = manualMappings[src.id];
    if (!mapping) continue;

    const found =
      (mapping.matchedModelId
        ? sheetModels.find((c) => c.id === mapping.matchedModelId)
        : undefined) ?? sheetModels.find((c) => c.sheetRowNumber === mapping.sheetRowNumber);

    if (found && !usedSheetRows.has(found.sheetRowNumber)) {
      usedSheetRows.add(found.sheetRowNumber);
      resolvedMatches.set(src.id, found);
    }
  }

  // Pass 2: Automatic name matching for remaining models
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

  const diffs: IntegrityDiffItem[] = [];

  for (const src of sourceModels) {
    if (ignoredSet.has(src.id)) {
      diffs.push({
        integrityId: src.id,
        integrityName: src.name,
        rank: src.rank,
        liveScore: src.score,
        scoreError: src.scoreError,
        accuracy: src.accuracy,
        isSiteNew: src.isSiteNew,
        isNewToSource: src.isNewToSource,
        status: 'ignored',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColAN: null,
        reason: 'Vom Benutzer ignoriert.',
      });
      continue;
    }

    const bestMatch = resolvedMatches.get(src.id) ?? null;

    if (!bestMatch) {
      diffs.push({
        integrityId: src.id,
        integrityName: src.name,
        rank: src.rank,
        liveScore: src.score,
        scoreError: src.scoreError,
        accuracy: src.accuracy,
        isSiteNew: src.isSiteNew,
        isNewToSource: src.isNewToSource,
        status: 'new_unmatched',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColAN: null,
        reason: 'Kein passendes Modell im Sheet gefunden — manuell zuordnen oder Zeile im Sheet anlegen.',
      });
      continue;
    }

    if (bestMatch.colAN === null) {
      diffs.push({
        integrityId: src.id,
        integrityName: src.name,
        rank: src.rank,
        liveScore: src.score,
        scoreError: src.scoreError,
        accuracy: src.accuracy,
        isSiteNew: src.isSiteNew,
        isNewToSource: src.isNewToSource,
        status: 'missing',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColAN: null,
        reason: 'Spalte AN ist in dieser Zeile noch leer.',
      });
      continue;
    }

    const delta = Math.abs(bestMatch.colAN - src.score);
    const isNewEntrantBeyondBaseline = !INITIAL_BASELINE_INTEGRITY_IDS.has(src.id);

    if (isNewEntrantBeyondBaseline && delta >= SCORE_DIFF_THRESHOLD) {
      diffs.push({
        integrityId: src.id,
        integrityName: src.name,
        rank: src.rank,
        liveScore: src.score,
        scoreError: src.scoreError,
        accuracy: src.accuracy,
        isSiteNew: src.isSiteNew,
        isNewToSource: src.isNewToSource,
        status: 'overwrite_estimate',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColAN: bestMatch.colAN,
        reason: `Neuzugang auf Integrity-Bench: Wert in Spalte AN (${bestMatch.colAN}) durch offiziellen Score (${src.score}) ersetzen.`,
      });
      continue;
    }

    if (delta >= SCORE_DIFF_THRESHOLD) {
      diffs.push({
        integrityId: src.id,
        integrityName: src.name,
        rank: src.rank,
        liveScore: src.score,
        scoreError: src.scoreError,
        accuracy: src.accuracy,
        isSiteNew: src.isSiteNew,
        isNewToSource: src.isNewToSource,
        status: 'changed',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColAN: bestMatch.colAN,
        reason: `Score weicht ab (${bestMatch.colAN} → ${src.score}).`,
      });
      continue;
    }

    diffs.push({
      integrityId: src.id,
      integrityName: src.name,
      rank: src.rank,
      liveScore: src.score,
      scoreError: src.scoreError,
      accuracy: src.accuracy,
      isSiteNew: src.isSiteNew,
      isNewToSource: src.isNewToSource,
      status: 'unchanged',
      matchedModelId: bestMatch.id,
      matchedDisplayName: bestMatch.displayName,
      sheetRowNumber: bestMatch.sheetRowNumber,
      currentColAN: bestMatch.colAN,
      reason: 'Synchron.',
    });
  }

  return diffs;
}

function summarizeIntegrityReportCounts(
  totalSourceModels: number,
  diffs: IntegrityDiffItem[],
  hasSheetModels: boolean
) {
  const unmatchedCount = diffs.filter((d) => d.status === 'new_unmatched').length;
  const missingCount = diffs.filter((d) => d.status === 'missing').length;
  const overwriteEstimateCount = diffs.filter((d) => d.status === 'overwrite_estimate').length;
  const changedCount = diffs.filter((d) => d.status === 'changed').length;
  const unchangedCount = diffs.filter((d) => d.status === 'unchanged').length;
  const ignoredCount = diffs.filter((d) => d.status === 'ignored').length;
  const actionableCount =
    unmatchedCount + missingCount + overwriteEstimateCount + changedCount;

  let summaryDe = '';
  let summaryEn = '';
  if (!hasSheetModels) {
    summaryDe = `${totalSourceModels} LLMs live auf Integrity-Bench geladen.`;
    summaryEn = `Loaded ${totalSourceModels} live LLMs from Integrity-Bench.`;
  } else if (actionableCount > 0) {
    const partsDe: string[] = [];
    const partsEn: string[] = [];
    if (unmatchedCount > 0) {
      partsDe.push(`${unmatchedCount} ohne Sheet-Zeile`);
      partsEn.push(`${unmatchedCount} without Sheet match`);
    }
    if (missingCount > 0) {
      partsDe.push(`${missingCount} fehlend in AN`);
      partsEn.push(`${missingCount} missing in AN`);
    }
    if (overwriteEstimateCount > 0) {
      partsDe.push(`${overwriteEstimateCount} Schätzwert(e) zu überschreiben`);
      partsEn.push(`${overwriteEstimateCount} estimate(s) to overwrite`);
    }
    if (changedCount > 0) {
      partsDe.push(`${changedCount} geänderte Score(s)`);
      partsEn.push(`${changedCount} changed score(s)`);
    }
    summaryDe = `${partsDe.join(', ')} (${totalSourceModels} LLMs auf Integrity-Bench).`;
    summaryEn = `${partsEn.join(', ')} (${totalSourceModels} LLMs on Integrity-Bench).`;
  } else {
    summaryDe = `Alle ${totalSourceModels} Integrity-Bench-LLMs sind in Spalte AN bereits aktuell.`;
    summaryEn = `All ${totalSourceModels} Integrity-Bench LLMs are up to date in Column AN.`;
  }

  return {
    unmatchedCount,
    missingCount,
    overwriteEstimateCount,
    changedCount,
    unchangedCount,
    ignoredCount,
    actionableCount,
    summaryDe,
    summaryEn,
  };
}

export async function runIntegrityCheck(options?: {
  models?: IntegritySheetModelSnapshot[];
  trigger?: 'manual' | 'daily_auto';
}): Promise<IntegrityCheckReport> {
  if (inFlightCheck) {
    return inFlightCheck;
  }

  const trigger = options?.trigger || 'manual';
  const sheetModels = Array.isArray(options?.models) ? options.models : [];

  const task = (async () => {
    const cache = await readCache();

    try {
      const effectivePreviousIds =
        cache.knownSourceIds.length > 0
          ? cache.knownSourceIds
          : Array.from(INITIAL_BASELINE_INTEGRITY_IDS);
      const live = await fetchLiveIntegrityLeaderboard(effectivePreviousIds);
      const diffs =
        sheetModels.length > 0
          ? buildIntegrityDiffs(live.models, sheetModels, {
              ignoredIds: cache.ignoredIds,
              manualMappings: cache.manualMappings,
            })
          : [];

      const counts = summarizeIntegrityReportCounts(
        live.models.length,
        diffs,
        sheetModels.length > 0
      );

      const now = new Date();
      const nextDue = new Date(now.getTime() + CHECK_INTERVAL_MS);

      const mergedKnownIds = Array.from(
        new Set([...effectivePreviousIds, ...live.models.map((m) => m.id)])
      );

      const report: IntegrityCheckReport = {
        checkedAt: now.toISOString(),
        nextCheckDueAt: nextDue.toISOString(),
        sourceUpdatedAt: live.updatedAt,
        sourceUrl: INTEGRITY_URL,
        totalSourceModels: live.models.length,
        baselineKnownCount: effectivePreviousIds.length,
        newlyDiscoveredSourceIds: live.newlyDiscoveredIds,
        trigger,
        models: live.models,
        diffs,
        ...counts,
      };

      await writeCache({
        report,
        knownSourceIds: mergedKnownIds,
        ignoredIds: cache.ignoredIds,
        manualMappings: cache.manualMappings,
        lastError: null,
      });

      return report;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Integrity-Bench check failed.';
      await writeCache({
        report: cache.report,
        knownSourceIds: cache.knownSourceIds,
        ignoredIds: cache.ignoredIds,
        manualMappings: cache.manualMappings,
        lastError: message,
      });
      throw err;
    }
  })();

  inFlightCheck = task;
  try {
    return await task;
  } finally {
    inFlightCheck = null;
  }
}

export async function updateIntegrityPreferences(options: {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  models?: IntegritySheetModelSnapshot[];
}): Promise<IntegrityCheckReport | null> {
  const cache = await readCache();
  const nextIgnored = new Set(cache.ignoredIds);
  const nextMappings: Record<string, ManualRowMapping> = { ...cache.manualMappings };

  if (Array.isArray(options.ignoreIds)) {
    for (const id of options.ignoreIds) {
      const clean = String(id || '').trim();
      if (clean) {
        nextIgnored.add(clean);
        delete nextMappings[clean];
      }
    }
  }

  if (Array.isArray(options.unignoreIds)) {
    for (const id of options.unignoreIds) {
      nextIgnored.delete(String(id || '').trim());
    }
  }

  if (options.manualMappings && typeof options.manualMappings === 'object') {
    const cleanNew = sanitizeManualMappings(options.manualMappings);
    for (const [id, mapping] of Object.entries(cleanNew)) {
      nextMappings[id] = mapping;
      nextIgnored.delete(id);
    }
  }

  const ignoredIds = Array.from(nextIgnored);
  const sheetModels = Array.isArray(options.models) ? options.models : [];

  let updatedReport = cache.report;
  if (updatedReport && updatedReport.models.length > 0) {
    const nextDiffs =
      sheetModels.length > 0
        ? buildIntegrityDiffs(updatedReport.models, sheetModels, {
            ignoredIds,
            manualMappings: nextMappings,
          })
        : updatedReport.diffs.map((d) =>
            nextIgnored.has(d.integrityId)
              ? {
                  ...d,
                  status: 'ignored' as const,
                  matchedModelId: null,
                  matchedDisplayName: null,
                  sheetRowNumber: null,
                  currentColAN: null,
                  reason: 'Vom Benutzer ignoriert.',
                }
              : d
          );

    const counts = summarizeIntegrityReportCounts(
      updatedReport.totalSourceModels,
      nextDiffs,
      sheetModels.length > 0 || updatedReport.diffs.length > 0
    );

    updatedReport = {
      ...updatedReport,
      diffs: nextDiffs,
      ...counts,
    };
  }

  await writeCache({
    report: updatedReport,
    knownSourceIds: cache.knownSourceIds,
    ignoredIds,
    manualMappings: nextMappings,
    lastError: cache.lastError,
  });

  return updatedReport;
}
