import { LabEntry, ModelRecord } from '../types';
import { LabPlanInfo } from '../types/pricingMonitor';
import { matchMonitoredLabKey } from '../data/pricingPlansFallback';
import { roundCurrencyString, roundCurrencyTokensInText } from './priceFormat';
import {
  findStarterPlanForLab,
  resolveStarterLabForFreeModel,
} from './starterPlanPricing';

export function normalizePricingLabKey(raw: string): string {
  const low = (raw || '').toLowerCase().trim();
  if (!low) return '';
  if (low.includes('openai') || low === 'chatgpt') return 'openai';
  if (low.includes('anthropic') || low === 'claude') return 'anthropic';
  if (low.includes('google') || low.includes('gemini')) return 'google';
  if (low.includes('meta') || low.includes('muse')) return 'meta';
  if (low.includes('spacex') || low === 'xai' || low === 'grok') return 'xai';
  if (low.includes('alibaba') || low.includes('qwen')) return 'alibaba';
  if (low.includes('deepseek')) return 'deepseek';
  if (low.includes('moonshot') || low.includes('kimi')) return 'moonshot';
  if (low.includes('zhipu') || low === 'z ai' || low === 'z.ai' || low === 'zai' || low.includes('glm')) return 'zhipu';
  if (low.includes('nvidia') || low.includes('nemotron')) return 'nvidia';
  if (low.includes('mistral')) return 'mistral';
  if (low.includes('amazon') || low.includes('nova')) return 'amazon';
  if (low.includes('inception') || low.includes('mercury')) return 'inception';
  if (low.includes('microsoft') || low.includes('phi') || low.includes('mai')) return 'microsoft';
  if (low.includes('reflection')) return 'reflection';
  if (low.includes('thinking')) return 'thinkingmachines';
  if (low.includes('xiaomi') || low.includes('mimo')) return 'xiaomi';
  if (low.includes('minimax')) return 'minimax';
  if (low.includes('inclusion') || low.includes('ant group') || low === 'ling') return 'inclusion';
  if (low.includes('stepfun')) return 'stepfun';
  if (low.includes('sapiens') || low.includes('agnes')) return 'sapiens';
  if (low.includes('tencent')) return 'tencent';
  if (low.includes('upstage') || low.includes('solar')) return 'upstage';
  if (low.includes('multiverse')) return 'multiverse';
  if (low.includes('motif')) return 'motif';
  if (low.includes('longcat')) return 'longcat';
  if (low.includes('china mobile') || low.includes('chinamobile')) return 'chinamobile';
  if (low.includes('baidu')) return 'baidu';
  if (low.includes('apple')) return 'apple';
  if (low.includes('cohere')) return 'cohere';
  if (low.includes('apodex')) return 'apodex';
  if (low.includes('deepl')) return 'deepl';
  if (low === 'ssi') return 'ssi';
  return low.replace(/[^a-z0-9]/g, '');
}

export function isZeroPriceString(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const nums = String(raw).match(/\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length === 0) return false;
  return Math.max(...nums.map((n) => parseFloat(n.replace(',', '.')) || 0)) <= 0;
}

export function cleanSheetPriceValue(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'n/a') return null;
  const low = trimmed.toLowerCase();
  if (low.includes('abokosten') || low.includes('monthly cost')) return null;
  const rounded = roundCurrencyString(trimmed);
  if (!rounded || isZeroPriceString(rounded)) return null;
  return rounded;
}

export function formatPlanShortLabel(plan: LabPlanInfo, lang: 'de' | 'en'): string {
  const rawPrice =
    (lang === 'de' ? plan.deMonthly : plan.usMonthly) ||
    (lang === 'de' ? plan.usMonthly : plan.deMonthly) ||
    '';
  const rounded = rawPrice ? roundCurrencyString(rawPrice) : '';
  const price = rounded && !isZeroPriceString(rounded) ? rounded : '';
  const name = plan.planName
    .replace(/^(ChatGPT|Claude|Google AI|Grok|Kimi)\s+/i, '')
    .replace(/^Meta AI\s+/i, 'meta.ai ')
    .replace(/^Meta One\s+/i, 'One ')
    .trim();
  return price ? `${name} ${price}` : name;
}

