import { LabEntry, ModelRecord, Row33Metadata, ScoreMode } from '../types';
import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { Language } from '../utils/i18n';
import { roundCurrencyString, roundCurrencyTokensInText } from '../utils/priceFormat';

export const BENCHMARK_ANCHOR_MAP: Record<string, string> = {
  actCodeReason: 'note-col-d',
  nonHallucination: 'note-col-e',
  scienceKnowledge: 'note-col-f',
  visionPlot: 'note-col-g',
  medReasoning: 'note-col-h',
  excelAgent: 'note-col-i',
  trickQuestions: 'note-col-j',
  econLegal: 'note-col-k',
  iqOld: 'note-col-d',
  nonHalluOld: 'note-col-e',
  scienceKnowledgeOld: 'note-col-f',
  trickQuestionsOld: 'note-col-simplebench',
};

export const COMPARE_SLOTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export type CompareSlot = (typeof COMPARE_SLOTS)[number];
export const MAX_COMPARE_MODELS = 8;
export type PresetKind = 'newest' | 'same_price' | 'same_family' | 'same_size';

export interface SlotTheme {
  badgeBg: string;
  text: string;
  barActive: string;
  barDim: string;
  ring: string;
  rowSelected: string;
  borderTop: string;
  borderLeft: string;
  hex: string;
}

export type PaletteKey =
  | 'blue'
  | 'orange'
  | 'teal'
  | 'emerald'
  | 'indigo'
  | 'sky'
  | 'amber'
  | 'red'
  | 'cyan'
  | 'pink'
  | 'purple'
  | 'rose'
  | 'violet'
  | 'lime'
  | 'fuchsia'
  | 'slate';

