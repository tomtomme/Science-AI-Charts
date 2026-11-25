import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Language } from '../../utils/i18n';
import { ManualRowMapping } from '../../types/integrityMonitor';
import {
  BenchmarkDiffStatus,
  IGNORE_OPTION_VALUE,
  INSERT_NEW_ROW_OPTION_VALUE,
  formatExactScore,
  formatScoreDiff,
} from './monitorTypes';

export type BenchmarkAccentColor = 'indigo' | 'cyan' | 'amber' | 'teal';

const ACCENT_STYLES: Record<
  BenchmarkAccentColor,
  {
    linkText: string;
    spinnerBox: string;
    spinnerIcon: string;
    checkbox: string;
    restoreHover: string;
  }
> = {
  indigo: {
    linkText: 'text-indigo-600 dark:text-indigo-400',
    spinnerBox: 'border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/30',
    spinnerIcon: 'text-indigo-600 dark:text-indigo-400',
    checkbox: 'text-indigo-600 focus:ring-indigo-500',
    restoreHover: 'hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400',
  },
  cyan: {
    linkText: 'text-cyan-700 dark:text-cyan-400',
    spinnerBox: 'border-cyan-200 dark:border-cyan-900 bg-cyan-50/70 dark:bg-cyan-950/30',
    spinnerIcon: 'text-cyan-700 dark:text-cyan-400',
    checkbox: 'text-cyan-600 focus:ring-cyan-500',
    restoreHover: 'hover:border-cyan-500 hover:text-cyan-700 dark:hover:text-cyan-300',
  },
  amber: {
    linkText: 'text-amber-700 dark:text-amber-400',
    spinnerBox: 'border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30',
    spinnerIcon: 'text-amber-700 dark:text-amber-400',
    checkbox: 'text-amber-600 focus:ring-amber-500',
    restoreHover: 'hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-300',
  },
  teal: {
    linkText: 'text-teal-600 dark:text-teal-400',
    spinnerBox: 'border-teal-200 dark:border-teal-900 bg-teal-50/70 dark:bg-teal-950/30',
    spinnerIcon: 'text-teal-600 dark:text-teal-400',
    checkbox: 'text-teal-600 focus:ring-teal-500',
    restoreHover: 'hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400',
  },
};

export interface ResolvedBenchmarkTarget {
  sheetRowNumber: number | null;
  matchedDisplayName: string | null;
  currentScore: number | null;
  currentIsBold?: boolean | null;
  isNewRowInsert?: boolean;
}

export interface BenchmarkDiffRowViewModel<TRaw = unknown> {
  id: string;
  name: string;
  rank: number;
  isSiteNew?: boolean;
  status: BenchmarkDiffStatus;
  liveScore: number;
  scoreDecimals?: number;
  raw: TRaw;
}

export interface BenchmarkPickerOption {
  id: string;
  sheetRowNumber: number;
  displayName: string;
  labelSuffix: string;
}

export interface BenchmarkMappedRowSummary {
  id: string;
  sourceName: string;
  sheetRowNumber: number;
  matchedDisplayName?: string;
}

export interface BenchmarkReportSummaryMeta {
  totalSourceModels: number;
  sourceUpdatedAt: string | null;
  unmatchedCount: number;
  missingCount: number;
  overwriteEstimateCount?: number;
  changedCount: number;
  unchangedCount: number;
  actionableCount: number;
  summaryDe: string;
  summaryEn: string;
}

