import { CompanyInfo } from '../types';

/**
 * Alias normalization helpers mapping alternate creator/model brand strings
 * (e.g. "xAI", "ChatGPT", "Moonshot", "Z.ai") onto the canonical Company names
 * synced dynamically from Google Sheets Columns AJ-AL.
 */
export const COMPANY_LOOKUP_ALIASES: Record<string, string> = {
  chatgpt: 'openai',
  xai: 'spacexai',
  'z.ai': 'z ai',
  'z ai': 'z ai',
  moonshot: 'kimi',
  mimo: 'xiaomi',
  ling: 'inclusionai',
  hunyuan: 'tencent',
  mistralai: 'mistral',
  deepl: 'deepl se',
  sapiens: 'sapiens ai',
  motif: 'motif technologies',
  multiverse: 'multiverse computing',
  'china mobile': 'china mobile',
  'thinking machines': 'thinking machines',
  thinking: 'thinking machines',
};

export function normalizeCompanyLookupKey(raw: string): string {
  const norm = raw.toLowerCase().trim();
  for (const [alias, canonical] of Object.entries(COMPANY_LOOKUP_ALIASES)) {
    if (norm === alias || norm.includes(alias)) {
      return canonical;
    }
  }
  return norm;
}

export function getCompanyMeta(creatorStr: string): CompanyInfo {
  const clean = creatorStr.trim();
  return {
    name: clean.split(' ')[0] || 'Unknown',
    domain: '',
    flag: '🌐',
  };
}

export function getFaviconUrl(domain: string): string {
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}
