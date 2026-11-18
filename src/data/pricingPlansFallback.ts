import { LabPlanInfo, MonitoredLab } from '../types/pricingMonitor';

export const DEFAULT_PRICING_SNAPSHOT_DATE = '2026-11-17T13:00:00.000Z';

export const DEFAULT_LAB_PLANS: LabPlanInfo[] = [
  // OpenAI
  {
    lab: 'OpenAI',
    planName: 'ChatGPT Go',
    tierKey: 'standard',
    usMonthly: '$8',
    deMonthly: '~8€',
    billingNotes: 'Expanded free limits',
    sourceUrl: 'https://chatgpt.com/pricing',
  },
  {
    lab: 'OpenAI',
    planName: 'ChatGPT Plus',
    tierKey: 'standard',
    usMonthly: '$20',
    deMonthly: '23€',
    billingNotes: 'Unlocks Sol & Terra',
    sourceUrl: 'https://chatgpt.com/pricing',
  },
  {
    lab: 'OpenAI',
    planName: 'ChatGPT Pro 100',
    tierKey: 'pro',
    usMonthly: '$100',
    deMonthly: '103€',
    billingNotes: 'Unlocks GPT-6 Astra',
    sourceUrl: 'https://chatgpt.com/pricing',
  },
  {
    lab: 'OpenAI',
    planName: 'ChatGPT Pro 200',
    tierKey: 'ultra',
    usMonthly: '$200',
    deMonthly: '200€',
    billingNotes: 'Higher Pro limits',
    sourceUrl: 'https://chatgpt.com/pricing',
  },
  {
    lab: 'OpenAI',
    planName: 'ChatGPT Pro 500',
    tierKey: 'ultra',
    usMonthly: '$500',
    deMonthly: '510€',
    billingNotes: 'Maximum compute tier',
    sourceUrl: 'https://chatgpt.com/pricing',
  },

  // Anthropic
  {
    lab: 'Anthropic',
    planName: 'Claude Pro',
    tierKey: 'standard',
    usMonthly: '$17-20',
    deMonthly: '15-18€',
    billingNotes: 'Unlocks Opus 5.5',
    sourceUrl: 'https://claude.com/pricing',
  },
  {
    lab: 'Anthropic',
    planName: 'Claude Max',
    tierKey: 'pro',
    usMonthly: '$100',
    deMonthly: '90€',
    billingNotes: '5x Pro; Fable 5.2',
    sourceUrl: 'https://claude.com/pricing',
  },
  {
    lab: 'Anthropic',
    planName: 'Claude Ultra',
    tierKey: 'ultra',
    usMonthly: '$200',
    deMonthly: '180€',
    billingNotes: '20x Pro limits',
    sourceUrl: 'https://claude.com/pricing',
  },

  // Google
  {
    lab: 'Google',
    planName: 'Google AI Plus',
    tierKey: 'standard',
    usMonthly: '$5',
    deMonthly: '5-10€',
    billingNotes: '2x Hydrogen, 400 GB',
    sourceUrl: 'https://gemini.google/de/subscriptions/?hl=de',
  },
  {
    lab: 'Google',
    planName: 'Google AI Pro',
    tierKey: 'pro',
    usMonthly: '$17-20',
    deMonthly: '14-22€',
    billingNotes: 'Gemini 4 Argon, 5 TB',
    sourceUrl: 'https://gemini.google/de/subscriptions/?hl=de',
  },
  {
    lab: 'Google',
    planName: 'Google AI Ultra',
    tierKey: 'ultra',
    usMonthly: '$100-200',
    deMonthly: '100-220€',
    billingNotes: 'Gemini 4 Carbon, 20 TB',
    sourceUrl: 'https://gemini.google/de/subscriptions/?hl=de',
  },

  // Meta (Consumer browser & personal agent plans — Muse Code CLI excluded)
  {
    lab: 'Meta',
    planName: 'Meta AI Free',
    tierKey: 'free',
    usMonthly: '$0',
    deMonthly: '0€',
    billingNotes: 'meta.ai chat (Spark 1.1)',
    sourceUrl: 'https://www.meta.ai/',
  },
  {
    lab: 'Meta',
    planName: 'Meta One Core',
    tierKey: 'standard',
    usMonthly: '$8',
    deMonthly: '~8-9€',
    billingNotes: 'App perks (no Wonder)',
    sourceUrl: 'https://www.meta.ai/',
  },
  {
    lab: 'Meta',
    planName: 'Meta One Premium',
    tierKey: 'pro',
    usMonthly: '$20',
    deMonthly: '~20-23€',
    billingNotes: 'Media perks (no Wonder)',
    sourceUrl: 'https://www.meta.ai/',
  },
  {
    lab: 'Meta',
    planName: 'Muse Free',
    tierKey: 'free',
    usMonthly: '$0',
    deMonthly: 'US only',
    billingNotes: 'muse.ai browser baseline',
    sourceUrl: 'https://muse.ai/',
  },
  {
    lab: 'Meta',
    planName: 'Muse Power',
    tierKey: 'pro',
    usMonthly: '$20',
    deMonthly: 'US only',
    billingNotes: 'muse.ai, 500M tok/wk',
    sourceUrl: 'https://muse.ai/',
  },
  {
    lab: 'Meta',
    planName: 'Muse Maximum',
    tierKey: 'ultra',
    usMonthly: '$100',
    deMonthly: 'US only',
    billingNotes: 'muse.ai, 3B tok/wk',
    sourceUrl: 'https://muse.ai/',
  },
];

export function matchMonitoredLabKey(creatorOrId: string): MonitoredLab | null {
  const low = (creatorOrId || '').toLowerCase();
  if (low.includes('openai')) return 'OpenAI';
  if (low.includes('anthropic')) return 'Anthropic';
  if (low.includes('google')) return 'Google';
  if (low.includes('meta')) return 'Meta';
  return null;
}
