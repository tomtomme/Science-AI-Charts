import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Cpu,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AA_METRIC_KEYS,
  AaCheckReport,
  AaDiffItem,
  AaDiffStatus,
  AaMetricDiffItem,
  AaMetricKey,
} from '../../types/aaMonitor';
import { Language } from '../../utils/i18n';
import {
  IGNORE_OPTION_VALUE,
  formatExactScore,
  formatScoreDiff,
} from './monitorTypes';
import { BenchmarkMappedRowSummary, BenchmarkPickerOption } from './BenchmarkDiffSection';

export const AA_METRIC_LABELS: Record<AaMetricKey, { de: string; en: string; short: string }> = {
  iq: { de: 'IQ (v5)', en: 'IQ (v5)', short: 'IQ' },
  nonHallucination: { de: 'Non-Hallu', en: 'Non-Hallu', short: 'NH' },
  accuracy: { de: 'Accuracy', en: 'Accuracy', short: 'Acc' },
  mmmuPro: { de: 'MMMU-Pro', en: 'MMMU-Pro', short: 'MMMU' },
  mlcr: { de: 'MLCR-AA', en: 'MLCR-AA', short: 'MLCR' },
  excelAgent: { de: 'ExcelAgent', en: 'ExcelAgent', short: 'Excel' },
};

export interface ResolvedAaTarget {
  sheetRowNumber: number | null;
  matchedDisplayName: string | null;
  metricDiffs: AaMetricDiffItem[];
}

interface ArtificialAnalysisDiffSectionProps {
  lang: Language;
  isChecking: boolean;
  isSheetsConnected: boolean;
  rawReport: AaCheckReport | null;
  effectiveReport: AaCheckReport | null;
  actionableRows: AaDiffItem[];
  ignoredRows: Array<{ id: string; name: string }>;
  mappedRows: BenchmarkMappedRowSummary[];
  selectedCells: Record<string, boolean>; // key: `${aaId}:${metric}`
  manualRowOverrides: Record<string, number>;
  showIgnored: boolean;
  minHistoryRow: number;
  researchingRowId: string | null;
  onToggleShowIgnored: () => void;
  onToggleMetricCell: (aaId: string, metric: AaMetricKey) => void;
  onToggleRowAllMetrics: (aaId: string, metrics: AaMetricKey[], checked: boolean) => void;
  onToggleSectionAll: (checked: boolean) => void;
  onAssignManualRow: (aaId: string, rowValue: string) => void;
  onRestoreModel?: (aaId: string) => Promise<void>;
  onRemoveManualMapping?: (aaId: string) => Promise<void>;
  onResearchNewModel?: (item: AaDiffItem) => void;
  resolveTarget: (item: AaDiffItem) => ResolvedAaTarget;
  getPickerOptionsForRow: (item: AaDiffItem) => BenchmarkPickerOption[];
}

