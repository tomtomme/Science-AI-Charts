import fs from 'node:fs/promises';
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

const VALS_INDEX_URL = 'https://www.vals.ai/benchmarks/vals_index';
const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-vals-monitor-cache-v2.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SCORE_DIFF_THRESHOLD = 1e-4;

interface PersistedValsCache {
  report: ValsCheckReport | null;
  knownSourceIds: string[];
  ignoredIds: string[];
  manualMappings: Record<string, ManualRowMapping>;
  lastError: string | null;
}

let inMemoryCache: PersistedValsCache | null = null;
let inFlightCheck: Promise<ValsCheckReport> | null = null;

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

async function readCache(): Promise<PersistedValsCache> {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  try {
    const raw = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedValsCache>;
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

async function writeCache(cache: PersistedValsCache): Promise<void> {
  inMemoryCache = cache;
  try {
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist Vals monitor cache to temp dir:', err);
  }
}

export function isValsReportDue(report: ValsCheckReport | null): boolean {
  if (!report?.checkedAt) return true;
  const checkedMs = new Date(report.checkedAt).getTime();
  if (!Number.isFinite(checkedMs)) return true;
  return Date.now() - checkedMs >= CHECK_INTERVAL_MS;
}

export async function getValsMonitorStatus(): Promise<ValsMonitorStatusResponse> {
  const cache = await readCache();
  return {
    report: cache.report,
    isDue: isValsReportDue(cache.report),
    isRunning: inFlightCheck !== null,
    checkIntervalHours: 24,
    lastError: cache.lastError,
  };
}

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

async function fetchValsHtml(): Promise<string> {
  const res = await fetch(VALS_INDEX_URL, {
    headers: {
      'User-Agent': 'Science-AI-Charts-ValsMonitor/1.0 (+https://www.vals.ai/benchmarks/vals_index)',
      Accept: 'text/html,*/*',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} while fetching ${VALS_INDEX_URL}`);
  }
  return res.text();
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
  const html = await fetchValsHtml();
  const islandMatches = Array.from(
    html.matchAll(/<astro-island\b([^>]*)>/gi)
  );

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
    const accNum = Number(accRaw);
    if (!Number.isFinite(accNum)) continue;

    const dotIdx = accRaw.indexOf('.');
    const scoreDecimals = dotIdx !== -1 ? accRaw.length - dotIdx - 1 : 0;
    const score = accNum;
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

  // Vals uses shortened lab-omitted names for certain models
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

  const compactFull = s.replace(/[^a-z0-9]/g, '');
  const compactBase = baseWithoutParens.replace(/[^a-z0-9]/g, '');
  const compactWithoutParams = withoutParams.replace(/[^a-z0-9]/g, '');

  return {
    compactFull,
    compactBase,
    compactWithoutParams,
    paramTokens,
    variantTokens,
    qualifiers,
  };
}

function companyMatches(sourceCompany: string, sheetCompany: string): boolean {
  const a = (sourceCompany || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = (sheetCompany || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  if ((a === 'zai' || a === 'zhipu') && (b === 'zai' || b === 'zai')) return true;
  if (a === 'xai' && (b.includes('xai') || b.includes('spacex'))) return true;
  if (a === 'moonshot' && b.includes('kimi')) return true;
  return false;
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

  // Prefer max/xhigh/high reasoning variants over med/low (e.g. Claude Sonnet 5.5 (max) vs (med))
  const qStr = matchedParsed.qualifiers.join(' ');
  if (/\b(max|xhigh|highest|high)\b/.test(qStr)) totalScore += 35;
  if (/\b(med|medium|low|fast|lite)\b/.test(qStr)) totalScore -= 90;

  if (sheet.colK !== null) totalScore += 40;
  if (sheet.colKIsBold === true) totalScore += 20;
  if (companyMatches(src.company, sheet.companyName)) totalScore += 25;

  if (/^\d{4}-\d{2}-\d{2}$/.test(sheet.releaseDate || '')) {
    const ts = Date.parse(sheet.releaseDate);
    if (Number.isFinite(ts)) {
      totalScore += Math.max(0, Math.min(10, Math.floor((ts - Date.parse('2025-01-01')) / 31536000000)));
    }
  }

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
  const manualMappings = preferences?.manualMappings ?? {};
  const usedSheetRows = new Set<number>();
  const resolvedMatches = new Map<string, ValsSheetModelSnapshot>();

  // Pass 1: Explicit user manual mappings
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

  // Pass 2: Automatic matching
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

  const diffs: ValsDiffItem[] = [];

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
        valsId: src.id,
        valsName: src.name,
        company: src.company,
        rank: src.rank,
        liveScore: src.score,
        scoreDecimals: src.scoreDecimals,
        writeScore: src.score,
        status: 'ignored',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColK: null,
        currentColKIsBold: null,
        reason: 'Vom Benutzer ignoriert.',
      });
      continue;
    }

    const bestMatch = resolvedMatches.get(src.id) ?? null;

    if (!bestMatch) {
      diffs.push({
        valsId: src.id,
        valsName: src.name,
        company: src.company,
        rank: src.rank,
        liveScore: src.score,
        scoreDecimals: src.scoreDecimals,
        writeScore: src.score,
        status: 'new_unmatched',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColK: null,
        currentColKIsBold: null,
        reason: 'Kein passendes Modell im Sheet gefunden — zuordnen oder als neue Zeile ergänzen.',
      });
      continue;
    }

    if (bestMatch.colK === null) {
      diffs.push({
        valsId: src.id,
        valsName: src.name,
        company: src.company,
        rank: src.rank,
        liveScore: src.score,
        scoreDecimals: src.scoreDecimals,
        writeScore: src.score,
        status: 'missing',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColK: null,
        currentColKIsBold: bestMatch.colKIsBold,
        reason: 'Spalte K ist in dieser Zeile noch leer (wird fett als offizieller Wert eingetragen).',
      });
      continue;
    }

    const isEstimateNonBold = bestMatch.colKIsBold === false;
    const delta = Math.abs(bestMatch.colK - src.score);
    const liveFormatted = formatExact(src.score, src.scoreDecimals);

    if (isEstimateNonBold) {
      diffs.push({
        valsId: src.id,
        valsName: src.name,
        company: src.company,
        rank: src.rank,
        liveScore: src.score,
        scoreDecimals: src.scoreDecimals,
        writeScore: src.score,
        status: 'overwrite_estimate',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColK: bestMatch.colK,
        currentColKIsBold: false,
        reason: `Nicht-fetter Schätzwert (${bestMatch.colK}) → offiziellen Vals-Score (${liveFormatted}, fett) übernehmen.`,
      });
      continue;
    }

    if (delta >= SCORE_DIFF_THRESHOLD) {
      diffs.push({
        valsId: src.id,
        valsName: src.name,
        company: src.company,
        rank: src.rank,
        liveScore: src.score,
        scoreDecimals: src.scoreDecimals,
        writeScore: src.score,
        status: 'changed',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColK: bestMatch.colK,
        currentColKIsBold: bestMatch.colKIsBold,
        reason: `Offizieller Score weicht ab (${bestMatch.colK} → ${liveFormatted}).`,
      });
      continue;
    }

    diffs.push({
      valsId: src.id,
      valsName: src.name,
      company: src.company,
      rank: src.rank,
      liveScore: src.score,
      scoreDecimals: src.scoreDecimals,
      writeScore: src.score,
      status: 'unchanged',
      matchedModelId: bestMatch.id,
      matchedDisplayName: bestMatch.displayName,
      sheetRowNumber: bestMatch.sheetRowNumber,
      currentColK: bestMatch.colK,
      currentColKIsBold: bestMatch.colKIsBold,
      reason: 'Synchron (fett/offiziell).',
    });
  }

  return diffs;
}

function summarizeValsReportCounts(
  totalSourceModels: number,
  versionLabel: string,
  diffs: ValsDiffItem[],
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
    summaryDe = `${totalSourceModels} Modelle live auf Vals Index ${versionLabel} geladen.`;
    summaryEn = `Loaded ${totalSourceModels} live models from Vals Index ${versionLabel}.`;
  } else if (actionableCount > 0) {
    const partsDe: string[] = [];
    const partsEn: string[] = [];
    if (unmatchedCount > 0) {
      partsDe.push(`${unmatchedCount} neu ohne Zeile`);
      partsEn.push(`${unmatchedCount} new unmatched`);
    }
    if (missingCount > 0) {
      partsDe.push(`${missingCount} fehlend in K`);
      partsEn.push(`${missingCount} missing in K`);
    }
    if (overwriteEstimateCount > 0) {
      partsDe.push(`${overwriteEstimateCount} nicht-fette Schätzwerte`);
      partsEn.push(`${overwriteEstimateCount} non-bold estimate(s)`);
    }
    if (changedCount > 0) {
      partsDe.push(`${changedCount} geänderte Score(s)`);
      partsEn.push(`${changedCount} changed score(s)`);
    }
    summaryDe = `${partsDe.join(', ')} (${totalSourceModels} Einträge auf Vals ${versionLabel}).`;
    summaryEn = `${partsEn.join(', ')} (${totalSourceModels} entries on Vals ${versionLabel}).`;
  } else {
    summaryDe = `Alle ${totalSourceModels} Vals ${versionLabel}-Einträge sind in Spalte K aktuell (fett).`;
    summaryEn = `All ${totalSourceModels} Vals ${versionLabel} entries are synced & bold in Column K.`;
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

export async function runValsCheck(options?: {
  models?: ValsSheetModelSnapshot[];
  trigger?: 'manual' | 'daily_auto';
}): Promise<ValsCheckReport> {
  if (inFlightCheck) {
    return inFlightCheck;
  }

  const trigger = options?.trigger || 'manual';
  const sheetModels = Array.isArray(options?.models) ? options.models : [];

  const task = (async () => {
    const cache = await readCache();

    try {
      const effectivePreviousIds = cache.knownSourceIds;
      const live = await fetchLiveValsLeaderboard(effectivePreviousIds);
      const diffs =
        sheetModels.length > 0
          ? buildValsDiffs(live.models, sheetModels, {
              ignoredIds: cache.ignoredIds,
              manualMappings: cache.manualMappings,
            })
          : [];

      const counts = summarizeValsReportCounts(
        live.models.length,
        live.versionLabel,
        diffs,
        sheetModels.length > 0
      );

      const now = new Date();
      const nextDue = new Date(now.getTime() + CHECK_INTERVAL_MS);

      const mergedKnownIds = Array.from(
        new Set([...effectivePreviousIds, ...live.models.map((m) => m.id)])
      );

      const report: ValsCheckReport = {
        checkedAt: now.toISOString(),
        nextCheckDueAt: nextDue.toISOString(),
        sourceUpdatedAt: live.updatedAt,
        versionLabel: live.versionLabel,
        sourceUrl: VALS_INDEX_URL,
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
      const message = err instanceof Error ? err.message : 'Vals Index v2.2 check failed.';
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

export async function updateValsPreferences(options: {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  models?: ValsSheetModelSnapshot[];
}): Promise<ValsCheckReport | null> {
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
        ? buildValsDiffs(updatedReport.models, sheetModels, {
            ignoredIds,
            manualMappings: nextMappings,
          })
        : updatedReport.diffs.map((d) =>
            nextIgnored.has(d.valsId)
              ? {
                  ...d,
                  status: 'ignored' as const,
                  matchedModelId: null,
                  matchedDisplayName: null,
                  sheetRowNumber: null,
                  currentColK: null,
                  currentColKIsBold: null,
                  reason: 'Vom Benutzer ignoriert.',
                }
              : d
          );

    const counts = summarizeValsReportCounts(
      updatedReport.totalSourceModels,
      updatedReport.versionLabel,
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
