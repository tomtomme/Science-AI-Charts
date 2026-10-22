import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ExternalLink, TrendingUp, Plus, Minus, ArrowLeftRight, Sparkles, ChevronDown, Check } from 'lucide-react';
import { ModelRecord, RegressionType, TimelineDataPoint } from '../types';
import { calculateRegression, extractFrontierPoints } from '../utils/mathRegression';
import {
  CORRELATION_DIMENSIONS,
  calculatePearson,
  calculateSpearman,
  CorrelationDimension,
  CorrelationPoint,
} from '../utils/correlationUtils';

interface CorrelationsScatterplotProps {
  models: ModelRecord[];
  allModels: ModelRecord[];
  onScrollToParagraph?: (targetId: string) => void;
  onScrollToFinalScores?: () => void;
  lang: 'de' | 'en';
}

interface RegressionOption {
  id: RegressionType;
  labelDe: string;
  labelEn: string;
  shortDe: string;
  shortEn: string;
  descDe: string;
  descEn: string;
  color: string;
}

const CORRELATION_REGRESSION_OPTIONS: RegressionOption[] = [
  {
    id: 'linear',
    labelDe: 'Linear (Trendlinie)',
    labelEn: 'Linear (Trendline)',
    shortDe: 'Linear',
    shortEn: 'Linear',
    descDe: 'Geradlinige Trendlinie (Pearson r Bezug)',
    descEn: 'Straight-line trend (Pearson r reference)',
    color: '#6366f1', // Indigo
  },
  {
    id: 'polynomial',
    labelDe: 'Polynom (Grad 2-4)',
    labelEn: 'Polynomial (deg 2-4)',
    shortDe: 'Polynom',
    shortEn: 'Polynom.',
    descDe: 'Parabolischer oder kubischer Kurventrend',
    descEn: 'Quadratic or cubic curve',
    color: '#f43f5e', // Rose
  },
  {
    id: 'power',
    labelDe: 'Power (Potenzkurve)',
    labelEn: 'Power (Scaling)',
    shortDe: 'Power',
    shortEn: 'Power',
    descDe: 'Potenzgesetz-Entwicklung',
    descEn: 'Power-law scaling curve',
    color: '#ec4899', // Pink
  },
  {
    id: 'exponential',
    labelDe: 'Exponential (Wachstum)',
    labelEn: 'Exponential (Growth)',
    shortDe: 'Expon.',
    shortEn: 'Expon.',
    descDe: 'Exponentielles Wachstum',
    descEn: 'Exponential acceleration',
    color: '#8b5cf6', // Violet
  },
  {
    id: 'loess',
    labelDe: 'LOESS (Smoothing)',
    labelEn: 'LOESS (Smoothing)',
    shortDe: 'LOESS',
    shortEn: 'LOESS',
    descDe: 'Lokale Glättung empirischer Daten',
    descEn: 'Locally estimated empirical smoothing',
    color: '#f59e0b', // Amber
  },
];

const DEFAULT_CORRELATION_REGRESSION_INDEX = Math.max(
  0,
  CORRELATION_REGRESSION_OPTIONS.findIndex((o) => o.id === 'loess')
);

