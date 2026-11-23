import React from 'react';
import {
  BarChart2,
  BookOpen,
  Building2,
  Columns2,
  ExternalLink,
  GitCompare,
  Minus,
  Plus,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  BenchmarkComponent,
  ModelScope,
  PriceFilter,
  ScoreMode,
} from '../types';
import { CsvHeaderMetadata } from '../utils/csvParser';
import { BENCHMARK_COMPONENTS, RETIRED_TIMELINE_BENCHMARKS } from '../data/benchmarks';
import {
  CORRELATION_REGRESSION_OPTIONS,
  RegressionOption,
  TIMELINE_REGRESSION_OPTIONS,
} from '../data/regressionOptions';
import type { LabGroup } from './LabMatrixView';
import { ScoreSlider } from './ScoreSlider';
import { Tooltip } from './Tooltip';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface RegressionToolbarControlsProps {
  lang: Language;
  options: RegressionOption[];
  regressionIndex: number;
  onRegressionIndexChange: React.Dispatch<React.SetStateAction<number>>;
  polyDegree: number;
  onPolyDegreeChange: (deg: number) => void;
  loessSpan: number;
  onLoessSpanChange: (span: number) => void;
  iconColorClass: string;
  sliderAccentClass: string;
}

const RegressionToolbarControls: React.FC<RegressionToolbarControlsProps> = ({
  lang,
  options,
  regressionIndex,
  onRegressionIndexChange,
  polyDegree,
  onPolyDegreeChange,
  loessSpan,
  onLoessSpanChange,
  iconColorClass,
  sliderAccentClass,
}) => {
  const activeRegression = options[regressionIndex] || options[0];

  return (
    <>
      <Tooltip
        title={lang === 'de' ? activeRegression.labelDe : activeRegression.labelEn}
        badge={lang === 'de' ? 'Modell' : 'Model'}
        position="bottom"
        align="center"
        width="w-96"
        className="w-full sm:w-auto max-w-full min-w-0"
        content={
          <div className="space-y-2">
            <p className="leading-relaxed text-slate-200">
              {lang === 'de' ? activeRegression.descDe : activeRegression.descEn}
            </p>
            {activeRegression.id === 'polynomial' && (
              <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-xs text-amber-300">
                <span className="text-slate-300">
                  {lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}
                </span>
                <span className="font-bold">
                  {lang === 'de'
                    ? `Grad ${polyDegree} (${
                        polyDegree === 2
                          ? 'Parabel'
                          : polyDegree === 3
                          ? 'Wendepunkt'
                          : 'Höhere Ordnung'
                      })`
                    : `Degree ${polyDegree} (${
                        polyDegree === 2
                          ? 'Parabola'
                          : polyDegree === 3
                          ? 'Inflection'
                          : 'Higher order'
                      })`}
                </span>
              </div>
            )}
            {activeRegression.id === 'loess' && (
              <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-xs text-amber-300">
                <span className="text-slate-300">
                  {lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}
                </span>
                <span className="font-bold">
                  {lang === 'de'
                    ? `Span = ${loessSpan}% (Fensterbreite)`
                    : `Span = ${loessSpan}% (Window width)`}
                </span>
              </div>
            )}
            {activeRegression.id !== 'frontier' && (
              <div className="pt-1.5 border-t border-slate-700/60 text-xs text-slate-300 leading-snug">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>{lang === 'de' ? '95%-Konfidenzband' : '95% Confidence Band'}</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  {lang === 'de'
                    ? 'Das schattierte Band zeigt den statistischen Unsicherheitsbereich der Schätzung: Bei dichter Datenlage ist es schmal, bei wenigen oder streuenden Punkten weitet es sich.'
                    : 'The shaded ribbon reflects estimation uncertainty: narrow where data is abundant, wider where observations are scarce or dispersed.'}
                </p>
              </div>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 w-full sm:w-auto min-w-0 max-w-full cursor-pointer">
          <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0 flex items-center gap-1">
            <TrendingUp className={`w-3.5 h-3.5 ${iconColorClass}`} />
            <span>{lang === 'de' ? 'Modell:' : 'Model:'}</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRegressionIndexChange((prev) => Math.max(0, prev - 1));
            }}
            disabled={regressionIndex <= 0}
            className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
            title="-1"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="range"
            min={0}
            max={options.length - 1}
            step={1}
            value={regressionIndex}
            onChange={(e) => onRegressionIndexChange(Number(e.target.value))}
            className={`flex-1 min-w-[44px] sm:flex-none sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer ${sliderAccentClass}`}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRegressionIndexChange((prev) => Math.min(options.length - 1, prev + 1));
            }}
            disabled={regressionIndex >= options.length - 1}
            className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
            title="+1"
          >
            <Plus className="w-3 h-3" />
          </button>

          <div className="min-w-0 flex-1 max-w-[140px] sm:flex-none sm:w-[125px] sm:max-w-none flex items-center">
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded text-white shadow-2xs flex items-center gap-1.5 truncate w-full hover:opacity-95 transition-opacity"
              style={{ backgroundColor: activeRegression.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              <span className="truncate">
                {lang === 'de' ? activeRegression.shortDe : activeRegression.shortEn}
              </span>
            </span>
          </div>
        </div>
      </Tooltip>

      <div
        className={`w-full sm:w-[140px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 max-w-full ${
          activeRegression.id !== 'polynomial' && activeRegression.id !== 'loess'
            ? 'opacity-40 cursor-not-allowed'
            : ''
        }`}
      >
        <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
          Param:
        </span>
        {activeRegression.id === 'polynomial' ? (
          <div className="w-[72px] sm:w-[76px] h-6 flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 shadow-2xs">
            <input
              type="number"
              min={2}
              max={4}
              step={1}
              value={polyDegree}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onPolyDegreeChange(Math.min(4, Math.max(2, val)));
              }}
              className="w-full bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right pr-1"
            />
            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 select-none">
              deg
            </span>
          </div>
        ) : activeRegression.id === 'loess' ? (
          <div className="w-[72px] sm:w-[76px] h-6 flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 shadow-2xs">
            <input
              type="number"
              min={10}
              max={100}
              step={5}
              value={loessSpan}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onLoessSpanChange(Math.min(100, Math.max(10, val)));
              }}
              className="w-full bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right pr-1"
            />
            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 select-none">
              %
            </span>
          </div>
        ) : (
          <div className="w-[72px] sm:w-[76px] h-6 flex items-center justify-center font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/40 rounded border border-transparent select-none">
            —
          </div>
        )}
      </div>
    </>
  );
};

