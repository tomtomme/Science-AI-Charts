import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ExternalLink, TrendingUp, Calendar, Building2, Plus, Minus, ArrowLeftRight, Sparkles } from 'lucide-react';
import { ModelRecord, RegressionType } from '../types';
import { calculateRegression, extractFrontierPoints } from '../utils/mathRegression';
import {
  CORRELATION_DIMENSIONS,
  calculatePearson,
  calculateSpearman,
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
    id: 'movingAverage',
    labelDe: 'Gleitender Schnitt (MA)',
    labelEn: 'Moving Average (MA)',
    shortDe: 'Moving Avg',
    shortEn: 'Moving Avg',
    descDe: 'Gleitender Durchschnitt über X-Werte',
    descEn: 'Rolling moving average over X values',
    color: '#10b981', // Emerald
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
  {
    id: 'logistic',
    labelDe: 'Logistische S-Kurve',
    labelEn: 'Logistic S-Curve',
    shortDe: 'S-Kurve',
    shortEn: 'S-Curve',
    descDe: 'Sättigungs-Wachstumsmodell mit oberer Schranke',
    descEn: 'Saturation growth model with theoretical ceiling',
    color: '#06b6d4', // Cyan
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
];

export const CorrelationsScatterplot: React.FC<CorrelationsScatterplotProps> = ({
  allModels,
  onScrollToParagraph,
  onScrollToFinalScores,
  lang,
}) => {
  // Axis Dimension selection: Index 0..10
  // Default: X = #1 Coding & Math (index 3), Y = #2 Non-Hallucination (index 4)
  const [xAxisDimIndex, setXAxisDimIndex] = useState<number>(3);
  const [yAxisDimIndex, setYAxisDimIndex] = useState<number>(4);

  // Model & Regression State
  const [regressionIndex, setRegressionIndex] = useState<number>(0); // Default: Linear
  const [movingAvgDays, setMovingAvgDays] = useState<number>(20); // Window width along X
  const [polyDegree, setPolyDegree] = useState<number>(2); // Default degree 2
  const [loessSpan, setLoessSpan] = useState<number>(40); // 40%
  const [logisticCeiling, setLogisticCeiling] = useState<number>(100); // 100%
  const [scope, setScope] = useState<'all' | 'frontier'>('all');

  const activeRegression = CORRELATION_REGRESSION_OPTIONS[regressionIndex] || CORRELATION_REGRESSION_OPTIONS[0];

  const xDim = CORRELATION_DIMENSIONS[xAxisDimIndex] || CORRELATION_DIMENSIONS[0];
  const yDim = CORRELATION_DIMENSIONS[yAxisDimIndex] || CORRELATION_DIMENSIONS[1];

  const [hoveredPoint, setHoveredPoint] = useState<{
    point: CorrelationPoint;
    screenX: number;
    screenY: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleDotMouseEnter = (e: React.MouseEvent, pt: CorrelationPoint) => {
    clearCloseTimeout();
    const rect = containerRef.current?.getBoundingClientRect();
    setHoveredPoint({
      point: pt,
      screenX: e.clientX - (rect?.left || 0),
      screenY: e.clientY - (rect?.top || 0),
    });
  };

  const handleDotMouseLeave = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
    }, 1800);
  };

  const handleTooltipMouseEnter = () => {
    clearCloseTimeout();
  };

  const handleTooltipMouseLeave = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

  // Swap X and Y axes
  const handleSwapAxes = () => {
    const prevX = xAxisDimIndex;
    setXAxisDimIndex(yAxisDimIndex);
    setYAxisDimIndex(prevX);
  };

  // Extract valid correlation points
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

  // Identify frontier breakthrough models
  const frontierPoints = useMemo(() => {
    // Treat (x, y) with timestamps for frontier extraction
    const asTimelinePoints = allCorrelationPoints.map((p) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      company: p.company,
      releaseDate: p.releaseDate,
      timestamp: new Date(p.releaseDate).getTime(),
      score: p.y,
      flag: p.flag,
      isPaid: p.isPaid,
    }));
    return extractFrontierPoints(asTimelinePoints);
  }, [allCorrelationPoints]);

  const frontierPointIds = useMemo(() => {
    return new Set(frontierPoints.map((p) => p.id));
  }, [frontierPoints]);

  const activePoints = useMemo(() => {
    if (scope === 'frontier') {
      return allCorrelationPoints.filter((p) => frontierPointIds.has(p.id));
    }
    return allCorrelationPoints;
  }, [allCorrelationPoints, scope, frontierPointIds]);

  // Calculate Pearson & Spearman
  const pearsonResult = useMemo(() => {
    return calculatePearson(activePoints);
  }, [activePoints]);

  const spearmanResult = useMemo(() => {
    return calculateSpearman(activePoints);
  }, [activePoints]);

  // SVG dimensions
  const svgWidth = 1000;
  const svgHeight = 540;
  const margin = { top: 40, right: 40, bottom: 65, left: 65 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  // Coordinate scales
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

  // Generate X-Axis ticks
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

  // Generate Y-Axis ticks
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

  // Compute Regression Curve
  const regressionParam =
    activeRegression.id === 'movingAverage'
      ? movingAvgDays
      : activeRegression.id === 'polynomial'
      ? polyDegree
      : activeRegression.id === 'loess'
      ? loessSpan
      : activeRegression.id === 'logistic'
      ? logisticCeiling
      : 60;

  const regression = useMemo(() => {
    // Map (x, y) to timeline structure so mathRegression can compute fit
    const regressionInput = activePoints.map((p) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      company: p.company,
      releaseDate: p.releaseDate,
      timestamp: p.x, // x-axis value
      score: p.y, // y-axis value
      flag: p.flag,
      isPaid: p.isPaid,
    }));

    return calculateRegression(regressionInput, activeRegression.id, 120, regressionParam);
  }, [activePoints, activeRegression.id, regressionParam]);

  // Format SVG Path for regression line
  const regressionPath = useMemo(() => {
    if (regression.points.length === 0) return '';
    return regression.points
      .map((pt, i) => {
        const x = scaleX(pt.x);
        const y = scaleY(pt.y);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [regression.points, minX, maxX, minY, maxY, innerWidth, innerHeight]);

  const handleScroll = (targetId: string) => {
    if (onScrollToParagraph) {
      onScrollToParagraph(targetId);
      return;
    }
    if (onScrollToFinalScores) {
      onScrollToFinalScores();
      return;
    }
    const container = document.getElementById('csv-notes-section');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const doScrollToTarget = () => {
      const el = document.getElementById(targetId) || document.getElementById('final-scores-section');
      const box = document.getElementById('section1-scroll-box');
      if (el) {
        if (box) {
          const targetTop = el.offsetTop - box.offsetTop;
          box.scrollTo({ top: Math.max(0, targetTop - 12), behavior: 'smooth' });
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-500/15', 'rounded-lg', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-500/15');
        }, 3000);
      }
    };
    setTimeout(doScrollToTarget, 200);
    setTimeout(doScrollToTarget, 500);
  };

  const isLinearModel = activeRegression.id === 'linear';

  return (
    <div className="w-full space-y-3.5">
      {/* Controls Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col gap-2.5">
        {/* Row 1: X-Axis Selector + Swap Button + Y-Axis Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: X and Y Dimension Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* X-Axis Dimension Selector */}
            <div className="relative flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0">
              <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
                {lang === 'de' ? 'X-Achse:' : 'X-Axis:'}
              </span>
              <button
                type="button"
                onClick={() => setXAxisDimIndex((prev) => Math.max(0, prev - 1))}
                disabled={xAxisDimIndex <= 0}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                title="-1"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min={0}
                max={CORRELATION_DIMENSIONS.length - 1}
                step={1}
                value={xAxisDimIndex}
                onChange={(e) => setXAxisDimIndex(Number(e.target.value))}
                className="w-18 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 shrink-0"
              />
              <button
                type="button"
                onClick={() => setXAxisDimIndex((prev) => Math.min(CORRELATION_DIMENSIONS.length - 1, prev + 1))}
                disabled={xAxisDimIndex >= CORRELATION_DIMENSIONS.length - 1}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                title="+1"
              >
                <Plus className="w-3 h-3" />
              </button>

              {/* X Badge Button (links to notes section) */}
              <div className="w-[140px] sm:w-[170px] shrink-0 overflow-hidden flex items-center">
                <button
                  type="button"
                  onClick={() => handleScroll(xDim.targetId)}
                  className="text-[10px] sm:text-[10.5px] font-mono font-bold px-2 py-0.5 rounded text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: xDim.color }}
                  title={lang === 'de' ? xDim.nameDe : xDim.nameEn}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  <span className="truncate">{lang === 'de' ? xDim.nameDe : xDim.nameEn}</span>
                </button>
              </div>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwapAxes}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
              title={lang === 'de' ? 'Achsen vertauschen (X ⇄ Y)' : 'Swap axes (X ⇄ Y)'}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </button>

            {/* Y-Axis Dimension Selector */}
            <div className="relative flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0">
              <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
                {lang === 'de' ? 'Y-Achse:' : 'Y-Axis:'}
              </span>
              <button
                type="button"
                onClick={() => setYAxisDimIndex((prev) => Math.max(0, prev - 1))}
                disabled={yAxisDimIndex <= 0}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                title="-1"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min={0}
                max={CORRELATION_DIMENSIONS.length - 1}
                step={1}
                value={yAxisDimIndex}
                onChange={(e) => setYAxisDimIndex(Number(e.target.value))}
                className="w-18 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 shrink-0"
              />
              <button
                type="button"
                onClick={() => setYAxisDimIndex((prev) => Math.min(CORRELATION_DIMENSIONS.length - 1, prev + 1))}
                disabled={yAxisDimIndex >= CORRELATION_DIMENSIONS.length - 1}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                title="+1"
              >
                <Plus className="w-3 h-3" />
              </button>

              {/* Y Badge Button (links to notes section) */}
              <div className="w-[140px] sm:w-[170px] shrink-0 overflow-hidden flex items-center">
                <button
                  type="button"
                  onClick={() => handleScroll(yDim.targetId)}
                  className="text-[10px] sm:text-[10.5px] font-mono font-bold px-2 py-0.5 rounded text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: yDim.color }}
                  title={lang === 'de' ? yDim.nameDe : yDim.nameEn}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  <span className="truncate">{lang === 'de' ? yDim.nameDe : yDim.nameEn}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Model Slider + Fixed Width Param Input */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:ml-auto">
            {/* Regression Model Slider */}
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
              <div className="w-[105px] sm:w-[130px] shrink-0 overflow-hidden flex items-center">
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
              className={`w-[142px] flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0 ${
                activeRegression.id !== 'movingAverage' &&
                activeRegression.id !== 'polynomial' &&
                activeRegression.id !== 'loess' &&
                activeRegression.id !== 'logistic'
                  ? 'opacity-40 cursor-not-allowed'
                  : ''
              }`}
              title={
                activeRegression.id === 'movingAverage'
                  ? lang === 'de'
                    ? 'Glättungsfenster in X-Punkten (5–50)'
                    : 'Moving window in X points (5–50)'
                  : activeRegression.id === 'polynomial'
                  ? lang === 'de'
                    ? 'Polynom-Grad (2, 3 oder 4)'
                    : 'Polynomial degree (2, 3 or 4)'
                  : activeRegression.id === 'loess'
                  ? lang === 'de'
                    ? 'Bandbreite / Glättungs-Span (15–80%)'
                    : 'Bandwidth smoothing span (15–80%)'
                  : activeRegression.id === 'logistic'
                  ? lang === 'de'
                    ? 'Sättigungsgrenze / Decke L (80–150%)'
                    : 'Saturation ceiling L (80–150%)'
                  : lang === 'de'
                  ? 'Kein variabler Parameter für dieses Modell'
                  : 'No variable parameter for this model'
              }
            >
              <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                Param:
              </span>
              <div className="w-[76px] shrink-0 flex items-center justify-end">
                {activeRegression.id === 'movingAverage' ? (
                  <div className="w-[76px] h-6 flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1.5 focus-within:border-emerald-500">
                    <input
                      type="number"
                      min={5}
                      max={50}
                      step={5}
                      value={movingAvgDays}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 5 && val <= 50) setMovingAvgDays(val);
                      }}
                      className="w-[44px] font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none text-center p-0"
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 select-none">
                      P
                    </span>
                  </div>
                ) : activeRegression.id === 'polynomial' ? (
                  <select
                    value={polyDegree}
                    onChange={(e) => setPolyDegree(Number(e.target.value))}
                    className="w-[76px] h-6 px-1.5 font-mono text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-hidden focus:border-rose-500 text-center"
                  >
                    <option value={2}>{lang === 'de' ? 'Grad 2' : 'Deg 2'}</option>
                    <option value={3}>{lang === 'de' ? 'Grad 3' : 'Deg 3'}</option>
                    <option value={4}>{lang === 'de' ? 'Grad 4' : 'Deg 4'}</option>
                  </select>
                ) : activeRegression.id === 'loess' ? (
                  <div className="w-[76px] h-6 flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1.5 focus-within:border-amber-500">
                    <input
                      type="number"
                      min={15}
                      max={80}
                      step={5}
                      value={loessSpan}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 15 && val <= 80) setLoessSpan(val);
                      }}
                      className="w-[44px] font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none text-center p-0"
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 select-none">
                      %
                    </span>
                  </div>
                ) : activeRegression.id === 'logistic' ? (
                  <div className="w-[76px] h-6 flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-1.5 focus-within:border-cyan-500">
                    <input
                      type="number"
                      min={80}
                      max={150}
                      step={5}
                      value={logisticCeiling}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 80 && val <= 150) setLogisticCeiling(val);
                      }}
                      className="w-[44px] font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none text-center p-0"
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
        </div>

        {/* Row 2: Model Scope Toggle + Side-by-Side Pearson r & Spearman rho Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Scope Segmented Control */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">
              {lang === 'de' ? 'Datenbasis:' : 'Scope:'}
            </span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  scope === 'all'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'de' ? 'Alle Modelle' : 'All Models'} ({allCorrelationPoints.length})
              </button>
              <button
                type="button"
                onClick={() => setScope('frontier')}
                className={`px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
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
                <span>{lang === 'de' ? 'SOTA Frontier' : 'SOTA Frontier'}</span>
                <span className="text-[10px] opacity-90">({frontierPointIds.size})</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side Pearson r & Spearman rho Badges with Contextual Highlighting */}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {/* Pearson's r Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                isLinearModel
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
              }`}
              title={
                lang === 'de'
                  ? 'Pearson-Korrelationskoeffizient r (misst die Stärke des linearen Zusammenhangs)'
                  : 'Pearson correlation coefficient r (measures linear relationship strength)'
              }
            >
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                Pearson r:
              </span>
              <span
                className="font-mono text-xs sm:text-sm font-extrabold"
                style={{ color: pearsonResult.color }}
              >
                {pearsonResult.value >= 0 ? '+' : ''}
                {pearsonResult.value.toFixed(3)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden md:inline">
                ({lang === 'de' ? pearsonResult.strengthDe : pearsonResult.strengthEn})
              </span>
            </div>

            {/* Spearman's rho Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                !isLinearModel
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
              }`}
              title={
                lang === 'de'
                  ? 'Spearman-Rangkorrelationskoeffizient ρ (misst monotone und nichtlineare Zusammenhänge)'
                  : 'Spearman rank correlation coefficient ρ (measures monotonic & non-linear relationships)'
              }
            >
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                Spearman ρ:
              </span>
              <span
                className="font-mono text-xs sm:text-sm font-extrabold"
                style={{ color: spearmanResult.color }}
              >
                {spearmanResult.value >= 0 ? '+' : ''}
                {spearmanResult.value.toFixed(3)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden md:inline">
                ({lang === 'de' ? spearmanResult.strengthDe : spearmanResult.strengthEn})
              </span>
            </div>

            {/* Formula / Curve Hint */}
            <span
              className="text-[10px] font-mono text-slate-400 hidden xl:inline max-w-[260px] truncate"
              title={regression.formula}
            >
              {regression.formula}
            </span>
          </div>
        </div>
      </div>

      {/* Scatterplot Canvas Container */}
      <div
        ref={containerRef}
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm overflow-hidden select-none"
      >
        {/* SVG Scatterplot */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[640px] overflow-visible"
        >
          <defs>
            <linearGradient id="corrRegressionGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={activeRegression.color} stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
            </linearGradient>
            <filter id="corrDotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Grid lines - X */}
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
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono font-medium"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Grid lines - Y */}
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
                  x={margin.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono font-medium"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Axes Base Lines */}
          <line
            x1={margin.left}
            y1={margin.top + innerHeight}
            x2={margin.left + innerWidth}
            y2={margin.top + innerHeight}
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + innerHeight}
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.5"
          />

          {/* X-Axis Dimension Title */}
          <text
            x={margin.left + innerWidth / 2}
            y={margin.top + innerHeight + 42}
            textAnchor="middle"
            className="fill-slate-700 dark:fill-slate-300 text-xs font-bold"
          >
            {lang === 'de' ? xDim.nameDe : xDim.nameEn}
          </text>

          {/* Y-Axis Dimension Title (Rotated) */}
          <text
            transform={`rotate(-90) translate(-${margin.top + innerHeight / 2}, 20)`}
            textAnchor="middle"
            className="fill-slate-700 dark:fill-slate-300 text-xs font-bold"
          >
            {lang === 'de' ? yDim.nameDe : yDim.nameEn}
          </text>

          {/* Regression Trendline */}
          {regressionPath && (
            <>
              {/* Outer Glow */}
              <path
                d={regressionPath}
                fill="none"
                stroke={activeRegression.color}
                strokeWidth="7"
                strokeOpacity="0.18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Inner Curve */}
              <path
                d={regressionPath}
                fill="none"
                stroke={activeRegression.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={activeRegression.id === 'loess' || activeRegression.id === 'movingAverage' ? '5,3' : undefined}
              />
            </>
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
                onMouseEnter={(e) => handleDotMouseEnter(e, pt)}
                onMouseLeave={handleDotMouseLeave}
              >
                {/* Hit target padding */}
                <circle cx={cx} cy={cy} r={15} fill="transparent" />

                {/* SOTA Frontier Accent Ring */}
                {isFrontier && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 11 : 7.5}
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
                    r={13}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    className="animate-pulse"
                    pointerEvents="none"
                  />
                )}

                {/* Main Scatter Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : isFrontier ? 5 : 4.5}
                  fill={isHovered ? '#f43f5e' : isFrontier ? '#d97706' : xDim.color}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 1.2}
                  filter="url(#corrDotGlow)"
                  className="transition-all duration-150 hover:opacity-95"
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Popup with grace period & bridge */}
        {hoveredPoint && (
          <div
            style={{
              left: `${Math.min(window.innerWidth > 768 ? 750 : 280, Math.max(16, hoveredPoint.screenX - 120))}px`,
              top: `${Math.max(16, hoveredPoint.screenY - 140)}px`,
            }}
            className="absolute z-40 bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700/80 backdrop-blur-md pointer-events-auto min-w-[250px] max-w-[340px] transition-all animate-in fade-in zoom-in-95 duration-150 before:content-[''] before:absolute before:-bottom-6 before:left-0 before:right-0 before:h-8"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5 leading-tight flex-wrap">
                  <span>{hoveredPoint.point.displayName}</span>
                  {hoveredPoint.point.flag && <span>{hoveredPoint.point.flag}</span>}
                  {frontierPointIds.has(hoveredPoint.point.id) && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      <span>SOTA</span>
                    </span>
                  )}
                </h4>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span>{hoveredPoint.point.company}</span>
                </div>
              </div>

              {/* Chat Link */}
              {hoveredPoint.point.chatUrl && (
                <a
                  href={hoveredPoint.point.chatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Chat</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Bivariate X & Y Score Cards */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[10px] uppercase font-bold truncate" title={lang === 'de' ? xDim.nameDe : xDim.nameEn}>
                  X: {lang === 'de' ? xDim.shortDe : xDim.shortEn}
                </span>
                <span className="font-mono text-base font-extrabold" style={{ color: xDim.color }}>
                  {hoveredPoint.point.x.toFixed(1)}
                </span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[10px] uppercase font-bold truncate" title={lang === 'de' ? yDim.nameDe : yDim.nameEn}>
                  Y: {lang === 'de' ? yDim.shortDe : yDim.shortEn}
                </span>
                <span className="font-mono text-base font-extrabold" style={{ color: yDim.color }}>
                  {hoveredPoint.point.y.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 mt-1 border-t border-slate-800/60">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{hoveredPoint.point.releaseDate}</span>
              </div>
              <span>{hoveredPoint.point.isPaid ? 'Paid' : 'Free API'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
