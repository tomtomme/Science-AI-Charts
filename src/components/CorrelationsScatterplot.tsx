import React, { useMemo, useState } from 'react';
import { TrendingUp, Plus, Minus, Sparkles, Grid3X3 } from 'lucide-react';
import { ModelRecord } from '../types';
import { extractFrontierPoints } from '../utils/mathRegression';
import { Tooltip } from './Tooltip';
import {
  CORRELATION_REGRESSION_OPTIONS,
  DEFAULT_CORRELATION_REGRESSION_INDEX,
  type CorrelationRegressionOption,
} from '../data/regressionOptions';
import { Row2LabelContext } from './correlations/correlationHelpers';
import { SingleCorrelationPlot } from './correlations/SingleCorrelationPlot';
import { CorrelationHeatmap } from './correlations/CorrelationHeatmap';

export { CORRELATION_REGRESSION_OPTIONS, DEFAULT_CORRELATION_REGRESSION_INDEX };
export type { CorrelationRegressionOption };

export interface CorrelationsScatterplotProps {
  models: ModelRecord[];
  allModels: ModelRecord[];
  onScrollToParagraph?: (targetId: string) => void;
  onScrollToFinalScores?: () => void;
  lang: 'de' | 'en';
  categoryNames?: string[];
  isPreTranslatedCategoryNames?: boolean;
  compositeScoreNames?: string[];
  isPreTranslatedCompositeScoreNames?: boolean;
  retiredCategoryNames?: string[];
  isPreTranslatedRetiredCategoryNames?: boolean;
  // Controlled props when header controls are elevated
  scope?: 'all' | 'frontier';
  onScopeChange?: (scope: 'all' | 'frontier') => void;
  regressionIndex?: number;
  onRegressionIndexChange?: (idx: number | ((prev: number) => number)) => void;
  polyDegree?: number;
  onPolyDegreeChange?: (deg: number) => void;
  loessSpan?: number;
  onLoessSpanChange?: (span: number) => void;
  hideHeaderControls?: boolean;
}