// Helper to find optimal tooltip position with minimal data-point overlaps
function getOptimalTooltipPosition(
  dotX: number,
  dotY: number,
  containerW: number,
  containerH: number,
  allPoints: Array<{ id: string; x: number; y: number }>,
  currentPointId: string,
  tipW = 230,
  tipH = 68,
  padding = 8
): { left: number; top: number } {
  const candidates = [
    { left: dotX + 12, top: dotY - tipH - 8, name: 'TR' },
    { left: dotX - tipW - 12, top: dotY - tipH - 8, name: 'TL' },
    { left: dotX + 12, top: dotY + 12, name: 'BR' },
    { left: dotX - tipW - 12, top: dotY + 12, name: 'BL' },
  ];

  let bestCandidate = candidates[0];
  let minScore = Infinity;

  for (const c of candidates) {
    let left = c.left;
    let top = c.top;
    let boundaryPenalty = 0;

    if (left < padding) {
      boundaryPenalty += (padding - left) * 4;
      left = padding;
    } else if (left + tipW > containerW - padding) {
      boundaryPenalty += (left + tipW - (containerW - padding)) * 4;
      left = Math.max(padding, containerW - padding - tipW);
    }

    if (top < padding) {
      boundaryPenalty += (padding - top) * 4;
      top = padding;
    } else if (top + tipH > containerH - padding) {
      boundaryPenalty += (top + tipH - (containerH - padding)) * 4;
      top = Math.max(padding, containerH - padding - tipH);
    }

    let overlaps = 0;
    const rLeft = left - 2;
    const rRight = left + tipW + 2;
    const rTop = top - 2;
    const rBottom = top + tipH + 2;

    for (let i = 0; i < allPoints.length; i++) {
      const p = allPoints[i];
      if (p.id === currentPointId) continue;
      if (p.x >= rLeft && p.x <= rRight && p.y >= rTop && p.y <= rBottom) {
        overlaps++;
      }
    }

    const score = overlaps * 100 + boundaryPenalty;

    if (score < minScore) {
      minScore = score;
      bestCandidate = { left, top, name: c.name };
    }
  }

  return {
    left: Math.round(bestCandidate.left),
    top: Math.round(bestCandidate.top),
  };
}

// Dropdown Popover for direct axis title selection
interface AxisDimensionDropdownProps {
  currentDimIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  lang: 'de' | 'en';
  align?: 'left' | 'center' | 'right';
  direction?: 'up' | 'down';
}