export const COLOR_PALETTES: Record<PaletteKey, SlotTheme> = {
  blue: {
    badgeBg: 'bg-blue-600 text-white',
    text: 'text-blue-600 dark:text-blue-400',
    barActive: 'bg-blue-600 dark:bg-blue-500',
    barDim: 'bg-blue-400/25 dark:bg-blue-500/20',
    ring: 'hover:border-blue-400 dark:hover:border-blue-500 focus-visible:ring-blue-500',
    rowSelected: 'bg-blue-50/90 dark:bg-blue-950/40',
    borderTop: 'border-t-blue-500',
    borderLeft: 'border-l-blue-500',
    hex: '#2563eb',
  },
  orange: {
    badgeBg: 'bg-orange-600 text-white',
    text: 'text-orange-600 dark:text-orange-400',
    barActive: 'bg-orange-600 dark:bg-orange-500',
    barDim: 'bg-orange-400/25 dark:bg-orange-500/20',
    ring: 'hover:border-orange-400 dark:hover:border-orange-500 focus-visible:ring-orange-500',
    rowSelected: 'bg-orange-50/90 dark:bg-orange-950/40',
    borderTop: 'border-t-orange-500',
    borderLeft: 'border-l-orange-500',
    hex: '#ea580c',
  },
  teal: {
    badgeBg: 'bg-teal-600 text-white',
    text: 'text-teal-600 dark:text-teal-400',
    barActive: 'bg-teal-600 dark:bg-teal-500',
    barDim: 'bg-teal-400/25 dark:bg-teal-500/20',
    ring: 'hover:border-teal-400 dark:hover:border-teal-500 focus-visible:ring-teal-500',
    rowSelected: 'bg-teal-50/90 dark:bg-teal-950/40',
    borderTop: 'border-t-teal-500',
    borderLeft: 'border-l-teal-500',
    hex: '#0d9488',
  },
  emerald: {
    badgeBg: 'bg-emerald-600 text-white',
    text: 'text-emerald-600 dark:text-emerald-400',
    barActive: 'bg-emerald-600 dark:bg-emerald-500',
    barDim: 'bg-emerald-400/25 dark:bg-emerald-500/20',
    ring: 'hover:border-emerald-400 dark:hover:border-emerald-500 focus-visible:ring-emerald-500',
    rowSelected: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    borderTop: 'border-t-emerald-500',
    borderLeft: 'border-l-emerald-500',
    hex: '#059669',
  },
  indigo: {
    badgeBg: 'bg-indigo-600 text-white',
    text: 'text-indigo-600 dark:text-indigo-400',
    barActive: 'bg-indigo-600 dark:bg-indigo-500',
    barDim: 'bg-indigo-400/25 dark:bg-indigo-500/20',
    ring: 'hover:border-indigo-400 dark:hover:border-indigo-500 focus-visible:ring-indigo-500',
    rowSelected: 'bg-indigo-50/90 dark:bg-indigo-950/40',
    borderTop: 'border-t-indigo-500',
    borderLeft: 'border-l-indigo-500',
    hex: '#4f46e5',
  },
  sky: {
    badgeBg: 'bg-sky-600 text-white',
    text: 'text-sky-600 dark:text-sky-400',
    barActive: 'bg-sky-600 dark:bg-sky-500',
    barDim: 'bg-sky-400/25 dark:bg-sky-500/20',
    ring: 'hover:border-sky-400 dark:hover:border-sky-500 focus-visible:ring-sky-500',
    rowSelected: 'bg-sky-50/90 dark:bg-sky-950/40',
    borderTop: 'border-t-sky-500',
    borderLeft: 'border-l-sky-500',
    hex: '#0284c7',
  },
  amber: {
    badgeBg: 'bg-amber-600 text-white',
    text: 'text-amber-600 dark:text-amber-400',
    barActive: 'bg-amber-600 dark:bg-amber-500',
    barDim: 'bg-amber-400/25 dark:bg-amber-500/20',
    ring: 'hover:border-amber-400 dark:hover:border-amber-500 focus-visible:ring-amber-500',
    rowSelected: 'bg-amber-50/90 dark:bg-amber-950/40',
    borderTop: 'border-t-amber-500',
    borderLeft: 'border-l-amber-500',
    hex: '#d97706',
  },
  red: {
    badgeBg: 'bg-red-600 text-white',
    text: 'text-red-600 dark:text-red-400',
    barActive: 'bg-red-600 dark:bg-red-500',
    barDim: 'bg-red-400/25 dark:bg-red-500/20',
    ring: 'hover:border-red-400 dark:hover:border-red-500 focus-visible:ring-red-500',
    rowSelected: 'bg-red-50/90 dark:bg-red-950/40',
    borderTop: 'border-t-red-500',
    borderLeft: 'border-l-red-500',
    hex: '#dc2626',
  },
  cyan: {
    badgeBg: 'bg-cyan-600 text-white',
    text: 'text-cyan-600 dark:text-cyan-400',
    barActive: 'bg-cyan-600 dark:bg-cyan-500',
    barDim: 'bg-cyan-400/25 dark:bg-cyan-500/20',
    ring: 'hover:border-cyan-400 dark:hover:border-cyan-500 focus-visible:ring-cyan-500',
    rowSelected: 'bg-cyan-50/90 dark:bg-cyan-950/40',
    borderTop: 'border-t-cyan-500',
    borderLeft: 'border-l-cyan-500',
    hex: '#0891b2',
  },
  pink: {
    badgeBg: 'bg-pink-600 text-white',
    text: 'text-pink-600 dark:text-pink-400',
    barActive: 'bg-pink-600 dark:bg-pink-500',
    barDim: 'bg-pink-400/25 dark:bg-pink-500/20',
    ring: 'hover:border-pink-400 dark:hover:border-pink-500 focus-visible:ring-pink-500',
    rowSelected: 'bg-pink-50/90 dark:bg-pink-950/40',
    borderTop: 'border-t-pink-500',
    borderLeft: 'border-l-pink-500',
    hex: '#db2777',
  },
  purple: {
    badgeBg: 'bg-purple-600 text-white',
    text: 'text-purple-600 dark:text-purple-400',
    barActive: 'bg-purple-600 dark:bg-purple-500',
    barDim: 'bg-purple-400/25 dark:bg-purple-500/20',
    ring: 'hover:border-purple-400 dark:hover:border-purple-500 focus-visible:ring-purple-500',
    rowSelected: 'bg-purple-50/90 dark:bg-purple-950/40',
    borderTop: 'border-t-purple-500',
    borderLeft: 'border-l-purple-500',
    hex: '#9333ea',
  },
  rose: {
    badgeBg: 'bg-rose-600 text-white',
    text: 'text-rose-600 dark:text-rose-400',
    barActive: 'bg-rose-600 dark:bg-rose-500',
    barDim: 'bg-rose-400/25 dark:bg-rose-500/20',
    ring: 'hover:border-rose-400 dark:hover:border-rose-500 focus-visible:ring-rose-500',
    rowSelected: 'bg-rose-50/90 dark:bg-rose-950/40',
    borderTop: 'border-t-rose-500',
    borderLeft: 'border-l-rose-500',
    hex: '#e11d48',
  },
  violet: {
    badgeBg: 'bg-violet-600 text-white',
    text: 'text-violet-600 dark:text-violet-400',
    barActive: 'bg-violet-600 dark:bg-violet-500',
    barDim: 'bg-violet-400/25 dark:bg-violet-500/20',
    ring: 'hover:border-violet-400 dark:hover:border-violet-500 focus-visible:ring-violet-500',
    rowSelected: 'bg-violet-50/90 dark:bg-violet-950/40',
    borderTop: 'border-t-violet-500',
    borderLeft: 'border-l-violet-500',
    hex: '#7c3aed',
  },
  lime: {
    badgeBg: 'bg-lime-600 text-white',
    text: 'text-lime-600 dark:text-lime-400',
    barActive: 'bg-lime-600 dark:bg-lime-500',
    barDim: 'bg-lime-400/25 dark:bg-lime-500/20',
    ring: 'hover:border-lime-400 dark:hover:border-lime-500 focus-visible:ring-lime-500',
    rowSelected: 'bg-lime-50/90 dark:bg-lime-950/40',
    borderTop: 'border-t-lime-500',
    borderLeft: 'border-l-lime-500',
    hex: '#65a30d',
  },
  fuchsia: {
    badgeBg: 'bg-fuchsia-600 text-white',
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    barActive: 'bg-fuchsia-600 dark:bg-fuchsia-500',
    barDim: 'bg-fuchsia-400/25 dark:bg-fuchsia-500/20',
    ring: 'hover:border-fuchsia-400 dark:hover:border-fuchsia-500 focus-visible:ring-fuchsia-500',
    rowSelected: 'bg-fuchsia-50/90 dark:bg-fuchsia-950/40',
    borderTop: 'border-t-fuchsia-500',
    borderLeft: 'border-l-fuchsia-500',
    hex: '#c026d3',
  },
  slate: {
    badgeBg: 'bg-slate-700 text-white',
    text: 'text-slate-700 dark:text-slate-300',
    barActive: 'bg-slate-700 dark:bg-slate-400',
    barDim: 'bg-slate-400/25 dark:bg-slate-500/20',
    ring: 'hover:border-slate-400 dark:hover:border-slate-500 focus-visible:ring-slate-500',
    rowSelected: 'bg-slate-100/90 dark:bg-slate-800/60',
    borderTop: 'border-t-slate-500',
    borderLeft: 'border-l-slate-500',
    hex: '#475569',
  },
};

