import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {
  GdpxCheckReport,
  GdpxDiffItem,
  GdpxLeaderboardModel,
  GdpxMonitorStatusResponse,
  GdpxSheetModelSnapshot,
} from '../src/types/gdpxMonitor.ts';
import type { ManualRowMapping } from '../src/types/integrityMonitor.ts';

const GDPX_URL = 'https://gdpx.semianalysis.com/';
const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-gdpx-monitor-cache-v2.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SCORE_DIFF_THRESHOLD = 0.5;
const ESTIMATE_EXACT_TOLERANCE = 0.05;

// The 21 baseline models already present on gdpx.semianalysis.com;
// any model outside this set is a new leaderboard entry whose existing Column J value is treated as an estimate to overwrite.
const INITIAL_BASELINE_GDPX_IDS = new Set<string>([
  'claude-fable-5-2',
  'muse-wonder-full',
  'claude-opus-5-5',
  'gpt-6-luna',
  'gpt-6-astra',
  'gemini-4-argon',
  'gpt-6-1-sol',
  'claude-sonnet-5-5',
  'inkling',
  'gemini-4-carbon',
  'claude-haiku-5-5',
  'muse-wonder',
  'claude-fable-5-1',
  'gpt-6-1-terra',
  'grok-4-7',
  'muse-spark-open',
  'deepseek-4-1-flash',
  'kimi-k3',
  'minimax-m3-1-flash',
  'qwen-3-8-max',
  'glm-5-3',
]);

interface PartnerDef {
  id: string;
  domain: string;
}

const FALLBACK_PARTNERS: PartnerDef[] = [
  { id: 'aria', domain: 'chip-design' },
  { id: 'arcverex', domain: 'chip-design' },
  { id: 'ergodex', domain: 'chip-design' },
  { id: 'arithmetic', domain: 'cybersecurity' },
  { id: 'latchbio', domain: 'biology' },
  { id: 'living-context', domain: 'finance' },
  { id: 'chakra', domain: 'legal' },
  { id: 'third-moment', domain: 'quant-trading' },
  { id: 'extrapolate', domain: 'rsi' },
  { id: 'beautiful-machines', domain: 'hardware-design' },
  { id: 'valenceforge', domain: 'materials-science' },
  { id: 'emulated', domain: 'materials-science' },
  { id: 'fleet', domain: 'alignment' },
  { id: 'datacurve', domain: 'software-engineering' },
];

interface RawGdpxModel {
  id: string;
  name: string;
  lab: string;
  openWeights?: boolean;
  harness?: string;
  reasoning?: string;
}

interface RawGdpxResult {
  modelId: string;
  partnerId: string;
  tasks: number;
  tasksScored: number;
  score: number;
  costPerTask?: number | null;
  tasksWithCost?: number;
  tokensPerTask?: number | null;
  tasksWithTokens?: number;
}

interface RawGdpxPayload {
  updatedAt?: string;
  models: RawGdpxModel[];
  overall?: Record<string, { costPerTask?: number | null; tokensPerTask?: number | null }>;
  results: RawGdpxResult[];
}

interface PersistedGdpxCache {
  report: GdpxCheckReport | null;
  knownSourceIds: string[];
  ignoredIds: string[];
  manualMappings: Record<string, ManualRowMapping>;
  lastError: string | null;
}

let inMemoryCache: PersistedGdpxCache | null = null;
let inFlightCheck: Promise<GdpxCheckReport> | null = null;

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

