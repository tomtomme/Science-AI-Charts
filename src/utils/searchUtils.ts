/**
 * Evaluates a free-text search query supporting multiple search terms (defaulting to OR),
 * quoted phrases, and explicit boolean operators (AND, OR, NOT).
 *
 * Examples:
 * - "claude gpt" -> matches if target contains "claude" OR "gpt"
 * - "claude AND sonnet" -> matches if target contains both "claude" AND "sonnet"
 * - "gpt NOT 4o" -> matches if target contains "gpt" AND does NOT contain "4o"
 * - '"Claude 3.5"' -> matches the exact phrase "claude 3.5"
 */
export function matchesSearchQuery(query: string, targetText: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const target = targetText.toLowerCase();

  // Tokenize preserving quoted strings
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  const rawTokens: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(q)) !== null) {
    const val = m[1] ?? m[2] ?? m[3];
    if (val !== undefined && val.trim().length > 0) {
      rawTokens.push(val.trim());
    }
  }
  if (rawTokens.length === 0) return true;

  // Build OR-groups containing AND-terms:
  // (A AND B) OR (C AND NOT D) ...
  const orGroups: Array<Array<{ term: string; negated: boolean }>> = [];
  let currentAndGroup: Array<{ term: string; negated: boolean }> = [];

  let nextIsNegated = false;
  let pendingExplicitAnd = false;

  for (let i = 0; i < rawTokens.length; i++) {
    const raw = rawTokens[i];
    const upper = raw.toUpperCase();

    if (upper === 'OR' || upper === '||') {
      if (currentAndGroup.length > 0) {
        orGroups.push(currentAndGroup);
        currentAndGroup = [];
      }
      pendingExplicitAnd = false;
      continue;
    }

    if (upper === 'AND' || upper === '&&') {
      pendingExplicitAnd = true;
      continue;
    }

    if (upper === 'NOT') {
      nextIsNegated = true;
      continue;
    }

    // Process search term
    let term = raw.toLowerCase();
    let negated = nextIsNegated;
    nextIsNegated = false;

    if (term.startsWith('!') && term.length > 1) {
      negated = true;
      term = term.slice(1);
    } else if (term.startsWith('-') && term.length > 1) {
      negated = true;
      term = term.slice(1);
    }

    if (!term) continue;

    if (!pendingExplicitAnd && currentAndGroup.length > 0) {
      // Default connection between adjacent search terms is OR!
      // Exception: If this term is negated (e.g. "gpt NOT 4o"), treat as AND NOT
      if (negated) {
        currentAndGroup.push({ term, negated });
        pendingExplicitAnd = false;
        continue;
      } else {
        orGroups.push(currentAndGroup);
        currentAndGroup = [];
      }
    }

    currentAndGroup.push({ term, negated });
    pendingExplicitAnd = false;
  }

  if (currentAndGroup.length > 0) {
    orGroups.push(currentAndGroup);
  }

  if (orGroups.length === 0) return true;

  // Evaluate: true if at least one OR group evaluates to true
  return orGroups.some((andGroup) => {
    return andGroup.every(({ term, negated }) => {
      const found = target.includes(term);
      return negated ? !found : found;
    });
  });
}