export const SLOT_THEME: Record<CompareSlot, SlotTheme> = {
  A: COLOR_PALETTES.blue,
  B: COLOR_PALETTES.rose,
  C: COLOR_PALETTES.violet,
  D: COLOR_PALETTES.emerald,
  E: COLOR_PALETTES.amber,
  F: COLOR_PALETTES.cyan,
  G: COLOR_PALETTES.fuchsia,
  H: COLOR_PALETTES.lime,
};

const PALETTE_ORDER: PaletteKey[] = [
  'blue',
  'orange',
  'teal',
  'violet',
  'rose',
  'emerald',
  'amber',
  'indigo',
  'cyan',
  'sky',
  'pink',
  'red',
  'purple',
  'lime',
  'fuchsia',
  'slate',
];

function getPreferredPaletteKeys(model: ModelRecord): PaletteKey[] {
  const hay = `${model.companyName} ${model.creatorClean} ${model.displayName} ${model.faviconUrl}`.toLowerCase();
  if (hay.includes('google') || hay.includes('gemini') || hay.includes('gemma')) {
    return ['blue', 'emerald', 'amber', 'red'];
  }
  if (hay.includes('anthropic') || hay.includes('claude')) {
    return ['orange', 'rose', 'amber', 'red'];
  }
  if (hay.includes('openai') || hay.includes('chatgpt') || /\bgpt[-\s]?\d|\bo[134]\b/i.test(hay)) {
    return ['teal', 'emerald', 'slate', 'indigo'];
  }
  if (hay.includes('deepseek')) {
    return ['indigo', 'blue', 'sky', 'cyan'];
  }
  if (hay.includes('meta') || hay.includes('muse') || hay.includes('llama')) {
    return ['sky', 'blue', 'indigo', 'cyan'];
  }
  if (hay.includes('alibaba') || hay.includes('qwen')) {
    return ['amber', 'orange', 'violet', 'purple'];
  }
  if (hay.includes('mistral')) {
    return ['red', 'orange', 'amber', 'rose'];
  }
  if (hay.includes('kimi') || hay.includes('moonshot')) {
    return ['cyan', 'sky', 'teal', 'blue'];
  }
  if (hay.includes('minimax')) {
    return ['pink', 'fuchsia', 'rose', 'purple'];
  }
  if (hay.includes('xai') || hay.includes('spacexai') || hay.includes('grok')) {
    return ['purple', 'slate', 'violet', 'indigo'];
  }
  if (hay.includes('xiaomi') || hay.includes('mimo')) {
    return ['rose', 'orange', 'red', 'amber'];
  }
  if (hay.includes('nvidia') || hay.includes('nemotron')) {
    return ['lime', 'emerald', 'teal'];
  }
  if (hay.includes('z ai') || hay.includes('z.ai') || hay.includes('glm') || hay.includes('zhipu')) {
    return ['lime', 'cyan', 'teal', 'emerald'];
  }
  if (hay.includes('thinking') || hay.includes('inkling')) {
    return ['violet', 'purple', 'indigo'];
  }
  if (hay.includes('amazon') || hay.includes('nova')) {
    return ['amber', 'orange', 'sky'];
  }
  if (hay.includes('tencent') || /\bhy\d/i.test(hay)) {
    return ['sky', 'teal', 'blue'];
  }
  if (hay.includes('inclusion') || hay.includes('ling')) {
    return ['emerald', 'teal', 'cyan'];
  }
  if (hay.includes('baidu') || hay.includes('ernie')) {
    return ['blue', 'red', 'indigo'];
  }
  if (hay.includes('inception') || hay.includes('mercury')) {
    return ['fuchsia', 'violet', 'indigo'];
  }
  if (hay.includes('upstage') || hay.includes('solar')) {
    return ['purple', 'amber', 'violet'];
  }
  return PALETTE_ORDER;
}

