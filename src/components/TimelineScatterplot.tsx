import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ExternalLink, TrendingUp, Calendar, Building2, Plus, Minus, Sparkles } from 'lucide-react';
import { ModelRecord, RegressionType, ScoreMode, TimelineDataPoint } from '../types';
import { BENCHMARK_COMPONENTS, RETIRED_TIMELINE_BENCHMARKS } from '../data/benchmarks';
import { calculateRegression, extractFrontierPoints } from '../utils/mathRegression';
import { calculatePearson, calculateSpearman } from '../utils/correlationUtils';
import { Tooltip } from './Tooltip';
import { TRANSLATIONS } from '../utils/i18n';

interface TimelineScatterplotProps {
  models: ModelRecord[];
  allModels: ModelRecord[];
  scoreMode: ScoreMode;
  onScoreModeChange: (mode: ScoreMode) => void;
  selectedCategoryIndex: number; // 0 = All (Final Score), 1..8 = individual components
  onCategoryIndexChange: (index: number) => void;
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
  hideHeaderControls?: boolean;
}

export interface RegressionOption {
  id: RegressionType;
  labelDe: string;
  labelEn: string;
  shortDe: string;
  shortEn: string;
  descDe: string;
  descEn: string;
  color: string;
}

export const TIMELINE_REGRESSION_OPTIONS: RegressionOption[] = [
  {
    id: 'linear',
    labelDe: 'Linear (Trendlinie)',
    labelEn: 'Linear (Trendline)',
    shortDe: 'Linear',
    shortEn: 'Linear',
    descDe: 'Geradliniger Trend über Zeit',
    descEn: 'Straight-line trend over time',
    color: '#6366f1', // Indigo
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
    id: 'polynomial',
    labelDe: 'Polynom (Grad 2-4)',
    labelEn: 'Polynomial (deg 2-4)',
    shortDe: 'Polynom',
    shortEn: 'Polynom.',
    descDe: 'Parabolischer Kurventrend (Grad 2, 3 oder 4 wählbar)',
    descEn: 'Quadratic or higher curve (deg 2, 3 or 4)',
    color: '#f43f5e', // Rose
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
    id: 'frontier',
    labelDe: 'Pioniere (Rekorde)',
    labelEn: 'Pioneers (Records)',
    shortDe: 'Pioniere',
    shortEn: 'Pioneers',
    descDe: 'Verlauf der historischen Höchststände (Pioniere / Rekordhalter)',
    descEn: 'Cumulative maximum pioneer breakthroughs over time',
    color: '#d97706', // Gold / Bronze
  },
];

const REGRESSION_OPTIONS = TIMELINE_REGRESSION_OPTIONS;

export const DEFAULT_TIMELINE_REGRESSION_INDEX = Math.max(
  0,
  TIMELINE_REGRESSION_OPTIONS.findIndex((o) => o.id === 'loess')
);

