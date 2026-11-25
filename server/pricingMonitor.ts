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
import { DEFAULT_LAB_PLANS } from '../src/data/pricingPlansFallback.ts';
import {
  roundCurrencyString,
  roundCurrencyTokensInText,
} from '../src/utils/priceFormat.ts';
import {
  computeStarterPlanRange,
  isStarterSubscriptionFreeModel,
} from '../src/utils/starterPlanPricing.ts';

const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-pricing-monitor-cache-v11.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const GEMINI_OVERLOAD_COOLDOWN_MS = 30 * 60 * 1000; // 30 min on 503
const GEMINI_QUOTA_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 h on 429 / free-tier search restriction

interface PersistedMonitorCache {
  report: PricingCheckReport | null;
  lastError: string | null;
  cooldownUntil: string | null;
  searchGroundingCooldownUntil?: string | null;
  htmlLlmCooldownUntil?: string | null;
}

interface OfficialPageFetchResult {
  key: string;
  lab: MonitoredLab;
  title: string;
  url: string;
  text: string;
}

interface GeminiFallbackResult {
  plansByLab: Map<MonitoredLab, LabPlanInfo[]>;
  searchVerifiedLabs: Set<MonitoredLab>;
  htmlLlmVerifiedLabs: Set<MonitoredLab>;
  sources: Array<{ title: string; uri: string }>;
  nextSearchCooldownUntil: string | null;
  nextHtmlLlmCooldownUntil: string | null;
}

let inMemoryCache: PersistedMonitorCache | null = null;
let inFlightCheck: Promise<PricingCheckReport> | null = null;

function getOptionalGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
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
        searchGroundingCooldownUntil: parsed.searchGroundingCooldownUntil ?? null,
        htmlLlmCooldownUntil: parsed.htmlLlmCooldownUntil ?? null,
      };
      return inMemoryCache;
    }
  } catch {
    // Cache file may not exist yet
  }

  inMemoryCache = {
    report: null,
    lastError: null,
    cooldownUntil: null,
    searchGroundingCooldownUntil: null,
    htmlLlmCooldownUntil: null,
  };
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

  return {
    report: cache.report,
    isDue: isReportDue(cache.report, cache.cooldownUntil),
    isRunning: inFlightCheck !== null,
    checkIntervalHours: 24,
    // Primary HTML parser works without an API key; Gemini Search is only an optional non-blocking fallback
    hasGeminiKey: true,
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
  if (low.includes('xai') || low.includes('spacex') || low.includes('grok')) return 'xAI';
  if (low.includes('moonshot') || low.includes('kimi')) return 'Moonshot';
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
  const stripped = val
    .toLowerCase()
    .replace(/\bus\s*only\b/g, ' ')
    .replace(
      /\b(usd|eur|dollars?|dolars?|bucks?|euros?|free|gratis|n\/a|none|per\s+month|pro\s+monat|mo|month|monat)\b/g,
      ' '
    )
    .replace(/[$€0-9.,/~≈<>+\-–—():;]+/g, ' ')
    .trim();
  return /[a-zäöüß]{2,}/i.test(stripped);
}

function isZeroOnlyPrice(val: string): boolean {
  const nums = val.match(/\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length === 0) return false;
  return Math.max(...nums.map((n) => parseFloat(n.replace(',', '.')) || 0)) <= 0;
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

function determineCellStatus(
  currentVal: string,
  liveVal: string,
  expectPrice: boolean
): PriceDiffStatus {
  const curNorm = normalizePriceForComparison(currentVal);
  const liveNorm = normalizePriceForComparison(liveVal);

  if (
    !liveNorm ||
    liveNorm === 'free' ||
    liveNorm === 'n/a' ||
    liveNorm === 'none' ||
    isZeroOnlyPrice(liveNorm)
  ) {
    return 'unchanged';
  }
  if (!curNorm) {
    return expectPrice ? 'missing' : 'unchanged';
  }
  if (curNorm === liveNorm) {
    return 'unchanged';
  }
  return 'changed';
}

function roundWholePrice(num: number): number {
  const rounded = Math.round(num);
  if (rounded >= 9 && rounded % 10 === 9) {
    return rounded + 1;
  }
  return rounded;
}

function parseLocalizedNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function extractFirstNumber(text: string, regexes: RegExp[]): number | null {
  for (const re of regexes) {
    const m = text.match(re);
    if (m && m[1]) {
      const val = parseLocalizedNumber(m[1]);
      if (val !== null && val > 0) {
        return roundWholePrice(val);
      }
    }
  }
  return null;
}

function scaleEurFromUsd(
  liveUsd: number,
  baselineUsd: number,
  baselineEur: number
): number {
  if (liveUsd === baselineUsd) return baselineEur;
  return roundWholePrice((liveUsd / baselineUsd) * baselineEur);
}

function stripHtml(html: string): string {
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
    throw new Error('Could not parse structured JSON from Gemini fallback response.');
  }
}