/**
 * Assigns each active comparison slot a distinct theme aligned with the model/lab's
 * favicon brand color, automatically picking non-colliding companion colors when
 * multiple models from the same company are compared side-by-side.
 */
export function resolveSlotThemes(
  activeSlots: { slot: CompareSlot; model: ModelRecord }[]
): Record<CompareSlot, SlotTheme> {
  const result: Record<CompareSlot, SlotTheme> = { ...SLOT_THEME };
  const used = new Set<PaletteKey>();

  for (const { slot, model } of activeSlots) {
    const prefs = getPreferredPaletteKeys(model);
    const chosen =
      prefs.find((k) => !used.has(k)) ??
      PALETTE_ORDER.find((k) => !used.has(k)) ??
      'blue';
    used.add(chosen);
    result[slot] = COLOR_PALETTES[chosen];
  }

  return result;
}

export interface CategoryComparisonEntry {
  slot: CompareSlot;
  model: ModelRecord;
  raw: number | null | undefined;
  val: number | null;
  contrib: number | null;
}

export interface CategoryComparisonRow {
  comp: (typeof BENCHMARK_COMPONENTS)[number];
  label: string;
  sourceName: string;
  sourceUrl?: string;
  entries: CategoryComparisonEntry[];
  winners: CompareSlot[];
  margin: number;
  isTie: boolean;
  isRescaled: boolean;
}

