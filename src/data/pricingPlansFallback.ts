import { LabPlanInfo, MonitoredLab } from '../types/pricingMonitor';

export const DEFAULT_PRICING_SNAPSHOT_DATE = "2026-11-23T08:55:21.604Z";

export const DEFAULT_LAB_PLANS: LabPlanInfo[] = [
  {
    "lab": "OpenAI",
    "planName": "ChatGPT Go",
    "tierKey": "free",
    "usMonthly": "$8",
    "deMonthly": "8€",
    "billingNotes": "10x message/upload limits, GPT-5.2 Instant",
    "sourceUrl": "https://openai.com/index/introducing-chatgpt-go/"
  },
  {
    "lab": "OpenAI",
    "planName": "ChatGPT Plus",
    "tierKey": "pro",
    "usMonthly": "$20",
    "deMonthly": "23€",
    "billingNotes": "GPT-6 Astra, advanced reasoning, 5-hour limit",
    "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
  },
  {
    "lab": "OpenAI",
    "planName": "ChatGPT Pro",
    "tierKey": "ultra",
    "usMonthly": "$100-500",
    "deMonthly": "103-510€",
    "billingNotes": "GPT-6 Pro, max memory/context, pro-only models",
    "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
  },
  {
    "lab": "Anthropic",
    "planName": "Claude Pro",
    "tierKey": "pro",
    "usMonthly": "$17-20",
    "deMonthly": "15-18€",
    "billingNotes": "Opus 5.5, Claude Code, priority access",
    "sourceUrl": "https://claude.com/pricing"
  },
  {
    "lab": "Anthropic",
    "planName": "Claude Max/Ultra",
    "tierKey": "ultra",
    "usMonthly": "$100-200",
    "deMonthly": "90-180€",
    "billingNotes": "Fable 5.2, 5x-10x Pro limits, API credits",
    "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
  },
  {
    "lab": "Google",
    "planName": "Google AI Plus",
    "tierKey": "pro",
    "usMonthly": "$5",
    "deMonthly": "5€",
    "billingNotes": "Gemini 4 Hydrogen, 400GB storage",
    "sourceUrl": "https://gemini.google/us/subscriptions/"
  },
  {
    "lab": "Google",
    "planName": "Google AI Pro",
    "tierKey": "pro",
    "usMonthly": "$17-20",
    "deMonthly": "14-22€",
    "billingNotes": "Gemini 4 Neon/Argon, 5TB storage, Deep Research",
    "sourceUrl": "https://gemini.google/us/subscriptions/"
  },
  {
    "lab": "Google",
    "planName": "Google AI Ultra",
    "tierKey": "ultra",
    "usMonthly": "$100-200",
    "deMonthly": "100-220€",
    "billingNotes": "Gemini 4 Carbon, 20TB, Project Genie",
    "sourceUrl": "https://gemini.google/us/subscriptions/"
  },
  {
    "lab": "Meta",
    "planName": "Meta One Core/Premium",
    "tierKey": "pro",
    "usMonthly": "$8-20",
    "deMonthly": "8-23€",
    "billingNotes": "App perks, max Meta AI media gen (no Wonder)",
    "sourceUrl": "https://about.fb.com/news/2026/09/introducing-meta-one-subscription-service-more-features-ai/"
  },
  {
    "lab": "Meta",
    "planName": "Muse Power",
    "tierKey": "pro",
    "usMonthly": "$20",
    "deMonthly": "US only",
    "billingNotes": "muse.ai agent, browser access, 500M tok/wk",
    "sourceUrl": "https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/"
  },
  {
    "lab": "xAI",
    "planName": "Grok Plus",
    "tierKey": "standard",
    "usMonthly": "$7-8",
    "deMonthly": "7-8€",
    "billingNotes": "Grok apps, base usage pool, X checkmark",
    "sourceUrl": "https://grok.com/plans"
  },
  {
    "lab": "xAI",
    "planName": "Grok Premium",
    "tierKey": "pro",
    "usMonthly": "$25-30",
    "deMonthly": "25-30€",
    "billingNotes": "4x Plus, latest Grok models & Grok Bot",
    "sourceUrl": "https://grok.com/plans"
  },
  {
    "lab": "xAI",
    "planName": "Grok Super",
    "tierKey": "ultra",
    "usMonthly": "$84-100",
    "deMonthly": "84-100€",
    "billingNotes": "15x Plus, high limits, 1080p video, priority",
    "sourceUrl": "https://grok.com/plans"
  },
  {
    "lab": "xAI",
    "planName": "Grok Ultra",
    "tierKey": "ultra",
    "usMonthly": "$167-200",
    "deMonthly": "167-200€",
    "billingNotes": "50x Plus, max limits, earliest flagships",
    "sourceUrl": "https://grok.com/plans"
  },
  {
    "lab": "Moonshot",
    "planName": "Kimi Plus",
    "tierKey": "standard",
    "usMonthly": "$15-19",
    "deMonthly": "18-22€",
    "billingNotes": "Deep Research, Agent Swarm, Kimi Code",
    "sourceUrl": "https://www.kimi.com/membership/pricing"
  },
  {
    "lab": "Moonshot",
    "planName": "Kimi Pro",
    "tierKey": "pro",
    "usMonthly": "$31-39",
    "deMonthly": "36-45€",
    "billingNotes": "2x agent credits, Goal Mode, Kimi Claw",
    "sourceUrl": "https://www.kimi.com/membership/pricing"
  },
  {
    "lab": "Moonshot",
    "planName": "Kimi Max",
    "tierKey": "ultra",
    "usMonthly": "$79-100",
    "deMonthly": "80-100€",
    "billingNotes": "5x credits, 4 parallel tasks, K3 1M context",
    "sourceUrl": "https://www.kimi.com/membership/pricing"
  },
  {
    "lab": "Moonshot",
    "planName": "Kimi Ultra",
    "tierKey": "ultra",
    "usMonthly": "$159-200",
    "deMonthly": "183-229€",
    "billingNotes": "10x credits, 50GB storage, max quotas",
    "sourceUrl": "https://www.kimi.com/membership/pricing"
  }
];

export const MONITORED_LAB_ORDER: MonitoredLab[] = [
  'OpenAI',
  'Anthropic',
  'Google',
  'Meta',
  'xAI',
  'Moonshot',
];

export function matchMonitoredLabKey(creatorOrId: string): MonitoredLab | null {
  const low = (creatorOrId || '').toLowerCase();
  if (low.includes('openai')) return 'OpenAI';
  if (low.includes('anthropic')) return 'Anthropic';
  if (low.includes('google')) return 'Google';
  if (low.includes('meta')) return 'Meta';
  if (low.includes('xai') || low.includes('spacex') || low.includes('grok')) return 'xAI';
  if (low.includes('moonshot') || low.includes('kimi')) return 'Moonshot';
  return null;
}

export function mergePricingPlansWithDefaults(livePlans?: LabPlanInfo[] | null): LabPlanInfo[] {
  if (!livePlans || livePlans.length === 0) return DEFAULT_LAB_PLANS;
  const presentLabs = new Set(livePlans.map((p) => p.lab));
  const missingDefaults = DEFAULT_LAB_PLANS.filter((p) => !presentLabs.has(p.lab));
  return missingDefaults.length > 0 ? [...livePlans, ...missingDefaults] : livePlans;
}