export function extractTierModelTokens(modelVal: string): string[] {
  const withoutParens = modelVal.replace(/[()]/g, ' ');
  return withoutParens
    .split(/[,/&+;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 2 && s !== '-' && s !== 'llm');
}

export function extractPriceBounds(
  raw: string
): { min: number; max: number; hasPlus: boolean; currency: '€' | '$' | '' } | null {
  const nums =
    String(raw)
      .match(/\d+/g)
      ?.map((n) => parseInt(n, 10))
      .filter((n) => Number.isFinite(n)) || [];
  if (nums.length === 0) return null;
  const currency = raw.includes('€') ? '€' : raw.includes('$') ? '$' : '';
  return {
    min: Math.min(...nums),
    max: Math.max(...nums),
    hasPlus: raw.includes('+'),
    currency,
  };
}

export function formatPriceRange(firstRaw: string, secondRaw?: string): string {
  const b1 = extractPriceBounds(firstRaw);
  const b2 = secondRaw ? extractPriceBounds(secondRaw) : null;
  if (!b1 && !b2) return secondRaw ? `${firstRaw}-${secondRaw}` : firstRaw;
  const allNums = [...(b1 ? [b1.min, b1.max] : []), ...(b2 ? [b2.min, b2.max] : [])];
  const min = Math.min(...allNums);
  const max = Math.max(...allNums);
  const currency = b1?.currency || b2?.currency || '';
  const hasPlus = Boolean(b1?.hasPlus || b2?.hasPlus);
  const plusSuffix = hasPlus ? '+' : '';
  if (currency === '$') {
    return min === max ? `$${min}${plusSuffix}` : `$${min}-${max}${plusSuffix}`;
  }
  if (currency === '€') {
    return min === max ? `${min}€${plusSuffix}` : `${min}-${max}€${plusSuffix}`;
  }
  return min === max ? `${min}${plusSuffix}` : `${min}-${max}${plusSuffix}`;
}

export interface TierRowPriceInfo {
  price: string;
  planLabel?: string;
}

export interface ModelStarterPriceInfo {
  price: string;
  planName: string;
  planShortLabel: string;
}

function cleanConsumerPlanLabel(planName: string): string {
  return planName
    .replace(/^(ChatGPT|Claude|Google AI|Grok|Kimi)\s+/i, '')
    .trim();
}

function pickRegionalPlanPrice(plan: LabPlanInfo | undefined, lang: 'de' | 'en'): string {
  if (!plan) return '';
  const raw = (lang === 'de' ? plan.deMonthly : plan.usMonthly) || '';
  if (!raw.trim()) return '';
  if (lang === 'de' && /\bus\s*only\b/i.test(raw)) return '';
  const rounded = roundCurrencyString(raw);
  if (!rounded || !/\d/.test(rounded) || isZeroPriceString(rounded)) return '';
  return rounded;
}


function combinePlanPrices(plans: LabPlanInfo[], lang: 'de' | 'en'): string {
  const prices = plans.map((p) => pickRegionalPlanPrice(p, lang)).filter(Boolean);
  if (prices.length === 0) return '';
  if (prices.length === 1) return prices[0];
  return formatPriceRange(prices[0], prices[prices.length - 1]);
}

function doesTokenMatchText(token: string, haystack: string): boolean {
  if (!token || !haystack) return false;
  if (token.length <= 2) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
  }
  return haystack.includes(token);
}

function findTierBenchmarkModels(
  monitoredLab: string | null,
  modelVal: string,
  matchedModels: ModelRecord[]
): ModelRecord[] {
  const baseTokens = extractTierModelTokens(modelVal);
  if (baseTokens.length === 0 || matchedModels.length === 0) return [];

  const expandedTokens = [...baseTokens];
  if (monitoredLab === 'xAI') {
    for (const tok of baseTokens) {
      const m = tok.match(/^v(\d+)$/i);
      if (m) expandedTokens.push(`grok ${m[1]}`);
    }
  } else if (monitoredLab === 'Moonshot') {
    for (const tok of baseTokens) {
      const m = tok.match(/^k(\d+)$/i);
      if (m) expandedTokens.push(`kimi k${m[1]}`);
    }
  }

  const sortedTokens = Array.from(new Set(expandedTokens)).sort((a, b) => b.length - a.length);
  const valLow = modelVal.toLowerCase();
  const isBareWonder = /\bwonder\b/.test(valLow) && !/\bwonder\s+full\b/.test(valLow);

  const hits = matchedModels.filter((m) => {
    const haystack = `${m.displayName} ${m.name}`.toLowerCase();
    if (isBareWonder && haystack.includes('wonder full')) return false;
    return sortedTokens.some((tok) => doesTokenMatchText(tok, haystack));
  });

  const availableHits = hits.filter((m) => m.isAvailable);
  return availableHits.length > 0 ? availableHits : hits;
}