export interface CompareSummaryStats {
  wins: Record<CompareSlot, number>;
  ties: number;
  comparableCount: number;
  bestEdge: Record<CompareSlot, { label: string; margin: number; color: string } | null>;
}

export function getScoreForMode(model: ModelRecord, mode: ScoreMode): number | null {
  if (mode === 'old') return model.scoreOld ?? model.scoreOldReported ?? null;
  if (mode === 'worstCase') return model.scoreWorstCase ?? model.scoreWorstCaseReported ?? null;
  return model.scoreNew ?? model.scoreNewReported ?? (model.hasAll8Benchmarks ? model.scoreNewCalculated : null);
}

export function formatNumber(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number.isInteger(val) ? val.toString() : val.toFixed(decimals);
}

export function formatCompactPrice(model: ModelRecord, lang: Language): string | null {
  const raw = lang === 'de' ? model.priceDeMonthly : model.priceUsMonthly;
  if (!raw) return null;
  const clean = raw.trim();
  if (
    !clean ||
    clean === '-' ||
    clean.toLowerCase() === 'n/a' ||
    clean.toLowerCase().includes('abokosten') ||
    clean.toLowerCase().includes('monthly cost')
  ) {
    return null;
  }
  const rounded = roundCurrencyString(clean);
  if (rounded.includes('€')) {
    return rounded.replace(/\s*€/g, '€') + (lang === 'de' ? ' / Mon.' : ' / mo');
  }
  if (rounded.includes('$')) {
    return rounded.replace(/\s*\$/g, '$').replace(/\$\s+/g, '$') + (lang === 'de' ? ' / Mon.' : ' / mo');
  }
  return roundCurrencyTokensInText(rounded);
}

export function extractNumericPrice(model: ModelRecord, lang: Language): number | null {
  if (!model.isPaid) return 0;
  const raw = (lang === 'de' ? model.priceDeMonthly : model.priceUsMonthly) || model.priceUsMonthly || model.priceDeMonthly || '';
  const cleaned = roundCurrencyString(raw);
  const match = cleaned.match(/(\d+)/);
  if (match) {
    const val = parseInt(match[1], 10);
    if (Number.isFinite(val)) return val;
  }
  return model.isPaid ? 20 : 0;
}

export function getPriceBucket(model: ModelRecord, lang: Language): 'free' | 'plus' | 'pro' {
  const num = extractNumericPrice(model, lang);
  if (!model.isPaid || num === 0) return 'free';
  if (num !== null && num > 35) return 'pro';
  return 'plus';
}

export function isZoomedCompany(model: ModelRecord): boolean {
  const norm = `${model.companyName} ${model.creatorClean} ${model.displayName}`.toLowerCase();
  return (
    norm.includes('google') ||
    norm.includes('anthropic') ||
    norm.includes('openai') ||
    norm.includes('chatgpt') ||
    norm.includes('gpt') ||
    norm.includes('meta')
  );
}

