import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ExternalLink, Info, TrendingUp, Calendar, Building2, Award, Plus, Minus } from 'lucide-react';
import { ModelRecord, RegressionType, ScoreMode, TimelineDataPoint } from '../types';
import { BENCHMARK_COMPONENTS } from '../data/benchmarks';

import { calculateRegression, getRegressionName } from '../utils/mathRegression';

interface TimelineScatterplotProps {
  models: ModelRecord[];
  allModels: ModelRecord[];
  scoreMode: ScoreMode;
  onScoreModeChange: (mode: ScoreMode) => void;
  selectedCategoryIndex: number; // 0 = All (Final Score), 1..8 = individual components
  onCategoryIndexChange: (index: number) => void;
  lang: 'de' | 'en';
}

const REGRESSION_OPTIONS: Array<{ id: RegressionType; labelDe: string; labelEn: string; descDe: string; descEn: string }> = [
  { id: 'linear', labelDe: 'Linear', labelEn: 'Linear', descDe: 'Geradliniger Trend über Zeit', descEn: 'Straight-line trend over time' },
  { id: 'exponential', labelDe: 'Exponential', labelEn: 'Exponential', descDe: 'Exponentielles Wachstum', descEn: 'Exponential acceleration' },
  { id: 'power', labelDe: 'Power (Potenz)', labelEn: 'Power', descDe: 'Potenzgesetz-Entwicklung', descEn: 'Power-law scaling curve' },
  { id: 'polynomial', labelDe: 'Polynome (Grad 2)', labelEn: 'Polynomial (deg 2)', descDe: 'Parabolischer Kurventrend', descEn: 'Quadratic parabolic curve' },
  { id: 'loess', labelDe: 'LOESS (Smoothing)', labelEn: 'LOESS (Smoothing)', descDe: 'Lokale Glättung empirischer Daten', descEn: 'Locally estimated empirical smoothing' },
];