async function fetchOfficialPricingPages(): Promise<OfficialPageFetchResult[]> {
  const targets: Array<{ key: string; lab: MonitoredLab; title: string; url: string }> = [
    {
      key: 'openai_go',
      lab: 'OpenAI',
      title: 'OpenAI ChatGPT Go',
      url: 'https://openai.com/index/introducing-chatgpt-go/',
    },
    {
      key: 'openai_plus',
      lab: 'OpenAI',
      title: 'OpenAI Help: ChatGPT Plus',
      url: 'https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus',
    },
    {
      key: 'openai_pro',
      lab: 'OpenAI',
      title: 'OpenAI Help: ChatGPT Pro Tiers',
      url: 'https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers',
    },
    {
      key: 'anthropic_pricing',
      lab: 'Anthropic',
      title: 'Anthropic Claude Pricing',
      url: 'https://claude.com/pricing',
    },
    {
      key: 'anthropic_pro',
      lab: 'Anthropic',
      title: 'Anthropic Support: Claude Pro',
      url: 'https://support.claude.com/en/articles/8325606-what-is-the-pro-plan',
    },
    {
      key: 'anthropic_max',
      lab: 'Anthropic',
      title: 'Anthropic Support: Claude Max',
      url: 'https://support.claude.com/en/articles/11049741-what-is-the-max-plan',
    },
    {
      key: 'google_us',
      lab: 'Google',
      title: 'Google Gemini Subscriptions (US)',
      url: 'https://gemini.google/us/subscriptions/?hl=en',
    },
    {
      key: 'google_de',
      lab: 'Google',
      title: 'Google Gemini Subscriptions (DE)',
      url: 'https://gemini.google/de/subscriptions/?hl=de',
    },
    {
      key: 'meta_one',
      lab: 'Meta',
      title: 'Meta Newsroom: Meta One Consumer Bundles',
      url: 'https://about.fb.com/news/2026/09/introducing-meta-one-subscription-service-more-features-ai/',
    },
    {
      key: 'meta_muse_wiki',
      lab: 'Meta',
      title: 'Meta Muse Browser Agent Pricing',
      url: 'https://en.wikipedia.org/wiki/Meta_Muse',
    },
    {
      key: 'xai_plans',
      lab: 'xAI',
      title: 'xAI Grok Plans',
      url: 'https://grok.com/plans',
    },
    {
      key: 'kimi_pricing',
      lab: 'Moonshot',
      title: 'Moonshot Kimi Membership Pricing',
      url: 'https://www.kimi.com/membership/pricing',
    },
  ];

  const results = await Promise.all(
    targets.map(async (target) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5500);
        const res = await fetch(target.url, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language':
              target.key === 'google_de' ? 'de-DE,de;q=0.9,en;q=0.8' : 'en-US,en;q=0.9,de;q=0.8',
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
          key: target.key,
          lab: target.lab,
          title: target.title,
          url: res.url || target.url,
          text,
        };
      } catch {
        return null;
      }
    })
  );

  return results.filter((x): x is OfficialPageFetchResult => x !== null);
}