export function getRow33Source(
  compId: string,
  row33Meta?: Row33Metadata
): { text?: string; url?: string } {
  if (!row33Meta) return {};
  const map: Record<string, keyof Row33Metadata['benchmarks']> = {
    actCodeReason: 'actCodeReason',
    nonHallucination: 'nonHallucination',
    scienceKnowledge: 'scienceKnowledge',
    visionPlot: 'visionPlot',
    medReasoning: 'medReasoning',
    excelAgent: 'excelAgent',
    trickQuestions: 'trickQuestions',
    econLegal: 'econLegal',
  };
  const key = map[compId];
  if (key && row33Meta.benchmarks) {
    const item = row33Meta.benchmarks[key];
    return { text: item?.text, url: item?.sourceUrl };
  }
  if (row33Meta.retiredBenchmarks) {
    const retiredMap: Record<string, keyof NonNullable<Row33Metadata['retiredBenchmarks']>> = {
      iqOld: 'iqOld',
      nonHalluOld: 'nonHalluOld',
      scienceKnowledgeOld: 'scienceKnowledgeOld',
      trickQuestionsOld: 'trickQuestionsOld',
    };
    const retiredKey = retiredMap[compId];
    if (retiredKey) {
      const item = row33Meta.retiredBenchmarks[retiredKey];
      return { text: item?.text, url: item?.sourceUrl };
    }
  }
  return {};
}

export function pickNewestCompareModels(
  pool: ModelRecord[],
  count: number,
  mode: ScoreMode
): ModelRecord[] {
  if (pool.length === 0) return [];
  const datedPool = pool.filter(
    (m) => Boolean(m.hasConcreteReleaseDate) && /^\d{4}-\d{2}-\d{2}$/.test(m.releaseDate || '')
  );
  const scoredDatedPool = datedPool.filter((m) => getScoreForMode(m, mode) !== null);
  const candidatePool =
    scoredDatedPool.length >= count
      ? scoredDatedPool
      : datedPool.length > 0
      ? datedPool
      : pool;
  return [...candidatePool]
    .sort((a, b) => {
      const cmp = (b.releaseDate || '').localeCompare(a.releaseDate || '');
      if (cmp !== 0) return cmp;
      return (getScoreForMode(b, mode) ?? -9999) - (getScoreForMode(a, mode) ?? -9999);
    })
    .slice(0, Math.min(count, candidatePool.length));
}

export function pickDefaultCompareIds(
  pool: ModelRecord[],
  count: number,
  mode: ScoreMode
): string[] {
  if (pool.length === 0) return [];
  return pickTopDiverseModels(pool, Math.min(count, pool.length), mode).map((m) => m.id);
}

export function pickTopDiverseModels(pool: ModelRecord[], count: number, mode: ScoreMode): ModelRecord[] {
  const sorted = [...pool].sort((a, b) => {
    const sa = getScoreForMode(a, mode) ?? -9999;
    const sb = getScoreForMode(b, mode) ?? -9999;
    if (sb !== sa) return sb - sa;
    return (b.scoreNewCalculated ?? 0) - (a.scoreNewCalculated ?? 0);
  });
  const chosen: ModelRecord[] = [];
  const usedIds = new Set<string>();
  const usedLabs = new Set<string>();

  for (const m of sorted) {
    if (chosen.length >= count) break;
    const labKey = m.companyName.trim().toLowerCase();
    if (!usedLabs.has(labKey)) {
      chosen.push(m);
      usedIds.add(m.id);
      usedLabs.add(labKey);
    }
  }
  for (const m of sorted) {
    if (chosen.length >= count) break;
    if (!usedIds.has(m.id)) {
      chosen.push(m);
      usedIds.add(m.id);
    }
  }
  return chosen;
}

export type SizeClassKey = 'small' | 'large' | 'massive' | 'colossal' | 'planetary' | 'singularity';