export const TimelineScatterplot: React.FC<TimelineScatterplotProps> = ({
  allModels,
  scoreMode,
  onScoreModeChange,
  selectedCategoryIndex,
  onCategoryIndexChange,
  lang,
}) => {
  const [regressionType, setRegressionType] = useState<RegressionType>('polynomial');
  const [hoveredPoint, setHoveredPoint] = useState<{
    point: TimelineDataPoint;
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

  const handleDotMouseEnter = (e: React.MouseEvent, pt: TimelineDataPoint) => {
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
    // Keep dot & tooltip visible for 600ms so user can comfortably move their mouse to the link
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
    }, 600);
  };

  const handleTooltipMouseEnter = () => {
    clearCloseTimeout(); // Keep tooltip open while cursor is inside tooltip
  };

  const handleTooltipMouseLeave = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
    }, 350);
  };

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

  // Active benchmark component if category index is 1..8
  const activeComponent = selectedCategoryIndex > 0 ? BENCHMARK_COMPONENTS[selectedCategoryIndex - 1] : null;

  // Prepare scatter data points from all models in the database
  const scatterPoints: TimelineDataPoint[] = useMemo(() => {
    const list: TimelineDataPoint[] = [];
    for (const m of allModels) {
      let score = 0;
      if (selectedCategoryIndex === 0) {
        // Final Score based on scoreMode
        if (scoreMode === 'old') {
          score = m.scoreOld ?? 0;
        } else if (scoreMode === 'worstCase') {
          score = m.scoreWorstCase ?? 0;
        } else {
          score = m.scoreNewReported ?? m.score;
        }
      } else if (activeComponent) {
        // Individual benchmark component score
        const raw = m.rawScores[activeComponent.key];
        score = typeof raw === 'number' ? activeComponent.transform(raw) : 0;
      }

      if (score <= 0) continue;

      // Parse release date (Column Y)
      const dateStr = m.releaseDate || '2024-01-01';
      const timestamp = new Date(dateStr).getTime();
      if (isNaN(timestamp)) continue;

      list.push({
        id: m.id,
        name: m.name,
        displayName: m.displayName,
        company: m.creatorClean || m.companyName || 'LLM Lab',
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


  // SVG dimensions & scales
  const svgWidth = 1000;
  const svgHeight = 520;
  const margin = { top: 40, right: 40, bottom: 65, left: 65 };
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

  // Compute regression curve & R²
  const regression = useMemo(() => {
    return calculateRegression(scatterPoints, regressionType);
  }, [scatterPoints, regressionType]);

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

  // Generate X-Axis ticks (Months/Quarters)
  const xTicks = useMemo(() => {
    const ticks: Array<{ time: number; label: string }> = [];
    const start = new Date(minTime);
    start.setDate(1);

    const end = new Date(maxTime);
    const cur = new Date(start);

    while (cur <= end) {
      const month = cur.getMonth();
      // Tick every 2-3 months or quarters
      if (month % 2 === 0) {
        const label = cur.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
          month: 'short',
          year: '2-digit',
        });
        ticks.push({ time: cur.getTime(), label });
      }
      cur.setMonth(cur.getMonth() + 1);
    }
    return ticks;
  }, [minTime, maxTime, lang]);

  // Generate Y-Axis ticks (0, 20, 40, 60, 80, 100)
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = maxScore - minScore > 60 ? 20 : 10;
    for (let s = minScore; s <= maxScore; s += step) {
      ticks.push(s);
    }
    return ticks;
  }, [minScore, maxScore]);

  // Unified Slider Value:
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
    const nextVal = Math.max(0, Math.min(10, unifiedSliderValue + step));
    handleUnifiedSliderChange(nextVal);
  };

  return (
    <div className="w-full space-y-4">
      {/* Controls Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3.5">
        {/* Row 1: Merged Score & Category Slider */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Score:</span>
            </label>

            {/* Active Selection Badge */}
            <div className="flex items-center gap-1.5">
              {unifiedSliderValue === 0 && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-600 text-white shadow-2xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                  <span>NEW Score</span>
                </span>
              )}
              {unifiedSliderValue === 1 && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-amber-600 text-white shadow-2xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                  <span>OLD Score</span>
                </span>
              )}
              {unifiedSliderValue === 2 && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-rose-600 text-white shadow-2xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                  <span>Worst-Case</span>
                </span>
              )}
              {unifiedSliderValue >= 3 && activeComponent && (
                <span
                  className="text-xs font-mono font-bold px-2.5 py-1 rounded-md text-white shadow-2xs flex items-center gap-1.5"
                  style={{ backgroundColor: activeComponent.color }}
                >
                  <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                  <span>
                    #{unifiedSliderValue - 2} {lang === 'de' ? activeComponent.nameDe : activeComponent.nameEn}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Slider with - and + Step Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleUnifiedStep(-1)}
              disabled={unifiedSliderValue <= 0}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
              title="-1 Step"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={unifiedSliderValue}
              onChange={(e) => handleUnifiedSliderChange(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <button
              type="button"
              onClick={() => handleUnifiedStep(1)}
              disabled={unifiedSliderValue >= 10}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
              title="+1 Step"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Slider Quick Tick Labels */}
          <div className="grid grid-cols-11 text-center text-[9.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-mono gap-0.5">
            {[
              { val: 0, label: 'New', full: 'NEW Score' },
              { val: 1, label: 'Old', full: 'OLD Score' },
              { val: 2, label: 'Worst', full: 'Worst Case' },
              { val: 3, label: '#1', full: '#1 Math' },
              { val: 4, label: '#2', full: '#2 General' },
              { val: 5, label: '#3', full: '#3 Code' },
              { val: 6, label: '#4', full: '#4 Logic' },
              { val: 7, label: '#5', full: '#5 Vision' },
              { val: 8, label: '#6', full: '#6 Instruct' },
              { val: 9, label: '#7', full: '#7 Tools' },
              { val: 10, label: '#8', full: '#8 Domain' },
            ].map((tick) => (
              <button
                key={tick.val}
                type="button"
                onClick={() => handleUnifiedSliderChange(tick.val)}
                className={`py-0.5 px-0.5 rounded transition-colors cursor-pointer truncate ${
                  unifiedSliderValue === tick.val
                    ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/40'
                    : 'hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={tick.full}
              >
                {tick.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Explainer Space (Copied over from original tab to explain what the score means) */}
        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300">
          {selectedCategoryIndex === 0 ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-blue-900 dark:text-blue-300">
                  {scoreMode === 'new'
                    ? 'Final Score NEW: '
                    : scoreMode === 'old'
                    ? 'Final Score OLD: '
                    : 'Final Score Worst-Case: '}
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {scoreMode === 'new'
                    ? lang === 'de'
                      ? 'Gewichteter Gesamtscore über alle 8 wissenschaftlichen Benchmarks mit jeweils 12.5% Gewichtung.'
                      : 'Weighted total score across all 8 scientific benchmarks with 12.5% weight each.'
                    : scoreMode === 'old'
                    ? lang === 'de'
                      ? 'Früherer Gesamtscore über 7 Benchmarks vor Integration der Rechts-/Wirtschafts-Kategorie.'
                      : 'Earlier composite score over 7 benchmarks prior to legal/economics integration.'
                    : lang === 'de'
                    ? 'Konservatives Worst-Case-Szenario basierend auf der jeweils schwächsten Einzelleistung des Modells.'
                    : 'Conservative worst-case scenario reflecting the lowest individual evaluated component.'}
                </span>
              </div>
              <div className="shrink-0 font-mono text-[11px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded">
                Gewichtung: 8 × 12.5% = 100%
              </div>
            </div>
          ) : activeComponent ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-blue-900 dark:text-blue-300">
                  #{selectedCategoryIndex} {lang === 'de' ? activeComponent.nameDe : activeComponent.nameEn}:{' '}
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {lang === 'de' ? activeComponent.descriptionDe : activeComponent.descriptionEn} (Quelle:{' '}
                  {activeComponent.sourceName})
                </span>
              </div>
              <div className="shrink-0 font-mono text-[11px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded">
                Formel: {activeComponent.formulaDesc}
              </div>
            </div>
          ) : null}
        </div>

        {/* Row 3: Regression Controls & R² Metric */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
              <span>{lang === 'de' ? 'Regressionslinie:' : 'Regression Line:'}</span>
            </span>
            <div className="flex flex-wrap gap-1">
              {REGRESSION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRegressionType(opt.id)}
                  title={lang === 'de' ? opt.descDe : opt.descEn}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    regressionType === opt.id
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {lang === 'de' ? opt.labelDe : opt.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Prominent R² Display */}
          <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-3 py-1.5 rounded-lg">
            <span className="text-[11px] uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400">
              Bestimmtheitsmaß:
            </span>
            <span className="font-mono text-sm font-extrabold text-rose-700 dark:text-rose-300">
              R² = {regression.r2.toFixed(3)}
            </span>
            <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
              ({(regression.r2 * 100).toFixed(1)}% {lang === 'de' ? 'Varianz erklärt' : 'variance explained'})
            </span>
          </div>
        </div>
      </div>

      {/* Scatterplot Canvas Container */}
      <div
        ref={containerRef}
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm overflow-hidden select-none"
      >
        {/* R² Badge Overlay in Top-Right of Scatterplot */}
        <div className="absolute top-6 right-6 z-10 pointer-events-none bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {getRegressionName(regressionType)} Fit
          </div>
          <div className="text-base font-mono font-extrabold text-rose-600 dark:text-rose-400">
            R² = {regression.r2.toFixed(3)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {regression.formula}
          </div>
          <div className="text-[10px] text-slate-400">
            {scatterPoints.length} {lang === 'de' ? 'Modelle' : 'models'}
          </div>
        </div>

        {/* SVG Scatterplot */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[640px] overflow-visible"
        >
          <defs>
            <linearGradient id="regressionGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="1" />
            </linearGradient>
            <filter id="dotGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Background Grid Lines (Horizontal / Y-Axis) */}
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
                  className="text-slate-200 dark:text-slate-800/80"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[11px] font-mono fill-slate-400 dark:fill-slate-500 font-semibold"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Background Grid Lines (Vertical / X-Axis) */}
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
                  className="text-slate-200 dark:text-slate-800/80"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={svgHeight - margin.bottom + 20}
                  textAnchor="middle"
                  className="text-[11px] font-mono fill-slate-400 dark:fill-slate-500"
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
            className="text-slate-300 dark:text-slate-700"
            strokeWidth="2"
          />
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={svgHeight - margin.bottom}
            stroke="currentColor"
            className="text-slate-300 dark:text-slate-700"
            strokeWidth="2"
          />

          {/* Axis Labels */}
          <text
            x={margin.left + innerWidth / 2}
            y={svgHeight - 15}
            textAnchor="middle"
            className="text-xs font-bold fill-slate-600 dark:fill-slate-400 uppercase tracking-wider"
          >
            {lang === 'de' ? 'Veröffentlichungsdatum (Spalte Y)' : 'Release Date (Column Y)'}
          </text>
          <text
            transform={`rotate(-90 ${margin.left - 42} ${margin.top + innerHeight / 2})`}
            x={margin.left - 42}
            y={margin.top + innerHeight / 2}
            textAnchor="middle"
            className="text-xs font-bold fill-slate-600 dark:fill-slate-400 uppercase tracking-wider"
          >
            {selectedCategoryIndex === 0
              ? lang === 'de'
                ? 'Final Score (Punkte)'
                : 'Final Score (Points)'
              : activeComponent
              ? activeComponent.nameEn
              : 'Score'}
          </text>

          {/* Fitted Regression Curve */}
          {regressionPath && (
            <path
              d={regressionPath}
              fill="none"
              stroke="url(#regressionGlow)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="drop-shadow-sm"
            />
          )}

          {/* Scatter Data Points */}
          {scatterPoints.map((pt) => {
            const cx = scaleX(pt.timestamp);
            const cy = scaleY(pt.score);
            const isHovered = hoveredPoint?.point.id === pt.id;

            return (
              <g
                key={pt.id}
                className="cursor-pointer"
                onMouseEnter={(e) => handleDotMouseEnter(e, pt)}
                onMouseLeave={handleDotMouseLeave}
                onClick={() => {
                  if (pt.chatUrl) {
                    window.open(pt.chatUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                {/* Invisible larger hit target for smooth and forgiving hover */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={15}
                  fill="transparent"
                />

                {/* Glow ring when hovered */}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={12}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    className="animate-pulse"
                    pointerEvents="none"
                  />
                )}

                {/* Main Scatter Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : 4.5}
                  fill={isHovered ? '#f43f5e' : '#3b82f6'}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 1.2}
                  filter="url(#dotGlow)"
                  className="transition-all duration-150 hover:opacity-95"
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Popup with grace period so user can move into it and click links */}
        {hoveredPoint && (
          <div
            style={{
              left: `${Math.min(window.innerWidth > 768 ? 750 : 280, Math.max(16, hoveredPoint.screenX - 120))}px`,
              top: `${Math.max(16, hoveredPoint.screenY - 140)}px`,
            }}
            className="absolute z-40 bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700/80 backdrop-blur-md pointer-events-auto min-w-[240px] max-w-[320px] transition-all animate-in fade-in zoom-in-95 duration-150"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5 leading-tight">
                  <span>{hoveredPoint.point.displayName}</span>
                  {hoveredPoint.point.flag && <span>{hoveredPoint.point.flag}</span>}
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

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  {selectedCategoryIndex === 0 ? 'Score' : 'Wert'}
                </span>
                <span className="font-mono text-base font-extrabold text-emerald-400">
                  {hoveredPoint.point.score.toFixed(1)}
                </span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Datum</span>
                </span>
                <span className="font-mono text-xs font-medium text-slate-200">
                  {hoveredPoint.point.releaseDate}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