export const ArtificialAnalysisDiffSection: React.FC<ArtificialAnalysisDiffSectionProps> = ({
  lang,
  isChecking,
  isSheetsConnected,
  rawReport,
  effectiveReport,
  actionableRows,
  ignoredRows,
  mappedRows,
  selectedCells,
  manualRowOverrides,
  showIgnored,
  minHistoryRow,
  researchingRowId,
  onToggleShowIgnored,
  onToggleMetricCell,
  onToggleRowAllMetrics,
  onToggleSectionAll,
  onAssignManualRow,
  onRestoreModel,
  onRemoveManualMapping,
  onResearchNewModel,
  resolveTarget,
  getPickerOptionsForRow,
}) => {
  const [showMapped, setShowMapped] = useState(false);
  const mappedIdSet = useMemo(() => new Set(mappedRows.map((m) => m.id)), [mappedRows]);

  const renderStatusBadge = (status: AaDiffStatus) => {
    switch (status) {
      case 'new_unmatched':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 shrink-0">
            {lang === 'de' ? 'Neu' : 'New'}
          </span>
        );
      case 'missing':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 shrink-0">
            {lang === 'de' ? 'Fehlt' : 'Missing'}
          </span>
        );
      case 'overwrite_estimate':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
            {lang === 'de' ? 'Schätzwert' : 'Estimate'}
          </span>
        );
      case 'changed':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
            {lang === 'de' ? 'Geändert' : 'Changed'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Cpu className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap truncate">
            {lang === 'de'
              ? 'Artificial Analysis-Prüfer (6 Indizes)'
              : 'Artificial Analysis Checker (6 Metrics)'}
          </h3>
          <a
            href="https://artificialanalysis.ai/leaderboards/models"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-mono text-violet-600 dark:text-violet-400 hover:underline whitespace-nowrap shrink-0"
          >
            <span>artificialanalysis.ai</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actionableRows.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => onToggleSectionAll(true)}
                className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {lang === 'de' ? 'Alle' : 'All'}
              </button>
              <span className="text-slate-500 dark:text-slate-600">·</span>
              <button
                type="button"
                onClick={() => onToggleSectionAll(false)}
                className="text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
              >
                {lang === 'de' ? 'Keine' : 'None'}
              </button>
            </div>
          )}
          {rawReport && (
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
              {rawReport.totalUniqueReleases} Releases ({rawReport.totalSourceModels} Var.)
            </span>
          )}
        </div>
      </div>

      {isChecking && !effectiveReport && (
        <div className="px-3.5 py-2 rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/70 dark:bg-violet-950/30 flex items-center gap-2.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 animate-spin shrink-0" />
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
            {lang === 'de'
              ? 'Prüfe artificialanalysis.ai (IQ, Non-Hallu, Acc, MMMU-Pro, MLCR, Excel)…'
              : 'Checking artificialanalysis.ai (IQ, Non-Hallu, Acc, MMMU-Pro, MLCR, Excel)…'}
          </span>
        </div>
      )}

      {!isSheetsConnected && rawReport && (
        <div className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <span className="truncate">
            {lang === 'de' ? rawReport.summaryDe : rawReport.summaryEn}
          </span>
        </div>
      )}

      {effectiveReport && (
        <>
          {/* Summary Banner */}
          <div
            className={`px-3.5 py-2 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 ${
              effectiveReport.actionableCount > 0
                ? 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
                : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/25'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {effectiveReport.actionableCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              <span className="text-xs text-slate-800 dark:text-slate-200 leading-snug truncate">
                <strong className="font-bold text-slate-900 dark:text-white">
                  {effectiveReport.actionableCount > 0
                    ? lang === 'de'
                      ? `AA (6 Indizes): ${effectiveReport.actionableCount} Modell(e):`
                      : `AA (6 Metrics): ${effectiveReport.actionableCount} model(s):`
                    : 'AA OK:'}
                </strong>{' '}
                {lang === 'de' ? effectiveReport.summaryDe : effectiveReport.summaryEn}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs shrink-0 whitespace-nowrap">
              {effectiveReport.unmatchedCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-bold">
                  {effectiveReport.unmatchedCount} {lang === 'de' ? 'Neu' : 'New'}
                </span>
              )}
              {effectiveReport.missingCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                  {effectiveReport.missingCount} {lang === 'de' ? 'Fehlt' : 'Missing'}
                </span>
              )}
              {effectiveReport.overwriteEstimateCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                  {effectiveReport.overwriteEstimateCount}{' '}
                  {lang === 'de' ? 'Schätzwert' : 'Estimate'}
                </span>
              )}
              {effectiveReport.changedCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                  {effectiveReport.changedCount} {lang === 'de' ? 'Geändert' : 'Changed'}
                </span>
              )}
              {mappedRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMapped((prev) => !prev)}
                  className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300/80 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {mappedRows.length} {lang === 'de' ? 'zugeordnet' : 'mapped'}
                </button>
              )}
              {ignoredRows.length > 0 && (
                <button
                  type="button"
                  onClick={onToggleShowIgnored}
                  className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300/80 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {ignoredRows.length} {lang === 'de' ? 'ignoriert' : 'ignored'}
                </button>
              )}
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold">
                {effectiveReport.unchangedCount} OK
              </span>
            </div>
          </div>

          {/* Saved Manual Mappings Drawer */}
          {showMapped && mappedRows.length > 0 && (
            <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-700 dark:text-slate-300 mr-1">
                {lang === 'de' ? 'Zugeordnet:' : 'Mapped:'}
              </span>
              {mappedRows.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void onRemoveManualMapping?.(m.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer"
                >
                  <span>
                    {m.sourceName} → {m.matchedDisplayName || m.id}
                  </span>
                  <X className="w-2.5 h-2.5 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Ignored Models Drawer */}
          {showIgnored && ignoredRows.length > 0 && (
            <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-700 dark:text-slate-300 mr-1">
                {lang === 'de' ? 'Ignoriert:' : 'Ignored:'}
              </span>
              {ignoredRows.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => void onRestoreModel?.(d.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer"
                >
                  <span>{d.name}</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              ))}
            </div>
          )}

          {/* Actionable Models Table */}
          {actionableRows.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
                      <th className="py-1.5 px-2.5 w-8"></th>
                      <th className="py-1.5 px-3">
                        {lang === 'de' ? 'AA-Modell' : 'AA Model'}
                      </th>
                      <th className="py-1.5 px-3">
                        {lang === 'de' ? 'Ziel / Aktion' : 'Target / Action'}
                      </th>
                      <th className="py-1.5 px-3">
                        {lang === 'de'
                          ? 'Betroffene Indizes (Spalten D–I)'
                          : 'Affected Metrics (Cols D–I)'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                    {actionableRows.map((item) => {
                      const target = resolveTarget(item);
                      const hasValidRow =
                        typeof target.sheetRowNumber === 'number' &&
                        target.sheetRowNumber >= minHistoryRow;
                      const actionableMetrics = target.metricDiffs.filter(
                        (m) =>
                          m.liveScore !== null &&
                          (m.status === 'missing' ||
                            m.status === 'overwrite_estimate' ||
                            m.status === 'changed')
                      );
                      const actionableKeys = actionableMetrics.map((m) => m.metric);
                      const allRowChecked =
                        hasValidRow &&
                        actionableKeys.length > 0 &&
                        actionableKeys.every((k) => Boolean(selectedCells[`${item.aaId}:${k}`]));
                      const someRowChecked =
                        hasValidRow &&
                        actionableKeys.some((k) => Boolean(selectedCells[`${item.aaId}:${k}`]));
                      const isManuallyMapped =
                        item.status !== 'new_unmatched' && mappedIdSet.has(item.aaId);
                      const isResearching = researchingRowId === `aa:${item.aaId}`;

                      return (
                        <tr
                          key={item.aaId}
                          className={
                            item.status === 'new_unmatched'
                              ? 'bg-purple-50/35 dark:bg-purple-950/15'
                              : 'bg-amber-50/30 dark:bg-amber-950/15'
                          }
                        >
                          <td className="py-2 px-2.5 align-top">
                            <input
                              type="checkbox"
                              checked={allRowChecked}
                              ref={(el) => {
                                if (el) el.indeterminate = !allRowChecked && someRowChecked;
                              }}
                              disabled={!hasValidRow || actionableKeys.length === 0}
                              onChange={() =>
                                onToggleRowAllMetrics(item.aaId, actionableKeys, !allRowChecked)
                              }
                              className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </td>

                          <td className="py-2 px-3 align-top whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {item.aaName}
                              </span>
                              {item.isOpenWeights && (
                                <span className="px-1 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                  OW
                                </span>
                              )}
                              {renderStatusBadge(item.status)}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {item.creator || '—'}
                              {item.suffix && item.status !== 'new_unmatched'
                                ? ` · ${item.suffix}`
                                : ''}
                            </div>
                          </td>

                          <td className="py-2 px-3 align-top whitespace-nowrap">
                            {item.status === 'new_unmatched' ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <select
                                  value={manualRowOverrides[item.aaId] ?? ''}
                                  onChange={(e) => onAssignManualRow(item.aaId, e.target.value)}
                                  className="w-[210px] px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                                >
                                  <option value="">
                                    {lang === 'de' ? '— Zuordnen —' : '— Assign —'}
                                  </option>
                                  <option value={IGNORE_OPTION_VALUE}>
                                    {lang === 'de'
                                      ? '🚫 Ignorieren (nicht mehr fragen)'
                                      : "🚫 Ignore (don't ask again)"}
                                  </option>
                                  {getPickerOptionsForRow(item).map((opt) => (
                                    <option key={opt.id} value={opt.sheetRowNumber}>
                                      {opt.displayName} ({opt.labelSuffix})
                                    </option>
                                  ))}
                                </select>

                                {onResearchNewModel && (
                                  <button
                                    type="button"
                                    disabled={Boolean(researchingRowId)}
                                    onClick={() => onResearchNewModel(item)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:cursor-wait"
                                    title={
                                      lang === 'de'
                                        ? 'Komplette Zeile (alle Benchmarks, Storyline, Links, Preise) automatisch recherchieren & anlegen'
                                        : 'Research & populate complete Sheet row (all benchmarks, storyline, links, prices)'
                                    }
                                  >
                                    {isResearching ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3 h-3" />
                                    )}
                                    <span>
                                      {isResearching
                                        ? lang === 'de'
                                          ? 'Recherchiere…'
                                          : 'Researching…'
                                        : lang === 'de'
                                        ? 'Zeile recherchieren'
                                        : 'Research row'}
                                    </span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                                <span>{target.matchedDisplayName}</span>
                                {isManuallyMapped && onRemoveManualMapping && (
                                  <button
                                    type="button"
                                    onClick={() => void onRemoveManualMapping(item.aaId)}
                                    className="inline-flex items-center justify-center p-0.5 rounded text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 cursor-pointer"
                                    title={
                                      lang === 'de'
                                        ? 'Manuelle Zuordnung aufheben'
                                        : 'Unlink manual mapping'
                                    }
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            )}
                          </td>

                          <td className="py-2 px-3 align-top">
                            {hasValidRow ? (
                              <div className="flex flex-wrap gap-1.5">
                                {actionableMetrics.map((md) => {
                                  const cellKey = `${item.aaId}:${md.metric}`;
                                  const checked = Boolean(selectedCells[cellKey]);
                                  const label = AA_METRIC_LABELS[md.metric];
                                  const diffInfo =
                                    md.currentScore !== null && md.liveScore !== null
                                      ? formatScoreDiff(md.currentScore, md.liveScore, lang)
                                      : null;
                                  return (
                                    <label
                                      key={md.metric}
                                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-mono tabular-nums cursor-pointer select-none transition-colors ${
                                        checked
                                          ? 'border-violet-400 dark:border-violet-600 bg-white dark:bg-slate-900 shadow-2xs'
                                          : 'border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-900/40 opacity-65'
                                      }`}
                                      title={
                                        md.status === 'overwrite_estimate'
                                          ? lang === 'de'
                                            ? `${label.de}: Schätzwert durch offiziellen AA-Wert ersetzen`
                                            : `${label.en}: Replace estimate with official AA score`
                                          : md.status === 'missing'
                                          ? lang === 'de'
                                            ? `${label.de}: Fehlenden AA-Wert eintragen`
                                            : `${label.en}: Fill missing AA score`
                                          : `${label.de}: ${diffInfo?.pctFormatted || ''}`
                                      }
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onToggleMetricCell(item.aaId, md.metric)}
                                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer w-3 h-3"
                                      />
                                      <span className="font-bold text-slate-700 dark:text-slate-300">
                                        {label.short}
                                      </span>
                                      <span
                                        className={
                                          md.currentScore === null
                                            ? 'text-slate-400'
                                            : md.currentIsBold === false
                                            ? 'font-normal text-slate-600 dark:text-slate-400'
                                            : 'font-bold text-slate-600 dark:text-slate-300 line-through'
                                        }
                                      >
                                        {md.currentScore !== null
                                          ? formatExactScore(md.currentScore, lang)
                                          : '—'}
                                      </span>
                                      <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                        {formatExactScore(md.liveScore, lang, 1)}
                                      </span>
                                      {md.status === 'overwrite_estimate' && (
                                        <span className="text-[10px] text-amber-700 dark:text-amber-300">
                                          {lang === 'de' ? 'Schätz.' : 'Est.'}
                                        </span>
                                      )}
                                      {diffInfo && md.status === 'changed' && (
                                        <span
                                          className={
                                            diffInfo.isLargeDiff
                                              ? 'font-bold text-rose-600 dark:text-rose-400'
                                              : 'text-slate-500 dark:text-slate-400'
                                          }
                                        >
                                          ({diffInfo.pctFormatted})
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 font-mono tabular-nums text-[11px]">
                                {AA_METRIC_KEYS.map((key) => {
                                  const val = item.liveScores[key];
                                  if (val === null) return null;
                                  return (
                                    <span
                                      key={key}
                                      className="px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                                    >
                                      <span className="text-slate-500 dark:text-slate-400 mr-1">
                                        {AA_METRIC_LABELS[key].short}
                                      </span>
                                      <strong>{formatExactScore(val, lang, 1)}</strong>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
