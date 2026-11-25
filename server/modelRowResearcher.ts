import { GoogleGenAI, Type } from '@google/genai';
import type {
  AaLeaderboardModel,
  ModelResearchRequest,
  NewModelRowDraft,
  ResearchedBenchmarkCell,
} from '../src/types/aaMonitor.ts';
import { getCompanyMeta } from '../src/data/companies.ts';
import { DEFAULT_LAB_PLANS } from '../src/data/pricingPlansFallback.ts';
import { fetchLiveAaLeaderboard, getAaMonitorStatus } from './aaMonitor.ts';
import { getGdpxMonitorStatus } from './gdpxMonitor.ts';
import { getValsMonitorStatus } from './valsMonitor.ts';
import { getSimpleBenchMonitorStatus } from './simpleBenchMonitor.ts';
import { getIntegrityMonitorStatus } from './integrityMonitor.ts';
import { getPricingMonitorStatus } from './pricingMonitor.ts';

function normalizeCompact(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\bchatgpt[-\s]*/g, 'gpt ')
    .replace(/\bdeepseek\s+v(?=\d)/g, 'deepseek ')
    .replace(/\bqwen(?=\d)/g, 'qwen ')
    .replace(/\bminimax[-\s]*/g, 'minimax ')
    .replace(/\b(\d+)\.0\b/g, '$1')
    .replace(/[^a-z0-9]/g, '');
}

function findBestNamedMatch<T>(
  items: T[],
  targetName: string,
  getName: (item: T) => string,
  getScoreRank?: (item: T) => number
): T | null {
  const needle = normalizeCompact(targetName);
  if (!needle || needle.length < 3) return null;

  const exactMatches: T[] = [];
  const prefixMatches: T[] = [];

  for (const item of items) {
    const cand = normalizeCompact(getName(item));
    if (!cand) continue;
    if (cand === needle) {
      exactMatches.push(item);
    } else if (
      needle.length >= 6 &&
      cand.length >= 6 &&
      ((cand.startsWith(needle) && /^\d{4}$/.test(cand.slice(needle.length))) ||
        (needle.startsWith(cand) && /^\d{4}$/.test(needle.slice(cand.length))))
    ) {
      prefixMatches.push(item);
    }
  }

  const pool = exactMatches.length > 0 ? exactMatches : prefixMatches;
  if (pool.length === 0) return null;
  if (pool.length === 1 || !getScoreRank) return pool[0];
  return [...pool].sort((a, b) => getScoreRank(b) - getScoreRank(a))[0];
}

function sanitizeHttpUrl(raw: unknown): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\/[^\s]+$/i.test(s)) return s;
  return '';
}

function sanitizeChatLink(raw: unknown, isPaidOnly: boolean): string {
  const s = String(raw || '').trim();
  if (s.toLowerCase() === 'paid') return 'paid';
  const url = sanitizeHttpUrl(s);
  if (url) return url;
  return isPaidOnly ? 'paid' : '';
}

