import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  GroundingSource,
  LabPlanInfo,
  ModelPricingSnapshot,
  MonitoredLab,
  PriceDiffStatus,
  PricingCheckReport,
  PricingDiffItem,
  PricingMonitorStatusResponse,
} from '../src/types/pricingMonitor.ts';

const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-pricing-monitor-cache.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/export?format=csv&gid=170267419';

interface PersistedMonitorCache {
  report: PricingCheckReport | null;
  lastError: string | null;
}

let inMemoryCache: PersistedMonitorCache | null = null;
let inFlightCheck: Promise<PricingCheckReport> | null = null;
let schedulerStarted = false;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Add your Gemini API key in Settings > Secrets.'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function readCache(): Promise<PersistedMonitorCache> {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  try {
    const raw = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as PersistedMonitorCache;
    if (parsed && typeof parsed === 'object') {
      inMemoryCache = {
        report: parsed.report ?? null,
        lastError: parsed.lastError ?? null,
      };
      return inMemoryCache;
    }
  } catch {
    // Cache file may not exist yet
  }

  inMemoryCache = { report: null, lastError: null };
  return inMemoryCache;
}

async function writeCache(cache: PersistedMonitorCache): Promise<void> {
  inMemoryCache = cache;
  try {
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist pricing monitor cache to temp dir:', err);
  }
}

export function isReportDue(report: PricingCheckReport | null): boolean {
  if (!report?.checkedAt) return true;
  const checkedMs = new Date(report.checkedAt).getTime();
  if (!Number.isFinite(checkedMs)) return true;
  return Date.now() - checkedMs >= CHECK_INTERVAL_MS;
}

export async function getPricingMonitorStatus(): Promise<PricingMonitorStatusResponse> {
  const cache = await readCache();
  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );

  return {
    report: cache.report,
    isDue: isReportDue(cache.report),
    isRunning: inFlightCheck !== null,
    checkIntervalHours: 24,
    hasGeminiKey,
    lastError: cache.lastError,
  };
}