export const CorrelationsScatterplot: React.FC<CorrelationsScatterplotProps> = ({
  allModels,
  onScrollToParagraph,
  lang,
  categoryNames,
  isPreTranslatedCategoryNames = false,
  compositeScoreNames,
  isPreTranslatedCompositeScoreNames = false,
  retiredCategoryNames,
  isPreTranslatedRetiredCategoryNames = false,
  scope: controlledScope,
  onScopeChange,
  regressionIndex: controlledRegressionIndex,
  onRegressionIndexChange,
  polyDegree: controlledPolyDegree,
  onPolyDegreeChange,
  loessSpan: controlledLoessSpan,
  onLoessSpanChange,
  hideHeaderControls = false,
}) => {
  const row2Labels: Row2LabelContext = {
    categoryNames,
    isPreTranslatedCategoryNames,
    compositeScoreNames,
    isPreTranslatedCompositeScoreNames,
    retiredCategoryNames,
    isPreTranslatedRetiredCategoryNames,
  };

  // Plot 1 Dimension selection (Default: X = #1 Coding & Math, Y = #2 Non-Hallucination)
  const [plot1XDimIndex, setPlot1XDimIndex] = useState<number>(3);
  const [plot1YDimIndex, setPlot1YDimIndex] = useState<number>(4);

  // Plot 2 Dimension selection (Default: X = Old Score, Y = New Score)
  const [plot2XDimIndex, setPlot2XDimIndex] = useState<number>(1);
  const [plot2YDimIndex, setPlot2YDimIndex] = useState<number>(0);

  // Plot 1 & Plot 2 Mode Toggles: Scatterplot vs Correlation Heatmap (with R / Rho switch)
  const [plot1Mode, setPlot1Mode] = useState<'scatter' | 'heatmap'>('scatter');
  const [plot1HeatmapMetric, setPlot1HeatmapMetric] = useState<'pearson' | 'spearman'>('pearson');
  const [plot2Mode, setPlot2Mode] = useState<'scatter' | 'heatmap'>('scatter');
  const [plot2HeatmapMetric, setPlot2HeatmapMetric] = useState<'pearson' | 'spearman'>('pearson');

  // Model & Regression State: default to LOESS with Param 50%
  const [internalRegressionIndex, setInternalRegressionIndex] = useState<number>(DEFAULT_CORRELATION_REGRESSION_INDEX);
  const [internalPolyDegree, setInternalPolyDegree] = useState<number>(2); // Default degree 2
  const [internalLoessSpan, setInternalLoessSpan] = useState<number>(50); // Default 50%
  const [internalScope, setInternalScope] = useState<'all' | 'frontier'>('all');

  const regressionIndex = controlledRegressionIndex ?? internalRegressionIndex;
  const setRegressionIndex = onRegressionIndexChange ?? setInternalRegressionIndex;

  const polyDegree = controlledPolyDegree ?? internalPolyDegree;
  const setPolyDegree = onPolyDegreeChange ?? setInternalPolyDegree;

  const loessSpan = controlledLoessSpan ?? internalLoessSpan;
  const setLoessSpan = onLoessSpanChange ?? setInternalLoessSpan;

  const scope = controlledScope ?? internalScope;
  const setScope = onScopeChange ?? setInternalScope;

  const activeRegression = CORRELATION_REGRESSION_OPTIONS[regressionIndex] || CORRELATION_REGRESSION_OPTIONS[0];

  // Identify genuine historical SOTA breakthrough models
  const frontierPointIds = useMemo(() => {
    const eligible = allModels
      .filter((m) => {
        const sc = m.scoreOld ?? m.scoreNewReported;
        return typeof sc === 'number' && sc > 0;
      })
      .map((m) => ({
        id: m.id,
        name: m.name,
        displayName: m.displayName,
        company: m.creatorClean || m.companyName || 'LLM Lab',
        releaseDate: m.releaseDate,
        timestamp: new Date(m.releaseDate).getTime(),
        score: (m.scoreOld ?? m.scoreNewReported) as number,
        flag: m.flag,
        isPaid: m.isPaid,
      }));
    const sota = extractFrontierPoints(eligible);
    return new Set(sota.map((p) => p.id));
  }, [allModels]);

  // Swap handlers for each plot
  const handleSwapPlot1 = () => {
    setPlot1XDimIndex((prevX) => {
      const prevY = plot1YDimIndex;
      setPlot1YDimIndex(prevX);
      return prevY;
    });
  };

  const handleSwapPlot2 = () => {
    setPlot2XDimIndex((prevX) => {
      const prevY = plot2YDimIndex;
      setPlot2YDimIndex(prevX);
      return prevY;
    });
  };

  const renderPlotPanel = ({
    mode,
    onToggleMode,
    heatmapMetric,
    onToggleHeatmapMetric,
    xAxisDimIndex,
    yAxisDimIndex,
    onXAxisDimChange,
    onYAxisDimChange,
    onSwapAxes,
    onSelectPairForOtherPlot,
  }: {
    mode: 'scatter' | 'heatmap';
    onToggleMode: () => void;
    heatmapMetric: 'pearson' | 'spearman';
    onToggleHeatmapMetric: () => void;
    xAxisDimIndex: number;
    yAxisDimIndex: number;
    onXAxisDimChange: (idx: number) => void;
    onYAxisDimChange: (idx: number) => void;
    onSwapAxes: () => void;
    onSelectPairForOtherPlot: (xIdx: number, yIdx: number) => void;
  }) => {
    const heatmapToggleButton = (
      <Tooltip
        content={
          mode === 'heatmap'
            ? lang === 'de'
              ? 'Zurück zum Scatterplot wechseln'
              : 'Switch back to scatterplot'
            : lang === 'de'
              ? 'Alle Score-Korrelationen als Heatmap anzeigen'
              : 'Show all score correlations as a heatmap'
        }
        align="left"
        width="w-60"
      >
        <button
          type="button"
          onClick={onToggleMode}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md border transition-all cursor-pointer text-xs font-mono shadow-2xs ${
            mode === 'heatmap'
              ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white font-bold hover:bg-blue-700'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400'
          }`}
        >
          <Grid3X3 className={`w-3 h-3 ${mode === 'heatmap' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
          <span>Heatmap</span>
        </button>
      </Tooltip>
    );

    if (mode === 'heatmap') {
      return (
        <CorrelationHeatmap
          allModels={allModels}
          scope={scope}
          frontierPointIds={frontierPointIds}
          metric={heatmapMetric}
          onToggleMetric={onToggleHeatmapMetric}
          onSelectPairForOtherPlot={onSelectPairForOtherPlot}
          lang={lang}
          row2Labels={row2Labels}
          headerToggle={heatmapToggleButton}
        />
      );
    }

    return (
      <SingleCorrelationPlot
        allModels={allModels}
        scope={scope}
        frontierPointIds={frontierPointIds}
        activeRegression={activeRegression}
        polyDegree={polyDegree}
        loessSpan={loessSpan}
        xAxisDimIndex={xAxisDimIndex}
        yAxisDimIndex={yAxisDimIndex}
        onXAxisDimChange={onXAxisDimChange}
        onYAxisDimChange={onYAxisDimChange}
        onSwapAxes={onSwapAxes}
        lang={lang}
        row2Labels={row2Labels}
        onScrollToParagraph={onScrollToParagraph}
        headerToggle={heatmapToggleButton}
      />
    );
  };

  return (
    <div className="space-y-3">
      {/* Compact Controls Bar: Scope filter & Regression model controls (rendered if not placed in header) */}
      {!hideHeaderControls && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
          {/* Scope Segmented Control */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
            <button
              type="button"
              aria-pressed={scope === 'all'}
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {lang === 'de' ? 'Alle Modelle' : 'All Models'} ({allModels.length})
            </button>
            <button
              type="button"
              aria-pressed={scope === 'frontier'}
              onClick={() => setScope('frontier')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                scope === 'frontier'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400'
              }`}
              title={
                lang === 'de'
                  ? 'Nur Pionier-Modelle (historische Rekordhalter / Pareto-Front)'
                  : 'Only pioneer models (historical record breakers / Pareto frontier)'
              }
            >
              <Sparkles className={`w-3 h-3 ${scope === 'frontier' ? 'text-white' : 'text-amber-500'}`} />
              <span>{lang === 'de' ? 'Pioniere' : 'Pioneers'}</span>
              <span className="text-xs opacity-90">({frontierPointIds.size})</span>
            </button>
          </div>

          {/* Shared Regression Model Slider & Param Input */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Regression Model Picker */}
            <Tooltip
              title={lang === 'de' ? activeRegression.labelDe : activeRegression.labelEn}
              badge={lang === 'de' ? 'Modell' : 'Model'}
              position="bottom"
              align="center"
              width="w-96"
              content={
                <div className="space-y-2">
                  <p className="leading-relaxed text-slate-200">
                    {lang === 'de' ? activeRegression.descDe : activeRegression.descEn}
                  </p>
                  {activeRegression.id === 'polynomial' && (
                    <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-xs text-amber-300">
                      <span className="text-slate-300">{lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}</span>
                      <span className="font-bold">
                        {lang === 'de'
                          ? `Grad ${polyDegree} (${polyDegree === 2 ? 'Parabel' : polyDegree === 3 ? 'Wendepunkt' : 'Höhere Ordnung'})`
                          : `Degree ${polyDegree} (${polyDegree === 2 ? 'Parabola' : polyDegree === 3 ? 'Inflection' : 'Higher order'})`}
                      </span>
                    </div>
                  )}
                  {activeRegression.id === 'loess' && (
                    <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-xs text-amber-300">
                      <span className="text-slate-300">{lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}</span>
                      <span className="font-bold">
                        {lang === 'de' ? `Span = ${loessSpan}% (Fensterbreite)` : `Span = ${loessSpan}% (Window width)`}
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
              <div className="relative flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0 cursor-pointer">
                <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                  <span>{lang === 'de' ? 'Modell:' : 'Model:'}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRegressionIndex((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={regressionIndex <= 0}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                  title="-1"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={CORRELATION_REGRESSION_OPTIONS.length - 1}
                  step={1}
                  value={regressionIndex}
                  onChange={(e) => setRegressionIndex(Number(e.target.value))}
                  className="w-16 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500 shrink-0"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRegressionIndex((prev) => Math.min(CORRELATION_REGRESSION_OPTIONS.length - 1, prev + 1));
                  }}
                  disabled={regressionIndex >= CORRELATION_REGRESSION_OPTIONS.length - 1}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                  title="+1"
                >
                  <Plus className="w-3 h-3" />
                </button>

                {/* Model Badge */}
                <div className="w-[105px] sm:w-[125px] shrink-0 flex items-center">
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

            {/* Contextual Param Input (Fixed 76px width) */}
            <div
              className={`w-[140px] flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0 ${
                activeRegression.id !== 'polynomial' && activeRegression.id !== 'loess'
                  ? 'opacity-40 cursor-not-allowed'
                  : ''
              }`}
            >
              <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                Param:
              </span>
              {activeRegression.id === 'polynomial' ? (
                <div className="w-[76px] h-6 flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 shadow-2xs">
                  <input
                    type="number"
                    min={2}
                    max={4}
                    step={1}
                    value={polyDegree}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setPolyDegree(Math.min(4, Math.max(2, val)));
                    }}
                    className="w-full bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right pr-1"
                  />
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400 select-none">
                    deg
                  </span>
                </div>
              ) : activeRegression.id === 'loess' ? (
                <div className="w-[76px] h-6 flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 shadow-2xs">
                  <input
                    type="number"
                    min={10}
                    max={100}
                    step={5}
                    value={loessSpan}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setLoessSpan(Math.min(100, Math.max(10, val)));
                    }}
                    className="w-full bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right pr-1"
                  />
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 select-none">
                    %
                  </span>
                </div>
              ) : (
                <div className="w-[76px] h-6 flex items-center justify-center font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/40 rounded border border-transparent select-none">
                  —
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2 CORRELATION PLOTS SIDE-BY-SIDE (Quadratic 1:1 Aspect Ratio) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderPlotPanel({
          mode: plot1Mode,
          onToggleMode: () => setPlot1Mode((m) => (m === 'scatter' ? 'heatmap' : 'scatter')),
          heatmapMetric: plot1HeatmapMetric,
          onToggleHeatmapMetric: () => setPlot1HeatmapMetric((prev) => (prev === 'pearson' ? 'spearman' : 'pearson')),
          xAxisDimIndex: plot1XDimIndex,
          yAxisDimIndex: plot1YDimIndex,
          onXAxisDimChange: setPlot1XDimIndex,
          onYAxisDimChange: setPlot1YDimIndex,
          onSwapAxes: handleSwapPlot1,
          onSelectPairForOtherPlot: (xIdx, yIdx) => {
            setPlot2XDimIndex(xIdx);
            setPlot2YDimIndex(yIdx);
            setPlot2Mode('scatter');
          },
        })}

        {renderPlotPanel({
          mode: plot2Mode,
          onToggleMode: () => setPlot2Mode((m) => (m === 'scatter' ? 'heatmap' : 'scatter')),
          heatmapMetric: plot2HeatmapMetric,
          onToggleHeatmapMetric: () => setPlot2HeatmapMetric((prev) => (prev === 'pearson' ? 'spearman' : 'pearson')),
          xAxisDimIndex: plot2XDimIndex,
          yAxisDimIndex: plot2YDimIndex,
          onXAxisDimChange: setPlot2XDimIndex,
          onYAxisDimChange: setPlot2YDimIndex,
          onSwapAxes: handleSwapPlot2,
          onSelectPairForOtherPlot: (xIdx, yIdx) => {
            setPlot1XDimIndex(xIdx);
            setPlot1YDimIndex(yIdx);
            setPlot1Mode('scatter');
          },
        })}
      </div>
    </div>
  );
};
