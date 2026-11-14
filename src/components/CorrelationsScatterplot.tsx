import React, { useMemo, useState, useRef, useEffect, useId } from 'react';
import { ExternalLink, TrendingUp, Plus, Minus, ArrowLeftRight, Sparkles, ChevronDown, Check, Grid3X3 } from 'lucide-react';
import { ModelRecord, RegressionType, TimelineDataPoint } from '../types';
import { calculateRegression, extractFrontierPoints } from '../utils/mathRegression';
import { Tooltip } from './Tooltip';
import {
  CORRELATION_DIMENSIONS,
  calculatePearson,
  calculateSpearman,
  CorrelationDimension,
  CorrelationPoint,
} from '../utils/correlationUtils';

export interface CorrelationsScatterplotProps {
  models: ModelRecord[];
  allModels: ModelRecord[];
  onScrollToParagraph?: (targetId: string) => void;
  onScrollToFinalScores?: () => void;
  lang: 'de' | 'en';
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

export interface CorrelationRegressionOption {
  id: RegressionType;
  labelDe: string;
  labelEn: string;
  shortDe: string;
  shortEn: string;
  descDe: string;
  descEn: string;
  color: string;
}

export const CORRELATION_REGRESSION_OPTIONS: CorrelationRegressionOption[] = [
  {
    id: 'linear',
    labelDe: 'Linear (Trendlinie)',
    labelEn: 'Linear (Trendline)',
    shortDe: 'Linear',
    shortEn: 'Linear',
    descDe: 'Klassische Pearson-Regressionsgerade: Zeigt den proportionalen Zusammenhang zwischen zwei Benchmarks. Die Steigung quantifiziert, wie viele Punkte Benchmark Y durchschnittlich pro Punkt in Benchmark X hinzugewinnt.',
    descEn: 'Standard Pearson regression line: shows the proportional relationship between two benchmarks. The slope quantifies expected gains on benchmark Y per point increase in benchmark X.',
    color: '#6366f1', // Indigo
  },
  {
    id: 'polynomial',
    labelDe: 'Polynom (Grad 2-4)',
    labelEn: 'Polynomial (deg 2-4)',
    shortDe: 'Polynom',
    shortEn: 'Polynom.',
    descDe: 'Kurvenförmiger Zusammenhang: Prüft, ob der Fähigkeitstransfer zwischen beiden Benchmarks bei höherer Leistung ansteigt (progressive Synergien) oder abflacht (Sättigungseffekt). Vorsicht vor Überanpassung (Overfitting) an den Rändern.',
    descEn: 'Curvilinear relationship: tests whether cross-domain transfer accelerates at higher skill tiers (progressive synergies) or tapers off (saturation effect). Beware of boundary overfitting.',
    color: '#f43f5e', // Rose
  },
  {
    id: 'power',
    labelDe: 'Power (Potenzkurve)',
    labelEn: 'Power (Scaling)',
    shortDe: 'Power',
    shortEn: 'Power',
    descDe: 'Potenzbeziehung (Power Law, y ∝ xᵇ): Untersucht, ob Fähigkeiten als multiplikativer Hebel wirken, wobei Zuwächse in der Spitze häufig abnehmenden Grenzerträgen unterliegen.',
    descEn: 'Power-law scaling (y ∝ xᵇ): tests whether one capability acts as a compounding multiplier for another, often showing diminishing returns at the top tier.',
    color: '#ec4899', // Pink
  },
  {
    id: 'exponential',
    labelDe: 'Exponential (Wachstum)',
    labelEn: 'Exponential (Growth)',
    shortDe: 'Expon.',
    shortEn: 'Expon.',
    descDe: 'Exponentielle Kopplung: Modelliert Szenarien, in denen hohe Punktzahlen in Benchmark X einen überproportionalen, sprunghaften Durchbruch in Benchmark Y auslösen.',
    descEn: 'Exponential coupling: models scenarios where high mastery in benchmark X triggers disproportionate breakthrough jumps in benchmark Y.',
    color: '#8b5cf6', // Violet
  },
  {
    id: 'loess',
    labelDe: 'LOESS (Smoothing)',
    labelEn: 'LOESS (Smoothing)',
    shortDe: 'LOESS',
    shortEn: 'LOESS',
    descDe: 'Lokale Glättung: Bildet den realen Zusammenhang empirisch ab, ohne eine lineare oder quadratische Form zu erzwingen. Deckt auch lokale Schwelleneffekte oder Stagnationsplateaus auf.',
    descEn: 'Local scatterplot smoothing: maps empirical dependencies without forcing linear or quadratic shapes, revealing local threshold effects or performance plateaus.',
    color: '#f59e0b', // Amber
  },
];

export const DEFAULT_CORRELATION_REGRESSION_INDEX = Math.max(
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
  onScrollToParagraph?: (targetId: string) => void;
}

const AxisDimensionDropdown: React.FC<AxisDimensionDropdownProps> = ({
  currentDimIndex,
  onSelect,
  onClose,
  lang,
  align = 'left',
  direction = 'down',
  onScrollToParagraph,
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
          <span className="text-xs font-mono uppercase font-bold tracking-wider text-slate-400">
            {lang === 'de' ? 'Metrik auswählen' : 'Select Metric'}
          </span>
          <span className="text-xs font-mono text-slate-400">
            {CORRELATION_DIMENSIONS.length} {lang === 'de' ? 'Optionen' : 'Options'}
          </span>
        </div>

        {/* Section 1: Composite Scores */}
        <div className="mb-2">
          <div className="px-2 py-0.5 text-xs font-mono uppercase font-semibold text-slate-400 dark:text-slate-500">
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
          <div className="px-2 py-0.5 text-xs font-mono uppercase font-semibold text-slate-400 dark:text-slate-500">
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
  allModels: ModelRecord[];
  scope: 'all' | 'frontier';
  frontierPointIds: Set<string>;
  activeRegression: CorrelationRegressionOption;
  polyDegree: number;
  loessSpan: number;
  xAxisDimIndex: number;
  yAxisDimIndex: number;
  onXAxisDimChange: (idx: number) => void;
  onYAxisDimChange: (idx: number) => void;
  onSwapAxes: () => void;
  lang: 'de' | 'en';
  onScrollToParagraph?: (targetId: string) => void;
  headerToggle?: React.ReactNode;
}

const SingleCorrelationPlot: React.FC<SingleCorrelationPlotProps> = ({
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
  onScrollToParagraph,
  headerToggle,
}) => {
  const svgUid = useId().replace(/:/g, '');
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

  // Format SVG Path for 95% Confidence Band
  const confidenceBandPath = useMemo(() => {
    if (!regression.points || regression.points.length === 0) return '';
    const valid = regression.points.filter(
      (p) => typeof p.lower === 'number' && typeof p.upper === 'number' && !isNaN(p.x) && !isNaN(p.lower) && !isNaN(p.upper)
    );
    if (valid.length === 0) return '';

    // Upper boundary forward
    const upperPoints = valid.map((pt, i) => {
      const sx = scaleX(pt.x);
      const sy = scaleY(pt.upper!);
      return `${i === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    });

    // Lower boundary backward
    const lowerPoints = [...valid].reverse().map((pt) => {
      const sx = scaleX(pt.x);
      const sy = scaleY(pt.lower!);
      return `L ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    });

    return `${upperPoints.join(' ')} ${lowerPoints.join(' ')} Z`;
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
      {/* Plot Header: Swap Button, Mode Toggle, Pearson & Spearmans Rho Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Tooltip
            content={lang === 'de' ? 'Achsen vertauschen (X ⇄ Y)' : 'Swap axes (X ⇄ Y)'}
            align="left"
            width="w-48"
          >
            <button
              type="button"
              onClick={onSwapAxes}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 transition-all cursor-pointer text-xs font-mono shadow-2xs"
            >
              <ArrowLeftRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>{lang === 'de' ? 'X ⇄ Y' : 'X ⇄ Y'}</span>
            </button>
          </Tooltip>
          {headerToggle}
        </div>

        {/* Side-by-Side Pearson r & Spearmans Rho Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Pearson r Badge */}
          <Tooltip
            title="Pearson r"
            badge="Linear"
            align="center"
            width="w-64"
            content={
              lang === 'de'
                ? 'Pearson-Korrelationskoeffizient r misst den linearen Zusammenhang zwischen den beiden Benchmarks.'
                : 'Pearson correlation coefficient r measures the linear relationship between both benchmarks.'
            }
          >
            <div
              className={`flex items-baseline gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                isLinearModel
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="text-xs font-bold text-slate-500 uppercase">r:</span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color: pearsonResult.color }}>
                {pearsonResult.value >= 0 ? '+' : ''}
                {pearsonResult.value.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden xl:inline">
                ({lang === 'de' ? pearsonResult.strengthDe : pearsonResult.strengthEn})
              </span>
            </div>
          </Tooltip>

          {/* Spearmans Rho Badge */}
          <Tooltip
            title="Spearman Rho"
            badge="Rangfolge"
            align="center"
            width="w-64"
            content={
              lang === 'de'
                ? 'Spearmans Rho misst den monotonen Rangzusammenhang, unempfindlicher gegenüber Ausreißern.'
                : 'Spearman rank correlation measures monotonic rank relationship, more robust against outliers.'
            }
          >
            <div
              className={`flex items-baseline gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                !isLinearModel
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="text-xs font-bold text-slate-500 uppercase">Rho:</span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color: spearmanResult.color }}>
                {spearmanResult.value >= 0 ? '+' : ''}
                {spearmanResult.value.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden xl:inline">
                ({lang === 'de' ? spearmanResult.strengthDe : spearmanResult.strengthEn})
              </span>
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Scatterplot Canvas Container (Rectangular) */}
      <div
        ref={containerRef}
        className="relative p-3 pt-2 bg-white dark:bg-slate-900 rounded-b-2xl overflow-visible select-none flex-1 flex flex-col justify-center"
      >
        {/* CLICKABLE Y-AXIS TITLE BUTTON (Directly at the Top-Left of the Y-Axis) */}
        <div className="absolute top-2.5 left-3 sm:left-4 z-20 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setOpenAxisMenu(openAxisMenu === 'y' ? null : 'y');
              setHoveredPoint(null);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-white shadow-xs hover:ring-2 hover:ring-blue-400/50 transition-all cursor-pointer font-mono font-bold text-sm"
            style={{ backgroundColor: yDim.color }}
            title={
              lang === 'de'
                ? `Y-Achse: ${yDim.nameDe} (Klicken zum Auswählen der Kategorie)`
                : `Y-Axis: ${yDim.nameEn} (Click to choose category)`
            }
          >
            <span className="text-xs uppercase tracking-wide opacity-80">Y:</span>
            <span className="truncate max-w-[130px] sm:max-w-[180px]">
              {lang === 'de' ? yDim.nameDe : yDim.nameEn}
            </span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
          </button>

          {onScrollToParagraph && yDim.targetId && (
            <button
              type="button"
              onClick={() => onScrollToParagraph(yDim.targetId)}
              className="p-1.5 rounded-md bg-white/95 dark:bg-slate-800/95 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-2xs border border-slate-200/80 dark:border-slate-700 cursor-pointer"
              title={
                lang === 'de'
                  ? `${yDim.nameDe}: Zur Erläuterung in „How to read this“ springen`
                  : `${yDim.nameEn}: Jump to explanation in "How to read this"`
              }
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

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
              onScrollToParagraph={onScrollToParagraph}
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
            <filter id={`corrDotGlow-${svgUid}`} x="-50%" y="-50%" width="200%" height="200%">
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
                  y={margin.top + innerHeight + 18}
                  textAnchor="middle"
                  fontSize="14"
                  className="fill-slate-400 dark:fill-slate-500 font-mono font-medium"
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
                  y={y + 5}
                  textAnchor="end"
                  fontSize="14"
                  className="fill-slate-400 dark:fill-slate-500 font-mono font-medium"
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

          {/* 95% Confidence Band */}
          {confidenceBandPath && activeRegression.id !== 'frontier' && (
            <path
              d={confidenceBandPath}
              fill={activeRegression.color}
              fillOpacity={0.16}
              stroke={activeRegression.color}
              strokeWidth="0.8"
              strokeDasharray="3,3"
              strokeOpacity={0.4}
              className="pointer-events-none transition-all duration-300"
            />
          )}

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
                  filter={`url(#corrDotGlow-${svgUid})`}
                  className="transition-all duration-150 hover:opacity-95"
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </svg>

        {/* CLICKABLE X-AXIS TITLE BUTTON (Directly at the Bottom Center of the X-Axis) */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setOpenAxisMenu(openAxisMenu === 'x' ? null : 'x');
              setHoveredPoint(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-white shadow-xs hover:ring-2 hover:ring-blue-400/50 transition-all cursor-pointer font-mono font-bold text-sm"
            style={{ backgroundColor: xDim.color }}
            title={
              lang === 'de'
                ? `X-Achse: ${xDim.nameDe} (Klicken zum Auswählen der Kategorie)`
                : `X-Axis: ${xDim.nameEn} (Click to choose category)`
            }
          >
            <span className="text-xs uppercase tracking-wide opacity-80">X:</span>
            <span className="truncate max-w-[150px] sm:max-w-[220px]">
              {lang === 'de' ? xDim.nameDe : xDim.nameEn}
            </span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
          </button>

          {onScrollToParagraph && xDim.targetId && (
            <button
              type="button"
              onClick={() => onScrollToParagraph(xDim.targetId)}
              className="p-1.5 rounded-md bg-white/95 dark:bg-slate-800/95 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-2xs border border-slate-200/80 dark:border-slate-700 cursor-pointer"
              title={
                lang === 'de'
                  ? `${xDim.nameDe}: Zur Erläuterung in „How to read this“ springen`
                  : `${xDim.nameEn}: Jump to explanation in "How to read this"`
              }
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

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
              onScrollToParagraph={onScrollToParagraph}
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
            className="absolute z-40 bg-slate-900/95 dark:bg-slate-950/95 text-white px-2.5 py-2 rounded-lg shadow-xl border border-slate-700/80 backdrop-blur-md pointer-events-auto w-[240px] transition-all animate-in fade-in zoom-in-95 duration-150 select-text"
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
                  <span className="text-xs font-mono px-1 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded flex items-center gap-0.5 shrink-0">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>{lang === 'de' ? 'Pionier' : 'Pioneer'}</span>
                  </span>
                )}
              </div>

              {hoveredPoint.point.chatUrl && (
                <a
                  href={hoveredPoint.point.chatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-0.5 shrink-0 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Chat</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            {/* Metadata Subline: Company · Date · Free/Paid */}
            <div className="flex items-center justify-between text-xs text-slate-400 mt-0.5 truncate">
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
                  className="text-xs text-slate-400 font-mono truncate"
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
                  className="text-xs text-slate-400 font-mono truncate"
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

function getHeatmapShortLabel(dim: CorrelationDimension, lang: 'de' | 'en'): string {
  switch (dim.id) {
    case 'new_score':
      return lang === 'de' ? 'NEW Score' : 'NEW Score';
    case 'old_score':
      return lang === 'de' ? 'OLD Score' : 'OLD Score';
    case 'worst_case':
      return 'Worst Case';
    case 'actCodeReason':
      return '#1 IQ';
    case 'nonHallucination':
      return lang === 'de' ? '#2 Faktentr.' : '#2 Non-Hallu';
    case 'scienceKnowledge':
      return lang === 'de' ? '#3 Wissen' : '#3 Science';
    case 'visionPlot':
      return lang === 'de' ? '#4 Diagramm' : '#4 Plots';
    case 'medReasoning':
      return lang === 'de' ? '#5 Diagn.' : '#5 Diagn.';
    case 'excelAgent':
      return '#6 Excel';
    case 'trickQuestions':
      return '#7 Exp.&Eng.';
    case 'econLegal':
      return lang === 'de' ? '#8 Wirtsch.' : '#8 Econ/Leg.';
    default:
      return lang === 'de' ? dim.shortDe : dim.shortEn;
  }
}

function getHeatmapCellColors(value: number | null): { bg: string; text: string } {
  if (value === null || isNaN(value)) {
    return { bg: '#f1f5f9', text: '#94a3b8' };
  }
  const v = Math.max(-1, Math.min(1, value));
  const abs = Math.abs(v);
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const rgbStr = (r: number, g: number, b: number) => `rgb(${r}, ${g}, ${b})`;

  if (v >= 0) {
    // 0 -> white (#ffffff), +0.5 -> blue-300 (#93c5fd), +1.0 -> blue-900 (#1e3a8a)
    if (abs <= 0.5) {
      const t = abs / 0.5;
      return {
        bg: rgbStr(lerp(255, 147, t), lerp(255, 197, t), lerp(255, 253, t)),
        text: '#0f172a',
      };
    }
    const t = (abs - 0.5) / 0.5;
    return {
      bg: rgbStr(lerp(147, 30, t), lerp(197, 58, t), lerp(253, 138, t)),
      text: abs >= 0.72 ? '#ffffff' : '#0f172a',
    };
  }

  // 0 -> white (#ffffff), -0.5 -> red-300 (#fca5a5), -1.0 -> red-900 (#7f1d1d)
  if (abs <= 0.5) {
    const t = abs / 0.5;
    return {
      bg: rgbStr(lerp(255, 252, t), lerp(255, 165, t), lerp(255, 165, t)),
      text: '#0f172a',
    };
  }
  const t = (abs - 0.5) / 0.5;
  return {
    bg: rgbStr(lerp(252, 127, t), lerp(165, 29, t), lerp(165, 29, t)),
    text: abs >= 0.72 ? '#ffffff' : '#0f172a',
  };
}

interface CorrelationHeatmapProps {
  allModels: ModelRecord[];
  scope: 'all' | 'frontier';
  frontierPointIds: Set<string>;
  metric: 'pearson' | 'spearman';
  onToggleMetric: () => void;
  onSelectPairForOtherPlot?: (xIdx: number, yIdx: number) => void;
  lang: 'de' | 'en';
  headerToggle?: React.ReactNode;
}

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  allModels,
  scope,
  frontierPointIds,
  metric,
  onToggleMetric,
  onSelectPairForOtherPlot,
  lang,
  headerToggle,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    rowIdx: number;
    colIdx: number;
    x: number;
    y: number;
  } | null>(null);

  const scopedModels = useMemo(() => {
    if (scope === 'frontier') {
      return allModels.filter((m) => frontierPointIds.has(m.id));
    }
    return allModels;
  }, [allModels, scope, frontierPointIds]);

  const matrix = useMemo(() => {
    const dims = CORRELATION_DIMENSIONS;
    return dims.map((rowDim, rIdx) =>
      dims.map((colDim, cIdx) => {
        const pairs: Array<{ x: number; y: number }> = [];
        for (const m of scopedModels) {
          const vx = colDim.getValue(m);
          const vy = rowDim.getValue(m);
          if (typeof vx === 'number' && !isNaN(vx) && typeof vy === 'number' && !isNaN(vy)) {
            pairs.push({ x: vx, y: vy });
          }
        }
        const n = pairs.length;
        if (rIdx === cIdx) {
          return {
            n,
            pearson: n >= 1 ? 1 : null,
            spearman: n >= 1 ? 1 : null,
            pearsonRes: calculatePearson(pairs),
            spearmanRes: calculateSpearman(pairs),
          };
        }
        if (n < 3) {
          return {
            n,
            pearson: null,
            spearman: null,
            pearsonRes: null,
            spearmanRes: null,
          };
        }
        const pearsonRes = calculatePearson(pairs);
        const spearmanRes = calculateSpearman(pairs);
        return {
          n,
          pearson: pearsonRes.value,
          spearman: spearmanRes.value,
          pearsonRes,
          spearmanRes,
        };
      })
    );
  }, [scopedModels]);

  const hoveredData = hoveredCell ? matrix[hoveredCell.rowIdx]?.[hoveredCell.colIdx] : null;
  const hoveredRowDim = hoveredCell ? CORRELATION_DIMENSIONS[hoveredCell.rowIdx] : null;
  const hoveredColDim = hoveredCell ? CORRELATION_DIMENSIONS[hoveredCell.colIdx] : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-visible flex flex-col">
      {/* Header matching SingleCorrelationPlot */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 rounded-t-2xl">
        <div className="flex items-center gap-2">
          {/* R / Rho Switch styled identically to X ⇄ Y switch */}
          <Tooltip
            content={
              metric === 'pearson'
                ? lang === 'de'
                  ? 'Aktiv: Pearson r (linear). Klicken für Spearmans Rho.'
                  : 'Active: Pearson r (linear). Click for Spearman Rho.'
                : lang === 'de'
                  ? 'Aktiv: Spearmans Rho (Rangfolge). Klicken für Pearson r.'
                  : 'Active: Spearman Rho (rank). Click for Pearson r.'
            }
            align="left"
            width="w-60"
          >
            <button
              type="button"
              onClick={onToggleMetric}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 transition-all cursor-pointer text-xs font-mono shadow-2xs"
            >
              <ArrowLeftRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span className={metric === 'pearson' ? 'font-bold text-blue-600 dark:text-blue-400' : 'opacity-55'}>
                r
              </span>
              <span className="opacity-45">⇄</span>
              <span className={metric === 'spearman' ? 'font-bold text-rose-600 dark:text-rose-400' : 'opacity-55'}>
                Rho
              </span>
            </button>
          </Tooltip>

          {headerToggle}
        </div>

        {/* Diverging Color Scale Legend (-1 Red -> 0 White -> +1 Blue) */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 hidden sm:inline">
            {metric === 'pearson' ? 'Pearson r' : 'Spearman Rho'}
          </span>
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold text-red-700 dark:text-red-400">-1</span>
            <div
              className="w-16 sm:w-20 h-2.5 rounded-xs border border-slate-300/70 dark:border-slate-700"
              style={{
                background: 'linear-gradient(to right, #7f1d1d, #fca5a5, #ffffff, #93c5fd, #1e3a8a)',
              }}
            />
            <span className="text-[10px] font-bold text-blue-800 dark:text-blue-400">+1</span>
          </div>
        </div>
      </div>

      {/* Matrix Container */}
      <div className="relative p-3 pt-2 bg-white dark:bg-slate-900 rounded-b-2xl select-none flex-1 flex flex-col justify-between">
        <div className="w-full overflow-x-auto sm:overflow-visible flex-1 flex flex-col justify-center">
          <div className="min-w-[440px] w-full pr-6">
            {/* Rotated Column Headers */}
            <div
              className="grid items-end gap-[2px] mb-1"
              style={{
                gridTemplateColumns: '94px repeat(3, minmax(0, 1fr)) 4px repeat(8, minmax(0, 1fr))',
              }}
            >
              <div className="h-[68px]" />
              {CORRELATION_DIMENSIONS.map((colDim, cIdx) => {
                const isColHovered = hoveredCell?.colIdx === cIdx;
                return (
                  <React.Fragment key={colDim.id}>
                    {cIdx === 3 && <div />}
                    <div className="relative h-[68px] flex items-end justify-center">
                      <div
                        className={`absolute bottom-1 left-1/2 -rotate-45 origin-bottom-left whitespace-nowrap flex items-center gap-1 text-[10px] font-mono transition-colors ${
                          isColHovered
                            ? 'text-slate-950 dark:text-white font-bold'
                            : 'text-slate-600 dark:text-slate-400 font-medium'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: colDim.color }}
                        />
                        <span>{getHeatmapShortLabel(colDim, lang)}</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* 11 Matrix Rows */}
            <div className="space-y-[2px]">
              {CORRELATION_DIMENSIONS.map((rowDim, rIdx) => {
                const isRowHovered = hoveredCell?.rowIdx === rIdx;
                return (
                  <React.Fragment key={rowDim.id}>
                    {rIdx === 3 && (
                      <div className="h-[4px]" />
                    )}
                    <div
                      className="grid items-center gap-[2px]"
                      style={{
                        gridTemplateColumns: '94px repeat(3, minmax(0, 1fr)) 4px repeat(8, minmax(0, 1fr))',
                      }}
                    >
                      {/* Row Header Label */}
                      <div
                        className={`pr-1.5 flex items-center justify-end gap-1 text-[10px] font-mono truncate transition-colors ${
                          isRowHovered
                            ? 'text-slate-950 dark:text-white font-bold'
                            : 'text-slate-600 dark:text-slate-400 font-medium'
                        }`}
                        title={lang === 'de' ? rowDim.nameDe : rowDim.nameEn}
                      >
                        <span className="truncate">{getHeatmapShortLabel(rowDim, lang)}</span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: rowDim.color }}
                        />
                      </div>

                      {/* Score Cells (Diagonal omitted) */}
                      {CORRELATION_DIMENSIONS.map((colDim, cIdx) => {
                        const isDiag = rIdx === cIdx;
                        const cell = matrix[rIdx][cIdx];
                        const val = metric === 'pearson' ? cell.pearson : cell.spearman;
                        const { bg, text } = getHeatmapCellColors(val);
                        const isHovered = hoveredCell?.rowIdx === rIdx && hoveredCell?.colIdx === cIdx;

                        return (
                          <React.Fragment key={`${rowDim.id}-${colDim.id}`}>
                            {cIdx === 3 && <div />}
                            {isDiag ? (
                              <div className="aspect-square w-full" aria-hidden="true" />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectPairForOtherPlot) {
                                    onSelectPairForOtherPlot(cIdx, rIdx);
                                  }
                                }}
                                onMouseEnter={(e) => {
                                  setHoveredCell({ rowIdx: rIdx, colIdx: cIdx, x: e.clientX, y: e.clientY });
                                }}
                                onMouseMove={(e) => {
                                  setHoveredCell({ rowIdx: rIdx, colIdx: cIdx, x: e.clientX, y: e.clientY });
                                }}
                                onMouseLeave={() => setHoveredCell(null)}
                                style={{
                                  backgroundColor: bg,
                                  color: text,
                                }}
                                className={`aspect-square w-full flex items-center justify-center rounded-[3px] border border-slate-200/90 dark:border-slate-700/70 cursor-pointer hover:scale-110 hover:z-20 text-[11px] sm:text-[13px] lg:text-[11.5px] xl:text-[13px] font-mono font-bold leading-none tabular-nums tracking-tighter transition-transform duration-100 ${
                                  isHovered ? 'ring-2 ring-slate-900 dark:ring-white z-20 scale-110' : ''
                                }`}
                              >
                                {val !== null ? val.toFixed(2).replace(/^-0\.00$/, '0.00') : '—'}
                              </button>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Footnote */}
        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <span>
            {lang === 'de'
              ? `Basis: ${scopedModels.length} Modelle (${scope === 'frontier' ? 'Pioniere' : 'Alle'})`
              : `Sample: ${scopedModels.length} models (${scope === 'frontier' ? 'Pioneers' : 'All'})`}
          </span>
          <span>
            {lang === 'de'
              ? 'Klick auf Zelle → Paar im Streudiagramm laden'
              : 'Click cell → load pair in scatterplot'}
          </span>
        </div>

        {/* Floating Cell Detail Tooltip */}
        {hoveredCell && hoveredData && hoveredRowDim && hoveredColDim && (() => {
          const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
          const nearLeft = hoveredCell.x < 120;
          const nearRight = hoveredCell.x > vw - 120;
          const nearTop = hoveredCell.y < 140;
          const tx = nearLeft ? '0%' : nearRight ? '-100%' : '-50%';
          const ty = nearTop ? '0%' : '-100%';
          const leftPos = nearLeft
            ? Math.max(12, hoveredCell.x - 12)
            : nearRight
              ? Math.min(vw - 12, hoveredCell.x + 12)
              : hoveredCell.x;

          return (
            <div
              className="pointer-events-none fixed z-50 transition-opacity duration-100"
              style={{
                left: `${leftPos}px`,
                top: `${nearTop ? hoveredCell.y + 18 : hoveredCell.y - 14}px`,
                transform: `translate(${tx}, ${ty})`,
              }}
            >
              <div className="w-max max-w-[280px] px-3 py-2 rounded-xl shadow-2xl bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 border border-slate-700/80 backdrop-blur-md text-xs font-sans">
                <div className="space-y-1 pb-1.5 mb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hoveredRowDim.color }} />
                    <span className="truncate">{lang === 'de' ? hoveredRowDim.nameDe : hoveredRowDim.nameEn}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hoveredColDim.color }} />
                    <span className="truncate">{lang === 'de' ? hoveredColDim.nameDe : hoveredColDim.nameEn}</span>
                  </div>
                </div>

                {hoveredData.pearson !== null && hoveredData.spearman !== null ? (
                  <div className="space-y-0.5 font-mono text-[11px]">
                    <div className={`flex items-center justify-between gap-4 ${metric === 'pearson' ? 'text-blue-300 font-bold' : 'text-slate-400'}`}>
                      <span>Pearson r:</span>
                      <span>
                        {hoveredData.pearson >= 0 ? '+' : ''}
                        {hoveredData.pearson.toFixed(2)}
                        {hoveredData.pearsonRes && ` (${lang === 'de' ? hoveredData.pearsonRes.strengthDe : hoveredData.pearsonRes.strengthEn})`}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between gap-4 ${metric === 'spearman' ? 'text-rose-300 font-bold' : 'text-slate-400'}`}>
                      <span>Spearman Rho:</span>
                      <span>
                        {hoveredData.spearman >= 0 ? '+' : ''}
                        {hoveredData.spearman.toFixed(2)}
                        {hoveredData.spearmanRes && ` (${lang === 'de' ? hoveredData.spearmanRes.strengthDe : hoveredData.spearmanRes.strengthEn})`}
                      </span>
                    </div>
                    <div className="pt-1 mt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span>n = {hoveredData.n}</span>
                      {hoveredCell.rowIdx !== hoveredCell.colIdx && (
                        <span className="text-emerald-400">
                          {lang === 'de' ? 'Klick → Streudiagramm' : 'Click → Scatterplot'}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="font-mono text-[11px] text-slate-400">
                    {lang === 'de' ? `Zu wenige Daten (n = ${hoveredData.n})` : `Insufficient data (n = ${hoveredData.n})`}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export const CorrelationsScatterplot: React.FC<CorrelationsScatterplotProps> = ({
  allModels,
  onScrollToParagraph,
  onScrollToFinalScores,
  lang,
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

  return (
    <div className="space-y-3">
      {/* Compact Controls Bar: Scope filter & Regression model controls (rendered if not placed in header) */}
      {!hideHeaderControls && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        {/* Scope Segmented Control */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
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
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
              scope === 'frontier'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
            title={
              lang === 'de'
                ? 'Nur Pionier-Modelle (historische Rekordhalter / Pareto-Front)'
                : 'Only pioneer models (historical record breakers / Pareto frontier)'
            }
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
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
                  <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-[11px] text-amber-300">
                    <span className="text-slate-400">{lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}</span>
                    <span className="font-bold">
                      {lang === 'de'
                        ? `Grad ${polyDegree} (${polyDegree === 2 ? 'Parabel' : polyDegree === 3 ? 'Wendepunkt' : 'Höhere Ordnung'})`
                        : `Degree ${polyDegree} (${polyDegree === 2 ? 'Parabola' : polyDegree === 3 ? 'Inflection' : 'Higher order'})`}
                    </span>
                  </div>
                )}
                {activeRegression.id === 'loess' && (
                  <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-[11px] text-amber-300">
                    <span className="text-slate-400">{lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}</span>
                    <span className="font-bold">
                      {lang === 'de' ? `Span = ${loessSpan}% (Fensterbreite)` : `Span = ${loessSpan}% (Window width)`}
                    </span>
                  </div>
                )}
                {activeRegression.id !== 'frontier' && (
                  <div className="pt-1.5 border-t border-slate-700/60 text-[11px] text-slate-300 leading-snug">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>{lang === 'de' ? '95%-Konfidenzband' : '95% Confidence Band'}</span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 leading-normal">
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
            <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
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
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 select-none">
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
                <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 select-none">
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
      )}

      {/* 2 CORRELATION PLOTS SIDE-BY-SIDE (Quadratic 1:1 Aspect Ratio) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plot 1 (Left): Either Scatterplot or Heatmap */}
        {(() => {
          const heatmapToggleButton1 = (
            <Tooltip
              content={
                plot1Mode === 'heatmap'
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
                onClick={() => setPlot1Mode((m) => (m === 'scatter' ? 'heatmap' : 'scatter'))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md border transition-all cursor-pointer text-xs font-mono shadow-2xs ${
                  plot1Mode === 'heatmap'
                    ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white font-bold hover:bg-blue-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400'
                }`}
              >
                <Grid3X3 className={`w-3 h-3 ${plot1Mode === 'heatmap' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                <span>Heatmap</span>
              </button>
            </Tooltip>
          );

          if (plot1Mode === 'heatmap') {
            return (
              <CorrelationHeatmap
                allModels={allModels}
                scope={scope}
                frontierPointIds={frontierPointIds}
                metric={plot1HeatmapMetric}
                onToggleMetric={() => setPlot1HeatmapMetric((prev) => (prev === 'pearson' ? 'spearman' : 'pearson'))}
                onSelectPairForOtherPlot={(xIdx, yIdx) => {
                  setPlot2XDimIndex(xIdx);
                  setPlot2YDimIndex(yIdx);
                  setPlot2Mode('scatter');
                }}
                lang={lang}
                headerToggle={heatmapToggleButton1}
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
              xAxisDimIndex={plot1XDimIndex}
              yAxisDimIndex={plot1YDimIndex}
              onXAxisDimChange={setPlot1XDimIndex}
              onYAxisDimChange={setPlot1YDimIndex}
              onSwapAxes={handleSwapPlot1}
              lang={lang}
              onScrollToParagraph={onScrollToParagraph}
              headerToggle={heatmapToggleButton1}
            />
          );
        })()}

        {/* Plot 2 (Right): Either Scatterplot or Heatmap */}
        {(() => {
          const heatmapToggleButton2 = (
            <Tooltip
              content={
                plot2Mode === 'heatmap'
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
                onClick={() => setPlot2Mode((m) => (m === 'scatter' ? 'heatmap' : 'scatter'))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md border transition-all cursor-pointer text-xs font-mono shadow-2xs ${
                  plot2Mode === 'heatmap'
                    ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white font-bold hover:bg-blue-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400'
                }`}
              >
                <Grid3X3 className={`w-3 h-3 ${plot2Mode === 'heatmap' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                <span>Heatmap</span>
              </button>
            </Tooltip>
          );

          if (plot2Mode === 'heatmap') {
            return (
              <CorrelationHeatmap
                allModels={allModels}
                scope={scope}
                frontierPointIds={frontierPointIds}
                metric={plot2HeatmapMetric}
                onToggleMetric={() => setPlot2HeatmapMetric((prev) => (prev === 'pearson' ? 'spearman' : 'pearson'))}
                onSelectPairForOtherPlot={(xIdx, yIdx) => {
                  setPlot1XDimIndex(xIdx);
                  setPlot1YDimIndex(yIdx);
                  setPlot1Mode('scatter');
                }}
                lang={lang}
                headerToggle={heatmapToggleButton2}
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
              xAxisDimIndex={plot2XDimIndex}
              yAxisDimIndex={plot2YDimIndex}
              onXAxisDimChange={setPlot2XDimIndex}
              onYAxisDimChange={setPlot2YDimIndex}
              onSwapAxes={handleSwapPlot2}
              lang={lang}
              onScrollToParagraph={onScrollToParagraph}
              headerToggle={heatmapToggleButton2}
            />
          );
        })()}
      </div>
    </div>
  );
};