function findConsumerPlanForTier(
  consumerPlans: LabPlanInfo[],
  modelVal: string,
  sheetPriceRaw: string | null,
  lang: 'de' | 'en'
): { plan: LabPlanInfo; price: string } | null {
  if (consumerPlans.length === 0) return null;
  const tokens = extractTierModelTokens(modelVal).filter((t) => t.length >= 3 || /^k\d+$/i.test(t));

  const candidates = consumerPlans
    .map((plan) => ({ plan, price: pickRegionalPlanPrice(plan, lang) }))
    .filter((entry) => Boolean(entry.price));

  if (candidates.length === 0) return null;

  const sheetBounds = sheetPriceRaw ? extractPriceBounds(sheetPriceRaw) : null;
  if (sheetBounds && sheetBounds.max > 0) {
    // Score plans by how closely their live price matches the live Google Sheet model price
    let best: { plan: LabPlanInfo; price: string; score: number } | null = null;
    for (const cand of candidates) {
      const planBounds = extractPriceBounds(cand.price);
      if (!planBounds || planBounds.max <= 0) continue;
      const sheetMid = (sheetBounds.min + sheetBounds.max) / 2;
      const planMid = (planBounds.min + planBounds.max) / 2;
      const maxRatio = Math.max(sheetBounds.max, planBounds.max) / Math.max(1, Math.min(sheetBounds.max, planBounds.max));
      const midRatio = Math.max(sheetMid, planMid) / Math.max(1, Math.min(sheetMid, planMid));
      const overlaps =
        sheetBounds.min <= planBounds.max * 1.15 && planBounds.min <= sheetBounds.max * 1.15;

      if (!overlaps && maxRatio > 1.6) continue;

      const notesLow = (cand.plan.billingNotes || '').toLowerCase();
      const mentionsModel = tokens.some((tok) => doesTokenMatchText(tok, notesLow));
      const exactMatch = sheetBounds.min === planBounds.min && sheetBounds.max === planBounds.max;

      const score =
        (exactMatch ? 100 : 0) +
        (mentionsModel ? 25 : 0) +
        Math.max(0, 50 - (midRatio - 1) * 60) +
        Math.max(0, 30 - (maxRatio - 1) * 40);

      if (!best || score > best.score) {
        best = { ...cand, score };
      }
    }
    if (best) return { plan: best.plan, price: best.price };
  }

  // Fallback: match explicitly by model name in Pricing Checker billingNotes
  if (tokens.length > 0) {
    const notesMatch = candidates.find((cand) => {
      const notesLow = (cand.plan.billingNotes || '').toLowerCase();
      return tokens.some((tok) => doesTokenMatchText(tok, notesLow));
    });
    if (notesMatch) return notesMatch;
  }

  return null;
}

/**
 * Shared dynamic starter-subscription range resolver for currently available free models
 * (e.g. GPT-6 Luna -> ChatGPT Go 0-8€, Gemini 4.0 Hydrogen -> Google AI Plus 0-5€,
 * Claude Sonnet 5.5 -> Claude Pro 0-18€, Grok 4.7/4.8 -> Grok Plus 0-8€, Kimi K3.1 Pro -> Kimi Plus 0-22€).
 * Reads live prices from the Pricing Checker plans so Rangliste & Ökosystem stay in sync.
 */
export function resolveModelStarterPriceRange(
  model: ModelRecord,
  pricingPlans: LabPlanInfo[],
  lang: 'de' | 'en'
): ModelStarterPriceInfo | null {
  if (!model.isAvailable || model.isPaid || !pricingPlans || pricingPlans.length === 0) {
    return null;
  }

  const monitoredLab = resolveStarterLabForFreeModel(
    model.companyName || model.creatorClean,
    model.displayName,
    model.isPaid,
    model.name
  );
  if (!monitoredLab) return null;

  const starterPlan = findStarterPlanForLab(monitoredLab, pricingPlans);
  const starterPrice = pickRegionalPlanPrice(starterPlan, lang);
  if (!starterPlan || !starterPrice) return null;

  const zeroUnit = lang === 'de' ? '0€' : '$0';
  return {
    price: formatPriceRange(zeroUnit, starterPrice),
    planName: starterPlan.planName,
    planShortLabel: cleanConsumerPlanLabel(starterPlan.planName),
  };
}

