import { Language } from '../../utils/i18n';

export const IGNORE_OPTION_VALUE = '__IGNORE__';
export const INSERT_NEW_ROW_OPTION_VALUE = -1;

export type BenchmarkDiffStatus =
  | 'new_unmatched'
  | 'missing'
  | 'overwrite_estimate'
  | 'changed'
  | 'unchanged'
  | 'ignored';

export interface PendingSheetCellChange {
  cellRef: string;
  label: string;
  before: string;
  beforeIsBold?: boolean | null;
  after: string;
  afterIsBold?: boolean;
  range: string;
  value: string | number;
  kind: 'price' | 'gdpx' | 'integrity' | 'vals' | 'simpleBench' | 'aa';
  sourceId?: string;
  sheetRowNumber?: number;
  col0Based?: number;
  applyBold?: boolean;
  numberFormatPattern?: string;
  matchedModelId?: string;
  matchedDisplayName?: string;
  isManualAssignment?: boolean;
  isNewRowInsert?: boolean;
  newRowSpec?: {
    insertAtRow1Based: number;
    canonicalName: string;
    companyName: string;
    releaseDate: string;
    targetCol0Based: number;
    targetValue: string | number;
    numberFormatPattern?: string;
  };
}

export function formatExactScore(
  val: number | null | undefined,
  lang: Language,
  minDecimals = 0
): string {
  if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
  let str = String(val);
  if (minDecimals > 0) {
    const dot = str.indexOf('.');
    const curDec = dot !== -1 ? str.length - dot - 1 : 0;
    if (curDec < minDecimals) {
      str = val.toFixed(minDecimals);
    }
  }
  return lang === 'de' ? str.replace('.', ',') : str;
}

export function formatScoreDiff(
  currentScore: number,
  liveScore: number,
  lang: Language
): {
  pointDiff: number;
  pointFormatted: string;
  pctDiff: number | null;
  absPctDiff: number;
  pctFormatted: string;
  isLargeDiff: boolean;
} {
  const countDecimals = (v: number): number => {
    const s = String(v);
    const dot = s.indexOf('.');
    return dot !== -1 ? s.length - dot - 1 : 0;
  };
  const decimals = Math.min(4, Math.max(countDecimals(currentScore), countDecimals(liveScore)));
  const rawDiff = liveScore - currentScore;
  const roundedPoint = Number(rawDiff.toFixed(decimals));
  const absPoint = Math.abs(roundedPoint);

  let pointFormatted: string;
  if (roundedPoint === 0) {
    const zeroStr = decimals > 0 ? (0).toFixed(decimals) : '0';
    pointFormatted = lang === 'de' ? zeroStr.replace('.', ',') : zeroStr;
  } else {
    const sign = roundedPoint > 0 ? '+' : '-';
    const absStr = decimals > 0 ? absPoint.toFixed(decimals) : String(absPoint);
    pointFormatted = `${sign}${lang === 'de' ? absStr.replace('.', ',') : absStr}`;
  }

  if (currentScore === 0) {
    if (roundedPoint === 0) {
      return {
        pointDiff: 0,
        pointFormatted,
        pctDiff: 0,
        absPctDiff: 0,
        pctFormatted: lang === 'de' ? '0,0%' : '0.0%',
        isLargeDiff: false,
      };
    }
    return {
      pointDiff: roundedPoint,
      pointFormatted,
      pctDiff: null,
      absPctDiff: Infinity,
      pctFormatted: roundedPoint > 0 ? '+∞%' : '-∞%',
      isLargeDiff: true,
    };
  }

  const rawPct = (rawDiff / Math.abs(currentScore)) * 100;
  const roundedPct = Number(rawPct.toFixed(1));
  const absPct = Math.abs(roundedPct);

  let pctFormatted: string;
  if (roundedPct === 0) {
    pctFormatted = lang === 'de' ? '0,0%' : '0.0%';
  } else {
    const pctSign = roundedPct > 0 ? '+' : '-';
    const pctAbsStr = absPct.toFixed(1);
    pctFormatted = `${pctSign}${lang === 'de' ? pctAbsStr.replace('.', ',') : pctAbsStr}%`;
  }

  return {
    pointDiff: roundedPoint,
    pointFormatted,
    pctDiff: roundedPct,
    absPctDiff: Math.abs(rawPct),
    pctFormatted,
    isLargeDiff: Math.abs(rawPct) > 5,
  };
}

export function decimalsToPattern(val: number, minDecimals = 0): string {
  const str = String(val);
  const dot = str.indexOf('.');
  const curDec = dot !== -1 ? str.length - dot - 1 : 0;
  const dec = Math.max(curDec, minDecimals);
  return dec > 0 ? `0.${'0'.repeat(dec)}` : '0';
}

export function formatMonitorTimestamp(iso: string | null | undefined, lang: Language): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCreatorColC(companyName: string, isoDate: string): string {
  const deMonths = [
    'Jan',
    'Feb',
    'Mär',
    'Apr',
    'Mai',
    'Jun',
    'Jul',
    'Aug',
    'Sept',
    'Okt',
    'Nov',
    'Dez',
  ];
  const m = /^(\d{4})-(\d{2})/.exec(isoDate);
  if (!m) return companyName;
  const monIdx = Math.max(0, Math.min(11, parseInt(m[2], 10) - 1));
  const yy = m[1].slice(2);
  return `${companyName} ${deMonths[monIdx]} ${yy}`;
}