export interface BenchmarkDiffSectionProps<TRaw = unknown> {
  lang: Language;
  accent: BenchmarkAccentColor;
  icon: React.ReactNode;
  title: string;
  sourceUrl: string;
  sourceDomainLabel: string;
  headerCountText?: string;
  modelColumnHeader: string;
  scoreColumnHeader: string;
  checkingText: string;
  bannerPrefixActionable: string;
  bannerPrefixOk: string;
  unmatchedPillLabel: string;
  unmatchedBadgeLabel: string;
  missingBadgeLabel: string;
  estimateBadgeLabel: string;
  changedBadgeLabel: string;
  unchangedOkLabel: string;
  supportsBoldState?: boolean;
  supportsInsertNewRow?: boolean;
  showSelectAllToggle?: boolean;
  showRankInRow?: boolean;
  minHistoryRow?: number;
  assignPlaceholder: string;
  isChecking: boolean;
  isSheetsConnected: boolean;
  rawReport: BenchmarkReportSummaryMeta | null;
  effectiveReport: BenchmarkReportSummaryMeta | null;
  actionableRows: Array<BenchmarkDiffRowViewModel<TRaw>>;
  ignoredRows: Array<{ id: string; name: string }>;
  mappedRows?: BenchmarkMappedRowSummary[];
  selectedIds: Record<string, boolean>;
  manualRowOverrides: Record<string, number>;
  showIgnored: boolean;
  onToggleShowIgnored: () => void;
  onToggleItem: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onAssignManualRow: (id: string, rowValue: string) => void;
  onRestoreModel?: (id: string) => Promise<void>;
  onRemoveManualMapping?: (id: string) => Promise<void>;
  resolveTarget: (row: BenchmarkDiffRowViewModel<TRaw>) => ResolvedBenchmarkTarget;
  getPickerOptionsForRow: (row: BenchmarkDiffRowViewModel<TRaw>) => BenchmarkPickerOption[];
  defaultLiveDecimals: number;
  onResearchNewModel?: (row: BenchmarkDiffRowViewModel<TRaw>) => void;
  researchingRowId?: string | null;
  researchKeyPrefix?: string;
}

export function useBenchmarkSelectionState<TRaw>(
  isModalOpen: boolean,
  actionableRows: Array<BenchmarkDiffRowViewModel<TRaw>>,
  hasEffectiveReport: boolean,
  resolveTarget: (
    row: BenchmarkDiffRowViewModel<TRaw>,
    overrides: Record<string, number>
  ) => ResolvedBenchmarkTarget,
  onIgnoreModel?: (id: string) => Promise<void>,
  onPersistManualMapping?: (id: string, mapping: ManualRowMapping) => Promise<void>,
  getSheetRowInfo?: (rowNumber: number) => { id: string; displayName: string } | undefined,
  minHistoryRow: number = 36
) {
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [manualRowOverrides, setManualRowOverrides] = useState<Record<string, number>>({});
  const [showIgnored, setShowIgnored] = useState(false);

  // Sync default checkboxes whenever effective report changes
  useEffect(() => {
    if (!hasEffectiveReport) {
      setSelectedIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of actionableRows) {
      if (
        item.status === 'missing' ||
        item.status === 'overwrite_estimate' ||
        item.status === 'changed'
      ) {
        next[item.id] = true;
      }
    }
    setSelectedIds(next);
  }, [hasEffectiveReport, actionableRows]);

  useEffect(() => {
    if (isModalOpen) {
      setManualRowOverrides({});
      setShowIgnored(false);
    }
  }, [isModalOpen]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setSelectedIds({});
        return;
      }
      const next: Record<string, boolean> = {};
      for (const item of actionableRows) {
        const target = resolveTarget(item, manualRowOverrides);
        if (target.isNewRowInsert || (target.sheetRowNumber && target.sheetRowNumber >= minHistoryRow)) {
          next[item.id] = true;
        }
      }
      setSelectedIds(next);
    },
    [actionableRows, resolveTarget, manualRowOverrides, minHistoryRow]
  );

  const assignManualRow = useCallback(
    (id: string, rowNumStr: string, allowNewRowInsert = false) => {
      if (rowNumStr === IGNORE_OPTION_VALUE) {
        setManualRowOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setSelectedIds((prev) => ({ ...prev, [id]: false }));
        void onIgnoreModel?.(id);
        return;
      }

      const rowNum = Number(rowNumStr);
      if (allowNewRowInsert && rowNum === INSERT_NEW_ROW_OPTION_VALUE) {
        setManualRowOverrides((prev) => ({ ...prev, [id]: INSERT_NEW_ROW_OPTION_VALUE }));
        setSelectedIds((prev) => ({ ...prev, [id]: true }));
        return;
      }

      if (!Number.isFinite(rowNum) || rowNum < minHistoryRow) {
        setManualRowOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setSelectedIds((prev) => ({ ...prev, [id]: false }));
        return;
      }

      setManualRowOverrides((prev) => ({ ...prev, [id]: rowNum }));
      setSelectedIds((prev) => ({ ...prev, [id]: true }));

      if (onPersistManualMapping) {
        const rowInfo = getSheetRowInfo?.(rowNum);
        void onPersistManualMapping(id, {
          sheetRowNumber: rowNum,
          ...(rowInfo?.id ? { matchedModelId: rowInfo.id } : {}),
          ...(rowInfo?.displayName ? { matchedDisplayName: rowInfo.displayName } : {}),
        });
      }
    },
    [onIgnoreModel, onPersistManualMapping, getSheetRowInfo, minHistoryRow]
  );

  const clearOverrides = useCallback(() => {
    setManualRowOverrides({});
  }, []);

  return {
    selectedIds,
    manualRowOverrides,
    showIgnored,
    toggleShowIgnored: () => setShowIgnored((prev) => !prev),
    toggleItem,
    toggleAll,
    assignManualRow,
    clearOverrides,
  };
}