interface TabControlBarProps {
  lang: Language;
  activeTab: 'benchmark' | 'labs';
  benchmarkView: 'barchart' | 'timeline' | 'correlations' | 'compare';
  onSelectBenchmarkView: (view: 'barchart' | 'timeline' | 'correlations' | 'compare') => void;
  onSelectLabsTab: () => void;
  headerMeta?: CsvHeaderMetadata;
  onHoverCategory: (comp: BenchmarkComponent | null) => void;
  onScrollToParagraph: (targetId: string) => void;
  onNavigateToGlossaryTerm: (termId?: string) => void;

  // BarChart controls
  searchFilter: string;
  onClearSearchFilter: () => void;
  scoreMode: ScoreMode;
  onScoreModeChange: (mode: ScoreMode) => void;
  selectedCategoryIndex: number;
  onSelectCategoryIndex: (idx: number) => void;
  priceFilter: PriceFilter;
  onPriceFilterChange: (filter: PriceFilter) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;

  // Timeline controls
  timelineScoreMode: ScoreMode;
  onTimelineScoreModeChange: (mode: ScoreMode) => void;
  timelineCategoryIndex: number;
  onTimelineCategoryIndexChange: (idx: number) => void;
  timelineRegressionIndex: number;
  onTimelineRegressionIndexChange: React.Dispatch<React.SetStateAction<number>>;
  timelinePolyDegree: number;
  onTimelinePolyDegreeChange: (deg: number) => void;
  timelineLoessSpan: number;
  onTimelineLoessSpanChange: (span: number) => void;

