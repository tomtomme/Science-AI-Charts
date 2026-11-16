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
  Minus,
  Globe,
  BookOpen,
  X,
} from 'lucide-react';
import {
  ModelRecord,
  ScoreMode,
  ModelScope,
  Row33Metadata,
} from '../types';
import {
  BENCHMARK_COMPONENTS,
  RETIRED_TIMELINE_BENCHMARKS,
  getBenchmarkCategoryLabel,
} from '../data/benchmarks';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { matchesSearchQuery } from '../utils/searchUtils';
import { translateStoryline } from '../utils/storylineHelper';

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

interface CompareViewProps {
  allModels: ModelRecord[];
  rankedModels: ModelRecord[];
  scoreMode: ScoreMode;
  scope: ModelScope;
  lang: Language;
  categoryNames?: string[];
  isPreTranslatedCategoryNames?: boolean;
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
  if (clean.includes('€')) {
    return clean.replace(/\s*€/g, '€') + (lang === 'de' ? ' / Mon.' : ' / mo');
  }
  if (clean.includes('$')) {
    return clean.replace(/\s*\$/g, '$').replace(/\$\s+/g, '$') + (lang === 'de' ? ' / Mon.' : ' / mo');
  }
  return clean;
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

function pickDefaultComparePair(
  pool: ModelRecord[],
  mode: ScoreMode
): { aId: string; bId: string } {
  if (pool.length === 0) return { aId: '', bId: '' };
  if (pool.length === 1) return { aId: pool[0].id, bId: pool[0].id };

  const sorted = [...pool].sort((x, y) => {
    const sx = getScoreForMode(x, mode) ?? -9999;
    const sy = getScoreForMode(y, mode) ?? -9999;
    if (sy !== sx) return sy - sx;
    return (y.scoreNewCalculated ?? 0) - (x.scoreNewCalculated ?? 0);
  });

  const first = sorted[0];
  const rivalFromOtherLab = sorted.find(
    (m) =>
      m.id !== first.id &&
      m.companyName.trim().toLowerCase() !== first.companyName.trim().toLowerCase()
  );
  const second = rivalFromOtherLab || sorted[1];
  return { aId: first.id, bId: second.id };
}

interface ModelSelectorProps {
  slot: 'A' | 'B';
  selectedModel: ModelRecord | null;
  otherModelId: string;
  models: ModelRecord[];
  rankMap: Map<string, number>;
  scoreMode: ScoreMode;
  lang: Language;
  onSelect: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  slot,
  selectedModel,
  otherModelId,
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

  const slotAccent =
    slot === 'A'
      ? 'bg-blue-600 text-white'
      : 'bg-rose-600 text-white';