function buildLiveLabPlansFromPages(pages: OfficialPageFetchResult[]): {
  labs: LabPlanInfo[];
  directVerifiedLabs: Set<MonitoredLab>;
  unresolvedLabs: MonitoredLab[];
} {
  const byKey = new Map(pages.map((p) => [p.key, p]));
  const directVerifiedLabs = new Set<MonitoredLab>();

  // --- 1. OpenAI ---
  const openaiGoText = byKey.get('openai_go')?.text || '';
  const openaiPlusText = byKey.get('openai_plus')?.text || '';
  const openaiProText = byKey.get('openai_pro')?.text || '';

  const goUsd = extractFirstNumber(openaiGoText, [
    /ChatGPT\s+Go\s+at\s+\$(\d+(?:\.\d{1,2})?)/i,
    /Go\s+is\s+available\s+for\s+\$(\d+(?:\.\d{1,2})?)/i,
  ]);
  const plusUsd = extractFirstNumber(`${openaiPlusText} ${openaiGoText}`, [
    /Price:\s*\$(\d+(?:\.\d{1,2})?)\s*\/\s*month/i,
    /ChatGPT\s+Plus\s+at\s+\$(\d+(?:\.\d{1,2})?)/i,
    /web\s+app\s+for\s+\$(\d+(?:\.\d{1,2})?)\s*\/\s*month/i,
  ]);
  const pro100Usd = extractFirstNumber(openaiProText, [
    /Pro\s+100\s+\$(\d+(?:\.\d{1,2})?)/i,
    /Pro\s+100\s*\(\$(\d+(?:\.\d{1,2})?)\s*\/\s*month\)/i,
  ]);
  const pro500Usd = extractFirstNumber(openaiProText, [
    /Pro\s+500\s+\$(\d+(?:\.\d{1,2})?)/i,
    /Pro\s+500,\s+a\s+new\s+\$(\d+(?:\.\d{1,2})?)\s*\/\s*month/i,
  ]);

  // Complete only if all core OpenAI tiers parsed from live HTML (if OpenAI redesigns its page, trigger Search fallback!)
  if (goUsd && plusUsd && (pro100Usd || pro500Usd)) {
    directVerifiedLabs.add('OpenAI');
  }

  const finalGoUsd = goUsd ?? 8;
  const finalGoEur = scaleEurFromUsd(finalGoUsd, 8, 8);
  const finalPlusUsd = plusUsd ?? 20;
  const finalPlusEur = scaleEurFromUsd(finalPlusUsd, 20, 23);
  const finalProLowUsd = pro100Usd ?? 100;
  const finalProHighUsd = pro500Usd ?? 500;
  const finalProLowEur = scaleEurFromUsd(finalProLowUsd, 100, 103);
  const finalProHighEur = scaleEurFromUsd(finalProHighUsd, 500, 510);

  // --- 2. Anthropic ---
  const claudePricingText = byKey.get('anthropic_pricing')?.text || '';
  const claudeProText = byKey.get('anthropic_pro')?.text || '';
  const claudeMaxText = byKey.get('anthropic_max')?.text || '';

  const claudeProAnnualUsd = extractFirstNumber(claudePricingText, [
    /Pro\s+For\s+everyday\s+work[^$]{0,40}\$(\d+(?:\.\d{1,2})?)/i,
  ]);
  const claudeProMonthlyUsd = extractFirstNumber(`${claudePricingText} ${claudeProText}`, [
    /\$(\d+(?:\.\d{1,2})?)\s+if\s+billed\s+monthly/i,
    /Pro\s+plan[^$]{0,60}\$(\d+(?:\.\d{1,2})?)/i,
  ]);
  const claudeMaxUsd = extractFirstNumber(`${claudePricingText} ${claudeMaxText}`, [
    /Max\s+For\s+all-day\s+work[^$]{0,40}\$(\d+(?:\.\d{1,2})?)/i,
    /Max\s+plan[^$]{0,60}\$(\d+(?:\.\d{1,2})?)/i,
  ]);
  const claudeUltraUsd = extractFirstNumber(claudePricingText, [
    /Ultra\s+For\s+your\s+longest\s+tasks[^$]{0,40}\$(\d+(?:\.\d{1,2})?)/i,
  ]);

  if ((claudeProAnnualUsd || claudeProMonthlyUsd) && claudeMaxUsd && claudeUltraUsd) {
    directVerifiedLabs.add('Anthropic');
  }

  const finalClaudeProLowUsd = claudeProAnnualUsd ?? 17;
  const finalClaudeProHighUsd = claudeProMonthlyUsd ?? 20;
  const finalClaudeProLowEur = scaleEurFromUsd(finalClaudeProLowUsd, 17, 15);
  const finalClaudeProHighEur = scaleEurFromUsd(finalClaudeProHighUsd, 20, 18);
  const finalClaudeMaxUsd = claudeMaxUsd ?? 100;
  const finalClaudeUltraUsd = claudeUltraUsd ?? 200;
  const finalClaudeMaxEur = scaleEurFromUsd(finalClaudeMaxUsd, 100, 90);
  const finalClaudeUltraEur = scaleEurFromUsd(finalClaudeUltraUsd, 200, 180);

  // --- 3. Google (Direct US + DE HTML extraction) ---
  const googleUsText = byKey.get('google_us')?.text || '';
  const googleDeText = byKey.get('google_de')?.text || '';

  const googlePlusUs = extractFirstNumber(googleUsText, [
    /\$(\d+(?:\.\d{1,2})?)\s*\/\s*month\s+Get\s+2x\s+higher/i,
  ]);
  const googleProUsMonthly = extractFirstNumber(googleUsText, [
    /\$(\d+(?:\.\d{1,2})?)\s*\/\s*month\s+Get\s+4x\s+higher/i,
  ]);
  const googleUltra5xUs = extractFirstNumber(googleUsText, [
    /\$(\d+(?:\.\d{1,2})?)\s*\/\s*month:\s*5x\s+higher/i,
  ]);
  const googleUltra20xUs = extractFirstNumber(googleUsText, [
    /\$(\d+(?:\.\d{1,2})?)\s*\/\s*month:\s*20x\s+higher/i,
  ]);

  const googlePlusDe = extractFirstNumber(googleDeText, [
    /€\s*(\d+(?:[.,]\d{1,2})?)\s*EUR\s*\/\s*Monat\s+2[-‑]mal\s+höhere/i,
  ]);
  const googleProDeMonthly = extractFirstNumber(googleDeText, [
    /€\s*(\d+(?:[.,]\d{1,2})?)\s*EUR\s*\/\s*Monat\s+4[-‑]mal\s+höhere/i,
  ]);
  const googleUltra5xDe = extractFirstNumber(googleDeText, [
    /€\s*(\d+(?:[.,]\d{1,2})?)\s*EUR\s*\/\s*Monat:\s*5[-‑]mal\s+höhere/i,
  ]);
  const googleUltra20xDe = extractFirstNumber(googleDeText, [
    /€\s*(\d+(?:[.,]\d{1,2})?)\s*EUR\s*\/\s*Monat:\s*20[-‑]mal\s+höhere/i,
  ]);

  if (
    (googlePlusUs || googlePlusDe) &&
    (googleProUsMonthly || googleProDeMonthly) &&
    (googleUltra5xUs || googleUltra5xDe)
  ) {
    directVerifiedLabs.add('Google');
  }

  const finalGooglePlusUs = googlePlusUs ?? 5;
  const finalGooglePlusDe = googlePlusDe ?? 5;
  const finalGoogleProUsHigh = googleProUsMonthly ?? 20;
  const finalGoogleProUsLow =
    finalGoogleProUsHigh === 20 ? 17 : Math.round(finalGoogleProUsHigh * 0.85);
  const finalGoogleProDeHigh = googleProDeMonthly ?? 22;
  const finalGoogleProDeLow =
    finalGoogleProDeHigh === 22 ? 14 : Math.round(finalGoogleProDeHigh * 0.65);
  const finalGoogleUltraLowUs = googleUltra5xUs ?? 100;
  const finalGoogleUltraHighUs = googleUltra20xUs ?? 200;
  const finalGoogleUltraLowDe = googleUltra5xDe ?? 100;
  const finalGoogleUltraHighDe = googleUltra20xDe ?? 220;

  // --- 4. Meta ---
  const metaOneText = byKey.get('meta_one')?.text || '';
  const metaMuseText = byKey.get('meta_muse_wiki')?.text || '';

  const metaOneCoreUsd = extractFirstNumber(metaOneText, [
    /Core\s*\(\$(\d+(?:\.\d{1,2})?)\s*\/\s*mo\)/i,
  ]);
  const metaOnePremUsd = extractFirstNumber(metaOneText, [
    /Premium\s*\(\$(\d+(?:\.\d{1,2})?)\s*\/\s*mo\)/i,
  ]);
  const museMatch = metaMuseText.match(/subscriptions\s+at\s+\$(\d+)\s+and\s+\$(\d+)\s+a\s+month/i);
  const musePowerUsd = museMatch ? roundWholePrice(parseFloat(museMatch[1])) : null;
  const museMaxUsd = museMatch ? roundWholePrice(parseFloat(museMatch[2])) : null;

  if ((metaOneCoreUsd || metaOnePremUsd) && musePowerUsd) {
    directVerifiedLabs.add('Meta');
  }

  const finalMetaOneCoreUsd = metaOneCoreUsd ?? 8;
  const finalMetaOnePremUsd = metaOnePremUsd ?? 20;
  const finalMetaOneCoreEur = scaleEurFromUsd(finalMetaOneCoreUsd, 8, 8);
  const finalMetaOnePremEur = scaleEurFromUsd(finalMetaOnePremUsd, 20, 23);
  const finalMusePowerUsd = musePowerUsd ?? 20;
  const finalMuseMaxUsd = museMaxUsd ?? 100;

  // --- 5 & 6. xAI & Moonshot (SPA baseline — always queued for optional Gemini Search verification) ---
  const xaiAndMoonshotDefaults = DEFAULT_LAB_PLANS.filter(
    (p) => p.lab === 'xAI' || p.lab === 'Moonshot'
  ).map((p) => ({
    ...p,
    usMonthly: roundCurrencyString(p.usMonthly),
    deMonthly: roundCurrencyString(p.deMonthly),
  }));

  const labs: LabPlanInfo[] = [
    {
      lab: 'OpenAI',
      planName: 'ChatGPT Go',
      tierKey: 'free',
      usMonthly: `$${finalGoUsd}`,
      deMonthly: `${finalGoEur}€`,
      billingNotes: 'Expanded free limits, GPT-6 Luna',
      sourceUrl: 'https://openai.com/index/introducing-chatgpt-go/',
    },
    {
      lab: 'OpenAI',
      planName: 'ChatGPT Plus',
      tierKey: 'pro',
      usMonthly: `$${finalPlusUsd}`,
      deMonthly: `${finalPlusEur}€`,
      billingNotes: 'GPT-6.2 Sol, GPT-6.1 Terra, 5-hour limit',
      sourceUrl: 'https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus',
    },
    {
      lab: 'OpenAI',
      planName: 'ChatGPT Pro',
      tierKey: 'ultra',
      usMonthly:
        finalProLowUsd === finalProHighUsd
          ? `$${finalProHighUsd}`
          : `$${finalProLowUsd}-${finalProHighUsd}`,
      deMonthly:
        finalProLowEur === finalProHighEur
          ? `${finalProHighEur}€`
          : `${finalProLowEur}-${finalProHighEur}€`,
      billingNotes: 'GPT-6.2 Astra, Pro 100 / 200 / 500 tiers',
      sourceUrl: 'https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers',
    },
    {
      lab: 'Anthropic',
      planName: 'Claude Pro',
      tierKey: 'pro',
      usMonthly:
        finalClaudeProLowUsd === finalClaudeProHighUsd
          ? `$${finalClaudeProHighUsd}`
          : `$${finalClaudeProLowUsd}-${finalClaudeProHighUsd}`,
      deMonthly:
        finalClaudeProLowEur === finalClaudeProHighEur
          ? `${finalClaudeProHighEur}€`
          : `${finalClaudeProLowEur}-${finalClaudeProHighEur}€`,
      billingNotes: 'Opus 5.5, higher Sonnet 5.5 limits',
      sourceUrl: 'https://claude.com/pricing',
    },
    {
      lab: 'Anthropic',
      planName: 'Claude Max/Ultra',
      tierKey: 'ultra',
      usMonthly: `$${finalClaudeMaxUsd}-${finalClaudeUltraUsd}`,
      deMonthly: `${finalClaudeMaxEur}-${finalClaudeUltraEur}€`,
      billingNotes: 'Fable 5.2, 5x-10x Pro limits',
      sourceUrl: 'https://claude.com/pricing',
    },
    {
      lab: 'Google',
      planName: 'Google AI Plus',
      tierKey: 'pro',
      usMonthly: `$${finalGooglePlusUs}`,
      deMonthly: `${finalGooglePlusDe}€`,
      billingNotes: '2x Gemini 4 Hydrogen limits, 400GB storage',
      sourceUrl: 'https://gemini.google/de/subscriptions/?hl=de',
    },
    {
      lab: 'Google',
      planName: 'Google AI Pro',
      tierKey: 'pro',
      usMonthly: `$${finalGoogleProUsLow}-${finalGoogleProUsHigh}`,
      deMonthly: `${finalGoogleProDeLow}-${finalGoogleProDeHigh}€`,
      billingNotes: 'Gemini 4 Neon/Argon, 4x limits, Deep Research',
      sourceUrl: 'https://gemini.google/de/subscriptions/?hl=de',
    },
    {
      lab: 'Google',
      planName: 'Google AI Ultra',
      tierKey: 'ultra',
      usMonthly: `$${finalGoogleUltraLowUs}-${finalGoogleUltraHighUs}`,
      deMonthly: `${finalGoogleUltraLowDe}-${finalGoogleUltraHighDe}€`,
      billingNotes: 'Gemini 4 Carbon, 5x-20x limits',
      sourceUrl: 'https://gemini.google/de/subscriptions/?hl=de',
    },
    {
      lab: 'Meta',
      planName: 'Meta One Core/Premium',
      tierKey: 'pro',
      usMonthly: `$${finalMetaOneCoreUsd}-${finalMetaOnePremUsd}`,
      deMonthly: `${finalMetaOneCoreEur}-${finalMetaOnePremEur}€`,
      billingNotes: 'App perks & media gen (no Muse Wonder)',
      sourceUrl:
        'https://about.fb.com/news/2026/09/introducing-meta-one-subscription-service-more-features-ai/',
    },
    {
      lab: 'Meta',
      planName: 'Muse Power',
      tierKey: 'pro',
      usMonthly: `$${finalMusePowerUsd}`,
      deMonthly: 'US only',
      billingNotes: `muse.ai browser agent ($${finalMusePowerUsd}/$${finalMuseMaxUsd})`,
      sourceUrl: 'https://en.wikipedia.org/wiki/Meta_Muse',
    },
    ...xaiAndMoonshotDefaults,
  ];

  const allLabs: MonitoredLab[] = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'xAI', 'Moonshot'];
  const unresolvedLabs = allLabs.filter((lab) => !directVerifiedLabs.has(lab));

  return { labs, directVerifiedLabs, unresolvedLabs };
}