export const TimelineScatterplot: React.FC<TimelineScatterplotProps> = ({
  allModels,
  scoreMode,
  onScoreModeChange,
  selectedCategoryIndex,
  onCategoryIndexChange,
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
  hideHeaderControls = false,
}) => {
  // Regression Model state with controlled/internal fallbacks
  const [internalRegressionIndex, setInternalRegressionIndex] = useState<number>(DEFAULT_TIMELINE_REGRESSION_INDEX);
  const [internalPolyDegree, setInternalPolyDegree] = useState<number>(2); // Default: degree 2
  const [internalLoessSpan, setInternalLoessSpan] = useState<number>(50); // Default: 50% smoothing span
  const [internalTimelineScope, setInternalTimelineScope] = useState<'all' | 'frontier'>('all');

  const regressionIndex = propRegressionIndex !== undefined ? propRegressionIndex : internalRegressionIndex;
  const setRegressionIndex = onRegressionIndexChange || setInternalRegressionIndex;

  const polyDegree = propPolyDegree !== undefined ? propPolyDegree : internalPolyDegree;
  const setPolyDegree = onPolyDegreeChange || setInternalPolyDegree;

  const loessSpan = propLoessSpan !== undefined ? propLoessSpan : internalLoessSpan;
  const setLoessSpan = onLoessSpanChange || setInternalLoessSpan;

  const timelineScope = propTimelineScope !== undefined ? propTimelineScope : internalTimelineScope;
  const setTimelineScope = onTimelineScopeChange || setInternalTimelineScope;

  const activeRegression = REGRESSION_OPTIONS[regressionIndex] || REGRESSION_OPTIONS[0];

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
    // Keep dot & tooltip visible for 1800ms so user can comfortably move their mouse to the link
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
    }, 1800);
  };

  const handleTooltipMouseEnter = () => {
    clearCloseTimeout(); // Keep tooltip open while cursor is inside tooltip
  };

  const handleTooltipMouseLeave = () => {
    clearCloseTimeout();
    // Keep tooltip visible for 1000ms upon leaving tooltip
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

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
          score = m.scoreNewReported;
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

  // SVG dimensions & scales
  const svgWidth = 1000;
  const svgHeight = 520;
  const margin = { top: 40, right: 40, bottom: 70, left: 70 };
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
  const regressionParam =
    activeRegression.id === 'polynomial'
      ? polyDegree
      : activeRegression.id === 'loess'
      ? loessSpan
      : undefined;

  const regression = useMemo(() => {
    return calculateRegression(regressionDataPoints, activeRegression.id, 120, regressionParam);
  }, [regressionDataPoints, activeRegression.id, regressionParam]);

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

  const activeCategoryName = activeComponent
    ? lang === 'en'
      ? activeComponent.nameEn
      : activeComponent.nameDe
    : null;

  // Bilingual Y-Axis label matching the score slider labels without superfluous points suffix
  const yAxisLabel = useMemo(() => {
    if (selectedCategoryIndex === 0) {
      if (scoreMode === 'old') return t.scoreModeOld;
      if (scoreMode === 'worstCase') return t.scoreModeWorstCase;
      return t.scoreModeNew;
    }
    if (activeCategoryName) {
      return activeCategoryName;
    }
    return t.score;
  }, [selectedCategoryIndex, scoreMode, t, activeCategoryName]);

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
    const retiredTargets = ['note-col-d', 'note-col-e', 'note-col-f', 'note-col-j'];
    return {
      targetId: retiredTargets[catIdx - 9] || 'csv-notes-section',
    };
  }, [unifiedSliderValue]);

  // Unified tooltip data for the score slider
  const activeScoreTooltip = useMemo(() => {
    if (unifiedSliderValue === 0) {
      return {
        title: t.scoreModeNew,
        badge: lang === 'de' ? '8 Benchmarks' : '8 Benchmarks',
        desc:
          lang === 'de'
            ? 'Umfassender Gesamt-Score aus allen 8 gleichgewichteten Benchmark-Kriterien (jeweils 12,5 %). Aktueller Standard für moderne Chatbots.'
            : 'Comprehensive final score composed of all 8 equally weighted benchmark criteria (12.5% each). Modern standard for current chatbots.',
        detail: lang === 'de' ? 'Final Score (Spalte M)' : 'Final Score (Col M)',
      };
    }
    if (unifiedSliderValue === 1) {
      return {
        title: t.scoreModeOld,
        badge: lang === 'de' ? '5 Benchmarks' : '5 Benchmarks',
        desc:
          lang === 'de'
            ? 'Historischer Gesamt-Score basierend auf den ursprünglichen 5 Benchmarks. Ermöglicht den Vergleich über einen längeren Zeitraum mit bis zu 224 Modellen.'
            : 'Historical final score based on the original 5 benchmarks. Enables long-term tracking across up to 224 models.',
        detail: lang === 'de' ? 'Final Score (Spalte L)' : 'Final Score (Col L)',
      };
    }
    if (unifiedSliderValue === 2) {
      return {
        title: t.scoreModeWorstCase,
        badge: lang === 'de' ? 'Straf-Score' : 'Penalty Score',
        desc:
          lang === 'de'
            ? 'Worst-Case-Score: Der 7-Benchmark-Durchschnitt wird mit der Nicht-Halluzinations-Rate multipliziert. Bestraft unzuverlässige und fabulierende Modelle drastisch.'
            : 'Worst-case penalty score: 7-benchmark average multiplied by non-hallucination rate. Heavily penalizes fabricating models.',
        detail: lang === 'de' ? 'Worst-Case IQ (Spalte N)' : 'Worst-Case IQ (Col N)',
      };
    }
    if (activeComponent) {
      const isRetired = unifiedSliderValue > 10;
      const numPrefix = !isRetired ? `#${unifiedSliderValue - 2} ` : '';
      const name = activeCategoryName || (lang === 'de' ? activeComponent.nameDe : activeComponent.nameEn);
      return {
        title: `${numPrefix}${name}`,
        badge: activeComponent.sourceName || (isRetired ? (lang === 'de' ? 'Archiv' : 'Retired') : 'Benchmark'),
        desc: lang === 'de' ? activeComponent.descriptionDe : activeComponent.descriptionEn,
        detail:
          activeComponent.weightPct > 0
            ? lang === 'de'
              ? `Gewichtung: ${activeComponent.weightPct}% (${activeComponent.formulaDesc})`
              : `Weight: ${activeComponent.weightPct}% (${activeComponent.formulaDesc})`
            : lang === 'de'
              ? `Aussortierter Benchmark (${activeComponent.formulaDesc})`
              : `Retired benchmark (${activeComponent.formulaDesc})`,
      };
    }
    return null;
  }, [unifiedSliderValue, activeComponent, activeCategoryName, lang, t]);

  return (
    <div className="w-full space-y-3.5">
      {/* Controls Container (rendered only if not elevated to header) */}
      {!hideHeaderControls && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col gap-2.5">
        {/* Row 1: Score Slider + Regression Model Slider + Contextual Param Input */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Merged Score Slider (Identical styling to bar chart tab) */}
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

            {/* Feste Box für das Badge: New Score / Old Score / Worst Case oder Kategorie 1..8/9..12 (klickbar als Sprungmarke) */}
            {activeScoreTooltip && (
              <Tooltip
                title={activeScoreTooltip.title}
                badge={activeScoreTooltip.badge}
                position="bottom"
                align="center"
                width="w-72"
                content={
                  <div className="space-y-1.5">
                    <p className="leading-snug">{activeScoreTooltip.desc}</p>
                    <div className="pt-1.5 border-t border-slate-700/60 font-mono text-[11px] text-amber-300">
                      {activeScoreTooltip.detail}
                    </div>
                    <div className="pt-1 border-t border-slate-700/60 text-[11px] text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>
                        {lang === 'de'
                          ? 'Klicken, um zur Erklärung zu springen'
                          : 'Click to jump to explanation'}
                      </span>
                    </div>
                  </div>
                }
              >
              <div className="w-[140px] sm:w-[170px] shrink-0 overflow-hidden flex items-center">
                {unifiedSliderValue === 0 && (
                  <button
                    type="button"
                    onClick={() => handleScroll('note-col-m')}
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-emerald-500 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                    <span className="truncate">{t.scoreModeNew}</span>
                  </button>
                )}
                {unifiedSliderValue === 1 && (
                  <button
                    type="button"
                    onClick={() => handleScroll('note-col-l')}
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-amber-500 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                    <span className="truncate">{t.scoreModeOld}</span>
                  </button>
                )}
                {unifiedSliderValue === 2 && (
                  <button
                    type="button"
                    onClick={() => handleScroll('note-col-n')}
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-rose-500 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                    <span className="truncate">{t.scoreModeWorstCase}</span>
                  </button>
                )}
                {unifiedSliderValue >= 3 && activeComponent && (
                  <button
                    type="button"
                    onClick={() => handleScroll(scoreScrollTargets.targetId)}
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
            </Tooltip>
          )}
          </div>

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
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                    isLinearModel
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-500 uppercase">r:</span>
                  <span className="font-mono text-xs font-extrabold" style={{ color: pearsonResult.color }}>
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
                    ? 'Spearmans Rho misst den monotonen Rangzusammenhang über die Zeit, unempfindlicher gegenüber Ausreißern.'
                    : 'Spearman rank correlation measures monotonic rank relationship over time, more robust against outliers.'
                }
              >
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                    !isLinearModel
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-500 uppercase">Rho:</span>
                  <span className="font-mono text-xs font-extrabold" style={{ color: spearmanResult.color }}>
                    {spearmanResult.value >= 0 ? '+' : ''}
                    {spearmanResult.value.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 hidden xl:inline">
                    ({lang === 'de' ? spearmanResult.strengthDe : spearmanResult.strengthEn})
                  </span>
                </div>
              </Tooltip>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 shrink-0 sm:ml-auto">
              {/* Regression Model Slider */}
              <div className="relative z-30 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0">
                <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                  <span>{lang === 'de' ? 'Modell:' : 'Model:'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setRegressionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={regressionIndex <= 0}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={REGRESSION_OPTIONS.length - 1}
                  step={1}
                  value={regressionIndex}
                  onChange={(e) => setRegressionIndex(Number(e.target.value))}
                  className="w-16 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => setRegressionIndex((prev) => Math.min(REGRESSION_OPTIONS.length - 1, prev + 1))}
                  disabled={regressionIndex >= REGRESSION_OPTIONS.length - 1}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3" />
                </button>

                {/* Regression Badge */}
                <div className="w-[105px] sm:w-[125px] shrink-0 flex items-center">
                  <Tooltip
                    title={lang === 'de' ? activeRegression.labelDe : activeRegression.labelEn}
                    badge={lang === 'de' ? 'Modell' : 'Model'}
                    position="bottom"
                    align="center"
                    width="w-72"
                    className="w-full"
                    content={
                      <div className="space-y-1.5">
                        <p className="leading-snug">{lang === 'de' ? activeRegression.descDe : activeRegression.descEn}</p>
                        {regression.formula && (
                          <div className="pt-1.5 border-t border-slate-700/60 font-mono text-xs font-semibold text-amber-300">
                            {regression.formula}
                          </div>
                        )}
                        {activeRegression.id === 'polynomial' && (
                          <div className="pt-1.5 border-t border-slate-700/60 font-mono text-xs font-semibold text-amber-300">
                            {lang === 'de' ? `Polynom-Regression (Grad ${polyDegree})` : `Polynomial Regression (Degree ${polyDegree})`}
                          </div>
                        )}
                        {activeRegression.id === 'loess' && (
                          <div className="pt-1.5 border-t border-slate-700/60 font-mono text-xs font-semibold text-amber-300">
                            {lang === 'de' ? `LOESS-Glättung (Span ${loessSpan}%)` : `LOESS Smoothing (Span ${loessSpan}%)`}
                          </div>
                        )}
                        {activeRegression.id !== 'frontier' && (
                          <div className="pt-1.5 border-t border-slate-700/60 text-[11px] text-slate-300 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span>
                              {lang === 'de' ? 'Inkl. 95%-Konfidenzband (Modellunsicherheit)' : 'Includes 95% confidence band (uncertainty ribbon)'}
                            </span>
                          </div>
                        )}
                      </div>
                    }
                  >
                    <span
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:opacity-95 transition-opacity"
                      style={{ backgroundColor: activeRegression.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      <span className="truncate">
                        {lang === 'de' ? activeRegression.shortDe : activeRegression.shortEn}
                      </span>
                    </span>
                  </Tooltip>
                </div>
              </div>

              {/* Contextual Parameter Input (Fixed width, Active for Polynomial & LOESS, otherwise grayed-out) */}
              <Tooltip
                content={
                  activeRegression.id === 'polynomial'
                    ? lang === 'de'
                      ? 'Polynom-Grad (2, 3 oder 4)'
                      : 'Polynomial degree (2, 3 or 4)'
                    : activeRegression.id === 'loess'
                    ? lang === 'de'
                      ? 'Bandbreite / Glättungs-Span (15–80%)'
                      : 'Bandwidth smoothing span (15–80%)'
                    : lang === 'de'
                    ? 'Kein variabler Parameter für dieses Modell'
                    : 'No variable parameter for this model'
                }
                align="right"
                width="w-56"
              >
                <div
                  className={`w-[142px] flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0 ${
                    activeRegression.id !== 'polynomial' && activeRegression.id !== 'loess'
                      ? 'opacity-40 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    Param:
                  </span>
                  <div className="w-[76px] shrink-0 flex items-center justify-end">
                    {activeRegression.id === 'polynomial' ? (
                      <select
                        value={polyDegree}
                        onChange={(e) => setPolyDegree(Number(e.target.value))}
                        className="w-[76px] h-6 px-1.5 font-mono text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-hidden focus:border-rose-500 text-center"
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
                          className="w-[44px] font-mono text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none text-center p-0"
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
                  onClick={() => setTimelineScope('all')}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    timelineScope === 'all'
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'de' ? 'Alle Modelle' : 'All Models'} ({scatterPoints.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineScope('frontier')}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    timelineScope === 'frontier'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
                  }`}
                  title={
                    lang === 'de'
                      ? 'Nur Modelle, die zum Release-Zeitpunkt einen neuen Rekord-Highscore erzielten (Pioniere)'
                      : 'Only models setting a new record score at release date (pioneers)'
                  }
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
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
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                    isLinearModel
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-500 uppercase">r:</span>
                  <span className="font-mono text-xs font-extrabold" style={{ color: pearsonResult.color }}>
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
                    ? 'Spearmans Rho misst den monotonen Rangzusammenhang über die Zeit, unempfindlicher gegenüber Ausreißern.'
                    : 'Spearman rank correlation measures monotonic rank relationship over time, more robust against outliers.'
                }
              >
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                    !isLinearModel
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-500 uppercase">Rho:</span>
                  <span className="font-mono text-xs font-extrabold" style={{ color: spearmanResult.color }}>
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
        )}
      </div>
      )}

      {/* Scatterplot Canvas Container */}
      <div
        ref={containerRef}
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden select-none flex flex-col"
      >
        {/* Diagram Header Bar: Category / Criterion info on the left, Pearson r & Spearman Rho on the right (matching Correlations Tab) */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
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
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
              ({scatterPoints.length} {lang === 'de' ? 'Modelle' : 'models'})
            </span>
            {timelineScope === 'frontier' && (
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-white shadow-2xs">
                <Sparkles className="w-3 h-3 text-amber-200" />
                <span>{lang === 'de' ? 'Pioniere' : 'Pioneers'}</span>
              </span>
            )}
          </div>

          {/* Side-by-Side Pearson r & Spearmans Rho Badges (Matching Correlations Tab) */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
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
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                  isLinearModel
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="text-xs font-bold text-slate-500 uppercase">r:</span>
                <span className="font-mono text-xs font-extrabold" style={{ color: pearsonResult.color }}>
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
                  ? 'Spearmans Rho misst den monotonen Rangzusammenhang über die Zeit, unempfindlicher gegenüber Ausreißern.'
                  : 'Spearman rank correlation measures monotonic rank relationship over time, more robust against outliers.'
              }
            >
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
                  !isLinearModel
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="text-xs font-bold text-slate-500 uppercase">Rho:</span>
                <span className="font-mono text-xs font-extrabold" style={{ color: spearmanResult.color }}>
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

        {/* SVG Scatterplot Container */}
        <div className="p-4 overflow-hidden relative">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-[640px] overflow-visible"
          >
          <defs>
            <linearGradient id="regressionGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={activeRegression.color} stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="confidenceBandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={activeRegression.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.22" />
            </linearGradient>
            <filter id="dotGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.15" />
            </filter>
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
                  className="text-slate-200 dark:text-slate-800/80"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={margin.left - 12}
                  y={y + 5}
                  textAnchor="end"
                  fontSize="14"
                  className="font-mono font-medium fill-slate-400 dark:fill-slate-500"
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
                  className="text-slate-200 dark:text-slate-800/80"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={svgHeight - margin.bottom + 22}
                  textAnchor="middle"
                  fontSize="14"
                  className="font-mono font-medium fill-slate-400 dark:fill-slate-500"
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
            y={svgHeight - 16}
            textAnchor="middle"
            fontSize="14"
            className="font-bold fill-slate-600 dark:fill-slate-400 uppercase tracking-wider"
          >
            {lang === 'de' ? 'Veröffentlichungsdatum' : 'Release Date'}
          </text>
          <text
            transform={`rotate(-90 ${margin.left - 46} ${margin.top + innerHeight / 2})`}
            x={margin.left - 46}
            y={margin.top + innerHeight / 2}
            textAnchor="middle"
            fontSize="14"
            className="font-bold fill-slate-600 dark:fill-slate-400 tracking-wider"
          >
            {yAxisLabel}
          </text>

          {/* 95% Confidence Band (Model uncertainty ribbon) */}
          {confidenceBandPath && activeRegression.id !== 'frontier' && (
            <path
              d={confidenceBandPath}
              fill="url(#confidenceBandGrad)"
              stroke={activeRegression.color}
              strokeWidth="0.8"
              strokeDasharray="3 3"
              strokeOpacity="0.4"
              className="pointer-events-none transition-all duration-300"
            />
          )}

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
            const isFrontier = frontierPointIds.has(pt.id);
            const isDimmed = timelineScope === 'frontier' && !isFrontier;

            return (
              <g
                key={pt.id}
                className="cursor-pointer"
                style={{ opacity: isDimmed ? 0.22 : 1, transition: 'opacity 0.2s' }}
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

                {/* Outer Golden Accent Ring for SOTA Frontier Breakthrough Models */}
                {isFrontier && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 11 : 7.5}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={isHovered ? 2 : 1.5}
                    strokeDasharray={timelineScope === 'frontier' ? undefined : '2,2'}
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

                {/* Main Scatter Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : isFrontier ? 5 : 4.5}
                  fill={isHovered ? '#f43f5e' : isFrontier ? '#d97706' : '#3b82f6'}
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
            className="absolute z-40 bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700/80 backdrop-blur-md pointer-events-auto min-w-[240px] max-w-[320px] transition-all animate-in fade-in zoom-in-95 duration-150 before:content-[''] before:absolute before:-bottom-6 before:left-0 before:right-0 before:h-8"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5 leading-tight flex-wrap">
                  <span>{hoveredPoint.point.displayName}</span>
                  {hoveredPoint.point.flag && <span>{hoveredPoint.point.flag}</span>}
                  {frontierPointIds.has(hoveredPoint.point.id) && (
                    <span className="text-xs font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      <span>{lang === 'de' ? 'Pionier' : 'Pioneer'}</span>
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
                  {hoveredPoint.point.score.toFixed(1)}
                </span>
              </div>
              <div className="bg-slate-800/80 p-1.5 rounded">
                <span className="text-slate-400 block text-xs uppercase font-bold flex items-center gap-1">
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
    </div>
  );
};
