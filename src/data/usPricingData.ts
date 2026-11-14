export const US_PRICE_HEADER_ROW1 = 'monthly cost for chat in US';
export const US_PRICE_HEADER_ROW2 = 'if paid for 1 year vs. if paid monthly';

/**
 * Researched US monthly consumer chat pricing matching Column T's format
 * ("if paid for 1 year vs. if paid monthly").
 */
export const RESEARCHED_US_PRICES: Record<string, string> = {
  'claude fable 5.2': '$100',
  'gemini 4 carbon': '$100',
  'claude opus 5.5': '$17-20',
  'gemini 4 argon': '$17-20',
  'gpt-6 astra': '$100',
  'chatgpt-6 astra': '$100',
  'gpt-6.1 sol': '$20',
  'chatgpt-6.1 sol': '$20',
  'gpt-6.1 terra': '$20',
  'chatgpt-6.1 terra': '$20',
  'muse wonder full': '$50',
  'muse wonder': '$20',
  'muse spark 1.3': '$20',
};

function normalizeModelLookupKey(name: string): string {
  return name
    .replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '')
    .replace(/[💲🌐🆕✦✧★⭐]/g, '')
    .replace(/\bNEW\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Looks up a researched US price by canonical displayName (Col S) or raw display name (Col B).
 */
export function lookupResearchedUsPrice(displayName: string, rawName?: string): string | undefined {
  const candidates = [displayName, rawName || '']
    .map(normalizeModelLookupKey)
    .filter(Boolean);

  for (const key of candidates) {
    if (RESEARCHED_US_PRICES[key]) {
      return RESEARCHED_US_PRICES[key];
    }
    const withoutChatPrefix = key.replace(/^chatgpt-/, 'gpt-');
    if (RESEARCHED_US_PRICES[withoutChatPrefix]) {
      return RESEARCHED_US_PRICES[withoutChatPrefix];
    }
  }
  return undefined;
}
