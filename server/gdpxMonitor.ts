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

const GDPX_URL = 'https://gdpx.semianalysis.com/';
const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-gdpx-monitor-cache-v3.json');

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

export async function fetchLiveGdpxLeaderboard(
  previousKnownIds: string[] = []
): Promise<{
  updatedAt: string | null;
  models: GdpxLeaderboardModel[];
  newlyDiscoveredIds: string[];
}> {
  const userAgent = 'Science-AI-Charts-GDPxMonitor/1.0 (+https://gdpx.semianalysis.com/)';
  const html = await fetchTextWithTimeout(GDPX_URL, userAgent, 'text/html,application/javascript,*/*');
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
    const js = await fetchTextWithTimeout(chunkUrl, userAgent, 'application/javascript,*/*');
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
    const score = Math.round(compositeRaw * 10 + 1e-9) / 10;

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
      scoreDecimals: 1,
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
    scoreDecimals: item.scoreDecimals,
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
} {
  let s = (raw || '').toLowerCase().trim();
  s = s.replace(/[^\p{L}\p{N}\s()._-]/gu, ' ');
  s = s.replace(/\bchatgpt[-\s]*/g, 'gpt ');
  s = s.replace(/\bdeepseek\s+v(?=\d)/g, 'deepseek ');
  s = s.replace(/\bqwen(?=\d)/g, 'qwen ');
  s = s.replace(/\bminimax[-\s]*/g, 'minimax ');

  const qualifiers: string[] = [];
  const baseWithoutParens = s.replace(/\(([^)]+)\)/g, (_m, inner: string) => {
    qualifiers.push(inner.trim().toLowerCase());
    return ' ';
  });

  return {
    compactFull: s.replace(/[^a-z0-9]/g, ''),
    compactBase: baseWithoutParens.replace(/[^a-z0-9]/g, ''),
    qualifiers,
  };
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
  const qStr = matchedParsed.qualifiers.join(' ');
  if (/\b(max|xhigh|highest|high)\b/.test(qStr)) totalScore += 35;
  if (/\b(med|medium|low|fast|lite)\b/.test(qStr)) totalScore -= 90;
  if (/\bprev(iew)?\b/i.test(sheet.displayName) || /\bprev(iew)?\b/i.test(sheet.name)) {
    if (!/\bprev(iew)?\b/i.test(gdpx.name)) totalScore -= 120;
  }

  if (sheet.colJ !== null) totalScore += 40;
  if (sheet.colJIsBold === true) totalScore += 20;
  if (matchCompanyName(gdpx.lab, sheet.companyName)) totalScore += 15;
  totalScore += computeReleaseDateTiebreaker(sheet.releaseDate, 2025);

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
  const { usedSheetRows, resolvedMatches } = reserveManualMappings(
    gdpxModels,
    sheetModels,
    ignoredSet,
    preferences?.manualMappings ?? {}
  );

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

  return gdpxModels.map((gdpx): GdpxDiffItem => {
    const base = {
      gdpxId: gdpx.id,
      gdpxName: gdpx.name,
      lab: gdpx.lab,
      harness: gdpx.harness,
      reasoning: gdpx.reasoning,
      openWeights: gdpx.openWeights,
      rank: gdpx.rank,
      liveScore: gdpx.score,
      scoreDecimals: gdpx.scoreDecimals,
      costPerTask: gdpx.costPerTask,
    };

    if (ignoredSet.has(gdpx.id)) {
      return {
        ...base,
        status: 'ignored',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColJ: null,
        currentColJIsBold: null,
        reason: 'Vom Benutzer ignoriert.',
      };
    }

    const bestMatch = resolvedMatches.get(gdpx.id) ?? null;
    if (!bestMatch) {
      return {
        ...base,
        status: 'new_unmatched',
        matchedModelId: null,
        matchedDisplayName: null,
        sheetRowNumber: null,
        currentColJ: null,
        currentColJIsBold: null,
        reason:
          'Kein passendes Modell im Sheet gefunden — manuell zuordnen oder Zeile im Sheet anlegen.',
      };
    }

    if (bestMatch.colJ === null) {
      return {
        ...base,
        status: 'missing',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColJ: null,
        currentColJIsBold: bestMatch.colJIsBold,
        reason: 'Spalte J ist in dieser Zeile noch leer (wird fett als offizieller Wert eingetragen).',
      };
    }

    const isEstimateNonBold = bestMatch.colJIsBold === false;
    const delta = Math.abs(bestMatch.colJ - gdpx.score);
    const liveFormatted = formatExactScore(gdpx.score, gdpx.scoreDecimals ?? 1);

    if (isEstimateNonBold) {
      return {
        ...base,
        status: 'overwrite_estimate',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColJ: bestMatch.colJ,
        currentColJIsBold: false,
        reason: `Nicht-fetter Schätzwert (${bestMatch.colJ}) → offiziellen GDPx-Score (${liveFormatted}, fett) übernehmen.`,
      };
    }

    if (delta >= SCORE_DIFF_THRESHOLD) {
      return {
        ...base,
        status: 'changed',
        matchedModelId: bestMatch.id,
        matchedDisplayName: bestMatch.displayName,
        sheetRowNumber: bestMatch.sheetRowNumber,
        currentColJ: bestMatch.colJ,
        currentColJIsBold: bestMatch.colJIsBold,
        reason: `Offizieller Score weicht ab (${bestMatch.colJ} → ${liveFormatted}).`,
      };
    }

    return {
      ...base,
      status: 'unchanged',
      matchedModelId: bestMatch.id,
      matchedDisplayName: bestMatch.displayName,
      sheetRowNumber: bestMatch.sheetRowNumber,
      currentColJ: bestMatch.colJ,
      currentColJIsBold: bestMatch.colJIsBold,
      reason: 'Synchron (fett/offiziell).',
    };
  });
}

