export interface TimelineLabLevel {
  id: string;
  label: string;
  familyHint: string;
  color: string;
  match: (m: {
    companyName?: string;
    company?: string;
    displayName: string;
    name?: string;
  }) => boolean;
}

/**
 * 12 main LLM labs corresponding 1-to-1 to the main lab/family pills in SearchBar.tsx,
 * sorted alphabetically by lab company name.
 */
export const TIMELINE_MAIN_LAB_LEVELS: TimelineLabLevel[] = [
  {
    id: 'Alibaba',
    label: 'Alibaba',
    familyHint: 'Qwen',
    color: '#f97316', // Orange
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return comp === 'alibaba' || raw.includes('qwen') || raw.includes('alibaba');
    },
  },
  {
    id: 'Anthropic',
    label: 'Anthropic',
    familyHint: 'Claude',
    color: '#e06d53', // Terracotta Coral
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return comp === 'anthropic' || raw.includes('claude') || raw.includes('anthropic');
    },
  },
  {
    id: 'DeepSeek',
    label: 'DeepSeek',
    familyHint: 'DeepSeek',
    color: '#2563eb', // Royal Blue
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return comp === 'deepseek' || raw.includes('deepseek');
    },
  },
  {
    id: 'Google',
    label: 'Google',
    familyHint: 'Gemini',
    color: '#10b981', // Emerald Green
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return comp === 'google' || raw.includes('gemini') || raw.includes('google');
    },
  },
  {
    id: 'Kimi',
    label: 'Kimi',
    familyHint: 'Moonshot',
    color: '#0891b2', // Cyan
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return comp === 'kimi' || comp === 'moonshot' || raw.includes('kimi') || raw.includes('moonshot');
    },
  },
  {
    id: 'Meta',
    label: 'Meta',
    familyHint: 'Muse / Llama',
    color: '#0ea5e9', // Sky Blue
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return comp === 'meta' || raw.includes('muse') || raw.includes('llama') || /\bmeta\b/.test(raw);
    },
  },
  {
    id: 'MiniMax',
    label: 'MiniMax',
    familyHint: 'MiniMax',
    color: '#ec4899', // Pink
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return comp === 'minimax' || raw.includes('minimax');
    },
  },
  {
    id: 'Mistral',
    label: 'Mistral',
    familyHint: 'Mistral',
    color: '#ef4444', // Red
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return comp === 'mistral' || comp === 'mistralai' || raw.includes('mistral');
    },
  },
  {
    id: 'OpenAI',
    label: 'OpenAI',
    familyHint: 'ChatGPT / GPT',
    color: '#6366f1', // Indigo
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return (
        comp === 'openai' ||
        raw.includes('openai') ||
        raw.includes('chatgpt') ||
        /\bgpt[-\s]?\d|\bo[134](?:\s|$|-)/i.test(raw)
      );
    },
  },
  {
    id: 'xAI',
    label: 'xAI',
    familyHint: 'Grok',
    color: '#a855f7', // Purple
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return comp === 'spacexai' || comp === 'xai' || raw.includes('grok') || /\bxai\b/.test(raw);
    },
  },
  {
    id: 'Xiaomi',
    label: 'Xiaomi',
    familyHint: 'MiMo',
    color: '#c026d3', // Fuchsia
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return comp === 'xiaomi' || raw.includes('mimo') || raw.includes('xiaomi');
    },
  },
  {
    id: 'Z.ai',
    label: 'Z.ai',
    familyHint: 'GLM',
    color: '#84cc16', // Lime
    match: (m) => {
      const comp = (m.companyName || '').toLowerCase();
      const raw = `${m.company || ''} ${m.displayName} ${m.name || ''}`.toLowerCase();
      return comp === 'z ai' || comp === 'z.ai' || raw.includes('glm') || raw.includes('z.ai') || raw.includes('z ai');
    },
  },
];

export const DEFAULT_TIMELINE_LAB_LEVELS: string[] = ['OpenAI', 'Anthropic', 'Google'];