const AxisDimensionDropdown: React.FC<AxisDimensionDropdownProps> = ({
  currentDimIndex,
  onSelect,
  onClose,
  lang,
  align = 'left',
  direction = 'down',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const compositeDims = CORRELATION_DIMENSIONS.slice(0, 3);
  const componentDims = CORRELATION_DIMENSIONS.slice(3);

  const alignClass =
    align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : align === 'right'
      ? 'right-0'
      : 'left-0';

  const positionClass =
    direction === 'up'
      ? `bottom-full mb-2 ${alignClass}`
      : `top-full mt-2 ${alignClass}`;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40 backdrop-blur-2xs cursor-default"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        className={`absolute z-50 ${positionClass} w-[270px] sm:w-[290px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl p-2 select-none animate-in fade-in zoom-in-95 duration-150 max-h-[360px] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 py-1 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400">
            {lang === 'de' ? 'Metrik auswählen' : 'Select Metric'}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {CORRELATION_DIMENSIONS.length} {lang === 'de' ? 'Optionen' : 'Options'}
          </span>
        </div>

        {/* Section 1: Composite Scores */}
        <div className="mb-2">
          <div className="px-2 py-0.5 text-[9.5px] font-mono uppercase font-semibold text-slate-400 dark:text-slate-500">
            {lang === 'de' ? 'Gesamt-Scores (3)' : 'Composite Scores (3)'}
          </div>
          <div className="space-y-0.5 mt-0.5">
            {compositeDims.map((dim) => {
              const isSelected = dim.index === currentDimIndex;
              return (
                <button
                  key={dim.id}
                  type="button"
                  onClick={() => onSelect(dim.index)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs font-mono transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: dim.color }}
                    />
                    <span className="truncate">{lang === 'de' ? dim.nameDe : dim.nameEn}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Component Categories */}
        <div>
          <div className="px-2 py-0.5 text-[9.5px] font-mono uppercase font-semibold text-slate-400 dark:text-slate-500">
            {lang === 'de' ? 'Einzel-Kategorien (8)' : 'Benchmark Categories (8)'}
          </div>
          <div className="space-y-0.5 mt-0.5">
            {componentDims.map((dim) => {
              const isSelected = dim.index === currentDimIndex;
              return (
                <button
                  key={dim.id}
                  type="button"
                  onClick={() => onSelect(dim.index)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs font-mono transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: dim.color }}
                    />
                    <span className="truncate">{lang === 'de' ? dim.nameDe : dim.nameEn}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

// Sub-component: A single rectangular correlation scatterplot with clickable axis titles
interface SingleCorrelationPlotProps {
  plotLabel: string;
  allModels: ModelRecord[];
  scope: 'all' | 'frontier';
  frontierPointIds: Set<string>;
  activeRegression: RegressionOption;
  polyDegree: number;
  loessSpan: number;
  xAxisDimIndex: number;
  yAxisDimIndex: number;
  onXAxisDimChange: (idx: number) => void;
  onYAxisDimChange: (idx: number) => void;
  onSwapAxes: () => void;
  lang: 'de' | 'en';
}

const SingleCorrelationPlot: React.FC<SingleCorrelationPlotProps> = ({
  plotLabel,
  allModels,
  scope,
  frontierPointIds,
  activeRegression,
  polyDegree,
  loessSpan,
  xAxisDimIndex,
  yAxisDimIndex,
  onXAxisDimChange,
  onYAxisDimChange,
  onSwapAxes,
  lang,
}) => {
  const xDim: CorrelationDimension = CORRELATION_DIMENSIONS[xAxisDimIndex] || CORRELATION_DIMENSIONS[0];
  const yDim: CorrelationDimension = CORRELATION_DIMENSIONS[yAxisDimIndex] || CORRELATION_DIMENSIONS[1];

  const [openAxisMenu, setOpenAxisMenu] = useState<'x' | 'y' | null>(null);

  const [hoveredPoint, setHoveredPoint] = useState<{
    point: CorrelationPoint;
    pos: { left: number; top: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // Extract correlation points for this plot
  const allCorrelationPoints = useMemo(() => {
    const list: CorrelationPoint[] = [];
    for (const m of allModels) {
      const xVal = xDim.getValue(m);
      const yVal = yDim.getValue(m);
      if (typeof xVal !== 'number' || typeof yVal !== 'number' || isNaN(xVal) || isNaN(yVal)) {
        continue;
      }
      list.push({
        id: m.id,
        name: m.name,
        displayName: m.displayName,
        company: m.creatorClean || m.companyName || 'LLM Lab',
        releaseDate: m.releaseDate || '2024-01-01',
        x: xVal,
        y: yVal,
        flag: m.flag,
        chatUrl: m.chatLink || m.modelUrl,
        isPaid: m.isPaid,
      });
    }
    return list.sort((a, b) => a.x - b.x);
  }, [allModels, xDim, yDim]);

  const activePoints = useMemo(() => {
    if (scope === 'frontier') {
      return allCorrelationPoints.filter((p) => frontierPointIds.has(p.id));
    }
    return allCorrelationPoints;
  }, [allCorrelationPoints, scope, frontierPointIds]);

  const pearsonResult = useMemo(() => calculatePearson(activePoints), [activePoints]);
  const spearmanResult = useMemo(() => calculateSpearman(activePoints), [activePoints]);

  // Quadratic 1:1 aspect ratio: 500 x 500 with square inner grid (400 x 400)
  const svgWidth = 500;
  const svgHeight = 500;
  const margin = { top: 42, right: 44, bottom: 58, left: 56 };
  const innerWidth = svgWidth - margin.left - margin.right; // 400
  const innerHeight = svgHeight - margin.top - margin.bottom; // 400

  const { minX, maxX, minY, maxY } = useMemo(() => {
    if (activePoints.length === 0) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    }
    const xVals = activePoints.map((p) => p.x);
    const yVals = activePoints.map((p) => p.y);

    const minXVal = Math.min(...xVals);
    const maxXVal = Math.max(...xVals);
    const minYVal = Math.min(...yVals);
    const maxYVal = Math.max(...yVals);

    const padX = (maxXVal - minXVal) * 0.08 || 5;
    const padY = (maxYVal - minYVal) * 0.08 || 5;

    return {
      minX: Math.floor((minXVal - padX) / 5) * 5,
      maxX: Math.ceil((maxXVal + padX) / 5) * 5,
      minY: Math.floor((minYVal - padY) / 5) * 5,
      maxY: Math.ceil((maxYVal + padY) / 5) * 5,
    };
  }, [activePoints]);

  const scaleX = (x: number) => {
    return margin.left + ((x - minX) / (maxX - minX || 1)) * innerWidth;
  };

  const scaleY = (y: number) => {
    return margin.top + innerHeight - ((y - minY) / (maxY - minY || 1)) * innerHeight;
  };

  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const span = maxX - minX;
    const step = span > 80 ? 20 : span > 40 ? 10 : 5;
    const start = Math.ceil(minX / step) * step;
    for (let v = start; v <= maxX; v += step) {
      ticks.push(v);
    }
    return ticks;
  }, [minX, maxX]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const span = maxY - minY;
    const step = span > 80 ? 20 : span > 40 ? 10 : 5;
    const start = Math.ceil(minY / step) * step;
    for (let v = start; v <= maxY; v += step) {
      ticks.push(v);
    }
    return ticks;
  }, [minY, maxY]);

  const regressionParam = useMemo(() => {
    if (activeRegression.id === 'polynomial') return polyDegree;
    if (activeRegression.id === 'loess') return loessSpan;
    return undefined;
  }, [activeRegression.id, polyDegree, loessSpan]);

  const regressionInput: TimelineDataPoint[] = useMemo(() => {
    return activePoints.map((p) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      company: p.company,
      releaseDate: p.releaseDate,
      timestamp: p.x,
      score: p.y,
      flag: p.flag,
      chatUrl: p.chatUrl,
      isPaid: p.isPaid,
    }));
  }, [activePoints]);

  const regression = useMemo(() => {
    return calculateRegression(regressionInput, activeRegression.id, 50, regressionParam);
  }, [regressionInput, activeRegression.id, regressionParam]);

  const regressionPath = useMemo(() => {
    if (!regression.points || regression.points.length === 0) return '';
    const valid = regression.points.filter((p) => !isNaN(p.x) && !isNaN(p.y));
    if (valid.length === 0) return '';

    return valid
      .map((pt, i) => {
        const sx = scaleX(pt.x);
        const sy = scaleY(pt.y);
        return `${i === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
      })
      .join(' ');
  }, [regression.points, minX, maxX, minY, maxY]);

  const handleDotMouseEnter = (pt: CorrelationPoint, cx: number, cy: number) => {
    clearCloseTimeout();
    const contRect = containerRef.current?.getBoundingClientRect();
    const svgRect = svgRef.current?.getBoundingClientRect();

    if (!contRect || !svgRect) return;

    const scaleFactorX = svgRect.width / svgWidth;
    const scaleFactorY = svgRect.height / svgHeight;
    const offsetX = svgRect.left - contRect.left;
    const offsetY = svgRect.top - contRect.top;

    const dotScreenX = cx * scaleFactorX + offsetX;
    const dotScreenY = cy * scaleFactorY + offsetY;

    const screenPoints = activePoints.map((p) => ({
      id: p.id,
      x: scaleX(p.x) * scaleFactorX + offsetX,
      y: scaleY(p.y) * scaleFactorY + offsetY,
    }));

    const optimalPos = getOptimalTooltipPosition(
      dotScreenX,
      dotScreenY,
      contRect.width,
      contRect.height,
      screenPoints,
      pt.id
    );

    setHoveredPoint({
      point: pt,
      pos: optimalPos,
    });
  };

  const handleDotMouseLeave = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
    }, 1800);
  };

  const handleTooltipMouseEnter = () => clearCloseTimeout();
  const handleTooltipMouseLeave = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
    }, 800);
  };

  const isLinearModel = activeRegression.id === 'linear';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-visible flex flex-col">
      {/* Plot Header: Label, Swap Button, Pearson & Spearmans Rho Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs">
            {plotLabel}
          </span>
          <button
            type="button"
            onClick={onSwapAxes}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 transition-all cursor-pointer text-[10.5px] font-mono shadow-2xs"
            title={lang === 'de' ? 'Achsen vertauschen (X ⇄ Y)' : 'Swap axes (X ⇄ Y)'}
          >
            <ArrowLeftRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>{lang === 'de' ? 'X ⇄ Y' : 'X ⇄ Y'}</span>
          </button>
        </div>

        {/* Side-by-Side Pearson r & Spearmans Rho Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Pearson r Badge */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
              isLinearModel
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/20'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
            }`}
            title={
              lang === 'de'
                ? 'Pearson-Korrelationskoeffizient r (linearer Zusammenhang)'
                : 'Pearson correlation coefficient r (linear relationship)'
            }
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase">r:</span>
            <span className="font-mono text-xs font-extrabold" style={{ color: pearsonResult.color }}>
              {pearsonResult.value >= 0 ? '+' : ''}
              {pearsonResult.value.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden xl:inline">
              ({lang === 'de' ? pearsonResult.strengthDe : pearsonResult.strengthEn})
            </span>
          </div>

          {/* Spearmans Rho Badge */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
              !isLinearModel
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
            }`}
            title={
              lang === 'de'
                ? 'Spearmans Rho (Rangkorrelationskoeffizient)'
                : 'Spearmans Rho (rank correlation coefficient)'
            }
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase">Rho:</span>
            <span className="font-mono text-xs font-extrabold" style={{ color: spearmanResult.color }}>
              {spearmanResult.value >= 0 ? '+' : ''}
              {spearmanResult.value.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden xl:inline">
              ({lang === 'de' ? spearmanResult.strengthDe : spearmanResult.strengthEn})
            </span>
          </div>
        </div>
      </div>

      {/* Scatterplot Canvas Container (Rectangular) */}
      <div
        ref={containerRef}
        className="relative p-3 pt-2 bg-white dark:bg-slate-900 rounded-b-2xl overflow-visible select-none flex-1 flex flex-col justify-center"
      >
        {/* CLICKABLE Y-AXIS TITLE BUTTON (Directly at the Top-Left of the Y-Axis) */}
        <div className="absolute top-2.5 left-3 sm:left-4 z-20">
          <button
            type="button"
            onClick={() => {
              setOpenAxisMenu(openAxisMenu === 'y' ? null : 'y');
              setHoveredPoint(null);
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-white shadow-xs hover:ring-2 hover:ring-blue-400/50 transition-all cursor-pointer font-mono font-bold text-[10.5px]"
            style={{ backgroundColor: yDim.color }}
            title={
              lang === 'de'
                ? `Y-Achse: ${yDim.nameDe} (Klicken zum Auswählen der Kategorie)`
                : `Y-Axis: ${yDim.nameEn} (Click to choose category)`
            }
          >
            <span className="text-[9px] uppercase tracking-wide opacity-80">Y:</span>
            <span className="truncate max-w-[120px] sm:max-w-[160px]">
              {lang === 'de' ? yDim.nameDe : yDim.nameEn}
            </span>
            <ChevronDown className="w-3 h-3 shrink-0 opacity-80" />
          </button>

          {/* Y-Axis Dropdown Popover */}
          {openAxisMenu === 'y' && (
            <AxisDimensionDropdown
              currentDimIndex={yAxisDimIndex}
              onSelect={(idx) => {
                onYAxisDimChange(idx);
                setOpenAxisMenu(null);
              }}
              onClose={() => setOpenAxisMenu(null)}
              lang={lang}
              align="left"
              direction="down"
            />
          )}
        </div>

        {/* SVG Scatterplot (Quadratic 1:1) */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto aspect-square overflow-visible"
        >
          <defs>
            <filter id={`corrDotGlow-${plotLabel}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* X Grid Lines */}
          {xTicks.map((val) => {
            const x = scaleX(val);
            return (
              <g key={`x-grid-${val}`}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + innerHeight}
                  className="stroke-slate-100 dark:stroke-slate-800/80"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={x}
                  y={margin.top + innerHeight + 16}
                  textAnchor="middle"
                  className="fill-slate-400 dark:fill-slate-500 text-[9.5px] font-mono font-medium"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Y Grid Lines */}
          {yTicks.map((val) => {
            const y = scaleY(val);
            return (
              <g key={`y-grid-${val}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + innerWidth}
                  y2={y}
                  className="stroke-slate-100 dark:stroke-slate-800/80"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={margin.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[9.5px] font-mono font-medium"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Main X & Y Axis Lines */}
          <line
            x1={margin.left}
            y1={margin.top + innerHeight}
            x2={margin.left + innerWidth}
            y2={margin.top + innerHeight}
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.2"
          />
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + innerHeight}
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.2"
          />

          {/* Fitted Regression Curve */}
          {regressionPath && (
            <path
              d={regressionPath}
              fill="none"
              stroke={activeRegression.color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={activeRegression.id === 'loess' ? '5,3' : undefined}
            />
          )}

          {/* Scatter Points */}
          {activePoints.map((pt) => {
            const cx = scaleX(pt.x);
            const cy = scaleY(pt.y);
            const isHovered = hoveredPoint?.point.id === pt.id;
            const isFrontier = frontierPointIds.has(pt.id);

            return (
              <g
                key={pt.id}
                className="cursor-pointer transition-transform duration-100"
                onMouseEnter={() => handleDotMouseEnter(pt, cx, cy)}
                onMouseLeave={handleDotMouseLeave}
              >
                {/* Hit target padding */}
                <circle cx={cx} cy={cy} r={14} fill="transparent" />

                {/* SOTA Frontier Accent Ring */}
                {isFrontier && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 10 : 7}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={isHovered ? 2 : 1.5}
                    strokeDasharray={scope === 'frontier' ? undefined : '2,2'}
                    pointerEvents="none"
                  />
                )}

                {/* Pulsing ring when hovered */}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.2"
                    className="animate-pulse"
                    pointerEvents="none"
                  />
                )}

                {/* Main Scatter Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 6.5 : isFrontier ? 4.5 : 4}
                  fill={isHovered ? '#f43f5e' : isFrontier ? '#d97706' : xDim.color}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 1}
                  filter={`url(#corrDotGlow-${plotLabel})`}
                  className="transition-all duration-150 hover:opacity-95"
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </svg>

        {/* CLICKABLE X-AXIS TITLE BUTTON (Directly at the Bottom Center of the X-Axis) */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={() => {
              setOpenAxisMenu(openAxisMenu === 'x' ? null : 'x');
              setHoveredPoint(null);
            }}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-white shadow-xs hover:ring-2 hover:ring-blue-400/50 transition-all cursor-pointer font-mono font-bold text-[10.5px]"
            style={{ backgroundColor: xDim.color }}
            title={
              lang === 'de'
                ? `X-Achse: ${xDim.nameDe} (Klicken zum Auswählen der Kategorie)`
                : `X-Axis: ${xDim.nameEn} (Click to choose category)`
            }
          >
            <span className="text-[9px] uppercase tracking-wide opacity-80">X:</span>
            <span className="truncate max-w-[140px] sm:max-w-[200px]">
              {lang === 'de' ? xDim.nameDe : xDim.nameEn}
            </span>
            <ChevronDown className="w-3 h-3 shrink-0 opacity-80" />
          </button>

          {/* X-Axis Dropdown Popover */}
          {openAxisMenu === 'x' && (
            <AxisDimensionDropdown
              currentDimIndex={xAxisDimIndex}
              onSelect={(idx) => {
                onXAxisDimChange(idx);
                setOpenAxisMenu(null);
              }}
              onClose={() => setOpenAxisMenu(null)}
              lang={lang}
              align="center"
              direction="up"
            />
          )}
        </div>

        {/* Compact, Collision-Aware Dot Hover Tooltip */}
        {hoveredPoint && (
          <div
            style={{
              left: `${hoveredPoint.pos.left}px`,
              top: `${hoveredPoint.pos.top}px`,
            }}
            className="absolute z-40 bg-slate-900/95 dark:bg-slate-950/95 text-white px-2.5 py-2 rounded-lg shadow-xl border border-slate-700/80 backdrop-blur-md pointer-events-auto w-[230px] transition-all animate-in fade-in zoom-in-95 duration-150 select-text"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            {/* Header: Model Name + Flag + SOTA Tag + Chat Link */}
            <div className="flex items-center justify-between gap-1.5 leading-tight">
              <div className="flex items-center gap-1 min-w-0">
                <span
                  className="font-bold text-xs text-white truncate max-w-[130px]"
                  title={hoveredPoint.point.displayName}
                >
                  {hoveredPoint.point.displayName}
                </span>
                {hoveredPoint.point.flag && (
                  <span className="text-xs shrink-0">{hoveredPoint.point.flag}</span>
                )}
                {frontierPointIds.has(hoveredPoint.point.id) && (
                  <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded flex items-center gap-0.5 shrink-0">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>SOTA</span>
                  </span>
                )}
              </div>

              {hoveredPoint.point.chatUrl && (
                <a
                  href={hoveredPoint.point.chatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold flex items-center gap-0.5 shrink-0 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Chat</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            {/* Metadata Subline: Company · Date · Free/Paid */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5 truncate">
              <span className="truncate max-w-[125px]" title={hoveredPoint.point.company}>
                {hoveredPoint.point.company}
              </span>
              <span className="shrink-0 text-slate-400 font-mono">
                {hoveredPoint.point.releaseDate ? hoveredPoint.point.releaseDate.slice(0, 7) : ''}
                {hoveredPoint.point.isPaid ? ' · Paid' : ''}
              </span>
            </div>

            {/* Compact Bivariate Scores */}
            <div className="grid grid-cols-2 gap-1.5 mt-1.5 pt-1.5 border-t border-slate-800/80">
              <div className="bg-slate-800/80 px-1.5 py-1 rounded flex items-center justify-between gap-1">
                <span
                  className="text-[10px] text-slate-400 font-mono truncate"
                  title={lang === 'de' ? xDim.nameDe : xDim.nameEn}
                >
                  X: {lang === 'de' ? xDim.shortDe : xDim.shortEn}
                </span>
                <span
                  className="font-mono text-xs font-extrabold shrink-0"
                  style={{ color: xDim.color }}
                >
                  {hoveredPoint.point.x.toFixed(1)}
                </span>
              </div>
              <div className="bg-slate-800/80 px-1.5 py-1 rounded flex items-center justify-between gap-1">
                <span
                  className="text-[10px] text-slate-400 font-mono truncate"
                  title={lang === 'de' ? yDim.nameDe : yDim.nameEn}
                >
                  Y: {lang === 'de' ? yDim.shortDe : yDim.shortEn}
                </span>
                <span
                  className="font-mono text-xs font-extrabold shrink-0"
                  style={{ color: yDim.color }}
                >
                  {hoveredPoint.point.y.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const CorrelationsScatterplot: React.FC<CorrelationsScatterplotProps> = ({
  allModels,
  onScrollToParagraph,
  onScrollToFinalScores,
  lang,
}) => {
  // Plot 1 Dimension selection (Default: X = #1 Coding & Math, Y = #2 Non-Hallucination)
  const [plot1XDimIndex, setPlot1XDimIndex] = useState<number>(3);
  const [plot1YDimIndex, setPlot1YDimIndex] = useState<number>(4);

  // Plot 2 Dimension selection (Default: X = Old Score, Y = New Score)
  const [plot2XDimIndex, setPlot2XDimIndex] = useState<number>(1);
  const [plot2YDimIndex, setPlot2YDimIndex] = useState<number>(0);

  // Model & Regression State: default to LOESS with Param 50%
  const [regressionIndex, setRegressionIndex] = useState<number>(DEFAULT_CORRELATION_REGRESSION_INDEX);
  const [polyDegree, setPolyDegree] = useState<number>(2); // Default degree 2
  const [loessSpan, setLoessSpan] = useState<number>(50); // Default 50%
  const [scope, setScope] = useState<'all' | 'frontier'>('all');

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

  return (
    <div className="space-y-3">
      {/* Compact Controls Bar: Scope filter & Regression model controls (Title & Presets removed to save space) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        {/* Scope Segmented Control */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
              scope === 'all'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {lang === 'de' ? 'Alle Modelle' : 'All Models'} ({allModels.length})
          </button>
          <button
            type="button"
            onClick={() => setScope('frontier')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
              scope === 'frontier'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
            title={
              lang === 'de'
                ? 'Nur SOTA-Rekord-Modelle (Pareto-Frontier)'
                : 'Only SOTA record models (Pareto frontier)'
            }
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>SOTA Frontier</span>
            <span className="text-[10px] opacity-90">({frontierPointIds.size})</span>
          </button>
        </div>

        {/* Shared Regression Model Slider & Param Input */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Regression Model Picker */}
          <div className="relative flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0">
            <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
              <span>{lang === 'de' ? 'Modell:' : 'Model:'}</span>
            </span>
            <button
              type="button"
              onClick={() => setRegressionIndex((prev) => Math.max(0, prev - 1))}
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
              onClick={() => setRegressionIndex((prev) => Math.min(CORRELATION_REGRESSION_OPTIONS.length - 1, prev + 1))}
              disabled={regressionIndex >= CORRELATION_REGRESSION_OPTIONS.length - 1}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
              title="+1"
            >
              <Plus className="w-3 h-3" />
            </button>

            {/* Model Badge */}
            <div className="w-[105px] sm:w-[125px] shrink-0 overflow-hidden flex items-center">
              <span
                className="text-[10px] sm:text-[10.5px] font-mono font-bold px-2 py-0.5 rounded text-white shadow-2xs flex items-center gap-1.5 truncate w-full"
                style={{ backgroundColor: activeRegression.color }}
                title={lang === 'de' ? activeRegression.descDe : activeRegression.descEn}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                <span className="truncate">
                  {lang === 'de' ? activeRegression.shortDe : activeRegression.shortEn}
                </span>
              </span>
            </div>
          </div>

          {/* Contextual Param Input (Fixed 76px width) */}
          <div
            className={`w-[140px] flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0 ${
              activeRegression.id !== 'polynomial' && activeRegression.id !== 'loess'
                ? 'opacity-40 cursor-not-allowed'
                : ''
            }`}
          >
            <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
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
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 select-none">
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
                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 select-none">
                  %
                </span>
              </div>
            ) : (
              <div className="w-[76px] h-6 flex items-center justify-center font-mono text-xs text-slate-400 dark:text-slate-500 bg-slate-100/60 dark:bg-slate-800/40 rounded border border-transparent select-none">
                —
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2 CORRELATION PLOTS SIDE-BY-SIDE (Quadratic 1:1 Aspect Ratio) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plot 1 (Left) */}
        <SingleCorrelationPlot
          plotLabel={lang === 'de' ? 'Plot 1' : 'Plot 1'}
          allModels={allModels}
          scope={scope}
          frontierPointIds={frontierPointIds}
          activeRegression={activeRegression}
          polyDegree={polyDegree}
          loessSpan={loessSpan}
          xAxisDimIndex={plot1XDimIndex}
          yAxisDimIndex={plot1YDimIndex}
          onXAxisDimChange={setPlot1XDimIndex}
          onYAxisDimChange={setPlot1YDimIndex}
          onSwapAxes={handleSwapPlot1}
          lang={lang}
        />

        {/* Plot 2 (Right) */}
        <SingleCorrelationPlot
          plotLabel={lang === 'de' ? 'Plot 2' : 'Plot 2'}
          allModels={allModels}
          scope={scope}
          frontierPointIds={frontierPointIds}
          activeRegression={activeRegression}
          polyDegree={polyDegree}
          loessSpan={loessSpan}
          xAxisDimIndex={plot2XDimIndex}
          yAxisDimIndex={plot2YDimIndex}
          onXAxisDimChange={setPlot2XDimIndex}
          onYAxisDimChange={setPlot2YDimIndex}
          onSwapAxes={handleSwapPlot2}
          lang={lang}
        />
      </div>
    </div>
  );
};