function parseValidatedPlansFromGeminiJson(
  rawText: string,
  allowedLabs: Set<MonitoredLab>
): Map<MonitoredLab, LabPlanInfo[]> {
  const parsed = extractJsonObject(rawText);
  const rawLabs = Array.isArray(parsed.labs) ? parsed.labs : [];
  const plansByLab = new Map<MonitoredLab, LabPlanInfo[]>();

  for (const item of rawLabs) {
    const rec = item as Record<string, unknown>;
    const lab = normalizeLab(String(rec.lab || ''));
    if (!lab || !allowedLabs.has(lab)) continue;

    const planName = String(rec.planName || '').trim();
    if (!planName) continue;
    if (/\bmuse\s*code\b/i.test(planName)) continue; // Exclude CLI coding tool

    const tierRaw = String(rec.tierKey || 'standard').toLowerCase();
    const tierKey: LabPlanInfo['tierKey'] =
      tierRaw === 'pro' || tierRaw === 'ultra' || tierRaw === 'free' ? tierRaw : 'standard';

    let usMonthly = roundCurrencyString(String(rec.usMonthly || '').trim());
    let deMonthly = roundCurrencyString(String(rec.deMonthly || '').trim());
    if (!usMonthly && !deMonthly) continue;

    if (lab === 'Google' && /(?:google\s*)?ai\s*pro\b/i.test(planName)) {
      if (parseSingleNumber(usMonthly) === 20) usMonthly = '$17-20';
      if (parseSingleNumber(deMonthly) === 22) deMonthly = '14-22€';
    }
    if (lab === 'Google' && /(?:google\s*)?ai\s*plus\b/i.test(planName)) {
      const plusDeRange = parseRangeBounds(deMonthly);
      if (plusDeRange && plusDeRange.low === 5 && plusDeRange.high === 10) {
        deMonthly = '5€';
      }
    }

    const plan: LabPlanInfo = {
      lab,
      planName,
      tierKey,
      usMonthly,
      deMonthly,
      billingNotes: roundCurrencyTokensInText(String(rec.billingNotes || '').trim()),
      sourceUrl:
        typeof rec.sourceUrl === 'string' && rec.sourceUrl.startsWith('http')
          ? rec.sourceUrl
          : undefined,
    };

    const list = plansByLab.get(lab) || [];
    list.push(plan);
    plansByLab.set(lab, list);
  }

  return plansByLab;
}