function normalizeNameForSimilarity(raw: string): {
  base: string;
  compact: string;
  tokens: string[];
} {
  let s = (raw || '').toLowerCase().trim();
  // Remove pure reasoning/effort parentheticals so "DeepSeek V4.1 Flash 1017 (Max)" compares cleanly against "DeepSeek V4.1 Flash 1017"
  s = s.replace(
    /\((?:default\s*fallback|adaptive\s*reasoning|adaptive|reasoning|thinking|non[-\s]?reasoning|no[-\s]?thinking|max|xhigh|extra\s*high|highest|high|medium|med|low|minimal|min|effort|instant|[\s,;/_-])+\)/gi,
    ' '
  );
  s = s.replace(/[^\p{L}\p{N}.]+/gu, ' ').trim();
  s = s.replace(/\bchatgpt\b/g, 'gpt');
  s = s.replace(/\bdeepseek\s+v(?=\d)/g, 'deepseek ');
  s = s.replace(/\bqwen(?=\d)/g, 'qwen ');
  s = s.replace(/\bminimax\s*/g, 'minimax ');
  s = s.replace(/\bprev\b/g, 'preview');
  s = s.replace(/\b(\d+)\.0\b/g, '$1');

  const tokens = s
    .split(/\s+/)
    .flatMap((tok) => tok.split(/(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])/))
    .filter(Boolean);

  return {
    base: s,
    compact: s.replace(/[^a-z0-9]/g, ''),
    tokens,
  };
}

function bigramDiceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) {
    return a === b ? 1 : 0;
  }
  const counts = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    counts.set(bg, (counts.get(bg) || 0) + 1);
  }
  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const cur = counts.get(bg) || 0;
    if (cur > 0) {
      matches++;
      counts.set(bg, cur - 1);
    }
  }
  return (2 * matches) / (a.length - 1 + (b.length - 1));
}

function levenshteinSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  // Cap for very long strings
  const s1 = a.slice(0, 64);
  const s2 = b.slice(0, 64);
  const m = s1.length;
  const n = s2.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const c1 = s1.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = c1 === s2.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return Math.max(0, 1 - prev[n] / Math.max(m, n));
}

function scoreSingleNamePair(
  src: ReturnType<typeof normalizeNameForSimilarity>,
  cand: ReturnType<typeof normalizeNameForSimilarity>
): number {
  if (!src.compact || !cand.compact) return 0;
  if (src.compact === cand.compact) return 1200;

  let score = 0;

  // Substring / prefix containment weighted by length closeness
  if (src.compact.includes(cand.compact) || cand.compact.includes(src.compact)) {
    const ratio =
      Math.min(src.compact.length, cand.compact.length) /
      Math.max(src.compact.length, cand.compact.length);
    score += 360 + ratio * 220;
    if (src.compact.startsWith(cand.compact) || cand.compact.startsWith(src.compact)) {
      score += 60;
    }
  }

  // Token overlap (exact + version numbers + prefix matches)
  if (src.tokens.length > 0 && cand.tokens.length > 0) {
    const usedCand = new Set<number>();
    let matchedWeight = 0;
    for (const st of src.tokens) {
      const isNum = /^\d+(?:\.\d+)?$/.test(st);
      let bestIdx = -1;
      let bestW = 0;
      for (let j = 0; j < cand.tokens.length; j++) {
        if (usedCand.has(j)) continue;
        const ct = cand.tokens[j];
        if (st === ct) {
          bestIdx = j;
          bestW = isNum ? 1.35 : 1.0;
          break;
        }
        if (st.length >= 3 && ct.length >= 3 && (st.startsWith(ct) || ct.startsWith(st))) {
          const w = 0.65;
          if (w > bestW) {
            bestW = w;
            bestIdx = j;
          }
        }
      }
      if (bestIdx !== -1) {
        usedCand.add(bestIdx);
        matchedWeight += bestW;
      }
    }
    const diceTokens = (2 * matchedWeight) / (src.tokens.length + cand.tokens.length);
    score += diceTokens * 420;
  }

  // Character-level similarity (catches typos, punctuation, joined words)
  score += bigramDiceSimilarity(src.compact, cand.compact) * 200;
  score += levenshteinSimilarity(src.compact, cand.compact) * 140;

  return score;
}

/**
 * Computes a similarity score between an external benchmark model name and a Sheet model row
 * so manual assignment dropdowns always place the closest name matches right at the top.
 */
export function computeModelNameSimilarity(
  sourceName: string,
  candidateDisplayName: string,
  candidateCanonicalName?: string,
  sourceCompany?: string,
  candidateCompany?: string
): number {
  const src = normalizeNameForSimilarity(sourceName);
  const candDisp = normalizeNameForSimilarity(candidateDisplayName);
  let best = scoreSingleNamePair(src, candDisp);

  if (candidateCanonicalName && candidateCanonicalName !== candidateDisplayName) {
    const candCanon = normalizeNameForSimilarity(candidateCanonicalName);
    const canonScore = scoreSingleNamePair(src, candCanon);
    if (canonScore > best) best = canonScore;
  }

  // Gentle company tiebreaker (never overrides a much closer model name)
  const sc = (sourceCompany || '').trim().toLowerCase();
  const cc = (candidateCompany || '').trim().toLowerCase();
  if (sc && cc && (sc.includes(cc) || cc.includes(sc))) {
    best += 40;
  }

  return best;
}