function parseCsvRowsSimple(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else if (char === '"') {
      insideQuotes = true;
    } else if (char === ',') {
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\r') {
      if (nextChar === '\n') i++;
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else if (char === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function normalizeLab(raw: string): MonitoredLab | null {
  const low = raw.toLowerCase();
  if (low.includes('openai')) return 'OpenAI';
  if (low.includes('anthropic')) return 'Anthropic';
  if (low.includes('google')) return 'Google';
  if (low.includes('meta')) return 'Meta';
  return null;
}

async function fetchLiveFourLabSnapshotsFromCsv(): Promise<ModelPricingSnapshot[]> {
  const res = await fetch(DEFAULT_SHEET_CSV_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch live sheet CSV (HTTP ${res.status})`);
  }
  const csvText = await res.text();
  const rows = parseCsvRowsSimple(csvText);
  if (rows.length < 36) return [];

  const row0 = rows[0] || [];
  const row1 = rows[1] || [];
  let colDe = 19;
  let colUs: number | null = null;
  let colCreator = 25;

  for (let c = 19; c < Math.max(row0.length, row1.length, 30); c++) {
    const h01 = `${row0[c] || ''} ${row1[c] || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
    const h1 = (row1[c] || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (
      /\b(us|usa|united states)\b/i.test(h01) &&
      (h01.includes('cost') || h01.includes('abokosten') || h01.includes('paid') || h01.includes('chat'))
    ) {
      if (colUs === null) colUs = c;
    } else if (
      (h01.includes('germany') || h01.includes('deutschland') || /\bin de\b/.test(h01) || h01.includes('abokosten')) &&
      (h01.includes('cost') || h01.includes('paid') || h01.includes('abokosten') || h01.includes('chat'))
    ) {
      colDe = c;
    } else if (h1 === 'model creator' || h01.includes('model creator')) {
      colCreator = c;
    }
  }

  const currentBotNames = new Set<string>();
  for (let r = 1; r < Math.min(32, rows.length); r++) {
    const s = (rows[r]?.[18] || '').trim().toLowerCase();
    const b = (rows[r]?.[1] || '').trim().toLowerCase();
    if (s) currentBotNames.add(s);
    if (b) currentBotNames.add(b);
  }

  let startIndex = 35;
  for (let r = 0; r < Math.min(45, rows.length); r++) {
    if ((rows[r]?.[1] || '').trim().toLowerCase() === 'history') {
      startIndex = r + 1;
      break;
    }
  }
  startIndex = Math.max(35, startIndex);

  const snapshots: ModelPricingSnapshot[] = [];
  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 5) continue;
    const rawB = (row[1] || '').trim();
    const rawC = (row[2] || '').trim();
    const colS = (row[18] || '').trim();

    if (
      rawB.includes('Sources & Notes') ||
      rawC.includes('Sources & Notes') ||
      rawC === 'min' ||
      rawB === 'min'
    ) {
      break;
    }
    if (!colS) continue;

    const lab = normalizeLab(`${rawC} ${row[colCreator] || ''} ${colS}`);
    if (!lab) continue;

    const isPaid = rawB.includes('💲');
    const chatLink = (row[15] || '').trim().toLowerCase();
    const apiLink = (row[16] || '').trim().toLowerCase();
    const isSuperseded =
      chatLink.includes('better') || chatLink.includes('discontinued') || chatLink === '';
    const isAvailable =
      currentBotNames.has(colS.toLowerCase()) ||
      currentBotNames.has(rawB.toLowerCase()) ||
      (!isSuperseded &&
        (chatLink.startsWith('http') ||
          chatLink.includes('paid') ||
          chatLink.includes('api') ||
          apiLink.startsWith('http')));

    const priceDeMonthly = (row[colDe] || '').trim() || undefined;
    const priceUsMonthly = colUs !== null ? (row[colUs] || '').trim() || undefined : undefined;

    if (!isAvailable && !isPaid && !priceDeMonthly && !priceUsMonthly) continue;

    snapshots.push({
      id: `model-${r}-${colS.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      displayName: colS,
      companyName: lab,
      sheetRowNumber: r + 1,
      isAvailable,
      isPaid,
      priceDeMonthly,
      priceUsMonthly,
    });
  }

  return snapshots;
}

function normalizePriceForComparison(val: string | undefined | null): string {
  if (!val) return '';
  return val
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\/mo(nth)?|\/monat/g, '')
    .replace(/–|—/g, '-')
    .replace(/^eur/, '€')
    .replace(/^usd/, '$');
}

function determineCellStatus(
  currentVal: string,
  liveVal: string,
  isPaid: boolean
): PriceDiffStatus {
  const curNorm = normalizePriceForComparison(currentVal);
  const liveNorm = normalizePriceForComparison(liveVal);

  if (!liveNorm || liveNorm === 'free' || liveNorm === 'n/a' || liveNorm === 'none') {
    return 'unchanged';
  }
  if (!curNorm) {
    return isPaid ? 'missing' : 'unchanged';
  }
  if (curNorm === liveNorm) {
    return 'unchanged';
  }
  return 'changed';
}

function extractJsonObject(text: string): Record<string, unknown> {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
    }
    throw new Error('Could not parse structured pricing JSON from Gemini response.');
  }
}

export async function runPricingCheck(options?: {
  models?: ModelPricingSnapshot[];
  trigger?: 'manual' | 'daily_auto';
}): Promise<PricingCheckReport> {
  if (inFlightCheck) {
    return inFlightCheck;
  }

  const trigger = options?.trigger ?? 'manual';

  const task = (async (): Promise<PricingCheckReport> => {
    try {
      const ai = getGeminiClient();

      let rawModels =
        Array.isArray(options?.models) && options.models.length > 0
          ? options.models
          : await fetchLiveFourLabSnapshotsFromCsv();

      // Strictly enforce Row 36+ and the 4 requested labs
      const monitoredModels = rawModels
        .filter((m) => m.sheetRowNumber >= 36 && normalizeLab(m.companyName) !== null)
        .filter((m) => m.isAvailable && (m.isPaid || m.priceDeMonthly || m.priceUsMonthly));

      const todayIso = new Date().toISOString().slice(0, 10);

      const prompt = `Today's date is ${todayIso}.
Use Google Search to check the CURRENT official consumer chatbot subscription pricing in BOTH:
1. United States (USD, "$")
2. Germany (EUR, "€", incl. VAT — or "US only" if a paid plan/model is currently unavailable in Germany)

You MUST check all 4 AI labs:
- OpenAI (ChatGPT Plus, ChatGPT Go / Lite if any, ChatGPT Pro $100/$200 tiers)
- Anthropic (Claude Pro, Claude Max 5x, Claude Max 20x)
- Google (Google AI Pro / Gemini Advanced, Google AI Ultra)
- Meta (Meta AI / Muse paid consumer subscription plans if any, and whether available in Germany or US only)

CRITICAL FORMATTING RULES (must match the Science-IQ Google Sheet columns T & U):
- Sheet header rule is: "if paid for 1 year vs. if paid monthly".
- If annual billing is cheaper than monthly, format as a compact range like "$17-20" or "15-18€" or "14-22€".
- If there is no annual discount or only monthly pricing exists, format as a single price like "$20", "23€", "$100", "99€", "103€", "$50", "$200", "229€".
- If a paid plan is available in the US but NOT yet available to consumers in Germany, set DE price to "US only".
- Compare ONLY against the live/current official subscription tier for each paid model listed below. Do NOT invent changes for cosmetic differences (if the sheet's current price already matches the real current plan price within rounding/VAT, keep the exact current sheet string as liveDe / liveUs so there are no false-positive diffs!).

Here are the current active/paid models from the sheet (Rows 36+) to compare:
${JSON.stringify(
  monitoredModels.map((m) => ({
    id: m.id,
    displayName: m.displayName,
    lab: normalizeLab(m.companyName),
    sheetRowNumber: m.sheetRowNumber,
    isPaid: m.isPaid,
    currentDeColT: m.priceDeMonthly || '',
    currentUsColU: m.priceUsMonthly || '',
  })),
  null,
  2
)}

Return ONLY valid JSON matching this exact TypeScript shape (no markdown commentary outside JSON):
{
  "labs": [
    {
      "lab": "OpenAI" | "Anthropic" | "Google" | "Meta",
      "planName": "e.g. ChatGPT Plus",
      "tierKey": "standard" | "pro" | "ultra" | "free",
      "usMonthly": "$20",
      "deMonthly": "23€",
      "billingNotes": "Short note on annual vs monthly pricing & German availability",
      "sourceUrl": "https://..."
    }
  ],
  "modelComparisons": [
    {
      "modelId": "matching id from input",
      "matchedPlanName": "e.g. Claude Pro",
      "liveDe": "15-18€",
      "liveUs": "$17-20",
      "reason": "Brief factual explanation (e.g. Matches current Claude Pro €18 / $20 monthly or €15/$17 annual pricing, OR Price changed from X to Y)",
      "sourceUrl": "https://..."
    }
  ],
  "summaryDe": "1-2 concise German sentences summarizing today's check across Meta, OpenAI, Anthropic, and Google.",
  "summaryEn": "1-2 concise English sentences summarizing today's check across Meta, OpenAI, Anthropic, and Google."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });

      const rawText = response.text ?? '';
      if (!rawText.trim()) {
        throw new Error('Gemini returned an empty response during pricing check.');
      }

      const parsed = extractJsonObject(rawText);

      // Extract grounded web sources from groundingMetadata
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sourceMap = new Map<string, GroundingSource>();
      if (Array.isArray(chunks)) {
        for (const chunk of chunks) {
          const web = (chunk as { web?: { uri?: string; title?: string } })?.web;
          if (web?.uri && !sourceMap.has(web.uri)) {
            sourceMap.set(web.uri, {
              title: web.title || web.uri,
              uri: web.uri,
            });
          }
        }
      }

      const rawLabs = Array.isArray(parsed.labs) ? parsed.labs : [];
      const labs: LabPlanInfo[] = rawLabs
        .map((item): LabPlanInfo | null => {
          const rec = item as Record<string, unknown>;
          const lab = normalizeLab(String(rec.lab || ''));
          if (!lab) return null;
          const tierRaw = String(rec.tierKey || 'standard').toLowerCase();
          const tierKey: LabPlanInfo['tierKey'] =
            tierRaw === 'pro' || tierRaw === 'ultra' || tierRaw === 'free' ? tierRaw : 'standard';
          return {
            lab,
            planName: String(rec.planName || `${lab} Plan`).trim(),
            tierKey,
            usMonthly: String(rec.usMonthly || '').trim(),
            deMonthly: String(rec.deMonthly || '').trim(),
            billingNotes: String(rec.billingNotes || '').trim(),
            sourceUrl: typeof rec.sourceUrl === 'string' && rec.sourceUrl.startsWith('http') ? rec.sourceUrl : undefined,
          };
        })
        .filter((x): x is LabPlanInfo => x !== null);

      const rawComparisons = Array.isArray(parsed.modelComparisons) ? parsed.modelComparisons : [];
      const compById = new Map<string, Record<string, unknown>>();
      for (const comp of rawComparisons) {
        const rec = comp as Record<string, unknown>;
        if (typeof rec.modelId === 'string') {
          compById.set(rec.modelId, rec);
        }
      }

      const diffs: PricingDiffItem[] = monitoredModels.map((m) => {
        const lab = normalizeLab(m.companyName) as MonitoredLab;
        const comp = compById.get(m.id);
        const currentDe = (m.priceDeMonthly || '').trim();
        const currentUs = (m.priceUsMonthly || '').trim();
        const liveDe = comp ? String(comp.liveDe ?? currentDe).trim() : currentDe;
        const liveUs = comp ? String(comp.liveUs ?? currentUs).trim() : currentUs;

        const deStatus = determineCellStatus(currentDe, liveDe, m.isPaid);
        const usStatus = determineCellStatus(currentUs, liveUs, m.isPaid);

        return {
          modelId: m.id,
          displayName: m.displayName,
          lab,
          sheetRowNumber: m.sheetRowNumber,
          isAvailable: m.isAvailable,
          matchedPlanName: comp ? String(comp.matchedPlanName || '').trim() : '',
          currentDe,
          liveDe,
          deStatus,
          currentUs,
          liveUs,
          usStatus,
          reason: comp ? String(comp.reason || '').trim() : 'No comparison returned.',
          sourceUrl:
            comp && typeof comp.sourceUrl === 'string' && comp.sourceUrl.startsWith('http')
              ? comp.sourceUrl
              : undefined,
        };
      });

      const changedCount = diffs.filter(
        (d) => d.deStatus === 'changed' || d.usStatus === 'changed'
      ).length;
      const missingCount = diffs.filter(
        (d) =>
          (d.deStatus === 'missing' || d.usStatus === 'missing') &&
          d.deStatus !== 'changed' &&
          d.usStatus !== 'changed'
      ).length;
      const unchangedCount = diffs.length - changedCount - missingCount;

      const now = new Date();
      const report: PricingCheckReport = {
        checkedAt: now.toISOString(),
        nextCheckDueAt: new Date(now.getTime() + CHECK_INTERVAL_MS).toISOString(),
        trigger,
        labs,
        diffs,
        changedCount,
        missingCount,
        unchangedCount,
        summaryDe:
          typeof parsed.summaryDe === 'string' && parsed.summaryDe.trim()
            ? parsed.summaryDe.trim()
            : changedCount > 0
            ? `${changedCount} Preisänderung(en) bei Meta, OpenAI, Anthropic oder Google erkannt.`
            : 'Keine Preisänderungen gegenüber dem Google Sheet erkannt.',
        summaryEn:
          typeof parsed.summaryEn === 'string' && parsed.summaryEn.trim()
            ? parsed.summaryEn.trim()
            : changedCount > 0
            ? `Detected ${changedCount} pricing change(s) across Meta, OpenAI, Anthropic, or Google.`
            : 'No pricing changes detected compared to your Google Sheet.',
        sources: Array.from(sourceMap.values()).slice(0, 12),
      };

      await writeCache({ report, lastError: null });
      return report;
    } catch (err) {
      const message = formatGeminiError(err);
      const existing = await readCache();
      await writeCache({ report: existing.report, lastError: message });
      throw new Error(message);
    } finally {
      inFlightCheck = null;
    }
  })();

  inFlightCheck = task;
  return task;
}

function formatGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown error checking live pricing.');
  let parsedMsg = raw;
  let status = '';

  try {
    const obj = JSON.parse(raw) as { error?: { message?: string; status?: string; code?: number } };
    if (obj?.error?.message) parsedMsg = obj.error.message;
    if (obj?.error?.status) status = obj.error.status;
  } catch {
    // Keep raw string
  }

  if (status === 'RESOURCE_EXHAUSTED' || raw.includes('429') || raw.includes('quota')) {
    return 'Gemini API quota/rate limit exceeded (429 RESOURCE_EXHAUSTED). Please try again shortly or select a billing-enabled API key in Settings > Secrets.';
  }
  if (status === 'PERMISSION_DENIED' || raw.includes('403') || raw.includes('API_KEY_INVALID')) {
    return 'Gemini API key permission denied or invalid. Please check your key in Settings > Secrets.';
  }
  return parsedMsg;
}

export function startDailyPricingScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const maybeRunScheduledCheck = async () => {
    try {
      const hasKey = Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      );
      if (!hasKey) return;

      const cache = await readCache();
      if (isReportDue(cache.report) && !inFlightCheck) {
        console.log('[PricingMonitor] Running scheduled 24h pricing check...');
        await runPricingCheck({ trigger: 'daily_auto' });
      }
    } catch (err) {
      console.warn('[PricingMonitor] Scheduled daily check skipped/failed:', err);
    }
  };

  // Initial check 15s after server startup if >24h stale, then check hourly
  setTimeout(() => {
    void maybeRunScheduledCheck();
  }, 15_000);

  setInterval(() => {
    void maybeRunScheduledCheck();
  }, 60 * 60 * 1000);
}
