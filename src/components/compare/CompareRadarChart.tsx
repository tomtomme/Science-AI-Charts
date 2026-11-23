import React, { useState, useMemo } from 'react';
import { ExternalLink, Info, BookOpen, X, Eye, EyeOff } from 'lucide-react';
import { ModelRecord } from '../../types';
import { Language } from '../../utils/i18n';
import {
  BENCHMARK_ANCHOR_MAP,
  CompareSlot,
  SLOT_THEME,
  CategoryComparisonRow,
  formatNumber,
} from '../../utils/compareHelpers';

function wrapRadarLabel(label: string, maxChars = 16): string[] {
  const clean = label.trim();
  if (clean.length <= maxChars) return [clean];

  const words = clean.split(/\s+/);
  if (words.length === 1) return [clean];

  let bestSplit = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(' ');
    const line2 = words.slice(i).join(' ');
    const maxLen = Math.max(line1.length, line2.length);
    const diff = Math.abs(line1.length - line2.length) + (maxLen > maxChars ? 15 : 0);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i;
    }
  }

  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
}

export interface CompareRadarChartProps {
  categoryComparisons: CategoryComparisonRow[];
  activeSlots: { slot: CompareSlot; model: ModelRecord }[];
  primaryScores: { slot: CompareSlot; model: ModelRecord; score: number | null }[];
  rankMap: Map<string, number>;
  lang: Language;
  expandedCategoryId: string | null;
  onToggleExpandCategory: (categoryId: string) => void;
  onScrollToParagraph?: (targetId: string) => void;
  sourceLinkLabel: string;
}

