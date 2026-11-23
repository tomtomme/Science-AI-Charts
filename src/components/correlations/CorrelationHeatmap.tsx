import React, { useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { ModelRecord } from '../../types';
import { Tooltip } from '../Tooltip';
import {
  CORRELATION_DIMENSIONS,
  calculatePearson,
  calculateSpearman,
  formatCorrelationDecimal,
} from '../../utils/correlationUtils';
import {
  Row2LabelContext,
  getResolvedDimensionName,
  getResolvedDimensionShortLabel,
  HEATMAP_STEP_COUNT,
  HEATMAP_PALETTE_INDICES,
  getHeatmapColorFromUnit,
  getHeatmapCellColors,
  roundHeatmapTenths,
} from './correlationHelpers';

export interface CorrelationHeatmapProps {
  allModels: ModelRecord[];
  scope: 'all' | 'frontier';
  frontierPointIds: Set<string>;
  metric: 'pearson' | 'spearman';
  onToggleMetric: () => void;
  onSelectPairForOtherPlot?: (xIdx: number, yIdx: number) => void;
  lang: 'de' | 'en';
  row2Labels: Row2LabelContext;
  headerToggle?: React.ReactNode;
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  allModels,
  scope,
  frontierPointIds,
  metric,
  onToggleMetric,
  onSelectPairForOtherPlot,
  lang,
  row2Labels,
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

  const heatmapDims = useMemo(() => CORRELATION_DIMENSIONS.slice(3), []);

  const matrix = useMemo(() => {
    return heatmapDims.map((rowDim, rIdx) =>
      heatmapDims.map((colDim, cIdx) => {
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
  }, [scopedModels, heatmapDims]);

  const hoveredData = hoveredCell ? matrix[hoveredCell.rowIdx]?.[hoveredCell.colIdx] : null;
  const hoveredRowDim = hoveredCell ? heatmapDims[hoveredCell.rowIdx] : null;
  const hoveredColDim = hoveredCell ? heatmapDims[hoveredCell.colIdx] : null;

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
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 transition-all cursor-pointer text-xs font-mono shadow-2xs"
            >
              <ArrowLeftRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span className={metric === 'pearson' ? 'font-bold text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}>
                r
              </span>
              <span className="text-slate-500 dark:text-slate-500">⇄</span>
              <span className={metric === 'spearman' ? 'font-bold text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}>
                Rho
              </span>
            </button>
          </Tooltip>

          {headerToggle}
        </div>

        {/* Diverging Color Scale Legend (-0.2 Red -> +0.4 White -> +1.0 Blue) */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 hidden sm:inline">
            {metric === 'pearson' ? 'Pearson r' : 'Spearman Rho'}
          </span>
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-red-700 dark:text-red-400">-0.2</span>
            <div
              className="w-20 sm:w-24 h-2.5 rounded-xs border border-slate-300/70 dark:border-slate-700 overflow-hidden flex"
              title={
                lang === 'de'
                  ? 'Kontrastmaximierte 13-stufige Farbskala (-0,2 bis +1,0 in 0,1-Schritten)'
                  : 'Contrast-maximized 13-step color scale (-0.2 to +1.0 in 0.1 steps)'
              }
            >
              {HEATMAP_PALETTE_INDICES.map((idx) => (
                <span
                  key={idx}
                  className="flex-1 h-full"
                  style={{ backgroundColor: getHeatmapColorFromUnit(idx / (HEATMAP_STEP_COUNT - 1)).bg }}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-blue-800 dark:text-blue-400">+1</span>
          </div>
        </div>
      </div>

      {/* Matrix Container */}
      <div className="relative p-3 pt-2 bg-white dark:bg-slate-900 rounded-b-2xl select-none flex-1 flex flex-col justify-between">
        <div className="w-full overflow-x-auto sm:overflow-visible flex-1 flex flex-col justify-center">
          <div className="min-w-[500px] w-full pr-6">
            {/* Rotated Column Headers */}
            <div
              className="grid items-end gap-[2px] mb-1"
              style={{
                gridTemplateColumns: '132px repeat(8, minmax(0, 1fr)) 4px repeat(4, minmax(0, 1fr))',
              }}
            >
              <div className="h-[92px]" />
              {heatmapDims.map((colDim, cIdx) => {
                const isColHovered = hoveredCell?.colIdx === cIdx;
                return (
                  <React.Fragment key={colDim.id}>
                    {cIdx === 8 && <div />}
                    <div className="relative h-[92px] flex items-end justify-center">
                      <div
                        className={`absolute bottom-1 left-1/2 -rotate-45 origin-bottom-left whitespace-nowrap flex items-center gap-1 text-xs font-sans transition-colors ${
                          isColHovered
                            ? 'text-blue-700 dark:text-white font-bold'
                            : 'text-black dark:text-slate-100 font-semibold'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: colDim.color }}
                        />
                        <span>{getResolvedDimensionShortLabel(colDim, lang, row2Labels)}</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* 12 Matrix Rows (8 active categories + 4 retired categories) */}
            <div className="space-y-[2px]">
              {heatmapDims.map((rowDim, rIdx) => {
                const isRowHovered = hoveredCell?.rowIdx === rIdx;
                const rowDimFull = getResolvedDimensionName(rowDim, lang, row2Labels);
                return (
                  <React.Fragment key={rowDim.id}>
                    {rIdx === 8 && (
                      <div className="h-[4px]" />
                    )}
                    <div
                      className="grid items-center gap-[2px]"
                      style={{
                        gridTemplateColumns: '132px repeat(8, minmax(0, 1fr)) 4px repeat(4, minmax(0, 1fr))',
                      }}
                    >
                      {/* Row Header Label */}
                      <div
                        className={`pr-1.5 flex items-center justify-end gap-1 text-xs font-sans truncate transition-colors ${
                          isRowHovered
                            ? 'text-blue-700 dark:text-white font-bold'
                            : 'text-black dark:text-slate-100 font-semibold'
                        }`}
                        title={rowDimFull}
                      >
                        <span className="truncate">{getResolvedDimensionShortLabel(rowDim, lang, row2Labels)}</span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: rowDim.color }}
                        />
                      </div>

                      {/* Score Cells (Diagonal omitted) */}
                      {heatmapDims.map((colDim, cIdx) => {
                        const isDiag = rIdx === cIdx;
                        const cell = matrix[rIdx][cIdx];
                        const val = metric === 'pearson' ? cell.pearson : cell.spearman;
                        const { bg, text } = getHeatmapCellColors(val);
                        const isHovered = hoveredCell?.rowIdx === rIdx && hoveredCell?.colIdx === cIdx;

                        return (
                          <React.Fragment key={`${rowDim.id}-${colDim.id}`}>
                            {cIdx === 8 && <div />}
                            {isDiag ? (
                              <div className="aspect-square w-full" aria-hidden="true" />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectPairForOtherPlot) {
                                    onSelectPairForOtherPlot(colDim.index, rowDim.index);
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
                                className={`aspect-square w-full flex items-center justify-center rounded-[3px] border border-slate-300/80 dark:border-slate-700/70 cursor-pointer hover:scale-110 hover:z-20 text-xs font-mono font-bold leading-none tabular-nums tracking-tighter transition-transform duration-100 ${
                                  isHovered ? 'ring-2 ring-slate-900 dark:ring-white z-20 scale-110' : ''
                                }`}
                              >
                                {val !== null ? roundHeatmapTenths(val).toFixed(1) : '—'}
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
        <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
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
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hoveredRowDim.color }} />
                    <span className="truncate">{getResolvedDimensionName(hoveredRowDim, lang, row2Labels)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hoveredColDim.color }} />
                    <span className="truncate">{getResolvedDimensionName(hoveredColDim, lang, row2Labels)}</span>
                  </div>
                </div>

                {hoveredData.pearson !== null && hoveredData.spearman !== null ? (
                  <div className="space-y-0.5 font-mono text-xs">
                    <div className={`flex items-center justify-between gap-4 ${metric === 'pearson' ? 'text-blue-300 font-bold' : 'text-slate-300'}`}>
                      <span>Pearson r:</span>
                      <span>
                        {formatCorrelationDecimal(hoveredData.pearson, 2)}
                        {hoveredData.pearsonRes && ` (${lang === 'de' ? hoveredData.pearsonRes.strengthDe : hoveredData.pearsonRes.strengthEn})`}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between gap-4 ${metric === 'spearman' ? 'text-rose-300 font-bold' : 'text-slate-300'}`}>
                      <span>Spearman Rho:</span>
                      <span>
                        {formatCorrelationDecimal(hoveredData.spearman, 2)}
                        {hoveredData.spearmanRes && ` (${lang === 'de' ? hoveredData.spearmanRes.strengthDe : hoveredData.spearmanRes.strengthEn})`}
                      </span>
                    </div>
                    <div className="pt-1 mt-1 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                      <span>n = {hoveredData.n}</span>
                      {hoveredCell.rowIdx !== hoveredCell.colIdx && (
                        <span className="text-emerald-400">
                          {lang === 'de' ? 'Klick → Streudiagramm' : 'Click → Scatterplot'}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="font-mono text-xs text-slate-300">
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