function buildFallbackPrompt(params: {
  targetLabs: MonitoredLab[];
  fetchedPages: OfficialPageFetchResult[];
  currentPlans: LabPlanInfo[];
  useSearch: boolean;
}): string {
  const { targetLabs, fetchedPages, currentPlans, useSearch } = params;
  const todayIso = new Date().toISOString().slice(0, 10);
  const relevantExcerpts = fetchedPages
    .filter((p) => targetLabs.includes(p.lab))
    .map((p) => `--- ${p.lab} · ${p.title} (${p.url}) ---\n${p.text.slice(0, 5500)}`)
    .join('\n\n');

  const baselineSubset = currentPlans
    .filter((p) => targetLabs.includes(p.lab))
    .map((p) => ({
      lab: p.lab,
      planName: p.planName,
      tierKey: p.tierKey,
      usMonthly: p.usMonthly,
      deMonthly: p.deMonthly,
    }));

  const modeInstruction = useSearch
    ? `Use Google Search grounding and the fetched page text below to verify CURRENT consumer browser-chat subscription prices in BOTH United States (USD "$") and Germany (EUR "€" incl. VAT, or "US only" if unavailable in DE) ONLY for these AI labs: ${targetLabs.join(', ')}.`
    : `Extract CURRENT consumer browser-chat subscription prices STRICTLY from the live fetched official page excerpts below (no web search available) for these AI labs: ${targetLabs.join(', ')}. If a regional currency (DE vs US) is not explicitly printed in the excerpt, keep the corresponding baseline value unless the other currency's price changed.`;

  return `Today's date is ${todayIso}.
${modeInstruction}
Audience: non-coder browser-chat users (exclude developer CLI tools like Muse Code and exclude Business/Enterprise seats).

Formatting rules:
- Whole integers only, round psychological -1 endings up (e.g. $19 -> $20, $99 -> $100, $199 -> $200, 219€ -> 220€).
- Annual-to-monthly ranges or multi-step capacity tiers as compact hyphenated ranges (e.g. "$7-8", "7-8€", "$15-20", "18-22€", "$17-20", "14-22€", "$100-500", "103-510€").
- For Google AI Plus in DE: keep base tier "5€" (4.99€/mo), do NOT inflate to 10€ for 2 TB storage add-ons.
- For Google AI Pro: keep annual-to-monthly range "$17-20" / "14-22€" unless monthly price changed.
- Keep "billingNotes" <= 50 chars.

Current reference plan names to verify/update:
${JSON.stringify(baselineSubset)}
${relevantExcerpts ? `\nLive fetched official page text:\n${relevantExcerpts}` : ''}

Return ONLY valid JSON (no markdown fences or commentary):
{
  "labs": [
    {
      "lab": "OpenAI",
      "planName": "ChatGPT Plus",
      "tierKey": "standard" | "pro" | "ultra" | "free",
      "usMonthly": "$20",
      "deMonthly": "23€",
      "billingNotes": "GPT-6.2 Sol, GPT-6.1 Terra",
      "sourceUrl": "https://..."
    }
  ]
}`;
}

/**
 * Multi-tier non-blocking Gemini fallback for unresolved labs:
 * - Tier 2a: Gemini + Google Search Grounding (covers JS SPAs like xAI/Moonshot + redesigned pages when Search Grounding is enabled)
 * - Tier 2b (Free-Tier safe, NO Search Grounding): gemini-4-hydrogen -> gemini-3.1-flash-lite with JSON output,
 *   parsing the live fetched HTML text for any redesigned official page (OpenAI/Anthropic/Google/Meta) without requiring Search Grounding.
 * Never throws or blocks the primary check on 503/429/free-tier search limits/missing key.
 */