async function readCache(): Promise<PersistedGdpxCache> {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  try {
    const raw = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedGdpxCache>;
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

async function writeCache(cache: PersistedGdpxCache): Promise<void> {
  inMemoryCache = cache;
  try {
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist GDPx monitor cache to temp dir:', err);
  }
}

export function isGdpxReportDue(report: GdpxCheckReport | null): boolean {
  if (!report?.checkedAt) return true;
  const checkedMs = new Date(report.checkedAt).getTime();
  if (!Number.isFinite(checkedMs)) return true;
  return Date.now() - checkedMs >= CHECK_INTERVAL_MS;
}

export async function getGdpxMonitorStatus(): Promise<GdpxMonitorStatusResponse> {
  const cache = await readCache();
  return {
    report: cache.report,
    isDue: isGdpxReportDue(cache.report),
    isRunning: inFlightCheck !== null,
    checkIntervalHours: 24,
    lastError: cache.lastError,
  };
}

/**
 * Unescapes a JS single- or double-quoted string literal without eval.
 */
function unescapeJsStringLiteral(inner: string): string {
  let out = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = inner[++i];
    if (next === undefined) break;
    switch (next) {
      case '\\':
        out += '\\';
        break;
      case "'":
        out += "'";
        break;
      case '"':
        out += '"';
        break;
      case 'n':
        out += '\n';
        break;
      case 'r':
        out += '\r';
        break;
      case 't':
        out += '\t';
        break;
      case 'b':
        out += '\b';
        break;
      case 'f':
        out += '\f';
        break;
      case 'v':
        out += '\v';
        break;
      case '0':
        out += '\0';
        break;
      case 'x': {
        const hex = inner.slice(i + 1, i + 3);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16));
          i += 2;
        } else {
          out += 'x';
        }
        break;
      }
      case 'u': {
        if (inner[i + 1] === '{') {
          const closeIdx = inner.indexOf('}', i + 2);
          if (closeIdx !== -1) {
            const hex = inner.slice(i + 2, closeIdx);
            if (/^[0-9a-fA-F]+$/.test(hex)) {
              out += String.fromCodePoint(parseInt(hex, 16));
              i = closeIdx;
              break;
            }
          }
        }
        const hex4 = inner.slice(i + 1, i + 5);
        if (/^[0-9a-fA-F]{4}$/.test(hex4)) {
          out += String.fromCharCode(parseInt(hex4, 16));
          i += 4;
        } else {
          out += 'u';
        }
        break;
      }
      default:
        out += next;
        break;
    }
  }
  return out;
}

function extractBalancedJsonParse(js: string, markerIndex: number): RawGdpxPayload | null {
  const quoteIdx = markerIndex + 'JSON.parse('.length;
  const quote = js[quoteIdx];
  if (quote !== "'" && quote !== '"') {
    return null;
  }

  let endIdx = -1;
  for (let i = quoteIdx + 1; i < js.length; i++) {
    const c = js[i];
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === quote) {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return null;

  const literalBody = js.slice(quoteIdx + 1, endIdx);
  const jsonText = unescapeJsStringLiteral(literalBody);
  const parsed = JSON.parse(jsonText) as RawGdpxPayload;
  if (!parsed || !Array.isArray(parsed.models) || !Array.isArray(parsed.results)) {
    return null;
  }
  return parsed;
}

function extractPartnersFromChunk(js: string): PartnerDef[] {
  const partners: PartnerDef[] = [];
  const seen = new Set<string>();
  const regex = /\ba\("([a-z0-9-]+)","[^"]+","([a-z0-9-]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(js)) !== null) {
    const id = match[1];
    const domain = match[2];
    if (!seen.has(id)) {
      seen.add(id);
      partners.push({ id, domain });
    }
  }
  return partners.length >= 10 ? partners : FALLBACK_PARTNERS;
}

