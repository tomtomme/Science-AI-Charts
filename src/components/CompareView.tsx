import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Search,
  Check,
  Trophy,
  Globe,
  BookOpen,
  X,
  Sparkles,
  Tag,
  Building2,
  Ruler,
  RotateCw,
  Minus,
  Plus,
  BarChart3,
  Radar,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  ActiveBenchmarkKey,
  BenchmarkWeights,
  LabEntry,
  ModelRecord,
  ScoreMode,
  ModelScope,
  Row33Metadata,
} from '../types';
import { getNormalizedWeights } from '../utils/weighting';
import {
  BENCHMARK_COMPONENTS,
  RETIRED_TIMELINE_BENCHMARKS,
  getBenchmarkCategoryLabel,
  getCompositeScoreLabel,
} from '../data/benchmarks';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { matchesSearchQuery } from '../utils/searchUtils';
import { translateStoryline } from '../utils/storylineHelper';
import { roundCurrencyString, roundCurrencyTokensInText } from '../utils/priceFormat';

const BENCHMARK_ANCHOR_MAP: Record<string, string> = {
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

const COMPARE_SLOTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
type CompareSlot = (typeof COMPARE_SLOTS)[number];
const MAX_COMPARE_MODELS = 8;
type PresetKind = 'newest' | 'same_price' | 'same_family' | 'same_size';

const SLOT_THEME: Record<
  CompareSlot,
  {
    badgeBg: string;
    text: string;
    barActive: string;
    barDim: string;
    ring: string;
    rowSelected: string;
    borderTop: string;
    hex: string;
  }
> = {
  A: {
    badgeBg: 'bg-blue-600 text-white',
    text: 'text-blue-600 dark:text-blue-400',
    barActive: 'bg-blue-600 dark:bg-blue-500',
    barDim: 'bg-blue-400/65 dark:bg-blue-500/45',
    ring: 'hover:border-blue-400 dark:hover:border-blue-500 focus-visible:ring-blue-500',
    rowSelected: 'bg-blue-50/90 dark:bg-blue-950/40',
    borderTop: 'border-t-blue-500',
    hex: '#2563eb',
  },
  B: {
    badgeBg: 'bg-rose-600 text-white',
    text: 'text-rose-600 dark:text-rose-400',
    barActive: 'bg-rose-600 dark:bg-rose-500',
    barDim: 'bg-rose-400/65 dark:bg-rose-500/45',
    ring: 'hover:border-rose-400 dark:hover:border-rose-500 focus-visible:ring-rose-500',
    rowSelected: 'bg-rose-50/90 dark:bg-rose-950/40',
    borderTop: 'border-t-rose-500',
    hex: '#e11d48',
  },
  C: {
    badgeBg: 'bg-violet-600 text-white',
    text: 'text-violet-600 dark:text-violet-400',
    barActive: 'bg-violet-600 dark:bg-violet-500',
    barDim: 'bg-violet-400/65 dark:bg-violet-500/45',
    ring: 'hover:border-violet-400 dark:hover:border-violet-500 focus-visible:ring-violet-500',
    rowSelected: 'bg-violet-50/90 dark:bg-violet-950/40',
    borderTop: 'border-t-violet-500',
    hex: '#7c3aed',
  },
  D: {
    badgeBg: 'bg-emerald-600 text-white',
    text: 'text-emerald-600 dark:text-emerald-400',
    barActive: 'bg-emerald-600 dark:bg-emerald-500',
    barDim: 'bg-emerald-400/65 dark:bg-emerald-500/45',
    ring: 'hover:border-emerald-400 dark:hover:border-emerald-500 focus-visible:ring-emerald-500',
    rowSelected: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    borderTop: 'border-t-emerald-500',
    hex: '#059669',
  },
  E: {
    badgeBg: 'bg-amber-600 text-white',
    text: 'text-amber-600 dark:text-amber-400',
    barActive: 'bg-amber-600 dark:bg-amber-500',
    barDim: 'bg-amber-400/65 dark:bg-amber-500/45',
    ring: 'hover:border-amber-400 dark:hover:border-amber-500 focus-visible:ring-amber-500',
    rowSelected: 'bg-amber-50/90 dark:bg-amber-950/40',
    borderTop: 'border-t-amber-500',
    hex: '#d97706',
  },
  F: {
    badgeBg: 'bg-cyan-600 text-white',
    text: 'text-cyan-600 dark:text-cyan-400',
    barActive: 'bg-cyan-600 dark:bg-cyan-500',
    barDim: 'bg-cyan-400/65 dark:bg-cyan-500/45',
    ring: 'hover:border-cyan-400 dark:hover:border-cyan-500 focus-visible:ring-cyan-500',
    rowSelected: 'bg-cyan-50/90 dark:bg-cyan-950/40',
    borderTop: 'border-t-cyan-500',
    hex: '#0891b2',
  },
  G: {
    badgeBg: 'bg-fuchsia-600 text-white',
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    barActive: 'bg-fuchsia-600 dark:bg-fuchsia-500',
    barDim: 'bg-fuchsia-400/65 dark:bg-fuchsia-500/45',
    ring: 'hover:border-fuchsia-400 dark:hover:border-fuchsia-500 focus-visible:ring-fuchsia-500',
    rowSelected: 'bg-fuchsia-50/90 dark:bg-fuchsia-950/40',
    borderTop: 'border-t-fuchsia-500',
    hex: '#c026d3',
  },
  H: {
    badgeBg: 'bg-lime-600 text-white',
    text: 'text-lime-600 dark:text-lime-400',
    barActive: 'bg-lime-600 dark:bg-lime-500',
    barDim: 'bg-lime-400/65 dark:bg-lime-500/45',
    ring: 'hover:border-lime-400 dark:hover:border-lime-500 focus-visible:ring-lime-500',
    rowSelected: 'bg-lime-50/90 dark:bg-lime-950/40',
    borderTop: 'border-t-lime-500',
    hex: '#65a30d',
  },
};

interface CompareViewProps {
  allModels: ModelRecord[];
  rankedModels: ModelRecord[];
  labs?: LabEntry[];
  scoreMode: ScoreMode;
  scope: ModelScope;
  lang: Language;
  categoryNames?: string[];
  isPreTranslatedCategoryNames?: boolean;
  compositeScoreNames?: string[];
  isPreTranslatedCompositeScoreNames?: boolean;
  retiredCategoryNames?: string[];
  isPreTranslatedRetiredCategoryNames?: boolean;
  row33Meta?: Row33Metadata;
  benchmarkWeights?: BenchmarkWeights;
  isCustomWeighted?: boolean;
  onScrollToParagraph?: (targetId: string) => void;
  onSelectCompany?: (company: string) => void;
}

function getScoreForMode(model: ModelRecord, mode: ScoreMode): number | null {
  if (mode === 'old') return model.scoreOld ?? model.scoreOldReported ?? null;
  if (mode === 'worstCase') return model.scoreWorstCase ?? model.scoreWorstCaseReported ?? null;
  return model.scoreNew ?? model.scoreNewReported ?? (model.hasAll8Benchmarks ? model.scoreNewCalculated : null);
}

function formatNumber(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number.isInteger(val) ? val.toString() : val.toFixed(decimals);
}

function formatCompactPrice(model: ModelRecord, lang: Language): string | null {
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

function extractNumericPrice(model: ModelRecord, lang: Language): number | null {
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

function getPriceBucket(model: ModelRecord, lang: Language): 'free' | 'plus' | 'pro' {
  const num = extractNumericPrice(model, lang);
  if (!model.isPaid || num === 0) return 'free';
  if (num !== null && num > 35) return 'pro';
  return 'plus';
}

function isZoomedCompany(model: ModelRecord): boolean {
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

function getRow33Source(
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

function pickNewestCompareModels(
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

function pickDefaultCompareIds(
  pool: ModelRecord[],
  count: number,
  mode: ScoreMode
): string[] {
  if (pool.length === 0) return [];
  return pickTopDiverseModels(pool, Math.min(count, pool.length), mode).map((m) => m.id);
}

function pickTopDiverseModels(pool: ModelRecord[], count: number, mode: ScoreMode): ModelRecord[] {
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

type SizeClassKey = 'small' | 'large' | 'massive' | 'colossal' | 'planetary' | 'singularity';

const SIZE_CLASS_LABELS: Record<SizeClassKey, { de: string; en: string }> = {
  small: { de: 'Small / Medium (< 128B)', en: 'Small / Medium (< 128B)' },
  large: { de: 'Large (< 256B)', en: 'Large (< 256B)' },
  massive: { de: 'Massive (< 512B)', en: 'Massive (< 512B)' },
  colossal: { de: 'Colossal (< 1,5T)', en: 'Colossal (< 1.5T)' },
  planetary: { de: 'Planetary (< 5T)', en: 'Planetary (< 5T)' },
  singularity: { de: 'Singularity (< 15T)', en: 'Singularity (< 15T)' },
};

function normLabKey(s: string): string {
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

function findMatchingLabForModel(model: ModelRecord, labs: LabEntry[]): LabEntry | undefined {
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

function inferModelSizeClassFromParamCount(modelHaystack: string): SizeClassKey | null {
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

function inferModelSizeClass(model: ModelRecord, labs: LabEntry[]): SizeClassKey | null {
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

interface ModelSelectorProps {
  slot: CompareSlot;
  selectedModel: ModelRecord | null;
  otherSlotsByModelId: Map<string, CompareSlot>;
  models: ModelRecord[];
  rankMap: Map<string, number>;
  scoreMode: ScoreMode;
  lang: Language;
  alignRight?: boolean;
  onSelect: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  slot,
  selectedModel,
  otherSlotsByModelId,
  models,
  rankMap,
  scoreMode,
  lang,
  alignRight = false,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'paid'>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 20);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      if (tierFilter === 'free' && m.isPaid && !m.isFreeApi) return false;
      if (tierFilter === 'paid' && !m.isPaid) return false;
      if (!query.trim()) return true;
      const target = `${m.displayName} ${m.name} ${m.companyName} ${m.creatorClean} ${m.creator || ''}`;
      return matchesSearchQuery(query, target);
    });
  }, [models, query, tierFilter]);

  const theme = SLOT_THEME[slot];

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 transition-colors cursor-pointer text-left focus:outline-hidden focus-visible:ring-2 ${theme.ring}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className={`w-5 h-5 rounded text-xs font-mono font-bold flex items-center justify-center shrink-0 ${theme.badgeBg}`}
          >
            {slot}
          </span>
          {selectedModel ? (
            <>
              <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shrink-0">
                <img
                  src={selectedModel.faviconUrl}
                  alt=""
                  className={`w-full h-full object-contain ${
                    isZoomedCompany(selectedModel) ? 'scale-135' : 'scale-105'
                  }`}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </span>
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {selectedModel.flag && (
                  <span className="text-xs shrink-0 leading-none">{selectedModel.flag}</span>
                )}
                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {selectedModel.displayName}
                </span>
                {selectedModel.isNew && (
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 shrink-0">
                    NEW
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {lang === 'de' ? 'Chatbot auswählen…' : 'Select chatbot…'}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${alignRight ? 'right-0' : 'left-0'} w-full min-w-[min(320px,88vw)] top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden`}
        >
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/70 dark:bg-slate-950/60">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  lang === 'de'
                    ? 'Modell oder Hersteller suchen…'
                    : 'Search model or company…'
                }
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  aria-label={lang === 'de' ? 'Suche leeren' : 'Clear search'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-md p-0.5 text-xs font-mono font-semibold">
                {(['all', 'free', 'paid'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTierFilter(tier)}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      tierFilter === tier
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    {tier === 'all'
                      ? lang === 'de'
                        ? 'Alle'
                        : 'All'
                      : tier === 'free'
                      ? lang === 'de'
                        ? 'Gratis / API'
                        : 'Free / API'
                      : lang === 'de'
                      ? 'Bezahlt'
                      : 'Paid'}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                {filteredModels.length} {lang === 'de' ? 'Treffer' : 'models'}
              </span>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
            {filteredModels.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-600 dark:text-slate-400">
                {lang === 'de'
                  ? 'Kein passender Chatbot gefunden.'
                  : 'No matching chatbot found.'}
              </div>
            ) : (
              filteredModels.map((m) => {
                const isSelected = selectedModel?.id === m.id;
                const otherSlot = !isSelected ? otherSlotsByModelId.get(m.id) : undefined;
                const rank = rankMap.get(m.id);
                const activeScore = getScoreForMode(m, scoreMode);
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelect(m.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                      isSelected ? theme.rowSelected : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-8 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 shrink-0 text-right">
                        {rank ? `#${rank}` : '—'}
                      </span>
                      <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shrink-0">
                        <img
                          src={m.faviconUrl}
                          alt=""
                          className={`w-full h-full object-contain ${
                            isZoomedCompany(m) ? 'scale-135' : 'scale-105'
                          }`}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {m.flag && (
                            <span className="text-xs shrink-0 leading-none">{m.flag}</span>
                          )}
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {m.displayName}
                          </span>
                          {m.isNew && (
                            <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0">
                              NEW
                            </span>
                          )}
                          {!m.isAvailable && (
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 shrink-0">
                              (Hist.)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {m.companyName}
                          {m.releaseDate ? ` · ${m.releaseDate}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {otherSlot && (
                        <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                          ↔ {otherSlot}
                        </span>
                      )}
                      {isSelected && <Check className={`w-3.5 h-3.5 ${theme.text}`} />}
                      <span className="w-12 text-right font-mono tabular-nums text-xs font-bold text-slate-800 dark:text-slate-200">
                        {activeScore !== null ? formatNumber(activeScore, 1) : '—'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface CategoryComparisonEntry {
  slot: CompareSlot;
  model: ModelRecord;
  raw: number | null | undefined;
  val: number | null;
  contrib: number | null;
}

interface CategoryComparisonRow {
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

function wrapRadarLabel(label: string, maxChars = 16): string[] {
  const clean = label.trim();
  if (clean.length <= maxChars) return [clean];

  const words = clean.split(/\s+/);
  if (words.length === 1) return [clean];

  let bestSplit = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(' ');
    const line2 = words.slice(i).join(' ');
    const maxLen = Math.max(line1.length, line2.length);
    const diff = Math.abs(line1.length - line2.length) + (maxLen > maxChars ? 15 : 0);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i;
    }
  }

  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
}

interface BenchmarkRadarChartProps {
  categoryComparisons: CategoryComparisonRow[];
  activeSlots: { slot: CompareSlot; model: ModelRecord }[];
  primaryScores: { slot: CompareSlot; model: ModelRecord; score: number | null }[];
  rankMap: Map<string, number>;
  lang: Language;
  expandedCategoryId: string | null;
  onToggleExpandCategory: (categoryId: string) => void;
  onScrollToParagraph?: (targetId: string) => void;
  sourceLinkLabel: string;
}

const BenchmarkRadarChart: React.FC<BenchmarkRadarChartProps> = ({
  categoryComparisons,
  activeSlots,
  primaryScores,
  rankMap,
  lang,
  expandedCategoryId,
  onToggleExpandCategory,
  onScrollToParagraph,
  sourceLinkLabel,
}) => {
  const [hoveredSlot, setHoveredSlot] = useState<CompareSlot | null>(null);
  const [pinnedSlot, setPinnedSlot] = useState<CompareSlot | null>(null);
  const [hiddenSlots, setHiddenSlots] = useState<Set<CompareSlot>>(() => new Set());
  const [hoveredAxisIdx, setHoveredAxisIdx] = useState<number | null>(null);
  const [selectedAxisIdx, setSelectedAxisIdx] = useState<number>(0);
  const [scaleMode, setScaleMode] = useState<'full' | 'zoom'>('full');

  const activeSlotSet = useMemo(
    () => new Set(activeSlots.map((s) => s.slot)),
    [activeSlots]
  );

  const visibleSlots = useMemo(
    () => activeSlots.filter((s) => !hiddenSlots.has(s.slot)),
    [activeSlots, hiddenSlots]
  );

  const effectivePinnedSlot =
    pinnedSlot && activeSlotSet.has(pinnedSlot) && !hiddenSlots.has(pinnedSlot)
      ? pinnedSlot
      : null;
  const effectiveHoveredSlot =
    hoveredSlot && activeSlotSet.has(hoveredSlot) && !hiddenSlots.has(hoveredSlot)
      ? hoveredSlot
      : null;
  const focusedSlot = effectiveHoveredSlot ?? effectivePinnedSlot;

  const safeSelectedAxisIdx =
    selectedAxisIdx < categoryComparisons.length ? selectedAxisIdx : 0;
  const safeHoveredAxisIdx =
    hoveredAxisIdx !== null && hoveredAxisIdx < categoryComparisons.length
      ? hoveredAxisIdx
      : null;
  const inspectedAxisIdx = safeHoveredAxisIdx ?? safeSelectedAxisIdx;
  const inspectedRow = categoryComparisons[inspectedAxisIdx] ?? categoryComparisons[0];

  // Compute zoom floor if user enables zoomed scale
  const minFloor = useMemo(() => {
    if (scaleMode === 'full') return 0;
    const vals: number[] = [];
    for (const row of categoryComparisons) {
      for (const entry of row.entries) {
        if (!hiddenSlots.has(entry.slot) && entry.val !== null) {
          vals.push(entry.val);
        }
      }
    }
    if (vals.length === 0) return 0;
    const minVal = Math.min(...vals);
    const floor = Math.max(0, Math.min(70, Math.floor((minVal - 8) / 10) * 10));
    return floor >= 20 ? floor : 0;
  }, [categoryComparisons, hiddenSlots, scaleMode]);

  const canZoom = useMemo(() => {
    const vals: number[] = [];
    for (const row of categoryComparisons) {
      for (const entry of row.entries) {
        if (!hiddenSlots.has(entry.slot) && entry.val !== null) {
          vals.push(entry.val);
        }
      }
    }
    if (vals.length === 0) return false;
    return Math.floor((Math.min(...vals) - 8) / 10) * 10 >= 20;
  }, [categoryComparisons, hiddenSlots]);

  const ratioForVal = (val: number) => {
    const span = 100 - minFloor;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(1, (val - minFloor) / span));
  };

  const cx = 370;
  const cy = 250;
  const R = 178;
  const axisCount = categoryComparisons.length || 8;
  const ringValues = useMemo(() => {
    const steps = 5;
    const arr: number[] = [];
    for (let i = 1; i <= steps; i++) {
      arr.push(Math.round(minFloor + ((100 - minFloor) * i) / steps));
    }
    return arr;
  }, [minFloor]);

  const getAxisAngle = (idx: number) => -Math.PI / 2 + (idx * 2 * Math.PI) / axisCount;

  const getPoint = (idx: number, radius: number) => {
    const angle = getAxisAngle(idx);
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Order visible slots so focused slot renders last (on top)
  const orderedSlotsForRender = useMemo(() => {
    if (!focusedSlot) return visibleSlots;
    return [
      ...visibleSlots.filter((s) => s.slot !== focusedSlot),
      ...visibleSlots.filter((s) => s.slot === focusedSlot),
    ];
  }, [visibleSlots, focusedSlot]);

  const defaultFillOpacity =
    visibleSlots.length <= 2
      ? 0.16
      : visibleSlots.length <= 4
      ? 0.11
      : visibleSlots.length <= 6
      ? 0.08
      : 0.06;

  const toggleSlotVisibility = (slot: CompareSlot) => {
    setHiddenSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) {
        next.delete(slot);
      } else {
        // Keep at least 1 model visible
        const remainingVisible = activeSlots.filter((s) => s.slot !== slot && !next.has(s.slot));
        if (remainingVisible.length === 0) return prev;
        next.add(slot);
      }
      return next;
    });
  };

  const expandedRow = expandedCategoryId
    ? categoryComparisons.find((r) => r.comp.id === expandedCategoryId) ?? null
    : null;

  return (
    <div className="p-2 sm:p-3 space-y-2.5">
      {/* Toolbar: Scale toggle + hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span>
            {lang === 'de'
              ? 'Modell anklicken zum Hervorheben · Achse überfahren oder klicken für Details'
              : 'Click a model to highlight · Hover or click an axis for details'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canZoom && (
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/90 p-0.5 text-xs font-mono font-bold">
              <button
                type="button"
                aria-pressed={scaleMode === 'full'}
                onClick={() => setScaleMode('full')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  scaleMode === 'full'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                0–100%
              </button>
              <button
                type="button"
                aria-pressed={scaleMode === 'zoom'}
                onClick={() => setScaleMode('zoom')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  scaleMode === 'zoom'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
                title={
                  lang === 'de'
                    ? 'Skala näher an den niedrigsten Wert heranzoomen'
                    : 'Zoom scale closer to the lowest score'
                }
              >
                Zoom
              </button>
            </div>
          )}
          {hiddenSlots.size > 0 && (
            <button
              type="button"
              onClick={() => setHiddenSlots(new Set())}
              className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {lang === 'de' ? 'Alle einblenden' : 'Show all'}
            </button>
          )}
        </div>
      </div>

      {/* Main Responsive Grid: Radar SVG + Interactive Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(290px,1fr)] gap-3 items-start">
        {/* Left: SVG Spider / Radar Chart */}
        <div className="relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-1 sm:p-1.5">
          <svg
            viewBox="0 0 740 504"
            className="w-full h-auto max-h-[560px] select-none overflow-visible"
            role="img"
            aria-label={
              lang === 'de'
                ? `Spinnennetzdiagramm über alle ${axisCount} Benchmarks`
                : `Radar chart across all ${axisCount} benchmarks`
            }
          >
            {/* Concentric Octagonal Grid Rings */}
            {ringValues.map((tickVal, rIdx) => {
              const ringR = ratioForVal(tickVal) * R;
              const ringPts = Array.from({ length: axisCount }, (_, i) => {
                const p = getPoint(i, ringR);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              }).join(' ');
              const isOuter = rIdx === ringValues.length - 1;
              return (
                <g key={tickVal}>
                  <polygon
                    points={ringPts}
                    fill={rIdx % 2 === 0 ? 'rgba(148, 163, 184, 0.04)' : 'none'}
                    className={
                      isOuter
                        ? 'stroke-slate-400 dark:stroke-slate-600'
                        : 'stroke-slate-300 dark:stroke-slate-800'
                    }
                    strokeWidth={isOuter ? 1.25 : 1}
                  />
                  {/* Scale tick label slightly right of top spoke */}
                  <text
                    x={cx + 6}
                    y={cy - ringR + (isOuter ? 12 : 4)}
                    fontSize="13"
                    fontFamily="var(--font-mono)"
                    className="fill-slate-700 dark:fill-slate-300 font-mono font-semibold"
                  >
                    {tickVal}%
                  </text>
                </g>
              );
            })}

            {/* Min-floor origin label if zoomed */}
            {minFloor > 0 && (
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize="13"
                fontFamily="var(--font-mono)"
                className="fill-slate-700 dark:fill-slate-300 font-mono font-semibold"
              >
                {minFloor}%
              </text>
            )}

            {/* Radial Axis Spokes + Hover Highlight */}
            {categoryComparisons.map((row, idx) => {
              const end = getPoint(idx, R);
              const isAxisActive = inspectedAxisIdx === idx;
              return (
                <line
                  key={row.comp.id}
                  x1={cx}
                  y1={cy}
                  x2={end.x}
                  y2={end.y}
                  className={
                    isAxisActive
                      ? 'stroke-slate-600 dark:stroke-slate-400'
                      : 'stroke-slate-300 dark:stroke-slate-800'
                  }
                  strokeWidth={isAxisActive ? 1.8 : 1}
                />
              );
            })}

            {/* Model Polygons (2 to 8 models, gaps dashed cleanly for null values) */}
            {orderedSlotsForRender.map(({ slot }) => {
              const theme = SLOT_THEME[slot];
              const isFocused = focusedSlot === slot;
              const isDimmed = focusedSlot !== null && !isFocused;

              const axisPts = categoryComparisons.map((row, idx) => {
                const entry = row.entries.find((e) => e.slot === slot);
                const val = entry?.val ?? null;
                if (val === null) return { idx, val: null as number | null, x: 0, y: 0 };
                const pt = getPoint(idx, ratioForVal(val) * R);
                return { idx, val, x: pt.x, y: pt.y };
              });

              const validPts = axisPts.filter((p) => p.val !== null);
              if (validPts.length === 0) return null;

              const polygonPoints = validPts
                .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(' ');

              const strokeWidth = isFocused ? 2.8 : isDimmed ? 1.3 : 2.0;
              const strokeOpacity = isFocused ? 1 : isDimmed ? 0.22 : 0.9;
              const fillOpacity = isFocused ? 0.22 : isDimmed ? 0.025 : defaultFillOpacity;

              // Build individual segments so missing axes show as dashed bridges
              const segments: {
                x1: number;
                y1: number;
                x2: number;
                y2: number;
                isGap: boolean;
                key: string;
              }[] = [];

              if (validPts.length >= 2) {
                const segLimit = validPts.length === 2 ? 1 : validPts.length;
                for (let k = 0; k < segLimit; k++) {
                  const a = validPts[k];
                  const b = validPts[(k + 1) % validPts.length];
                  const step = (b.idx - a.idx + axisCount) % axisCount;
                  segments.push({
                    x1: a.x,
                    y1: a.y,
                    x2: b.x,
                    y2: b.y,
                    isGap: step !== 1 && !(validPts.length === 2 && (a.idx - b.idx + axisCount) % axisCount === 1),
                    key: `${slot}-${a.idx}-${b.idx}`,
                  });
                }
              }

              return (
                <g
                  key={slot}
                  className="transition-opacity duration-150"
                  style={{ pointerEvents: 'none' }}
                >
                  {validPts.length >= 3 && (
                    <polygon
                      points={polygonPoints}
                      fill={theme.hex}
                      fillOpacity={fillOpacity}
                      stroke="none"
                    />
                  )}
                  {segments.map((seg) => (
                    <line
                      key={seg.key}
                      x1={seg.x1}
                      y1={seg.y1}
                      x2={seg.x2}
                      y2={seg.y2}
                      stroke={theme.hex}
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      strokeDasharray={seg.isGap ? '4 4' : undefined}
                      strokeLinecap="round"
                    />
                  ))}
                  {validPts.map((pt) => {
                    const isAxisHovered = inspectedAxisIdx === pt.idx;
                    const dotR = isFocused
                      ? isAxisHovered
                        ? 5.4
                        : 4.2
                      : isAxisHovered
                      ? 4.6
                      : isDimmed
                      ? 2.2
                      : 3.4;
                    return (
                      <circle
                        key={`${slot}-pt-${pt.idx}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={dotR}
                        fill={theme.hex}
                        fillOpacity={isDimmed ? 0.3 : 1}
                        stroke="white"
                        strokeWidth={isDimmed ? 0.6 : 1.3}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* Interactive Axis Hit Targets + Labels */}
            {categoryComparisons.map((row, idx) => {
              const angle = getAxisAngle(idx);
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);
              const labelDist = R + 18;
              const lx = cx + labelDist * cos;
              const ly = cy + labelDist * sin;

              const isTop = Math.abs(cos) < 0.15 && sin < -0.5;
              const isBottom = Math.abs(cos) < 0.15 && sin > 0.5;
              const isRight = cos > 0.15;
              const textAnchor: 'middle' | 'start' | 'end' =
                isTop || isBottom ? 'middle' : isRight ? 'start' : 'end';

              const lines = wrapRadarLabel(row.label, 16);
              const isAxisActive = inspectedAxisIdx === idx;
              const isExpanded = expandedCategoryId === row.comp.id;

              // Determine vertical baseline offset cleanly for both 5-axis and 8-axis geometry
              let baseDy = 0;
              if (isTop) {
                baseDy = lines.length > 1 ? -34 : -16;
              } else if (isBottom) {
                baseDy = 15;
              } else if (sin < -0.25) {
                baseDy = lines.length > 1 ? -14 : -4;
              } else if (sin > 0.25) {
                baseDy = 10;
              } else {
                baseDy = lines.length > 1 ? -7 : 2;
              }

              // Winner badge on visible models for this axis
              const visibleEntries = row.entries.filter(
                (e) => !hiddenSlots.has(e.slot) && e.val !== null
              );
              let axisLeaderText = '';
              let axisLeaderColor = '#475569';
              if (visibleEntries.length >= 2) {
                const sorted = [...visibleEntries].sort(
                  (a, b) => (b.val as number) - (a.val as number)
                );
                const topV = sorted[0].val as number;
                const ties = sorted.filter((e) => topV - (e.val as number) < 0.05);
                if (ties.length === visibleEntries.length) {
                  axisLeaderText = lang === 'de' ? 'Patt' : 'Tie';
                } else {
                  axisLeaderText = `${ties.map((t) => t.slot).join('/')} ${formatNumber(topV, 1)}%`;
                  axisLeaderColor = SLOT_THEME[ties[0].slot].hex;
                }
              } else if (visibleEntries.length === 1) {
                axisLeaderText = `${visibleEntries[0].slot} ${formatNumber(visibleEntries[0].val, 1)}%`;
                axisLeaderColor = SLOT_THEME[visibleEntries[0].slot].hex;
              }

              // Invisible spoke wedge hit-zone + clickable label group
              const spokeMid = getPoint(idx, R * 0.55);

              return (
                <g
                  key={`axis-label-${row.comp.id}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAxisIdx(idx)}
                  onMouseLeave={() => setHoveredAxisIdx(null)}
                  onClick={() => {
                    setSelectedAxisIdx(idx);
                    onToggleExpandCategory(row.comp.id);
                  }}
                >
                  {/* Generous invisible hit circle along spoke for smooth hovering */}
                  <circle cx={spokeMid.x} cy={spokeMid.y} r={34} fill="transparent" />
                  <circle
                    cx={getPoint(idx, R).x}
                    cy={getPoint(idx, R).y}
                    r={22}
                    fill="transparent"
                  />

                  {/* Category color dot at outer vertex */}
                  <circle
                    cx={getPoint(idx, R).x}
                    cy={getPoint(idx, R).y}
                    r={isAxisActive ? 4.5 : 3}
                    fill={row.comp.color}
                    className="transition-all duration-150"
                  />

                  {/* Axis Title */}
                  <text
                    x={lx}
                    y={ly + baseDy}
                    textAnchor={textAnchor}
                    fontSize="15"
                    fontFamily="var(--font-sans)"
                    fontWeight={isAxisActive || isExpanded ? 700 : 600}
                    className={
                      isAxisActive || isExpanded
                        ? 'fill-blue-700 dark:fill-blue-400'
                        : 'fill-black dark:fill-slate-100'
                    }
                  >
                    {lines.map((line, lineIdx) => (
                      <tspan key={lineIdx} x={lx} dy={lineIdx === 0 ? 0 : 18}>
                        {line}
                      </tspan>
                    ))}
                  </text>

                  {/* Sub-label showing axis leader */}
                  {axisLeaderText && (
                    <text
                      x={lx}
                      y={ly + baseDy + lines.length * 18}
                      textAnchor={textAnchor}
                      fontSize="13"
                      fontFamily="var(--font-mono)"
                      fontWeight={700}
                      fill={axisLeaderColor}
                      className="font-mono"
                    >
                      {axisLeaderText}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right: Interactive Legend & Axis Inspector */}
        <div className="space-y-3 min-w-0">
          {/* Active Models Legend / Highlight & Visibility Controls */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
              <span>
                {lang === 'de'
                  ? `Modelle im Netz (${visibleSlots.length}/${activeSlots.length})`
                  : `Models on Radar (${visibleSlots.length}/${activeSlots.length})`}
              </span>
              {effectivePinnedSlot && (
                <button
                  type="button"
                  onClick={() => setPinnedSlot(null)}
                  className="text-xs normal-case font-sans font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {lang === 'de' ? 'Fokus lösen' : 'Clear focus'}
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {primaryScores.map(({ slot, model, score }) => {
                const theme = SLOT_THEME[slot];
                const isHidden = hiddenSlots.has(slot);
                const isPinned = effectivePinnedSlot === slot;
                const isFocused = focusedSlot === slot;
                const rank = rankMap.get(model.id);

                return (
                  <div
                    key={slot}
                    onMouseEnter={() => {
                      if (!isHidden) setHoveredSlot(slot);
                    }}
                    onMouseLeave={() => setHoveredSlot(null)}
                    className={`px-3 py-1.5 flex items-center justify-between gap-2 transition-colors ${
                      isFocused
                        ? theme.rowSelected
                        : isHidden
                        ? 'opacity-45 bg-slate-50/40 dark:bg-slate-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isHidden) {
                          toggleSlotVisibility(slot);
                          setPinnedSlot(slot);
                        } else {
                          setPinnedSlot((prev) => (prev === slot ? null : slot));
                        }
                      }}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer focus:outline-hidden"
                      title={
                        lang === 'de'
                          ? isPinned
                            ? 'Hervorhebung aufheben'
                            : 'Modell im Netz hervorheben'
                          : isPinned
                          ? 'Unpin highlight'
                          : 'Highlight model on radar'
                      }
                    >
                      <span
                        className={`w-5 h-5 rounded text-xs font-mono font-bold flex items-center justify-center shrink-0 ${theme.badgeBg}`}
                      >
                        {slot}
                      </span>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isFocused
                            ? theme.text
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {model.displayName}
                      </span>
                      {rank !== undefined && (
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 shrink-0">
                          #{rank}
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-mono tabular-nums text-xs font-bold ${theme.text}`}>
                        {score !== null ? formatNumber(score, 1) : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSlotVisibility(slot)}
                        className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        aria-label={
                          isHidden
                            ? lang === 'de'
                              ? `${model.displayName} einblenden`
                              : `Show ${model.displayName}`
                            : lang === 'de'
                            ? `${model.displayName} ausblenden`
                            : `Hide ${model.displayName}`
                        }
                        title={
                          isHidden
                            ? lang === 'de'
                              ? 'Im Diagramm einblenden'
                              : 'Show on radar'
                            : lang === 'de'
                            ? 'Im Diagramm ausblenden'
                            : 'Hide on radar'
                        }
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected / Hovered Axis Ranking Inspector */}
          {inspectedRow && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: inspectedRow.comp.color }}
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {inspectedRow.label}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 shrink-0">
                  {inspectedRow.sourceName}
                </span>
              </div>

              {/* Axis Quick Switcher Pills */}
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1">
                {categoryComparisons.map((r, idx) => {
                  const isCurr = idx === inspectedAxisIdx;
                  return (
                    <button
                      key={r.comp.id}
                      type="button"
                      onClick={() => setSelectedAxisIdx(idx)}
                      className={`px-1.5 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                        isCurr
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title={r.label}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => onToggleExpandCategory(inspectedRow.comp.id)}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Info className="w-3 h-3" />
                  <span>
                    {expandedCategoryId === inspectedRow.comp.id
                      ? lang === 'de'
                        ? 'Details zu'
                        : 'Hide info'
                      : lang === 'de'
                      ? 'Methodik'
                      : 'Details'}
                  </span>
                </button>
              </div>

              {/* Sorted Values on Inspected Axis */}
              <div className="p-2.5 space-y-1.5">
                {[...inspectedRow.entries]
                  .sort((a, b) => {
                    if (a.val === null && b.val === null) return 0;
                    if (a.val === null) return 1;
                    if (b.val === null) return -1;
                    return b.val - a.val;
                  })
                  .map((entry) => {
                    const theme = SLOT_THEME[entry.slot];
                    const isHidden = hiddenSlots.has(entry.slot);
                    const isWinner =
                      inspectedRow.winners.includes(entry.slot) &&
                      !inspectedRow.isTie &&
                      inspectedRow.winners.length > 0;
                    const widthPct =
                      entry.val !== null ? Math.max(0, Math.min(100, entry.val)) : 0;

                    return (
                      <div
                        key={entry.slot}
                        onMouseEnter={() => {
                          if (!isHidden) setHoveredSlot(entry.slot);
                        }}
                        onMouseLeave={() => setHoveredSlot(null)}
                        className={`flex items-center gap-2 text-xs ${
                          isHidden ? 'opacity-40' : ''
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded text-xs font-mono font-bold flex items-center justify-center shrink-0 ${theme.badgeBg}`}
                        >
                          {entry.slot}
                        </span>
                        <span className="w-28 sm:w-32 truncate font-medium text-slate-700 dark:text-slate-300">
                          {entry.model.displayName}
                        </span>
                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                          {entry.val !== null && (
                            <div
                              className={`h-full rounded-r-xs ${
                                isWinner || inspectedRow.isTie ? theme.barActive : theme.barDim
                              }`}
                              style={{ width: `${widthPct}%` }}
                            />
                          )}
                        </div>
                        <span
                          className={`w-14 text-right font-mono tabular-nums font-bold shrink-0 ${
                            entry.val === null
                              ? 'text-slate-400 dark:text-slate-500'
                              : isWinner
                              ? theme.text
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {entry.val !== null ? `${formatNumber(entry.val, 1)}%` : '—'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Methodology & Source Drawer for Clicked Axis */}
      {expandedRow && (
        <div className="px-4 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: expandedRow.comp.color }}
              />
              <span>{expandedRow.label}</span>
              <button
                type="button"
                onClick={() => onToggleExpandCategory(expandedRow.comp.id)}
                className="ml-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                aria-label={lang === 'de' ? 'Schließen' : 'Close'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="leading-relaxed">
              {(lang === 'de' ? expandedRow.comp.descriptionDe : expandedRow.comp.descriptionEn)
                .replace(/\s*Nur im Zeitreihendiagramm verfügbar\.?/i, '')
                .replace(/\s*Available exclusively in the timeline chart\.?/i, '')}
            </p>
            <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
              {lang === 'de' ? 'Berechnung:' : 'Formula:'}{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {expandedRow.comp.formulaDesc}
              </span>
              {expandedRow.isRescaled && (
                <span>
                  {' · '}
                  {expandedRow.comp.id === 'trickQuestionsOld'
                    ? lang === 'de'
                      ? 'Skaliert von 16,7% Rate-Basis auf 0–100%'
                      : 'Rescaled from 16.7% guessing floor to 0–100%'
                    : lang === 'de'
                    ? 'Skaliert von 29% Rate-Basis auf 0–100%'
                    : 'Rescaled from 29% guessing floor to 0–100%'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {expandedRow.sourceUrl && (
              <a
                href={expandedRow.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>{sourceLinkLabel}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {onScrollToParagraph && (
              <button
                type="button"
                onClick={() =>
                  onScrollToParagraph(BENCHMARK_ANCHOR_MAP[expandedRow.comp.id] || 'note-col-d')
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3 h-3" />
                <span>{lang === 'de' ? 'Methodik unten' : 'Notes below'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const CompareView: React.FC<CompareViewProps> = ({
  allModels,
  rankedModels,
  labs = [],
  scoreMode,
  scope,
  lang,
  categoryNames,
  isPreTranslatedCategoryNames = false,
  compositeScoreNames,
  isPreTranslatedCompositeScoreNames = false,
  retiredCategoryNames,
  isPreTranslatedRetiredCategoryNames = false,
  row33Meta,
  benchmarkWeights,
  isCustomWeighted = false,
  onScrollToParagraph,
  onSelectCompany,
}) => {
  const t = TRANSLATIONS[lang];

  const pickerModels = useMemo(() => {
    const scopeFiltered = scope === 'current' ? allModels.filter((m) => m.isAvailable) : allModels;
    const base = scopeFiltered.filter(
      (m) => Boolean(m.hasConcreteReleaseDate) && /^\d{4}-\d{2}-\d{2}$/.test(m.releaseDate || '')
    );
    return [...base].sort((a, b) => {
      const sa = getScoreForMode(a, scoreMode) ?? -9999;
      const sb = getScoreForMode(b, scoreMode) ?? -9999;
      if (sb !== sa) return sb - sa;
      const na = a.scoreNew ?? a.scoreNewReported ?? (a.hasAll8Benchmarks ? a.scoreNewCalculated : -9999);
      const nb = b.scoreNew ?? b.scoreNewReported ?? (b.hasAll8Benchmarks ? b.scoreNewCalculated : -9999);
      if (nb !== na) return nb - na;
      return (b.scoreOld ?? -9999) - (a.scoreOld ?? -9999);
    });
  }, [allModels, scope, scoreMode]);

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    rankedModels.forEach((m) => {
      map.set(m.id, m.rank);
    });
    return map;
  }, [rankedModels]);

  const maxCompareCount = Math.max(
    2,
    Math.min(MAX_COMPARE_MODELS, pickerModels.length || allModels.length)
  );
  const [modelCount, setModelCount] = useState<number>(2);
  const effectiveCount = Math.max(2, Math.min(modelCount, maxCompareCount));

  const [slotIds, setSlotIds] = useState<string[]>(() => {
    const pool =
      pickerModels.length >= 2
        ? pickerModels
        : rankedModels.length >= 2
        ? rankedModels
        : allModels;
    const newestIds = pickNewestCompareModels(pool, MAX_COMPARE_MODELS, scoreMode).map((m) => m.id);
    if (newestIds.length >= Math.min(MAX_COMPARE_MODELS, pool.length)) {
      return newestIds;
    }
    const fallback = pickDefaultCompareIds(pool, MAX_COMPARE_MODELS, scoreMode);
    const merged = [...newestIds];
    const seen = new Set(newestIds);
    for (const id of fallback) {
      if (merged.length >= MAX_COMPARE_MODELS) break;
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(id);
      }
    }
    return merged;
  });

  const [activePreset, setActivePreset] = useState<PresetKind | null>('newest');
  const [presetSubLabel, setPresetSubLabel] = useState<string>(() =>
    lang === 'de' ? 'Aktuellste Releases' : 'Latest releases'
  );
  const [priceBucketIndex, setPriceBucketIndex] = useState<number>(0);
  const [familyGroupIndex, setFamilyGroupIndex] = useState<number>(0);
  const [sizeClassIndex, setSizeClassIndex] = useState<number>(0);

  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [benchmarkChartMode, setBenchmarkChartMode] = useState<'bars' | 'radar'>('radar');
  const [showHistoricalBenchmarks, setShowHistoricalBenchmarks] = useState<boolean>(true);

  // Keep selections valid & mutually distinct across all 7 slots whenever live Sheet updates reload models
  useEffect(() => {
    const byId = new Map(allModels.map((m) => [m.id, m]));
    const pool = pickerModels.length >= 2 ? pickerModels : allModels;
    if (pool.length === 0) return;

    const newestIds = pickNewestCompareModels(pool, MAX_COMPARE_MODELS, scoreMode).map((m) => m.id);
    const defaults =
      newestIds.length > 0 ? newestIds : pickDefaultCompareIds(pool, MAX_COMPARE_MODELS, scoreMode);

    setSlotIds((prev) => {
      const targetLen = Math.min(MAX_COMPARE_MODELS, pool.length);
      if (activePreset === 'newest') {
        const next: string[] = [];
        const used = new Set<string>();
        for (const id of defaults) {
          if (next.length >= targetLen) break;
          if (!used.has(id)) {
            next.push(id);
            used.add(id);
          }
        }
        for (const m of pool) {
          if (next.length >= targetLen) break;
          if (!used.has(m.id)) {
            next.push(m.id);
            used.add(m.id);
          }
        }
        if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
          return prev;
        }
        return next;
      }

      const next: string[] = [];
      const used = new Set<string>();
      for (let i = 0; i < targetLen; i++) {
        const cur = prev[i];
        if (cur && byId.has(cur) && !used.has(cur)) {
          next.push(cur);
          used.add(cur);
        } else {
          const fallback =
            defaults.find((id) => !used.has(id)) ||
            pool.find((m) => !used.has(m.id))?.id ||
            pool[0].id;
          next.push(fallback);
          used.add(fallback);
        }
      }
      if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
        return prev;
      }
      return next;
    });
  }, [allModels, pickerModels, scoreMode, activePreset]);

  const activeSlots = useMemo(() => {
    const byId = new Map(allModels.map((m) => [m.id, m]));
    const list: Array<{ slot: CompareSlot; model: ModelRecord }> = [];
    const used = new Set<string>();
    for (let i = 0; i < effectiveCount; i++) {
      const slot = COMPARE_SLOTS[i];
      const candidateId = slotIds[i];
      let model = candidateId ? byId.get(candidateId) : undefined;
      if (!model || used.has(model.id)) {
        model = pickerModels.find((m) => !used.has(m.id)) || allModels.find((m) => !used.has(m.id));
      }
      if (model) {
        used.add(model.id);
        list.push({ slot, model });
      }
    }
    return list;
  }, [allModels, pickerModels, slotIds, effectiveCount]);

  // Preset option groups
  const priceGroups = useMemo(() => {
    const buckets: Array<{ key: 'free' | 'plus' | 'pro'; labelDe: string; labelEn: string; models: ModelRecord[] }> = [
      { key: 'free', labelDe: 'Gratis / 0€', labelEn: 'Free / $0', models: [] },
      { key: 'plus', labelDe: 'Standard (~15–25€)', labelEn: 'Standard (~$15–25)', models: [] },
      { key: 'pro', labelDe: 'Pro / Ultra (90€+)', labelEn: 'Pro / Ultra ($90+)', models: [] },
    ];
    for (const m of pickerModels) {
      const b = getPriceBucket(m, lang);
      const target = buckets.find((x) => x.key === b);
      if (target) target.models.push(m);
    }
    return buckets.filter((b) => b.models.length >= 2);
  }, [pickerModels, lang]);

  const familyGroups = useMemo(() => {
    const byFamily = new Map<string, { name: string; models: ModelRecord[] }>();
    for (const m of pickerModels) {
      const name = (m.companyName || m.creatorClean || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = byFamily.get(key);
      if (existing) {
        existing.models.push(m);
      } else {
        byFamily.set(key, { name, models: [m] });
      }
    }
    const groups = Array.from(byFamily.values()).filter((g) => g.models.length >= 2);
    // Prioritize families with enough models for current count first, then highest top score
    return groups.sort((a, b) => {
      const aFit = a.models.length >= effectiveCount ? 1 : 0;
      const bFit = b.models.length >= effectiveCount ? 1 : 0;
      if (bFit !== aFit) return bFit - aFit;
      const sa = getScoreForMode(a.models[0], scoreMode) ?? -9999;
      const sb = getScoreForMode(b.models[0], scoreMode) ?? -9999;
      return sb - sa;
    });
  }, [pickerModels, scoreMode, effectiveCount]);

  const sizeGroups = useMemo(() => {
    const order: SizeClassKey[] = ['planetary', 'massive', 'singularity', 'colossal', 'large', 'small'];
    const map = new Map<SizeClassKey, ModelRecord[]>();
    for (const k of order) map.set(k, []);
    for (const m of pickerModels) {
      const cls = inferModelSizeClass(m, labs);
      if (cls) {
        map.get(cls)!.push(m);
      }
    }
    return order
      .map((k) => ({ key: k, label: SIZE_CLASS_LABELS[k], models: map.get(k)! }))
      .filter((g) => g.models.length >= 2)
      .sort((a, b) => Number(b.models.length >= effectiveCount) - Number(a.models.length >= effectiveCount));
  }, [pickerModels, labs, effectiveCount]);

  const applySlotSelection = (chosen: ModelRecord[]) => {
    if (chosen.length === 0) return;
    const chosenIds = chosen.slice(0, MAX_COMPARE_MODELS).map((m) => m.id);
    const chosenSet = new Set(chosenIds);
    const fillPool = pickDefaultCompareIds(pickerModels.length >= 2 ? pickerModels : allModels, MAX_COMPARE_MODELS, scoreMode);
    const merged = [...chosenIds];
    for (const id of [...slotIds, ...fillPool]) {
      if (merged.length >= MAX_COMPARE_MODELS) break;
      if (!chosenSet.has(id)) {
        chosenSet.add(id);
        merged.push(id);
      }
    }
    setSlotIds(merged);
    if (chosen.length < effectiveCount) {
      setModelCount(Math.max(2, chosen.length));
    }
  };

  const applyPresetForCount = (preset: PresetKind, count: number, idxOverride?: number) => {
    const targetCount = Math.max(2, Math.min(count, maxCompareCount));
    if (preset === 'newest') {
      const chosen = pickNewestCompareModels(pickerModels, targetCount, scoreMode);
      applySlotSelection(chosen);
      setActivePreset('newest');
      setPresetSubLabel(lang === 'de' ? 'Aktuellste Releases' : 'Latest releases');
      return;
    }

    if (preset === 'same_price' && priceGroups.length > 0) {
      const nextIdx =
        idxOverride !== undefined
          ? idxOverride % priceGroups.length
          : activePreset === 'same_price'
          ? (priceBucketIndex + 1) % priceGroups.length
          : 0;
      const group = priceGroups[nextIdx];
      const chosen = pickTopDiverseModels(group.models, targetCount, scoreMode);
      applySlotSelection(chosen);
      setPriceBucketIndex(nextIdx);
      setActivePreset('same_price');
      setPresetSubLabel(lang === 'de' ? group.labelDe : group.labelEn);
      return;
    }

    if (preset === 'same_family' && familyGroups.length > 0) {
      const nextIdx =
        idxOverride !== undefined
          ? idxOverride % familyGroups.length
          : activePreset === 'same_family'
          ? (familyGroupIndex + 1) % familyGroups.length
          : 0;
      const group = familyGroups[nextIdx];
      const sorted = [...group.models].sort(
        (a, b) => (getScoreForMode(b, scoreMode) ?? -9999) - (getScoreForMode(a, scoreMode) ?? -9999)
      );
      applySlotSelection(sorted.slice(0, targetCount));
      setFamilyGroupIndex(nextIdx);
      setActivePreset('same_family');
      setPresetSubLabel(group.name);
      return;
    }

    if (preset === 'same_size' && sizeGroups.length > 0) {
      const nextIdx =
        idxOverride !== undefined
          ? idxOverride % sizeGroups.length
          : activePreset === 'same_size'
          ? (sizeClassIndex + 1) % sizeGroups.length
          : 0;
      const group = sizeGroups[nextIdx];
      const chosen = pickTopDiverseModels(group.models, targetCount, scoreMode);
      applySlotSelection(chosen);
      setSizeClassIndex(nextIdx);
      setActivePreset('same_size');
      setPresetSubLabel(lang === 'de' ? group.label.de : group.label.en);
    }
  };

  const handleApplyPreset = (preset: PresetKind) => {
    applyPresetForCount(preset, effectiveCount);
  };

  const handleModelCountChange = (rawCount: number) => {
    const nextCount = Math.max(2, Math.min(rawCount, maxCompareCount));
    setModelCount(nextCount);
    if (!activePreset) return;

    if (activePreset === 'newest') {
      applyPresetForCount('newest', nextCount);
    } else if (activePreset === 'same_price' && priceGroups[priceBucketIndex]) {
      if (priceGroups[priceBucketIndex].models.length >= nextCount) {
        applyPresetForCount('same_price', nextCount, priceBucketIndex);
      } else {
        setActivePreset(null);
        setPresetSubLabel('');
      }
    } else if (activePreset === 'same_family' && familyGroups[familyGroupIndex]) {
      if (familyGroups[familyGroupIndex].models.length >= nextCount) {
        applyPresetForCount('same_family', nextCount, familyGroupIndex);
      } else {
        setActivePreset(null);
        setPresetSubLabel('');
      }
    } else if (activePreset === 'same_size' && sizeGroups[sizeClassIndex]) {
      if (sizeGroups[sizeClassIndex].models.length >= nextCount) {
        applyPresetForCount('same_size', nextCount, sizeClassIndex);
      } else {
        setActivePreset(null);
        setPresetSubLabel('');
      }
    }
  };

  const handleSelectSlot = (slotIndex: number, newId: string) => {
    setActivePreset(null);
    setPresetSubLabel('');
    setSlotIds((prev) => {
      const next = [...prev];
      const oldId = next[slotIndex];
      const existingIdx = next.findIndex((id, idx) => idx !== slotIndex && id === newId);
      if (existingIdx !== -1 && oldId) {
        next[existingIdx] = oldId;
      }
      next[slotIndex] = newId;
      return next;
    });
  };

  const handleSwapOrRotate = () => {
    if (activeSlots.length < 2) return;
    setActivePreset(null);
    setPresetSubLabel('');
    setSlotIds((prev) => {
      const next = [...prev];
      const count = activeSlots.length;
      const rotated = activeSlots.map((_, i) => activeSlots[(i + 1) % count].model.id);
      for (let i = 0; i < count; i++) {
        next[i] = rotated[i];
      }
      return next;
    });
  };

  // Row-2 synced composite score labels: index 0=NEW (M2), 1=OLD (L2), 2=WorstCase (N2)
  const labelScoreNew = getCompositeScoreLabel(
    0,
    compositeScoreNames?.[0],
    lang,
    t.scoreModeNew,
    isPreTranslatedCompositeScoreNames
  );
  const labelScoreOld = getCompositeScoreLabel(
    1,
    compositeScoreNames?.[1],
    lang,
    t.scoreModeOld,
    isPreTranslatedCompositeScoreNames
  );
  const labelScoreWorst = getCompositeScoreLabel(
    2,
    compositeScoreNames?.[2],
    lang,
    t.scoreModeWorstCase,
    isPreTranslatedCompositeScoreNames
  );

  const activeScoreLabel =
    scoreMode === 'old'
      ? labelScoreOld
      : scoreMode === 'worstCase'
      ? labelScoreWorst
      : labelScoreNew;

  const normalizedWeights = useMemo(
    () => (benchmarkWeights ? getNormalizedWeights(benchmarkWeights) : null),
    [benchmarkWeights]
  );

  // Compute detailed benchmark comparisons:
  // - scoreMode === 'old': the 5 benchmarks that compose Old Score (4 historical V-Y + MMMU-Pro)
  // - scoreMode === 'new' | 'worstCase': all 8 active benchmarks (D-K)
  const categoryComparisons = useMemo(() => {
    const specs =
      scoreMode === 'old'
        ? [
            {
              comp: { ...RETIRED_TIMELINE_BENCHMARKS[0], formulaDesc: 'U / 5', weightPct: 20 },
              rawLabel: retiredCategoryNames?.[0],
              isPreTranslated: isPreTranslatedRetiredCategoryNames,
              weightRatio: 1 / 5,
            },
            {
              comp: { ...RETIRED_TIMELINE_BENCHMARKS[1], formulaDesc: 'V / 5', weightPct: 20 },
              rawLabel: retiredCategoryNames?.[1],
              isPreTranslated: isPreTranslatedRetiredCategoryNames,
              weightRatio: 1 / 5,
            },
            {
              comp: { ...RETIRED_TIMELINE_BENCHMARKS[2], formulaDesc: 'W / 5', weightPct: 20 },
              rawLabel: retiredCategoryNames?.[2],
              isPreTranslated: isPreTranslatedRetiredCategoryNames,
              weightRatio: 1 / 5,
            },
            {
              comp: { ...BENCHMARK_COMPONENTS[3], formulaDesc: '1.4085 × (G - 29) / 5', weightPct: 20 },
              rawLabel: categoryNames?.[3],
              isPreTranslated: isPreTranslatedCategoryNames,
              weightRatio: 1 / 5,
            },
            {
              comp: { ...RETIRED_TIMELINE_BENCHMARKS[3], formulaDesc: '1.2 × (X - 16.67) / 5', weightPct: 20 },
              rawLabel: retiredCategoryNames?.[3],
              isPreTranslated: isPreTranslatedRetiredCategoryNames,
              weightRatio: 1 / 5,
            },
          ]
        : BENCHMARK_COMPONENTS.map((comp, idx) => ({
            comp,
            rawLabel: categoryNames?.[idx],
            isPreTranslated: isPreTranslatedCategoryNames,
            weightRatio:
              scoreMode === 'new' && isCustomWeighted && normalizedWeights
                ? normalizedWeights[comp.key as ActiveBenchmarkKey] ?? 1 / 8
                : 1 / 8,
          }));

    return specs.map(({ comp, rawLabel, isPreTranslated, weightRatio }) => {
      const entries = activeSlots.map(({ slot, model }) => {
        const raw = model.rawScores[comp.key] ?? null;
        const val = typeof raw === 'number' && raw !== null ? comp.transform(raw) : null;
        const contrib = val !== null ? val * weightRatio : null;
        return { slot, model, raw, val, contrib };
      });

      const valid = entries.filter((e) => e.val !== null);
      let winners: CompareSlot[] = [];
      let margin = 0;

      if (valid.length >= 2) {
        const sortedVals = [...valid].sort((x, y) => (y.val as number) - (x.val as number));
        const topVal = sortedVals[0].val as number;
        const closeTies = sortedVals.filter((e) => topVal - (e.val as number) < 0.05);
        winners = closeTies.map((e) => e.slot);
        const runnerUp = sortedVals.find((e) => topVal - (e.val as number) >= 0.05);
        margin = runnerUp ? topVal - (runnerUp.val as number) : 0;
      } else if (valid.length === 1) {
        winners = [valid[0].slot];
      }

      const label = getBenchmarkCategoryLabel(rawLabel, lang, comp, isPreTranslated);
      const row33 = getRow33Source(comp.id, row33Meta);
      const isRescaled = comp.id === 'visionPlot' || comp.id === 'trickQuestionsOld';

      return {
        comp,
        label,
        sourceName: row33.text || comp.sourceName,
        sourceUrl: row33.url || comp.sourceUrl,
        entries,
        winners,
        margin,
        isTie: valid.length >= 2 && winners.length === valid.length,
        isRescaled,
      };
    });
  }, [
    activeSlots,
    categoryNames,
    retiredCategoryNames,
    lang,
    isPreTranslatedCategoryNames,
    isPreTranslatedRetiredCategoryNames,
    row33Meta,
    scoreMode,
    isCustomWeighted,
    normalizedWeights,
  ]);

  // Historical sub-benchmarks from Columns V-Y (Synced Row-2 Labels) — only rows with available data
  const historicalComparisons = useMemo(() => {
    return RETIRED_TIMELINE_BENCHMARKS.map((comp, idx) => {
      const entries = activeSlots.map(({ slot, model }) => {
        const raw = model.rawScores[comp.key] ?? null;
        const val = typeof raw === 'number' && raw !== null ? comp.transform(raw) : null;
        return { slot, model, raw, val };
      });
      const valid = entries.filter((e) => e.val !== null);
      let winners: CompareSlot[] = [];
      if (valid.length >= 1) {
        const topVal = Math.max(...valid.map((e) => e.val as number));
        winners = valid.filter((e) => topVal - (e.val as number) < 0.05).map((e) => e.slot);
      }
      return {
        comp,
        label: getBenchmarkCategoryLabel(
          retiredCategoryNames?.[idx],
          lang,
          comp,
          isPreTranslatedRetiredCategoryNames
        ),
        entries,
        winners,
        isTie: valid.length >= 2 && winners.length === valid.length,
      };
    }).filter((row) => row.entries.some((e) => e.val !== null));
  }, [activeSlots, retiredCategoryNames, lang, isPreTranslatedRetiredCategoryNames]);

  const hasAnyHistorical = historicalComparisons.length > 0;

  // Aggregate summary metrics across 2 to 8 active models
  const summaryStats = useMemo(() => {
    const wins: Record<CompareSlot, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 };
    const bestEdge: Record<CompareSlot, { label: string; margin: number; color: string } | null> = {
      A: null,
      B: null,
      C: null,
      D: null,
      E: null,
      F: null,
      G: null,
      H: null,
    };
    let ties = 0;
    let comparableCount = 0;

    for (const row of categoryComparisons) {
      const validCount = row.entries.filter((e) => e.val !== null).length;
      if (validCount < 2) continue;
      comparableCount++;

      if (row.isTie || row.winners.length > 1) {
        ties++;
      } else if (row.winners.length === 1) {
        const winSlot = row.winners[0];
        wins[winSlot]++;
        if (
          row.margin > 0 &&
          (!bestEdge[winSlot] || row.margin > bestEdge[winSlot]!.margin)
        ) {
          bestEdge[winSlot] = { label: row.label, margin: row.margin, color: row.comp.color };
        }
      }
    }

    return { wins, ties, comparableCount, bestEdge };
  }, [categoryComparisons]);

  // Overall top composite score among active slots
  const primaryScores = activeSlots.map(({ slot, model }) => ({
    slot,
    model,
    score: getScoreForMode(model, scoreMode),
  }));
  const validPrimaries = primaryScores.filter((p) => p.score !== null);
  const topPrimaryScore =
    validPrimaries.length > 0 ? Math.max(...validPrimaries.map((p) => p.score as number)) : null;
  const overallLeaders =
    topPrimaryScore !== null
      ? validPrimaries.filter((p) => topPrimaryScore - (p.score as number) < 0.05)
      : [];

  if (activeSlots.length < 2) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-600 dark:text-slate-400">
        {lang === 'de'
          ? 'Mindestens zwei Chatbots werden für den Vergleich benötigt.'
          : 'At least two chatbots are required for comparison.'}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Quick Presets + 2/3 Model Mode Toolbar */}
      <section
        aria-label={lang === 'de' ? 'Schnellauswahl und Vergleichsoptionen' : 'Quick presets and comparison options'}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-xs flex flex-wrap items-center justify-between gap-2"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold mr-1">
            {lang === 'de' ? 'Presets:' : 'Presets:'}
          </span>

          <button
            type="button"
            onClick={() => handleApplyPreset('newest')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              activePreset === 'newest'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={
              lang === 'de'
                ? `Die ${effectiveCount} aktuellsten erschienenen Modelle vergleichen`
                : `Compare the ${effectiveCount} most recently released models`
            }
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>
              {lang === 'de' ? `Neueste ${effectiveCount}` : `Newest ${effectiveCount}`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('same_price')}
            disabled={priceGroups.length === 0}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 ${
              activePreset === 'same_price'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={
              lang === 'de'
                ? 'Modelle desselben Preisniveaus vergleichen (klicken zum Durchwechseln: Gratis / Standard / Pro)'
                : 'Compare models in the same price tier (click to cycle: Free / Standard / Pro)'
            }
          >
            <Tag className="w-3 h-3 shrink-0" />
            <span>{lang === 'de' ? 'Gleiches Preisniveau' : 'Same Price Tier'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('same_family')}
            disabled={familyGroups.length === 0}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 ${
              activePreset === 'same_family'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={
              lang === 'de'
                ? 'Modelle einer Familie/Firma vergleichen (klicken zum Wechseln: OpenAI, Anthropic, Google, …)'
                : 'Compare models from the same family/company (click to cycle)'
            }
          >
            <Building2 className="w-3 h-3 shrink-0" />
            <span>{lang === 'de' ? 'Gleiche Familie' : 'Same Family'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('same_size')}
            disabled={sizeGroups.length === 0}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 ${
              activePreset === 'same_size'
                ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={
              lang === 'de'
                ? 'Modelle derselben Größenklasse vergleichen (klicken zum Wechseln: Planetary, Massive, Small, …)'
                : 'Compare models of the same size class (click to cycle)'
            }
          >
            <Ruler className="w-3 h-3 shrink-0" />
            <span>{lang === 'de' ? 'Gleiche Größenklasse' : 'Same Size Class'}</span>
          </button>

          {activePreset && (presetSubLabel || activePreset === 'newest') && (
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 pl-1">
              ·{' '}
              {activePreset === 'newest'
                ? lang === 'de'
                  ? 'Aktuellste Releases'
                  : 'Latest releases'
                : presetSubLabel}
              {activePreset !== 'newest' && (
                <span className="text-slate-600 dark:text-slate-400 font-normal">
                  {' '}
                  ({lang === 'de' ? 'nochmal klicken = nächstes' : 'click again = next'})
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSwapOrRotate}
            title={
              effectiveCount > 2
                ? lang === 'de'
                  ? `Positionen rotieren (A → B → … → ${COMPARE_SLOTS[effectiveCount - 1]})`
                  : `Rotate slots (A → B → … → ${COMPARE_SLOTS[effectiveCount - 1]})`
                : lang === 'de'
                ? 'Chatbots A und B tauschen'
                : 'Swap Chatbots A and B'
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            {effectiveCount > 2 ? (
              <>
                <RotateCw className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                <span>
                  {effectiveCount === 3
                    ? 'A→B→C'
                    : `A→…→${COMPARE_SLOTS[effectiveCount - 1]}`}
                </span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                <span>A↔B</span>
              </>
            )}
          </button>

          {/* Model Count Slider (2 to 8 models) */}
          <div
            className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
            title={
              lang === 'de'
                ? 'Anzahl gleichzeitig verglichener Modelle (2 bis 8)'
                : 'Number of models compared side-by-side (2 to 8)'
            }
          >
            <button
              type="button"
              onClick={() => handleModelCountChange(effectiveCount - 1)}
              disabled={effectiveCount <= 2}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
              aria-label={lang === 'de' ? 'Ein Modell weniger' : 'One fewer model'}
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="range"
              min={2}
              max={maxCompareCount}
              step={1}
              value={effectiveCount}
              onChange={(e) => handleModelCountChange(Number(e.target.value))}
              aria-label={lang === 'de' ? 'Anzahl verglichener Modelle' : 'Number of compared models'}
              className="w-20 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 shrink-0"
            />
            <button
              type="button"
              onClick={() => handleModelCountChange(effectiveCount + 1)}
              disabled={effectiveCount >= maxCompareCount}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
              aria-label={lang === 'de' ? 'Ein Modell mehr' : 'One more model'}
            >
              <Plus className="w-3 h-3" />
            </button>
            <span className="text-xs font-mono font-bold tabular-nums text-slate-800 dark:text-slate-100 pl-0.5 min-w-[70px] text-center">
              {effectiveCount} {lang === 'de' ? 'Modelle' : 'Models'}
            </span>
          </div>
        </div>
      </section>

      {/* Split Overview Cards (2 to 8 Responsive Cards) */}
      <section
        aria-label={lang === 'de' ? 'Modellauswahl und Übersicht' : 'Model Selection and Overview'}
        className={`grid gap-2 overflow-visible ${
          effectiveCount === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : effectiveCount === 3
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            : effectiveCount === 4
            ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
            : effectiveCount === 5
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
            : effectiveCount === 6
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}
      >
        {activeSlots.map(({ slot, model }, idx) => {
          const theme = SLOT_THEME[slot];
          const primaryScore = getScoreForMode(model, scoreMode);
          const rank = rankMap.get(model.id);
          const priceText = formatCompactPrice(model, lang);
          const storylineText = translateStoryline(model.storyline, lang)
            .replace(/^["„“'»«\s]+/, '')
            .replace(/["„“'»«\s]+$/, '')
            .trim();
          const chatUrl = model.chatLink || model.modelUrl;

          const scoreNewVal =
            model.scoreNew ?? model.scoreNewReported ?? (model.hasAll8Benchmarks ? model.scoreNewCalculated : null);
          const scoreOldVal = model.scoreOld ?? model.scoreOldReported ?? null;
          const scoreWorstVal = model.scoreWorstCase ?? model.scoreWorstCaseReported ?? null;

          const deltaVsTop =
            primaryScore !== null && topPrimaryScore !== null ? primaryScore - topPrimaryScore : null;
          const isLeader =
            primaryScore !== null &&
            topPrimaryScore !== null &&
            topPrimaryScore - primaryScore < 0.05 &&
            validPrimaries.length >= 2 &&
            overallLeaders.length < validPrimaries.length;
          const isAllTied =
            validPrimaries.length >= 2 && overallLeaders.length === validPrimaries.length;

          const otherMap = new Map<string, CompareSlot>();
          for (const s of activeSlots) {
            if (s.slot !== slot) otherMap.set(s.model.id, s.slot);
          }

          const isRightEdge =
            effectiveCount >= 2 &&
            ((effectiveCount === 2 && idx === 1) ||
              (effectiveCount === 3 && idx === 2) ||
              (effectiveCount === 4 && idx === 3) ||
              (effectiveCount === 5 && idx === 4) ||
              (effectiveCount === 6 && (idx === 2 || idx === 5)) ||
              (effectiveCount === 7 && (idx === 3 || idx === 6)) ||
              (effectiveCount === 8 && (idx === 3 || idx === 7)));

          return (
            <div
              key={slot}
              className={`p-2.5 flex flex-col gap-1.5 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs border-t-2 ${theme.borderTop}`}
            >
              {/* Selector + Compact Direct Links */}
              <div className="flex items-center gap-1">
                <div className="flex-1 min-w-0">
                  <ModelSelector
                    slot={slot}
                    selectedModel={model}
                    otherSlotsByModelId={otherMap}
                    models={pickerModels}
                    rankMap={rankMap}
                    scoreMode={scoreMode}
                    lang={lang}
                    alignRight={isRightEdge}
                    onSelect={(newId) => handleSelectSlot(idx, newId)}
                  />
                </div>
                {chatUrl && (
                  <a
                    href={chatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                    title={t.openChatbotApp}
                  >
                    <span>Chat</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
                {model.isFreeApi && model.apiLink && (
                  <a
                    href={model.apiLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors shrink-0"
                    title={lang === 'de' ? 'Kostenloser API-Zugang' : 'Free API access'}
                  >
                    <Globe className="w-3 h-3" />
                    <span className="hidden sm:inline">API</span>
                  </a>
                )}
              </div>

              {/* Clean Compact Metadata Line */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-tight text-slate-600 dark:text-slate-400">
                {onSelectCompany ? (
                  <button
                    type="button"
                    onClick={() => onSelectCompany(model.companyName)}
                    className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 underline decoration-dotted underline-offset-2 cursor-pointer transition-colors"
                  >
                    {model.companyName}
                  </button>
                ) : (
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {model.companyName}
                  </span>
                )}
                {model.releaseDate && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono tabular-nums">{model.releaseDate}</span>
                  </>
                )}
                {rank && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      #{rank}
                    </span>
                  </>
                )}
                {priceText ? (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {priceText}
                    </span>
                  </>
                ) : !model.isPaid ? (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {lang === 'de' ? 'Gratis' : 'Free'}
                    </span>
                  </>
                ) : null}
                {model.isFreeApi && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      API
                    </span>
                  </>
                )}
                {!model.isAvailable && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      Hist.
                    </span>
                  </>
                )}
              </div>

              {/* Primary Composite Score + Gap to Leader */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/90 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate">
                    {activeScoreLabel}
                  </span>
                  <span className={`text-xl font-mono tabular-nums font-extrabold tracking-tight leading-none ${theme.text}`}>
                    {primaryScore !== null ? formatNumber(primaryScore, 1) : '—'}
                  </span>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">/100</span>
                </div>

                {deltaVsTop !== null && (
                  <div
                    className={`text-xs font-mono tabular-nums font-bold flex items-center gap-1 shrink-0 ${
                      isLeader
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isLeader && <Trophy className="w-3 h-3 shrink-0" />}
                    <span>
                      {isLeader
                        ? lang === 'de'
                          ? '#1'
                          : 'Leader'
                        : isAllTied
                        ? lang === 'de'
                          ? 'Gleichstand'
                          : 'Tied'
                        : `${deltaVsTop.toFixed(1)} ${lang === 'de' ? 'Pkt.' : 'pts'}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Other Secondary Composite Scores (only the 2 non-active scores, avoiding redundancy with primary above) */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs leading-tight">
                {scoreMode !== 'new' && (
                  <div className="flex items-baseline justify-between gap-1 min-w-0" title={labelScoreNew}>
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                      {labelScoreNew}
                    </span>
                    <span className="font-mono tabular-nums font-bold shrink-0 text-slate-700 dark:text-slate-300">
                      {scoreNewVal !== null ? formatNumber(scoreNewVal, 1) : '—'}
                      {!model.hasAll8Benchmarks && scoreNewVal !== null && (
                        <span className="font-normal text-amber-600 dark:text-amber-400 ml-0.5">*</span>
                      )}
                    </span>
                  </div>
                )}
                {scoreMode !== 'old' && (
                  <div className="flex items-baseline justify-between gap-1 min-w-0" title={labelScoreOld}>
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                      {labelScoreOld}
                    </span>
                    <span className="font-mono tabular-nums font-bold shrink-0 text-slate-700 dark:text-slate-300">
                      {scoreOldVal !== null ? formatNumber(scoreOldVal, 1) : '—'}
                    </span>
                  </div>
                )}
                {scoreMode !== 'worstCase' && (
                  <div className="flex items-baseline justify-between gap-1 min-w-0" title={labelScoreWorst}>
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                      {labelScoreWorst}
                    </span>
                    <span className="font-mono tabular-nums font-bold shrink-0 text-slate-700 dark:text-slate-300">
                      {scoreWorstVal !== null ? formatNumber(scoreWorstVal, 1) : '—'}
                    </span>
                  </div>
                )}
              </div>

              {storylineText && (
                <p
                  className="text-xs text-slate-600 dark:text-slate-300 italic leading-tight border-t border-slate-100 dark:border-slate-800/80 pt-1 truncate"
                  title={storylineText}
                >
                  {storylineText}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Compact Summary Strip (Category Wins + Biggest Category Edge; NEW Spread box removed) */}
      <section
        aria-label={lang === 'de' ? 'Vergleichs-Zusammenfassung' : 'Comparison Summary'}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800"
      >
        {/* Category Wins Distribution */}
        <div className="p-3 sm:px-4 flex flex-col justify-between gap-1.5">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
            {scoreMode === 'old'
              ? lang === 'de'
                ? `Kategorie-Siege (${labelScoreOld} · 5 Benchmarks)`
                : `Category Wins (${labelScoreOld} · 5 Benchmarks)`
              : lang === 'de'
              ? 'Kategorie-Siege (D–K)'
              : 'Category Wins (D–K)'}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono tabular-nums text-xs sm:text-sm font-bold">
            {activeSlots.map(({ slot }, i) => (
              <React.Fragment key={slot}>
                {i > 0 && <span className="text-slate-400 dark:text-slate-700">·</span>}
                <span className={SLOT_THEME[slot].text}>
                  {slot}: {summaryStats.wins[slot]}
                </span>
              </React.Fragment>
            ))}
            <span className="text-slate-400 dark:text-slate-700">·</span>
            <span className="text-slate-600 dark:text-slate-400">
              {lang === 'de' ? 'Patt' : 'Tie'}: {summaryStats.ties}
            </span>
          </div>
          {summaryStats.comparableCount > 0 && (
            <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
              {activeSlots.map(({ slot }) =>
                summaryStats.wins[slot] > 0 ? (
                  <div
                    key={slot}
                    className={`${SLOT_THEME[slot].barActive} h-full`}
                    style={{ width: `${(summaryStats.wins[slot] / summaryStats.comparableCount) * 100}%` }}
                  />
                ) : null
              )}
              {summaryStats.ties > 0 && (
                <div
                  className="bg-slate-400 dark:bg-slate-600 h-full"
                  style={{ width: `${(summaryStats.ties / summaryStats.comparableCount) * 100}%` }}
                />
              )}
            </div>
          )}
        </div>

        {/* Peak Edge per Active Model */}
        <div className="p-3 sm:px-4 flex flex-col justify-between gap-1">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
            {lang === 'de' ? 'Größte Einzelstärke' : 'Biggest Category Edge'}
          </div>
          <div
            className={
              activeSlots.length > 4
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-xs'
                : 'space-y-0.5 text-xs'
            }
          >
            {activeSlots.map(({ slot }) => {
              const edge = summaryStats.bestEdge[slot];
              const theme = SLOT_THEME[slot];
              return (
                <div key={slot} className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`font-mono font-bold shrink-0 ${theme.text}`}>{slot}:</span>
                    {edge ? (
                      <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                        {edge.label}
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">
                        {lang === 'de' ? 'kein Vorsprung' : 'no lead'}
                      </span>
                    )}
                  </div>
                  {edge && (
                    <span className={`font-mono tabular-nums font-bold shrink-0 ${theme.text}`}>
                      +{edge.margin.toFixed(1)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Unified Compact Category-by-Category Horizontal Comparison */}
      <section
        aria-label={
          lang === 'de'
            ? `Detaillierter Kategorienvergleich über alle ${categoryComparisons.length} Benchmarks`
            : `Detailed comparison across all ${categoryComparisons.length} benchmark categories`
        }
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden"
      >
        {/* Header Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 text-xs font-mono text-slate-800 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-3 min-h-[28px]">
            {/* Chart Type Switcher: Fixed Top-Left (Balken vs Spinnennetz) */}
            <div
              className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/90 p-0.5 font-mono shrink-0"
              role="group"
              aria-label={
                lang === 'de'
                  ? `Darstellungsform der ${categoryComparisons.length} Benchmarks`
                  : 'Benchmark chart view'
              }
            >
              <button
                type="button"
                onClick={() => setBenchmarkChartMode('bars')}
                aria-pressed={benchmarkChartMode === 'bars'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  benchmarkChartMode === 'bars'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{lang === 'de' ? 'Balken' : 'Bars'}</span>
              </button>
              <button
                type="button"
                onClick={() => setBenchmarkChartMode('radar')}
                aria-pressed={benchmarkChartMode === 'radar'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  benchmarkChartMode === 'radar'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Radar className="w-3.5 h-3.5" />
                <span>{lang === 'de' ? 'Spinnennetz' : 'Radar'}</span>
              </button>
            </div>

            <span className="uppercase tracking-wider font-semibold text-black dark:text-slate-100">
              {lang === 'de'
                ? `Alle ${categoryComparisons.length} Benchmarks im Direktvergleich`
                : `All ${categoryComparisons.length} Benchmarks Side-by-Side`}
              {scoreMode === 'old' ? ` (${labelScoreOld})` : ''}
            </span>
          </div>

          {benchmarkChartMode === 'bars' && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-h-[28px]">
              {activeSlots.map(({ slot, model }) => (
                <span key={slot} className={`font-bold ${SLOT_THEME[slot].text}`}>
                  {slot} · {model.displayName}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Benchmark Rows or Radar Chart */}
        {benchmarkChartMode === 'radar' ? (
          <BenchmarkRadarChart
            categoryComparisons={categoryComparisons}
            activeSlots={activeSlots}
            primaryScores={primaryScores}
            rankMap={rankMap}
            lang={lang}
            expandedCategoryId={expandedCategoryId}
            onToggleExpandCategory={(categoryId) =>
              setExpandedCategoryId((prev) => (prev === categoryId ? null : categoryId))
            }
            onScrollToParagraph={onScrollToParagraph}
            sourceLinkLabel={t.sourceLink}
          />
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {/* Aligned 0–100% Scale Ruler */}
            <div className="hidden md:grid px-4 py-1.5 bg-slate-50/80 dark:bg-slate-950/50 grid-cols-[270px_minmax(0,1fr)] lg:grid-cols-[310px_minmax(0,1fr)] items-center gap-4">
              <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'de' ? 'Kategorie / Quelle' : 'Category / Source'}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 shrink-0" />
                <div className="flex-1 flex items-center justify-between text-xs font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
                <div className="w-20 sm:w-24 text-right text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                  {lang === 'de' ? 'Score' : 'Score'}
                </div>
              </div>
            </div>

            {categoryComparisons.map((row) => {
              const isExpanded = expandedCategoryId === row.comp.id;
              const anchorId = BENCHMARK_ANCHOR_MAP[row.comp.id] || 'note-col-d';

              return (
                <div
                  key={row.comp.id}
                  className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                >
                  <div className="px-4 py-2.5 grid grid-cols-1 md:grid-cols-[270px_minmax(0,1fr)] lg:grid-cols-[310px_minmax(0,1fr)] items-center gap-2.5 md:gap-4">
                    {/* Left: Category Label + Source + Leader */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCategoryId((prev) => (prev === row.comp.id ? null : row.comp.id))
                          }
                          className="group inline-flex items-center gap-1.5 max-w-full cursor-pointer focus:outline-hidden text-left"
                          title={
                            lang === 'de'
                              ? 'Methodik & Benchmark-Details anzeigen'
                              : 'Show methodology & benchmark details'
                          }
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: row.comp.color }}
                          />
                          <span className="text-[15px] font-sans font-bold text-black dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                            {row.label}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                          ) : (
                            <Info className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 group-hover:text-blue-500 shrink-0" />
                          )}
                        </button>

                        <div className="text-xs text-slate-700 dark:text-slate-300 pl-4 truncate">
                          {row.sourceName}
                        </div>
                      </div>

                      <div className="font-mono tabular-nums text-xs font-bold shrink-0 pt-0.5">
                        {row.winners.length === 0 ? (
                          <span className="text-slate-700 dark:text-slate-300">—</span>
                        ) : row.isTie ? (
                          <span className="text-slate-700 dark:text-slate-300">
                            {lang === 'de' ? 'Patt' : 'Tie'}
                          </span>
                        ) : (
                          <span className={SLOT_THEME[row.winners[0]].text}>
                            🏆 {row.winners.join('/')}
                            {row.margin > 0 ? ` +${row.margin.toFixed(1)}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Absolute Score Bars (0–100%) for A..H */}
                    <div className="space-y-1.5 min-w-0">
                      {row.entries.map((entry) => {
                        const theme = SLOT_THEME[entry.slot];
                        const isWinner =
                          row.winners.includes(entry.slot) && !row.isTie && row.winners.length > 0;
                        const widthPct =
                          entry.val !== null ? Math.max(0, Math.min(100, entry.val)) : 0;

                        return (
                          <div key={entry.slot} className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-5 h-5 rounded text-xs font-mono font-bold flex items-center justify-center shrink-0 ${theme.badgeBg}`}
                            >
                              {entry.slot}
                            </span>

                            <div className="relative flex-1 h-4 bg-slate-100 dark:bg-slate-800/90 rounded overflow-hidden border border-slate-300/80 dark:border-slate-700/70">
                              <div className="absolute inset-y-0 left-1/4 w-px bg-slate-300/60 dark:bg-slate-700/60 pointer-events-none" />
                              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300/60 dark:bg-slate-700/60 pointer-events-none" />
                              <div className="absolute inset-y-0 left-3/4 w-px bg-slate-300/60 dark:bg-slate-700/60 pointer-events-none" />

                              {entry.val !== null && (
                                <div
                                  className={`relative z-10 h-full rounded-r-xs transition-all duration-300 ${
                                    isWinner || row.isTie ? theme.barActive : theme.barDim
                                  }`}
                                  style={{ width: `${widthPct}%` }}
                                />
                              )}
                            </div>

                            <div className="w-20 sm:w-24 text-right font-mono tabular-nums text-[15px] shrink-0">
                              {entry.val !== null ? (
                                <span
                                  className={
                                    isWinner
                                      ? `font-extrabold ${theme.text}`
                                      : 'font-semibold text-slate-900 dark:text-slate-200'
                                  }
                                >
                                  {formatNumber(entry.val, 1)}%
                                </span>
                              ) : (
                                <span className="font-semibold text-slate-700 dark:text-slate-400">
                                  —
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expandable Category Details Drawer */}
                  {isExpanded && (
                    <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-800 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-3xl">
                        <p className="leading-relaxed">
                          {(lang === 'de' ? row.comp.descriptionDe : row.comp.descriptionEn)
                            .replace(/\s*Nur im Zeitreihendiagramm verfügbar\.?/i, '')
                            .replace(/\s*Available exclusively in the timeline chart\.?/i, '')}
                        </p>
                        <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {lang === 'de' ? 'Berechnung:' : 'Formula:'}{' '}
                          <span className="font-semibold text-slate-900 dark:text-slate-200">
                            {row.comp.formulaDesc}
                          </span>
                          {row.isRescaled && (
                            <span>
                              {' · '}
                              {row.comp.id === 'trickQuestionsOld'
                                ? lang === 'de'
                                  ? 'Skaliert von 16,7% Rate-Basis auf 0–100%'
                                  : 'Rescaled from 16.7% guessing floor to 0–100%'
                                : lang === 'de'
                                ? 'Skaliert von 29% Rate-Basis auf 0–100%'
                                : 'Rescaled from 29% guessing floor to 0–100%'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {row.sourceUrl && (
                          <a
                            href={row.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                          >
                            <span>{t.sourceLink}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {onScrollToParagraph && (
                          <button
                            type="button"
                            onClick={() => onScrollToParagraph(anchorId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{lang === 'de' ? 'Methodik unten' : 'Notes below'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Historical Sub-Benchmarks (Columns V-Y, Synced Row-2 Labels) — hidden in Old Score mode since they are already the main axes */}
      {scoreMode !== 'old' && hasAnyHistorical && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHistoricalBenchmarks((prev) => !prev)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>
                {lang === 'de'
                  ? `Historische Einzel-Benchmarks (${labelScoreOld}, Spalten V–Y)`
                  : `Historical Sub-Benchmarks (${labelScoreOld}, Columns V–Y)`}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-slate-400">
              <span>
                {showHistoricalBenchmarks
                  ? lang === 'de'
                    ? 'Ausblenden'
                    : 'Hide'
                  : lang === 'de'
                  ? 'Anzeigen'
                  : 'Show'}
              </span>
              {showHistoricalBenchmarks ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {showHistoricalBenchmarks && (
            <div className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
              {historicalComparisons.map((row) => (
                <div
                  key={row.comp.id}
                  className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-[240px_minmax(0,1fr)] items-center gap-2 text-xs"
                >
                  <div>
                    <div className="text-[15px] font-sans font-semibold text-black dark:text-slate-100">
                      {row.label}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {row.comp.sourceName}
                    </div>
                  </div>
                  <div
                    className={`grid ${
                      effectiveCount === 2
                        ? 'grid-cols-2'
                        : effectiveCount === 3
                        ? 'grid-cols-3'
                        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                    } gap-2 font-mono tabular-nums`}
                  >
                    {row.entries.map((entry) => {
                      const theme = SLOT_THEME[entry.slot];
                      const isWin =
                        row.winners.includes(entry.slot) && !row.isTie && row.winners.length > 0;
                      return (
                        <div
                          key={entry.slot}
                          className="flex items-center justify-between px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60"
                        >
                          <span className={`font-bold ${theme.text}`}>{entry.slot}</span>
                          <span
                            className={
                              entry.val === null
                                ? 'text-slate-600 dark:text-slate-400'
                                : isWin
                                ? `font-extrabold ${theme.text}`
                                : 'font-semibold text-slate-800 dark:text-slate-200'
                            }
                          >
                            {entry.val !== null ? `${formatNumber(entry.val, 1)}%` : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
