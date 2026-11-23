import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  LabPlanInfo,
  ModelPricingSnapshot,
  MonitoredLab,
  PriceDiffStatus,
  PricingCheckReport,
  PricingDiffItem,
  PricingMonitorStatusResponse,
} from '../src/types/pricingMonitor.ts';
import {
  roundCurrencyString,
  roundCurrencyTokensInText,
} from '../src/utils/priceFormat.ts';

const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-pricing-monitor-cache-v6.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const QUOTA_COOLDOWN_MS = 6 * 60 * 60 * 1000;

interface PersistedMonitorCache {
  report: PricingCheckReport | null;
  lastError: string | null;
  cooldownUntil: string | null;
}

let inMemoryCache: PersistedMonitorCache | null = null;
let inFlightCheck: Promise<PricingCheckReport> | null = null;

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
        cooldownUntil: parsed.cooldownUntil ?? null,
      };
      return inMemoryCache;
    }
  } catch {
    // Cache file may not exist yet
  }

  inMemoryCache = { report: null, lastError: null, cooldownUntil: null };
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

export function isCooldownActive(cooldownUntil?: string | null): boolean {
  if (!cooldownUntil) return false;
  const untilMs = new Date(cooldownUntil).getTime();
  return Number.isFinite(untilMs) && untilMs > Date.now();
}

export function isReportDue(
  report: PricingCheckReport | null,
  cooldownUntil?: string | null
): boolean {
  if (isCooldownActive(cooldownUntil)) return false;
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
    isDue: isReportDue(cache.report, cache.cooldownUntil),
    isRunning: inFlightCheck !== null,
    checkIntervalHours: 24,
    hasGeminiKey,
    lastError: cache.lastError,
    cooldownUntil: cache.cooldownUntil,
  };
}

function normalizeLab(raw: string): MonitoredLab | null {
  const low = raw.toLowerCase();
  if (low.includes('openai')) return 'OpenAI';
  if (low.includes('anthropic')) return 'Anthropic';
  if (low.includes('google')) return 'Google';
  if (low.includes('meta')) return 'Meta';
  return null;
}

function normalizePriceForComparison(val: string | undefined | null): string {
  if (!val) return '';
  return roundCurrencyString(val)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\/mo(nth)?|\/monat/g, '')
    .replace(/–|—/g, '-')
    .replace(/^eur/, '€')
    .replace(/^usd/, '$');
}

function hasCustomPricingComment(val: string | undefined | null): boolean {
  if (!val) return false;
  // Remove standard bare price expressions, currency tokens, and regional markers
  const stripped = val
    .toLowerCase()
    .replace(/\bus\s*only\b/g, ' ')
    .replace(/\b(usd|eur|dollars?|dolars?|euros?|free|gratis|n\/a|none|per\s+month|pro\s+monat|mo|month|monat)\b/g, ' ')
    .replace(/[$€0-9.,/~≈<>+\-–—():;]+/g, ' ')
    .trim();
  return /[a-zäöüß]{2,}/i.test(stripped);
}

function extractNumericPricesKey(val: string | undefined | null): string {
  if (!val) return '';
  const matches = val.match(/\d+(?:[.,]\d+)?/g);
  return matches ? matches.map((n) => parseFloat(n.replace(',', '.'))).join(',') : '';
}

function isCliOrCodingComparison(compRec: Record<string, unknown> | undefined): boolean {
  if (!compRec) return false;
  const text = `${String(compRec.matchedPlanName || '')} ${String(compRec.reason || '')}`.toLowerCase();
  return /\b(cli|muse\s*code|coder|coders|coding|kein\s*browser|no\s*chat)\b/i.test(text);
}

function parseRangeBounds(val: string | undefined | null): { low: number; high: number } | null {
  if (!val) return null;
  const m = val.trim().match(/^(?:[$€]\s*)?(\d+)\s*[-–—]\s*(\d+)\s*(?:[$€])?$/);
  if (!m) return null;
  const low = Number(m[1]);
  const high = Number(m[2]);
  if (!Number.isFinite(low) || !Number.isFinite(high) || low >= high) return null;
  return { low, high };
}