function mean(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

function weightedMean(
  rows: RawGdpxResult[],
  getValue: (r: RawGdpxResult) => number | null | undefined,
  getWeight: (r: RawGdpxResult) => number | null | undefined
): number | null {
  let num = 0;
  let den = 0;
  for (const r of rows) {
    const v = getValue(r);
    const w = getWeight(r);
    if (typeof v === 'number' && Number.isFinite(v) && typeof w === 'number' && w > 0) {
      num += v * w;
      den += w;
    }
  }
  return den > 0 ? num / den : null;
}

async function fetchTextWithTimeout(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Science-AI-Charts-GDPxMonitor/1.0 (+https://gdpx.semianalysis.com/)',
      Accept: 'text/html,application/javascript,*/*',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} while fetching ${url}`);
  }
  return res.text();
}

export async function fetchLiveGdpxLeaderboard(
  previousKnownIds: string[] = []
): Promise<{
  updatedAt: string | null;
  models: GdpxLeaderboardModel[];
  newlyDiscoveredIds: string[];
}> {
  const html = await fetchTextWithTimeout(GDPX_URL);
  const scriptPaths = Array.from(
    new Set(
      Array.from(html.matchAll(/<script[^>]*src="([^"]+)"/g))
        .map((m) => m[1])
        .filter((src) => src.includes('/_next/static/'))
    )
  );

  if (scriptPaths.length === 0) {
    throw new Error('Could not find Next.js static chunks on gdpx.semianalysis.com.');
  }

  let payload: RawGdpxPayload | null = null;
  let partners: PartnerDef[] = FALLBACK_PARTNERS;

  for (const src of scriptPaths) {
    const chunkUrl = src.startsWith('http')
      ? src
      : `https://gdpx.semianalysis.com${src.startsWith('/') ? '' : '/'}${src}`;
    const js = await fetchTextWithTimeout(chunkUrl);
    const modelsIdx = js.indexOf('"models":[');
    if (modelsIdx === -1) continue;

    const jsonParseIdx = js.lastIndexOf('JSON.parse(', modelsIdx);
    if (jsonParseIdx === -1) continue;

    const extracted = extractBalancedJsonParse(js, jsonParseIdx);
    if (extracted && extracted.models.length > 0) {
      payload = extracted;
      partners = extractPartnersFromChunk(js);
      break;
    }
  }

  if (!payload) {
    throw new Error(
      'Could not extract structured leaderboard dataset from gdpx.semianalysis.com chunks.'
    );
  }

  const domains = Array.from(new Set(partners.map((p) => p.domain)));
  const resultMap = new Map<string, RawGdpxResult>();
  for (const row of payload.results) {
    resultMap.set(`${row.modelId}/${row.partnerId}`, row);
  }

  const prevSet = new Set(previousKnownIds);
  const hasBaseline = prevSet.size > 0;

  const computed = payload.models.map((model) => {
    const domainScores = domains.map((domain) => {
      const domainPartners = partners.filter((p) => p.domain === domain);
      const partnerScores = domainPartners.map((p) => {
        const res = resultMap.get(`${model.id}/${p.id}`);
        return res && res.tasksScored > 0 ? res.score : null;
      });
      return mean(partnerScores);
    });

    const compositeRaw = mean(domainScores) ?? 0;
    const score = Math.round(compositeRaw * 10) / 10;

    const overallCost = payload.overall?.[model.id]?.costPerTask ?? null;
    const overallTokens = payload.overall?.[model.id]?.tokensPerTask ?? null;
    const modelRows = payload.results.filter((r) => r.modelId === model.id);

    const costPerTask =
      overallCost !== undefined
        ? overallCost
        : weightedMean(modelRows, (r) => r.costPerTask, (r) => r.tasksWithCost);
    const tokensPerTask =
      overallTokens !== undefined
        ? overallTokens
        : weightedMean(modelRows, (r) => r.tokensPerTask, (r) => r.tasksWithTokens);

    return {
      id: model.id,
      name: model.name,
      lab: model.lab,
      openWeights: Boolean(model.openWeights),
      harness: model.harness || '',
      reasoning: model.reasoning || '',
      rawScore: compositeRaw,
      score,
      costPerTask: typeof costPerTask === 'number' ? Math.round(costPerTask * 100) / 100 : null,
      tokensPerTask: typeof tokensPerTask === 'number' ? Math.round(tokensPerTask) : null,
      isNewToSource: hasBaseline && !prevSet.has(model.id),
    };
  });

  computed.sort((a, b) => b.rawScore - a.rawScore);

  const models: GdpxLeaderboardModel[] = computed.map((item, idx) => ({
    id: item.id,
    name: item.name,
    lab: item.lab,
    openWeights: item.openWeights,
    harness: item.harness,
    reasoning: item.reasoning,
    score: item.score,
    costPerTask: item.costPerTask,
    tokensPerTask: item.tokensPerTask,
    rank: idx + 1,
    isNewToSource: item.isNewToSource,
  }));

  const newlyDiscoveredIds = models.filter((m) => m.isNewToSource).map((m) => m.id);

  return {
    updatedAt: payload.updatedAt || null,
    models,
    newlyDiscoveredIds,
  };
}

