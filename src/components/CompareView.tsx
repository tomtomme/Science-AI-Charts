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
} from 'lucide-react';
import {
  LabEntry,
  ModelRecord,
  ScoreMode,
  ModelScope,
  Row33Metadata,
} from '../types';
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
};

type CompareSlot = 'A' | 'B' | 'C';
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
  },
  B: {
    badgeBg: 'bg-rose-600 text-white',
    text: 'text-rose-600 dark:text-rose-400',
    barActive: 'bg-rose-600 dark:bg-rose-500',
    barDim: 'bg-rose-400/65 dark:bg-rose-500/45',
    ring: 'hover:border-rose-400 dark:hover:border-rose-500 focus-visible:ring-rose-500',
    rowSelected: 'bg-rose-50/90 dark:bg-rose-950/40',
    borderTop: 'border-t-rose-500',
  },
  C: {
    badgeBg: 'bg-violet-600 text-white',
    text: 'text-violet-600 dark:text-violet-400',
    barActive: 'bg-violet-600 dark:bg-violet-500',
    barDim: 'bg-violet-400/65 dark:bg-violet-500/45',
    ring: 'hover:border-violet-400 dark:hover:border-violet-500 focus-visible:ring-violet-500',
    rowSelected: 'bg-violet-50/90 dark:bg-violet-950/40',
    borderTop: 'border-t-violet-500',
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
  if (!row33Meta?.benchmarks) return {};
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
  if (!key) return {};
  const item = row33Meta.benchmarks[key];
  return { text: item?.text, url: item?.sourceUrl };
}