function summarizeGdpxReportCounts(
  totalSourceModels: number,
  sourceUpdatedAt: string | null,
  diffs: GdpxDiffItem[],
  hasSheetModels: boolean
) {
  const counts = countDiffStatuses(diffs);
  let summaryDe = '';
  let summaryEn = '';

  if (!hasSheetModels) {
    summaryDe = `${totalSourceModels} LLMs live auf GDPx geladen (Stand ${sourceUpdatedAt || 'aktuell'}).`;
    summaryEn = `Loaded ${totalSourceModels} live LLMs from GDPx (updated ${sourceUpdatedAt || 'latest'}).`;
  } else if (counts.actionableCount > 0) {
    const partsDe: string[] = [];
    const partsEn: string[] = [];
    if (counts.unmatchedCount > 0) {
      partsDe.push(`${counts.unmatchedCount} neues LLM ohne Sheet-Zeile`);
      partsEn.push(`${counts.unmatchedCount} new LLM(s) without Sheet match`);
    }
    if (counts.missingCount > 0) {
      partsDe.push(`${counts.missingCount} fehlend in J`);
      partsEn.push(`${counts.missingCount} missing in J`);
    }
    if (counts.overwriteEstimateCount > 0) {
      partsDe.push(`${counts.overwriteEstimateCount} nicht-fette Schätzwerte`);
      partsEn.push(`${counts.overwriteEstimateCount} non-bold estimate(s)`);
    }
    if (counts.changedCount > 0) {
      partsDe.push(`${counts.changedCount} geänderte Score(s)`);
      partsEn.push(`${counts.changedCount} changed score(s)`);
    }
    summaryDe = `${partsDe.join(', ')} (${totalSourceModels} LLMs auf GDPx).`;
    summaryEn = `${partsEn.join(', ')} (${totalSourceModels} LLMs on GDPx).`;
  } else {
    summaryDe = `Alle ${totalSourceModels} GDPx-LLMs sind in Spalte J aktuell (fett).`;
    summaryEn = `All ${totalSourceModels} GDPx LLMs are synced & bold in Column J.`;
  }

  return { ...counts, summaryDe, summaryEn };
}

const runtime = createMonitorRuntime<
  GdpxLeaderboardModel,
  GdpxSheetModelSnapshot,
  GdpxDiffItem,
  GdpxCheckReport
>({
  label: 'GDPx',
  cacheFilePath: CACHE_FILE_PATH,
  sourceUrl: GDPX_URL,
  initialBaselineIds: INITIAL_BASELINE_GDPX_IDS,
  checkFailureFallbackMessage: 'GDPx leaderboard check failed.',
  fetchLiveLeaderboard: fetchLiveGdpxLeaderboard,
  buildDiffs: buildGdpxDiffs,
  summarizeCounts: (live, diffs, hasSheetModels) =>
    summarizeGdpxReportCounts(live.models.length, live.updatedAt, diffs, hasSheetModels),
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
    sourceUrl: GDPX_URL,
    totalSourceModels: live.models.length,
    baselineKnownCount,
    newlyDiscoveredSourceIds: live.newlyDiscoveredIds,
    trigger,
    models: live.models,
    diffs,
    ...counts,
  }),
  getDiffSourceId: (d) => d.gdpxId,
  markDiffIgnored: (d) => ({
    ...d,
    status: 'ignored',
    matchedModelId: null,
    matchedDisplayName: null,
    sheetRowNumber: null,
    currentColJ: null,
    currentColJIsBold: null,
    reason: 'Vom Benutzer ignoriert.',
  }),
});

export const isGdpxReportDue = runtime.isReportDue;

export async function getGdpxMonitorStatus(): Promise<GdpxMonitorStatusResponse> {
  return runtime.getStatus();
}

export async function runGdpxCheck(options?: {
  models?: GdpxSheetModelSnapshot[];
  trigger?: 'manual' | 'daily_auto';
}): Promise<GdpxCheckReport> {
  return runtime.runCheck(options);
}

export async function updateGdpxPreferences(options: {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  unmapIds?: string[];
  models?: GdpxSheetModelSnapshot[];
}): Promise<GdpxCheckReport | null> {
  return runtime.updatePreferences(options);
}