function parseSingleNumber(val: string | undefined | null): number | null {
  if (!val) return null;
  const m = val.trim().match(/^(?:~|ca\.?)?\s*(?:[$€]\s*)?(\d+)\s*(?:[$€])?$/i);
  if (!m) return null;
  const num = Number(m[1]);
  return Number.isFinite(num) ? num : null;
}

function preserveAnnualRangeIfMonthlyOnly(
  currentVal: string,
  liveVal: string,
  reason: string
): string {
  if (/annual\s*(?:removed|ended|discontinued)|no\s*annual|kein\s*jahres/i.test(reason)) {
    return liveVal;
  }
  const range = parseRangeBounds(currentVal);
  const liveSingle = parseSingleNumber(liveVal);
  // Annual-discount consumer plans (e.g. 5-10€, 14-22€, $17-20, 15-18€) have high <= 30;
  // when fetched static HTML only renders the non-discounted monthly price (equals range.high),
  // preserve the full annual-to-monthly range.
  if (range && range.high <= 30 && liveSingle !== null && liveSingle === range.high) {
    return currentVal;
  }
  return liveVal;
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

      const rawModels = Array.isArray(options?.models) ? options.models : [];
      if (rawModels.length === 0) {
        throw new Error(
          'Google Sheets connection required: live Sheet models are missing. Sign in with Google Sheets first.'
        );
      }

      // Enforce valid sheet row numbers (client already scopes to dynamic historyStartRow) and the 4 labs
      const monitoredModels = rawModels
        .filter((m) => m.sheetRowNumber >= 2 && normalizeLab(m.companyName) !== null)
        .filter((m) => !/\bgpt[-\s]?4[-\s]?turbo\b/i.test(m.displayName))
        .filter((m) => m.isAvailable && (m.isPaid || m.priceDeMonthly || m.priceUsMonthly));

      interface OfficialPageExcerpt {
        lab: MonitoredLab;
        title: string;
        url: string;
        excerpt: string;
      }

      const extractPricingFocusedExcerpt = (text: string, maxChars = 9500): string => {
        if (text.length <= maxChars) return text;

        // Always keep top overview/hero, then capture all windows with price/plan tokens
        const headBudget = 2000;
        const head = text.slice(0, headBudget);
        const tokenRegex =
          /(?:\$\s?\d+(?:\.\d{2})?|€\s?\d+(?:[.,]\d{2})?|\d+[.,]\d+\s?€|\d+\s?€|\bEUR\b|\bUSD\b|\/month|\/mo\b|\/Monat|\/Jahr|\bMeta One\b|\bCore\b|\bPremium\b|\bMuse Power\b|\bMuse Maximum\b|\bMuse Wonder\b|\bMuse Spark\b|\bmuse\.ai\b|\bmeta\.ai\b|\bChatGPT Go\b|\bChatGPT Plus\b|\bChatGPT Pro\b|\bClaude Pro\b|\bClaude Max\b|\bClaude Ultra\b|\bGoogle AI Plus\b|\bGoogle AI Pro\b|\bGoogle AI Ultra\b)/gi;

        const ranges: Array<[number, number]> = [];
        let match: RegExpExecArray | null;
        while ((match = tokenRegex.exec(text)) !== null) {
          const start = Math.max(headBudget, match.index - 180);
          const end = Math.min(text.length, match.index + 380);
          if (ranges.length > 0 && start <= ranges[ranges.length - 1][1] + 60) {
            ranges[ranges.length - 1][1] = Math.max(ranges[ranges.length - 1][1], end);
          } else {
            ranges.push([start, end]);
          }
          if (ranges.length >= 30) break;
        }

        let result = head;
        for (const [start, end] of ranges) {
          const chunk = text.slice(start, end).trim();
          if (!chunk) continue;
          if (result.length + chunk.length + 5 > maxChars) {
            const remaining = maxChars - result.length - 5;
            if (remaining > 120) {
              result += ' ... ' + chunk.slice(0, remaining);
            }
            break;
          }
          result += ' ... ' + chunk;
        }
        return result;
      };

      const fetchOfficialPricingExcerpts = async (): Promise<OfficialPageExcerpt[]> => {
        const targets: Array<{ lab: MonitoredLab; title: string; url: string }> = [
          // OpenAI (help/announcement pages contain full server-rendered prices & model matrices; chatgpt.com/pricing is client-hydrated)
          {
            lab: 'OpenAI',
            title: 'OpenAI ChatGPT Go Announcement',
            url: 'https://openai.com/index/introducing-chatgpt-go/',
          },
          {
            lab: 'OpenAI',
            title: 'OpenAI Help: ChatGPT Plus',
            url: 'https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus',
          },
          {
            lab: 'OpenAI',
            title: 'OpenAI Help: ChatGPT Pro Tiers',
            url: 'https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers',
          },
          {
            lab: 'OpenAI',
            title: 'OpenAI Help: Models in ChatGPT',
            url: 'https://help.openai.com/en/articles/20001354-gpt-6-and-other-models-in-chatgpt',
          },
          // Anthropic
          {
            lab: 'Anthropic',
            title: 'Anthropic Claude Pricing',
            url: 'https://claude.com/pricing',
          },
          {
            lab: 'Anthropic',
            title: 'Anthropic Support: Claude Pro',
            url: 'https://support.claude.com/en/articles/8325606-what-is-the-pro-plan',
          },
          {
            lab: 'Anthropic',
            title: 'Anthropic Support: Claude Max',
            url: 'https://support.claude.com/en/articles/11049741-what-is-the-max-plan',
          },
          // Google (gemini.google/subscriptions renders exact US $ and DE € numbers in static HTML)
          {
            lab: 'Google',
            title: 'Google Gemini Subscriptions (US)',
            url: 'https://gemini.google/us/subscriptions/?hl=en',
          },
          {
            lab: 'Google',
            title: 'Google Gemini Subscriptions (DE)',
            url: 'https://gemini.google/de/subscriptions/?hl=de',
          },
          {
            lab: 'Google',
            title: 'Google One Help: AI Pro (DE)',
            url: 'https://support.google.com/googleone/answer/14534406?hl=de',
          },
          // Meta: consumer browser & personal agent plans (Meta One Core/Premium + muse.ai Free/$20/$100)
          // Note: Muse Code is a developer terminal CLI tool and excluded as a consumer baseline;
          // dev.meta.ai/models/muse-wonder is fetched solely to detect if Muse Wonder Full expands beyond CLI.
          {
            lab: 'Meta',
            title: 'Meta Newsroom: Meta One Consumer Bundles ($8 / $20)',
            url: 'https://about.fb.com/news/2026/09/introducing-meta-one-subscription-service-more-features-ai/',
          },
          {
            lab: 'Meta',
            title: 'Meta Newsroom: Introducing Muse Personal Browser Agent',
            url: 'https://about.fb.com/news/2026/09/introducing-muse/',
          },
          {
            lab: 'Meta',
            title: 'Meta Newsroom: Muse Wonder & Wonder Full Rollout',
            url: 'https://about.fb.com/news/2026/10/introducing-muse-wonder-models/',
          },
          {
            lab: 'Meta',
            title: 'Wikipedia: Meta Muse Agent Pricing (Free / $20 / $100)',
            url: 'https://en.wikipedia.org/wiki/Meta_Muse',
          },
          {
            lab: 'Meta',
            title: 'Meta Dev: Muse Wonder Availability Check',
            url: 'https://dev.meta.ai/models/muse-wonder',
          },
        ];

        const stripHtml = (html: string): string => {
          return html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
            .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
            .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
            .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&euro;/gi, '€')
            .replace(/&#x27;/gi, "'")
            .replace(/\s+/g, ' ')
            .trim();
        };

        const results = await Promise.all(
          targets.map(async (target) => {
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 5000);
              const res = await fetch(target.url, {
                signal: controller.signal,
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                  Accept: 'text/html,application/xhtml+xml',
                  'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
                },
              });
              clearTimeout(timer);
              if (!res.ok) return null;
              const text = stripHtml(await res.text());
              if (
                text.length < 150 ||
                /just a moment|enable javascript and cookies|cf-browser-verification/i.test(text)
              ) {
                return null;
              }
              return {
                lab: target.lab,
                title: target.title,
                url: res.url || target.url,
                excerpt: extractPricingFocusedExcerpt(text, 8500),
              };
            } catch {
              return null;
            }
          })
        );

        return results.filter((x): x is OfficialPageExcerpt => x !== null);
      };

      const todayIso = new Date().toISOString().slice(0, 10);
      const directFetchedSources = await fetchOfficialPricingExcerpts();
      const fetchedContext =
        directFetchedSources.length > 0
          ? `\n\nLIVE PRICING & MODEL PAGES FETCHED TODAY (${todayIso}):\n${directFetchedSources
              .map((s) => `--- ${s.lab} · ${s.title} (${s.url}) ---\n${s.excerpt}`)
              .join('\n\n')}`
          : '';

      const prompt = `Today's date is ${todayIso}.
Audience focus: NON-CODER browser chat / web app users (first-semester psychology students). NEVER use developer terminal CLI tools like "Muse Code" as the consumer pricing baseline!
Analyze the live fetched pricing & model pages below (combined with verified current plan knowledge where regional VAT/annual conversions apply) in BOTH:
1. United States (USD, "$")
2. Germany (EUR, "€", incl. VAT — or "US only" if a paid consumer plan/model is currently unavailable in Germany)

You MUST include ALL relevant CONSUMER browser/app plans across all 4 AI labs in "labs" (excluding CLI-only tools like Muse Code):
- OpenAI: ChatGPT Go ($8 / ~8€; expanded free-tier features, no Pro/Plus-exclusive models), ChatGPT Plus ($20 / 23€), ChatGPT Pro 100 ($100 / 103€), ChatGPT Pro 200 ($200 / 200€), ChatGPT Pro 500 ($500 / 510€)
- Anthropic: Claude Pro ($17-20 / 15-18€; includes Opus 5.5), Claude Max ($100 / 90€; includes Fable 5.2), Claude Ultra ($200 / 180€)
- Google: Google AI Plus ($5 / 5-10€; 2x Hydrogen, 400 GB), Google AI Pro ($17-20 / 14-22€; Gemini 4 Argon, 5 TB), Google AI Ultra ($100-200 / 100-220€; Gemini 4 Carbon, 20 TB)
- Meta (Consumer Browser / App Plans ONLY — do NOT list Muse Code CLI plans in "labs"!):
  * Meta AI Free ($0 / 0€ — meta.ai chat, Muse Spark 1.1)
  * Meta One Core ($8 / ~8-9€ — app perks + extra media gen; NO Muse Wonder)
  * Meta One Premium ($20 / ~20-23€ — max Meta AI media gen; NO Muse Wonder)
  * Muse Free ($0 / US only — muse.ai browser agent, baseline weekly quota)
  * Muse Power ($20 / US only — muse.ai browser agent, 500M tok/wk)
  * Muse Maximum ($100 / US only — muse.ai browser agent, 3B tok/wk; quota only)

CRITICAL VERIFICATION & MODEL-TO-TIER RULES:
1. NEVER blindly trust or copy the Google Sheet's current "de" / "us" values! Verify EVERY model strictly against the fetched sources below first — EXCEPT keep annual-to-monthly discount ranges whenever a static webpage only prints the monthly rate without its interactive annual toggle (e.g. Google AI Pro static HTML only shows $19.99/mo = $20 and 21,99€/mo = 22€, so keep "$17-20" / "14-22€" unless the monthly price itself changed!).
2. Always match each paid model to the CHEAPEST / LOWEST CONSUMER BROWSER subscription tier that grants access to that model — EXCEPT for the flagship multi-step Pro/Max/Ultra tiers below, which span multiple expensive capacity/quota levels (no annual discount, instead multiple plan steps like Pro 100 -> Pro 500 or Max -> Ultra):
   - NEVER assign a consumer baseline to a CLI coding plan ("Muse Code" $5/$15/$50/$200)!
   - Meta (Consumer browser / non-coder baseline):
     * Casual meta.ai browser chat is FREE ($0 / 0€) and Meta One ($8 / $20) only increases media/app perks — Meta One does NOT unlock Muse Spark 1.3, Muse Wonder, or Muse Wonder Full.
     * "Muse Spark 1.3": Consumer browser access is via muse.ai ("Meta Muse" web/app, US only — not in meta.ai chat). Paid consumer browser tier is "Muse Power" ($20 / US only) — NEVER assign "Muse Code Everyday ($5)" CLI or "Muse Maximum ($100)"!
     * "Muse Wonder": Rolling out to muse.ai consumer subscribers — consumer browser baseline is "Muse Power" ($20 / US only), NOT "Muse Code Everyday ($5)" CLI!
     * "Muse Wonder Full": Currently has NO consumer browser chat plan on meta.ai or muse.ai (only available via developer CLI "Muse Code Power" at $50 / US only). Unless the fetched sources show Muse Wonder Full launching in muse.ai/meta.ai browser chat, match it as "Muse Code Power (CLI only)" with liveDe="US only". For liveUs: if the sheet's current "us" already contains ANY descriptive comment/note (e.g. "no chat, 50 dolar for coders", "no chat / $50 for coders", "CLI", "coder", "coding", "no chat"), ALWAYS KEEP that exact sheet string unchanged as liveUs so the user's comment is preserved; otherwise set liveUs="$50". State "CLI only (kein Browser-Chat)" in "reason".
   - OpenAI:
     * GPT-6.1 Sol / Terra unlock at ChatGPT Plus ($20 / 23€).
     * GPT-6 Astra / ChatGPT-6 Astra spans the multi-step ChatGPT Pro tiers from Pro 100 ($100 / 103€) up to Pro 500 ($500 / 510€) -> output the full multi-tier range liveUs="$100-500", liveDe="103-510€" (and update either bound if OpenAI changes Pro 100 or Pro 500 pricing).
   - Anthropic:
     * Claude Opus 5.5 unlocks at Claude Pro ($17-20 / 15-18€).
     * Claude Fable 5.2 spans the multi-step Max/Ultra tiers from Claude Max ($100 / 90€) up to Claude Ultra ($200 / 180€) -> output the full multi-tier range liveUs="$100-200", liveDe="90-180€" (and update either bound if Anthropic changes Max or Ultra pricing).
   - Google:
     * Google AI Pro (Gemini 4 Argon / Gemini 4 Neon) includes BOTH the annual-discount effective monthly rate AND the regular monthly rate: ALWAYS output liveUs="$17-20" and liveDe="14-22€" (do NOT drop the annual lower bound to "$20" or "22€" when the static HTML only shows the monthly rate).
     * Gemini 4 Carbon spans the multi-step Google AI Ultra tiers from Ultra 5x ($100 / 100€) up to Ultra 20x ($200 / 220€) -> output the full multi-tier range liveUs="$100-200", liveDe="100-220€" (and update either bound if Google changes Ultra tier pricing).
3. Sheet formatting rules (Columns T & U):
   - ALWAYS round ALL dollar and euro prices to WHOLE integers (no decimals/cents like .99 or .50) AND round psychological "-1" prices ending in 9 (e.g. 99€ -> 100€, $99 -> $100, 199€ -> 200€, $199 -> $200, 219€ -> 220€) up to the clean figure: use "$5", "5-10€", "$8", "$20", "15-18€", "23€", "90-180€", "100-220€", "$100-200", "103-510€", "$100-500", "$50".
   - Annual discount < monthly OR multi-step flagship capacity tiers -> compact hyphenated range like "$17-20", "15-18€", "14-22€", "5-10€", "90-180€", "100-220€", "$100-200", "103-510€", "$100-500".
   - Monthly-only / flat -> "$20", "23€", "$100", "100€", "103€", "$50", "$8", "$5".
   - Paid plan unavailable in Germany -> DE price = "US only".
   - ONLY keep an identical sheet string for minor currency/VAT/annual rounding when the model is matched to the RIGHT consumer tier (do NOT suppress real tier changes!).

CONCISENESS RULES (for clean UI):
- "billingNotes": MAX 50 chars. Only key unlocked models/limits (e.g., "meta.ai chat (Spark 1.1)", "muse.ai agent, 500M tok/wk", "App perks+media (no Wonder)").
- "reason": MAX 55 chars. Concise tier note or exact delta (e.g., "muse.ai Power $20 (CLI $5 ign.)", "CLI-only $50 (kein Browser-Chat)").
- "summaryDe" / "summaryEn": ONE short sentence (max 120 chars).

Here are the current active/paid models from the sheet (Rows 36+) to verify:
${JSON.stringify(
  monitoredModels.map((m) => ({
    id: m.id,
    name: m.displayName,
    lab: normalizeLab(m.companyName),
    paid: m.isPaid,
    de: m.priceDeMonthly || '',
    us: m.priceUsMonthly || '',
  }))
)}${fetchedContext}

Return ONLY valid JSON matching this exact TypeScript shape (no markdown commentary outside JSON):
{
  "labs": [
    {
      "lab": "OpenAI" | "Anthropic" | "Google" | "Meta",
      "planName": "e.g. Muse Power",
      "tierKey": "standard" | "pro" | "ultra" | "free",
      "usMonthly": "$20",
      "deMonthly": "US only",
      "billingNotes": "muse.ai agent, 500M tok/wk",
      "sourceUrl": "https://..."
    }
  ],
  "modelComparisons": [
    {
      "modelId": "matching id from input",
      "matchedPlanName": "e.g. Muse Power (muse.ai)",
      "liveDe": "US only",
      "liveUs": "$20",
      "reason": "muse.ai Power $20 (CLI $5 ign.)",
      "sourceUrl": "https://..."
    }
  ],
  "summaryDe": "1 kurzer deutscher Satz zum Ergebnis.",
  "summaryEn": "1 short English sentence summarizing the check."
}`;

      const generateWithFallback = async () => {
        const attempts: Array<{
          model: string;
          thinkingLevel?: ThinkingLevel;
          delayMs: number;
        }> = [
          { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, delayMs: 0 },
          { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, delayMs: 1800 },
          { model: 'gemini-3.5-flash-lite', delayMs: 1200 },
          { model: 'gemini-flash-lite-latest', delayMs: 1500 },
        ];

        let lastErr: unknown;
        for (const attempt of attempts) {
          if (attempt.delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
          }
          try {
            return await ai.models.generateContent({
              model: attempt.model,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                ...(attempt.thinkingLevel
                  ? { thinkingConfig: { thinkingLevel: attempt.thinkingLevel } }
                  : {}),
              },
            });
          } catch (err) {
            lastErr = err;
            const errStr = err instanceof Error ? err.message : String(err || '');
            console.warn(
              `[PricingMonitor] Attempt (${attempt.model}) failed: ${errStr.slice(0, 300)}`
            );
            const isRetryable =
              errStr.includes('429') ||
              errStr.includes('RESOURCE_EXHAUSTED') ||
              errStr.toLowerCase().includes('quota') ||
              errStr.includes('503') ||
              errStr.includes('UNAVAILABLE') ||
              /high demand|overloaded/i.test(errStr) ||
              errStr.includes('500') ||
              errStr.includes('404');
            if (!isRetryable) throw err;
          }
        }
        throw lastErr;
      };

      const response = await generateWithFallback();

      const rawText = response.text ?? '';
      if (!rawText.trim()) {
        throw new Error('Gemini returned an empty response during pricing check.');
      }

      const parsed = extractJsonObject(rawText);

      const rawLabs = Array.isArray(parsed.labs) ? parsed.labs : [];
      const labs: LabPlanInfo[] = rawLabs
        .map((item): LabPlanInfo | null => {
          const rec = item as Record<string, unknown>;
          const lab = normalizeLab(String(rec.lab || ''));
          if (!lab) return null;
          const tierRaw = String(rec.tierKey || 'standard').toLowerCase();
          const tierKey: LabPlanInfo['tierKey'] =
            tierRaw === 'pro' || tierRaw === 'ultra' || tierRaw === 'free' ? tierRaw : 'standard';
          const planName = String(rec.planName || `${lab} Plan`).trim();
          let usMonthly = roundCurrencyString(String(rec.usMonthly || '').trim());
          let deMonthly = roundCurrencyString(String(rec.deMonthly || '').trim());
          if (lab === 'Google' && /(?:google\s*)?ai\s*pro\b/i.test(planName)) {
            if (parseSingleNumber(usMonthly) === 20) usMonthly = '$17-20';
            if (parseSingleNumber(deMonthly) === 22) deMonthly = '14-22€';
          }
          return {
            lab,
            planName,
            tierKey,
            usMonthly,
            deMonthly,
            billingNotes: roundCurrencyTokensInText(String(rec.billingNotes || '').trim()),
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
        const compPlanName = comp ? String(comp.matchedPlanName || '').trim() : '';
        const compReason = comp ? String(comp.reason || '').trim() : '';
        const currentDe = roundCurrencyString((m.priceDeMonthly || '').trim());
        const currentUs = roundCurrencyString((m.priceUsMonthly || '').trim());
        let liveDe = comp ? roundCurrencyString(String(comp.liveDe ?? currentDe).trim()) : currentDe;
        let liveUs = comp ? roundCurrencyString(String(comp.liveUs ?? currentUs).trim()) : currentUs;

        const cliOrCodingOnly =
          isCliOrCodingComparison(comp) ||
          (/\bmuse\s+wonder\s+full\b/i.test(m.displayName) &&
            hasCustomPricingComment(currentUs) &&
            (!comp || extractNumericPricesKey(liveUs) === '50'));

        // Preserve user-written comments (e.g. "no chat, 50 dolar for coders" or coding-abo notes)
        // when the numeric price matches or the model is CLI/coding-only.
        if (
          hasCustomPricingComment(currentDe) &&
          (cliOrCodingOnly ||
            (extractNumericPricesKey(currentDe) !== '' &&
              extractNumericPricesKey(currentDe) === extractNumericPricesKey(liveDe)))
        ) {
          liveDe = currentDe;
        }
        if (
          hasCustomPricingComment(currentUs) &&
          (cliOrCodingOnly ||
            (extractNumericPricesKey(currentUs) !== '' &&
              extractNumericPricesKey(currentUs) === extractNumericPricesKey(liveUs)))
        ) {
          liveUs = currentUs;
        }

        // Preserve annual-to-monthly discount range for Google AI Pro when static HTML only shows $20 / 22€
        const isGoogleAiPro =
          lab === 'Google' &&
          (/(?:google\s*)?ai\s*pro\b/i.test(compPlanName) ||
            (parseRangeBounds(currentDe)?.low === 14 && parseRangeBounds(currentDe)?.high === 22) ||
            (parseRangeBounds(currentUs)?.low === 17 && parseRangeBounds(currentUs)?.high === 20));
        if (isGoogleAiPro && !/annual\s*(?:removed|ended|discontinued)|no\s*annual|kein\s*jahres/i.test(compReason)) {
          if (parseSingleNumber(liveDe) === 22) liveDe = '14-22€';
          if (parseSingleNumber(liveUs) === 20) liveUs = '$17-20';
        }

        // General safeguard: preserve annual-to-monthly range if live value only returned the monthly upper bound
        liveDe = preserveAnnualRangeIfMonthlyOnly(currentDe, liveDe, compReason);
        liveUs = preserveAnnualRangeIfMonthlyOnly(currentUs, liveUs, compReason);

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
          reason: comp ? roundCurrencyTokensInText(String(comp.reason || '').trim()) : 'No comparison returned.',
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
        sources: directFetchedSources.map((s) => ({
          title: `${s.lab}: ${s.title}`,
          uri: s.url,
        })),
      };

      await writeCache({ report, lastError: null, cooldownUntil: null });
      return report;
    } catch (err) {
      const message = formatGeminiError(err);
      const isQuotaErr =
        message.includes('429') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.toLowerCase().includes('quota');
      const existing = await readCache();
      await writeCache({
        report: existing.report,
        lastError: message,
        cooldownUntil: isQuotaErr
          ? new Date(Date.now() + QUOTA_COOLDOWN_MS).toISOString()
          : existing.cooldownUntil,
      });
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
  if (status === 'UNAVAILABLE' || raw.includes('503') || /high demand|overloaded/i.test(raw)) {
    return 'Gemini pricing-check LLM (gemini-4-hydrogen / gemini-3.5-flash-lite / gemini-flash-lite-latest) is temporarily experiencing high demand (503 UNAVAILABLE). All 4 benchmark checkers work without an LLM; please retry "Check Live" shortly.';
  }
  if (status === 'PERMISSION_DENIED' || raw.includes('403') || raw.includes('API_KEY_INVALID')) {
    return 'Gemini API key permission denied or invalid. Please check your key in Settings > Secrets.';
  }
  return parsedMsg;
}