function normalizeModelBaseAndQualifiers(raw: string): {
  compactFull: string;
  compactBase: string;
  qualifiers: string[];
  hasDateSuffix: boolean;
} {
  let s = (raw || '').toLowerCase().trim();
  // Remove leading flags / badges / symbols
  s = s.replace(/[^\p{L}\p{N}\s()._-]/gu, ' ');
  // Normalize OpenAI naming: ChatGPT-6 -> GPT 6
  s = s.replace(/\bchatgpt[-\s]*/g, 'gpt ');
  // Normalize DeepSeek V4.1 -> DeepSeek 4.1
  s = s.replace(/\bdeepseek\s+v(?=\d)/g, 'deepseek ');
  // Normalize Qwen3.8 -> Qwen 3.8
  s = s.replace(/\bqwen(?=\d)/g, 'qwen ');
  // Normalize MiniMax-M3.1 -> MiniMax M3.1
  s = s.replace(/\bminimax[-\s]*/g, 'minimax ');

  const qualifiers: string[] = [];
  let hasDateSuffix = false;
  const baseWithoutParens = s.replace(/\(([^)]+)\)/g, (_m, inner: string) => {
    const cleanQ = inner.trim().toLowerCase();
    qualifiers.push(cleanQ);
    if (/^\d{4}$/.test(cleanQ)) {
      hasDateSuffix = true;
    }
    return ' ';
  });

  // Check trailing 4-digit release tag like "1017" in "DeepSeek 4.1 Flash 1017"
  if (/\b\d{4}\b/.test(baseWithoutParens)) {
    hasDateSuffix = true;
  }

  const compactFull = s.replace(/[^a-z0-9]/g, '');
  const compactBase = baseWithoutParens.replace(/[^a-z0-9]/g, '');

  return { compactFull, compactBase, qualifiers, hasDateSuffix };
}

