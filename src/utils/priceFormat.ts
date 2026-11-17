/**
 * Price formatting and whole-number rounding helpers.
 * Ensures all USD ($) and EUR (€) amounts across the app display rounded whole currency units
 * and eliminates psychological "-1" pricing endings (e.g. 99€ -> 100€, $199 -> $200, 219€ -> 220€).
 */

function roundCurrencyNumber(num: number): number {
  if (!Number.isFinite(num)) return num;
  const rounded = Math.round(num);
  // Eliminate psychological "-1" marketing endings (9, 19, 29, ..., 99, 199, 219, ...)
  if (rounded >= 9 && rounded % 10 === 9) {
    return rounded + 1;
  }
  return rounded;
}

function roundNumericToken(rawNum: string): string {
  const normalized = rawNum.replace(',', '.');
  const num = parseFloat(normalized);
  if (!Number.isFinite(num)) return rawNum;
  return String(roundCurrencyNumber(num));
}

function normalizeCurrencyRanges(text: string): string {
  let out = text;
  // Normalize same-currency slash/dash ranges (e.g. "$100 / $200" -> "$100-200", "90€ / 180€" -> "90-180€")
  out = out.replace(
    /\$\s*(\d+)\s*(?:\/|[-–—])\s*\$\s*(\d+)(\+?)/g,
    (_m, a, b, plus) => `$${a}-${b}${plus || ''}`
  );
  out = out.replace(
    /(\d+)\s*€\s*(?:\/|[-–—])\s*(\d+)\s*€(\+?)/g,
    (_m, a, b, plus) => `${a}-${b}€${plus || ''}`
  );
  out = out.replace(
    /(\d+)\s*\/\s*(\d+)\s*€(\+?)/g,
    (_m, a, b, plus) => `${a}-${b}€${plus || ''}`
  );
  out = out.replace(
    /\$\s*(\d+)\s*\/\s*(\d+)(\+?)/g,
    (_m, a, b, plus) => `$${a}-${b}${plus || ''}`
  );
  return out;
}

export function roundCurrencyString(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  const hasCurrencyMarker = /[$€]|\b(?:usd|eur|dolar|dollar|euro)s?\b/i.test(trimmed);
  const isPurePriceExpr =
    hasCurrencyMarker &&
    /^[\s~≈<>+\-–—$€0-9.,/]+(?:\s*(?:usd|eur|dolar|dollar|euro)s?)?$/i.test(trimmed);

  if (isPurePriceExpr) {
    const rounded = trimmed.replace(/\d+(?:[.,]\d{1,2})?\b/g, (numStr) =>
      roundNumericToken(numStr)
    );
    return normalizeCurrencyRanges(rounded);
  }

  return roundCurrencyTokensInText(trimmed);
}

export function roundCurrencyTokensInText(text: string | undefined | null): string {
  if (!text) return '';
  let out = String(text);

  // Prefix currency tokens & optional range: $4.99, $99, $99-199, ~€99, $17.50-19.99
  out = out.replace(
    /([$€]\s*~?\s*)(\d+(?:[.,]\d{1,2})?)(\s*[-–—]\s*\d+(?:[.,]\d{1,2})?)?\b/g,
    (_m, prefix, headNum, rangeTail) => {
      const roundedHead = roundNumericToken(headNum);
      const roundedTail = rangeTail
        ? String(rangeTail).replace(/\d+(?:[.,]\d{1,2})?/g, (n) => roundNumericToken(n))
        : '';
      return `${prefix}${roundedHead}${roundedTail}`;
    }
  );

  // Suffix currency tokens & optional range: 4.99€, 99€, 99-219€, 19.99 USD
  out = out.replace(
    /\b(\d+(?:[.,]\d{1,2})?(?:\s*[-–—]\s*\d+(?:[.,]\d{1,2})?)?)(\s*(?:€|\$|\b(?:eur|usd|euro|dollar|dolar)s?\b))/gi,
    (_m, numExpr, suffix) => {
      const roundedExpr = String(numExpr).replace(/\d+(?:[.,]\d{1,2})?/g, (n) =>
        roundNumericToken(n)
      );
      return `${roundedExpr}${suffix}`;
    }
  );

  return normalizeCurrencyRanges(out);
}