export function resolveTierRowPrice(
  lab: LabEntry,
  tierKey: keyof LabEntry['parameterSizes'],
  modelVal: string,
  matchedModels: ModelRecord[],
  consumerPlans: LabPlanInfo[],
  lang: 'de' | 'en'
): TierRowPriceInfo | null {
  const monitoredLab = matchMonitoredLabKey(lab.creator) || matchMonitoredLabKey(lab.id);
  const zeroUnit = lang === 'de' ? '0€' : '$0';
  const modelLow = (modelVal || '').toLowerCase();

  // 1. Inspect live Google Sheets benchmark models matching this tier row
  const tierHits = findTierBenchmarkModels(monitoredLab, modelVal, matchedModels);
  const sheetPrices: string[] = [];
  const seenSheetPrices = new Set<string>();
  let hasPaidSheetModel = false;
  let hasFreeSheetModel = false;

  for (const m of tierHits) {
    if (m.isPaid) hasPaidSheetModel = true;
    else hasFreeSheetModel = true;

    const cleaned = cleanSheetPriceValue(lang === 'de' ? m.priceDeMonthly : m.priceUsMonthly);
    if (cleaned && /[€$]/.test(cleaned) && /\d/.test(cleaned) && cleaned.length <= 16 && !isZeroPriceString(cleaned)) {
      const key = cleaned.toLowerCase();
      if (!seenSheetPrices.has(key)) {
        seenSheetPrices.add(key);
        sheetPrices.push(cleaned);
      }
    }
  }

  const combinedSheetPrice =
    sheetPrices.length === 0
      ? null
      : sheetPrices.length === 1
      ? sheetPrices[0]
      : (() => {
          const b0 = extractPriceBounds(sheetPrices[0]);
          const b1 = extractPriceBounds(sheetPrices[1]);
          if (b0 && b1 && b0.currency && b0.currency === b1.currency) {
            return formatPriceRange(sheetPrices[0], sheetPrices[1]);
          }
          return sheetPrices[0];
        })();

  // 2. Free + Starter-Subscription models (dynamically priced from Pricing Checker)
  if (monitoredLab && consumerPlans.length > 0 && !hasPaidSheetModel) {
    const isStarterFreeTier =
      (monitoredLab === 'OpenAI' && (/\bluna\b/i.test(modelLow) || tierKey === 'medium')) ||
      (monitoredLab === 'Google' && (/\bhydrogen\b/i.test(modelLow) || tierKey === 'massive')) ||
      (monitoredLab === 'Anthropic' && (/\bsonnet\b/i.test(modelLow) || tierKey === 'massive')) ||
      (monitoredLab === 'xAI' && (/\bv4\b|\bgrok\s*4/i.test(modelLow) || tierKey === 'planetary')) ||
      (monitoredLab === 'Moonshot' && (/\bk3\b/i.test(modelLow) || tierKey === 'planetary'));

    if (isStarterFreeTier) {
      const starterPlan = findStarterPlanForLab(monitoredLab, consumerPlans);
      const starterPrice = pickRegionalPlanPrice(starterPlan, lang);
      if (starterPlan && starterPrice) {
        return {
          price: formatPriceRange(zeroUnit, starterPrice),
          planLabel: cleanConsumerPlanLabel(starterPlan.planName),
        };
      }
    }
  }

  // 3. Paid models (confirmed in live Google Sheets): prefer live Pricing Checker plan price,
  //    falling back to live Google Sheets price so Ökosystem and Rangliste never diverge.
  if (hasPaidSheetModel) {
    if (monitoredLab === 'Meta' && lang === 'de') {
      return null;
    }

    if (monitoredLab && consumerPlans.length > 0) {
      const planMatch = findConsumerPlanForTier(consumerPlans, modelVal, combinedSheetPrice, lang);
      if (planMatch) {
        const finalPrice =
          hasFreeSheetModel && monitoredLab === 'Meta'
            ? formatPriceRange(zeroUnit, planMatch.price)
            : planMatch.price;
        return {
          price: finalPrice,
          planLabel: cleanConsumerPlanLabel(planMatch.plan.planName),
        };
      }
    }

    if (combinedSheetPrice) {
      return { price: combinedSheetPrice };
    }
  }

  // 4. Fallback when a tier row has no matching live benchmark model yet (e.g. OpenAI Terra):
  //    resolve dynamically from Pricing Checker plans (billingNotes first, then lab tier order).
  if (monitoredLab && consumerPlans.length > 0 && tierHits.length === 0) {
    if (monitoredLab === 'Meta' && lang === 'de') {
      return null;
    }

    const notesMatch = findConsumerPlanForTier(consumerPlans, modelVal, null, lang);
    if (notesMatch) {
      return {
        price: notesMatch.price,
        planLabel: cleanConsumerPlanLabel(notesMatch.plan.planName),
      };
    }

    if (monitoredLab === 'OpenAI') {
      if (tierKey === 'small') return null;
      const plus = consumerPlans.find((p) => /\bplus\b/i.test(p.planName));
      const pros = consumerPlans.filter((p) => /\bpro\b/i.test(p.planName));
      if (tierKey === 'large' || tierKey === 'massive' || tierKey === 'colossal' || tierKey === 'planetary') {
        const plusPrice = pickRegionalPlanPrice(plus, lang);
        if (plusPrice) return { price: plusPrice, planLabel: 'Plus' };
      }
      if (tierKey === 'singularity' || tierKey === 'godTier') {
        const proPrice = combinePlanPrices(pros, lang);
        if (proPrice) return { price: proPrice, planLabel: 'Pro' };
      }
    } else if (monitoredLab === 'Anthropic') {
      if (tierKey === 'small' || tierKey === 'medium' || tierKey === 'large') return null;
      const pro = consumerPlans.find((p) => /\bpro\b/i.test(p.planName));
      const highTiers = consumerPlans.filter((p) => /\b(max|ultra)\b/i.test(p.planName));
      if (tierKey === 'colossal' || tierKey === 'planetary') {
        const proPrice = pickRegionalPlanPrice(pro, lang);
        if (proPrice) return { price: proPrice, planLabel: 'Pro' };
      }
      if (tierKey === 'singularity' || tierKey === 'godTier') {
        const highPrice = combinePlanPrices(highTiers, lang);
        if (highPrice) {
          return {
            price: highPrice,
            planLabel: highTiers.length === 1 ? cleanConsumerPlanLabel(highTiers[0].planName) : 'Max / Ultra',
          };
        }
      }
    } else if (monitoredLab === 'Google') {
      if (tierKey === 'small' || tierKey === 'medium' || tierKey === 'large') return null;
      const pro = consumerPlans.find((p) => /\bpro\b/i.test(p.planName));
      const ultras = consumerPlans.filter((p) => /\bultra\b/i.test(p.planName));
      if (tierKey === 'colossal' || tierKey === 'planetary') {
        const proPrice = pickRegionalPlanPrice(pro, lang);
        if (proPrice) return { price: proPrice, planLabel: 'Pro' };
      }
      if (tierKey === 'singularity' || tierKey === 'godTier') {
        const ultraPrice = combinePlanPrices(ultras, lang);
        if (ultraPrice) return { price: ultraPrice, planLabel: 'Ultra' };
      }
    } else if (monitoredLab === 'Meta') {
      if (tierKey === 'small' || tierKey === 'medium' || tierKey === 'large') return null;
      const musePower = consumerPlans.find((p) => /muse power/i.test(p.planName));
      const museMax = consumerPlans.find((p) => /muse maximum/i.test(p.planName));
      if (tierKey === 'massive' || tierKey === 'colossal' || tierKey === 'planetary') {
        const powerPrice = pickRegionalPlanPrice(musePower, lang);
        if (powerPrice) return { price: powerPrice, planLabel: 'Muse Power' };
      }
      if (tierKey === 'singularity' || tierKey === 'godTier') {
        const maxPrice = pickRegionalPlanPrice(museMax, lang);
        if (maxPrice) return { price: maxPrice, planLabel: 'Muse Maximum' };
      }
    }
  }

  // 5. Fallback for non-monitored labs with explicit benchmark sheet prices
  if (combinedSheetPrice) {
    return { price: combinedSheetPrice };
  }

  return null;
}