  const triggerRing =
    slot === 'A'
      ? 'hover:border-blue-400 dark:hover:border-blue-500 focus-visible:ring-blue-500'
      : 'hover:border-rose-400 dark:hover:border-rose-500 focus-visible:ring-rose-500';

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 transition-colors cursor-pointer text-left focus:outline-hidden focus-visible:ring-2 ${triggerRing}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`w-6 h-6 rounded-md text-xs font-mono font-bold flex items-center justify-center shrink-0 ${slotAccent}`}
          >
            {slot}
          </span>
          {selectedModel ? (
            <>
              <span className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shrink-0">
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
                <div className="flex items-center gap-1.5 min-w-0">
                  {selectedModel.flag && (
                    <span className="text-sm shrink-0 leading-none">{selectedModel.flag}</span>
                  )}
                  <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {selectedModel.displayName}
                  </span>
                  {selectedModel.isNew && (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0">
                      NEW
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {selectedModel.companyName}
                  {selectedModel.releaseDate ? ` · ${selectedModel.releaseDate}` : ''}
                </div>
              </div>
            </>
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">
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
          {/* Search & Quick Tier Filter */}
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

          {/* Model Options List */}
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
                const isOtherSlot = otherModelId === m.id;
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
                      isSelected
                        ? slot === 'A'
                          ? 'bg-blue-50/90 dark:bg-blue-950/40'
                          : 'bg-rose-50/90 dark:bg-rose-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
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
                              ({lang === 'de' ? 'Hist.' : 'Hist.'})
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
                      {isOtherSlot && (
                        <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500">
                          {slot === 'A' ? '↔ B' : '↔ A'}
                        </span>
                      )}
                      {isSelected && (
                        <Check
                          className={`w-3.5 h-3.5 ${
                            slot === 'A'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        />
                      )}
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
  scoreMode,
  scope,
  lang,
  categoryNames,
  isPreTranslatedCategoryNames = false,
  row33Meta,
  onScrollToParagraph,
  onSelectCompany,
}) => {
  const t = TRANSLATIONS[lang];

  // Build ordered picker pool respecting scope ('current' available vs 'all' incl. historical)
  const pickerModels = useMemo(() => {
    const base = scope === 'current' ? allModels.filter((m) => m.isAvailable) : allModels;
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

  const [modelAId, setModelAId] = useState<string>(() => {
    const pool = rankedModels.length >= 2 ? rankedModels : allModels;
    return pickDefaultComparePair(pool, scoreMode).aId;
  });
  const [modelBId, setModelBId] = useState<string>(() => {
    const pool = rankedModels.length >= 2 ? rankedModels : allModels;
    return pickDefaultComparePair(pool, scoreMode).bId;
  });

  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [showHistoricalBenchmarks, setShowHistoricalBenchmarks] = useState<boolean>(false);

  // Keep selections valid whenever live Sheet updates reload models
  useEffect(() => {
    const byId = new Map(allModels.map((m) => [m.id, m]));
    const hasA = byId.has(modelAId);
    const hasB = byId.has(modelBId);
    if (!hasA || !hasB || (allModels.length >= 2 && modelAId === modelBId)) {
      const pool = pickerModels.length >= 2 ? pickerModels : allModels;
      const defaults = pickDefaultComparePair(pool, scoreMode);
      if (!hasA) setModelAId(defaults.aId);
      if (!hasB || defaults.aId === modelBId) {
        setModelBId(
          defaults.bId !== modelAId
            ? defaults.bId
            : pool.find((m) => m.id !== modelAId)?.id || defaults.bId
        );
      }
    }
  }, [allModels, pickerModels, modelAId, modelBId, scoreMode]);

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

  const handleSelectA = (newId: string) => {
    if (modelB && newId === modelB.id) {
      // Swap so two distinct chatbots are always compared
      setModelBId(modelA?.id || modelB.id);
    }
    setModelAId(newId);
  };

  const handleSelectB = (newId: string) => {
    if (modelA && newId === modelA.id) {
      setModelAId(modelB?.id || modelA.id);
    }
    setModelBId(newId);
  };

  const handleSwap = () => {
    if (!modelA || !modelB) return;
    setModelAId(modelB.id);
    setModelBId(modelA.id);
  };

  // Compute detailed benchmark comparisons across all 8 active categories (D-K)
  const categoryComparisons = useMemo(() => {
    return BENCHMARK_COMPONENTS.map((comp, idx) => {
      const rawA = modelA ? modelA.rawScores[comp.key] : null;
      const rawB = modelB ? modelB.rawScores[comp.key] : null;
      const valA = typeof rawA === 'number' && rawA !== null ? comp.transform(rawA) : null;
      const valB = typeof rawB === 'number' && rawB !== null ? comp.transform(rawB) : null;

      const contribA = valA !== null ? valA / 8 : null;
      const contribB = valB !== null ? valB / 8 : null;

      let winner: 'A' | 'B' | 'tie' | 'na' = 'na';
      let diff: number | null = null; // valA - valB
      if (valA !== null && valB !== null) {
        diff = valA - valB;
        if (Math.abs(diff) < 0.05) {
          winner = 'tie';
        } else {
          winner = diff > 0 ? 'A' : 'B';
        }
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
        rawA,
        rawB,
        valA,
        valB,
        contribA,
        contribB,
        diff,
        winner,
        isRescaled,
      };
    });
  }, [modelA, modelB, categoryNames, lang, isPreTranslatedCategoryNames, row33Meta]);

  const historicalComparisons = useMemo(() => {
    return RETIRED_TIMELINE_BENCHMARKS.map((comp) => {
      const rawA = modelA ? modelA.rawScores[comp.key] ?? null : null;
      const rawB = modelB ? modelB.rawScores[comp.key] ?? null : null;
      const valA = typeof rawA === 'number' && rawA !== null ? comp.transform(rawA) : null;
      const valB = typeof rawB === 'number' && rawB !== null ? comp.transform(rawB) : null;
      const diff = valA !== null && valB !== null ? valA - valB : null;
      const winner: 'A' | 'B' | 'tie' | 'na' =
        diff === null ? 'na' : Math.abs(diff) < 0.05 ? 'tie' : diff > 0 ? 'A' : 'B';
      return {
        comp,
        label: lang === 'de' ? comp.nameDe : comp.nameEn,
        rawA,
        rawB,
        valA,
        valB,
        diff,
        winner,
      };
    });
  }, [modelA, modelB, lang]);

  const hasAnyHistorical = historicalComparisons.some(
    (c) => c.valA !== null || c.valB !== null
  );

  // Aggregate summary metrics
  const summaryStats = useMemo(() => {
    let winsA = 0;
    let winsB = 0;
    let ties = 0;
    let comparableCount = 0;
    let diffSum = 0;
    let bestLeadA: { label: string; margin: number; color: string } | null = null;
    let bestLeadB: { label: string; margin: number; color: string } | null = null;

    for (const row of categoryComparisons) {
      if (row.diff === null) continue;
      comparableCount++;
      diffSum += row.diff;
      if (row.winner === 'A') {
        winsA++;
        if (!bestLeadA || row.diff > bestLeadA.margin) {
          bestLeadA = { label: row.label, margin: row.diff, color: row.comp.color };
        }
      } else if (row.winner === 'B') {
        winsB++;
        const margin = Math.abs(row.diff);
        if (!bestLeadB || margin > bestLeadB.margin) {
          bestLeadB = { label: row.label, margin, color: row.comp.color };
        }
      } else if (row.winner === 'tie') {
        ties++;
      }
    }

    const avgDelta = comparableCount > 0 ? diffSum / comparableCount : null;
    return { winsA, winsB, ties, comparableCount, avgDelta, bestLeadA, bestLeadB };
  }, [categoryComparisons]);

  if (!modelA || !modelB) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-500 dark:text-slate-400">
        {lang === 'de'
          ? 'Mindestens zwei Chatbots werden für den Vergleich benötigt.'
          : 'At least two chatbots are required for comparison.'}
      </div>
    );
  }

  const primaryA = getScoreForMode(modelA, scoreMode);
  const primaryB = getScoreForMode(modelB, scoreMode);
  const primaryDelta = primaryA !== null && primaryB !== null ? primaryA - primaryB : null;

  const activeScoreLabel =
    scoreMode === 'old'
      ? t.scoreModeOld
      : scoreMode === 'worstCase'
      ? t.scoreModeWorstCase
      : t.scoreModeNew;

  const renderModelPane = (
    model: ModelRecord,
    opponent: ModelRecord,
    slot: 'A' | 'B',
    onSelect: (id: string) => void
  ) => {
    const primaryScore = getScoreForMode(model, scoreMode);
    const opponentScore = getScoreForMode(opponent, scoreMode);
    const diff =
      primaryScore !== null && opponentScore !== null ? primaryScore - opponentScore : null;
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

    const isLeader = diff !== null && diff > 0.05;
    const isTied = diff !== null && Math.abs(diff) <= 0.05;

    return (
      <div className="p-4 sm:p-5 flex flex-col gap-3.5 min-w-0">
        {/* Selector + Direct Links */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <ModelSelector
              slot={slot}
              selectedModel={model}
              otherModelId={opponent.id}
              models={pickerModels}
              rankMap={rankMap}
              scoreMode={scoreMode}
              lang={lang}
              onSelect={onSelect}
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {chatUrl && (
              <a
                href={chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
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
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors whitespace-nowrap"
                title={lang === 'de' ? 'Kostenloser API-Zugang' : 'Free API access'}
              >
                <Globe className="w-3 h-3" />
                <span>API</span>
              </a>
            )}
          </div>
        </div>

        {/* Clean Unboxed Metadata Line (Zero Pills) */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
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
                {t.rank} #{rank}
              </span>
            </>
          )}
          {priceText && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                {priceText}
              </span>
            </>
          )}
          {!priceText && !model.isPaid && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                {lang === 'de' ? 'Kostenlos' : 'Free'}
              </span>
            </>
          )}
          {model.isFreeApi && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                🌐 Free API
              </span>
            </>
          )}
          {!model.isAvailable && (
            <>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                {lang === 'de' ? 'Historisch / Nicht aktuell' : 'Historical / Discontinued'}
              </span>
            </>
          )}
        </div>

        {/* Primary Composite Score & All 3 Composite Metrics */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/90 flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {activeScoreLabel}
            </span>
            <span
              className={`text-2xl sm:text-3xl font-mono tabular-nums font-extrabold tracking-tight ${
                slot === 'A'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {primaryScore !== null ? formatNumber(primaryScore, 1) : '—'}
            </span>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">/ 100</span>
          </div>

          {diff !== null && (
            <div
              className={`text-xs font-mono tabular-nums font-bold flex items-center gap-1 ${
                isLeader
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isTied
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {isLeader && <Trophy className="w-3.5 h-3.5 shrink-0" />}
              <span>
                {isLeader
                  ? lang === 'de'
                    ? `+${diff.toFixed(1)} Pkt. Vorsprung`
                    : `+${diff.toFixed(1)} pts ahead`
                  : isTied
                  ? lang === 'de'
                    ? 'Gleichstand'
                    : 'Tied'
                  : lang === 'de'
                  ? `${diff.toFixed(1)} Pkt.`
                  : `${diff.toFixed(1)} pts`}
              </span>
            </div>
          )}
        </div>

        {/* Secondary Composite Scores Strip */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
              {t.scoreModeNew}
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
                <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400 ml-1">
                  *
                </span>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
              {t.scoreModeOld}
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
            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
              {t.scoreModeWorstCase}
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

        {/* Storyline / Note */}
        {storylineText && (
          <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-2">
            {storylineText}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-3.5">
      {/* Split-Pane Selector & Overview Header with Center Swap Button */}
      <section
        aria-label={lang === 'de' ? 'Modellauswahl und Übersicht' : 'Model Selection and Overview'}
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {renderModelPane(modelA, modelB, 'A', handleSelectA)}
          {renderModelPane(modelB, modelA, 'B', handleSelectB)}
        </div>

        {/* Centered Swap Button on Split Divider */}
        <div className="flex justify-center lg:block lg:absolute lg:left-1/2 lg:top-6 lg:-translate-x-1/2 z-20 py-2 lg:py-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleSwap}
            title={lang === 'de' ? 'Chatbots A und B tauschen' : 'Swap Chatbots A and B'}
            aria-label={lang === 'de' ? 'Chatbots A und B tauschen' : 'Swap Chatbots A and B'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="lg:hidden">{lang === 'de' ? 'A ↔ B tauschen' : 'Swap A ↔ B'}</span>
          </button>
        </div>
      </section>

      {/* Head-to-Head Summary Strip */}
      <section
        aria-label={lang === 'de' ? 'Vergleichs-Zusammenfassung' : 'Comparison Summary'}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800"
      >
        {/* Categories Won */}
        <div className="p-3.5 sm:px-4 flex flex-col justify-between gap-1.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {lang === 'de' ? 'Kategorie-Siege' : 'Category Wins'}
          </div>
          <div className="flex items-baseline gap-2 font-mono tabular-nums text-sm font-bold">
            <span className="text-blue-600 dark:text-blue-400">A: {summaryStats.winsA}</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-slate-500 dark:text-slate-400">
              {lang === 'de' ? 'Patt' : 'Tie'}: {summaryStats.ties}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-rose-600 dark:text-rose-400">B: {summaryStats.winsB}</span>
          </div>
          {summaryStats.comparableCount > 0 && (
            <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
              {summaryStats.winsA > 0 && (
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-full"
                  style={{ width: `${(summaryStats.winsA / summaryStats.comparableCount) * 100}%` }}
                />
              )}
              {summaryStats.ties > 0 && (
                <div
                  className="bg-slate-400 dark:bg-slate-600 h-full"
                  style={{ width: `${(summaryStats.ties / summaryStats.comparableCount) * 100}%` }}
                />
              )}
              {summaryStats.winsB > 0 && (
                <div
                  className="bg-rose-600 dark:bg-rose-500 h-full"
                  style={{ width: `${(summaryStats.winsB / summaryStats.comparableCount) * 100}%` }}
                />
              )}
            </div>
          )}
        </div>

        {/* Composite Score Delta */}
        <div className="p-3.5 sm:px-4 flex flex-col justify-between gap-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {activeScoreLabel} {lang === 'de' ? 'Differenz' : 'Difference'}
          </div>
          {primaryDelta !== null ? (
            <div className="flex items-center gap-1.5 font-mono tabular-nums text-sm font-bold">
              {Math.abs(primaryDelta) < 0.05 ? (
                <span className="text-slate-600 dark:text-slate-300">
                  {lang === 'de' ? '0.0 Pkt. (Gleichstand)' : '0.0 pts (Tied)'}
                </span>
              ) : primaryDelta > 0 ? (
                <span className="text-blue-600 dark:text-blue-400">
                  ◀ A +{primaryDelta.toFixed(1)} {lang === 'de' ? 'Pkt.' : 'pts'}
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400">
                  B +{Math.abs(primaryDelta).toFixed(1)} {lang === 'de' ? 'Pkt.' : 'pts'} ▶
                </span>
              )}
            </div>
          ) : (
            <div className="text-sm font-mono text-slate-400 dark:text-slate-500">—</div>
          )}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {summaryStats.avgDelta !== null
              ? `${lang === 'de' ? 'Ø Kat.-Delta' : 'Avg cat. delta'}: ${
                  summaryStats.avgDelta >= 0 ? '+' : ''
                }${summaryStats.avgDelta.toFixed(1)}%`
              : lang === 'de'
              ? 'Unvollständige Kategorien'
              : 'Partial category coverage'}
          </div>
        </div>

        {/* Biggest Edge A */}
        <div className="p-3.5 sm:px-4 flex flex-col justify-between gap-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {lang === 'de' ? 'Größter Vorteil A' : 'Strongest Edge (A)'}
          </div>
          {summaryStats.bestLeadA ? (
            <>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: summaryStats.bestLeadA.color }}
                />
                <span className="truncate">{summaryStats.bestLeadA.label}</span>
              </div>
              <div className="text-xs font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                +{summaryStats.bestLeadA.margin.toFixed(1)} {lang === 'de' ? 'Pkt.' : 'pts'}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {lang === 'de' ? 'Keine Kategorie vorn' : 'Leads 0 categories'}
            </div>
          )}
        </div>

        {/* Biggest Edge B */}
        <div className="p-3.5 sm:px-4 flex flex-col justify-between gap-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {lang === 'de' ? 'Größter Vorteil B' : 'Strongest Edge (B)'}
          </div>
          {summaryStats.bestLeadB ? (
            <>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: summaryStats.bestLeadB.color }}
                />
                <span className="truncate">{summaryStats.bestLeadB.label}</span>
              </div>
              <div className="text-xs font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                +{summaryStats.bestLeadB.margin.toFixed(1)} {lang === 'de' ? 'Pkt.' : 'pts'}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {lang === 'de' ? 'Keine Kategorie vorn' : 'Leads 0 categories'}
            </div>
          )}
        </div>
      </section>

      {/* Split-Pane Benchmark-by-Benchmark Comparison Matrix (8 Categories D-K) */}
      <section
        aria-label={
          lang === 'de'
            ? 'Detaillierter Kategorienvergleich über alle 8 Benchmarks'
            : 'Detailed comparison across all 8 benchmark categories'
        }
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden"
      >
        {/* Desktop Split-Pane Column Header */}
        <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_240px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)] items-center px-4 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between pr-4">
            <span className="font-bold text-blue-600 dark:text-blue-400 truncate">
              A · {modelA.displayName}
            </span>
            <span>0–100%</span>
          </div>
          <div className="text-center font-semibold text-slate-600 dark:text-slate-300">
            {lang === 'de' ? 'Benchmark & Delta (12.5% je Kat.)' : 'Benchmark & Delta (12.5% each)'}
          </div>
          <div className="flex items-center justify-between pl-4">
            <span>0–100%</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 truncate text-right">
              {modelB.displayName} · B
            </span>
          </div>
        </div>

        {/* Rows for each of the 8 Benchmarks */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {categoryComparisons.map((row) => {
            const isExpanded = expandedCategoryId === row.comp.id;
            const anchorId = BENCHMARK_ANCHOR_MAP[row.comp.id] || 'note-col-d';
            const barWidthA = row.valA !== null ? Math.max(0, Math.min(100, row.valA)) : 0;
            const barWidthB = row.valB !== null ? Math.max(0, Math.min(100, row.valB)) : 0;

            return (
              <div
                key={row.comp.id}
                className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
              >
                {/* Desktop 3-Zone Symmetric Split-Pane Row */}
                <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_240px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)] items-center px-4 py-3 gap-0">
                  {/* Left Zone: Bot A Score + Mirrored Right-to-Left Bar */}
                  <div className="flex items-center justify-end gap-3 pr-3 min-w-0">
                    <div className="text-right shrink-0 w-24 lg:w-28">
                      <div
                        className={`font-mono tabular-nums text-sm font-bold ${
                          row.valA === null
                            ? 'text-slate-400 dark:text-slate-500'
                            : row.winner === 'A'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {row.valA !== null ? `${formatNumber(row.valA, 1)}%` : '—'}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                        {row.contribA !== null
                          ? row.isRescaled && row.rawA !== null
                            ? `${lang === 'de' ? 'roh' : 'raw'} ${formatNumber(row.rawA, 0)}% · +${row.contribA.toFixed(1)}`
                            : `+${row.contribA.toFixed(1)} ${lang === 'de' ? 'Pkt' : 'pts'}`
                          : lang === 'de'
                          ? 'Keine Daten'
                          : 'No data'}
                      </div>
                    </div>

                    {/* Track anchored to right/center spine */}
                    <div className="relative flex-1 h-7 bg-slate-100 dark:bg-slate-800/80 rounded-l-md overflow-hidden border border-r-0 border-slate-200/80 dark:border-slate-700/70">
                      {/* 25% / 50% / 75% guide lines */}
                      <div className="absolute inset-y-0 right-1/4 w-px bg-slate-200/80 dark:bg-slate-700/60 pointer-events-none" />
                      <div className="absolute inset-y-0 right-1/2 w-px bg-slate-200/80 dark:bg-slate-700/60 pointer-events-none" />
                      <div className="absolute inset-y-0 right-3/4 w-px bg-slate-200/80 dark:bg-slate-700/60 pointer-events-none" />
                      {row.valA !== null && (
                        <div
                          className={`absolute inset-y-0 right-0 rounded-l-sm transition-all duration-300 ${
                            row.winner === 'A'
                              ? 'bg-blue-600 dark:bg-blue-500'
                              : row.winner === 'tie'
                              ? 'bg-blue-500/80 dark:bg-blue-500/80'
                              : 'bg-blue-400/65 dark:bg-blue-500/45'
                          }`}
                          style={{ width: `${barWidthA}%` }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Center Spine: Category Name, Source, Info Toggle & Delta */}
                  <div className="px-3 py-1 border-x border-slate-200 dark:border-slate-800 flex flex-col items-center text-center min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCategoryId((prev) => (prev === row.comp.id ? null : row.comp.id))
                      }
                      className="group inline-flex items-center justify-center gap-1.5 max-w-full cursor-pointer focus:outline-hidden"
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

                    <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 max-w-full">
                      <span className="truncate">{row.sourceName}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums shrink-0">{row.comp.weightPct}%</span>
                    </div>

                    {/* Delta Indicator */}
                    <div className="mt-1 font-mono tabular-nums text-[11px] font-bold">
                      {row.winner === 'na' ? (
                        <span className="text-slate-400 dark:text-slate-500">
                          {lang === 'de' ? 'Nicht vergleichbar' : 'N/A'}
                        </span>
                      ) : row.winner === 'tie' ? (
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Minus className="w-3 h-3" />
                          <span>{lang === 'de' ? 'Gleichstand (0.0)' : 'Tie (0.0)'}</span>
                        </span>
                      ) : row.winner === 'A' ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          ◀ A +{(row.diff as number).toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400">
                          B +{Math.abs(row.diff as number).toFixed(1)} ▶
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Zone: Mirrored Left-to-Right Bar + Bot B Score */}
                  <div className="flex items-center justify-start gap-3 pl-3 min-w-0">
                    {/* Track anchored to left/center spine */}
                    <div className="relative flex-1 h-7 bg-slate-100 dark:bg-slate-800/80 rounded-r-md overflow-hidden border border-l-0 border-slate-200/80 dark:border-slate-700/70">
                      <div className="absolute inset-y-0 left-1/4 w-px bg-slate-200/80 dark:bg-slate-700/60 pointer-events-none" />
                      <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200/80 dark:bg-slate-700/60 pointer-events-none" />
                      <div className="absolute inset-y-0 left-3/4 w-px bg-slate-200/80 dark:bg-slate-700/60 pointer-events-none" />
                      {row.valB !== null && (
                        <div
                          className={`absolute inset-y-0 left-0 rounded-r-sm transition-all duration-300 ${
                            row.winner === 'B'
                              ? 'bg-rose-600 dark:bg-rose-500'
                              : row.winner === 'tie'
                              ? 'bg-rose-500/80 dark:bg-rose-500/80'
                              : 'bg-rose-400/65 dark:bg-rose-500/45'
                          }`}
                          style={{ width: `${barWidthB}%` }}
                        />
                      )}
                    </div>

                    <div className="text-left shrink-0 w-24 lg:w-28">
                      <div
                        className={`font-mono tabular-nums text-sm font-bold ${
                          row.valB === null
                            ? 'text-slate-400 dark:text-slate-500'
                            : row.winner === 'B'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {row.valB !== null ? `${formatNumber(row.valB, 1)}%` : '—'}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                        {row.contribB !== null
                          ? row.isRescaled && row.rawB !== null
                            ? `${lang === 'de' ? 'roh' : 'raw'} ${formatNumber(row.rawB, 0)}% · +${row.contribB.toFixed(1)}`
                            : `+${row.contribB.toFixed(1)} ${lang === 'de' ? 'Pkt' : 'pts'}`
                          : lang === 'de'
                          ? 'Keine Daten'
                          : 'No data'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile (< md) Split Comparison Row */}
                <div className="md:hidden p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCategoryId((prev) => (prev === row.comp.id ? null : row.comp.id))
                      }
                      className="flex items-center gap-2 text-left min-w-0 cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.comp.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {row.label}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {row.sourceName} · {row.comp.weightPct}%
                        </div>
                      </div>
                    </button>
                    <div className="font-mono tabular-nums text-[11px] font-bold shrink-0">
                      {row.winner === 'na' ? (
                        <span className="text-slate-400">—</span>
                      ) : row.winner === 'tie' ? (
                        <span className="text-slate-500">Tie (0.0)</span>
                      ) : row.winner === 'A' ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          A +{(row.diff as number).toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400">
                          B +{Math.abs(row.diff as number).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-1 text-xs">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 truncate">
                          A
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {row.valA !== null ? `${formatNumber(row.valA, 1)}%` : '—'}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        {row.valA !== null && (
                          <div
                            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                            style={{ width: `${barWidthA}%` }}
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-1 text-xs">
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400 truncate">
                          B
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {row.valB !== null ? `${formatNumber(row.valB, 1)}%` : '—'}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        {row.valB !== null && (
                          <div
                            className="h-full bg-rose-600 dark:bg-rose-500 rounded-full"
                            style={{ width: `${barWidthB}%` }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expandable Category Details Drawer */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

        {/* Totals Footer Row inside Split Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)] items-center px-4 py-3 bg-slate-50/90 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 gap-2 md:gap-0">
          <div className="flex items-center justify-between md:justify-end gap-3 md:pr-4">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 md:hidden">
              A · {modelA.displayName}
            </span>
            <div className="text-right font-mono tabular-nums">
              <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">
                {activeScoreLabel}:
              </span>
              <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                {primaryA !== null ? formatNumber(primaryA, 1) : '—'}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">/ 100</span>
            </div>
          </div>

          <div className="text-center font-mono tabular-nums text-xs font-bold text-slate-700 dark:text-slate-300 md:border-x md:border-slate-200 dark:md:border-slate-800 md:px-3">
            {primaryDelta !== null
              ? Math.abs(primaryDelta) < 0.05
                ? lang === 'de'
                  ? 'Gleichstand'
                  : 'Tied'
                : primaryDelta > 0
                ? `◀ A +${primaryDelta.toFixed(1)} ${lang === 'de' ? 'Pkt.' : 'pts'}`
                : `B +${Math.abs(primaryDelta).toFixed(1)} ${lang === 'de' ? 'Pkt.' : 'pts'} ▶`
              : '—'}
          </div>

          <div className="flex items-center justify-between md:justify-start gap-3 md:pl-4">
            <div className="text-left font-mono tabular-nums">
              <span className="text-xs text-slate-500 dark:text-slate-400 mr-2 md:hidden">
                {activeScoreLabel}:
              </span>
              <span className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                {primaryB !== null ? formatNumber(primaryB, 1) : '—'}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">/ 100</span>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 md:hidden">
              {modelB.displayName} · B
            </span>
          </div>
        </div>
      </section>

      {/* Optional Historical Benchmark Columns (U-X) for Old Score / Legacy Models */}
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
                  ? 'Historische Einzel-Benchmarks (Alter Score, Spalten U–X)'
                  : 'Historical Sub-Benchmarks (Old Score, Columns U–X)'}
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
                  className="grid grid-cols-3 items-center px-4 py-2.5 text-xs"
                >
                  <div className="font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                    {row.valA !== null ? `${formatNumber(row.valA, 1)}%` : '—'}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {row.label}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">
                      {row.comp.sourceName}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                    {row.valB !== null ? `${formatNumber(row.valB, 1)}%` : '—'}
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