export const SIZE_CLASS_LABELS: Record<SizeClassKey, { de: string; en: string }> = {
  small: { de: 'Small / Medium (< 128B)', en: 'Small / Medium (< 128B)' },
  large: { de: 'Large (< 256B)', en: 'Large (< 256B)' },
  massive: { de: 'Massive (< 512B)', en: 'Massive (< 512B)' },
  colossal: { de: 'Colossal (< 1,5T)', en: 'Colossal (< 1.5T)' },
  planetary: { de: 'Planetary (< 5T)', en: 'Planetary (< 5T)' },
  singularity: { de: 'Singularity (< 15T)', en: 'Singularity (< 15T)' },
};

export function normLabKey(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const LAB_COMPANY_ALIASES: Record<string, string[]> = {
  spacexai: ['spacexsi', 'xai'],
  spacexsi: ['spacexai', 'xai'],
  xai: ['spacexsi', 'spacexai'],
  zai: ['zhipu'],
  zhipu: ['zai'],
  kimi: ['moonshot'],
  moonshot: ['kimi'],
  mistral: ['mistralai'],
  mistralai: ['mistral'],
  thinking: ['thinkingmachines'],
  thinkingmachines: ['thinking'],
  ssi: ['ssiinc'],
  ssiinc: ['ssi'],
  inclusionai: ['antgroup'],
  antgroup: ['inclusionai'],
  longcat: ['meituan'],
  meituan: ['longcat'],
  hy: ['tencent'],
};

export function findMatchingLabForModel(model: ModelRecord, labs: LabEntry[]): LabEntry | undefined {
  const companyNorms = [normLabKey(model.companyName), normLabKey(model.creatorClean)].filter(Boolean);
  const expandedNorms = new Set<string>(companyNorms);
  for (const c of companyNorms) {
    for (const alias of LAB_COMPANY_ALIASES[c] || []) {
      expandedNorms.add(alias);
    }
  }

  // Pass 1: exact normalized creator match
  for (const l of labs) {
    const lc = normLabKey(l.creator);
    if (lc && expandedNorms.has(lc)) return l;
  }

  // Pass 2: substring normalized creator match (min length 4 to avoid spurious short hits)
  for (const l of labs) {
    const lc = normLabKey(l.creator);
    if (lc.length < 4) continue;
    for (const c of expandedNorms) {
      if (c.length >= 4 && (c.includes(lc) || lc.includes(c))) return l;
    }
  }

  // Pass 3: word-bounded engineName fallback (skip 1-2 char / punctuation names like "M", "N", "-")
  const haystack = `${model.displayName} ${model.name}`.toLowerCase();
  for (const l of labs) {
    const le = (l.engineName || '').trim().toLowerCase();
    if (normLabKey(le).length < 3) continue;
    const esc = le.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${esc}\\b`, 'i').test(haystack)) return l;
  }

  return undefined;
}

export function inferModelSizeClassFromParamCount(modelHaystack: string): SizeClassKey | null {
  const match = modelHaystack.match(/\b(\d+(?:\.\d+)?)\s*([bt])\b/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(val) || val <= 0) return null;
  const billions = unit === 't' ? val * 1000 : val;
  if (billions < 128) return 'small';
  if (billions < 256) return 'large';
  if (billions < 512) return 'massive';
  if (billions < 1500) return 'colossal';
  if (billions < 5000) return 'planetary';
  return 'singularity';
}

export function inferModelSizeClass(model: ModelRecord, labs: LabEntry[]): SizeClassKey | null {
  const modelHaystack = `${model.displayName} ${model.name}`.toLowerCase();
  const matchingLab = findMatchingLabForModel(model, labs);

  const tierMap: Array<{
    cls: SizeClassKey;
    keys: Array<keyof LabEntry['parameterSizes']>;
  }> = [
    { cls: 'singularity', keys: ['singularity', 'godTier'] },
    { cls: 'planetary', keys: ['planetary'] },
    { cls: 'colossal', keys: ['colossal'] },
    { cls: 'massive', keys: ['massive'] },
    { cls: 'large', keys: ['large'] },
    { cls: 'small', keys: ['micro', 'mini', 'tiny', 'small', 'medium'] },
  ];

  if (matchingLab) {
    const engineTokens = new Set(
      (matchingLab.engineName || '')
        .toLowerCase()
        .split(/[\s/,&+;()]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2)
    );
    const creatorNorm = normLabKey(matchingLab.creator);

    let bestCls: SizeClassKey | null = null;
    // Specificity: 2 = explicit tier keyword (e.g. Max, Plus, Sonnet, Haiku),
    //              1 = versioned tier token (e.g. v4 -> Grok 4.7, v3 -> M3),
    //              0 = bare family/engine name reused as a tier (e.g. "Qwen", "GLM", "Inkling")
    let bestSpecificity = -1;
    let bestLen = 0;

    for (const entry of tierMap) {
      for (const k of entry.keys) {
        const raw = matchingLab.parameterSizes[k];
        if (!raw || raw.trim() === '-') continue;
        const tokens = raw
          .replace(/[()]/g, ' ')
          .split(/[,/&+;]+/)
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length >= 1 && t !== 'llm' && t !== '-');

        for (const tok of tokens) {
          if (tok.length < 2 && !/^[a-z]$/i.test(tok)) continue;
          const isGenericFamily = engineTokens.has(tok) || normLabKey(tok) === creatorNorm;
          const vMatch = tok.match(/^v(\d+(?:\.\d+)?)$/);

          let hit = false;
          let specificity = isGenericFamily ? 0 : 2;

          if (vMatch) {
            const escVer = vMatch[1].replace('.', '\\.');
            hit = new RegExp(`(?:\\b|[a-z])${escVer}(?:\\.\\d+)?\\b`, 'i').test(modelHaystack);
            specificity = 1;
          } else {
            const escTok = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const wordHit = new RegExp(`\\b${escTok}\\b`, 'i').test(modelHaystack);
            hit = wordHit || (tok.length >= 5 && modelHaystack.includes(tok));
          }

          if (hit) {
            if (
              specificity > bestSpecificity ||
              (specificity === bestSpecificity && tok.length > bestLen)
            ) {
              bestSpecificity = specificity;
              bestLen = tok.length;
              bestCls = entry.cls;
            }
          }
        }
      }
    }

    // Explicit parameter size in model name (e.g. "Qwen3.8 27B", "Qwen3.5 397B")
    // overrides a generic bare-family match (specificity <= 0).
    if (bestSpecificity <= 0) {
      const byParam = inferModelSizeClassFromParamCount(modelHaystack);
      if (byParam) return byParam;
    }

    if (bestCls) return bestCls;
  }

  const byParam = inferModelSizeClassFromParamCount(modelHaystack);
  if (byParam) return byParam;

  // Fallback heuristics for common frontier & small model families
  if (/\b(fable|mythos|carbon|astra|wonder full|5\.4 pro|5\.2 pro)\b/i.test(modelHaystack)) return 'singularity';
  if (/\b(opus|argon|sol|wonder|grok[- ]4(?:\.\d+)?|qwen[- ]?(?:\d+(?:\.\d+)?[- ]+)?max|deepseek[- ]?(?:\d+(?:\.\d+)?[- ]+)?pro)\b/i.test(modelHaystack)) return 'planetary';
  if (/\b(hydrogen|gemini pro|2\.5 pro|3\.0 pro|3 pro|grok[- ]3(?:\.\d+)?)\b/i.test(modelHaystack)) return 'colossal';
  if (/\b(sonnet|flash(?!-lite)|terra|spark|qwen[- ]?(?:\d+(?:\.\d+)?[- ]+)?plus|deepseek v3|r1)\b/i.test(modelHaystack)) return 'massive';
  if (/\b(haiku|gemma|flash-lite|luna|glimmer|ember|mini|nano|lite|8b|7b|9b|4b|14b|27b|32b)\b/i.test(modelHaystack)) return 'small';
  return null;
}