function companyMatches(lab: string, companyName: string): boolean {
  const a = (lab || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = (companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  if (a === 'zai' && b === 'zai') return true;
  if (a === 'xai' && (b.includes('xai') || b.includes('spacex'))) return true;
  if (a === 'moonshotai' && b.includes('kimi')) return true;
  return false;
}

function scoreSheetCandidate(
  gdpx: GdpxLeaderboardModel,
  sheet: GdpxSheetModelSnapshot
): number {
  const gNorm = normalizeModelBaseAndQualifiers(gdpx.name);
  const candidates = [
    normalizeModelBaseAndQualifiers(sheet.displayName),
    normalizeModelBaseAndQualifiers(sheet.name),
  ];

  let bestNameScore = 0;
  let matchedParsed = candidates[0];

  for (const c of candidates) {
    let score = 0;
    if (c.compactFull === gNorm.compactFull) {
      score = 910;
    } else if (c.compactBase === gNorm.compactBase && c.compactBase.length >= 4) {
      score = 880;
    } else if (
      c.compactBase.length >= 6 &&
      gNorm.compactBase.length >= 6 &&
      c.compactBase.startsWith(gNorm.compactBase) &&
      /^\d{4}$/.test(c.compactBase.slice(gNorm.compactBase.length))
    ) {
      score = 720;
    }

    if (score > bestNameScore) {
      bestNameScore = score;
      matchedParsed = c;
    }
  }

  if (bestNameScore === 0) return 0;

  let totalScore = bestNameScore;

  // Prefer matching reasoning level (GDPx runs Max/Highest/xHigh reasoning)
  const qStr = matchedParsed.qualifiers.join(' ');
  if (/\b(max|xhigh|highest|high)\b/.test(qStr)) totalScore += 35;
  if (/\b(med|medium|low|fast|lite)\b/.test(qStr)) totalScore -= 90;
  if (/\bprev(iew)?\b/i.test(sheet.displayName) || /\bprev(iew)?\b/i.test(sheet.name)) {
    if (!/\bprev(iew)?\b/i.test(gdpx.name)) totalScore -= 120;
  }

  // Strongly prefer rows that already have a Col J score (e.g., Qwen3.8 Max (0902) vs older Qwen3.8 Max)
  if (sheet.colJ !== null) totalScore += 60;

  // Company sanity bonus
  if (companyMatches(gdpx.lab, sheet.companyName)) totalScore += 15;

  // Newer release date tiebreaker (e.g. 2026-09-02 > 2026-08-03)
  if (/^\d{4}-\d{2}-\d{2}$/.test(sheet.releaseDate || '')) {
    const ts = Date.parse(sheet.releaseDate);
    if (Number.isFinite(ts)) {
      totalScore += Math.max(0, Math.min(10, Math.floor((ts - Date.parse('2025-01-01')) / 31536000000)));
    }
  }

  return totalScore;
}

export interface GdpxPreferencesInput {
  ignoredIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
}

export function buildGdpxDiffs(
  gdpxModels: GdpxLeaderboardModel[],
  sheetModels: GdpxSheetModelSnapshot[],
  preferences?: GdpxPreferencesInput
): GdpxDiffItem[] {
  const ignoredSet = new Set(preferences?.ignoredIds ?? []);
  const manualMappings = preferences?.manualMappings ?? {};
  const usedSheetRows = new Set<number>();
  const resolvedMatches = new Map<string, GdpxSheetModelSnapshot>();

  // Pass 1: Reserve explicit user manual mappings first
  for (const gdpx of gdpxModels) {
    if (ignoredSet.has(gdpx.id)) continue;
    const mapping = manualMappings[gdpx.id];
    if (!mapping) continue;

    const found =
      (mapping.matchedModelId
        ? sheetModels.find((c) => c.id === mapping.matchedModelId)
        : undefined) ?? sheetModels.find((c) => c.sheetRowNumber === mapping.sheetRowNumber);

    if (found && !usedSheetRows.has(found.sheetRowNumber)) {
      usedSheetRows.add(found.sheetRowNumber);
      resolvedMatches.set(gdpx.id, found);
    }
  }

  // Pass 2: Automatic matching for remaining models
  for (const gdpx of gdpxModels) {
    if (ignoredSet.has(gdpx.id) || resolvedMatches.has(gdpx.id)) continue;

    let bestMatch: GdpxSheetModelSnapshot | null = null;
    let bestScore = 0;

    for (const candidate of sheetModels) {
      if (usedSheetRows.has(candidate.sheetRowNumber)) continue;
      const score = scoreSheetCandidate(gdpx, candidate);
      if (score >= 700 && score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestMatch) {
      usedSheetRows.add(bestMatch.sheetRowNumber);
      resolvedMatches.set(gdpx.id, bestMatch);
    }
  }

  const diffs: GdpxDiffItem[] = [];

  for (const gdpx of gdpxModels) {
    if (ignoredSet.has(gdpx.id)) {
      diffs.push({
        gdpxId: gdpx.id,
        gdpxName: gdpx.name,
        lab: gdpx.lab,
        harness: gdpx.harness,
        reasoning: gdpx.reasoning,
        openWeights: gdpx.openWeights,
        rank: gdpx.rank,
        liveScore: gdpx.score,
        costPerTask: gdpx.costPerTask,
        status: 'ignored',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColJ: null,
        reason: 'Vom Benutzer ignoriert.',
      });
      continue;
    }

    const bestMatch = resolvedMatches.get(gdpx.id) ?? null;

    if (!bestMatch) {
      diffs.push({
        gdpxId: gdpx.id,
        gdpxName: gdpx.name,
        lab: gdpx.lab,
        harness: gdpx.harness,
        reasoning: gdpx.reasoning,
        openWeights: gdpx.openWeights,
        rank: gdpx.rank,
        liveScore: gdpx.score,
        costPerTask: gdpx.costPerTask,
        status: 'new_unmatched',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColJ: null,
        reason: 'Kein passendes Modell im Sheet gefunden — manuell zuordnen oder Zeile im Sheet anlegen.',
      });
      continue;
    }

    if (bestMatch.colJ === null) {
      diffs.push({
        gdpxId: gdpx.id,
        gdpxName: gdpx.name,
        lab: gdpx.lab,
        harness: gdpx.harness,
        reasoning: gdpx.reasoning,
        openWeights: gdpx.openWeights,
        rank: gdpx.rank,
        liveScore: gdpx.score,
        costPerTask: gdpx.costPerTask,
        status: 'missing',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColJ: null,
        reason: 'Spalte J ist in dieser Zeile noch leer.',
      });
      continue;
    }

    const delta = Math.abs(bestMatch.colJ - gdpx.score);
    const isNewEntrantBeyondBaseline = !INITIAL_BASELINE_GDPX_IDS.has(gdpx.id);

    if (isNewEntrantBeyondBaseline && delta >= ESTIMATE_EXACT_TOLERANCE) {
      diffs.push({
        gdpxId: gdpx.id,
        gdpxName: gdpx.name,
        lab: gdpx.lab,
        harness: gdpx.harness,
        reasoning: gdpx.reasoning,
        openWeights: gdpx.openWeights,
        rank: gdpx.rank,
        liveScore: gdpx.score,
        costPerTask: gdpx.costPerTask,
        status: 'overwrite_estimate',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColJ: bestMatch.colJ,
        reason: `Neuzugang auf GDPx: Schätzwert in Spalte J (${bestMatch.colJ}) durch offiziellen Score (${gdpx.score}%) ersetzen.`,
      });
      continue;
    }

    if (delta >= SCORE_DIFF_THRESHOLD) {
      diffs.push({
        gdpxId: gdpx.id,
        gdpxName: gdpx.name,
        lab: gdpx.lab,
        harness: gdpx.harness,
        reasoning: gdpx.reasoning,
        openWeights: gdpx.openWeights,
        rank: gdpx.rank,
        liveScore: gdpx.score,
        costPerTask: gdpx.costPerTask,
        status: 'changed',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColJ: bestMatch.colJ,
        reason: `Score weicht ab (${bestMatch.colJ} → ${gdpx.score}%).`,
      });
      continue;
    }

    diffs.push({
      gdpxId: gdpx.id,
      gdpxName: gdpx.name,
      lab: gdpx.lab,
      harness: gdpx.harness,
      reasoning: gdpx.reasoning,
      openWeights: gdpx.openWeights,
      rank: gdpx.rank,
      liveScore: gdpx.score,
      costPerTask: gdpx.costPerTask,
      status: 'unchanged',
      matchedModelId: bestMatch.id,
      matchedDisplayName: bestMatch.displayName,
      sheetRowNumber: bestMatch.sheetRowNumber,
      currentColJ: bestMatch.colJ,
      reason: delta > 0 ? `Synchron (Rundungsdifferenz ${bestMatch.colJ} vs. ${gdpx.score}%).` : 'Synchron.',
    });
  }

  return diffs;
}

function summarizeGdpxReportCounts(
  totalSourceModels: number,
  sourceUpdatedAt: string | null,
  diffs: GdpxDiffItem[],
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
    summaryDe = `${totalSourceModels} LLMs live auf GDPx geladen (Stand ${sourceUpdatedAt || 'aktuell'}).`;
    summaryEn = `Loaded ${totalSourceModels} live LLMs from GDPx (updated ${sourceUpdatedAt || 'latest'}).`;
  } else if (actionableCount > 0) {
    const partsDe: string[] = [];
    const partsEn: string[] = [];
    if (unmatchedCount > 0) {
      partsDe.push(`${unmatchedCount} neues LLM ohne Sheet-Zeile`);
      partsEn.push(`${unmatchedCount} new LLM(s) without Sheet match`);
    }
    if (missingCount > 0) {
      partsDe.push(`${missingCount} fehlende Spalte-J-Score(s)`);
      partsEn.push(`${missingCount} missing Col-J score(s)`);
    }
    if (overwriteEstimateCount > 0) {
      partsDe.push(`${overwriteEstimateCount} Schätzwert(e) zu überschreiben`);
      partsEn.push(`${overwriteEstimateCount} estimate(s) to overwrite`);
    }
    if (changedCount > 0) {
      partsDe.push(`${changedCount} geänderte Score(s)`);
      partsEn.push(`${changedCount} changed score(s)`);
    }
    summaryDe = `${partsDe.join(', ')} (${totalSourceModels} LLMs auf GDPx).`;
    summaryEn = `${partsEn.join(', ')} (${totalSourceModels} LLMs on GDPx).`;
  } else {
    summaryDe = `Alle ${totalSourceModels} GDPx-LLMs sind in Spalte J bereits erfasst.`;
    summaryEn = `All ${totalSourceModels} GDPx LLMs are already recorded in Column J.`;
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

export async function runGdpxCheck(options?: {
  models?: GdpxSheetModelSnapshot[];
  trigger?: 'manual' | 'daily_auto';
}): Promise<GdpxCheckReport> {
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
          : Array.from(INITIAL_BASELINE_GDPX_IDS);
      const live = await fetchLiveGdpxLeaderboard(effectivePreviousIds);
      const diffs =
        sheetModels.length > 0
          ? buildGdpxDiffs(live.models, sheetModels, {
              ignoredIds: cache.ignoredIds,
              manualMappings: cache.manualMappings,
            })
          : [];

      const counts = summarizeGdpxReportCounts(
        live.models.length,
        live.updatedAt,
        diffs,
        sheetModels.length > 0
      );

      const now = new Date();
      const nextDue = new Date(now.getTime() + CHECK_INTERVAL_MS);

      const mergedKnownIds = Array.from(
        new Set([...effectivePreviousIds, ...live.models.map((m) => m.id)])
      );

      const report: GdpxCheckReport = {
        checkedAt: now.toISOString(),
        nextCheckDueAt: nextDue.toISOString(),
        sourceUpdatedAt: live.updatedAt,
        sourceUrl: GDPX_URL,
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
      const message = err instanceof Error ? err.message : 'GDPx leaderboard check failed.';
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

export async function updateGdpxPreferences(options: {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  models?: GdpxSheetModelSnapshot[];
}): Promise<GdpxCheckReport | null> {
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
        ? buildGdpxDiffs(updatedReport.models, sheetModels, {
            ignoredIds,
            manualMappings: nextMappings,
          })
        : updatedReport.diffs.map((d) =>
            nextIgnored.has(d.gdpxId)
              ? {
                  ...d,
                  status: 'ignored' as const,
                  matchedModelId: null,
                  matchedDisplayName: null,
                  sheetRowNumber: null,
                  currentColJ: null,
                  reason: 'Vom Benutzer ignoriert.',
                }
              : d
          );

    const counts = summarizeGdpxReportCounts(
      updatedReport.totalSourceModels,
      updatedReport.sourceUpdatedAt,
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
