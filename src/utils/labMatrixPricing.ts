import { LabEntry, ModelRecord } from '../types';
import { LabPlanInfo } from '../types/pricingMonitor';
import { matchMonitoredLabKey } from '../data/pricingPlansFallback';
import { roundCurrencyString, roundCurrencyTokensInText } from './priceFormat';

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
    .replace(/^(ChatGPT|Claude|Google AI)\s+/i, '')
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

export function resolveTierRowPrice(
  lab: LabEntry,
  tierKey: keyof LabEntry['parameterSizes'],
  modelVal: string,
  matchedModels: ModelRecord[],
  consumerPlans: LabPlanInfo[],
  lang: 'de' | 'en'
): TierRowPriceInfo | null {
  const monitoredLab = matchMonitoredLabKey(lab.creator) || matchMonitoredLabKey(lab.id);
  const pickPrice = (plan?: LabPlanInfo): string => {
    if (!plan) return '';
    const raw =
      (lang === 'de' ? plan.deMonthly : plan.usMonthly) ||
      (lang === 'de' ? plan.usMonthly : plan.deMonthly) ||
      '';
    const rounded = roundCurrencyString(raw);
    return isZeroPriceString(rounded) ? '' : rounded;
  };
  const zeroUnit = lang === 'de' ? '0€' : '$0';

  if (monitoredLab && consumerPlans.length > 0) {
    if (monitoredLab === 'OpenAI') {
      const go = consumerPlans.find((p) => /go/i.test(p.planName));
      const plus = consumerPlans.find((p) => /plus/i.test(p.planName));
      const pros = consumerPlans.filter((p) => /pro/i.test(p.planName));
      if (tierKey === 'small') return null;
      if (tierKey === 'medium') {
        const goPrice = pickPrice(go);
        return goPrice ? { price: formatPriceRange(zeroUnit, goPrice), planLabel: 'Go' } : null;
      }
      if (tierKey === 'large' || tierKey === 'massive' || tierKey === 'colossal' || tierKey === 'planetary') {
        const plusPrice = pickPrice(plus);
        if (plusPrice) return { price: plusPrice, planLabel: 'Plus' };
      }
      if (tierKey === 'singularity' || tierKey === 'godTier') {
        if (pros.length >= 2) {
          const firstP = pickPrice(pros[0]);
          const lastP = pickPrice(pros[pros.length - 1]);
          if (firstP && lastP) return { price: formatPriceRange(firstP, lastP), planLabel: 'Pro' };
        }
        const singleP = pickPrice(pros[0]);
        if (singleP) return { price: singleP, planLabel: 'Pro' };
      }
    } else if (monitoredLab === 'Anthropic') {
      const pro = consumerPlans.find((p) => /\bpro\b/i.test(p.planName));
      const max = consumerPlans.find((p) => /\bmax\b/i.test(p.planName));
      const ultra = consumerPlans.find((p) => /\bultra\b/i.test(p.planName));
      if (tierKey === 'small' || tierKey === 'medium' || tierKey === 'large') {
        return null;
      }
      if (tierKey === 'massive') {
        const proPrice = pickPrice(pro);
        return proPrice ? { price: formatPriceRange(zeroUnit, proPrice), planLabel: 'Pro' } : null;
      }
      if (tierKey === 'colossal' || tierKey === 'planetary') {
        const proPrice = pickPrice(pro);
        if (proPrice) return { price: proPrice, planLabel: 'Pro' };
      }
      if (tierKey === 'singularity' || tierKey === 'godTier') {
        const maxPrice = pickPrice(max);
        const ultraPrice = pickPrice(ultra);
        if (maxPrice && ultraPrice) {
          return { price: formatPriceRange(maxPrice, ultraPrice), planLabel: 'Max / Ultra' };
        }
        if (maxPrice) return { price: maxPrice, planLabel: 'Max' };
      }
    } else if (monitoredLab === 'Google') {
      const plus = consumerPlans.find((p) => /\bplus\b/i.test(p.planName));
      const pro = consumerPlans.find((p) => /\bpro\b/i.test(p.planName));
      const ultras = consumerPlans.filter((p) => /\bultra\b/i.test(p.planName));
      if (tierKey === 'small' || tierKey === 'medium' || tierKey === 'large' || tierKey === 'massive') {
        return null;
      }
      if (tierKey === 'colossal') {
        const plusPrice = pickPrice(plus);
        return plusPrice ? { price: formatPriceRange(zeroUnit, plusPrice), planLabel: 'Plus' } : null;
      }
      if (tierKey === 'planetary') {
        const proPrice = pickPrice(pro);
        if (proPrice) return { price: proPrice, planLabel: 'Pro' };
      }
      if (tierKey === 'singularity' || tierKey === 'godTier') {
        if (ultras.length >= 2) {
          const firstU = pickPrice(ultras[0]);
          const lastU = pickPrice(ultras[ultras.length - 1]);
          if (firstU && lastU) return { price: formatPriceRange(firstU, lastU), planLabel: 'Ultra' };
        }
        const ultraPrice = pickPrice(ultras[0]);
        if (ultraPrice) return { price: ultraPrice, planLabel: 'Ultra' };
      }
    } else if (monitoredLab === 'Meta') {
      if (lang === 'de') {
        return null;
      }
      const musePower = consumerPlans.find((p) => /muse power/i.test(p.planName));
      const museMax = consumerPlans.find((p) => /muse maximum/i.test(p.planName));
      const powerUs = roundCurrencyString(musePower?.usMonthly) || '$20';
      const maxUs = roundCurrencyString(museMax?.usMonthly) || '$100';
      if (tierKey === 'small' || tierKey === 'medium' || tierKey === 'large') {
        return null;
      }
      if (tierKey === 'massive' || tierKey === 'colossal' || tierKey === 'planetary') {
        if (!isZeroPriceString(powerUs)) {
          return { price: powerUs, planLabel: 'Muse Power' };
        }
        return null;
      }
      if (tierKey === 'singularity' || tierKey === 'godTier') {
        if (!isZeroPriceString(maxUs)) {
          return { price: maxUs, planLabel: 'Muse Maximum' };
        }
        return null;
      }
    }
  }

  // Fallback for all other labs (and unmapped tiers): match benchmark rows with price > 0
  const tokens = extractTierModelTokens(modelVal);
  if (tokens.length === 0 || matchedModels.length === 0) return null;

  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
  const priceHits: string[] = [];
  const seen = new Set<string>();

  const candidateModels = [...matchedModels].sort(
    (a, b) => Number(b.isAvailable) - Number(a.isAvailable)
  );

  for (const m of candidateModels) {
    const haystack = `${m.displayName} ${m.name}`.toLowerCase();
    const matched = sortedTokens.some((tok) => {
      if (tok.length <= 2) {
        const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
      }
      return haystack.includes(tok);
    });
    if (!matched) continue;

    const rawPrice = cleanSheetPriceValue(lang === 'de' ? m.priceDeMonthly : m.priceUsMonthly);
    if (rawPrice && !isZeroPriceString(rawPrice)) {
      const normKey = rawPrice.toLowerCase();
      if (!seen.has(normKey)) {
        seen.add(normKey);
        priceHits.push(rawPrice);
        if (priceHits.length >= 2) break;
      }
    }
  }

  if (priceHits.length === 0) return null;
  if (priceHits.length === 1) return { price: priceHits[0] };
  const b0 = extractPriceBounds(priceHits[0]);
  const b1 = extractPriceBounds(priceHits[1]);
  if (b0 && b1 && b0.currency && b0.currency === b1.currency) {
    return { price: formatPriceRange(priceHits[0], priceHits[1]) };
  }
  return { price: priceHits.join(' · ') };
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

export function resolveLabPricingSummary(
  lab: LabEntry,
  matchedModels: ModelRecord[],
  allConsumerPlans: LabPlanInfo[],
  hasTierRowPrices: boolean,
  lang: 'de' | 'en'
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
  const displayTiersText = hasTiers
    ? isPayPerToken
      ? lang === 'de'
        ? 'Pay-per-Token (API)'
        : 'Per-token API pricing'
      : rawTiers
    : '';

  const hasConsumerFree = consumerPlans.some((p) => p.tierKey === 'free');
  const hasConsumerPaid = consumerPlans.some((p) => p.tierKey !== 'free');

  const hasFreeChat =
    hasConsumerFree ||
    hasConsumerFreeChatModel ||
    (!hasExplicitNoConsumerChat && hasAnyFreeModel && !pool.every((m) => isDeveloperPlaygroundOrRouterUrl(m.chatLink)));
  const hasPaid = hasConsumerPaid || hasPaidModel || (hasTiers && !isPayPerToken);

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

  if (consumerPlans.length > 0) {
    if (monitoredLab === 'Meta') {
      primaryText =
        lang === 'de'
          ? `${subPrefix} Meta One · Muse (US)`
          : `${subPrefix} Meta One · Muse`;
    } else if (displayTiersText) {
      primaryText = isPayPerToken ? displayTiersText : `${subPrefix} ${displayTiersText}`;
    } else {
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
    }
  } else if (displayTiersText) {
    const labeledTiers = isPayPerToken ? displayTiersText : `${subPrefix} ${displayTiersText}`;
    primaryText =
      !hasTierRowPrices && rawSheetPrices.length > 0
        ? `${labeledTiers} · ${rawSheetPrices.join(' · ')}`
        : labeledTiers;
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
