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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col gap-2">
      {/* ZEILE 1: Suchfeld + Chatbot-Anzahl-Regler + Kategorie-Regler (kompakt, harmonisch) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Suchfeld */}
        <div className="relative flex-1 min-w-[200px] sm:max-w-xs md:max-w-sm flex items-center">
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

        {/* Die beiden Slider nebeneinander: Chatbot Count & Kategorie */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Chatbot Count Slider */}
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

          {/* Kategorie Slider */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1">
            <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              {t.categorySliderLabel}
            </span>
            <button
              type="button"
              onClick={() => handleCategoryStep(-1)}
              disabled={selectedCategoryIndex <= 0}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
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
              className="w-16 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleCategoryStep(1)}
              disabled={selectedCategoryIndex >= BENCHMARK_COMPONENTS.length}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
              title={t.categoryStepPlus}
            >
              <Plus className="w-3 h-3" />
            </button>

            {/* Badge der aktiven Kategorie */}
            <div className="flex items-center min-w-[70px] sm:min-w-[100px]">
              {activeCategoryComp ? (
                <span
                  className="text-[10px] sm:text-[11px] font-mono font-bold px-1.5 py-0.5 rounded text-white shadow-2xs flex items-center gap-1 truncate max-w-[130px] sm:max-w-[170px]"
                  style={{ backgroundColor: activeCategoryComp.color }}
                  title={`${lang === 'en' ? activeCategoryComp.nameEn : activeCategoryComp.nameDe} (${activeCategoryComp.sourceName})`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  <span className="truncate">
                    {lang === 'en' ? activeCategoryComp.nameEn : activeCategoryComp.nameDe}
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

      {/* ZEILE 2: Modus-Schalter, Sortierung & Hersteller-Filter (übersichtlich gegliedert) */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
        {/* Linker Block: Score-Modus + Chatbots-Umfang + Explosion + Sortierung */}
        <div className="flex flex-wrap items-center gap-1.5">
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

          {/* Volle Explosion Schalter */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2 py-0.5">
            <span className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-mono font-medium">
              {t.explosionToggle}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={fullExplosionEnabled}
              onClick={onFullExplosionToggle}
              className={`relative inline-flex h-3.5 w-6.5 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                fullExplosionEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              title={fullExplosionEnabled ? t.fullExplosionOnDesc : t.fullExplosionOffDesc}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  fullExplosionEnabled ? 'translate-x-3' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-[9.5px] font-bold font-mono text-slate-500 dark:text-slate-400">
              {fullExplosionEnabled ? t.on : t.off}
            </span>
          </div>

          {/* Trenner */}
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

          {/* Sortierung (Score vs Datum) */}
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

        {/* Rechter Block: Hersteller-Filter (kompakt) */}
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

          {/* Die 12 Hersteller-Buttons */}
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
      </div>
    </div>
  );
};
