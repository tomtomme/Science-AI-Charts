import fs from 'node:fs/promises';
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

const SIMPLE_BENCH_URL = 'https://simple-bench.com/';
const FALLBACK_DATA_URL = 'https://simple-bench.com/static/js/leaderboard-data.js';
const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-simplebench-monitor-cache-v2.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SCORE_DIFF_THRESHOLD = 1e-4;

interface PersistedSimpleBenchCache {
  report: SimpleBenchCheckReport | null;
  knownSourceIds: string[];
  ignoredIds: string[];
  manualMappings: Record<string, ManualRowMapping>;
  lastError: string | null;
}

let inMemoryCache: PersistedSimpleBenchCache | null = null;
let inFlightCheck: Promise<SimpleBenchCheckReport> | null = null;

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

async function readCache(): Promise<PersistedSimpleBenchCache> {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  try {
    const raw = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedSimpleBenchCache>;
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

async function writeCache(cache: PersistedSimpleBenchCache): Promise<void> {
  inMemoryCache = cache;
  try {
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist SimpleBench monitor cache to temp dir:', err);
  }
}

export function isSimpleBenchReportDue(report: SimpleBenchCheckReport | null): boolean {
  if (!report?.checkedAt) return true;
  const checkedMs = new Date(report.checkedAt).getTime();
  if (!Number.isFinite(checkedMs)) return true;
  return Date.now() - checkedMs >= CHECK_INTERVAL_MS;
}

export async function getSimpleBenchMonitorStatus(): Promise<SimpleBenchMonitorStatusResponse> {
  const cache = await readCache();
  return {
    report: cache.report,
    isDue: isSimpleBenchReportDue(cache.report),
    isRunning: inFlightCheck !== null,
    checkIntervalHours: 24,
    lastError: cache.lastError,
  };
}

async function fetchTextWithTimeout(url: string, accept: string): Promise<string> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'simple-bench.com') {
    throw new Error(`Blocked unexpected URL host: ${parsed.hostname}`);
  }
  const res = await fetch(parsed.href, {
    headers: {
      'User-Agent': 'Science-AI-Charts-SimpleBenchMonitor/1.0 (+https://simple-bench.com/)',
      Accept: accept,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} while fetching ${parsed.href}`);
  }
  return res.text();
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

  // Convert JS literal tokens to strict JSON outside of quoted strings
  let jsonOut = '';
  inString = false;
  quoteChar = '';

  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];

    if (!inString) {
      // Skip JS comments outside strings
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

      // Quote unquoted object keys: identifier followed by ':'
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

      // Drop trailing commas before '}' or ']'
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
          // Escaped single quote doesn't need escaping in JSON double-quoted string
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
  const html = await fetchTextWithTimeout(SIMPLE_BENCH_URL, 'text/html,*/*');
  const scriptMatch = html.match(/<script[^>]*src=["']([^"']*leaderboard-data[^"']*)["']/i);
  const resolvedJsUrl = scriptMatch
    ? new URL(scriptMatch[1], SIMPLE_BENCH_URL).href
    : FALLBACK_DATA_URL;

  const js = await fetchTextWithTimeout(resolvedJsUrl, 'application/javascript,text/javascript,*/*');
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
    // Filter out Human baselines ("Highest Human Score*", "Human Baseline*")
    if (rankLabel === '-' || /\bhuman\b/i.test(name)) continue;

    const scoreNum = Number(scoreRaw);
    if (!Number.isFinite(scoreNum)) continue;
    const dotIdx = scoreRaw.indexOf('.');
    const scoreDecimals = dotIdx !== -1 ? scoreRaw.length - dotIdx - 1 : 0;
    const score = scoreNum;

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
  hasPreview: boolean;
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

  // Normalize vendor/version conventions
  s = s.replace(/\bchatgpt[-\s]*/g, 'gpt ');
  s = s.replace(/\bdeepseek\s+v(?=\d)/g, 'deepseek ');
  s = s.replace(/\bqwen(?=\d)/g, 'qwen ');
  s = s.replace(/\bminimax[-\s]*/g, 'minimax ');
  s = s.replace(/\bpreview\b/g, 'prev');
  s = s.replace(/\bv(?=\d+(?:\.\d+)?\b)/g, ''); // "Mistral Large v2" -> "Mistral Large 2"
  s = s.replace(/(\b\d+)\.0\b/g, '$1');

  // Historical SimpleBench/Sheet date/month equivalence (2024 models)
  s = s.replace(/\(oct\s*'?24\)/g, ' 10-22 ');
  s = s.replace(/\(june?\s*'?24\)/g, ' 06-20 ');
  s = s.replace(/\(aug\s*'?24\)/g, ' 08-06 ');
  s = s.replace(/\(sep\s*'?24\)/g, ' 09-24 ');

  // SimpleBench shortened lab-omitted names
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

  // Strip YYYY-MM-DD / MM-DD / 4-digit release suffixes & 002 suffixes for base alias matching
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
    hasPreview: variantTokens.has('prev'),
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

function companyMatches(sourceOrg: string, sheetCompany: string): boolean {
  const a = (sourceOrg || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = (sheetCompany || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  if ((a === 'zai' || a === 'zhipu') && (b === 'zai' || b === 'zai')) return true;
  if (a === 'xai' && (b.includes('xai') || b.includes('spacex'))) return true;
  if (a === 'moonshot' && b.includes('kimi')) return true;
  if (a === 'meta' && b.includes('llama')) return true;
  return false;
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
    } else if (
      c.compactNoDate === sNorm.compactNoDate &&
      c.compactNoDate.length >= 2
    ) {
      // Handles o1-2024-12-17 (high) <-> o1, Gemini 1.5 Pro 002 <-> Gemini 1.5 Pro, Gemini 2.5 Pro (06-05) <-> Gemini 2.5 Pro
      score = 850;
    } else if (sameTokenSet(sNorm.alnumTokens, c.alnumTokens)) {
      // Handles Llama 3.1 405b instruct <-> Llama 3.1 Instruct 405B
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
  if (companyMatches(src.organization, sheet.companyName)) totalScore += 20;

  if (/^\d{4}-\d{2}-\d{2}$/.test(sheet.releaseDate || '')) {
    const ts = Date.parse(sheet.releaseDate);
    if (Number.isFinite(ts)) {
      totalScore += Math.max(0, Math.min(10, Math.floor((ts - Date.parse('2024-01-01')) / 31536000000)));
    }
  }

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
  const manualMappings = preferences?.manualMappings ?? {};
  const usedSheetRows = new Set<number>();
  const resolvedMatches = new Map<string, SimpleBenchSheetModelSnapshot>();

  // Pass 1: Reserve explicit manual mappings
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

  const diffs: SimpleBenchDiffItem[] = [];

  const formatExact = (val: number, minDecimals?: number): string => {
    const str = String(val);
    if (typeof minDecimals === 'number' && minDecimals > 0) {
      const dot = str.indexOf('.');
      const curDec = dot !== -1 ? str.length - dot - 1 : 0;
      if (curDec < minDecimals) {
        return val.toFixed(minDecimals);
      }
    }
    return str;
  };

  for (const src of sourceModels) {
    if (ignoredSet.has(src.id)) {
      diffs.push({
        simpleBenchId: src.id,
        simpleBenchName: src.name,
        organization: src.organization,
        rank: src.rank,
        liveScore: src.score,
        scoreDecimals: src.scoreDecimals,
        dateAdded: src.dateAdded,
        status: 'ignored',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColY: null,
        currentColYIsBold: null,
        reason: 'Vom Benutzer ignoriert.',
      });
      continue;
    }

    const bestMatch = resolvedMatches.get(src.id) ?? null;

    if (!bestMatch) {
      diffs.push({
        simpleBenchId: src.id,
        simpleBenchName: src.name,
        organization: src.organization,
        rank: src.rank,
        liveScore: src.score,
        scoreDecimals: src.scoreDecimals,
        dateAdded: src.dateAdded,
        status: 'new_unmatched',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColY: null,
        currentColYIsBold: null,
        reason: 'Kein passendes Modell im Sheet gefunden — zuordnen oder als neue Zeile ergänzen.',
      });
      continue;
    }

    if (bestMatch.colY === null) {
      diffs.push({
        simpleBenchId: src.id,
        simpleBenchName: src.name,
        organization: src.organization,
        rank: src.rank,
        liveScore: src.score,
        scoreDecimals: src.scoreDecimals,
        dateAdded: src.dateAdded,
        status: 'missing',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColY: null,
        currentColYIsBold: bestMatch.colYIsBold,
        reason: 'Spalte Y ist in dieser Zeile noch leer (wird fett als offizieller Wert eingetragen).',
      });
      continue;
    }

    const isEstimateNonBold = bestMatch.colYIsBold === false;
    const delta = Math.abs(bestMatch.colY - src.score);
    const liveFormatted = formatExact(src.score, src.scoreDecimals);

    if (isEstimateNonBold) {
      diffs.push({
        simpleBenchId: src.id,
        simpleBenchName: src.name,
        organization: src.organization,
        rank: src.rank,
        liveScore: src.score,
        scoreDecimals: src.scoreDecimals,
        dateAdded: src.dateAdded,
        status: 'overwrite_estimate',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColY: bestMatch.colY,
        currentColYIsBold: false,
        reason: `Nicht-fetter Schätzwert (${bestMatch.colY}) → offiziellen SimpleBench-Score (${liveFormatted}, fett) übernehmen.`,
      });
      continue;
    }

    if (delta >= SCORE_DIFF_THRESHOLD) {
      diffs.push({
        simpleBenchId: src.id,
        simpleBenchName: src.name,
        organization: src.organization,
        rank: src.rank,
        liveScore: src.score,
        scoreDecimals: src.scoreDecimals,
        dateAdded: src.dateAdded,
        status: 'changed',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColY: bestMatch.colY,
        currentColYIsBold: bestMatch.colYIsBold,
        reason: `Offizieller Score weicht ab (${bestMatch.colY} → ${liveFormatted}).`,
      });
      continue;
    }

    diffs.push({
      simpleBenchId: src.id,
      simpleBenchName: src.name,
      organization: src.organization,
      rank: src.rank,
      liveScore: src.score,
      scoreDecimals: src.scoreDecimals,
      dateAdded: src.dateAdded,
      status: 'unchanged',
      matchedModelId: bestMatch.id,
      matchedDisplayName: bestMatch.displayName,
      sheetRowNumber: bestMatch.sheetRowNumber,
      currentColY: bestMatch.colY,
      currentColYIsBold: bestMatch.colYIsBold,
      reason: 'Synchron (fett/offiziell).',
    });
  }

  return diffs;
}

function summarizeSimpleBenchReportCounts(
  totalSourceModels: number,
  diffs: SimpleBenchDiffItem[],
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
    summaryDe = `${totalSourceModels} Modelle live auf SimpleBench geladen.`;
    summaryEn = `Loaded ${totalSourceModels} live models from SimpleBench.`;
  } else if (actionableCount > 0) {
    const partsDe: string[] = [];
    const partsEn: string[] = [];
    if (unmatchedCount > 0) {
      partsDe.push(`${unmatchedCount} neu ohne Zeile`);
      partsEn.push(`${unmatchedCount} new unmatched`);
    }
    if (missingCount > 0) {
      partsDe.push(`${missingCount} fehlend in Y`);
      partsEn.push(`${missingCount} missing in Y`);
    }
    if (overwriteEstimateCount > 0) {
      partsDe.push(`${overwriteEstimateCount} nicht-fette Schätzwerte`);
      partsEn.push(`${overwriteEstimateCount} non-bold estimate(s)`);
    }
    if (changedCount > 0) {
      partsDe.push(`${changedCount} geänderte Score(s)`);
      partsEn.push(`${changedCount} changed score(s)`);
    }
    summaryDe = `${partsDe.join(', ')} (${totalSourceModels} LLMs auf SimpleBench).`;
    summaryEn = `${partsEn.join(', ')} (${totalSourceModels} LLMs on SimpleBench).`;
  } else {
    summaryDe = `Alle ${totalSourceModels} SimpleBench-Einträge sind in Spalte Y aktuell (fett).`;
    summaryEn = `All ${totalSourceModels} SimpleBench entries are synced & bold in Column Y.`;
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

export async function runSimpleBenchCheck(options?: {
  models?: SimpleBenchSheetModelSnapshot[];
  trigger?: 'manual' | 'daily_auto';
}): Promise<SimpleBenchCheckReport> {
  if (inFlightCheck) {
    return inFlightCheck;
  }

  const trigger = options?.trigger || 'manual';
  const sheetModels = Array.isArray(options?.models) ? options.models : [];

  const task = (async () => {
    const cache = await readCache();

    try {
      const effectivePreviousIds = cache.knownSourceIds;
      const live = await fetchLiveSimpleBenchLeaderboard(effectivePreviousIds);
      const diffs =
        sheetModels.length > 0
          ? buildSimpleBenchDiffs(live.models, sheetModels, {
              ignoredIds: cache.ignoredIds,
              manualMappings: cache.manualMappings,
            })
          : [];

      const counts = summarizeSimpleBenchReportCounts(
        live.models.length,
        diffs,
        sheetModels.length > 0
      );

      const now = new Date();
      const nextDue = new Date(now.getTime() + CHECK_INTERVAL_MS);

      const mergedKnownIds = Array.from(
        new Set([...effectivePreviousIds, ...live.models.map((m) => m.id)])
      );

      const report: SimpleBenchCheckReport = {
        checkedAt: now.toISOString(),
        nextCheckDueAt: nextDue.toISOString(),
        sourceUpdatedAt: live.updatedAt,
        sourceUrl: SIMPLE_BENCH_URL,
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
      const message = err instanceof Error ? err.message : 'SimpleBench check failed.';
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

export async function updateSimpleBenchPreferences(options: {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  models?: SimpleBenchSheetModelSnapshot[];
}): Promise<SimpleBenchCheckReport | null> {
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
        ? buildSimpleBenchDiffs(updatedReport.models, sheetModels, {
            ignoredIds,
            manualMappings: nextMappings,
          })
        : updatedReport.diffs.map((d) =>
            nextIgnored.has(d.simpleBenchId)
              ? {
                  ...d,
                  status: 'ignored' as const,
                  matchedModelId: null,
                  matchedDisplayName: null,
                  sheetRowNumber: null,
                  currentColY: null,
                  currentColYIsBold: null,
                  reason: 'Vom Benutzer ignoriert.',
                }
              : d
          );

    const counts = summarizeSimpleBenchReportCounts(
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
