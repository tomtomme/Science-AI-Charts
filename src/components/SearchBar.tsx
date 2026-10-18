import React, { useState, useRef, useMemo } from 'react';
import { Search, X, Plus, Minus, BarChart2, Calendar } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { SortField, ModelScope, ScoreMode, BenchmarkComponent } from '../types';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  selectedFamilies: string[];
  onToggleFamily: (family: string) => void;
  onClearFamilies: () => void;
  topCount: number;
  onTopCountChange: (count: number) => void;
  maxAvailableModels: number;
  matchCount?: number;
  totalCount?: number;
  lang: Language;
  sortBy: SortField;
  onSortByChange: (sort: SortField) => void;
  selectedCategoryIndex: number;
  onCategoryIndexChange: (idx: number) => void;
  onHoverCategory?: (comp: BenchmarkComponent | null) => void;
  scoreMode: ScoreMode;
  onScoreModeChange: (mode: ScoreMode) => void;
  onScrollToFinalScores?: () => void;
  onScrollToParagraph?: (targetId: string) => void;
  modelScope: ModelScope;
  onModelScopeChange: (scope: ModelScope) => void;
  showAdvanced?: boolean;
  categoryNames?: string[];
}

// 12 alphabetische Hersteller-Familien (ohne 'Ling')
const ALPHABETICAL_FAMILIES = [
  'ChatGPT',
  'Claude',
  'DeepSeek',
  'Gemini',
  'GLM',
  'Grok',
  'Kimi',
  'MiMo',
  'MiniMax',
  'Mistral',
  'Muse',
  'Qwen',
];

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  selectedFamilies,
  onToggleFamily,
  onClearFamilies,
  topCount,
  onTopCountChange,
  maxAvailableModels,
  lang,
  sortBy,
  onSortByChange,
  selectedCategoryIndex,
  onCategoryIndexChange,
  onHoverCategory,
  scoreMode,
  onScoreModeChange,
  onScrollToFinalScores,
  onScrollToParagraph,
  modelScope,
  onModelScopeChange,
  showAdvanced = false,
  categoryNames,
}) => {
  const t = TRANSLATIONS[lang];

  const handleScroll = (targetId: string) => {
    if (onScrollToParagraph) {
      onScrollToParagraph(targetId);
    } else if (onScrollToFinalScores) {
      onScrollToFinalScores();
    }
  };

  // Chatbot-Count Slider Handlers
  const handleTopSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      onTopCountChange(val);
    }
  };

  const handleTopStep = (step: number) => {
    const nextVal = Math.max(5, Math.min(maxAvailableModels, topCount + step));
    onTopCountChange(nextVal);
  };

  // Unified Slider Value:
  // 0 = New Score (scoreMode='new', category=0)
  // 1 = Old Score (scoreMode='old', category=0)
  // 2 = Worst Case (scoreMode='worstCase', category=0)
  // 3..10 = Categories 1..8
  const unifiedSliderValue = useMemo(() => {
    if (selectedCategoryIndex === 0) {
      if (scoreMode === 'old') return 1;
      if (scoreMode === 'worstCase') return 2;
      return 0;
    }
    return selectedCategoryIndex + 2;
  }, [selectedCategoryIndex, scoreMode]);

  const handleUnifiedSliderChange = (newVal: number) => {
    if (newVal === 0) {
      onScoreModeChange('new');
      onCategoryIndexChange(0);
      onHoverCategory?.(null);
    } else if (newVal === 1) {
      onScoreModeChange('old');
      onCategoryIndexChange(0);
      onHoverCategory?.(null);
    } else if (newVal === 2) {
      onScoreModeChange('worstCase');
      onCategoryIndexChange(0);
      onHoverCategory?.(null);
    } else {
      const catIdx = newVal - 2;
      onCategoryIndexChange(catIdx);
      onHoverCategory?.(BENCHMARK_COMPONENTS[catIdx - 1]);
    }
  };

  const handleUnifiedStep = (step: number) => {
    const nextVal = Math.max(0, Math.min(10, unifiedSliderValue + step));
    handleUnifiedSliderChange(nextVal);
  };

  const activeCategoryComp =
    selectedCategoryIndex > 0 ? BENCHMARK_COMPONENTS[selectedCategoryIndex - 1] : null;

  const activeCategoryName = activeCategoryComp
    ? ((categoryNames && selectedCategoryIndex > 0 && categoryNames[selectedCategoryIndex - 1]) ||
       (lang === 'en' ? activeCategoryComp.nameEn : activeCategoryComp.nameDe))
    : null;

  // Exact popup info and scroll targets for all 3 composite scores + all 8 benchmark categories
  const popupInfo = useMemo(() => {
    const isDe = lang === 'de';
    if (unifiedSliderValue === 0) {
      return {
        title: isDe ? 'Final Score NEW (Spalte M)' : 'Final Score NEW (Column M)',
        desc: isDe
          ? 'Gewichteter Gesamtscore über alle 8 wissenschaftlichen Benchmarks mit jeweils 12.5% Gewichtung.'
          : 'Weighted total score across all 8 scientific benchmarks with 12.5% weight each.',
        linkText: isDe ? 'Zum Textabschnitt von Spalte M springen' : 'Jump to explanation for Column M',
        targetId: 'note-col-m',
        color: '#10B981',
      };
    }
    if (unifiedSliderValue === 1) {
      return {
        title: isDe ? 'Final Score OLD (Spalte L)' : 'Final Score OLD (Column L)',
        desc: isDe
          ? 'Früherer Gesamtscore über 5 Benchmarks vor Integration der Rechts-/Wirtschafts-Kategorie.'
          : 'Earlier composite score over 5 benchmarks prior to legal/economics integration.',
        linkText: isDe ? 'Zum Textabschnitt von Spalte L springen' : 'Jump to explanation for Column L',
        targetId: 'note-col-l',
        color: '#D97706',
      };
    }
    if (unifiedSliderValue === 2) {
      return {
        title: isDe ? 'Final Score Worst-Case (Spalte N)' : 'Final Score Worst-Case (Column N)',
        desc: isDe
          ? '7-Benchmark-Durchschnitt multipliziert mit Non-Hallucination-Rate (Spalte N). Konservatives Szenario.'
          : '7-benchmark average multiplied by Non-Hallucination Rate (Column N). Conservative scenario.',
        linkText: isDe ? 'Zum Textabschnitt von Spalte N springen' : 'Jump to explanation for Column N',
        targetId: 'note-col-n',
        color: '#F43F5E',
      };
    }

    // Category 1..8
    const catIdx = unifiedSliderValue - 2; // 1..8
    const comp = BENCHMARK_COMPONENTS[catIdx - 1];
    const colLetters = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
    const colTargets = [
      'note-col-d',
      'note-col-e',
      'note-col-f',
      'note-col-g',
      'note-col-h',
      'note-col-i',
      'note-col-j',
      'note-col-k',
    ];
    const letter = colLetters[catIdx - 1] || '';
    const targetId = colTargets[catIdx - 1] || 'final-scores-section';
    const compName = isDe ? comp?.nameDe : comp?.nameEn;

    return {
      title: `#${catIdx} ${compName} (Spalte ${letter})`,
      desc: isDe
        ? `${comp?.descriptionDe} (Quelle: ${comp?.sourceName}, Formel: ${comp?.formulaDesc})`
        : `${comp?.descriptionEn} (Source: ${comp?.sourceName}, Formula: ${comp?.formulaDesc})`,
      linkText: isDe
        ? `Zum Textabschnitt von Spalte ${letter} (${compName}) springen`
        : `Jump to explanation for Column ${letter} (${compName})`,
      targetId,
      color: comp?.color || '#3B82F6',
    };
  }, [unifiedSliderValue, lang]);

  if (!showAdvanced) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col gap-2.5">
      {/* ZEILE 1: Filter-Suchfeld (links) + Score-Slider (rechts) - innerhalb des erweiterten Bereichs */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* 1. Filter/Suchfeld ("filter by company ...") */}
        <div className="relative flex-1 min-w-[190px] max-w-full sm:max-w-xs md:max-w-sm flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition-colors"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title={t.reset}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Merged Score Slider */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 ml-auto">
          <div
            className="relative flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0"
          >
            <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
              Score:
            </span>
            <button
              type="button"
              onClick={() => handleUnifiedStep(-1)}
              disabled={unifiedSliderValue <= 0}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
              title="-1 Step"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={unifiedSliderValue}
              onChange={(e) => handleUnifiedSliderChange(Number(e.target.value))}
              className="w-20 sm:w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 shrink-0"
            />
            <button
              type="button"
              onClick={() => handleUnifiedStep(1)}
              disabled={unifiedSliderValue >= 10}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
              title="+1 Step"
            >
              <Plus className="w-3 h-3" />
            </button>

            {/* Feste Box für das Badge: New Score / Old Score / Worst Case oder Kategorie 1..8 */}
            <div className="w-[155px] sm:w-[195px] shrink-0 overflow-hidden flex items-center">
              {unifiedSliderValue === 0 && (
                <button
                  type="button"
                  onClick={() => handleScroll('note-col-m')}
                  className="text-[10px] sm:text-[10.5px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-emerald-500 transition-colors"
                  title={popupInfo.linkText}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  <span className="truncate">{t.scoreModeNew}</span>
                </button>
              )}
              {unifiedSliderValue === 1 && (
                <button
                  type="button"
                  onClick={() => handleScroll('note-col-l')}
                  className="text-[10px] sm:text-[10.5px] font-mono font-bold px-2 py-0.5 rounded bg-amber-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-amber-500 transition-colors"
                  title={popupInfo.linkText}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  <span className="truncate">{t.scoreModeOld}</span>
                </button>
              )}
              {unifiedSliderValue === 2 && (
                <button
                  type="button"
                  onClick={() => handleScroll('note-col-n')}
                  className="text-[10px] sm:text-[10.5px] font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-rose-500 transition-colors"
                  title={popupInfo.linkText}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  <span className="truncate">{t.scoreModeWorstCase}</span>
                </button>
              )}
              {unifiedSliderValue >= 3 && activeCategoryComp && activeCategoryName && (
                <button
                  type="button"
                  onClick={() => handleScroll(popupInfo.targetId)}
                  className="text-[10px] sm:text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded text-white shadow-2xs flex items-center gap-1 truncate w-full cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: activeCategoryComp.color }}
                  title={popupInfo.linkText}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  <span className="truncate">
                    #{unifiedSliderValue - 2} {activeCategoryName}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ZEILE 2: Modell-Familien, Scope, Count & Sortierung */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Modell-Familien Buttons */}
          <div className="flex flex-wrap items-center gap-1">
            {/* 'Alle' Button */}
            <button
              type="button"
              onClick={onClearFamilies}
              className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                selectedFamilies.length === 0
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.all}
            </button>

            {/* Die alphabetischen Hersteller-Buttons */}
            {ALPHABETICAL_FAMILIES.map((family) => {
              const isSelected = selectedFamilies.includes(family);
              return (
                <button
                  key={family}
                  type="button"
                  onClick={() => onToggleFamily(family)}
                  className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs ring-1 ring-emerald-500'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {family}
                </button>
              );
            })}
          </div>

          {/* Rechte Kontroll-Gruppe: Current/All Switcher + Max Bar Count Slider + Sortierung ganz rechts */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 xl:ml-auto">
            {/* Current vs All Chatbots */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onModelScopeChange('current')}
                className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  modelScope === 'current'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t.scopeCurrentDesc}
              >
                {t.scopeCurrent}
              </button>
              <button
                type="button"
                onClick={() => onModelScopeChange('all')}
                className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  modelScope === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t.scopeAllDesc}
              >
                {t.scopeAll}
              </button>
            </div>

            {/* Max Bar Count Slider */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1">
              <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {t.topSliderTop}:
              </span>
              <button
                type="button"
                onClick={() => handleTopStep(-5)}
                disabled={topCount <= 5}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                title={t.stepMinusChatbots}
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min={5}
                max={Math.max(5, maxAvailableModels)}
                step={5}
                value={Math.min(topCount, maxAvailableModels)}
                onChange={handleTopSliderChange}
                className="w-16 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleTopStep(5)}
                disabled={topCount >= maxAvailableModels}
                className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                title={t.stepPlusChatbots}
              >
                <Plus className="w-3 h-3" />
              </button>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100 min-w-[20px] text-right">
                {Math.min(topCount, maxAvailableModels)}
              </span>
            </div>

            {/* Sortierung (Score vs Datum) ganz rechts */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onSortByChange('score')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  sortBy === 'score'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t.sortScoreDesc}
              >
                <BarChart2 className="w-3 h-3" />
                <span>{t.sortScore}</span>
              </button>
              <button
                type="button"
                onClick={() => onSortByChange('date')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  sortBy === 'date'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t.sortDateDesc}
              >
                <Calendar className="w-3 h-3" />
                <span>{t.sortDate}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
  );
};
