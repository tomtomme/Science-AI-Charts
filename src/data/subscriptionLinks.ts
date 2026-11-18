import { LabEntry, ModelRecord } from '../types';
import { LabPlanInfo } from '../types/pricingMonitor';

/**
 * Resolves the official subscription / plan booking page URL for a lab, plan, or model.
 */
export function getSubscriptionBookingUrl(params: {
  labOrCompany?: string;
  modelName?: string;
  planText?: string;
  priceText?: string;
  lang?: 'de' | 'en';
  consumerPlans?: LabPlanInfo[];
}): string | undefined {
  const { labOrCompany = '', modelName = '', planText = '', lang = 'de', consumerPlans } = params;
  const combined = `${labOrCompany} ${modelName} ${planText}`.toLowerCase();

  // Check matching consumer plan sourceUrl first when it is a direct pricing/subscription page
  if (consumerPlans && consumerPlans.length > 0 && planText) {
    const cleanPlan = planText
      .replace(/[\d€$+\-–—]+/g, '')
      .trim()
      .toLowerCase();
    if (cleanPlan) {
      const hit = consumerPlans.find((p) => p.planName.toLowerCase().includes(cleanPlan));
      if (hit?.sourceUrl && /pricing|subscription|muse\.ai|meta\.ai/i.test(hit.sourceUrl)) {
        if (hit.lab === 'Google') {
          return lang === 'de'
            ? 'https://gemini.google/de/subscriptions/?hl=de'
            : 'https://gemini.google/us/subscriptions/?hl=en';
        }
        return hit.sourceUrl;
      }
    }
  }

  if (combined.includes('openai') || combined.includes('chatgpt') || /\bgpt[-\s]?\d/i.test(combined)) {
    return 'https://chatgpt.com/pricing';
  }
  if (combined.includes('anthropic') || combined.includes('claude')) {
    return 'https://claude.com/pricing';
  }
  if (combined.includes('google') || combined.includes('gemini')) {
    return lang === 'de'
      ? 'https://gemini.google/de/subscriptions/?hl=de'
      : 'https://gemini.google/us/subscriptions/?hl=en';
  }
  if (combined.includes('meta') || combined.includes('muse')) {
    if (combined.includes('wonder full')) {
      return 'https://dev.meta.ai/models/muse-wonder';
    }
    if (combined.includes('meta one') || combined.includes('meta ai')) {
      return 'https://www.meta.ai/';
    }
    return 'https://muse.ai/';
  }
  if (combined.includes('spacex') || combined.includes('xai') || combined.includes('grok')) {
    return 'https://grok.com/plans';
  }
  if (combined.includes('alibaba') || combined.includes('qwen')) {
    return 'https://chat.qwen.ai/';
  }
  if (combined.includes('moonshot') || combined.includes('kimi')) {
    return 'https://www.kimi.com/';
  }
  if (combined.includes('zhipu') || combined.includes('z ai') || combined.includes('z.ai') || /\bglm\b/.test(combined)) {
    return 'https://z.ai/';
  }
  if (combined.includes('deepseek')) {
    return 'https://platform.deepseek.com/';
  }
  if (combined.includes('mistral')) {
    return 'https://mistral.ai/pricing';
  }
  if (combined.includes('cohere')) {
    return 'https://cohere.com/pricing';
  }
  if (combined.includes('perplexity')) {
    return 'https://www.perplexity.ai/pro';
  }
  if (combined.includes('minimax')) {
    return 'https://platform.minimaxi.com/';
  }
  if (combined.includes('upstage') || combined.includes('solar')) {
    return 'https://console.upstage.ai/';
  }
  if (combined.includes('microsoft') || combined.includes('copilot')) {
    return 'https://copilot.microsoft.com/';
  }
  if (combined.includes('amazon') || combined.includes('nova')) {
    return 'https://nova.amazon.com/';
  }
  if (combined.includes('inception') || combined.includes('mercury')) {
    return 'https://www.inceptionlabs.ai/';
  }

  return undefined;
}

const RUMOR_OR_ARTICLE_URL_RE =
  /testingcatalog\.com|daily\.dev|reddit\.com|wikipedia\.org|x\.com\/|\/blog\/|luminabench\.com|kie\.ai/i;

function isDirectChatOrPlaygroundUrl(url?: string): boolean {
  if (!url || !url.startsWith('http')) return false;
  return !RUMOR_OR_ARTICLE_URL_RE.test(url);
}

/**
 * Fallback canonical chat/playground URL for known labs when Column P says "paid" or a tier model isn't in the benchmark table.
 */