export function BenchmarkDiffSection<TRaw>({
  lang,
  accent,
  icon,
  title,
  sourceUrl,
  sourceDomainLabel,
  headerCountText,
  modelColumnHeader,
  scoreColumnHeader,
  checkingText,
  bannerPrefixActionable,
  bannerPrefixOk,
  unmatchedPillLabel,
  unmatchedBadgeLabel,
  missingBadgeLabel,
  estimateBadgeLabel,
  changedBadgeLabel,
  unchangedOkLabel,
  supportsBoldState = false,
  supportsInsertNewRow = false,
  showSelectAllToggle = true,
  showRankInRow = true,
  minHistoryRow = 36,
  assignPlaceholder,
  isChecking,
  isSheetsConnected,
  rawReport,
  effectiveReport,
  actionableRows,
  ignoredRows,
  mappedRows = [],
  selectedIds,
  manualRowOverrides,
  showIgnored,
  onToggleShowIgnored,
  onToggleItem,
  onToggleAll,
  onAssignManualRow,
  onRestoreModel,
  onRemoveManualMapping,
  resolveTarget,
  getPickerOptionsForRow,
  defaultLiveDecimals,
  onResearchNewModel,
  researchingRowId,
  researchKeyPrefix,
}: BenchmarkDiffSectionProps<TRaw>) {
  const styles = ACCENT_STYLES[accent];
  const [showMapped, setShowMapped] = useState(false);

  const mappedIdSet = useMemo(() => new Set(mappedRows.map((m) => m.id)), [mappedRows]);

  const renderStatusBadge = (status: BenchmarkDiffStatus) => {
    switch (status) {
      case 'new_unmatched':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 shrink-0">
            {unmatchedBadgeLabel}
          </span>
        );
      case 'missing':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 shrink-0">
            {missingBadgeLabel}
          </span>
        );
      case 'overwrite_estimate':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
            {estimateBadgeLabel}
          </span>
        );
      case 'changed':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
            {changedBadgeLabel}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap truncate">
            {title}
          </h3>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-xs font-mono ${styles.linkText} hover:underline whitespace-nowrap shrink-0`}
          >
            <span>{sourceDomainLabel}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showSelectAllToggle && actionableRows.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => onToggleAll(true)}
                className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {lang === 'de' ? 'Alle' : 'All'}
              </button>
              <span className="text-slate-500 dark:text-slate-600">·</span>
              <button
                type="button"
                onClick={() => onToggleAll(false)}
                className="text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
              >
                {lang === 'de' ? 'Keine' : 'None'}
              </button>
            </div>
          )}
          {rawReport && headerCountText && (
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
              {headerCountText}
            </span>
          )}
        </div>
      </div>

      {isChecking && !effectiveReport && (
        <div
          className={`px-3.5 py-2 rounded-xl border ${styles.spinnerBox} flex items-center gap-2.5 text-xs`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${styles.spinnerIcon} animate-spin shrink-0`} />
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
            {checkingText}
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
                  {effectiveReport.actionableCount > 0 ? bannerPrefixActionable : bannerPrefixOk}
                </strong>{' '}
                {lang === 'de' ? effectiveReport.summaryDe : effectiveReport.summaryEn}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs shrink-0 whitespace-nowrap">
              {effectiveReport.unmatchedCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-bold">
                  {effectiveReport.unmatchedCount} {unmatchedPillLabel}
                </span>
              )}
              {effectiveReport.missingCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                  {effectiveReport.missingCount} {lang === 'de' ? 'Fehlt' : 'Missing'}
                </span>
              )}
              {(effectiveReport.overwriteEstimateCount ?? 0) > 0 && (
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
                  title={
                    lang === 'de'
                      ? 'Gespeicherte Zuordnungen anzeigen / verwalten'
                      : 'Show / manage saved mappings'
                  }
                >
                  {mappedRows.length} {lang === 'de' ? 'zugeordnet' : 'mapped'}
                </button>
              )}
              {ignoredRows.length > 0 && (
                <button
                  type="button"
                  onClick={onToggleShowIgnored}
                  className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300/80 dark:hover:bg-slate-700 cursor-pointer"
                  title={
                    lang === 'de'
                      ? 'Ignorierte Modelle anzeigen / wiederherstellen'
                      : 'Show / restore ignored models'
                  }
                >
                  {ignoredRows.length} {lang === 'de' ? 'ignoriert' : 'ignored'}
                </button>
              )}
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold">
                {effectiveReport.unchangedCount} {unchangedOkLabel}
              </span>
            </div>
          </div>

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
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 ${styles.restoreHover} cursor-pointer`}
                  title={
                    lang === 'de' ? 'Zuordnung aufheben' : 'Remove manual mapping'
                  }
                >
                  <span>
                    {m.sourceName} → {m.matchedDisplayName || m.id}
                  </span>
                  <X className="w-2.5 h-2.5 shrink-0" />
                </button>
              ))}
            </div>
          )}

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
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 ${styles.restoreHover} cursor-pointer`}
                  title={lang === 'de' ? 'Wieder aktivieren' : 'Restore'}
                >
                  <span>{d.name}</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              ))}
            </div>
          )}

          {actionableRows.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
                      <th className="py-1.5 px-2.5 w-8"></th>
                      <th className="py-1.5 px-3">{modelColumnHeader}</th>
                      <th className="py-1.5 px-3">
                        {lang === 'de' ? 'Zugeordnetes Modell' : 'Target Model'}
                      </th>
                      <th className="py-1.5 px-3">{scoreColumnHeader}</th>
                      <th className="py-1.5 px-3">
                        {lang === 'de' ? 'Score-Diff' : 'Score Diff'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                    {actionableRows.map((item) => {
                      const target = resolveTarget(item);
                      const canSelect = Boolean(
                        target.isNewRowInsert ||
                          (target.sheetRowNumber && target.sheetRowNumber >= minHistoryRow)
                      );
                      const isManuallyMapped =
                        item.status !== 'new_unmatched' && mappedIdSet.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={
                            item.status === 'new_unmatched'
                              ? 'bg-purple-50/35 dark:bg-purple-950/15'
                              : 'bg-amber-50/35 dark:bg-amber-950/15'
                          }
                        >
                          <td className="py-1.5 px-2.5 align-middle">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedIds[item.id])}
                              disabled={!canSelect}
                              onChange={() => onToggleItem(item.id)}
                              className={`rounded border-slate-300 ${styles.checkbox} cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                            />
                          </td>
                          <td className="py-1.5 px-3 align-middle whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {showRankInRow && (
                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                                  #{item.rank}
                                </span>
                              )}
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {item.name}
                              </span>
                              {item.isSiteNew && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 shrink-0">
                                  NEW
                                </span>
                              )}
                              {renderStatusBadge(item.status)}
                            </div>
                          </td>
                          <td className="py-1.5 px-3 align-middle whitespace-nowrap">
                            {item.status === 'new_unmatched' ? (
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={manualRowOverrides[item.id] ?? ''}
                                  onChange={(e) => onAssignManualRow(item.id, e.target.value)}
                                  className={`w-full ${
                                    supportsInsertNewRow ? 'max-w-[260px]' : 'max-w-[240px]'
                                  } px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100`}
                                >
                                  <option value="">{assignPlaceholder}</option>
                                  {supportsInsertNewRow && (
                                    <option value={INSERT_NEW_ROW_OPTION_VALUE}>
                                      {lang === 'de'
                                        ? '➕ Als neues Modell ergänzen'
                                        : '➕ Add as new model'}
                                    </option>
                                  )}
                                  <option value={IGNORE_OPTION_VALUE}>
                                    {lang === 'de'
                                      ? '🚫 Ignorieren (nicht mehr nachfragen)'
                                      : "🚫 Ignore (don't ask again)"}
                                  </option>
                                  {getPickerOptionsForRow(item).map((opt) => (
                                    <option key={opt.id} value={opt.sheetRowNumber}>
                                      {opt.displayName} ({opt.labelSuffix})
                                    </option>
                                  ))}
                                </select>
                                {onResearchNewModel && (() => {
                                  const isResearching =
                                    Boolean(researchKeyPrefix) &&
                                    researchingRowId === `${researchKeyPrefix}:${item.id}`;
                                  return (
                                    <button
                                      type="button"
                                      disabled={Boolean(researchingRowId)}
                                      onClick={() => onResearchNewModel(item)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:cursor-wait shrink-0"
                                      title={
                                        lang === 'de'
                                          ? 'Komplette Zeile (alle Benchmarks, Storyline, Links, Preise) automatisch recherchieren & anlegen'
                                          : 'Research & create complete Sheet row (all benchmarks, storyline, links, prices)'
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
                                            ? 'Lädt…'
                                            : 'Loading…'
                                          : lang === 'de'
                                          ? 'Zeile'
                                          : 'Row'}
                                      </span>
                                    </button>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                                <span>{target.matchedDisplayName}</span>
                                {isManuallyMapped && onRemoveManualMapping && (
                                  <button
                                    type="button"
                                    onClick={() => void onRemoveManualMapping(item.id)}
                                    className="inline-flex items-center justify-center p-0.5 rounded text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 cursor-pointer"
                                    title={
                                      lang === 'de'
                                        ? 'Manuelle Zuordnung aufheben'
                                        : 'Unlink manual mapping'
                                    }
                                    aria-label={
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
                          <td className="py-1.5 px-3 align-middle font-mono tabular-nums whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {supportsBoldState ? (
                                target.currentScore !== null ? (
                                  <span
                                    className={
                                      target.currentIsBold
                                        ? 'font-bold text-slate-800 dark:text-slate-200 line-through'
                                        : 'font-normal text-slate-700 dark:text-slate-300'
                                    }
                                    title={
                                      target.currentIsBold === false
                                        ? lang === 'de'
                                          ? 'Bestehender Schätzwert'
                                          : 'Existing estimate'
                                        : lang === 'de'
                                        ? 'Offizieller Wert'
                                        : 'Official value'
                                    }
                                  >
                                    {formatExactScore(target.currentScore, lang)}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 dark:text-slate-400">—</span>
                                )
                              ) : (
                                <span className="text-slate-600 dark:text-slate-400 line-through">
                                  {target.currentScore !== null
                                    ? formatExactScore(target.currentScore, lang)
                                    : '—'}
                                </span>
                              )}
                              <ArrowRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                {formatExactScore(
                                  item.liveScore,
                                  lang,
                                  item.scoreDecimals ?? defaultLiveDecimals
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-1.5 px-3 align-middle font-mono tabular-nums whitespace-nowrap">
                            {target.currentScore !== null &&
                            typeof target.currentScore === 'number' &&
                            Number.isFinite(target.currentScore) ? (
                              (() => {
                                const {
                                  pointDiff,
                                  pointFormatted,
                                  pctFormatted,
                                  isLargeDiff,
                                } = formatScoreDiff(target.currentScore, item.liveScore, lang);
                                const largeDiffLabel =
                                  lang === 'de'
                                    ? `Abweichung größer als 5% (${pctFormatted}, ${pointFormatted} Pkt.)`
                                    : `Difference greater than 5% (${pctFormatted}, ${pointFormatted} pts)`;
                                const normalTooltip =
                                  lang === 'de'
                                    ? `${pctFormatted} (${pointFormatted} Pkt.)`
                                    : `${pctFormatted} (${pointFormatted} pts)`;
                                return (
                                  <div
                                    className="inline-flex items-center gap-1.5"
                                    title={isLargeDiff ? largeDiffLabel : normalTooltip}
                                  >
                                    <span
                                      className={
                                        isLargeDiff
                                          ? 'font-bold text-rose-700 dark:text-rose-300'
                                          : pointDiff > 0
                                          ? 'font-semibold text-emerald-700 dark:text-emerald-300'
                                          : pointDiff < 0
                                          ? 'font-semibold text-amber-700 dark:text-amber-300'
                                          : 'text-slate-600 dark:text-slate-400'
                                      }
                                    >
                                      {pctFormatted}
                                    </span>
                                    {isLargeDiff && (
                                      <span
                                        className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0"
                                        aria-label={largeDiffLabel}
                                      >
                                        !
                                      </span>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-slate-600 dark:text-slate-400">—</span>
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
}
