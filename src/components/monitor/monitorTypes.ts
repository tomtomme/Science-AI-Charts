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
  kind: 'price' | 'gdpx' | 'integrity' | 'vals' | 'simpleBench';
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