export function getLabChatUrl(params: {
  labOrCompany?: string;
  engineName?: string;
  modelName?: string;
  tierKey?: string;
}): string | undefined {
  const combined = `${params.labOrCompany || ''} ${params.engineName || ''} ${params.modelName || ''}`.toLowerCase();

  if (combined.includes('openai') || combined.includes('chatgpt') || /\bgpt\b/i.test(combined)) {
    return 'https://chatgpt.com/';
  }
  if (combined.includes('anthropic') || combined.includes('claude')) {
    return 'https://claude.ai/';
  }
  if (combined.includes('google') || combined.includes('gemini')) {
    if ((params.modelName || '').toLowerCase().includes('gemma')) {
      return 'https://aistudio.google.com/prompts/new_chat';
    }
    if ((params.modelName || '').toLowerCase().includes('hydrogen')) {
      return 'https://aistudio.google.com/prompts/new_chat';
    }
    return 'https://gemini.google.com/app';
  }
  if (combined.includes('meta') || combined.includes('muse')) {
    if ((params.modelName || '').toLowerCase().includes('glimmer')) {
      return 'https://www.meta.ai/';
    }
    if ((params.modelName || '').toLowerCase().includes('wonder full')) {
      return 'https://dev.meta.ai/playground';
    }
    return 'https://muse.ai/';
  }
  if (combined.includes('nvidia') || combined.includes('nemotron')) {
    return 'https://build.nvidia.com/';
  }
  if (combined.includes('spacex') || combined.includes('xai') || combined.includes('grok')) {
    return 'https://grok.com/';
  }
  if (combined.includes('alibaba') || combined.includes('qwen')) {
    return 'https://chat.qwen.ai/';
  }
  if (combined.includes('deepseek')) {
    return 'https://chat.deepseek.com/';
  }
  if (combined.includes('moonshot') || combined.includes('kimi')) {
    return 'https://www.kimi.com/';
  }
  if (combined.includes('zhipu') || combined.includes('z ai') || combined.includes('z.ai') || /\bglm\b/.test(combined)) {
    return 'https://z.ai/chat';
  }
  if (combined.includes('amazon') || combined.includes('nova')) {
    return 'https://nova.amazon.com/chat';
  }
  if (combined.includes('inception') || combined.includes('mercury')) {
    return 'https://chat.inceptionlabs.ai/';
  }
  if (combined.includes('microsoft') || combined.includes('copilot') || /\bmai\b|\bphi\b/i.test(combined)) {
    return 'https://copilot.microsoft.com/';
  }
  if (combined.includes('reflection') || combined.includes('beam')) {
    return 'https://platform.reflection.ai/playground';
  }
  if (combined.includes('thinking') || combined.includes('inkling')) {
    return 'https://tinker.thinkingmachines.ai/playground';
  }
  if (combined.includes('cohere') || combined.includes('command')) {
    return 'https://dashboard.cohere.com/playground/chat';
  }
  if (combined.includes('ant group') || combined.includes('inclusion') || /\bling\b/.test(combined)) {
    return 'https://chat.ant-ling.com/chat';
  }
  if (combined.includes('baidu') || combined.includes('ernie')) {
    return 'https://wenxin.baidu.com/';
  }
  if (combined.includes('meituan') || combined.includes('longcat')) {
    return 'https://longcat.ai/chat/';
  }
  if (combined.includes('minimax')) {
    return 'https://agent.minimax.io/';
  }
  if (combined.includes('stepfun')) {
    return 'https://build.nvidia.com/stepfun-ai/step-5-preview/playground';
  }
  if (combined.includes('tencent') || combined.includes('hunyuan')) {
    return 'https://openrouter.ai/chat?models=tencent/hy4';
  }
  if (combined.includes('xiaomi') || combined.includes('mimo')) {
    return 'https://openrouter.ai/chat?models=xiaomi/mimo-v2.6-pro-ultraspeed';
  }
  if (combined.includes('mistral')) {
    return 'https://chat.mistral.ai/';
  }
  if (combined.includes('upstage') || combined.includes('solar')) {
    return 'https://studio.upstage.ai/chat/';
  }
  if (combined.includes('motif')) {
    return 'https://chat.motiftech.io/chat';
  }
  if (combined.includes('perplexity')) {
    return 'https://www.perplexity.ai/';
  }
  if (combined.includes('hugging face') || combined.includes('smollm')) {
    return 'https://huggingface.co/chat/';
  }
  return undefined;
}