export const CompareRadarChart: React.FC<CompareRadarChartProps> = ({
  categoryComparisons,
  activeSlots,
  primaryScores,
  rankMap,
  lang,
  expandedCategoryId,
  onToggleExpandCategory,
  onScrollToParagraph,
  sourceLinkLabel,
}) => {
  const [hoveredSlot, setHoveredSlot] = useState<CompareSlot | null>(null);
  const [pinnedSlot, setPinnedSlot] = useState<CompareSlot | null>(null);
  const [hiddenSlots, setHiddenSlots] = useState<Set<CompareSlot>>(() => new Set());
  const [hoveredAxisIdx, setHoveredAxisIdx] = useState<number | null>(null);
  const [selectedAxisIdx, setSelectedAxisIdx] = useState<number>(0);
  const [scaleMode, setScaleMode] = useState<'full' | 'zoom'>('full');

  const activeSlotSet = useMemo(
    () => new Set(activeSlots.map((s) => s.slot)),
    [activeSlots]
  );

  const visibleSlots = useMemo(
    () => activeSlots.filter((s) => !hiddenSlots.has(s.slot)),
    [activeSlots, hiddenSlots]
  );

  const effectivePinnedSlot =
    pinnedSlot && activeSlotSet.has(pinnedSlot) && !hiddenSlots.has(pinnedSlot)
      ? pinnedSlot
      : null;
  const effectiveHoveredSlot =
    hoveredSlot && activeSlotSet.has(hoveredSlot) && !hiddenSlots.has(hoveredSlot)
      ? hoveredSlot
      : null;
  const focusedSlot = effectiveHoveredSlot ?? effectivePinnedSlot;

  const safeSelectedAxisIdx =
    selectedAxisIdx < categoryComparisons.length ? selectedAxisIdx : 0;
  const safeHoveredAxisIdx =
    hoveredAxisIdx !== null && hoveredAxisIdx < categoryComparisons.length
      ? hoveredAxisIdx
      : null;
  const inspectedAxisIdx = safeHoveredAxisIdx ?? safeSelectedAxisIdx;
  const inspectedRow = categoryComparisons[inspectedAxisIdx] ?? categoryComparisons[0];

  // Compute zoom floor if user enables zoomed scale
  const minFloor = useMemo(() => {
    if (scaleMode === 'full') return 0;
    const vals: number[] = [];
    for (const row of categoryComparisons) {
      for (const entry of row.entries) {
        if (!hiddenSlots.has(entry.slot) && entry.val !== null) {
          vals.push(entry.val);
        }
      }
    }
    if (vals.length === 0) return 0;
    const minVal = Math.min(...vals);
    const floor = Math.max(0, Math.min(70, Math.floor((minVal - 8) / 10) * 10));
    return floor >= 20 ? floor : 0;
  }, [categoryComparisons, hiddenSlots, scaleMode]);

  const canZoom = useMemo(() => {
    const vals: number[] = [];
    for (const row of categoryComparisons) {
      for (const entry of row.entries) {
        if (!hiddenSlots.has(entry.slot) && entry.val !== null) {
          vals.push(entry.val);
        }
      }
    }
    if (vals.length === 0) return false;
    return Math.floor((Math.min(...vals) - 8) / 10) * 10 >= 20;
  }, [categoryComparisons, hiddenSlots]);

  const ratioForVal = (val: number) => {
    const span = 100 - minFloor;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(1, (val - minFloor) / span));
  };

  const cx = 370;
  const cy = 250;
  const R = 178;
  const axisCount = categoryComparisons.length || 8;
  const ringValues = useMemo(() => {
    const steps = 5;
    const arr: number[] = [];
    for (let i = 1; i <= steps; i++) {
      arr.push(Math.round(minFloor + ((100 - minFloor) * i) / steps));
    }
    return arr;
  }, [minFloor]);

  const getAxisAngle = (idx: number) => -Math.PI / 2 + (idx * 2 * Math.PI) / axisCount;

  const getPoint = (idx: number, radius: number) => {
    const angle = getAxisAngle(idx);
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Order visible slots so focused slot renders last (on top)
  const orderedSlotsForRender = useMemo(() => {
    if (!focusedSlot) return visibleSlots;
    return [
      ...visibleSlots.filter((s) => s.slot !== focusedSlot),
      ...visibleSlots.filter((s) => s.slot === focusedSlot),
    ];
  }, [visibleSlots, focusedSlot]);

  const defaultFillOpacity =
    visibleSlots.length <= 2
      ? 0.16
      : visibleSlots.length <= 4
      ? 0.11
      : visibleSlots.length <= 6
      ? 0.08
      : 0.06;

  const toggleSlotVisibility = (slot: CompareSlot) => {
    setHiddenSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) {
        next.delete(slot);
      } else {
        // Keep at least 1 model visible
        const remainingVisible = activeSlots.filter((s) => s.slot !== slot && !next.has(s.slot));
        if (remainingVisible.length === 0) return prev;
        next.add(slot);
      }
      return next;
    });
  };

  const expandedRow = expandedCategoryId
    ? categoryComparisons.find((r) => r.comp.id === expandedCategoryId) ?? null
    : null;

  return (
    <div className="p-2 sm:p-3 space-y-2.5">
      {/* Toolbar: Scale toggle + hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span>
            {lang === 'de'
              ? 'Modell anklicken zum Hervorheben · Achse überfahren oder klicken für Details'
              : 'Click a model to highlight · Hover or click an axis for details'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canZoom && (
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/90 p-0.5 text-xs font-mono font-bold">
              <button
                type="button"
                aria-pressed={scaleMode === 'full'}
                onClick={() => setScaleMode('full')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  scaleMode === 'full'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                0–100%
              </button>
              <button
                type="button"
                aria-pressed={scaleMode === 'zoom'}
                onClick={() => setScaleMode('zoom')}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  scaleMode === 'zoom'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
                title={
                  lang === 'de'
                    ? 'Skala näher an den niedrigsten Wert heranzoomen'
                    : 'Zoom scale closer to the lowest score'
                }
              >
                Zoom
              </button>
            </div>
          )}
          {hiddenSlots.size > 0 && (
            <button
              type="button"
              onClick={() => setHiddenSlots(new Set())}
              className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {lang === 'de' ? 'Alle einblenden' : 'Show all'}
            </button>
          )}
        </div>
      </div>

      {/* Main Responsive Grid: Radar SVG + Interactive Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(290px,1fr)] gap-3 items-start">
        {/* Left: SVG Spider / Radar Chart */}
        <div className="relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-1 sm:p-1.5">
          <svg
            viewBox="0 0 740 504"
            className="w-full h-auto max-h-[560px] select-none overflow-visible"
            role="img"
            aria-label={
              lang === 'de'
                ? `Spinnennetzdiagramm über alle ${axisCount} Benchmarks`
                : `Radar chart across all ${axisCount} benchmarks`
            }
          >
            {/* Concentric Octagonal Grid Rings */}
            {ringValues.map((tickVal, rIdx) => {
              const ringR = ratioForVal(tickVal) * R;
              const ringPts = Array.from({ length: axisCount }, (_, i) => {
                const p = getPoint(i, ringR);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              }).join(' ');
              const isOuter = rIdx === ringValues.length - 1;
              return (
                <g key={tickVal}>
                  <polygon
                    points={ringPts}
                    fill={rIdx % 2 === 0 ? 'rgba(148, 163, 184, 0.04)' : 'none'}
                    className={
                      isOuter
                        ? 'stroke-slate-400 dark:stroke-slate-600'
                        : 'stroke-slate-300 dark:stroke-slate-800'
                    }
                    strokeWidth={isOuter ? 1.25 : 1}
                  />
                  {/* Scale tick label slightly right of top spoke */}
                  <text
                    x={cx + 6}
                    y={cy - ringR + (isOuter ? 12 : 4)}
                    fontSize="13"
                    fontFamily="var(--font-mono)"
                    className="fill-slate-700 dark:fill-slate-300 font-mono font-semibold"
                  >
                    {tickVal}%
                  </text>
                </g>
              );
            })}

            {/* Min-floor origin label if zoomed */}
            {minFloor > 0 && (
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize="13"
                fontFamily="var(--font-mono)"
                className="fill-slate-700 dark:fill-slate-300 font-mono font-semibold"
              >
                {minFloor}%
              </text>
            )}

            {/* Radial Axis Spokes + Hover Highlight */}
            {categoryComparisons.map((row, idx) => {
              const end = getPoint(idx, R);
              const isAxisActive = inspectedAxisIdx === idx;
              return (
                <line
                  key={row.comp.id}
                  x1={cx}
                  y1={cy}
                  x2={end.x}
                  y2={end.y}
                  className={
                    isAxisActive
                      ? 'stroke-slate-600 dark:stroke-slate-400'
                      : 'stroke-slate-300 dark:stroke-slate-800'
                  }
                  strokeWidth={isAxisActive ? 1.8 : 1}
                />
              );
            })}

            {/* Model Polygons (2 to 8 models, gaps dashed cleanly for null values) */}
            {orderedSlotsForRender.map(({ slot }) => {
              const theme = SLOT_THEME[slot];
              const isFocused = focusedSlot === slot;
              const isDimmed = focusedSlot !== null && !isFocused;

              const axisPts = categoryComparisons.map((row, idx) => {
                const entry = row.entries.find((e) => e.slot === slot);
                const val = entry?.val ?? null;
                if (val === null) return { idx, val: null as number | null, x: 0, y: 0 };
                const pt = getPoint(idx, ratioForVal(val) * R);
                return { idx, val, x: pt.x, y: pt.y };
              });

              const validPts = axisPts.filter((p) => p.val !== null);
              if (validPts.length === 0) return null;

              const polygonPoints = validPts
                .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(' ');

              const strokeWidth = isFocused ? 2.8 : isDimmed ? 1.3 : 2.0;
              const strokeOpacity = isFocused ? 1 : isDimmed ? 0.22 : 0.9;
              const fillOpacity = isFocused ? 0.22 : isDimmed ? 0.025 : defaultFillOpacity;

              // Build individual segments so missing axes show as dashed bridges
              const segments: {
                x1: number;
                y1: number;
                x2: number;
                y2: number;
                isGap: boolean;
                key: string;
              }[] = [];

              if (validPts.length >= 2) {
                const segLimit = validPts.length === 2 ? 1 : validPts.length;
                for (let k = 0; k < segLimit; k++) {
                  const a = validPts[k];
                  const b = validPts[(k + 1) % validPts.length];
                  const step = (b.idx - a.idx + axisCount) % axisCount;
                  segments.push({
                    x1: a.x,
                    y1: a.y,
                    x2: b.x,
                    y2: b.y,
                    isGap: step !== 1 && !(validPts.length === 2 && (a.idx - b.idx + axisCount) % axisCount === 1),
                    key: `${slot}-${a.idx}-${b.idx}`,
                  });
                }
              }

              return (
                <g
                  key={slot}
                  className="transition-opacity duration-150"
                  style={{ pointerEvents: 'none' }}
                >
                  {validPts.length >= 3 && (
                    <polygon
                      points={polygonPoints}
                      fill={theme.hex}
                      fillOpacity={fillOpacity}
                      stroke="none"
                    />
                  )}
                  {segments.map((seg) => (
                    <line
                      key={seg.key}
                      x1={seg.x1}
                      y1={seg.y1}
                      x2={seg.x2}
                      y2={seg.y2}
                      stroke={theme.hex}
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      strokeDasharray={seg.isGap ? '4 4' : undefined}
                      strokeLinecap="round"
                    />
                  ))}
                  {validPts.map((pt) => {
                    const isAxisHovered = inspectedAxisIdx === pt.idx;
                    const dotR = isFocused
                      ? isAxisHovered
                        ? 5.4
                        : 4.2
                      : isAxisHovered
                      ? 4.6
                      : isDimmed
                      ? 2.2
                      : 3.4;
                    return (
                      <circle
                        key={`${slot}-pt-${pt.idx}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={dotR}
                        fill={theme.hex}
                        fillOpacity={isDimmed ? 0.3 : 1}
                        stroke="white"
                        strokeWidth={isDimmed ? 0.6 : 1.3}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* Interactive Axis Hit Targets + Labels */}
            {categoryComparisons.map((row, idx) => {
              const angle = getAxisAngle(idx);
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);
              const labelDist = R + 18;
              const lx = cx + labelDist * cos;
              const ly = cy + labelDist * sin;

              const isTop = Math.abs(cos) < 0.15 && sin < -0.5;
              const isBottom = Math.abs(cos) < 0.15 && sin > 0.5;
              const isRight = cos > 0.15;
              const textAnchor: 'middle' | 'start' | 'end' =
                isTop || isBottom ? 'middle' : isRight ? 'start' : 'end';

              const lines = wrapRadarLabel(row.label, 16);
              const isAxisActive = inspectedAxisIdx === idx;
              const isExpanded = expandedCategoryId === row.comp.id;

              let baseDy = 0;
              if (isTop) {
                baseDy = lines.length > 1 ? -34 : -16;
              } else if (isBottom) {
                baseDy = 15;
              } else if (sin < -0.25) {
                baseDy = lines.length > 1 ? -14 : -4;
              } else if (sin > 0.25) {
                baseDy = 10;
              } else {
                baseDy = lines.length > 1 ? -7 : 2;
              }

              const visibleEntries = row.entries.filter(
                (e) => !hiddenSlots.has(e.slot) && e.val !== null
              );
              let axisLeaderText = '';
              let axisLeaderColor = '#475569';
              if (visibleEntries.length >= 2) {
                const sorted = [...visibleEntries].sort(
                  (a, b) => (b.val as number) - (a.val as number)
                );
                const topV = sorted[0].val as number;
                const ties = sorted.filter((e) => topV - (e.val as number) < 0.05);
                if (ties.length === visibleEntries.length) {
                  axisLeaderText = lang === 'de' ? 'Patt' : 'Tie';
                } else {
                  axisLeaderText = `${ties.map((t) => t.slot).join('/')} ${formatNumber(topV, 1)}%`;
                  axisLeaderColor = SLOT_THEME[ties[0].slot].hex;
                }
              } else if (visibleEntries.length === 1) {
                axisLeaderText = `${visibleEntries[0].slot} ${formatNumber(visibleEntries[0].val, 1)}%`;
                axisLeaderColor = SLOT_THEME[visibleEntries[0].slot].hex;
              }

              const spokeMid = getPoint(idx, R * 0.55);

              return (
                <g
                  key={`axis-label-${row.comp.id}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAxisIdx(idx)}
                  onMouseLeave={() => setHoveredAxisIdx(null)}
                  onClick={() => {
                    setSelectedAxisIdx(idx);
                    onToggleExpandCategory(row.comp.id);
                  }}
                >
                  {/* Generous invisible hit circle along spoke for smooth hovering */}
                  <circle cx={spokeMid.x} cy={spokeMid.y} r={34} fill="transparent" />
                  <circle
                    cx={getPoint(idx, R).x}
                    cy={getPoint(idx, R).y}
                    r={22}
                    fill="transparent"
                  />

                  {/* Category color dot at outer vertex */}
                  <circle
                    cx={getPoint(idx, R).x}
                    cy={getPoint(idx, R).y}
                    r={isAxisActive ? 4.5 : 3}
                    fill={row.comp.color}
                    className="transition-all duration-150"
                  />

                  {/* Axis Title */}
                  <text
                    x={lx}
                    y={ly + baseDy}
                    textAnchor={textAnchor}
                    fontSize="15"
                    fontFamily="var(--font-sans)"
                    fontWeight={isAxisActive || isExpanded ? 700 : 600}
                    className={
                      isAxisActive || isExpanded
                        ? 'fill-blue-700 dark:fill-blue-400'
                        : 'fill-black dark:fill-slate-100'
                    }
                  >
                    {lines.map((line, lineIdx) => (
                      <tspan key={lineIdx} x={lx} dy={lineIdx === 0 ? 0 : 18}>
                        {line}
                      </tspan>
                    ))}
                  </text>

                  {/* Sub-label showing axis leader */}
                  {axisLeaderText && (
                    <text
                      x={lx}
                      y={ly + baseDy + lines.length * 18}
                      textAnchor={textAnchor}
                      fontSize="13"
                      fontFamily="var(--font-mono)"
                      fontWeight={700}
                      fill={axisLeaderColor}
                      className="font-mono"
                    >
                      {axisLeaderText}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right: Interactive Legend & Axis Inspector */}
        <div className="space-y-3 min-w-0">
          {/* Active Models Legend / Highlight & Visibility Controls */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
              <span>
                {lang === 'de'
                  ? `Modelle im Netz (${visibleSlots.length}/${activeSlots.length})`
                  : `Models on Radar (${visibleSlots.length}/${activeSlots.length})`}
              </span>
              {effectivePinnedSlot && (
                <button
                  type="button"
                  onClick={() => setPinnedSlot(null)}
                  className="text-xs normal-case font-sans font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {lang === 'de' ? 'Fokus lösen' : 'Clear focus'}
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {primaryScores.map(({ slot, model, score }) => {
                const theme = SLOT_THEME[slot];
                const isHidden = hiddenSlots.has(slot);
                const isPinned = effectivePinnedSlot === slot;
                const isFocused = focusedSlot === slot;
                const rank = rankMap.get(model.id);

                return (
                  <div
                    key={slot}
                    onMouseEnter={() => {
                      if (!isHidden) setHoveredSlot(slot);
                    }}
                    onMouseLeave={() => setHoveredSlot(null)}
                    className={`px-3 py-1.5 flex items-center justify-between gap-2 transition-colors ${
                      isFocused
                        ? theme.rowSelected
                        : isHidden
                        ? 'opacity-45 bg-slate-50/40 dark:bg-slate-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isHidden) {
                          toggleSlotVisibility(slot);
                          setPinnedSlot(slot);
                        } else {
                          setPinnedSlot((prev) => (prev === slot ? null : slot));
                        }
                      }}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer focus:outline-hidden"
                      title={
                        lang === 'de'
                          ? isPinned
                            ? 'Hervorhebung aufheben'
                            : 'Modell im Netz hervorheben'
                          : isPinned
                          ? 'Unpin highlight'
                          : 'Highlight model on radar'
                      }
                    >
                      <span
                        className={`w-5 h-5 rounded text-xs font-mono font-bold flex items-center justify-center shrink-0 ${theme.badgeBg}`}
                      >
                        {slot}
                      </span>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isFocused
                            ? theme.text
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {model.displayName}
                      </span>
                      {rank !== undefined && (
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 shrink-0">
                          #{rank}
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-mono tabular-nums text-xs font-bold ${theme.text}`}>
                        {score !== null ? formatNumber(score, 1) : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSlotVisibility(slot)}
                        className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        aria-label={
                          isHidden
                            ? lang === 'de'
                              ? `${model.displayName} einblenden`
                              : `Show ${model.displayName}`
                            : lang === 'de'
                            ? `${model.displayName} ausblenden`
                            : `Hide ${model.displayName}`
                        }
                        title={
                          isHidden
                            ? lang === 'de'
                              ? 'Im Diagramm einblenden'
                              : 'Show on radar'
                            : lang === 'de'
                            ? 'Im Diagramm ausblenden'
                            : 'Hide on radar'
                        }
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected / Hovered Axis Ranking Inspector */}
          {inspectedRow && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: inspectedRow.comp.color }}
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {inspectedRow.label}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 shrink-0">
                  {inspectedRow.sourceName}
                </span>
              </div>

              {/* Axis Quick Switcher Pills */}
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1">
                {categoryComparisons.map((r, idx) => {
                  const isCurr = idx === inspectedAxisIdx;
                  return (
                    <button
                      key={r.comp.id}
                      type="button"
                      onClick={() => setSelectedAxisIdx(idx)}
                      className={`px-1.5 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                        isCurr
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title={r.label}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => onToggleExpandCategory(inspectedRow.comp.id)}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Info className="w-3 h-3" />
                  <span>
                    {expandedCategoryId === inspectedRow.comp.id
                      ? lang === 'de'
                        ? 'Details zu'
                        : 'Hide info'
                      : lang === 'de'
                      ? 'Methodik'
                      : 'Details'}
                  </span>
                </button>
              </div>

              {/* Sorted Values on Inspected Axis */}
              <div className="p-2.5 space-y-1.5">
                {[...inspectedRow.entries]
                  .sort((a, b) => {
                    if (a.val === null && b.val === null) return 0;
                    if (a.val === null) return 1;
                    if (b.val === null) return -1;
                    return b.val - a.val;
                  })
                  .map((entry) => {
                    const theme = SLOT_THEME[entry.slot];
                    const isHidden = hiddenSlots.has(entry.slot);
                    const isWinner =
                      inspectedRow.winners.includes(entry.slot) &&
                      !inspectedRow.isTie &&
                      inspectedRow.winners.length > 0;
                    const widthPct =
                      entry.val !== null ? Math.max(0, Math.min(100, entry.val)) : 0;

                    return (
                      <div
                        key={entry.slot}
                        onMouseEnter={() => {
                          if (!isHidden) setHoveredSlot(entry.slot);
                        }}
                        onMouseLeave={() => setHoveredSlot(null)}
                        className={`flex items-center gap-2 text-xs ${
                          isHidden ? 'opacity-40' : ''
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded text-xs font-mono font-bold flex items-center justify-center shrink-0 ${theme.badgeBg}`}
                        >
                          {entry.slot}
                        </span>
                        <span className="w-28 sm:w-32 truncate font-medium text-slate-700 dark:text-slate-300">
                          {entry.model.displayName}
                        </span>
                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                          {entry.val !== null && (
                            <div
                              className={`h-full rounded-r-xs ${
                                isWinner || inspectedRow.isTie ? theme.barActive : theme.barDim
                              }`}
                              style={{ width: `${widthPct}%` }}
                            />
                          )}
                        </div>
                        <span
                          className={`w-14 text-right font-mono tabular-nums font-bold shrink-0 ${
                            entry.val === null
                              ? 'text-slate-400 dark:text-slate-500'
                              : isWinner
                              ? theme.text
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {entry.val !== null ? `${formatNumber(entry.val, 1)}%` : '—'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Methodology & Source Drawer for Clicked Axis */}
      {expandedRow && (
        <div className="px-4 py-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: expandedRow.comp.color }}
              />
              <span>{expandedRow.label}</span>
              <button
                type="button"
                onClick={() => onToggleExpandCategory(expandedRow.comp.id)}
                className="ml-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                aria-label={lang === 'de' ? 'Schließen' : 'Close'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="leading-relaxed">
              {(lang === 'de' ? expandedRow.comp.descriptionDe : expandedRow.comp.descriptionEn)
                .replace(/\s*Nur im Zeitreihendiagramm verfügbar\.?/i, '')
                .replace(/\s*Available exclusively in the timeline chart\.?/i, '')}
            </p>
            <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
              {lang === 'de' ? 'Berechnung:' : 'Formula:'}{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {expandedRow.comp.formulaDesc}
              </span>
              {expandedRow.isRescaled && (
                <span>
                  {' · '}
                  {expandedRow.comp.id === 'trickQuestionsOld'
                    ? lang === 'de'
                      ? 'Skaliert von 16,7% Rate-Basis auf 0–100%'
                      : 'Rescaled from 16.7% guessing floor to 0–100%'
                    : lang === 'de'
                    ? 'Skaliert von 29% Rate-Basis auf 0–100%'
                    : 'Rescaled from 29% guessing floor to 0–100%'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {expandedRow.sourceUrl && (
              <a
                href={expandedRow.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>{sourceLinkLabel}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {onScrollToParagraph && (
              <button
                type="button"
                onClick={() =>
                  onScrollToParagraph(BENCHMARK_ANCHOR_MAP[expandedRow.comp.id] || 'note-col-d')
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3 h-3" />
                <span>{lang === 'de' ? 'Methodik unten' : 'Notes below'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