export interface LabAccessBadge {
  label: string;
  kind: 'paidOnly' | 'freeApi';
  title?: string;
  href?: string;
}

export interface LabPricingSummary {
  accessBadges: LabAccessBadge[];
  freeApiBadge?: LabAccessBadge;
  hasFreeAccess: boolean;
  hasFreeApi: boolean;
  isPaidOnly: boolean;
  primaryText: string;
  secondaryText?: string;
  consumerPlans: LabPlanInfo[];
  subscriptionTiers?: string;
  sheetModelPrices: string[];
}

export function isDeveloperPlaygroundOrRouterUrl(url: string | undefined): boolean {
  if (!url) return false;
  const low = url.toLowerCase();
  return (
    low.includes('build.nvidia.com') ||
    low.includes('tinker.thinkingmachines.ai') ||
    low.includes('openrouter.ai') ||
    low.includes('console.mistral.ai')
  );
}

function normalizeTierLookupKey(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toLowerCase();
}

const EXACT_SUBSCRIPTION_TIERS_EN: Record<string, string> = {
  [normalizeTierLookupKey(
    'Free, Pro, Max, Ultra, Team, Enterprise | separat ab Max API Guthaben über Claude Console'
  )]:
    'Free, Pro, Max, Ultra, Team, Enterprise | separate API credits from Max onward via Claude Console',
  [normalizeTierLookupKey(
    'Free, Plus, Pro, Ultra | kostenloser API Schlüssel für Hydrogen; separat ab AI Pro API Guthaben über Cloud-Billing-Konto'
  )]:
    'Free, Plus, Pro, Ultra | free API key for Hydrogen; separate API credits from AI Pro onward via Cloud Billing account',
  [normalizeTierLookupKey(
    'Meta Muse: Free, Power, Maximum | Meta One: Core, Premium, Essential, Advanced, Expert, Max | separat API Guthaben über api.meta.ai'
  )]:
    'Meta Muse: Free, Power, Maximum | Meta One: Core, Premium, Essential, Advanced, Expert, Max | separate API credits via api.meta.ai',
  [normalizeTierLookupKey('Chat-Playground & API Schlüssel kostenlos: build.nvidia.com')]:
    'Free chat playground & API key: build.nvidia.com',
  [normalizeTierLookupKey(
    'Free, Go, Plus, Pro, Business, Enterprise | separat ab Pro API Guthaben über platform.openai.com'
  )]:
    'Free, Go, Plus, Pro, Business, Enterprise | separate API credits from Pro onward via platform.openai.com',
  [normalizeTierLookupKey(
    'Free, Plus, Premium, Super, Ultra, Business, Enterprise | API Guthaben separat über xAI Console'
  )]:
    'Free, Plus, Premium, Super, Ultra, Business, Enterprise | separate API credits via xAI Console',
  [normalizeTierLookupKey(
    'chat.qwen.ai kostenlos | separat API Guthaben über Alibaba Cloud Model Studio oder Qoder-Pläne, jedoch nicht für externe Apps wie JASP nutzbar'
  )]:
    'chat.qwen.ai free | separate API credits via Alibaba Cloud Model Studio or Qoder plans, though not usable for external apps like JASP',
  [normalizeTierLookupKey(
    'chat.deepseek.com kostenlos | separat API Guthaben über platform.deepseek.com'
  )]: 'chat.deepseek.com free | separate API credits via platform.deepseek.com',
  [normalizeTierLookupKey(
    'Free, Plus, Pro, Max, Ultra | separat API Guthaben über api.moonshot.ai'
  )]: 'Free, Plus, Pro, Max, Ultra | separate API credits via api.moonshot.ai',
  [normalizeTierLookupKey(
    'chat.z.ai kostenlos | separat API Guthaben über Z.ai Developer Portal für unterstützte Coding-Tools'
  )]:
    'chat.z.ai free | separate API credits via Z.ai Developer Portal for supported coding tools',
};

