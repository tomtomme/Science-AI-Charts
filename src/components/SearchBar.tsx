import React from 'react';
import { Search, X, Plus, Minus, BarChart2, Calendar } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { SortField, BenchmarkComponent } from '../types';

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
}

// Alphabetisch sortiert: ChatGPT, Claude, DeepSeek, Gemini, GLM, Grok, Kimi, Ling, MiMo, MiniMax, Mistral, Muse, Qwen
const ALPHABETICAL_FAMILIES = [
  'ChatGPT',
  'Claude',
  'DeepSeek',
  'Gemini',
  'GLM',
  'Grok',
  'Kimi',
  'Ling',
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
  matchCount,
  totalCount,
  lang,
  sortBy,
  onSortByChange,
  selectedCategoryIndex,
  onCategoryIndexChange,
  onHoverCategory,
}) => {
  const t = TRANSLATIONS[lang];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      onTopCountChange(val);
    }
  };

  const handleStep = (step: number) => {
    const nextVal = Math.max(5, Math.min(maxAvailableModels, topCount + step));
    onTopCountChange(nextVal);
  };

  const hasFilterActive = value.trim().length > 0 || selectedFamilies.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col gap-2.5">
      {/* Zeile 1: Suchfeld + Sortier-Buttons (Datum oder Punktzahl) + Scope-Knopf (Current vs All) + Modellanzahl Slider */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Suchfeld */}
        <div className="relative flex-1 flex items-center min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition-colors"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title={t.reset}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Button zum Sortieren der Balken nach: Punktzahl oder Datum (Spalte Y) */}
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium pl-1 hidden sm:inline">
            {t.sortByLabel}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSortByChange('score')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-all cursor-pointer ${
                sortBy === 'score'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title={lang === 'de' ? 'Nach Punktzahl absteigend sortieren' : 'Sort descending by score'}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{t.sortScore}</span>
            </button>

            <button
              type="button"
              onClick={() => onSortByChange('date')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-all cursor-pointer ${
                sortBy === 'date'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title={lang === 'de' ? 'Nach Veröffentlichungsdatum aus Spalte Y sortieren (neueste zuerst)' : 'Sort by release date in Column Y (newest first)'}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t.sortDateShort}</span>
              <span className="text-[10px] opacity-75 font-normal hidden md:inline">{t.colYShort}</span>
            </button>
          </div>
        </div>

        {/* 5er-Schritt-Slider für Chatbot-Anzahl (Standard: 15) */}
        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {t.topSliderTop}: {Math.min(topCount, maxAvailableModels)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleStep(-5)}
              disabled={topCount <= 5}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
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
              onChange={handleSliderChange}
              className="w-18 sm:w-22 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            <button
              type="button"
              onClick={() => handleStep(5)}
              disabled={topCount >= maxAvailableModels}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title={t.stepPlusChatbots}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
            ({t.maxLabel} {maxAvailableModels})
          </span>
        </div>
      </div>

      {/* Zeile 2: Nur die Auswahlknöpfe für Kategorien (alles links entfernt) */}
      <div className="flex flex-wrap items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => {
            onCategoryIndexChange(0);
            onHoverCategory?.(null);
          }}
          className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded font-mono transition-all cursor-pointer ${
            selectedCategoryIndex === 0
              ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-2xs ring-1 ring-slate-400'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title={t.allBenchmarksOverall}
        >
          {t.categoryAllShort}
        </button>

        {BENCHMARK_COMPONENTS.map((comp, idx) => {
          const isCatActive = selectedCategoryIndex === idx + 1;
          return (
            <button
              key={comp.id}
              type="button"
              onMouseEnter={() => {
                onHoverCategory?.(comp);
              }}
              onClick={() => {
                onCategoryIndexChange(idx + 1);
                onHoverCategory?.(comp);
              }}
              className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                isCatActive
                  ? 'font-bold shadow-2xs ring-1'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              style={
                isCatActive
                  ? {
                      backgroundColor: comp.color,
                      color: '#FFFFFF',
                      borderColor: comp.color,
                    }
                  : {}
              }
              title={`${lang === 'en' ? comp.nameEn : comp.nameDe} (${comp.sourceName}) · ${t.categoryFilterHint}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: isCatActive ? '#FFFFFF' : comp.color }}
              />
              <span>{lang === 'en' ? comp.nameEn.split(' ')[0] : comp.nameDe.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Zeile 3: Schnellfilter (Alphabetisch, Mehrfachauswahl >1 Kategorie möglich) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
        <span className="text-[11px] text-slate-400 font-mono font-medium shrink-0 mr-1">
          {t.quickFilters}
        </span>

        {/* 'Alle' Button: deaktiviert alle Filter */}
        <button
          type="button"
          onClick={onClearFamilies}
          className={`text-[11px] px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
            selectedFamilies.length === 0
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {t.all}
        </button>

        {/* Die 13 alphabetischen Schnellfilter-Buttons (Mehrfachauswahl) */}
        {ALPHABETICAL_FAMILIES.map((family) => {
          const isSelected = selectedFamilies.includes(family);
          return (
            <button
              key={family}
              type="button"
              onClick={() => onToggleFamily(family)}
              className={`text-[11px] px-2 py-0.5 rounded font-mono transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs ring-1 ring-emerald-500'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {family}
            </button>
          );
        })}

        {hasFilterActive && matchCount !== undefined && (
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold ml-auto shrink-0">
            ({matchCount} {t.modelsCount})
          </span>
        )}
      </div>
    </div>
  );
};
