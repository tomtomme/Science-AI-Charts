import React, { useMemo, useState, useRef, useId } from 'react';
import { ExternalLink, ArrowLeftRight, Sparkles, ChevronDown } from 'lucide-react';
import { ModelRecord, TimelineDataPoint } from '../../types';
import { calculateRegression } from '../../utils/mathRegression';
import { Tooltip } from '../Tooltip';
import {
  CORRELATION_DIMENSIONS,
  calculatePearson,
  calculateSpearman,
  formatCorrelationDecimal,
  CorrelationDimension,
  CorrelationPoint,
} from '../../utils/correlationUtils';
import { type CorrelationRegressionOption } from '../../data/regressionOptions';
import { AxisDimensionDropdown } from './AxisDimensionDropdown';
import {
  Row2LabelContext,
  getResolvedDimensionName,
  getResolvedDimensionShortLabel,
  getOptimalTooltipPosition,
} from './correlationHelpers';

export interface SingleCorrelationPlotProps {
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
  row2Labels: Row2LabelContext;
  onScrollToParagraph?: (targetId: string) => void;
  headerToggle?: React.ReactNode;
}

export const SingleCorrelationPlot: React.FC<SingleCorrelationPlotProps> = ({
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
  row2Labels,
  onScrollToParagraph,
  headerToggle,
}) => {
  const svgUid = useId().replace(/:/g, '');
  const xDim: CorrelationDimension = CORRELATION_DIMENSIONS[xAxisDimIndex] || CORRELATION_DIMENSIONS[0];
  const yDim: CorrelationDimension = CORRELATION_DIMENSIONS[yAxisDimIndex] || CORRELATION_DIMENSIONS[1];
  const xDimLabel = getResolvedDimensionName(xDim, lang, row2Labels);
  const yDimLabel = getResolvedDimensionName(yDim, lang, row2Labels);
  const xDimShort = getResolvedDimensionShortLabel(xDim, lang, row2Labels);
  const yDimShort = getResolvedDimensionShortLabel(yDim, lang, row2Labels);

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

  // Quadratic 1:1 aspect ratio: 780 x 780 matches desktop column width (~780px) at ~1.0x for 15px axis parity
  const svgWidth = 780;
  const svgHeight = 780;
  const margin = { top: 58, right: 54, bottom: 74, left: 74 };
  const innerWidth = svgWidth - margin.left - margin.right; // 652
  const innerHeight = svgHeight - margin.top - margin.bottom; // 652

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

    const upperPoints = valid.map((pt, i) => {
      const sx = scaleX(pt.x);
      const sy = scaleY(pt.upper!);
      return `${i === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
    });

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
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 transition-all cursor-pointer text-xs font-mono shadow-2xs"
            >
              <ArrowLeftRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>{'X ⇄ Y'}</span>
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
              className={`flex items-baseline gap-1 px-2 py-0.5 rounded-lg border font-mono transition-all ${
                isLinearModel
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">r:</span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color: pearsonResult.color }}>
                {formatCorrelationDecimal(pearsonResult.value)}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 hidden xl:inline">
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
              className={`flex items-baseline gap-1 px-2 py-0.5 rounded-lg border font-mono transition-all ${
                !isLinearModel
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Rho:</span>
              <span className="text-xs font-extrabold tabular-nums" style={{ color: spearmanResult.color }}>
                {formatCorrelationDecimal(spearmanResult.value)}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 hidden xl:inline">
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-white shadow-xs hover:ring-2 hover:ring-blue-400/50 transition-all cursor-pointer font-sans font-bold text-[15px]"
            style={{ backgroundColor: yDim.color }}
            title={
              lang === 'de'
                ? `Y-Achse: ${yDimLabel} (Klicken zum Auswählen der Kategorie)`
                : `Y-Axis: ${yDimLabel} (Click to choose category)`
            }
          >
            <span className="text-xs font-mono uppercase tracking-wide opacity-80">Y:</span>
            <span className="truncate max-w-[130px] sm:max-w-[180px]">
              {yDimLabel}
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
                  ? `${yDimLabel}: Zur Erläuterung in „How to read this“ springen`
                  : `${yDimLabel}: Jump to explanation in "How to read this"`
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
              row2Labels={row2Labels}
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
                  className="stroke-slate-200 dark:stroke-slate-800/80"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={x}
                  y={margin.top + innerHeight + 24}
                  textAnchor="middle"
                  fontSize="15"
                  fontFamily="var(--font-mono)"
                  className="fill-slate-700 dark:fill-slate-300 font-mono font-semibold"
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
                  className="stroke-slate-200 dark:stroke-slate-800/80"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={margin.left - 12}
                  y={y + 5}
                  textAnchor="end"
                  fontSize="15"
                  fontFamily="var(--font-mono)"
                  className="fill-slate-700 dark:fill-slate-300 font-mono font-semibold"
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
            className="stroke-slate-500 dark:stroke-slate-600"
            strokeWidth="1.6"
          />
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + innerHeight}
            className="stroke-slate-500 dark:stroke-slate-600"
            strokeWidth="1.6"
          />

          {/* 95% Confidence Band */}
          {confidenceBandPath && activeRegression.id !== 'frontier' && (
            <path
              d={confidenceBandPath}
              fill={activeRegression.color}
              fillOpacity={0.16}
              stroke={activeRegression.color}
              strokeWidth="1.2"
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
              strokeWidth="2.8"
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
                <circle cx={cx} cy={cy} r={20} fill="transparent" />

                {/* SOTA Frontier Accent Ring */}
                {isFrontier && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 13 : 9.5}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={isHovered ? 2.4 : 1.8}
                    strokeDasharray={scope === 'frontier' ? undefined : '2,2'}
                    pointerEvents="none"
                  />
                )}

                {/* Pulsing ring when hovered */}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={16}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.8"
                    className="animate-pulse"
                    pointerEvents="none"
                  />
                )}

                {/* Main Scatter Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 9 : isFrontier ? 6.5 : 5.5}
                  fill={isHovered ? '#f43f5e' : isFrontier ? '#d97706' : xDim.color}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.4 : 1.4}
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
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-white shadow-xs hover:ring-2 hover:ring-blue-400/50 transition-all cursor-pointer font-sans font-bold text-[15px]"
            style={{ backgroundColor: xDim.color }}
            title={
              lang === 'de'
                ? `X-Achse: ${xDimLabel} (Klicken zum Auswählen der Kategorie)`
                : `X-Axis: ${xDimLabel} (Click to choose category)`
            }
          >
            <span className="text-xs font-mono uppercase tracking-wide opacity-80">X:</span>
            <span className="truncate max-w-[150px] sm:max-w-[220px]">
              {xDimLabel}
            </span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
          </button>

          {onScrollToParagraph && xDim.targetId && (
            <button
              type="button"
              onClick={() => onScrollToParagraph(xDim.targetId)}
              className="p-1.5 rounded-md bg-white/95 dark:bg-slate-800/95 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-2xs border border-slate-200/80 dark:border-slate-700 cursor-pointer"
              title={
                lang === 'de'
                  ? `${xDimLabel}: Zur Erläuterung in „How to read this“ springen`
                  : `${xDimLabel}: Jump to explanation in "How to read this"`
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
              row2Labels={row2Labels}
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
                  title={xDimLabel}
                >
                  X: {xDimShort}
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
                  title={yDimLabel}
                >
                  Y: {yDimShort}
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