export function hasExactEnSubscriptionTiersTranslation(raw: string | undefined): boolean {
  if (!raw) return false;
  return Object.prototype.hasOwnProperty.call(
    EXACT_SUBSCRIPTION_TIERS_EN,
    normalizeTierLookupKey(raw)
  );
}

export function looksGermanSubscriptionTiers(raw: string | undefined): boolean {
  if (!raw) return false;
  return (
    /[äöüßÄÖÜ]/.test(raw) ||
    /\b(kostenlos\w*|gratis|separat|guthaben|schlüssel|schluessel|über|ueber|jedoch|nicht|nutzbar|externe|unterstützte|unterstuetzte|pläne|plaene|konto|oder|und|für|fuer|nur|monatlich|jährlich|inklusive)\b/i.test(
      raw
    )
  );
}

export function translateSubscriptionTiersToEn(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const exact = EXACT_SUBSCRIPTION_TIERS_EN[normalizeTierLookupKey(trimmed)];
  if (exact) return exact;

  return trimmed
    .split('|')
    .map((part) => {
      let s = part.trim();
      if (!s) return '';

      const exactPart = EXACT_SUBSCRIPTION_TIERS_EN[normalizeTierLookupKey(s)];
      if (exactPart) return exactPart;

      s = s
        .replace(
          /Chat-Playground\s*&\s*API[- ]?Schlüssel\s+kostenlos\s*:/gi,
          'Free chat playground & API key:'
        )
        .replace(/kostenloser\s+API[- ]?Schlüssel\s+für\b/gi, 'free API key for')
        .replace(/kostenlose[rn]?\s+API[- ]?Schlüssel\b/gi, 'free API key')
        .replace(/API[- ]?Schlüssel\s+kostenlos\b/gi, 'free API key')
        .replace(/API[- ]?Schlüssel\b/gi, 'API key')
        .replace(
          /\bseparat\s+ab\s+([^|;]+?)\s+API[- ]?Guthaben\s+über\b/gi,
          'separate API credits from $1 onward via'
        )
        .replace(/\bAPI[- ]?Guthaben\s+separat\s+über\b/gi, 'separate API credits via')
        .replace(/\bseparat\s+API[- ]?Guthaben\s+über\b/gi, 'separate API credits via')
        .replace(/\bAPI[- ]?Guthaben\b/gi, 'API credits')
        .replace(/\bCloud-Billing-Konto\b/gi, 'Cloud Billing account')
        .replace(/\bBilling-Konto\b/gi, 'billing account')
        .replace(
          /,?\s*jedoch\s+nicht\s+für\s+externe\s+Apps\s+wie\s+([^|;]+?)\s+nutzbar\b/gi,
          ', though not usable for external apps like $1'
        )
        .replace(/\bnicht\s+für\s+externe\s+Apps\s+wie\s+([^|;]+?)\s+nutzbar\b/gi, 'not usable for external apps like $1')
        .replace(/\bfür\s+unterstützte\s+Coding-Tools\b/gi, 'for supported coding tools')
        .replace(/\b([A-Za-z0-9]+)-Pläne\b/g, '$1 plans')
        .replace(/\bPläne\b/g, 'plans')
        .replace(/\bAbo-Stufen\b/gi, 'subscription tiers')
        .replace(/\bAbos\b/g, 'Plans')
        .replace(/\bmonatlich\b/gi, 'monthly')
        .replace(/\bjährlich\b/gi, 'yearly')
        .replace(/\binklusive\b/gi, 'including')
        .replace(/\binkl\./gi, 'incl.')
        .replace(/\bkostenlos\b/gi, 'free')
        .replace(/\bgratis\b/gi, 'free')
        .replace(/\bseparat\b/gi, 'separate')
        .replace(/\büber\b/gi, 'via')
        .replace(/\bjedoch\b/gi, 'though')
        .replace(/\bnutzbar\b/gi, 'usable')
        .replace(/\bexterne\b/gi, 'external')
        .replace(/\bunterstützte\b/gi, 'supported')
        .replace(/\boder\b/gi, 'or')
        .replace(/\bund\b/gi, 'and')
        .replace(/\bfür\b/gi, 'for')
        .replace(/\bnicht\b/gi, 'not')
        .replace(/\bnur\b/gi, 'only')
        .replace(/\bwie\b/gi, 'like')
        .replace(/\s{2,}/g, ' ')
        .trim();

      return s;
    })
    .filter(Boolean)
    .join(' | ');
}