  // Correlations controls
  correlationsScope: 'all' | 'frontier';
  onCorrelationsScopeChange: (scope: 'all' | 'frontier') => void;
  fullTimelineModelCount: number;
  correlationsFrontierCount: number;
  correlationsRegressionIndex: number;
  onCorrelationsRegressionIndexChange: React.Dispatch<React.SetStateAction<number>>;
  correlationsPolyDegree: number;
  onCorrelationsPolyDegreeChange: (deg: number) => void;
  correlationsLoessSpan: number;
  onCorrelationsLoessSpanChange: (span: number) => void;

  // Compare controls
  compareScope: ModelScope;
  onCompareScopeChange: (scope: ModelScope) => void;
  availableModelCount: number;
  totalModelCount: number;

  // Labs controls
  labActiveGroup: LabGroup;
  onLabActiveGroupChange: (group: LabGroup) => void;
  labCounts: {
    all: number;
    top10: number;
    contender: number;
    tweakers: number;
    small: number;
    harness: number;
  };
  showLabAdvanced: boolean;
  onToggleLabAdvanced: () => void;
}

export const TabControlBar: React.FC<TabControlBarProps> = ({
  lang,
  activeTab,
  benchmarkView,
  onSelectBenchmarkView,
  onSelectLabsTab,
  headerMeta,
  onHoverCategory,
  onScrollToParagraph,
  onNavigateToGlossaryTerm,
  searchFilter,
  onClearSearchFilter,
  scoreMode,
  onScoreModeChange,
  selectedCategoryIndex,
  onSelectCategoryIndex,
  priceFilter,
  onPriceFilterChange,
  showAdvanced,
  onToggleAdvanced,
  timelineScoreMode,
  onTimelineScoreModeChange,
  timelineCategoryIndex,
  onTimelineCategoryIndexChange,
  timelineRegressionIndex,
  onTimelineRegressionIndexChange,
  timelinePolyDegree,
  onTimelinePolyDegreeChange,
  timelineLoessSpan,
  onTimelineLoessSpanChange,
  correlationsScope,
  onCorrelationsScopeChange,
  fullTimelineModelCount,
  correlationsFrontierCount,
  correlationsRegressionIndex,
  onCorrelationsRegressionIndexChange,
  correlationsPolyDegree,
  onCorrelationsPolyDegreeChange,
  correlationsLoessSpan,
  onCorrelationsLoessSpanChange,
  compareScope,
  onCompareScopeChange,
  availableModelCount,
  totalModelCount,
  labActiveGroup,
  onLabActiveGroupChange,
  labCounts,
  showLabAdvanced,
  onToggleLabAdvanced,
}) => {
  const t = TRANSLATIONS[lang];

  const categoryNames =
    lang === 'de'
      ? headerMeta?.categoryNamesDe || headerMeta?.categoryNames
      : headerMeta?.categoryNames;
  const isPreTranslatedCategoryNames = Boolean(
    lang === 'de' && headerMeta?.categoryNamesDe?.length === 8
  );
  const compositeScoreNames =
    lang === 'de'
      ? headerMeta?.compositeScoreNamesDe || headerMeta?.compositeScoreNames
      : headerMeta?.compositeScoreNames;
  const isPreTranslatedCompositeScoreNames = Boolean(
    lang === 'de' && headerMeta?.compositeScoreNamesDe?.length === 3
  );
  const retiredCategoryNames =
    lang === 'de'
      ? headerMeta?.retiredCategoryNamesDe || headerMeta?.retiredCategoryNames
      : headerMeta?.retiredCategoryNames;
  const isPreTranslatedRetiredCategoryNames = Boolean(
    lang === 'de' && headerMeta?.retiredCategoryNamesDe?.length === 4
  );

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 relative md:sticky md:top-0 z-30 px-3 sm:px-6 shadow-2xs">
      <div className="w-full max-w-[1720px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-2.5 py-2">
        {/* Segmented Tab Controls: responsive grid on mobile, compact single strip on sm+ */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full lg:w-auto min-w-0 max-w-full">
          <div className="grid grid-cols-2 min-[460px]:grid-cols-4 sm:flex sm:items-center gap-1 sm:gap-0.5 bg-slate-200/70 dark:bg-slate-700/60 rounded-lg p-0.5 min-w-0">
            <button
              type="button"
              onClick={() => onSelectBenchmarkView('barchart')}
              className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'benchmark' && benchmarkView === 'barchart'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'de' ? 'Rangliste' : 'Ranking'}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectBenchmarkView('compare')}
              className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'benchmark' && benchmarkView === 'compare'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{lang === 'de' ? 'Vergleich' : 'Compare'}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectBenchmarkView('timeline')}
              className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'benchmark' && benchmarkView === 'timeline'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>{lang === 'de' ? 'Historie' : 'History'}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectBenchmarkView('correlations')}
              className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'benchmark' && benchmarkView === 'correlations'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{lang === 'de' ? 'Analyse' : 'Analysis'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onSelectLabsTab}
            className={`flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 w-full sm:w-auto ${
              activeTab === 'labs'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'de' ? 'Ökosystem' : 'Ecosystem'}</span>
          </button>
        </div>

        {/* Right section: Active filter reset notice + View-specific header controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto lg:ml-auto min-w-0 max-w-full py-0.5">
          {searchFilter && activeTab === 'benchmark' && benchmarkView === 'barchart' && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs w-full sm:w-auto min-w-0 max-w-full">
              <span className="text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1 min-w-0">
                <span className="shrink-0">{lang === 'de' ? 'Aktiver Lab-/Modell-Filter:' : 'Active Lab/Model filter:'}</span>
                <strong className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[160px] sm:max-w-[240px]">
                  {searchFilter}
                </strong>
              </span>
              <button
                type="button"
                onClick={onClearSearchFilter}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium whitespace-nowrap shrink-0"
              >
                {lang === 'de' ? 'Filter aufheben' : 'Reset filter'}
              </button>
            </div>
          )}

          {/* Bar Chart Controls */}
          {activeTab === 'benchmark' && benchmarkView === 'barchart' && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto min-w-0 max-w-full">
              <ScoreSlider
                scoreMode={scoreMode}
                onScoreModeChange={onScoreModeChange}
                selectedCategoryIndex={selectedCategoryIndex}
                onSelectCategoryIndex={onSelectCategoryIndex}
                categoryNames={categoryNames}
                isPreTranslatedCategoryNames={isPreTranslatedCategoryNames}
                compositeScoreNames={compositeScoreNames}
                isPreTranslatedCompositeScoreNames={isPreTranslatedCompositeScoreNames}
                retiredCategoryNames={retiredCategoryNames}
                isPreTranslatedRetiredCategoryNames={isPreTranslatedRetiredCategoryNames}
                row33Meta={headerMeta?.row33}
                onHoverCategory={onHoverCategory}
                onScrollToParagraph={onScrollToParagraph}
                lang={lang}
              />

              {/* Price Filter Switcher: Free(API|Chat)Paid|All */}
              <div
                className="flex flex-wrap items-center gap-y-0.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 font-mono text-xs font-bold min-w-0 max-w-full"
                role="group"
                aria-label={t.priceFilterDesc}
              >
                <div className="flex items-center gap-0 pl-1 pr-0.5 shrink-0 whitespace-nowrap">
                  <Tooltip
                    title={
                      <span className="text-emerald-400">
                        Free ({lang === 'de' ? 'Kostenlos' : 'Free'})
                      </span>
                    }
                    align="left"
                    width="w-60"
                    content={
                      lang === 'de'
                        ? 'Kostenlose Modelle: Zwischen Free API und Free Chat OR API umschalten.'
                        : 'Free models: Toggle between Free API and Free Chat OR API.'
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onPriceFilterChange(priceFilter === 'free_api' ? 'free_chat' : 'free_api')
                      }
                      className={`px-0 py-1 sm:py-0.5 font-bold text-xs select-none cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                        priceFilter === 'free_api' || priceFilter === 'free_chat'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Free(
                    </button>
                  </Tooltip>

                  <Tooltip
                    title={<span className="text-emerald-400">🌐 Free API</span>}
                    badge={lang === 'de' ? 'Schnittstelle' : 'Interface'}
                    align="left"
                    width="w-72"
                    content={
                      <div>
                        <div className="mb-2">
                          {lang === 'de'
                            ? 'Nur Modelle mit kostenlosem API-Zugriff (🌐). Ermöglicht den direkten programmatischen Zugriff über Netzwerk-Endpunkte – z. B. für JASP, Python-Skripte oder automatisierte KI-Agenten ohne monatliche Grundgebühr.'
                            : 'Only models offering free API access (🌐). Provides direct programmatic access over network endpoints – e.g. for JASP, Python scripts, or automated AI agent workflows without monthly subscription fees.'}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToGlossaryTerm('term-api');
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline pt-1.5 border-t border-slate-800/90 w-full cursor-pointer transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>
                            {lang === 'de'
                              ? 'Ausführliche Erklärung im Glossar öffnen →'
                              : 'Read full explanation in Glossary →'}
                          </span>
                        </button>
                      </div>
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onPriceFilterChange('free_api')}
                      className={`px-0.5 sm:px-0 py-1 sm:py-0.5 rounded transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        priceFilter === 'free_api'
                          ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                      }`}
                      aria-pressed={priceFilter === 'free_api'}
                    >
                      API🌐
                    </button>
                  </Tooltip>

                  <span className="text-slate-500 dark:text-slate-600 text-xs px-0 select-none">
                    |
                  </span>

                  <Tooltip
                    title={<span className="text-emerald-400">Free Chat OR API</span>}
                    align="center"
                    width="w-64"
                    content={
                      lang === 'de'
                        ? 'Kostenlos im Web-Chat nutzbar ODER mit kostenloser API verfügbar.'
                        : 'Free to use in web chat OR available with a free API tier.'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onPriceFilterChange('free_chat')}
                      className={`px-0.5 sm:px-0 py-1 sm:py-0.5 rounded transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        priceFilter === 'free_chat'
                          ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                      }`}
                      aria-pressed={priceFilter === 'free_chat'}
                    >
                      Chat
                    </button>
                  </Tooltip>

                  <span
                    className={`px-0 font-bold text-xs select-none ${
                      priceFilter === 'free_api' || priceFilter === 'free_chat'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    )
                  </span>
                </div>

                <Tooltip
                  title={
                    <span className="text-amber-400">
                      {lang === 'de' ? 'Kostenpflichtig (€)' : 'Paid ($)'}
                    </span>
                  }
                  align="center"
                  width="w-64"
                  content={
                    lang === 'de'
                      ? 'Nur kostenpflichtige Chatbots, die ein aktives kostenpflichtiges Abonnement (Plus/Pro/Abo) voraussetzen.'
                      : 'Paid chatbots only (requiring a subscription tier like Plus/Pro or paid billing).'
                  }
                >
                  <button
                    type="button"
                    onClick={() => onPriceFilterChange('paid')}
                    className={`px-2 py-1 sm:py-0.5 rounded transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      priceFilter === 'paid'
                        ? 'bg-amber-600 text-white shadow-2xs font-extrabold'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                    }`}
                    aria-pressed={priceFilter === 'paid'}
                  >
                    {lang === 'de' ? '€' : '$'}
                  </button>
                </Tooltip>

                <span className="text-slate-400 dark:text-slate-600 text-xs px-0.5 select-none">
                  |
                </span>

                <Tooltip
                  title={
                    <span className="text-blue-400">
                      {lang === 'de' ? 'Alle Modelle' : 'All Models'}
                    </span>
                  }
                  align="right"
                  width="w-56"
                  content={
                    lang === 'de'
                      ? 'Alle Chatbots anzeigen (kostenlos & bezahlt).'
                      : 'Show all chatbots (free & paid).'
                  }
                >
                  <button
                    type="button"
                    onClick={() => onPriceFilterChange('all')}
                    className={`px-2 py-1 sm:py-0.5 rounded transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      priceFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                    }`}
                    aria-pressed={priceFilter === 'all'}
                  >
                    {t.priceAll}
                  </button>
                </Tooltip>
              </div>

              {/* Advanced Toggle */}
              <button
                type="button"
                onClick={onToggleAdvanced}
                aria-expanded={showAdvanced}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
                  showAdvanced
                    ? 'bg-blue-600 text-white border-blue-500 shadow-2xs ring-2 ring-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
                }`}
              >
                <SlidersHorizontal
                  className={`w-3.5 h-3.5 ${showAdvanced ? 'text-white' : 'text-blue-500'}`}
                />
                <span>{t.advanced}</span>
                <span
                  className={`text-xs ${
                    showAdvanced ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {showAdvanced ? '▲' : '▼'}
                </span>
              </button>
            </div>
          )}

          {/* Timeline View Header Controls */}
          {activeTab === 'benchmark' && benchmarkView === 'timeline' && (
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto min-w-0 max-w-full">
              <ScoreSlider
                scoreMode={timelineScoreMode}
                onScoreModeChange={onTimelineScoreModeChange}
                selectedCategoryIndex={timelineCategoryIndex}
                onSelectCategoryIndex={(idx) => {
                  onTimelineCategoryIndexChange(idx);
                  if (idx > 8) {
                    onHoverCategory(RETIRED_TIMELINE_BENCHMARKS[idx - 9]);
                  } else if (idx > 0) {
                    onHoverCategory(BENCHMARK_COMPONENTS[idx - 1]);
                  } else {
                    onHoverCategory(null);
                  }
                }}
                categoryNames={categoryNames}
                isPreTranslatedCategoryNames={isPreTranslatedCategoryNames}
                compositeScoreNames={compositeScoreNames}
                isPreTranslatedCompositeScoreNames={isPreTranslatedCompositeScoreNames}
                retiredCategoryNames={retiredCategoryNames}
                isPreTranslatedRetiredCategoryNames={isPreTranslatedRetiredCategoryNames}
                row33Meta={headerMeta?.row33}
                onHoverCategory={onHoverCategory}
                onScrollToParagraph={onScrollToParagraph}
                lang={lang}
                allowRetiredScores={true}
              />

              <RegressionToolbarControls
                lang={lang}
                options={TIMELINE_REGRESSION_OPTIONS}
                regressionIndex={timelineRegressionIndex}
                onRegressionIndexChange={onTimelineRegressionIndexChange}
                polyDegree={timelinePolyDegree}
                onPolyDegreeChange={onTimelinePolyDegreeChange}
                loessSpan={timelineLoessSpan}
                onLoessSpanChange={onTimelineLoessSpanChange}
                iconColorClass="text-blue-500"
                sliderAccentClass="accent-blue-600"
              />
            </div>
          )}

          {/* Correlations View Header Controls */}
          {activeTab === 'benchmark' && benchmarkView === 'correlations' && (
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto min-w-0 max-w-full">
              <div className="grid grid-cols-2 sm:flex sm:items-center w-full sm:w-auto bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 min-w-0 max-w-full">
                <button
                  type="button"
                  aria-pressed={correlationsScope === 'all'}
                  onClick={() => onCorrelationsScopeChange('all')}
                  className={`px-1.5 sm:px-2.5 py-1.5 sm:py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap truncate text-center ${
                    correlationsScope === 'all'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {lang === 'de' ? 'Alle Modelle' : 'All Models'} ({fullTimelineModelCount})
                </button>
                <button
                  type="button"
                  aria-pressed={correlationsScope === 'frontier'}
                  onClick={() => onCorrelationsScopeChange('frontier')}
                  className={`px-1.5 sm:px-2.5 py-1.5 sm:py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap truncate ${
                    correlationsScope === 'frontier'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400'
                  }`}
                  title={
                    lang === 'de'
                      ? 'Nur Pionier-Modelle (historische Rekordhalter / Pareto-Front)'
                      : 'Only pioneer models (historical record breakers / Pareto frontier)'
                  }
                >
                  <Sparkles
                    className={`w-3 h-3 shrink-0 ${
                      correlationsScope === 'frontier' ? 'text-white' : 'text-amber-500'
                    }`}
                  />
                  <span>{lang === 'de' ? 'Pioniere' : 'Pioneers'}</span>
                  <span className="text-xs opacity-90">({correlationsFrontierCount})</span>
                </button>
              </div>

              <RegressionToolbarControls
                lang={lang}
                options={CORRELATION_REGRESSION_OPTIONS}
                regressionIndex={correlationsRegressionIndex}
                onRegressionIndexChange={onCorrelationsRegressionIndexChange}
                polyDegree={correlationsPolyDegree}
                onPolyDegreeChange={onCorrelationsPolyDegreeChange}
                loessSpan={correlationsLoessSpan}
                onLoessSpanChange={onCorrelationsLoessSpanChange}
                iconColorClass="text-rose-500"
                sliderAccentClass="accent-rose-500"
              />
            </div>
          )}

          {/* Compare View Header Controls */}
          {activeTab === 'benchmark' && benchmarkView === 'compare' && (
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto min-w-0 max-w-full">
              <div
                className="grid grid-cols-3 sm:flex sm:items-center w-full sm:w-auto bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 min-w-0 max-w-full"
                role="group"
                aria-label={
                  lang === 'de' ? 'Score-Modus für Vergleich' : 'Comparison score mode'
                }
              >
                {(['new', 'old', 'worstCase'] as ScoreMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onScoreModeChange(mode)}
                    className={`px-1.5 sm:px-2.5 py-1.5 sm:py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap truncate text-center ${
                      scoreMode === mode
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    {mode === 'new'
                      ? t.scoreModeNew
                      : mode === 'old'
                      ? t.scoreModeOld
                      : t.scoreModeWorstCase}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:flex sm:items-center w-full sm:w-auto bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 min-w-0 max-w-full">
                <button
                  type="button"
                  onClick={() => onCompareScopeChange('current')}
                  className={`px-1.5 sm:px-2.5 py-1.5 sm:py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap truncate text-center ${
                    compareScope === 'current'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {t.scopeCurrent} ({availableModelCount})
                </button>
                <button
                  type="button"
                  onClick={() => onCompareScopeChange('all')}
                  className={`px-1.5 sm:px-2.5 py-1.5 sm:py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap truncate text-center ${
                    compareScope === 'all'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {t.scopeAll} ({totalModelCount})
                </button>
              </div>
            </div>
          )}

          {/* Ecosystem / Lab Matrix View Header Controls */}
          {activeTab === 'labs' && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto min-w-0 max-w-full">
              <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:flex sm:items-center gap-1 sm:gap-0.5 bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80 w-full sm:w-auto min-w-0 max-w-full sm:order-2">
                <button
                  type="button"
                  onClick={() => onLabActiveGroupChange('all')}
                  className={`px-2 sm:px-2.5 py-1.5 sm:py-1 text-xs font-mono font-bold rounded transition-all whitespace-nowrap truncate text-center cursor-pointer ${
                    labActiveGroup === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {lang === 'de' ? `Alle (${labCounts.all})` : `All (${labCounts.all})`}
                </button>
                <button
                  type="button"
                  onClick={() => onLabActiveGroupChange('top10')}
                  className={`px-2 sm:px-2.5 py-1.5 sm:py-1 text-xs font-mono font-bold rounded transition-all whitespace-nowrap truncate text-center cursor-pointer ${
                    labActiveGroup === 'top10'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {lang === 'de' ? `Top LLM (${labCounts.top10})` : `Top LLM (${labCounts.top10})`}
                </button>
                <button
                  type="button"
                  onClick={() => onLabActiveGroupChange('contender')}
                  className={`px-2 sm:px-2.5 py-1.5 sm:py-1 text-xs font-mono font-bold rounded transition-all whitespace-nowrap truncate text-center cursor-pointer ${
                    labActiveGroup === 'contender'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {lang === 'de'
                    ? `Herausforderer (${labCounts.contender})`
                    : `Contenders (${labCounts.contender})`}
                </button>
                <button
                  type="button"
                  onClick={() => onLabActiveGroupChange('tweakers')}
                  className={`px-2 sm:px-2.5 py-1.5 sm:py-1 text-xs font-mono font-bold rounded transition-all whitespace-nowrap truncate text-center cursor-pointer ${
                    labActiveGroup === 'tweakers'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {lang === 'de'
                    ? `Tweakers (${labCounts.tweakers})`
                    : `Tweakers (${labCounts.tweakers})`}
                </button>
                <button
                  type="button"
                  onClick={() => onLabActiveGroupChange('small')}
                  className={`px-2 sm:px-2.5 py-1.5 sm:py-1 text-xs font-mono font-bold rounded transition-all whitespace-nowrap truncate text-center cursor-pointer ${
                    labActiveGroup === 'small'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {lang === 'de'
                    ? `Spezialisiert (${labCounts.small})`
                    : `Specialized (${labCounts.small})`}
                </button>
                <button
                  type="button"
                  onClick={() => onLabActiveGroupChange('harness')}
                  className={`px-2 sm:px-2.5 py-1.5 sm:py-1 text-xs font-mono font-bold rounded transition-all whitespace-nowrap truncate text-center cursor-pointer ${
                    labActiveGroup === 'harness'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {lang === 'de'
                    ? `Agentensteuerung (${labCounts.harness})`
                    : `Scaffolding (${labCounts.harness})`}
                </button>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto sm:contents">
                <a
                  href="https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/edit?gid=355721692#gid=355721692"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700/80 shrink-0 whitespace-nowrap sm:order-1"
                  title={
                    lang === 'de'
                      ? 'Original-Tabelle in neuem Tab öffnen'
                      : 'Open original spreadsheet in new tab'
                  }
                >
                  <span>{lang === 'de' ? 'Original-Sheet' : 'Original Sheet'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={onToggleLabAdvanced}
                  aria-expanded={showLabAdvanced}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border shrink-0 whitespace-nowrap sm:order-3 ${
                    showLabAdvanced
                      ? 'bg-blue-600 text-white border-blue-500 shadow-2xs ring-2 ring-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
                  }`}
                >
                  <SlidersHorizontal
                    className={`w-3.5 h-3.5 ${showLabAdvanced ? 'text-white' : 'text-blue-500'}`}
                  />
                  <span>{t.advanced}</span>
                  <span
                    className={`text-xs ${
                      showLabAdvanced ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {showLabAdvanced ? '▲' : '▼'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
