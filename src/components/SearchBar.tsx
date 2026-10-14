import React from 'react';
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
  modelScope: ModelScope;
  onModelScopeChange: (scope: ModelScope) => void;
  fullExplosionEnabled: boolean;
  onFullExplosionToggle: () => void;
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
  modelScope,
  onModelScopeChange,
  fullExplosionEnabled,
  onFullExplosionToggle,
  showAdvanced = false,
  categoryNames,
}) => {
  const t = TRANSLATIONS[lang];

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

  // Category Slider Handlers (0 = Alles, 1..8 = Einzelkategorie)
  const handleCategorySliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx)) {
      onCategoryIndexChange(idx);
      if (idx > 0) {
        onHoverCategory?.(BENCHMARK_COMPONENTS[idx - 1]);
      } else {
        onHoverCategory?.(null);
      }
    }
  };

  const handleCategoryStep = (step: number) => {
    const nextIdx = Math.max(0, Math.min(BENCHMARK_COMPONENTS.length, selectedCategoryIndex + step));
    onCategoryIndexChange(nextIdx);
    if (nextIdx > 0) {
      onHoverCategory?.(BENCHMARK_COMPONENTS[nextIdx - 1]);
    } else {
      onHoverCategory?.(null);
    }
  };

  const activeCategoryComp =
    selectedCategoryIndex > 0 ? BENCHMARK_COMPONENTS[selectedCategoryIndex - 1] : null;

  const activeCategoryName = activeCategoryComp
    ? ((categoryNames && selectedCategoryIndex > 0 && categoryNames[selectedCategoryIndex - 1]) ||
       (lang === 'en' ? activeCategoryComp.nameEn : activeCategoryComp.nameDe))
    : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col gap-2">
      {/* ZEILE 1: Filter-Suchfeld (oben links) + Modus-Schalter, Current/All, Max Bar Count Slider, Sortierung (rechts) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* 1. Filter/Suchfeld ("filter by company ...") oben links */}
        <div className="relative flex-1 min-w-[200px] max-w-full sm:max-w-xs md:max-w-sm flex items-center">
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

        {/* Rechte Kontroll-Gruppe: NEW/OLD Score + Current/All Switcher + Max Bar Count Slider + Sortierung ganz rechts - nur sichtbar, wenn showAdvanced aktiv ist */}
        {showAdvanced && (
          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            {/* NEW vs OLD Score */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onScoreModeChange('new')}
                className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  scoreMode === 'new'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t.scoreModeNewDesc}
              >
                {t.scoreModeNew}
              </button>
              <button
                type="button"
                onClick={() => onScoreModeChange('old')}
                className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  scoreMode === 'old'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t.scoreModeOldDesc}
              >
                {t.scoreModeOld}
              </button>
            </div>

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

            {/* Sortierung (Score vs Datum) ganz rechts in Zeile 1 */}
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
        )}
      </div>

      {/* ZEILE 2: Erweiterter Button-Slider-Bereich (wird nur angezeigt, wenn showAdvanced aktiv ist) */}
      {showAdvanced && (
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Modell-Familien Buttons (nach unten verschoben) */}
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

          {/* Rechts: Kategorie-Slider */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 xl:ml-auto">
            {/* Kategorie Slider (mit festen + / - Tasten) */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0">
              <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
                {t.categorySliderLabel.endsWith(':') ? t.categorySliderLabel : `${t.categorySliderLabel}:`}
              </span>
              <button
                type="button"
                onClick={() => handleCategoryStep(-1)}
                disabled={selectedCategoryIndex <= 0}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                title={t.categoryStepMinus}
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min={0}
                max={BENCHMARK_COMPONENTS.length}
                step={1}
                value={selectedCategoryIndex}
                onChange={handleCategorySliderChange}
                className="w-16 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 shrink-0"
              />
              <button
                type="button"
                onClick={() => handleCategoryStep(1)}
                disabled={selectedCategoryIndex >= BENCHMARK_COMPONENTS.length}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                title={t.categoryStepPlus}
              >
                <Plus className="w-3 h-3" />
              </button>

              {/* Feste Box für das Badge: Synchronisierte Kategorienamen aus C34 / Zellen D2-K2 */}
              <div className="w-[145px] sm:w-[185px] shrink-0 overflow-hidden flex items-center">
                {activeCategoryComp && activeCategoryName ? (
                  <span
                    className="text-[10px] sm:text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded text-white shadow-2xs flex items-center gap-1 truncate w-full"
                    style={{ backgroundColor: activeCategoryComp.color }}
                    title={`${activeCategoryName} (${activeCategoryComp.sourceName})`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                    <span className="truncate">
                      {activeCategoryName}
                    </span>
                  </span>
                ) : (
                  <span
                    className="text-[10px] sm:text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                    title={t.allBenchmarksOverall}
                  >
                    {t.categoryAllShort}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