function pickDefaultCompareTrio(
  pool: ModelRecord[],
  mode: ScoreMode
): { aId: string; bId: string; cId: string } {
  if (pool.length === 0) return { aId: '', bId: '', cId: '' };
  if (pool.length === 1) return { aId: pool[0].id, bId: pool[0].id, cId: pool[0].id };

  const sorted = [...pool].sort((x, y) => {
    const sx = getScoreForMode(x, mode) ?? -9999;
    const sy = getScoreForMode(y, mode) ?? -9999;
    if (sy !== sx) return sy - sx;
    return (y.scoreNewCalculated ?? 0) - (x.scoreNewCalculated ?? 0);
  });

  const first = sorted[0];
  const usedCompanies = new Set<string>([first.companyName.trim().toLowerCase()]);

  const second =
    sorted.find(
      (m) => m.id !== first.id && !usedCompanies.has(m.companyName.trim().toLowerCase())
    ) || sorted[1];
  usedCompanies.add(second.companyName.trim().toLowerCase());

  const third =
    sorted.find(
      (m) =>
        m.id !== first.id &&
        m.id !== second.id &&
        !usedCompanies.has(m.companyName.trim().toLowerCase())
    ) ||
    sorted.find((m) => m.id !== first.id && m.id !== second.id) ||
    second;

  return { aId: first.id, bId: second.id, cId: third.id };
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

type SizeClassKey = 'small' | 'massive' | 'colossal' | 'planetary' | 'singularity';

const SIZE_CLASS_LABELS: Record<SizeClassKey, { de: string; en: string }> = {
  small: { de: 'Small / Medium', en: 'Small / Medium' },
  massive: { de: 'Massive', en: 'Massive' },
  colossal: { de: 'Colossal', en: 'Colossal' },
  planetary: { de: 'Planetary', en: 'Planetary' },
  singularity: { de: 'Singularity', en: 'Singularity' },
};

function inferModelSizeClass(model: ModelRecord, labs: LabEntry[]): SizeClassKey | null {
  const modelHaystack = `${model.displayName} ${model.name}`.toLowerCase();
  const companyLow = `${model.companyName} ${model.creatorClean}`.toLowerCase();

  // Match against Labs sheet parameterSizes first (longest token wins)
  const matchingLab = labs.find((l) => {
    const lc = l.creator.toLowerCase();
    const le = (l.engineName || '').toLowerCase();
    return (
      companyLow.includes(lc) ||
      lc.includes(companyLow) ||
      (le && modelHaystack.includes(le))
    );
  });

  const tierMap: Array<{
    cls: SizeClassKey;
    keys: Array<keyof LabEntry['parameterSizes']>;
  }> = [
    { cls: 'singularity', keys: ['singularity', 'godTier'] },
    { cls: 'planetary', keys: ['planetary'] },
    { cls: 'colossal', keys: ['colossal', 'large'] },
    { cls: 'massive', keys: ['massive'] },
    { cls: 'small', keys: ['small', 'medium'] },
  ];

  if (matchingLab) {
    let bestCls: SizeClassKey | null = null;
    let bestLen = 0;

    for (const entry of tierMap) {
      for (const k of entry.keys) {
        const raw = matchingLab.parameterSizes[k];
        if (!raw || raw.trim() === '-') continue;
        const tokens = raw
          .replace(/[()]/g, ' ')
          .split(/[,/&+;]+/)
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length >= 2 && t !== 'llm');
        for (const tok of tokens) {
          const hit =
            tok.length <= 2
              ? new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(modelHaystack)
              : modelHaystack.includes(tok);
          if (hit && tok.length > bestLen) {
            bestLen = tok.length;
            bestCls = entry.cls;
          }
        }
      }
    }
    if (bestCls) return bestCls;
  }

  // Fallback heuristics for common frontier & small model families
  if (/\b(fable|mythos|carbon|astra|wonder full|5\.4 pro|5\.2 pro)\b/i.test(modelHaystack)) return 'singularity';
  if (/\b(opus|argon|sol|wonder|grok 4|grok-4|qwen max|deepseek pro)\b/i.test(modelHaystack)) return 'planetary';
  if (/\b(hydrogen|gemini pro|2\.5 pro|3\.0 pro|3 pro|grok 3|grok-3)\b/i.test(modelHaystack)) return 'colossal';
  if (/\b(sonnet|flash(?!-lite)|terra|spark|qwen plus|deepseek v3|r1)\b/i.test(modelHaystack)) return 'massive';
  if (/\b(haiku|gemma|flash-lite|luna|glimmer|ember|mini|nano|lite|8b|7b|9b|4b|14b|32b)\b/i.test(modelHaystack)) return 'small';
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
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 transition-colors cursor-pointer text-left focus:outline-hidden focus-visible:ring-2 ${theme.ring}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`w-5 h-5 rounded text-[11px] font-mono font-bold flex items-center justify-center shrink-0 ${theme.badgeBg}`}
          >
            {slot}
          </span>
          {selectedModel ? (
            <>
              <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shrink-0">
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
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  {selectedModel.flag && (
                    <span className="text-xs shrink-0 leading-none">{selectedModel.flag}</span>
                  )}
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {selectedModel.displayName}
                  </span>
                  {selectedModel.isNew && (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0">
                      NEW
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {selectedModel.companyName}
                  {selectedModel.releaseDate ? ` · ${selectedModel.releaseDate}` : ''}
                </div>
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'de' ? 'Chatbot auswählen…' : 'Select chatbot…'}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/70 dark:bg-slate-950/60">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
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
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label={lang === 'de' ? 'Suche leeren' : 'Clear search'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-md p-0.5 text-[11px] font-mono font-semibold">
                {(['all', 'free', 'paid'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTierFilter(tier)}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      tierFilter === tier
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {filteredModels.length} {lang === 'de' ? 'Treffer' : 'models'}
              </span>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
            {filteredModels.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
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
                      <span className="w-7 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500 shrink-0 text-right">
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
                            <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                              NEW
                            </span>
                          )}
                          {!m.isAvailable && (
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                              (Hist.)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {m.companyName}
                          {m.releaseDate ? ` · ${m.releaseDate}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {otherSlot && (
                        <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500">
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

  const [useThirdModel, setUseThirdModel] = useState<boolean>(true);
  const [modelAId, setModelAId] = useState<string>(() => {
    const pool = rankedModels.length >= 2 ? rankedModels : allModels;
    return pickDefaultCompareTrio(pool, scoreMode).aId;
  });
  const [modelBId, setModelBId] = useState<string>(() => {
    const pool = rankedModels.length >= 2 ? rankedModels : allModels;
    return pickDefaultCompareTrio(pool, scoreMode).bId;
  });
  const [modelCId, setModelCId] = useState<string>(() => {
    const pool = rankedModels.length >= 3 ? rankedModels : allModels;
    return pickDefaultCompareTrio(pool, scoreMode).cId;
  });

  const [activePreset, setActivePreset] = useState<PresetKind | null>(null);
  const [presetSubLabel, setPresetSubLabel] = useState<string>('');
  const [priceBucketIndex, setPriceBucketIndex] = useState<number>(0);
  const [familyGroupIndex, setFamilyGroupIndex] = useState<number>(0);
  const [sizeClassIndex, setSizeClassIndex] = useState<number>(0);

  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [showHistoricalBenchmarks, setShowHistoricalBenchmarks] = useState<boolean>(false);

  // Keep selections valid whenever live Sheet updates reload models
  useEffect(() => {
    const byId = new Map(allModels.map((m) => [m.id, m]));
    const pool = pickerModels.length >= 3 ? pickerModels : allModels;
    const defaults = pickDefaultCompareTrio(pool, scoreMode);

    if (!byId.has(modelAId)) setModelAId(defaults.aId);
    if (!byId.has(modelBId) || (allModels.length >= 2 && modelBId === modelAId)) {
      const nextB =
        defaults.bId !== modelAId
          ? defaults.bId
          : pool.find((m) => m.id !== modelAId)?.id || defaults.bId;
      setModelBId(nextB);
    }
    if (!byId.has(modelCId) || (allModels.length >= 3 && (modelCId === modelAId || modelCId === modelBId))) {
      const nextC =
        defaults.cId !== modelAId && defaults.cId !== modelBId
          ? defaults.cId
          : pool.find((m) => m.id !== modelAId && m.id !== modelBId)?.id || defaults.cId;
      setModelCId(nextC);
    }
  }, [allModels, pickerModels, modelAId, modelBId, modelCId, scoreMode]);

  const modelA = useMemo(
    () => allModels.find((m) => m.id === modelAId) || pickerModels[0] || null,
    [allModels, pickerModels, modelAId]
  );
  const modelB = useMemo(
    () =>
      allModels.find((m) => m.id === modelBId) ||
      pickerModels.find((m) => m.id !== modelA?.id) ||
      pickerModels[1] ||
      pickerModels[0] ||
      null,
    [allModels, pickerModels, modelBId, modelA?.id]
  );
  const modelC = useMemo(
    () =>
      allModels.find((m) => m.id === modelCId) ||
      pickerModels.find((m) => m.id !== modelA?.id && m.id !== modelB?.id) ||
      pickerModels[2] ||
      pickerModels[0] ||
      null,
    [allModels, pickerModels, modelCId, modelA?.id, modelB?.id]
  );

  const isThreeMode = useThirdModel && Boolean(modelC && modelC.id !== modelA?.id && modelC.id !== modelB?.id);

  const activeSlots = useMemo(() => {
    const list: Array<{ slot: CompareSlot; model: ModelRecord }> = [];
    if (modelA) list.push({ slot: 'A', model: modelA });
    if (modelB) list.push({ slot: 'B', model: modelB });
    if (isThreeMode && modelC) list.push({ slot: 'C', model: modelC });
    return list;
  }, [modelA, modelB, modelC, isThreeMode]);

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
    // Prioritize families with >=3 models first, then highest top score
    return groups.sort((a, b) => {
      const a3 = a.models.length >= 3 ? 1 : 0;
      const b3 = b.models.length >= 3 ? 1 : 0;
      if (b3 !== a3) return b3 - a3;
      const sa = getScoreForMode(a.models[0], scoreMode) ?? -9999;
      const sb = getScoreForMode(b.models[0], scoreMode) ?? -9999;
      return sb - sa;
    });
  }, [pickerModels, scoreMode]);

  const sizeGroups = useMemo(() => {
    const order: SizeClassKey[] = ['planetary', 'massive', 'singularity', 'colossal', 'small'];
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
      .sort((a, b) => Number(b.models.length >= 3) - Number(a.models.length >= 3));
  }, [pickerModels, labs]);

  const applyTrioSelection = (chosen: ModelRecord[]) => {
    if (chosen.length === 0) return;
    setModelAId(chosen[0].id);
    if (chosen[1]) setModelBId(chosen[1].id);
    if (chosen[2]) {
      setModelCId(chosen[2].id);
      setUseThirdModel(true);
    } else if (chosen.length === 2) {
      setUseThirdModel(false);
    }
  };

  const handleApplyPreset = (preset: PresetKind) => {
    const targetCount = 3;
    if (preset === 'newest') {
      const datedPool = pickerModels.filter(
        (m) => Boolean(m.hasConcreteReleaseDate) && /^\d{4}-\d{2}-\d{2}$/.test(m.releaseDate || '')
      );
      const scoredDatedPool = datedPool.filter((m) => getScoreForMode(m, scoreMode) !== null);
      const candidatePool = scoredDatedPool.length >= targetCount ? scoredDatedPool : datedPool;
      const newestSorted = [...candidatePool].sort((a, b) => {
        const cmp = (b.releaseDate || '').localeCompare(a.releaseDate || '');
        if (cmp !== 0) return cmp;
        return (getScoreForMode(b, scoreMode) ?? -9999) - (getScoreForMode(a, scoreMode) ?? -9999);
      });
      const chosen = newestSorted.slice(0, targetCount);
      applyTrioSelection(chosen);
      setActivePreset('newest');
      setPresetSubLabel(lang === 'de' ? 'Aktuellste Releases' : 'Latest releases');
      return;
    }

    if (preset === 'same_price' && priceGroups.length > 0) {
      const nextIdx = activePreset === 'same_price' ? (priceBucketIndex + 1) % priceGroups.length : 0;
      const group = priceGroups[nextIdx];
      const chosen = pickTopDiverseModels(group.models, targetCount, scoreMode);
      applyTrioSelection(chosen);
      setPriceBucketIndex(nextIdx);
      setActivePreset('same_price');
      setPresetSubLabel(lang === 'de' ? group.labelDe : group.labelEn);
      return;
    }

    if (preset === 'same_family' && familyGroups.length > 0) {
      const nextIdx = activePreset === 'same_family' ? (familyGroupIndex + 1) % familyGroups.length : 0;
      const group = familyGroups[nextIdx];
      const sorted = [...group.models].sort(
        (a, b) => (getScoreForMode(b, scoreMode) ?? -9999) - (getScoreForMode(a, scoreMode) ?? -9999)
      );
      applyTrioSelection(sorted.slice(0, targetCount));
      setFamilyGroupIndex(nextIdx);
      setActivePreset('same_family');
      setPresetSubLabel(group.name);
      return;
    }

    if (preset === 'same_size' && sizeGroups.length > 0) {
      const nextIdx = activePreset === 'same_size' ? (sizeClassIndex + 1) % sizeGroups.length : 0;
      const group = sizeGroups[nextIdx];
      const chosen = pickTopDiverseModels(group.models, targetCount, scoreMode);
      applyTrioSelection(chosen);
      setSizeClassIndex(nextIdx);
      setActivePreset('same_size');
      setPresetSubLabel(lang === 'de' ? group.label.de : group.label.en);
    }
  };

  const handleSelectSlot = (slot: CompareSlot, newId: string) => {
    setActivePreset(null);
    setPresetSubLabel('');
    if (slot === 'A') {
      if (modelB && newId === modelB.id) setModelBId(modelA?.id || modelB.id);
      else if (modelC && newId === modelC.id) setModelCId(modelA?.id || modelC.id);
      setModelAId(newId);
    } else if (slot === 'B') {
      if (modelA && newId === modelA.id) setModelAId(modelB?.id || modelA.id);
      else if (modelC && newId === modelC.id) setModelCId(modelB?.id || modelC.id);
      setModelBId(newId);
    } else {
      if (modelA && newId === modelA.id) setModelAId(modelC?.id || modelA.id);
      else if (modelB && newId === modelB.id) setModelBId(modelC?.id || modelB.id);
      setModelCId(newId);
    }
  };

  const handleSwapOrRotate = () => {
    if (!modelA || !modelB) return;
    setActivePreset(null);
    setPresetSubLabel('');
    if (isThreeMode && modelC) {
      // Rotate A -> B -> C -> A
      setModelAId(modelB.id);
      setModelBId(modelC.id);
      setModelCId(modelA.id);
    } else {
      setModelAId(modelB.id);
      setModelBId(modelA.id);
    }
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

  // Compute detailed benchmark comparisons across all 8 active categories (D-K)
  const categoryComparisons = useMemo(() => {
    return BENCHMARK_COMPONENTS.map((comp, idx) => {
      const entries = activeSlots.map(({ slot, model }) => {
        const raw = model.rawScores[comp.key];
        const val = typeof raw === 'number' && raw !== null ? comp.transform(raw) : null;
        const contrib = val !== null ? val / 8 : null;
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

      const rawLabel = categoryNames?.[idx];
      const label = getBenchmarkCategoryLabel(rawLabel, lang, comp, isPreTranslatedCategoryNames);
      const row33 = getRow33Source(comp.id, row33Meta);
      const isRescaled = comp.id === 'visionPlot';

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
  }, [activeSlots, categoryNames, lang, isPreTranslatedCategoryNames, row33Meta]);

  // Historical sub-benchmarks from Columns V-Y (synced Row-2 labels)
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
    });
  }, [activeSlots, retiredCategoryNames, lang, isPreTranslatedRetiredCategoryNames]);

  const hasAnyHistorical = historicalComparisons.some((c) =>
    c.entries.some((e) => e.val !== null)
  );

  // Aggregate summary metrics across 2 or 3 models
  const summaryStats = useMemo(() => {
    const wins: Record<CompareSlot, number> = { A: 0, B: 0, C: 0 };
    const bestEdge: Record<CompareSlot, { label: string; margin: number; color: string } | null> = {
      A: null,
      B: null,
      C: null,
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
  const minPrimaryScore =
    validPrimaries.length > 0 ? Math.min(...validPrimaries.map((p) => p.score as number)) : null;
  const overallLeaders =
    topPrimaryScore !== null
      ? validPrimaries.filter((p) => topPrimaryScore - (p.score as number) < 0.05)
      : [];

  if (!modelA || !modelB) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
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
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
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
                ? 'Die 3 aktuellsten erschienenen Modelle vergleichen'
                : 'Compare the 3 most recently released models'
            }
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>{lang === 'de' ? 'Neueste 3' : 'Newest 3'}</span>
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

          {activePreset && presetSubLabel && (
            <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 pl-1">
              · {presetSubLabel}
              {activePreset !== 'newest' && (
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  {' '}
                  ({lang === 'de' ? 'nochmal klicken = nächstes' : 'click again = next'})
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-[11px] font-mono font-semibold">
            <button
              type="button"
              onClick={() => setUseThirdModel(false)}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                !isThreeMode
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'de' ? '2 Modelle' : '2 Models'}
            </button>
            <button
              type="button"
              onClick={() => setUseThirdModel(true)}
              disabled={pickerModels.length < 3}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer disabled:opacity-40 ${
                isThreeMode
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'de' ? '3 Modelle' : '3 Models'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSwapOrRotate}
            title={
              isThreeMode
                ? lang === 'de'
                  ? 'Positionen rotieren (A → B → C)'
                  : 'Rotate slots (A → B → C)'
                : lang === 'de'
                ? 'Chatbots A und B tauschen'
                : 'Swap Chatbots A and B'
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            {isThreeMode ? (
              <>
                <RotateCw className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span>A→B→C</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span>A↔B</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Split Overview Cards (2 or 3 Columns) */}
      <section
        aria-label={lang === 'de' ? 'Modellauswahl und Übersicht' : 'Model Selection and Overview'}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs grid grid-cols-1 ${
          isThreeMode ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
        } divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 overflow-visible`}
      >
        {activeSlots.map(({ slot, model }) => {
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

          return (
            <div
              key={slot}
              className={`p-3.5 sm:p-4 flex flex-col gap-2.5 min-w-0 border-t-2 ${theme.borderTop} first:rounded-t-xl lg:first:rounded-tl-xl lg:first:rounded-tr-none lg:last:rounded-tr-xl`}
            >
              {/* Selector + Compact Direct Links */}
              <div className="flex items-center gap-1.5">
                <div className="flex-1 min-w-0">
                  <ModelSelector
                    slot={slot}
                    selectedModel={model}
                    otherSlotsByModelId={otherMap}
                    models={pickerModels}
                    rankMap={rankMap}
                    scoreMode={scoreMode}
                    lang={lang}
                    onSelect={(newId) => handleSelectSlot(slot, newId)}
                  />
                </div>
                {chatUrl && (
                  <a
                    href={chatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
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
                    className="inline-flex items-center gap-1 px-2 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors shrink-0"
                    title={lang === 'de' ? 'Kostenloser API-Zugang' : 'Free API access'}
                  >
                    <Globe className="w-3 h-3" />
                    <span className="hidden sm:inline">API</span>
                  </a>
                )}
              </div>

              {/* Clean Compact Metadata Line */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
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
                      🌐 API
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
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/90 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                    {activeScoreLabel}
                  </span>
                  <span className={`text-2xl font-mono tabular-nums font-extrabold tracking-tight ${theme.text}`}>
                    {primaryScore !== null ? formatNumber(primaryScore, 1) : '—'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">/100</span>
                </div>

                {deltaVsTop !== null && (
                  <div
                    className={`text-xs font-mono tabular-nums font-bold flex items-center gap-1 shrink-0 ${
                      isLeader
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isLeader && <Trophy className="w-3.5 h-3.5 shrink-0" />}
                    <span>
                      {isLeader
                        ? lang === 'de'
                          ? '#1 im Vergleich'
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

              {/* Synced Row-2 Secondary Composite Scores Strip */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {labelScoreNew}
                  </div>
                  <div
                    className={`font-mono tabular-nums font-bold ${
                      scoreMode === 'new'
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {scoreNewVal !== null ? formatNumber(scoreNewVal, 1) : '—'}
                    {!model.hasAll8Benchmarks && scoreNewVal !== null && (
                      <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400 ml-0.5">*</span>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {labelScoreOld}
                  </div>
                  <div
                    className={`font-mono tabular-nums font-bold ${
                      scoreMode === 'old'
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {scoreOldVal !== null ? formatNumber(scoreOldVal, 1) : '—'}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {labelScoreWorst}
                  </div>
                  <div
                    className={`font-mono tabular-nums font-bold ${
                      scoreMode === 'worstCase'
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {scoreWorstVal !== null ? formatNumber(scoreWorstVal, 1) : '—'}
                  </div>
                </div>
              </div>

              {storylineText && (
                <p
                  className="text-[11px] text-slate-600 dark:text-slate-300 italic leading-snug border-t border-slate-100 dark:border-slate-800/80 pt-1.5 line-clamp-2"
                  title={storylineText}
                >
                  {storylineText}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Compact Summary Strip */}
      <section
        aria-label={lang === 'de' ? 'Vergleichs-Zusammenfassung' : 'Comparison Summary'}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800"
      >
        {/* Category Wins Distribution */}
        <div className="p-3 sm:px-4 flex flex-col justify-between gap-1.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {lang === 'de' ? 'Kategorie-Siege (D–K)' : 'Category Wins (D–K)'}
          </div>
          <div className="flex flex-wrap items-baseline gap-2 font-mono tabular-nums text-xs sm:text-sm font-bold">
            <span className="text-blue-600 dark:text-blue-400">A: {summaryStats.wins.A}</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-rose-600 dark:text-rose-400">B: {summaryStats.wins.B}</span>
            {isThreeMode && (
              <>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-violet-600 dark:text-violet-400">C: {summaryStats.wins.C}</span>
              </>
            )}
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-slate-500 dark:text-slate-400">
              {lang === 'de' ? 'Patt' : 'Tie'}: {summaryStats.ties}
            </span>
          </div>
          {summaryStats.comparableCount > 0 && (
            <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
              {summaryStats.wins.A > 0 && (
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-full"
                  style={{ width: `${(summaryStats.wins.A / summaryStats.comparableCount) * 100}%` }}
                />
              )}
              {summaryStats.wins.B > 0 && (
                <div
                  className="bg-rose-600 dark:bg-rose-500 h-full"
                  style={{ width: `${(summaryStats.wins.B / summaryStats.comparableCount) * 100}%` }}
                />
              )}
              {isThreeMode && summaryStats.wins.C > 0 && (
                <div
                  className="bg-violet-600 dark:bg-violet-500 h-full"
                  style={{ width: `${(summaryStats.wins.C / summaryStats.comparableCount) * 100}%` }}
                />
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

        {/* Composite Spread */}
        <div className="p-3 sm:px-4 flex flex-col justify-between gap-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {activeScoreLabel} {lang === 'de' ? 'Spanne' : 'Spread'}
          </div>
          {topPrimaryScore !== null && minPrimaryScore !== null && validPrimaries.length >= 2 ? (
            <>
              <div className="font-mono tabular-nums text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {overallLeaders.length === validPrimaries.length ? (
                  lang === 'de' ? '0.0 Pkt. (Gleichstand)' : '0.0 pts (Tied)'
                ) : (
                  <span className={SLOT_THEME[overallLeaders[0].slot].text}>
                    🏆 {overallLeaders.map((l) => l.slot).join('/')} · {topPrimaryScore.toFixed(1)} {lang === 'de' ? 'Pkt.' : 'pts'}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {lang === 'de' ? 'Abstand #1 zu Schlusslicht:' : 'Spread top to bottom:'}{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  +{(topPrimaryScore - minPrimaryScore).toFixed(1)}
                </strong>{' '}
                {lang === 'de' ? 'Pkt.' : 'pts'}
              </div>
            </>
          ) : (
            <div className="text-sm font-mono text-slate-400 dark:text-slate-500">—</div>
          )}
        </div>

        {/* Peak Edge per Active Model */}
        <div className="p-3 sm:px-4 flex flex-col justify-between gap-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {lang === 'de' ? 'Größte Einzelstärke' : 'Biggest Category Edge'}
          </div>
          <div className="space-y-0.5 text-xs">
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
                      <span className="text-slate-400 dark:text-slate-500">
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

      {/* Unified Compact Category-by-Category Horizontal Comparison (8 Benchmarks D-K) */}
      <section
        aria-label={
          lang === 'de'
            ? 'Detaillierter Kategorienvergleich über alle 8 Benchmarks'
            : 'Detailed comparison across all 8 benchmark categories'
        }
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden"
      >
        {/* Header Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <span className="uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-300">
            {lang === 'de'
              ? 'Alle 8 Benchmarks im Direktvergleich (je 12,5%)'
              : 'All 8 Benchmarks Side-by-Side (12.5% each)'}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {activeSlots.map(({ slot, model }) => (
              <span key={slot} className={`font-bold ${SLOT_THEME[slot].text}`}>
                {slot} · {model.displayName}
              </span>
            ))}
          </div>
        </div>

        {/* Benchmark Rows */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {categoryComparisons.map((row) => {
            const isExpanded = expandedCategoryId === row.comp.id;
            const anchorId = BENCHMARK_ANCHOR_MAP[row.comp.id] || 'note-col-d';

            return (
              <div
                key={row.comp.id}
                className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
              >
                <div className="px-4 py-2.5 grid grid-cols-1 md:grid-cols-[270px_minmax(0,1fr)] lg:grid-cols-[310px_minmax(0,1fr)] items-center gap-2.5 md:gap-4">
                  {/* Left: Category Label + Source + Leader Pill */}
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
                        <span className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                          {row.label}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                        )}
                      </button>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pl-4">
                        <span className="truncate">{row.sourceName}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums shrink-0">{row.comp.weightPct}%</span>
                      </div>
                    </div>

                    <div className="font-mono tabular-nums text-[11px] font-bold shrink-0 pt-0.5">
                      {row.winners.length === 0 ? (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      ) : row.isTie ? (
                        <span className="text-slate-500 dark:text-slate-400">
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

                  {/* Right: Compact Stacked Bars for A, B, (C) */}
                  <div className="space-y-1.5 min-w-0">
                    {row.entries.map((entry) => {
                      const theme = SLOT_THEME[entry.slot];
                      const isWinner = row.winners.includes(entry.slot) && !row.isTie && row.winners.length > 0;
                      const widthPct = entry.val !== null ? Math.max(0, Math.min(100, entry.val)) : 0;

                      return (
                        <div key={entry.slot} className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${theme.badgeBg}`}
                          >
                            {entry.slot}
                          </span>

                          <div className="relative flex-1 h-4 bg-slate-100 dark:bg-slate-800/90 rounded overflow-hidden border border-slate-200/80 dark:border-slate-700/70">
                            <div className="absolute inset-y-0 left-1/4 w-px bg-slate-200/80 dark:bg-slate-700/60 pointer-events-none" />
                            <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200/80 dark:bg-slate-700/60 pointer-events-none" />
                            <div className="absolute inset-y-0 left-3/4 w-px bg-slate-200/80 dark:bg-slate-700/60 pointer-events-none" />
                            {entry.val !== null && (
                              <div
                                className={`h-full rounded-r-xs transition-all duration-300 ${
                                  isWinner || row.isTie ? theme.barActive : theme.barDim
                                }`}
                                style={{ width: `${widthPct}%` }}
                              />
                            )}
                          </div>

                          <div className="w-28 sm:w-36 text-right font-mono tabular-nums text-xs shrink-0 flex items-baseline justify-end gap-1.5">
                            <span
                              className={
                                entry.val === null
                                  ? 'text-slate-400 dark:text-slate-500 font-semibold'
                                  : isWinner
                                  ? `font-extrabold ${theme.text}`
                                  : 'font-semibold text-slate-700 dark:text-slate-300'
                              }
                            >
                              {entry.val !== null ? `${formatNumber(entry.val, 1)}%` : '—'}
                            </span>
                            {entry.contrib !== null && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                                {row.isRescaled && entry.raw !== null
                                  ? `(${formatNumber(entry.raw, 0)}%)`
                                  : `+${entry.contrib.toFixed(1)}`}
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
                  <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 max-w-3xl">
                      <p className="leading-relaxed">
                        {lang === 'de' ? row.comp.descriptionDe : row.comp.descriptionEn}
                      </p>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {lang === 'de' ? 'Berechnung:' : 'Formula:'}{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {row.comp.formulaDesc}
                        </span>
                        {row.isRescaled && (
                          <span>
                            {' · '}
                            {lang === 'de'
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
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
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

        {/* Totals Footer Row */}
        <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
            {activeScoreLabel} ({lang === 'de' ? 'Gesamt' : 'Total'})
          </span>
          <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums text-sm">
            {primaryScores.map(({ slot, model, score }) => (
              <div key={slot} className="flex items-baseline gap-1.5">
                <span className={`font-bold text-xs ${SLOT_THEME[slot].text}`}>
                  {slot} ({model.displayName}):
                </span>
                <span className={`font-extrabold ${SLOT_THEME[slot].text}`}>
                  {score !== null ? formatNumber(score, 1) : '—'}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">/100</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Historical Sub-Benchmarks (Columns V-Y, Synced Row-2 Labels) */}
      {hasAnyHistorical && (
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
            <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400">
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
                  className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)] items-center gap-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {row.label}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">
                      {row.comp.sourceName}
                    </div>
                  </div>
                  <div
                    className={`grid ${
                      isThreeMode ? 'grid-cols-3' : 'grid-cols-2'
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
                                ? 'text-slate-400'
                                : isWin
                                ? `font-extrabold ${theme.text}`
                                : 'font-semibold text-slate-700 dark:text-slate-300'
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
