import React, { useMemo, useState, useRef, useEffect, useCallback, useDeferredValue, memo } from 'react';
import { ExternalLink, TrendingUp, Calendar, Building2, Plus, Minus, Sparkles, Layers } from 'lucide-react';
import { ModelRecord, RegressionType, ScoreMode, TimelineDataPoint, Row33Metadata } from '../types';
import { BENCHMARK_COMPONENTS, RETIRED_TIMELINE_BENCHMARKS, getBenchmarkCategoryLabel, getCompositeScoreLabel } from '../data/benchmarks';
import { calculateMultiLevelRegression, calculateRegression, extractFrontierPoints, isMultiLevelSupported } from '../utils/mathRegression';
import { DEFAULT_TIMELINE_LAB_LEVELS, TIMELINE_MAIN_LAB_LEVELS, TimelineLabLevel } from '../data/labLevels';
import { calculatePearson, calculateSpearman, formatCorrelationDecimal } from '../utils/correlationUtils';
import { Tooltip } from './Tooltip';
import { RegressionModelControls } from './RegressionModelControls';
import { TRANSLATIONS } from '../utils/i18n';
import {
  TIMELINE_REGRESSION_OPTIONS,
  DEFAULT_TIMELINE_REGRESSION_INDEX,
  type RegressionOption,
} from '../data/regressionOptions';

export { TIMELINE_REGRESSION_OPTIONS, DEFAULT_TIMELINE_REGRESSION_INDEX };
export type { RegressionOption };

interface TimelineScatterplotProps {
  models: ModelRecord[];
  allModels: ModelRecord[];
  scoreMode: ScoreMode;
  onScoreModeChange: (mode: ScoreMode) => void;
  selectedCategoryIndex: number; // 0 = All (Final Score), 1..8 = active, 9..12 = retired
  onCategoryIndexChange: (index: number) => void;
  categoryNames?: string[];
  isPreTranslatedCategoryNames?: boolean;
  retiredCategoryNames?: string[];
  isPreTranslatedRetiredCategoryNames?: boolean;
  compositeScoreNames?: string[];
  isPreTranslatedCompositeScoreNames?: boolean;
  onScrollToParagraph?: (targetId: string) => void;
  onScrollToFinalScores?: () => void;
  lang: 'de' | 'en';
  // Controlled props when header controls are elevated
  timelineScope?: 'all' | 'frontier';
  onTimelineScopeChange?: (scope: 'all' | 'frontier') => void;
  regressionIndex?: number;
  onRegressionIndexChange?: (idx: number | ((prev: number) => number)) => void;
  polyDegree?: number;
  onPolyDegreeChange?: (deg: number) => void;
  loessSpan?: number;
  onLoessSpanChange?: (span: number) => void;
  multiLevelEnabled?: boolean;
  onMultiLevelEnabledChange?: (val: boolean | ((prev: boolean) => boolean)) => void;
  selectedLabLevels?: string[];
  onSelectedLabLevelsChange?: (labs: string[] | ((prev: string[]) => string[])) => void;
  hideHeaderControls?: boolean;
  row33Meta?: Row33Metadata;
}

const REGRESSION_OPTIONS = TIMELINE_REGRESSION_OPTIONS;

interface RenderedTimelineDot {
  point: TimelineDataPoint;
  cx: number;
  cy: number;
  isFrontier: boolean;
  isDimmed: boolean;
  dotColor: string;
}

interface TimelineSvgBaseProps {
  svgWidth: number;
  svgHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
  innerWidth: number;
  innerHeight: number;
  minTime: number;
  maxTime: number;
  minScore: number;
  maxScore: number;
  yTicks: number[];
  xTicks: Array<{ time: number; label: string }>;
  lang: 'de' | 'en';
  yAxisLabel: string;
  activeRegressionId: RegressionType;
  activeRegressionColor: string;
  isMultiLevelActive: boolean;
  hoveredLabId: string | null;
  onHoverLabId: (id: string | null) => void;
  multiLevelSvgCurves: Array<{
    levelId: string;
    color: string;
    path: string;
    bandPath: string;
  }>;
  confidenceBandPath: string;
  regressionPath: string;
  timelineScope: 'all' | 'frontier';
  renderedDots: RenderedTimelineDot[];
  onDotMouseEnter: (e: React.MouseEvent, dot: RenderedTimelineDot) => void;
  onDotMouseLeave: () => void;
  onDotClick: (chatUrl?: string) => void;
}

