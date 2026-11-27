import React, { useMemo, useState, useCallback, memo } from 'react';
import { Sparkles, Grid3X3 } from 'lucide-react';
import { ModelRecord } from '../types';
import { extractFrontierPoints } from '../utils/mathRegression';
import { Tooltip } from './Tooltip';
import { RegressionModelControls } from './RegressionModelControls';
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

export const CorrelationsScatterplot: React.FC<CorrelationsScatterplotProps> = memo(({
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
  const row2Labels: Row2LabelContext = useMemo(
    () => ({
      categoryNames,
      isPreTranslatedCategoryNames,
      compositeScoreNames,
      isPreTranslatedCompositeScoreNames,
      retiredCategoryNames,
      isPreTranslatedRetiredCategoryNames,
    }),
    [
      categoryNames,
      isPreTranslatedCategoryNames,
      compositeScoreNames,
      isPreTranslatedCompositeScoreNames,
      retiredCategoryNames,
      isPreTranslatedRetiredCategoryNames,
    ]
  );

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

  // Stable swap & mode handlers so Plot 1 & Plot 2 do not invalidate each other's React.memo
  const handleSwapPlot1 = useCallback(() => {
    setPlot1XDimIndex(plot1YDimIndex);
    setPlot1YDimIndex(plot1XDimIndex);
  }, [plot1XDimIndex, plot1YDimIndex]);

  const handleSwapPlot2 = useCallback(() => {
    setPlot2XDimIndex(plot2YDimIndex);
    setPlot2YDimIndex(plot2XDimIndex);
  }, [plot2XDimIndex, plot2YDimIndex]);

  const handleTogglePlot1Mode = useCallback(() => {
    setPlot1Mode((m) => (m === 'scatter' ? 'heatmap' : 'scatter'));
  }, []);
  const handleTogglePlot1Metric = useCallback(() => {
    setPlot1HeatmapMetric((prev) => (prev === 'pearson' ? 'spearman' : 'pearson'));
  }, []);
  const handleSelectPairForPlot2 = useCallback((xIdx: number, yIdx: number) => {
    setPlot2XDimIndex(xIdx);
    setPlot2YDimIndex(yIdx);
    setPlot2Mode('scatter');
  }, []);

  const handleTogglePlot2Mode = useCallback(() => {
    setPlot2Mode((m) => (m === 'scatter' ? 'heatmap' : 'scatter'));
  }, []);
  const handleTogglePlot2Metric = useCallback(() => {
    setPlot2HeatmapMetric((prev) => (prev === 'pearson' ? 'spearman' : 'pearson'));
  }, []);
  const handleSelectPairForPlot1 = useCallback((xIdx: number, yIdx: number) => {
    setPlot1XDimIndex(xIdx);
    setPlot1YDimIndex(yIdx);
    setPlot1Mode('scatter');
  }, []);

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
            <RegressionModelControls
              lang={lang}
              options={CORRELATION_REGRESSION_OPTIONS}
              regressionIndex={regressionIndex}
              onRegressionIndexChange={setRegressionIndex}
              polyDegree={polyDegree}
              onPolyDegreeChange={setPolyDegree}
              loessSpan={loessSpan}
              onLoessSpanChange={setLoessSpan}
              iconColorClass="text-rose-500"
              sliderAccentClass="accent-rose-500"
            />
          </div>
        </div>
      )}

      {/* 2 CORRELATION PLOTS SIDE-BY-SIDE (Quadratic 1:1 Aspect Ratio) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderPlotPanel({
          mode: plot1Mode,
          onToggleMode: handleTogglePlot1Mode,
          heatmapMetric: plot1HeatmapMetric,
          onToggleHeatmapMetric: handleTogglePlot1Metric,
          xAxisDimIndex: plot1XDimIndex,
          yAxisDimIndex: plot1YDimIndex,
          onXAxisDimChange: setPlot1XDimIndex,
          onYAxisDimChange: setPlot1YDimIndex,
          onSwapAxes: handleSwapPlot1,
          onSelectPairForOtherPlot: handleSelectPairForPlot2,
        })}

        {renderPlotPanel({
          mode: plot2Mode,
          onToggleMode: handleTogglePlot2Mode,
          heatmapMetric: plot2HeatmapMetric,
          onToggleHeatmapMetric: handleTogglePlot2Metric,
          xAxisDimIndex: plot2XDimIndex,
          yAxisDimIndex: plot2YDimIndex,
          onXAxisDimChange: setPlot2XDimIndex,
          onYAxisDimChange: setPlot2YDimIndex,
          onSwapAxes: handleSwapPlot2,
          onSelectPairForOtherPlot: handleSelectPairForPlot1,
        })}
      </div>
    </div>
  );
});