export function resolveLabPricingSummary(
  lab: LabEntry,
  matchedModels: ModelRecord[],
  allConsumerPlans: LabPlanInfo[],
  hasTierRowPrices: boolean,
  lang: 'de' | 'en',
  translatedTiersEn?: string
): LabPricingSummary | null {
  const monitoredLab = matchMonitoredLabKey(lab.creator) || matchMonitoredLabKey(lab.id);
  const consumerPlans = monitoredLab
    ? allConsumerPlans.filter((p) => p.lab === monitoredLab)
    : [];

  const available = matchedModels.filter((m) => m.isAvailable);
  const pool = available.length > 0 ? available : matchedModels;

  const dailyAgentVal = (lab.dailyAgent || '').trim();
  const hasExplicitNoConsumerChat = dailyAgentVal === '–' || dailyAgentVal === '-';
  const hasConsumerFreeChatModel = pool.some(
    (m) => !m.isPaid && !isDeveloperPlaygroundOrRouterUrl(m.chatLink)
  );
  const hasAnyFreeModel = pool.some((m) => !m.isPaid);
  const hasPaidModel = pool.some((m) => m.isPaid);
  const hasFreeApi = pool.some((m) => m.isFreeApi);

  const rawSheetPrices: string[] = [];
  const seenPrices = new Set<string>();
  for (const m of pool) {
    const val = cleanSheetPriceValue(lang === 'de' ? m.priceDeMonthly : m.priceUsMonthly);
    if (val && !seenPrices.has(val.toLowerCase())) {
      seenPrices.add(val.toLowerCase());
      rawSheetPrices.push(val);
    }
  }

  const rawTiers = roundCurrencyTokensInText((lab.subscriptionTiers || '').trim());
  const hasTiers = Boolean(rawTiers && rawTiers !== '-' && rawTiers !== '–' && rawTiers.toLowerCase() !== 'n/a');
  const isPayPerToken = /^per\s+token\s+price$/i.test(rawTiers);
  const localizedRawTiers =
    lang === 'en' && hasTiers && !isPayPerToken
      ? roundCurrencyTokensInText((translatedTiersEn || '').trim()) || translateSubscriptionTiersToEn(rawTiers)
      : rawTiers;
  const displayTiersText = hasTiers
    ? isPayPerToken
      ? lang === 'de'
        ? 'Pay-per-Token (API)'
        : 'Per-token API pricing'
      : localizedRawTiers
    : '';

  const chatTierSegment = rawTiers.split('|')[0]?.trim() || '';
  const hasFreeTierInSheet = /\b(free|kostenlos|gratis)\b/i.test(chatTierSegment);
  const hasPaidTierInSheet =
    /\b(pro|plus|max|ultra|power|maximum|go|premium|super|team|business|enterprise|core|essential|advanced|expert|lite|standard|heavy|paid)\b/i.test(
      chatTierSegment
    );
  const isFreeOnlyTierInSheet = hasFreeTierInSheet && !hasPaidTierInSheet;

  const hasConsumerFree = consumerPlans.some((p) => p.tierKey === 'free');
  const hasConsumerPaid = consumerPlans.some((p) => p.tierKey !== 'free');

  const hasFreeChat =
    hasConsumerFree ||
    hasConsumerFreeChatModel ||
    hasFreeTierInSheet ||
    (!hasExplicitNoConsumerChat && hasAnyFreeModel && !pool.every((m) => isDeveloperPlaygroundOrRouterUrl(m.chatLink)));
  const hasPaid =
    hasConsumerPaid ||
    hasPaidModel ||
    (hasTiers && !isPayPerToken && !isFreeOnlyTierInSheet);

  const freeApiUrl =
    pool.find((m) => m.isFreeApi && m.apiLink?.startsWith('http'))?.apiLink ||
    matchedModels.find((m) => m.isFreeApi && m.apiLink?.startsWith('http'))?.apiLink;

  const accessBadges: LabAccessBadge[] = [];
  if (hasPaid && !hasFreeChat) {
    accessBadges.push({
      label: lang === 'de' ? 'nur als Abo' : 'Paid only',
      kind: 'paidOnly',
      title:
        lang === 'de'
          ? 'Kein kostenloser Chat-Tarif – Nutzung nur im bezahlten Abo'
          : 'No free chat tier – paid subscription required',
    });
  }

  const freeApiBadge: LabAccessBadge | undefined = hasFreeApi
    ? {
        label: lang === 'de' ? '🌐 Gratis API' : '🌐 Free API',
        kind: 'freeApi',
        href: freeApiUrl,
        title: freeApiUrl
          ? lang === 'de'
            ? 'Kostenloser API-Zugang verfügbar (z. B. für JASP oder Agenten) — API-Seite öffnen'
            : 'Free API access available (e.g. for JASP or agents) — Open API page'
          : lang === 'de'
          ? 'Kostenloser API-Zugang verfügbar (z. B. für JASP oder Agenten)'
          : 'Free API access available (e.g. for JASP or agents)',
      }
    : undefined;

  let primaryText = '';
  const secondaryText: string | undefined = undefined;
  const subPrefix = lang === 'de' ? 'Abos:' : 'Plans:';
  const formatLabeledTiers = (tiers: string): string => {
    if (isPayPerToken) return tiers;
    const firstPart = tiers.split('|')[0]?.trim() || '';
    const isSelfDescriptive =
      firstPart.includes(':') ||
      /^[\w.-]+\.[a-z]{2,}\b/i.test(firstPart) ||
      /\b(kostenlos|playground)\b/i.test(firstPart);
    return isSelfDescriptive ? tiers : `${subPrefix} ${tiers}`;
  };

  if (displayTiersText) {
    const labeledTiers = formatLabeledTiers(displayTiersText);
    primaryText =
      consumerPlans.length === 0 && !hasTierRowPrices && rawSheetPrices.length > 0
        ? `${labeledTiers} · ${rawSheetPrices.join(' · ')}`
        : labeledTiers;
  } else if (consumerPlans.length > 0) {
    const planNames = Array.from(
      new Set(
        consumerPlans.map((p) =>
          p.planName
            .replace(/^(ChatGPT|Claude|Google AI)\s+/i, '')
            .replace(/\s+\d+$/, '')
            .trim()
        )
      )
    );
    primaryText = `${subPrefix} ${planNames.join(' · ')}`;
  } else if (!hasTierRowPrices && rawSheetPrices.length > 0) {
    primaryText = rawSheetPrices.join(' · ');
  } else if (accessBadges.length === 0) {
    if (pool.length > 0 && hasPaidModel) {
      primaryText = lang === 'de' ? 'Nur API / Bezahlt' : 'API / Paid only';
    } else if (lab.weightsType === 'open') {
      primaryText = lang === 'de' ? 'Open Weights (Lokal / API)' : 'Open Weights (Local / API)';
    } else if (pool.length > 0) {
      primaryText = lang === 'de' ? 'Playground / API' : 'Playground / API';
    } else {
      return null;
    }
  }

  if (accessBadges.length === 0 && !primaryText) {
    return null;
  }

  return {
    accessBadges,
    freeApiBadge,
    hasFreeAccess: hasFreeChat || hasFreeApi,
    hasFreeApi,
    isPaidOnly: hasPaid && !hasFreeChat && !hasFreeApi,
    primaryText: roundCurrencyTokensInText(primaryText),
    secondaryText,
    consumerPlans,
    subscriptionTiers: displayTiersText || undefined,
    sheetModelPrices: rawSheetPrices,
  };
}