function extractModelMatchTokens(modelVal: string): string[] {
  const withoutParens = modelVal.replace(/[()]/g, ' ');
  return withoutParens
    .split(/[,/&+;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 2 && s !== '-' && s !== 'llm');
}

/**
 * Resolves the best Chat URL for a model row in the Ecosystem ("Ökosystem") tab:
 * 1. Prioritizes live Column P (`chatLink`) from a matched Benchmark model row
 * 2. Falls back to another available model's Column P `chatLink` for the same lab if Col P was "paid"
 * 3. Falls back to canonical lab chat URL (`getLabChatUrl`)
 */
export function resolveLabTierChatUrl(params: {
  lab: LabEntry;
  tierKey: keyof LabEntry['parameterSizes'];
  modelVal: string;
  matchedModels: ModelRecord[];
}): string | undefined {
  const { lab, tierKey, modelVal, matchedModels } = params;
  const cleanVal = (modelVal || '').trim();
  const lowVal = cleanVal.toLowerCase();

  if (
    !cleanVal ||
    cleanVal === '-' ||
    cleanVal === '–' ||
    lowVal.includes('incoming') ||
    lowVal.includes('noname')
  ) {
    return undefined;
  }

  const tokens = extractModelMatchTokens(cleanVal).sort((a, b) => b.length - a.length);

  // Score candidate models for how well they match this tier's model name(s)
  if (matchedModels.length > 0 && tokens.length > 0) {
    const labLow = (lab.creator || '').toLowerCase();
    const isVendorSpecificDomainMismatch = (url?: string): boolean => {
      if (!url) return false;
      // Avoid routing current OpenAI tier rows (e.g. Sol) to a legacy Microsoft Copilot GPT-5.6 URL
      if (labLow.includes('openai') && /copilot\.cloud\.microsoft/i.test(url)) return true;
      return false;
    };

    const scoredCandidates = matchedModels
      .map((m, idx) => {
        const haystack = `${m.displayName} ${m.name}`.toLowerCase();
        let matchScore = 0;
        for (const tok of tokens) {
          if (tok.length <= 2) {
            const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`\\b${escaped}\\b`, 'i').test(haystack)) {
              matchScore += tok.length * 3;
            }
          } else if (haystack.includes(tok)) {
            matchScore += tok.length * 3;
          }
        }
        if (matchScore === 0) return null;
        const hasDirectChat =
          isDirectChatOrPlaygroundUrl(m.chatLink) && !isVendorSpecificDomainMismatch(m.chatLink);
        const recencyBonus = m.hasConcreteReleaseDate ? 30 : 0;
        const orderBonus = Math.max(0, 20 - idx);
        const rankBonus =
          (m.isAvailable ? 100 : 0) +
          recencyBonus +
          orderBonus +
          (hasDirectChat ? 25 : 0);
        return { model: m, hasDirectChat, total: matchScore + rankBonus };
      })
      .filter((x): x is { model: ModelRecord; hasDirectChat: boolean; total: number } => x !== null)
      .sort((a, b) => b.total - a.total);

    const bestMatch = scoredCandidates[0];
    if (bestMatch) {
      if (bestMatch.hasDirectChat && bestMatch.model.chatLink) {
        return bestMatch.model.chatLink;
      }

      // Matched a current/paid model without a direct Col P chat URL -> prefer canonical lab chat first
      const canonical = getLabChatUrl({
        labOrCompany: lab.creator,
        engineName: lab.engineName,
        modelName: cleanVal,
        tierKey,
      });
      if (canonical) return canonical;

      const directHit = scoredCandidates.find((c) => c.hasDirectChat);
      if (directHit?.model.chatLink) {
        return directHit.model.chatLink;
      }

      const siblingChat = matchedModels.find(
        (m) =>
          m.isAvailable &&
          isDirectChatOrPlaygroundUrl(m.chatLink) &&
          !isVendorSpecificDomainMismatch(m.chatLink)
      )?.chatLink;
      if (siblingChat) return siblingChat;

      if (bestMatch.model.apiLink && isDirectChatOrPlaygroundUrl(bestMatch.model.apiLink)) {
        return bestMatch.model.apiLink;
      }
    }
  }

  // 3. No direct model-name match in Benchmark CSV: check canonical lab chat URL or lab-wide Col P chatLink
  const canonical = getLabChatUrl({
    labOrCompany: lab.creator,
    engineName: lab.engineName,
    modelName: cleanVal,
    tierKey,
  });
  if (canonical) return canonical;

  const availableLabChat = matchedModels.find(
    (m) => m.isAvailable && isDirectChatOrPlaygroundUrl(m.chatLink)
  )?.chatLink;
  if (availableLabChat) return availableLabChat;

  return undefined;
}