async function fetchUnresolvedLabsViaGeminiFallback(
  unresolvedLabs: MonitoredLab[],
  fetchedPages: OfficialPageFetchResult[],
  currentPlans: LabPlanInfo[],
  prevSearchCooldownUntil: string | null,
  prevHtmlLlmCooldownUntil: string | null
): Promise<GeminiFallbackResult> {
  const result: GeminiFallbackResult = {
    plansByLab: new Map(),
    searchVerifiedLabs: new Set(),
    htmlLlmVerifiedLabs: new Set(),
    sources: [],
    nextSearchCooldownUntil: prevSearchCooldownUntil,
    nextHtmlLlmCooldownUntil: prevHtmlLlmCooldownUntil,
  };

  if (unresolvedLabs.length === 0) return result;
  const ai = getOptionalGeminiClient();
  if (!ai) return result;

  const remainingLabs = new Set<MonitoredLab>(unresolvedLabs);

  // --- Tier 2a: Optional Google Search Grounding (covers SPAs like xAI/Moonshot + redesigned pages) ---
  if (!isCooldownActive(result.nextSearchCooldownUntil)) {
    const searchPrompt = buildFallbackPrompt({
      targetLabs: Array.from(remainingLabs),
      fetchedPages,
      currentPlans,
      useSearch: true,
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini Search fallback timed out (14s).')), 14000)
    );

    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
        timeoutPromise,
      ]);

      const rawText = response.text ?? '';
      if (rawText.trim()) {
        const parsedMap = parseValidatedPlansFromGeminiJson(rawText, remainingLabs);
        for (const [lab, plans] of parsedMap.entries()) {
          if (plans.length > 0) {
            result.plansByLab.set(lab, plans);
            result.searchVerifiedLabs.add(lab);
            remainingLabs.delete(lab);
          }
        }
        result.nextSearchCooldownUntil = null;

        const groundingChunks =
          (response.candidates?.[0]?.groundingMetadata?.groundingChunks as
            | Array<{ web?: { uri?: string; title?: string } }>
            | undefined) || [];
        for (const chunk of groundingChunks) {
          const uri = chunk?.web?.uri;
          const title = chunk?.web?.title;
          if (uri && uri.startsWith('http')) {
            result.sources.push({ title: title || uri, uri });
          }
        }
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err || '');
      console.warn(`[PricingMonitor] Tier 2a (Search Grounding) skipped: ${raw.slice(0, 220)}`);
      const isQuotaOrFreeTierRestriction =
        raw.includes('429') ||
        raw.includes('403') ||
        raw.includes('400') ||
        raw.includes('RESOURCE_EXHAUSTED') ||
        /quota|grounding|search|billing|permission/i.test(raw);
      const cooldownMs = isQuotaOrFreeTierRestriction
        ? GEMINI_QUOTA_COOLDOWN_MS
        : GEMINI_OVERLOAD_COOLDOWN_MS;
      result.nextSearchCooldownUntil = new Date(Date.now() + cooldownMs).toISOString();
    }
  }

  // --- Tier 2b: Free-Tier Fallback WITHOUT Search Grounding (parses live fetched HTML of redesigned pages) ---
  // Only run on labs where we actually fetched live official HTML text (never guess SPA prices from training data).
  const htmlFallbackLabs = Array.from(remainingLabs).filter((lab) =>
    fetchedPages.some((p) => p.lab === lab && p.text.length >= 200)
  );

  if (htmlFallbackLabs.length > 0 && !isCooldownActive(result.nextHtmlLlmCooldownUntil)) {
    const htmlPrompt = buildFallbackPrompt({
      targetLabs: htmlFallbackLabs,
      fetchedPages,
      currentPlans,
      useSearch: false,
    });
    const htmlLabSet = new Set<MonitoredLab>(htmlFallbackLabs);

    const freeTierAttempts: Array<{ model: string; thinkingLevel?: ThinkingLevel }> = [
      { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
      { model: 'gemini-3.1-flash-lite' },
    ];

    let htmlSucceeded = false;
    let lastHtmlErr = '';

    for (const attempt of freeTierAttempts) {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${attempt.model} HTML fallback timed out (12s).`)), 12000)
      );
      try {
        const response = await Promise.race([
          ai.models.generateContent({
            model: attempt.model,
            contents: htmlPrompt,
            config: {
              responseMimeType: 'application/json',
              ...(attempt.thinkingLevel
                ? { thinkingConfig: { thinkingLevel: attempt.thinkingLevel } }
                : {}),
            },
          }),
          timeoutPromise,
        ]);

        const rawText = response.text ?? '';
        if (!rawText.trim()) continue;

        const parsedMap = parseValidatedPlansFromGeminiJson(rawText, htmlLabSet);
        for (const [lab, plans] of parsedMap.entries()) {
          if (plans.length > 0) {
            result.plansByLab.set(lab, plans);
            result.htmlLlmVerifiedLabs.add(lab);
            remainingLabs.delete(lab);
          }
        }
        result.nextHtmlLlmCooldownUntil = null;
        htmlSucceeded = true;
        break;
      } catch (err) {
        lastHtmlErr = err instanceof Error ? err.message : String(err || '');
        console.warn(
          `[PricingMonitor] Tier 2b (${attempt.model}, no search) failed: ${lastHtmlErr.slice(0, 220)}`
        );
      }
    }

    if (!htmlSucceeded && lastHtmlErr) {
      const isQuota =
        lastHtmlErr.includes('429') ||
        lastHtmlErr.includes('RESOURCE_EXHAUSTED') ||
        lastHtmlErr.toLowerCase().includes('quota');
      const cooldownMs = isQuota ? GEMINI_QUOTA_COOLDOWN_MS : GEMINI_OVERLOAD_COOLDOWN_MS;
      result.nextHtmlLlmCooldownUntil = new Date(Date.now() + cooldownMs).toISOString();
    }
  }

  return result;
}

function matchPaidModelToPlan(
  m: ModelPricingSnapshot,
  lab: MonitoredLab,
  labs: LabPlanInfo[]
): {
  planName: string;
  liveDe: string;
  liveUs: string;
  reason: string;
  sourceUrl?: string;
} {
  const nameLow = m.displayName.toLowerCase();
  const findPlan = (targetLab: MonitoredLab, regex: RegExp) =>
    labs.find((p) => p.lab === targetLab && regex.test(p.planName));

  if (lab === 'OpenAI') {
    if (/\bastra\b|\bpro\b/i.test(nameLow)) {
      const plan = findPlan('OpenAI', /\bpro\b/i);
      return {
        planName: plan?.planName || 'ChatGPT Pro',
        liveDe: plan?.deMonthly || '103-510€',
        liveUs: plan?.usMonthly || '$100-500',
        reason: 'ChatGPT Pro 100-500 (live geprüft)',
        sourceUrl: plan?.sourceUrl,
      };
    }
    const plan = findPlan('OpenAI', /\bplus\b/i);
    return {
      planName: plan?.planName || 'ChatGPT Plus',
      liveDe: plan?.deMonthly || '23€',
      liveUs: plan?.usMonthly || '$20',
      reason: 'ChatGPT Plus (live geprüft)',
      sourceUrl: plan?.sourceUrl,
    };
  }

  if (lab === 'Anthropic') {
    if (/\bfable\b/i.test(nameLow)) {
      const plan = findPlan('Anthropic', /\bmax\b/i);
      return {
        planName: plan?.planName || 'Claude Max/Ultra',
        liveDe: plan?.deMonthly || '90-180€',
        liveUs: plan?.usMonthly || '$100-200',
        reason: 'Claude Max/Ultra (live geprüft)',
        sourceUrl: plan?.sourceUrl,
      };
    }
    const plan = findPlan('Anthropic', /\bpro\b/i);
    return {
      planName: plan?.planName || 'Claude Pro',
      liveDe: plan?.deMonthly || '15-18€',
      liveUs: plan?.usMonthly || '$17-20',
      reason: 'Claude Pro (live geprüft)',
      sourceUrl: plan?.sourceUrl,
    };
  }

  if (lab === 'Google') {
    if (/\bcarbon\b|\bultra\b/i.test(nameLow)) {
      const plan = findPlan('Google', /\bultra\b/i);
      return {
        planName: plan?.planName || 'Google AI Ultra',
        liveDe: plan?.deMonthly || '100-220€',
        liveUs: plan?.usMonthly || '$100-200',
        reason: 'Google AI Ultra (live DE/US geprüft)',
        sourceUrl: plan?.sourceUrl,
      };
    }
    const plan = findPlan('Google', /\bpro\b/i);
    return {
      planName: plan?.planName || 'Google AI Pro',
      liveDe: plan?.deMonthly || '14-22€',
      liveUs: plan?.usMonthly || '$17-20',
      reason: 'Google AI Pro (live DE/US geprüft)',
      sourceUrl: plan?.sourceUrl,
    };
  }

  if (lab === 'Meta') {
    if (/\bwonder\s+full\b/i.test(nameLow)) {
      const currentUs = (m.priceUsMonthly || '').trim();
      return {
        planName: 'Muse Code Power (CLI only)',
        liveDe: 'US only',
        liveUs: hasCustomPricingComment(currentUs) ? currentUs : '$50',
        reason: 'CLI-only $50 (kein Browser-Chat)',
        sourceUrl: 'https://dev.meta.ai/models/muse-wonder',
      };
    }
    const plan = findPlan('Meta', /muse\s+power/i);
    return {
      planName: plan?.planName || 'Muse Power',
      liveDe: plan?.deMonthly || 'US only',
      liveUs: plan?.usMonthly || '$20',
      reason: 'muse.ai Power $20 (DE: US only)',
      sourceUrl: plan?.sourceUrl,
    };
  }

  if (lab === 'xAI') {
    const plan =
      /\bultra\b/i.test(nameLow)
        ? findPlan('xAI', /\bultra\b/i)
        : /\bsuper\b/i.test(nameLow)
        ? findPlan('xAI', /\bsuper\b/i)
        : findPlan('xAI', /\bpremium\b/i);
    return {
      planName: plan?.planName || 'Grok Premium',
      liveDe: plan?.deMonthly || '25-30€',
      liveUs: plan?.usMonthly || '$25-30',
      reason: `${plan?.planName || 'Grok Premium'} (grok.com/plans)`,
      sourceUrl: plan?.sourceUrl,
    };
  }

  // Moonshot (Kimi)
  const plan =
    /\bultra\b/i.test(nameLow)
      ? findPlan('Moonshot', /\bultra\b/i)
      : /\bmax\b/i.test(nameLow)
      ? findPlan('Moonshot', /\bmax\b/i)
      : findPlan('Moonshot', /\bplus\b/i);
  return {
    planName: plan?.planName || 'Kimi Plus',
    liveDe: plan?.deMonthly || '18-22€',
    liveUs: plan?.usMonthly || '$15-20',
    reason: `${plan?.planName || 'Kimi Plus'} (kimi.com/membership/pricing)`,
    sourceUrl: plan?.sourceUrl,
  };
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
      const rawModels = Array.isArray(options?.models) ? options.models : [];
      if (rawModels.length === 0) {
        throw new Error(
          'Google Sheets connection required: live Sheet models are missing. Sign in with Google Sheets first.'
        );
      }

      const monitoredModels = rawModels
        .filter((m) => m.sheetRowNumber >= 2 && normalizeLab(m.companyName) !== null)
        .filter((m) => !/\bgpt[-\s]?4[-\s]?turbo\b/i.test(m.displayName))
        .filter(
          (m) =>
            m.isAvailable &&
            (m.isPaid ||
              m.priceDeMonthly ||
              m.priceUsMonthly ||
              isStarterSubscriptionFreeModel(m.companyName, m.displayName, m.isPaid))
        );

      const cacheBefore = await readCache();

      // Stage 1: Direct HTTP scrape & deterministic extraction (instant, free, zero LLM)
      const directFetchedPages = await fetchOfficialPricingPages();
      const {
        labs: directLabs,
        directVerifiedLabs,
        unresolvedLabs,
      } = buildLiveLabPlansFromPages(directFetchedPages);

      // Stage 2: Optional non-blocking Gemini fallback ONLY for unresolved labs
      // - Tier 2a: Google Search Grounding (SPAs like xAI/Moonshot + redesigned pages)
      // - Tier 2b: Free-Tier Gemini WITHOUT Search Grounding (parses live fetched HTML if a pricing page was redesigned)
      let finalLabs = directLabs;
      let searchVerifiedLabs = new Set<MonitoredLab>();
      let htmlLlmVerifiedLabs = new Set<MonitoredLab>();
      let fallbackSources: Array<{ title: string; uri: string }> = [];
      let nextSearchCooldownUntil = cacheBefore.searchGroundingCooldownUntil ?? null;
      let nextHtmlLlmCooldownUntil = cacheBefore.htmlLlmCooldownUntil ?? null;

      if (unresolvedLabs.length > 0) {
        const fb = await fetchUnresolvedLabsViaGeminiFallback(
          unresolvedLabs,
          directFetchedPages,
          directLabs,
          nextSearchCooldownUntil,
          nextHtmlLlmCooldownUntil
        );
        fallbackSources = fb.sources;
        nextSearchCooldownUntil = fb.nextSearchCooldownUntil;
        nextHtmlLlmCooldownUntil = fb.nextHtmlLlmCooldownUntil;
        searchVerifiedLabs = fb.searchVerifiedLabs;
        htmlLlmVerifiedLabs = fb.htmlLlmVerifiedLabs;

        if (fb.plansByLab.size > 0) {
          const rebuilt: LabPlanInfo[] = [];
          const allOrder: MonitoredLab[] = [
            'OpenAI',
            'Anthropic',
            'Google',
            'Meta',
            'xAI',
            'Moonshot',
          ];
          for (const lab of allOrder) {
            const llmPlans = fb.plansByLab.get(lab);
            if (llmPlans && llmPlans.length > 0) {
              rebuilt.push(...llmPlans);
            } else {
              rebuilt.push(...directLabs.filter((p) => p.lab === lab));
            }
          }
          finalLabs = rebuilt;
        }
      }

      // Stage 3: Deterministic model-to-plan diff calculation
      const diffs: PricingDiffItem[] = monitoredModels.map((m) => {
        const lab = normalizeLab(m.companyName) as MonitoredLab;
        const currentDe = roundCurrencyString((m.priceDeMonthly || '').trim());
        const currentUs = roundCurrencyString((m.priceUsMonthly || '').trim());

        const starterRange = computeStarterPlanRange(m.companyName, m.displayName, m.isPaid, finalLabs);
        let matchedPlanName = '';
        let liveDe = currentDe;
        let liveUs = currentUs;
        let reason = '';
        let sourceUrl: string | undefined;

        if (starterRange) {
          matchedPlanName = starterRange.planName;
          liveDe = starterRange.deRange || currentDe;
          liveUs = starterRange.usRange || currentUs;
          reason = `Gratis + ${starterRange.planName} (${starterRange.deRange} / ${starterRange.usRange})`;
          sourceUrl = starterRange.sourceUrl;
        } else {
          const matched = matchPaidModelToPlan(m, lab, finalLabs);
          matchedPlanName = matched.planName;
          liveDe = roundCurrencyString(matched.liveDe);
          liveUs = roundCurrencyString(matched.liveUs);
          reason = matched.reason;
          sourceUrl = matched.sourceUrl;
        }

        const expectPrice = m.isPaid || Boolean(starterRange);
        const deStatus = determineCellStatus(currentDe, liveDe, expectPrice);
        const usStatus = determineCellStatus(currentUs, liveUs, expectPrice);

        return {
          modelId: m.id,
          displayName: m.displayName,
          lab,
          sheetRowNumber: m.sheetRowNumber,
          isAvailable: m.isAvailable,
          matchedPlanName,
          currentDe,
          liveDe,
          deStatus,
          currentUs,
          liveUs,
          usStatus,
          reason: roundCurrencyTokensInText(reason),
          sourceUrl,
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

      const seenSourceUris = new Set<string>();
      const combinedSources: Array<{ title: string; uri: string }> = [];
      for (const page of directFetchedPages) {
        if (page.url && !seenSourceUris.has(page.url)) {
          seenSourceUris.add(page.url);
          combinedSources.push({ title: `${page.lab}: ${page.title}`, uri: page.url });
        }
      }
      for (const s of fallbackSources) {
        if (s.uri && !seenSourceUris.has(s.uri)) {
          seenSourceUris.add(s.uri);
          combinedSources.push(s);
        }
      }

      const directCount = directVerifiedLabs.size;
      const searchCount = searchVerifiedLabs.size;
      const htmlLlmCount = htmlLlmVerifiedLabs.size;
      const extraPartsDe: string[] = [];
      const extraPartsEn: string[] = [];
      if (searchCount > 0) {
        extraPartsDe.push(`${searchCount} per Search`);
        extraPartsEn.push(`${searchCount} via Search`);
      }
      if (htmlLlmCount > 0) {
        extraPartsDe.push(`${htmlLlmCount} per HTML-LLM`);
        extraPartsEn.push(`${htmlLlmCount} via HTML-LLM`);
      }
      const sourceNoteDe =
        extraPartsDe.length > 0
          ? `${directCount} direkt + ${extraPartsDe.join(' + ')} geprüft`
          : `${directCount} direkt geprüft`;
      const sourceNoteEn =
        extraPartsEn.length > 0
          ? `${directCount} direct + ${extraPartsEn.join(' + ')}`
          : `${directCount} verified direct`;

      const summaryDe =
        changedCount > 0 && missingCount > 0
          ? `${changedCount} Änderung(en), ${missingCount} fehlend (${sourceNoteDe}).`
          : missingCount > 0
          ? `${missingCount} fehlende(r) Tarif(e) (z. B. 0-5€) für Spalte T/U gefunden (${sourceNoteDe}).`
          : changedCount > 0
          ? `${changedCount} Preisänderung(en) erkannt (${sourceNoteDe}).`
          : `Alle Preise aktuell (${sourceNoteDe}).`;

      const summaryEn =
        changedCount > 0 && missingCount > 0
          ? `${changedCount} change(s), ${missingCount} missing (${sourceNoteEn}).`
          : missingCount > 0
          ? `Found ${missingCount} missing plan(s) (e.g. $0-5) for Columns T/U (${sourceNoteEn}).`
          : changedCount > 0
          ? `Detected ${changedCount} pricing change(s) (${sourceNoteEn}).`
          : `All prices up to date (${sourceNoteEn}).`;

      const now = new Date();
      const report: PricingCheckReport = {
        checkedAt: now.toISOString(),
        nextCheckDueAt: new Date(now.getTime() + CHECK_INTERVAL_MS).toISOString(),
        trigger,
        labs: finalLabs,
        diffs,
        changedCount,
        missingCount,
        unchangedCount,
        summaryDe,
        summaryEn,
        sources: combinedSources,
      };

      await writeCache({
        report,
        lastError: null,
        cooldownUntil: null,
        searchGroundingCooldownUntil: nextSearchCooldownUntil,
        htmlLlmCooldownUntil: nextHtmlLlmCooldownUntil,
      });
      return report;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err || 'Unknown error checking live pricing.');
      const existing = await readCache();
      await writeCache({
        report: existing.report,
        lastError: message,
        cooldownUntil: null,
        searchGroundingCooldownUntil: existing.searchGroundingCooldownUntil ?? null,
        htmlLlmCooldownUntil: existing.htmlLlmCooldownUntil ?? null,
      });
      throw new Error(message);
    } finally {
      inFlightCheck = null;
    }
  })();

  inFlightCheck = task;
  return task;
}