const TimelineSvgBase = memo<TimelineSvgBaseProps>(function TimelineSvgBase({
  svgWidth,
  svgHeight,
  margin,
  innerWidth,
  innerHeight,
  minTime,
  maxTime,
  minScore,
  maxScore,
  yTicks,
  xTicks,
  lang,
  yAxisLabel,
  activeRegressionId,
  activeRegressionColor,
  isMultiLevelActive,
  hoveredLabId,
  onHoverLabId,
  multiLevelSvgCurves,
  confidenceBandPath,
  regressionPath,
  timelineScope,
  renderedDots,
  onDotMouseEnter,
  onDotMouseLeave,
  onDotClick,
}) {
  const scaleX = (t: number) =>
    margin.left + ((t - minTime) / (maxTime - minTime || 1)) * innerWidth;
  const scaleY = (s: number) =>
    margin.top + innerHeight - ((s - minScore) / (maxScore - minScore || 1)) * innerHeight;

  return (
    <>
      <defs>
        <linearGradient id="regressionGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={activeRegressionColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="confidenceBandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={activeRegressionColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {/* Background Grid Lines (Horizontal / Scores) */}
      {yTicks.map((tick) => {
        const y = scaleY(tick);
        return (
          <g key={`y-${tick}`}>
            <line
              x1={margin.left}
              y1={y}
              x2={svgWidth - margin.right}
              y2={y}
              stroke="currentColor"
              className="text-slate-300/80 dark:text-slate-800/80"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={margin.left - 12}
              y={y + 5}
              textAnchor="end"
              fontSize="15"
              fontFamily="var(--font-mono)"
              className="font-mono font-semibold fill-slate-700 dark:fill-slate-300"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {/* Background Grid Lines (Vertical / Dates) */}
      {xTicks.map((tick) => {
        const x = scaleX(tick.time);
        return (
          <g key={`x-${tick.time}`}>
            <line
              x1={x}
              y1={margin.top}
              x2={x}
              y2={svgHeight - margin.bottom}
              stroke="currentColor"
              className="text-slate-300/80 dark:text-slate-800/80"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={x}
              y={svgHeight - margin.bottom + 26}
              textAnchor="middle"
              fontSize="15"
              fontFamily="var(--font-mono)"
              className="font-mono font-semibold fill-slate-700 dark:fill-slate-300"
            >
              {tick.label}
            </text>
          </g>
        );
      })}

      {/* Axes Lines */}
      <line
        x1={margin.left}
        y1={svgHeight - margin.bottom}
        x2={svgWidth - margin.right}
        y2={svgHeight - margin.bottom}
        stroke="currentColor"
        className="text-slate-500 dark:text-slate-600"
        strokeWidth="2"
      />
      <line
        x1={margin.left}
        y1={margin.top}
        x2={margin.left}
        y2={svgHeight - margin.bottom}
        stroke="currentColor"
        className="text-slate-500 dark:text-slate-600"
        strokeWidth="2"
      />

      {/* Axis Labels */}
      <text
        x={margin.left + innerWidth / 2}
        y={svgHeight - 16}
        textAnchor="middle"
        fontSize="15"
        fontFamily="var(--font-sans)"
        className="font-sans font-bold fill-black dark:fill-white uppercase tracking-wider"
      >
        {lang === 'de' ? 'Veröffentlichungsdatum' : 'Release Date'}
      </text>
      <text
        transform={`rotate(-90 ${margin.left - 56} ${margin.top + innerHeight / 2})`}
        x={margin.left - 56}
        y={margin.top + innerHeight / 2}
        textAnchor="middle"
        fontSize="15"
        fontFamily="var(--font-sans)"
        className="font-sans font-bold fill-black dark:fill-white tracking-wider"
      >
        {yAxisLabel}
      </text>

      {/* 95% Confidence Band(s) & Fitted Regression Curve(s) */}
      {isMultiLevelActive ? (
        <>
          {multiLevelSvgCurves.map((curve) => {
            const isDimmedCurve = hoveredLabId !== null && hoveredLabId !== curve.levelId;
            const isHighlightedCurve = hoveredLabId === curve.levelId;
            return (
              <g
                key={`ml-curve-${curve.levelId}`}
                style={{ opacity: isDimmedCurve ? 0.2 : 1, transition: 'opacity 0.15s' }}
              >
                {curve.bandPath && activeRegressionId !== 'frontier' && (
                  <path
                    d={curve.bandPath}
                    fill={curve.color}
                    fillOpacity={isHighlightedCurve ? 0.2 : 0.1}
                    stroke={curve.color}
                    strokeWidth="0.7"
                    strokeDasharray="3 3"
                    strokeOpacity={isHighlightedCurve ? 0.55 : 0.28}
                    className="pointer-events-none"
                  />
                )}
                {curve.path && (
                  <path
                    d={curve.path}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth={isHighlightedCurve ? '4.2' : '3'}
                    strokeLinecap="round"
                    className="cursor-pointer"
                    onMouseEnter={() => onHoverLabId(curve.levelId)}
                    onMouseLeave={() => onHoverLabId(null)}
                  />
                )}
              </g>
            );
          })}
        </>
      ) : (
        <>
          {confidenceBandPath && activeRegressionId !== 'frontier' && (
            <path
              d={confidenceBandPath}
              fill="url(#confidenceBandGrad)"
              stroke={activeRegressionColor}
              strokeWidth="0.8"
              strokeDasharray="3 3"
              strokeOpacity="0.4"
              className="pointer-events-none"
            />
          )}

          {regressionPath && (
            <path
              d={regressionPath}
              fill="none"
              stroke="url(#regressionGlow)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}
        </>
      )}

      {/* Static Scatter Data Points (no per-dot feDropShadow filter, no hoveredPoint dependency) */}
      {renderedDots.map((dot) => (
        <g
          key={dot.point.id}
          className="cursor-pointer"
          style={dot.isDimmed ? { opacity: 0.22 } : undefined}
          onMouseEnter={(e) => onDotMouseEnter(e, dot)}
          onMouseLeave={onDotMouseLeave}
          onClick={() => onDotClick(dot.point.chatUrl)}
        >
          {/* Invisible larger hit target for smooth and forgiving hover */}
          <circle cx={dot.cx} cy={dot.cy} r={15} fill="transparent" />

          {/* Outer Golden Accent Ring for SOTA Frontier Breakthrough Models */}
          {dot.isFrontier && (
            <circle
              cx={dot.cx}
              cy={dot.cy}
              r={7.5}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray={timelineScope === 'frontier' ? undefined : '2,2'}
              pointerEvents="none"
            />
          )}

          {/* Main Scatter Dot */}
          <circle
            cx={dot.cx}
            cy={dot.cy}
            r={dot.isFrontier ? 5 : 4.5}
            fill={dot.dotColor}
            stroke="#ffffff"
            strokeWidth={1.2}
            pointerEvents="none"
          />
        </g>
      ))}
    </>
  );
});

interface TimelineChartCanvasProps extends Omit<TimelineSvgBaseProps, 'onDotMouseEnter' | 'onDotMouseLeave' | 'onDotClick'> {
  selectedCategoryIndex: number;
}

const TimelineChartCanvas = memo<TimelineChartCanvasProps>(function TimelineChartCanvas({
  selectedCategoryIndex,
  ...svgProps
}) {
  const [hoveredDot, setHoveredDot] = useState<{
    dot: RenderedTimelineDot;
    screenX: number;
    screenY: number;
    containerWidth: number;
  } | null>(null);

  const plotBoxRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleDotMouseEnter = useCallback(
    (e: React.MouseEvent, dot: RenderedTimelineDot) => {
      clearCloseTimeout();
      const rect = plotBoxRef.current?.getBoundingClientRect();
      setHoveredDot({
        dot,
        screenX: e.clientX - (rect?.left || 0),
        screenY: e.clientY - (rect?.top || 0),
        containerWidth: rect?.width || 900,
      });
    },
    [clearCloseTimeout]
  );

  const handleDotMouseLeave = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredDot(null);
    }, 1800);
  }, [clearCloseTimeout]);

  const handleTooltipMouseEnter = useCallback(() => {
    clearCloseTimeout();
  }, [clearCloseTimeout]);

  const handleTooltipMouseLeave = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredDot(null);
    }, 1000);
  }, [clearCloseTimeout]);

  const handleDotClick = useCallback((chatUrl?: string) => {
    if (chatUrl) {
      window.open(chatUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, [clearCloseTimeout]);

  const activeDot = hoveredDot?.dot;

  return (
    <div ref={plotBoxRef} className="p-4 overflow-hidden relative">
      <svg
        viewBox={`0 0 ${svgProps.svgWidth} ${svgProps.svgHeight}`}
        className="w-full h-auto max-h-[640px] overflow-visible"
      >
        <TimelineSvgBase
          {...svgProps}
          onDotMouseEnter={handleDotMouseEnter}
          onDotMouseLeave={handleDotMouseLeave}
          onDotClick={handleDotClick}
        />

        {/* Lightweight Hover Highlight Overlay (only 1 dot re-renders on hover!) */}
        {activeDot && (
          <g className="pointer-events-none">
            {activeDot.isFrontier && (
              <circle
                cx={activeDot.cx}
                cy={activeDot.cy}
                r={11}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray={svgProps.timelineScope === 'frontier' ? undefined : '2,2'}
              />
            )}
            <circle
              cx={activeDot.cx}
              cy={activeDot.cy}
              r={13}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              className="animate-pulse"
            />
            <circle
              cx={activeDot.cx}
              cy={activeDot.cy}
              r={7}
              fill="#f43f5e"
              stroke="#ffffff"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {/* Hover Tooltip Popup (no backdrop-blur, no transition-all layout drag) */}
      {hoveredDot && activeDot && (
        <div
          style={{
            left: `${Math.min(Math.max(16, hoveredDot.containerWidth - 336), Math.max(16, hoveredDot.screenX - 120))}px`,
            top: `${Math.max(12, hoveredDot.screenY - 132)}px`,
          }}
          className="absolute z-40 bg-slate-900/[0.97] text-white p-3 rounded-xl shadow-xl border border-slate-700/80 pointer-events-auto min-w-[240px] max-w-[320px] before:content-[''] before:absolute before:-bottom-6 before:left-0 before:right-0 before:h-8"
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5 leading-tight flex-wrap">
                <span>{activeDot.point.displayName}</span>
                {activeDot.point.flag && <span>{activeDot.point.flag}</span>}
                {activeDot.isFrontier && (
                  <span className="text-xs font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>{svgProps.lang === 'de' ? 'Pionier' : 'Pioneer'}</span>
                  </span>
                )}
              </h4>
              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>{activeDot.point.company}</span>
              </div>
            </div>

            {activeDot.point.chatUrl && (
              <a
                href={activeDot.point.chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <span>Chat</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
            <div className="bg-slate-800/80 p-1.5 rounded">
              <span className="text-slate-400 block text-xs uppercase font-bold">
                {selectedCategoryIndex === 0 ? 'Score' : 'Wert'}
              </span>
              <span className="font-mono text-base font-extrabold text-emerald-400">
                {activeDot.point.score.toFixed(1)}
              </span>
            </div>
            <div className="bg-slate-800/80 p-1.5 rounded">
              <span className="text-slate-400 block text-xs uppercase font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Datum</span>
              </span>
              <span className="font-mono text-xs font-medium text-slate-200">
                {activeDot.point.releaseDate}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export const TimelineScatterplot: React.FC<TimelineScatterplotProps> = memo(({
  allModels,
  scoreMode,
  onScoreModeChange,
  selectedCategoryIndex,
  onCategoryIndexChange,
  categoryNames,
  isPreTranslatedCategoryNames = false,
  retiredCategoryNames,
  isPreTranslatedRetiredCategoryNames = false,
  compositeScoreNames,
  isPreTranslatedCompositeScoreNames = false,
  onScrollToParagraph,
  onScrollToFinalScores,
  lang,
  timelineScope: propTimelineScope,
  onTimelineScopeChange,
  regressionIndex: propRegressionIndex,
  onRegressionIndexChange,
  polyDegree: propPolyDegree,
  onPolyDegreeChange,
  loessSpan: propLoessSpan,
  onLoessSpanChange,
  multiLevelEnabled: propMultiLevelEnabled,
  onMultiLevelEnabledChange,
  selectedLabLevels: propSelectedLabLevels,
  onSelectedLabLevelsChange,
  hideHeaderControls = false,
  row33Meta,
}) => {
  // Regression Model state with controlled/internal fallbacks
  const [internalRegressionIndex, setInternalRegressionIndex] = useState<number>(DEFAULT_TIMELINE_REGRESSION_INDEX);
  const [internalPolyDegree, setInternalPolyDegree] = useState<number>(2); // Default: degree 2
  const [internalLoessSpan, setInternalLoessSpan] = useState<number>(50); // Default: 50% smoothing span
  const [internalTimelineScope, setInternalTimelineScope] = useState<'all' | 'frontier'>('all');
  const [internalMultiLevel, setInternalMultiLevel] = useState<boolean>(false);
  const [internalSelectedLabLevels, setInternalSelectedLabLevels] = useState<string[]>(DEFAULT_TIMELINE_LAB_LEVELS);
  const [hoveredLabId, setHoveredLabId] = useState<string | null>(null);

  const regressionIndex = propRegressionIndex !== undefined ? propRegressionIndex : internalRegressionIndex;
  const setRegressionIndex = onRegressionIndexChange || setInternalRegressionIndex;

  const polyDegree = propPolyDegree !== undefined ? propPolyDegree : internalPolyDegree;
  const setPolyDegree = onPolyDegreeChange || setInternalPolyDegree;

  const loessSpan = propLoessSpan !== undefined ? propLoessSpan : internalLoessSpan;
  const setLoessSpan = onLoessSpanChange || setInternalLoessSpan;

  const timelineScope = propTimelineScope !== undefined ? propTimelineScope : internalTimelineScope;
  const setTimelineScope = onTimelineScopeChange || setInternalTimelineScope;

  const multiLevelEnabled = propMultiLevelEnabled !== undefined ? propMultiLevelEnabled : internalMultiLevel;
  const setMultiLevelEnabled = onMultiLevelEnabledChange || setInternalMultiLevel;

  const selectedLabLevels = propSelectedLabLevels !== undefined ? propSelectedLabLevels : internalSelectedLabLevels;
  const setSelectedLabLevels = onSelectedLabLevelsChange || setInternalSelectedLabLevels;

  const activeRegression = REGRESSION_OPTIONS[regressionIndex] || REGRESSION_OPTIONS[0];
  const isMultiLevelFeasible = isMultiLevelSupported(activeRegression.id);
  const isMultiLevelActive = multiLevelEnabled && isMultiLevelFeasible;

  // Defer heavy regression inputs so slider dragging remains 60 FPS on slow CPUs
  const deferredRegressionId = useDeferredValue(activeRegression.id);
  const deferredPolyDegree = useDeferredValue(polyDegree);
  const deferredLoessSpan = useDeferredValue(loessSpan);

  const containerRef = useRef<HTMLDivElement>(null);

  // Active benchmark component if category index is 1..8 (active) or 9..12 (retired)
  const activeComponent = useMemo(() => {
    if (selectedCategoryIndex >= 1 && selectedCategoryIndex <= 8) {
      return BENCHMARK_COMPONENTS[selectedCategoryIndex - 1];
    }
    if (selectedCategoryIndex >= 9 && selectedCategoryIndex <= 12) {
      return RETIRED_TIMELINE_BENCHMARKS[selectedCategoryIndex - 9];
    }
    return null;
  }, [selectedCategoryIndex]);

  // Prepare scatter data points from all models in the database
  const scatterPoints: TimelineDataPoint[] = useMemo(() => {
    const list: TimelineDataPoint[] = [];
    for (const m of allModels) {
      let score: number | null = null;
      if (selectedCategoryIndex === 0) {
        // Final Score based on scoreMode
        if (scoreMode === 'old') {
          score = m.scoreOld;
        } else if (scoreMode === 'worstCase') {
          score = m.scoreWorstCase;
        } else {
          score = m.scoreNew ?? m.scoreNewReported;
        }
      } else if (activeComponent) {
        // Individual benchmark component score: empty cells from CSV are missing (null)
        const raw = m.rawScores[activeComponent.key];
        score = typeof raw === 'number' && raw !== null ? activeComponent.transform(raw) : null;
      }

      if (score === null || isNaN(score) || score <= 0) continue;

      // Parse release date (Column Y)
      const dateStr = m.releaseDate || '2024-01-01';
      const timestamp = new Date(dateStr).getTime();
      if (isNaN(timestamp)) continue;

      list.push({
        id: m.id,
        name: m.name,
        displayName: m.displayName,
        company: m.creatorClean || m.companyName || 'LLM Lab',
        companyName: m.companyName,
        releaseDate: dateStr,
        timestamp,
        score,
        chatUrl: m.chatLink || m.modelUrl,
        isPaid: m.isPaid,
        flag: m.flag,
      });
    }
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [allModels, selectedCategoryIndex, scoreMode, activeComponent]);

  // Identify Pareto frontier models (breakthrough models that set a new benchmark high score at release date)
  const frontierPoints = useMemo(() => {
    return extractFrontierPoints(scatterPoints);
  }, [scatterPoints]);

  const frontierPointIds = useMemo(() => {
    return new Set(frontierPoints.map((p) => p.id));
  }, [frontierPoints]);

  // Data points passed into regression fitting based on timelineScope toggle
  const regressionDataPoints = useMemo(() => {
    if (timelineScope === 'frontier') {
      return frontierPoints;
    }
    return scatterPoints;
  }, [scatterPoints, frontierPoints, timelineScope]);

  // SVG dimensions & scales (1200x624 matches ~1.0x CSS rendering on desktop for 15px axis parity)
  const svgWidth = 1200;
  const svgHeight = 624;
  const margin = { top: 44, right: 44, bottom: 82, left: 84 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  const { minTime, maxTime, minScore, maxScore } = useMemo(() => {
    if (scatterPoints.length === 0) {
      const now = Date.now();
      return { minTime: now - 365 * 86400000, maxTime: now, minScore: 0, maxScore: 100 };
    }
    const times = scatterPoints.map((p) => p.timestamp);
    const scores = scatterPoints.map((p) => p.score);

    // Add padding to time bounds
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const padT = (maxT - minT) * 0.05 || 86400000 * 30;

    // Add padding to score bounds
    const maxS = Math.max(...scores);
    const minS = Math.min(...scores);
    const topS = Math.min(100, Math.ceil((maxS + 5) / 10) * 10);
    const botS = Math.max(0, Math.floor((minS - 5) / 10) * 10);

    return {
      minTime: minT - padT,
      maxTime: maxT + padT,
      minScore: botS,
      maxScore: Math.max(topS, 60),
    };
  }, [scatterPoints]);

  const scaleX = (t: number) => {
    return margin.left + ((t - minTime) / (maxTime - minTime || 1)) * innerWidth;
  };

  const scaleY = (s: number) => {
    return margin.top + innerHeight - ((s - minScore) / (maxScore - minScore || 1)) * innerHeight;
  };

  // Compute regression curve & R² (deferred for smooth slider interaction)
  const regressionParam =
    deferredRegressionId === 'polynomial'
      ? deferredPolyDegree
      : deferredRegressionId === 'loess'
      ? deferredLoessSpan
      : undefined;

  const regression = useMemo(() => {
    return calculateRegression(regressionDataPoints, deferredRegressionId, 120, regressionParam);
  }, [regressionDataPoints, deferredRegressionId, regressionParam]);

  // Map each point in scatterPoints to its matched main lab level (if any)
  const pointLabMap = useMemo(() => {
    const map = new Map<string, TimelineLabLevel>();
    for (const pt of scatterPoints) {
      const matched = TIMELINE_MAIN_LAB_LEVELS.find((lab) => lab.match(pt));
      if (matched) {
        map.set(pt.id, matched);
      }
    }
    return map;
  }, [scatterPoints]);

  // Point counts per lab in the active regressionDataPoints scope
  const labPointCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lab of TIMELINE_MAIN_LAB_LEVELS) {
      counts[lab.id] = 0;
    }
    for (const pt of regressionDataPoints) {
      const matched = pointLabMap.get(pt.id);
      if (matched) {
        counts[matched.id] = (counts[matched.id] || 0) + 1;
      }
    }
    return counts;
  }, [regressionDataPoints, pointLabMap]);

  // Multi-level regression calculation across selected LLM lab levels
  const multiLevelResult = useMemo(() => {
    if (!isMultiLevelActive) {
      return { curves: [], overallR2: 0 };
    }
    const groups = TIMELINE_MAIN_LAB_LEVELS.filter((lab) => selectedLabLevels.includes(lab.id)).map((lab) => ({
      id: lab.id,
      label: lab.label,
      color: lab.color,
      data: regressionDataPoints.filter((pt) => pointLabMap.get(pt.id)?.id === lab.id),
    }));
    return calculateMultiLevelRegression(
      regressionDataPoints,
      groups,
      deferredRegressionId,
      90,
      regressionParam ?? (deferredRegressionId === 'loess' ? deferredLoessSpan : 2)
    );
  }, [isMultiLevelActive, selectedLabLevels, regressionDataPoints, pointLabMap, deferredRegressionId, regressionParam, deferredLoessSpan]);

  // Precompute SVG paths & confidence bands for each multi-level lab curve
  const multiLevelSvgCurves = useMemo(() => {
    return multiLevelResult.curves.map((curve) => {
      const pts = curve.regression.points;
      const path =
        pts.length > 0
          ? pts
              .map((pt, i) => {
                const x = scaleX(pt.x);
                const y = scaleY(pt.y);
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(' ')
          : '';

      const validBand = pts.filter(
        (p) => typeof p.lower === 'number' && typeof p.upper === 'number' && !isNaN(p.x) && !isNaN(p.lower) && !isNaN(p.upper)
      );
      let bandPath = '';
      if (validBand.length > 0) {
        const upperPoints = validBand.map((pt, i) => {
          const x = scaleX(pt.x);
          const y = scaleY(pt.upper!);
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        });
        const lowerPoints = [...validBand].reverse().map((pt) => {
          const x = scaleX(pt.x);
          const y = scaleY(pt.lower!);
          return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
        });
        bandPath = `${upperPoints.join(' ')} ${lowerPoints.join(' ')} Z`;
      }

      return {
        ...curve,
        path,
        bandPath,
      };
    });
  }, [multiLevelResult.curves, minTime, maxTime, minScore, maxScore]);

  // Compute Pearson r & Spearman Rho on timeline data points matching active scope
  const correlationPoints = useMemo(() => {
    return regressionDataPoints.map((pt) => ({ x: pt.timestamp, y: pt.score }));
  }, [regressionDataPoints]);

  const pearsonResult = useMemo(() => calculatePearson(correlationPoints), [correlationPoints]);
  const spearmanResult = useMemo(() => calculateSpearman(correlationPoints), [correlationPoints]);
  const isLinearModel = activeRegression.id === 'linear';

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
  }, [regression, minTime, maxTime, minScore, maxScore]);

  // Format SVG Path for 95% Confidence Band
  const confidenceBandPath = useMemo(() => {
    if (!regression.points || regression.points.length === 0) return '';
    const valid = regression.points.filter(
      (p) => typeof p.lower === 'number' && typeof p.upper === 'number' && !isNaN(p.x) && !isNaN(p.lower) && !isNaN(p.upper)
    );
    if (valid.length === 0) return '';

    // Upper boundary forward
    const upperPoints = valid.map((pt, i) => {
      const x = scaleX(pt.x);
      const y = scaleY(pt.upper!);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    // Lower boundary backward
    const lowerPoints = [...valid].reverse().map((pt) => {
      const x = scaleX(pt.x);
      const y = scaleY(pt.lower!);
      return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    return `${upperPoints.join(' ')} ${lowerPoints.join(' ')} Z`;
  }, [regression.points, minTime, maxTime, minScore, maxScore]);

  // Precompute static scatter dot geometry and colors so TimelineSvgBase never re-renders on dot hover
  const renderedDots = useMemo<RenderedTimelineDot[]>(() => {
    const selectedLabSet = new Set(selectedLabLevels);
    const timeSpan = maxTime - minTime || 1;
    const scoreSpan = maxScore - minScore || 1;
    return scatterPoints.map((pt) => {
      const cx = margin.left + ((pt.timestamp - minTime) / timeSpan) * innerWidth;
      const cy = margin.top + innerHeight - ((pt.score - minScore) / scoreSpan) * innerHeight;
      const isFrontier = frontierPointIds.has(pt.id);
      const matchedLab = pointLabMap.get(pt.id);
      const isActiveLabDot = Boolean(isMultiLevelActive && matchedLab && selectedLabSet.has(matchedLab.id));
      const isOtherLabDimmed =
        isMultiLevelActive &&
        (!isActiveLabDot || (hoveredLabId !== null && matchedLab?.id !== hoveredLabId));
      const isDimmed = (timelineScope === 'frontier' && !isFrontier) || isOtherLabDimmed;
      const dotColor =
        isActiveLabDot && matchedLab
          ? matchedLab.color
          : isFrontier
          ? '#d97706'
          : '#3b82f6';
      return { point: pt, cx, cy, isFrontier, isDimmed, dotColor };
    });
  }, [
    scatterPoints,
    minTime,
    maxTime,
    minScore,
    maxScore,
    innerWidth,
    innerHeight,
    frontierPointIds,
    pointLabMap,
    isMultiLevelActive,
    selectedLabLevels,
    hoveredLabId,
    timelineScope,
  ]);

  // Generate adaptive, non-overlapping X-Axis ticks (Months/Quarters/Years)
  const xTicks = useMemo(() => {
    const ticks: Array<{ time: number; label: string }> = [];
    const spanMs = maxTime - minTime;
    if (spanMs <= 0) return ticks;

    const spanMonths = spanMs / (1000 * 60 * 60 * 24 * 30.4375);

    // Calculate maximum allowable ticks such that each label has at least 80px horizontal spacing
    const maxPossibleTicks = Math.max(3, Math.floor(innerWidth / 80));

    // Candidate standard calendar intervals in months (1m, 2m, 3m, 4m, 6m, 12m, 24m, 36m, 48m)
    const standardSteps = [1, 2, 3, 4, 6, 12, 24, 36, 48];
    let stepMonths = 1;
    for (const step of standardSteps) {
      if (spanMonths / step <= maxPossibleTicks) {
        stepMonths = step;
        break;
      }
    }

    const start = new Date(minTime);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    // Align start to the chosen calendar step
    if (stepMonths >= 12) {
      start.setMonth(0);
      const yrStep = Math.floor(stepMonths / 12);
      if (yrStep > 1) {
        const year = start.getFullYear();
        start.setFullYear(year - (year % yrStep));
      }
    } else if (stepMonths === 6) {
      start.setMonth(start.getMonth() < 6 ? 0 : 6);
    } else if (stepMonths === 3) {
      start.setMonth(Math.floor(start.getMonth() / 3) * 3);
    } else if (stepMonths === 2) {
      start.setMonth(Math.floor(start.getMonth() / 2) * 2);
    }

    const cur = new Date(start);
    let lastX = -999;

    while (cur.getTime() <= maxTime) {
      const timeVal = cur.getTime();
      if (timeVal >= minTime) {
        const xPos = scaleX(timeVal);

        // Keep labels within inner bounds and ensure minimum 70px spacing
        if (xPos >= margin.left + 5 && xPos <= svgWidth - margin.right - 5) {
          if (xPos - lastX >= 70) {
            let label = '';
            if (stepMonths >= 12) {
              label = cur.getFullYear().toString();
            } else {
              label = cur.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
                month: 'short',
                year: '2-digit',
              });
            }
            ticks.push({ time: timeVal, label });
            lastX = xPos;
          }
        }
      }
      cur.setMonth(cur.getMonth() + stepMonths);
    }

    return ticks;
  }, [minTime, maxTime, innerWidth, margin.left, margin.right, svgWidth, lang]);

  // Generate Y-Axis ticks (0, 20, 40, 60, 80, 100)
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = maxScore - minScore > 60 ? 20 : 10;
    for (let s = minScore; s <= maxScore; s += step) {
      ticks.push(s);
    }
    return ticks;
  }, [minScore, maxScore]);

  // Unified Score Slider Value:
  // 0 = New Score (scoreMode='new', category=0)
  // 1 = Old Score (scoreMode='old', category=0)
  // 2 = Worst Case (scoreMode='worstCase', category=0)
  // 3..10 = Categories 1..8
  const unifiedSliderValue = useMemo(() => {
    if (selectedCategoryIndex === 0) {
      if (scoreMode === 'old') return 1;
      if (scoreMode === 'worstCase') return 2;
      return 0;
    }
    return selectedCategoryIndex + 2;
  }, [selectedCategoryIndex, scoreMode]);

  const handleUnifiedSliderChange = (newVal: number) => {
    if (newVal === 0) {
      onScoreModeChange('new');
      onCategoryIndexChange(0);
    } else if (newVal === 1) {
      onScoreModeChange('old');
      onCategoryIndexChange(0);
    } else if (newVal === 2) {
      onScoreModeChange('worstCase');
      onCategoryIndexChange(0);
    } else {
      const catIdx = newVal - 2;
      onCategoryIndexChange(catIdx);
    }
  };

  const handleUnifiedStep = (step: number) => {
    const nextVal = Math.max(0, Math.min(14, unifiedSliderValue + step));
    handleUnifiedSliderChange(nextVal);
  };

  const t = TRANSLATIONS[lang];

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
      const el = document.getElementById(targetId) || document.getElementById('note-col-simplebench') || document.getElementById('note-col-k') || document.getElementById('final-scores-section');
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

  const activeCategoryName = activeComponent
    ? selectedCategoryIndex >= 9
      ? getBenchmarkCategoryLabel(
          retiredCategoryNames?.[selectedCategoryIndex - 9],
          lang,
          activeComponent,
          isPreTranslatedRetiredCategoryNames
        )
      : getBenchmarkCategoryLabel(
          categoryNames?.[selectedCategoryIndex - 1],
          lang,
          activeComponent,
          isPreTranslatedCategoryNames
        )
    : null;

  const newScoreLabel = getCompositeScoreLabel(
    0,
    compositeScoreNames?.[0],
    lang,
    t.scoreModeNew,
    isPreTranslatedCompositeScoreNames
  );
  const oldScoreLabel = getCompositeScoreLabel(
    1,
    compositeScoreNames?.[1],
    lang,
    t.scoreModeOld,
    isPreTranslatedCompositeScoreNames
  );
  const worstCaseLabel = getCompositeScoreLabel(
    2,
    compositeScoreNames?.[2],
    lang,
    t.scoreModeWorstCase,
    isPreTranslatedCompositeScoreNames
  );

  // Bilingual Y-Axis label matching the score slider labels without superfluous points suffix
  const yAxisLabel = useMemo(() => {
    if (selectedCategoryIndex === 0) {
      if (scoreMode === 'old') return oldScoreLabel;
      if (scoreMode === 'worstCase') return worstCaseLabel;
      return newScoreLabel;
    }
    if (activeCategoryName) {
      return activeCategoryName;
    }
    return t.score;
  }, [selectedCategoryIndex, scoreMode, t.score, newScoreLabel, oldScoreLabel, worstCaseLabel, activeCategoryName]);

  // Scroll targets for all 3 composite scores + all 8 benchmark categories + retired benchmarks
  const scoreScrollTargets = useMemo(() => {
    if (unifiedSliderValue === 0) return { targetId: 'note-col-m' };
    if (unifiedSliderValue === 1) return { targetId: 'note-col-l' };
    if (unifiedSliderValue === 2) return { targetId: 'note-col-n' };

    const catIdx = unifiedSliderValue - 2; // 1..8 active, 9..12 retired
    if (catIdx <= 8) {
      const colTargets = [
        'note-col-d',
        'note-col-e',
        'note-col-f',
        'note-col-g',
        'note-col-h',
        'note-col-i',
        'note-col-j',
        'note-col-k',
      ];
      return {
        targetId: colTargets[catIdx - 1] || 'final-scores-section',
      };
    }
    const retiredTargets = ['note-col-d', 'note-col-e', 'note-col-f', 'note-col-simplebench'];
    return {
      targetId: retiredTargets[catIdx - 9] || 'note-col-simplebench',
    };
  }, [unifiedSliderValue]);

  const renderSyncedBadge = (text: string, sourceUrl?: string) => {
    if (!text) return null;
    if (sourceUrl) {
      const isInternal = sourceUrl.startsWith('#');
      return (
        <a
          href={sourceUrl}
          target={isInternal ? '_self' : '_blank'}
          rel={isInternal ? undefined : 'noopener noreferrer'}
          onClick={(e) => {
            e.stopPropagation();
            if (isInternal) {
              const el = document.getElementById(sourceUrl.slice(1));
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
          className="inline-flex items-center gap-1 text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/80 hover:text-emerald-300 transition-colors cursor-pointer whitespace-normal break-words text-left leading-tight"
          title={isInternal ? (lang === 'de' ? 'Zur Erklärung springen' : 'Jump to explanation') : `Quelle: ${sourceUrl}`}
        >
          <span>{text}</span>
          {!isInternal && <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />}
        </a>
      );
    }
    return (
      <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 inline-block whitespace-normal break-words leading-tight">
        {text}
      </span>
    );
  };

  // Unified tooltip data for the score slider
  const activeScoreTooltip = useMemo(() => {
    if (unifiedSliderValue === 0) {
      const item = row33Meta?.scoreNewColM;
      return {
        title: newScoreLabel,
        badge: renderSyncedBadge(
          item?.text || (lang === 'de' ? '8 Benchmarks' : '8 Benchmarks'),
          item?.sourceUrl || '#note-col-m'
        ),
        desc:
          lang === 'de'
            ? 'Umfassender Gesamt-Score aus allen 8 gleichgewichteten Benchmark-Kriterien (jeweils 12,5 %). Aktueller Standard für moderne Chatbots.'
            : 'Comprehensive final score composed of all 8 equally weighted benchmark criteria (12.5% each). Modern standard for current chatbots.',
      };
    }
    if (unifiedSliderValue === 1) {
      const item = row33Meta?.scoreOldColL;
      return {
        title: oldScoreLabel,
        badge: renderSyncedBadge(
          item?.text || (lang === 'de' ? '5 Benchmarks' : '5 Benchmarks'),
          item?.sourceUrl || '#note-col-l'
        ),
        desc:
          lang === 'de'
            ? 'Historischer Gesamt-Score basierend auf den ursprünglichen 5 Benchmarks. Ermöglicht den Vergleich über einen längeren Zeitraum mit bis zu 224 Modellen.'
            : 'Historical final score based on the original 5 benchmarks. Enables long-term tracking across up to 224 models.',
      };
    }
    if (unifiedSliderValue === 2) {
      const item = row33Meta?.scoreWorstCaseColN;
      return {
        title: worstCaseLabel,
        badge: renderSyncedBadge(
          item?.text || (lang === 'de' ? 'Straf-Score' : 'Penalty Score'),
          item?.sourceUrl || '#note-col-n'
        ),
        desc:
          lang === 'de'
            ? 'Worst-Case-Score: Der 7-Benchmark-Durchschnitt wird mit der Nicht-Halluzinations-Rate multipliziert. Bestraft unzuverlässige und fabulierende Modelle drastisch.'
            : 'Worst-case penalty score: 7-benchmark average multiplied by non-hallucination rate. Heavily penalizes fabricating models.',
      };
    }
    if (activeComponent) {
      const isRetired = unifiedSliderValue > 10;
      const numPrefix = !isRetired ? `#${unifiedSliderValue - 2} ` : '';
      const name = activeCategoryName || (lang === 'de' ? activeComponent.nameDe : activeComponent.nameEn);

      let syncedItem: { text: string; sourceUrl?: string } | undefined;
      if (row33Meta) {
        const id = activeComponent.id;
        if (id in row33Meta.benchmarks) {
          syncedItem = row33Meta.benchmarks[id as keyof typeof row33Meta.benchmarks];
        } else if (id in row33Meta.retiredBenchmarks) {
          syncedItem = row33Meta.retiredBenchmarks[id as keyof typeof row33Meta.retiredBenchmarks];
        }
      }

      const badgeText = syncedItem?.text || activeComponent.sourceName || 'Benchmark';
      const badgeUrl = syncedItem?.sourceUrl || activeComponent.sourceUrl;

      return {
        title: `${numPrefix}${name}`,
        badge: renderSyncedBadge(badgeText, badgeUrl),
        desc: lang === 'de' ? activeComponent.descriptionDe : activeComponent.descriptionEn,
      };
    }
    return null;
  }, [unifiedSliderValue, activeComponent, activeCategoryName, lang, newScoreLabel, oldScoreLabel, worstCaseLabel, row33Meta]);

  return (
    <div className="w-full space-y-3.5">
      {/* Controls Container (rendered only if not elevated to header) */}
      {!hideHeaderControls && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col gap-2.5">
        {/* Row 1: Score Slider + Regression Model Slider + Contextual Param Input */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Merged Score Slider (Identical styling to bar chart tab) */}
          {activeScoreTooltip ? (
            <Tooltip
              title={activeScoreTooltip.title}
              badge={activeScoreTooltip.badge}
              position="bottom"
              align="center"
              width="w-[380px]"
              content={
                <div className="space-y-1.5">
                  <p className="leading-snug">{activeScoreTooltip.desc}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleScroll(scoreScrollTargets.targetId);
                    }}
                    className="w-full pt-1.5 border-t border-slate-700/60 text-xs text-slate-300 hover:text-emerald-300 flex items-center gap-1.5 cursor-pointer text-left transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 group-hover:scale-125 transition-transform" />
                    <span className="group-hover:underline font-medium">
                      {lang === 'de'
                        ? 'Klicken, um zur Erklärung zu springen'
                        : 'Click to jump to explanation'}
                    </span>
                  </button>
                </div>
              }
            >
              <div className="relative flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0 cursor-pointer">
                <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
                  Score:
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnifiedStep(-1);
                  }}
                  disabled={unifiedSliderValue <= 0}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                  title="-1"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={14}
                  step={1}
                  value={unifiedSliderValue}
                  onChange={(e) => handleUnifiedSliderChange(Number(e.target.value))}
                  className="w-18 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 shrink-0"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnifiedStep(1);
                  }}
                  disabled={unifiedSliderValue >= 14}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                  title="+1"
                >
                  <Plus className="w-3 h-3" />
                </button>

                {/* Feste Box für das Badge: New Score / Old Score / Worst Case oder Kategorie 1..8/9..12 (klickbar als Sprungmarke) */}
                <div className="w-[140px] sm:w-[170px] shrink-0 overflow-hidden flex items-center">
                  {unifiedSliderValue === 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScroll('note-col-m');
                      }}
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-emerald-500 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      <span className="truncate">{newScoreLabel}</span>
                    </button>
                  )}
                  {unifiedSliderValue === 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScroll('note-col-l');
                      }}
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-amber-500 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      <span className="truncate">{oldScoreLabel}</span>
                    </button>
                  )}
                  {unifiedSliderValue === 2 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScroll('note-col-n');
                      }}
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-rose-500 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      <span className="truncate">{worstCaseLabel}</span>
                    </button>
                  )}
                  {unifiedSliderValue >= 3 && activeComponent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScroll(scoreScrollTargets.targetId);
                      }}
                      className="text-xs font-mono font-bold px-1.5 py-0.5 rounded text-white shadow-2xs flex items-center gap-1 truncate w-full cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: activeComponent.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      <span className="truncate">
                        {unifiedSliderValue <= 10 ? `#${unifiedSliderValue - 2} ` : ''}
                        {activeCategoryName || (lang === 'de' ? activeComponent.nameDe : activeComponent.nameEn)}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </Tooltip>
          ) : (
            <div className="relative flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0">
              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
                Score:
              </span>
              <button
                type="button"
                onClick={() => handleUnifiedStep(-1)}
                disabled={unifiedSliderValue <= 0}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                title="-1"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min={0}
                max={14}
                step={1}
                value={unifiedSliderValue}
                onChange={(e) => handleUnifiedSliderChange(Number(e.target.value))}
                className="w-18 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 shrink-0"
              />
              <button
                type="button"
                onClick={() => handleUnifiedStep(1)}
                disabled={unifiedSliderValue >= 14}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                title="+1"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Right Group: When hideHeaderControls is true, show Pearson & Spearman badges directly here on Row 1. Otherwise show Regression Model Slider + Param */}
          {hideHeaderControls ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:ml-auto">
              {/* Pearson r Badge */}
              <Tooltip
                title="Pearson r"
                badge="Linear"
                align="center"
                width="w-64"
                content={
                  lang === 'de'
                    ? 'Pearson-Korrelationskoeffizient r misst den linearen Zusammenhang über die Zeit.'
                    : 'Pearson correlation coefficient r measures the linear relationship over time.'
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
                    {formatCorrelationDecimal(pearsonResult.value)}
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
                    ? 'Spearmans Rho misst den monotonen Rangzusammenhang über die Zeit, unempfindlicher gegenüber Ausreißern.'
                    : 'Spearman rank correlation measures monotonic rank relationship over time, more robust against outliers.'
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
                    {formatCorrelationDecimal(spearmanResult.value)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 hidden xl:inline">
                    ({lang === 'de' ? spearmanResult.strengthDe : spearmanResult.strengthEn})
                  </span>
                </div>
              </Tooltip>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 shrink-0 sm:ml-auto">
              <RegressionModelControls
                lang={lang}
                options={REGRESSION_OPTIONS}
                regressionIndex={regressionIndex}
                onRegressionIndexChange={setRegressionIndex}
                polyDegree={polyDegree}
                onPolyDegreeChange={setPolyDegree}
                loessSpan={loessSpan}
                onLoessSpanChange={setLoessSpan}
                iconColorClass="text-blue-500"
                sliderAccentClass="accent-blue-600"
                formula={regression.formula}
              />

              {/* Multi-Level Model Switch */}
              <Tooltip
                title={lang === 'de' ? 'Multi-Level-Modell' : 'Multi-level model'}
                badge={
                  !isMultiLevelFeasible
                    ? lang === 'de'
                      ? 'Nicht verfügbar'
                      : 'Unavailable'
                    : isMultiLevelActive
                    ? lang === 'de'
                      ? 'Aktiv'
                      : 'Active'
                    : lang === 'de'
                    ? 'Aus'
                    : 'Off'
                }
                align="right"
                width="w-72"
                content={
                  isMultiLevelFeasible
                    ? lang === 'de'
                      ? 'Schätzt pro KI-Labor eine eigene Trendkurve (Partial Pooling für Regression/LOESS bzw. Lab-Frontier für Pioniere).'
                      : 'Fits separate per-lab trajectory curves (partial pooling for regression/LOESS, per-lab frontier envelopes for Pioneers).'
                    : lang === 'de'
                    ? 'Multi-Level-Ansicht ist für dieses Modell nicht verfügbar.'
                    : 'Multi-level view is not available for this model.'
                }
              >
                <button
                  type="button"
                  disabled={!isMultiLevelFeasible}
                  aria-pressed={isMultiLevelActive}
                  onClick={() => isMultiLevelFeasible && setMultiLevelEnabled((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all shrink-0 ${
                    !isMultiLevelFeasible
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 text-slate-400 dark:text-slate-500'
                      : isMultiLevelActive
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xs ring-2 ring-indigo-500/20 cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span>Multi-level</span>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      !isMultiLevelFeasible
                        ? 'bg-slate-400'
                        : isMultiLevelActive
                        ? 'bg-emerald-300'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Row 2: Model Scope Toggle (All Models vs Pioneers) + Pearson r & Spearman Rho Correlation Display */}
        {!hideHeaderControls && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {/* Scope Segmented Control */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                {lang === 'de' ? 'Datenbasis:' : 'Scope:'}
              </span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
                <button
                  type="button"
                  aria-pressed={timelineScope === 'all'}
                  onClick={() => setTimelineScope('all')}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    timelineScope === 'all'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {lang === 'de' ? 'Alle Modelle' : 'All Models'} ({scatterPoints.length})
                </button>
                <button
                  type="button"
                  aria-pressed={timelineScope === 'frontier'}
                  onClick={() => setTimelineScope('frontier')}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    timelineScope === 'frontier'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400'
                  }`}
                  title={
                    lang === 'de'
                      ? 'Nur Modelle, die zum Release-Zeitpunkt einen neuen Rekord-Highscore erzielten (Pioniere)'
                      : 'Only models setting a new record score at release date (pioneers)'
                  }
                >
                  <Sparkles className={`w-3 h-3 ${timelineScope === 'frontier' ? 'text-white' : 'text-amber-500'}`} />
                  <span>{lang === 'de' ? 'Pioniere' : 'Pioneers'}</span>
                  <span className="text-xs opacity-90">({frontierPointIds.size})</span>
                </button>
              </div>
            </div>

            {/* Side-by-Side Pearson r & Spearmans Rho Badges (Matching Correlations Tab) */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:ml-auto">
              {/* Pearson r Badge */}
              <Tooltip
                title="Pearson r"
                badge="Linear"
                align="center"
                width="w-64"
                content={
                  lang === 'de'
                    ? 'Pearson-Korrelationskoeffizient r misst den linearen Zusammenhang über die Zeit.'
                    : 'Pearson correlation coefficient r measures the linear relationship over time.'
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
                    ? 'Spearmans Rho misst den monotonen Rangzusammenhang über die Zeit, unempfindlicher gegenüber Ausreißern.'
                    : 'Spearman rank correlation measures monotonic rank relationship over time, more robust against outliers.'
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
        )}
      </div>
      )}

      {/* Scatterplot Canvas Container */}
      <div
        ref={containerRef}
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden select-none flex flex-col"
      >
        {/* Diagram Header Bar: Criterion info on the left, Scope + Multi-level + Correlation badges on the right */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:px-4 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                {activeCategoryName
                  ? activeCategoryName
                  : scoreMode === 'old'
                  ? t.scoreModeOld
                  : scoreMode === 'worstCase'
                  ? t.scoreModeWorstCase
                  : t.scoreModeNew}
              </span>
            </span>
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 font-semibold">
              ({scatterPoints.length} {lang === 'de' ? 'Modelle' : 'models'})
            </span>
            {!hideHeaderControls && timelineScope === 'frontier' && (
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-white shadow-2xs">
                <Sparkles className="w-3 h-3 text-white" />
                <span>{lang === 'de' ? 'Pioniere' : 'Pioneers'}</span>
              </span>
            )}
          </div>

          {/* Right Group: Multi-level Switch, Multi-level R², Pearson r & Spearman Rho */}
          <div className="flex flex-wrap items-center gap-2 text-xs sm:ml-auto">
            {hideHeaderControls && (
              <>
                {/* Multi-Level Model Switch */}
                <Tooltip
                  title={lang === 'de' ? 'Multi-Level-Modell' : 'Multi-level model'}
                  badge={
                    !isMultiLevelFeasible
                      ? lang === 'de'
                        ? 'Nicht verfügbar'
                        : 'Unavailable'
                      : isMultiLevelActive
                      ? lang === 'de'
                        ? 'Aktiv'
                        : 'Active'
                      : lang === 'de'
                      ? 'Aus'
                      : 'Off'
                  }
                  position="bottom"
                  align="center"
                  width="w-72"
                  content={
                    isMultiLevelFeasible
                      ? lang === 'de'
                        ? 'Schätzt pro KI-Labor eine eigene Trendkurve (Partial Pooling für Regression/LOESS bzw. Lab-Frontier für Pioniere).'
                        : 'Fits separate per-lab trajectory curves (partial pooling for regression/LOESS, per-lab frontier envelopes for Pioneers).'
                      : lang === 'de'
                      ? 'Multi-Level-Ansicht ist für dieses Modell nicht verfügbar.'
                      : 'Multi-level view is not available for this model.'
                  }
                >
                  <button
                    type="button"
                    disabled={!isMultiLevelFeasible}
                    aria-pressed={isMultiLevelActive}
                    onClick={() => isMultiLevelFeasible && setMultiLevelEnabled((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all shrink-0 ${
                      !isMultiLevelFeasible
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 text-slate-400 dark:text-slate-500'
                        : isMultiLevelActive
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xs ring-2 ring-indigo-500/20 cursor-pointer'
                        : 'bg-slate-100 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>Multi-level</span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        !isMultiLevelFeasible
                          ? 'bg-slate-400'
                          : isMultiLevelActive
                          ? 'bg-emerald-300'
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  </button>
                </Tooltip>
              </>
            )}

            {isMultiLevelActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs">
                <Layers className="w-3 h-3" />
                <span>Multi-level R²: {(multiLevelResult.overallR2 * 100).toFixed(0)}%</span>
              </span>
            )}
            {/* Pearson r Badge */}
            <Tooltip
              title="Pearson r"
              badge="Linear"
              align="center"
              width="w-64"
              content={
                lang === 'de'
                  ? 'Pearson-Korrelationskoeffizient r misst den linearen Zusammenhang über die Zeit.'
                  : 'Pearson correlation coefficient r measures the linear relationship over time.'
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
                  ? 'Spearmans Rho misst den monotonen Rangzusammenhang über die Zeit, unempfindlicher gegenüber Ausreißern.'
                  : 'Spearman rank correlation measures monotonic rank relationship over time, more robust against outliers.'
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

        {/* Multi-Level Lab Company Selector Pills (active when Multi-level is ON) */}
        {isMultiLevelActive && (
          <div className="px-3 sm:px-4 py-2 bg-slate-50/40 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 mr-0.5 flex items-center gap-1 shrink-0">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>{lang === 'de' ? 'Ebenen (Labs):' : 'Levels (Labs):'}</span>
            </span>

            {/* 'All' / Reset Pills */}
            <button
              type="button"
              onClick={() => {
                const allIds = TIMELINE_MAIN_LAB_LEVELS.map((l) => l.id);
                if (selectedLabLevels.length === allIds.length) {
                  setSelectedLabLevels(DEFAULT_TIMELINE_LAB_LEVELS);
                } else {
                  setSelectedLabLevels(allIds);
                }
              }}
              className={`text-xs px-2.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                selectedLabLevels.length === TIMELINE_MAIN_LAB_LEVELS.length
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.all}
            </button>

            {!(
              selectedLabLevels.length === DEFAULT_TIMELINE_LAB_LEVELS.length &&
              DEFAULT_TIMELINE_LAB_LEVELS.every((id) => selectedLabLevels.includes(id))
            ) && (
              <button
                type="button"
                onClick={() => setSelectedLabLevels(DEFAULT_TIMELINE_LAB_LEVELS)}
                className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={lang === 'de' ? 'Zurücksetzen auf OpenAI, Anthropic, Google' : 'Reset to OpenAI, Anthropic, Google'}
              >
                {lang === 'de' ? 'Standard (3)' : 'Default (3)'}
              </button>
            )}

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block shrink-0 mx-0.5" />

            {TIMELINE_MAIN_LAB_LEVELS.map((lab) => {
              const isSelected = selectedLabLevels.includes(lab.id);
              const cnt = labPointCounts[lab.id] || 0;
              return (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => {
                    setSelectedLabLevels((prev) =>
                      prev.includes(lab.id) ? prev.filter((id) => id !== lab.id) : [...prev, lab.id]
                    );
                  }}
                  onMouseEnter={() => isSelected && setHoveredLabId(lab.id)}
                  onMouseLeave={() => setHoveredLabId(null)}
                  title={`${lab.label} (${lab.familyHint}) · ${cnt} ${lang === 'de' ? 'Modelle' : 'models'}`}
                  className={`text-xs px-2.5 py-0.5 rounded font-mono transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                    isSelected
                      ? 'text-white font-bold shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: lab.color, borderColor: lab.color }
                      : undefined
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? '#ffffff' : lab.color }}
                  />
                  <span>{lab.label}</span>
                  <span className={`text-xs ${isSelected ? 'opacity-90' : 'text-slate-600 dark:text-slate-400'}`}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Multi-Level Active Curves Legend */}
        {isMultiLevelActive && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 bg-slate-50/40 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80 text-xs font-mono">
            {multiLevelSvgCurves.length === 0 ? (
              <span className="text-slate-600 dark:text-slate-400">
                {lang === 'de'
                  ? 'Bitte mindestens eine Lab-Ebene oben auswählen.'
                  : 'Select at least one lab level above to display regression lines.'}
              </span>
            ) : (
              multiLevelSvgCurves.map((curve) => {
                const hasLine = curve.path.length > 0;
                return (
                  <div
                    key={curve.levelId}
                    onMouseEnter={() => hasLine && setHoveredLabId(curve.levelId)}
                    onMouseLeave={() => setHoveredLabId(null)}
                    className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-opacity ${
                      hasLine ? 'cursor-pointer' : 'opacity-50'
                    } ${
                      hoveredLabId && hoveredLabId !== curve.levelId ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    <span
                      className="w-3.5 h-1 rounded-full shrink-0"
                      style={{ backgroundColor: curve.color }}
                    />
                    <span className="font-bold text-slate-900 dark:text-slate-100">{curve.label}</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      (n={curve.count}
                      {hasLine ? `, R²=${curve.regression.r2.toFixed(1)}` : ', n<2'})
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Isolated SVG Scatterplot + Hover Overlay Canvas */}
        <TimelineChartCanvas
          svgWidth={svgWidth}
          svgHeight={svgHeight}
          margin={margin}
          innerWidth={innerWidth}
          innerHeight={innerHeight}
          minTime={minTime}
          maxTime={maxTime}
          minScore={minScore}
          maxScore={maxScore}
          yTicks={yTicks}
          xTicks={xTicks}
          lang={lang}
          yAxisLabel={yAxisLabel}
          activeRegressionId={activeRegression.id}
          activeRegressionColor={activeRegression.color}
          isMultiLevelActive={isMultiLevelActive}
          hoveredLabId={hoveredLabId}
          onHoverLabId={setHoveredLabId}
          multiLevelSvgCurves={multiLevelSvgCurves}
          confidenceBandPath={confidenceBandPath}
          regressionPath={regressionPath}
          timelineScope={timelineScope}
          renderedDots={renderedDots}
          selectedCategoryIndex={selectedCategoryIndex}
        />
      </div>
    </div>
  );
});
