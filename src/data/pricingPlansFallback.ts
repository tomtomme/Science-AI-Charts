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
    "deMonthly": "5-10€",
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
  }
];

export function matchMonitoredLabKey(creatorOrId: string): MonitoredLab | null {
  const low = (creatorOrId || '').toLowerCase();
  if (low.includes('openai')) return 'OpenAI';
  if (low.includes('anthropic')) return 'Anthropic';
  if (low.includes('google')) return 'Google';
  if (low.includes('meta')) return 'Meta';
  return null;
}