function sanitizeIsoDate(raw: unknown, fallback: string): string {
  const s = String(raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  return fallback;
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = (raw || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function cleanCanonicalModelName(rawName: string): string {
  return (rawName || '')
    .replace(/\s*\((?:max|xhigh|high|medium|med|low|default fallback|non-reasoning)[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function defaultDisplayNameColB(canonicalName: string, companyName: string): string {
  if (
    companyName.toLowerCase() === 'openai' &&
    /^gpt[-\s]/i.test(canonicalName) &&
    !/^chatgpt/i.test(canonicalName)
  ) {
    return canonicalName.replace(/^gpt/i, 'ChatGPT');
  }
  return canonicalName;
}

function makeBenchCell(
  value: number | null | undefined,
  isOfficial: boolean,
  source?: string
): ResearchedBenchmarkCell {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { value: null, isOfficial: false };
  }
  return {
    value: Math.round(value * 100) / 100,
    isOfficial,
    ...(source ? { source } : {}),
  };
}

interface GeminiResearchPayload {
  canonicalName?: string;
  displayNameColB?: string;
  companyName?: string;
  countryFlag?: string;
  releaseDate?: string;
  isPaidOnly?: boolean;
  hasFreeApi?: boolean;
  isOpenWeights?: boolean;
  storyline?: string;
  chatLink?: string;
  apiLink?: string;
  priceDeMonthly?: string;
  priceUsMonthly?: string;
}

export async function researchNewModelRowDraft(
  req: ModelResearchRequest
): Promise<NewModelRowDraft> {
  const rawModelName = String(req.modelName || '').trim();
  if (!rawModelName) {
    throw new Error('Model name is required for row research.');
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  // Stage 1: Deterministic cross-monitor aggregation across AA, GDPx, Vals, SimpleBench, Integrity & Pricing
  const [aaStatus, gdpxStatus, valsStatus, sbStatus, intStatus, pricingStatus] =
    await Promise.all([
      getAaMonitorStatus().catch(() => null),
      getGdpxMonitorStatus().catch(() => null),
      getValsMonitorStatus().catch(() => null),
      getSimpleBenchMonitorStatus().catch(() => null),
      getIntegrityMonitorStatus().catch(() => null),
      getPricingMonitorStatus().catch(() => null),
    ]);

  let aaModels: AaLeaderboardModel[] = aaStatus?.report?.models ?? [];
  if (aaModels.length === 0) {
    try {
      const liveAa = await fetchLiveAaLeaderboard([]);
      aaModels = liveAa.models;
    } catch {
      aaModels = [];
    }
  }

  const aaMatch =
    (req.sourceMonitor === 'aa'
      ? aaModels.find((m) => m.id === req.sourceId)
      : null) ??
    findBestNamedMatch(
      aaModels,
      rawModelName,
      (m) => m.releaseName || m.name,
      (m) => m.scores.iq ?? -1
    );

  const gdpxMatch =
    (req.sourceMonitor === 'gdpx'
      ? gdpxStatus?.report?.models.find((m) => m.id === req.sourceId)
      : null) ??
    findBestNamedMatch(gdpxStatus?.report?.models ?? [], rawModelName, (m) => m.name, (m) => m.score);

  const valsMatch =
    (req.sourceMonitor === 'vals'
      ? valsStatus?.report?.models.find((m) => m.id === req.sourceId)
      : null) ??
    findBestNamedMatch(valsStatus?.report?.models ?? [], rawModelName, (m) => m.name, (m) => m.score);

  const sbMatch =
    (req.sourceMonitor === 'simpleBench'
      ? sbStatus?.report?.models.find((m) => m.id === req.sourceId)
      : null) ??
    findBestNamedMatch(
      sbStatus?.report?.models ?? [],
      rawModelName,
      (m) => m.name,
      (m) => m.score
    );

  const intMatch =
    (req.sourceMonitor === 'integrity'
      ? intStatus?.report?.models.find((m) => m.id === req.sourceId)
      : null) ??
    findBestNamedMatch(
      intStatus?.report?.models ?? [],
      rawModelName,
      (m) => m.name,
      (m) => m.score
    );

  const known = req.knownScores ?? {};

  const benchmarks: NewModelRowDraft['benchmarks'] = {
    iq: makeBenchCell(
      aaMatch?.scores.iq ?? known.iq,
      aaMatch?.scores.iq != null || known.iq != null,
      aaMatch?.scores.iq != null ? 'Artificial Analysis' : undefined
    ),
    nonHallucination: makeBenchCell(
      aaMatch?.scores.nonHallucination ?? known.nonHallucination,
      aaMatch?.scores.nonHallucination != null || known.nonHallucination != null,
      aaMatch?.scores.nonHallucination != null ? 'Artificial Analysis' : undefined
    ),
    accuracy: makeBenchCell(
      aaMatch?.scores.accuracy ?? known.accuracy,
      aaMatch?.scores.accuracy != null || known.accuracy != null,
      aaMatch?.scores.accuracy != null ? 'Artificial Analysis' : undefined
    ),
    mmmuPro: makeBenchCell(
      aaMatch?.scores.mmmuPro ?? known.mmmuPro,
      aaMatch?.scores.mmmuPro != null || known.mmmuPro != null,
      aaMatch?.scores.mmmuPro != null ? 'Artificial Analysis' : undefined
    ),
    mlcr: makeBenchCell(
      aaMatch?.scores.mlcr ?? known.mlcr,
      aaMatch?.scores.mlcr != null || known.mlcr != null,
      aaMatch?.scores.mlcr != null ? 'Artificial Analysis' : undefined
    ),
    excelAgent: makeBenchCell(
      aaMatch?.scores.excelAgent ?? known.excelAgent,
      aaMatch?.scores.excelAgent != null || known.excelAgent != null,
      aaMatch?.scores.excelAgent != null ? 'Artificial Analysis' : undefined
    ),
    gdpx: makeBenchCell(
      gdpxMatch?.score ?? known.gdpx,
      gdpxMatch?.score != null || known.gdpx != null,
      gdpxMatch ? 'GDPx' : undefined
    ),
    vals: makeBenchCell(
      valsMatch?.score ?? known.vals,
      valsMatch?.score != null || known.vals != null,
      valsMatch ? 'Vals Index v2.2' : undefined
    ),
    simpleBench: makeBenchCell(
      sbMatch?.score ?? known.simpleBench,
      sbMatch?.score != null || known.simpleBench != null,
      sbMatch ? 'SimpleBench' : undefined
    ),
    integrity: makeBenchCell(
      intMatch?.score ?? known.integrity,
      intMatch?.score != null || known.integrity != null,
      intMatch ? 'Integrity-Bench' : undefined
    ),
  };

  const baseCanonical = cleanCanonicalModelName(aaMatch?.releaseName || rawModelName);
  const rawCreator =
    req.creatorHint ||
    aaMatch?.creator ||
    gdpxMatch?.lab ||
    valsMatch?.company ||
    sbMatch?.organization ||
    '';

  const existingCompanies = Array.isArray(req.existingCompanies) ? req.existingCompanies : [];
  const matchedExistingCompany = existingCompanies.find((c) => {
    const a = c.name.toLowerCase();
    const b = rawCreator.toLowerCase();
    return Boolean(b) && (a === b || a.includes(b) || b.includes(a));
  });
  const fallbackCompanyMeta = getCompanyMeta(rawCreator || baseCanonical);

  const baseCompanyName = matchedExistingCompany?.name || rawCreator || fallbackCompanyMeta.name;
  const baseFlag = matchedExistingCompany?.flag || fallbackCompanyMeta.flag || '🌐';
  const baseOpenWeights = Boolean(
    req.isOpenWeightsHint ?? aaMatch?.isOpenWeights ?? gdpxMatch?.openWeights ?? false
  );
  const baseReleaseDate = sanitizeIsoDate(
    req.releaseDateHint || sbMatch?.dateAdded || '',
    todayIso
  );

  // Pull lab consumer pricing summary as context for Gemini (live report or fallback defaults)
  const allLabPlans =
    pricingStatus?.report?.labs && pricingStatus.report.labs.length > 0
      ? pricingStatus.report.labs
      : DEFAULT_LAB_PLANS;
  const matchingLabPlans = allLabPlans.filter((plan) => {
    const a = plan.lab.toLowerCase();
    const b = baseCompanyName.toLowerCase();
    return Boolean(b) && (a === b || a.includes(b) || b.includes(a));
  });

  // Stage 2: Gemini Research (Tier 2a Grounded -> Tier 2b Free-tier JSON -> Tier 2c Deterministic)
  let researchTier: NewModelRowDraft['researchTier'] = 'deterministic';
  let researchNote: string | undefined;
  let sources: Array<{ title: string; uri: string }> = [];
  let aiResult: GeminiResearchPayload | null = null;

  const ai = getGeminiClient();
  if (ai) {
    const knownCompanyNames = existingCompanies
      .map((c) => `${c.name} (${c.flag})`)
      .slice(0, 35)
      .join(', ');

    const contextLines = [
      `Model to research: "${baseCanonical}" (raw source name: "${rawModelName}")`,
      `Creator hint: "${baseCompanyName}"`,
      `Open weights: ${baseOpenWeights ? 'yes' : 'no'}`,
      aaMatch?.contextWindowTokens ? `Context window: ${aaMatch.contextWindowTokens} tokens` : '',
      aaMatch?.price1mInputTokens != null
        ? `API price: $${aaMatch.price1mInputTokens}/1M input, $${aaMatch.price1mOutputTokens ?? '?'}/1M output`
        : '',
      matchingLabPlans.length > 0
        ? `Known lab browser plans for ${matchingLabPlans[0].lab}: ${matchingLabPlans
            .map((p) => `${p.planName} (DE: ${p.deMonthly || '-'}, US: ${p.usMonthly || '-'})`)
            .join('; ')}`
        : '',
      knownCompanyNames
        ? `Existing company names in Sheet (prefer exact match if same lab): ${knownCompanyNames}`
        : '',
      `Today's date: ${todayIso}`,
    ]
      .filter(Boolean)
      .join('\n');

    const promptText = `You are helping populate a new row in the "Science-IQ of ChatBots" Google Sheet.
IMPORTANT: Keep the exact model name and version "${baseCanonical}" intact — NEVER rename or downgrade the version number even if this is a brand-new release.
Research this AI model carefully and return ONLY a single valid JSON object (no markdown prose outside JSON) with these exact fields:
{
  "canonicalName": "${baseCanonical}",
  "displayNameColB": "Display name without flag or badges for Column B (for OpenAI GPT consumer models use 'ChatGPT-...', otherwise exact same as canonicalName)",
  "companyName": "Exact company/lab name matching the Sheet's existing company list if possible",
  "countryFlag": "2-letter country flag emoji of the lab headquarters (e.g. 🇺🇸, 🇨🇳, 🇫🇷, 🇩🇪, 🇬🇧, 🇯🇵, 🇰🇷)",
  "releaseDate": "Official release date in YYYY-MM-DD format (if only month is known use YYYY-MM-01)",
  "isPaidOnly": false,
  "hasFreeApi": false,
  "isOpenWeights": ${baseOpenWeights},
  "storyline": "Concise, neutral English 1-sentence highlight (max 110 characters) describing what is notable about this model (e.g. architecture, open weights, multimodal/agentic strength, or positioning).",
  "chatLink": "Official browser chat/playground URL (https://...) OR literally 'paid' if web chat is strictly paid-only with no free chat tier, OR '' if API/weights only",
  "apiLink": "Official API docs, playground, HuggingFace, OpenRouter, or NVIDIA NIM URL (https://...) where developers can access or inspect this model",
  "priceDeMonthly": "Monthly browser chat subscription cost in Germany (e.g. '23€', '0-8€', '90-180€') or '' if free/API-only/no consumer subscription",
  "priceUsMonthly": "Monthly browser chat subscription cost in USA (e.g. '$20', '$0-8', '$100-200') or '' if free/API-only/no consumer subscription"
}

Context:
${contextLines}`;

    // Tier 2a: Gemini 4 Hydrogen + Google Search Grounding
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptText,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      const parsed = extractJsonObject(response.text || '');
      if (parsed) {
        aiResult = parsed as GeminiResearchPayload;
        researchTier = 'gemini_grounded';
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        const seenUris = new Set<string>();
        for (const ch of chunks) {
          const uri = ch?.web?.uri;
          const title = ch?.web?.title || uri;
          if (uri && /^https?:\/\//i.test(uri) && !seenUris.has(uri)) {
            seenUris.add(uri);
            sources.push({ title: String(title || uri), uri });
            if (sources.length >= 6) break;
          }
        }
      }
    } catch (groundedErr) {
      const rawMsg = groundedErr instanceof Error ? groundedErr.message : String(groundedErr);
      const isQuota = /429|RESOURCE_EXHAUSTED|quota/i.test(rawMsg);
      const isUnavailable = /503|UNAVAILABLE|high demand|overloaded/i.test(rawMsg);
      const shortReason = isQuota
        ? 'API-Kontingent (429)'
        : isUnavailable
        ? 'hohe Auslastung (503)'
        : 'nicht verfügbar';

      // Tier 2b: Free-tier Gemini WITHOUT Search Grounding (gemini-4-hydrogen -> gemini-3.1-flash-lite)
      for (const fallbackModel of ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const) {
        try {
          const fallbackRes = await ai.models.generateContent({
            model: fallbackModel,
            contents: promptText,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  canonicalName: { type: Type.STRING },
                  displayNameColB: { type: Type.STRING },
                  companyName: { type: Type.STRING },
                  countryFlag: { type: Type.STRING },
                  releaseDate: { type: Type.STRING },
                  isPaidOnly: { type: Type.BOOLEAN },
                  hasFreeApi: { type: Type.BOOLEAN },
                  isOpenWeights: { type: Type.BOOLEAN },
                  storyline: { type: Type.STRING },
                  chatLink: { type: Type.STRING },
                  apiLink: { type: Type.STRING },
                  priceDeMonthly: { type: Type.STRING },
                  priceUsMonthly: { type: Type.STRING },
                },
              },
            },
          });
          const parsed = extractJsonObject(fallbackRes.text || '');
          if (parsed) {
            aiResult = parsed as GeminiResearchPayload;
            researchTier = 'gemini_free';
            researchNote = `Search Grounding übersprungen (${shortReason}) – Free-Tier-LLM ohne Websuche genutzt.`;
            break;
          }
        } catch {
          // Try next fallback model
        }
      }

      if (!aiResult) {
        researchNote = `Gemini momentan nicht erreichbar (${shortReason}) – alle Live-Benchmarks & bekannte Lab-Metadaten automatisch aggregiert.`;
      }
    }
  } else {
    researchNote =
      'Kein Gemini-API-Key aktiv – Entwurf rein aus Live-Benchmarks & bekannten Lab-Metadaten erstellt.';
  }

  // Deterministic lab defaults (used whenever LLM omits a field or is in fallback mode)
  const LAB_DEFAULTS: Array<{
    match: RegExp;
    chatLink: string;
    apiLink: string;
    hasFreeApi?: boolean;
  }> = [
    { match: /openai/i, chatLink: 'https://chatgpt.com', apiLink: 'https://platform.openai.com' },
    { match: /anthropic/i, chatLink: 'https://claude.ai', apiLink: 'https://console.anthropic.com' },
    { match: /google/i, chatLink: 'https://gemini.google.com', apiLink: 'https://aistudio.google.com', hasFreeApi: true },
    { match: /xai|x\.ai/i, chatLink: 'https://grok.com', apiLink: 'https://console.x.ai' },
    { match: /deepseek/i, chatLink: 'https://chat.deepseek.com', apiLink: 'https://platform.deepseek.com' },
    { match: /alibaba|qwen/i, chatLink: 'https://chat.qwen.ai', apiLink: 'https://dashscope.console.aliyun.com' },
    { match: /moonshot|kimi/i, chatLink: 'https://www.kimi.com', apiLink: 'https://platform.moonshot.ai' },
    { match: /zhipu|z\.ai|glm/i, chatLink: 'https://chat.z.ai', apiLink: 'https://open.bigmodel.cn' },
    { match: /mistral/i, chatLink: 'https://chat.mistral.ai', apiLink: 'https://console.mistral.ai', hasFreeApi: true },
    { match: /minimax/i, chatLink: 'https://chat.minimax.io', apiLink: 'https://platform.minimax.io' },
    { match: /xiaomi|mimo/i, chatLink: 'https://aistudio.xiaomimimo.com', apiLink: 'https://aistudio.xiaomimimo.com' },
    { match: /stepfun/i, chatLink: 'https://stepfun.ai', apiLink: 'https://platform.stepfun.com' },
    { match: /meta/i, chatLink: 'https://www.meta.ai', apiLink: 'https://llama.developer.meta.com' },
    { match: /cohere/i, chatLink: 'https://coral.cohere.com', apiLink: 'https://dashboard.cohere.com' },
    { match: /bytedance|doubao|seed/i, chatLink: 'https://www.doubao.com', apiLink: 'https://console.volcengine.com' },
    { match: /tencent|hunyuan/i, chatLink: 'https://yuanbao.tencent.com', apiLink: 'https://cloud.tencent.com' },
    { match: /baidu|ernie/i, chatLink: 'https://yiyan.baidu.com', apiLink: 'https://qianfan.cloud.baidu.com' },
    { match: /nvidia/i, chatLink: 'https://build.nvidia.com', apiLink: 'https://build.nvidia.com', hasFreeApi: true },
    { match: /perplexity/i, chatLink: 'https://www.perplexity.ai', apiLink: 'https://docs.perplexity.ai' },
    { match: /inception|mercury/i, chatLink: 'https://chat.inceptionlabs.ai', apiLink: 'https://platform.inceptionlabs.ai' },
  ];

  // Always keep the authoritative leaderboard model name/version so an offline LLM never downgrades it
  const finalCanonical = baseCanonical;
  const finalCompany = String(aiResult?.companyName || baseCompanyName).trim() || baseCompanyName;
  const matchedLabDefaults = LAB_DEFAULTS.find(
    (d) => d.match.test(finalCompany) || d.match.test(finalCanonical)
  );

  // Pull sensible default DE/US price from known lab plans if LLM didn't return one
  const stdPlan =
    matchingLabPlans.find((p) => p.tierKey === 'standard') ||
    matchingLabPlans.find((p) => p.tierKey === 'pro') ||
    matchingLabPlans[0];
  const defaultPriceDe = stdPlan?.deMonthly || '';
  const defaultPriceUs = stdPlan?.usMonthly || '';

  const finalDisplayColB = defaultDisplayNameColB(finalCanonical, finalCompany);
  const finalFlag =
    String(aiResult?.countryFlag || '').trim() ||
    matchedExistingCompany?.flag ||
    getCompanyMeta(finalCompany).flag ||
    baseFlag;
  const finalReleaseDate = sanitizeIsoDate(aiResult?.releaseDate, baseReleaseDate);
  const finalIsPaidOnly = Boolean(aiResult?.isPaidOnly ?? false);
  const finalHasFreeApi = Boolean(aiResult?.hasFreeApi ?? matchedLabDefaults?.hasFreeApi ?? false);
  const finalIsOpenWeights = Boolean(aiResult?.isOpenWeights ?? baseOpenWeights);

  const deterministicStorylineParts: string[] = [];
  if (finalIsOpenWeights) deterministicStorylineParts.push('Open-weights');
  if (aaMatch?.isReasoning) deterministicStorylineParts.push('reasoning');
  const ctxK =
    aaMatch?.contextWindowTokens && aaMatch.contextWindowTokens >= 1000
      ? aaMatch.contextWindowTokens >= 1_000_000
        ? `${Math.round(aaMatch.contextWindowTokens / 100_000) / 10}M context`
        : `${Math.round(aaMatch.contextWindowTokens / 1000)}k context`
      : '';
  const fallbackStoryline = `${
    deterministicStorylineParts.length > 0
      ? `${deterministicStorylineParts.join(' ')} model`
      : 'Model'
  } by ${finalCompany}${ctxK ? ` (${ctxK})` : ''}`.replace(/^./, (c) => c.toUpperCase());

  const finalStoryline = (
    String(aiResult?.storyline || '')
      .replace(/\s+/g, ' ')
      .trim() || fallbackStoryline
  ).slice(0, 180);

  const finalChatLink =
    sanitizeChatLink(aiResult?.chatLink, finalIsPaidOnly) ||
    matchedLabDefaults?.chatLink ||
    '';
  const finalApiLink =
    sanitizeHttpUrl(aiResult?.apiLink) ||
    matchedLabDefaults?.apiLink ||
    '';
  const finalPriceDe = (String(aiResult?.priceDeMonthly || '').trim() || defaultPriceDe).slice(0, 30);
  const finalPriceUs = (String(aiResult?.priceUsMonthly || '').trim() || defaultPriceUs).slice(0, 30);

  return {
    sourceMonitor: req.sourceMonitor,
    sourceId: req.sourceId,
    sourceName: rawModelName,
    canonicalName: finalCanonical,
    displayNameColB: finalDisplayColB,
    companyName: finalCompany,
    countryFlag: finalFlag,
    releaseDate: finalReleaseDate,
    isPaidOnly: finalIsPaidOnly,
    hasFreeApi: finalHasFreeApi,
    isOpenWeights: finalIsOpenWeights,
    storyline: finalStoryline,
    chatLink: finalChatLink,
    apiLink: finalApiLink,
    priceDeMonthly: finalPriceDe,
    priceUsMonthly: finalPriceUs,
    benchmarks,
    researchTier,
    ...(researchNote ? { researchNote } : {}),
    sources,
  };
}
