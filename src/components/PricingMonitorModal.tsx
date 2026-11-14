import React, { useMemo, useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Clock,
  ShieldCheck,
  ArrowRight,
  Save,
  Sparkles,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { LoadedDatasets } from '../services/dataService';
import {
  batchUpdateSheetCells,
  CellUpdateSpec,
  columnIndexToA1,
  quoteSheetTitle,
} from '../services/googleSheetsService';
import {
  MonitoredLab,
  PricingCheckReport,
  PricingDiffItem,
} from '../types/pricingMonitor';
import { Language } from '../utils/i18n';

interface PricingMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  report: PricingCheckReport | null;
  isChecking: boolean;
  checkError: string | null;
  dailyAutoEnabled: boolean;
  onToggleDailyAuto: (enabled: boolean) => void;
  onRunCheck: () => Promise<void>;
  loadedData: LoadedDatasets;
  accessToken: string | null;
  authUser: User | null;
  isSigningIn: boolean;
  onSignIn: () => Promise<void>;
  activeSpreadsheetId: string;
  onRefreshFromSheets: (spreadsheetIdOverride?: string) => Promise<void>;
}

const LAB_ORDER: MonitoredLab[] = ['OpenAI', 'Anthropic', 'Google', 'Meta'];

const LAB_ACCENT: Record<MonitoredLab, string> = {
  OpenAI: 'border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/60 dark:bg-emerald-950/20',
  Anthropic: 'border-amber-200 dark:border-amber-900/70 bg-amber-50/60 dark:bg-amber-950/20',
  Google: 'border-blue-200 dark:border-blue-900/70 bg-blue-50/60 dark:bg-blue-950/20',
  Meta: 'border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/60 dark:bg-indigo-950/20',
};

const LAB_BADGE: Record<MonitoredLab, string> = {
  OpenAI: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300',
  Anthropic: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300',
  Google: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300',
  Meta: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300',
};

interface PendingSheetCellChange {
  cellRef: string;
  label: string;
  before: string;
  after: string;
  range: string;
  value: string;
}

export const PricingMonitorModal: React.FC<PricingMonitorModalProps> = ({
  isOpen,
  onClose,
  lang,
  report,
  isChecking,
  checkError,
  dailyAutoEnabled,
  onToggleDailyAuto,
  onRunCheck,
  loadedData,
  accessToken,
  authUser,
  isSigningIn,
  onSignIn,
  activeSpreadsheetId,
  onRefreshFromSheets,
}) => {
  const [filterMode, setFilterMode] = useState<'actionable' | 'all'>('actionable');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [pendingWrite, setPendingWrite] = useState<PendingSheetCellChange[] | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeSuccess, setWriteSuccess] = useState<string | null>(null);

  // Pre-select any rows with changed prices whenever a new report arrives
  useEffect(() => {
    if (!report) return;
    const next: Record<string, boolean> = {};
    for (const item of report.diffs) {
      const hasChange = item.deStatus === 'changed' || item.usStatus === 'changed';
      const hasMissing = item.deStatus === 'missing' || item.usStatus === 'missing';
      if (hasChange || hasMissing) {
        next[item.modelId] = hasChange;
      }
    }
    setSelectedIds(next);
  }, [report]);

  useEffect(() => {
    if (isOpen) {
      setWriteError(null);
      setWriteSuccess(null);
      setPendingWrite(null);
    }
  }, [isOpen]);

  const layout = loadedData.columnLayout;
  const colDeIdx = layout?.colDePrice ?? 19;
  const colUsIdx = layout?.colUsPrice ?? null;
  const colDeLetter = columnIndexToA1(colDeIdx);
  const colUsLetter = colUsIdx !== null ? columnIndexToA1(colUsIdx) : null;
  const sheetTitle = loadedData.activeSheetTitle || 'Sheet1';

  const visibleDiffs = useMemo(() => {
    if (!report) return [];
    if (filterMode === 'all') return report.diffs;
    const actionable = report.diffs.filter(
      (d) => d.deStatus !== 'unchanged' || d.usStatus !== 'unchanged'
    );
    return actionable.length > 0 ? actionable : report.diffs;
  }, [report, filterMode]);

  const selectedCount = useMemo(() => {
    if (!report) return 0;
    return report.diffs.filter((d) => selectedIds[d.modelId]).length;
  }, [report, selectedIds]);

  if (!isOpen) return null;

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleToggleItem = (modelId: string) => {
    setSelectedIds((prev) => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  const handlePrepareSheetUpdates = () => {
    if (!report) return;
    setWriteError(null);
    setWriteSuccess(null);

    const changes: PendingSheetCellChange[] = [];
    for (const item of report.diffs) {
      if (!selectedIds[item.modelId]) continue;
      // Strict guard: never write to Rows 1-35 (Top-30 VSTACK lives in Rows 3-32)
      if (item.sheetRowNumber < 36) continue;

      if ((item.deStatus === 'changed' || item.deStatus === 'missing') && item.liveDe) {
        changes.push({
          cellRef: `${colDeLetter}${item.sheetRowNumber}`,
          label: `${item.displayName} (${item.lab} · DE)`,
          before: item.currentDe || '(empty)',
          after: item.liveDe,
          range: `${quoteSheetTitle(sheetTitle)}!${colDeLetter}${item.sheetRowNumber}`,
          value: item.liveDe,
        });
      }

      if (
        colUsIdx !== null &&
        colUsLetter &&
        (item.usStatus === 'changed' || item.usStatus === 'missing') &&
        item.liveUs
      ) {
        changes.push({
          cellRef: `${colUsLetter}${item.sheetRowNumber}`,
          label: `${item.displayName} (${item.lab} · US)`,
          before: item.currentUs || '(empty)',
          after: item.liveUs,
          range: `${quoteSheetTitle(sheetTitle)}!${colUsLetter}${item.sheetRowNumber}`,
          value: item.liveUs,
        });
      }
    }

    if (changes.length === 0) {
      setWriteError(
        lang === 'de'
          ? 'Keine ausgewählten Preisänderungen für Google Sheets (Spalten T/U) gefunden.'
          : 'No selected price updates found to write to Google Sheets (Cols T/U).'
      );
      return;
    }

    setPendingWrite(changes);
  };

  const handleConfirmSheetWrite = async () => {
    if (!pendingWrite || !accessToken) return;
    setIsWriting(true);
    setWriteError(null);
    setWriteSuccess(null);

    try {
      const updates: CellUpdateSpec[] = pendingWrite.map((c) => ({
        range: c.range,
        value: c.value,
      }));
      const res = await batchUpdateSheetCells(activeSpreadsheetId, updates, accessToken);
      setWriteSuccess(
        lang === 'de'
          ? `${res.totalUpdatedCells} Preiszelle(n) ab Zeile 36 erfolgreich im Google Sheet aktualisiert.`
          : `Successfully updated ${res.totalUpdatedCells} pricing cell(s) (Row 36+) in Google Sheets.`
      );
      setPendingWrite(null);
      await onRefreshFromSheets(activeSpreadsheetId);
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : 'Failed to update Google Sheet.');
      setPendingWrite(null);
    } finally {
      setIsWriting(false);
    }
  };

  const renderStatusPill = (status: PricingDiffItem['deStatus']) => {
    if (status === 'changed') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
          {lang === 'de' ? 'Geändert' : 'Changed'}
        </span>
      );
    }
    if (status === 'missing') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
          {lang === 'de' ? 'Fehlt' : 'Missing'}
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
        {lang === 'de' ? 'Aktuell' : 'Up to date'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-5">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                report && report.changedCount > 0
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
              }`}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'de' ? 'Täglicher KI-Preis-Monitor' : 'Daily AI Pricing Monitor'}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Meta · OpenAI · Anthropic · Google
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {lang === 'de' ? 'Letzte Prüfung:' : 'Last checked:'} {formatTimestamp(report?.checkedAt)}
                </span>
                {report?.nextCheckDueAt && (
                  <span className="hidden sm:inline text-slate-400">
                    · {lang === 'de' ? 'Nächste fällig:' : 'Next due:'} {formatTimestamp(report.nextCheckDueAt)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Daily auto-check toggle */}
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dailyAutoEnabled}
                onChange={(e) => onToggleDailyAuto(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>{lang === 'de' ? 'Täglich automatisch' : 'Daily Auto-Check'}</span>
            </label>

            <button
              type="button"
              onClick={() => void onRunCheck()}
              disabled={isChecking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-55"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>
                {isChecking
                  ? lang === 'de'
                    ? 'Prüfe Live-Preise…'
                    : 'Checking Live Prices…'
                  : lang === 'de'
                  ? 'Jetzt prüfen'
                  : 'Check Now'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {checkError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{checkError}</span>
            </div>
          )}

          {writeError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{writeError}</span>
            </div>
          )}

          {writeSuccess && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{writeSuccess}</span>
            </div>
          )}

          {!report && isChecking && (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'de'
                  ? 'Durchsuche aktuelle US- ($) & DE-Preise (€) für Meta, OpenAI, Anthropic und Google…'
                  : 'Searching current US ($) & DE (€) pricing for Meta, OpenAI, Anthropic, and Google…'}
              </p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {lang === 'de'
                  ? 'Verwendet Live-Websuche (Google Search Grounding) & vergleicht mit Spalten T/U ab Zeile 36'
                  : 'Using live Google Search grounding & comparing against Columns T/U (Row 36+)'}
              </p>
            </div>
          )}

          {!report && !isChecking && (
            <div className="py-14 px-4 max-w-lg mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'de'
                  ? 'Noch keine Preisprüfung durchgeführt'
                  : 'No Pricing Check Run Yet'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === 'de'
                  ? 'Prüft die aktuellen Abo-Preise in Deutschland (€) und den USA ($) für Meta, OpenAI, Anthropic und Google und vergleicht sie direkt mit Ihrem Google Sheet.'
                  : 'Checks current consumer subscription pricing in Germany (€) and the US ($) for Meta, OpenAI, Anthropic, and Google and compares directly against your Google Sheet.'}
              </p>
              <button
                type="button"
                onClick={() => void onRunCheck()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'de' ? 'Erste Preisprüfung starten' : 'Run First Pricing Check'}</span>
              </button>
            </div>
          )}

          {report && (
            <>
              {/* Alert Summary Banner */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  report.changedCount > 0
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
                    : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/25'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {report.changedCount > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {report.changedCount > 0
                        ? lang === 'de'
                          ? `${report.changedCount} Preisänderung(en) erkannt`
                          : `${report.changedCount} Price Change(s) Detected`
                        : lang === 'de'
                        ? 'Alle überwachten Preise sind aktuell'
                        : 'All Monitored Prices Are Up to Date'}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {lang === 'de' ? report.summaryDe : report.summaryEn}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                  <span className="px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                    {report.changedCount} {lang === 'de' ? 'geändert' : 'changed'}
                  </span>
                  {report.missingCount > 0 && (
                    <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                      {report.missingCount} {lang === 'de' ? 'fehlt' : 'missing'}
                    </span>
                  )}
                  <span className="px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold">
                    {report.unchangedCount} OK
                  </span>
                </div>
              </div>

              {/* 4-Lab Official Plans Snapshot */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {lang === 'de'
                    ? 'Aktuelle Live-Tarife der 4 KI-Labs (US & DE)'
                    : 'Current Live Consumer Plans Across the 4 Labs (US & DE)'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {LAB_ORDER.map((lab) => {
                    const labPlans = report.labs.filter((p) => p.lab === lab);
                    return (
                      <div
                        key={lab}
                        className={`p-3 rounded-xl border ${LAB_ACCENT[lab]} space-y-2`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${LAB_BADGE[lab]}`}>
                            {lab}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            {labPlans.length} {labPlans.length === 1 ? 'Plan' : 'Plans'}
                          </span>
                        </div>

                        {labPlans.length === 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {lang === 'de' ? 'Keine Tarifdaten gemeldet.' : 'No plan details returned.'}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {labPlans.map((plan, idx) => (
                              <div
                                key={`${lab}-${plan.planName}-${idx}`}
                                className="p-2 rounded-lg bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1 text-xs"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-slate-900 dark:text-white truncate">
                                    {plan.planName}
                                  </span>
                                  {plan.sourceUrl && (
                                    <a
                                      href={plan.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                                      title={plan.sourceUrl}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                                  <span className="text-slate-600 dark:text-slate-300">
                                    DE: <strong className="text-slate-900 dark:text-white">{plan.deMonthly || '—'}</strong>
                                  </span>
                                  <span className="text-slate-600 dark:text-slate-300">
                                    US: <strong className="text-slate-900 dark:text-white">{plan.usMonthly || '—'}</strong>
                                  </span>
                                </div>
                                {plan.billingNotes && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                    {plan.billingNotes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sheet Comparison & Diffs */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {lang === 'de'
                      ? `Abgleich mit Google Sheet (Spalte ${colDeLetter} DE${colUsLetter ? ` & Spalte ${colUsLetter} US` : ''}, ab Zeile 36)`
                      : `Sheet Comparison (Col ${colDeLetter} DE${colUsLetter ? ` & Col ${colUsLetter} US` : ''}, Row 36+)`}
                  </h3>

                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterMode('actionable')}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                        filterMode === 'actionable'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {lang === 'de' ? 'Änderungen / Fehlend' : 'Changes / Missing'} ({report.changedCount + report.missingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                        filterMode === 'all'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {lang === 'de' ? 'Alle geprüften' : 'All Checked'} ({report.diffs.length})
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          <th className="py-2 px-3 w-8"></th>
                          <th className="py-2 px-3">{lang === 'de' ? 'Modell & Zeile' : 'Model & Row'}</th>
                          <th className="py-2 px-3">Lab / Plan</th>
                          <th className="py-2 px-3">DE (Col {colDeLetter})</th>
                          <th className="py-2 px-3">US ({colUsLetter ? `Col ${colUsLetter}` : 'EN'})</th>
                          <th className="py-2 px-3">{lang === 'de' ? 'Details' : 'Details'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {visibleDiffs.map((item) => {
                          const isActionable = item.deStatus !== 'unchanged' || item.usStatus !== 'unchanged';
                          return (
                            <tr
                              key={item.modelId}
                              className={
                                item.deStatus === 'changed' || item.usStatus === 'changed'
                                  ? 'bg-amber-50/40 dark:bg-amber-950/15'
                                  : 'bg-white dark:bg-slate-900'
                              }
                            >
                              <td className="py-2.5 px-3 align-top">
                                {isActionable && (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(selectedIds[item.modelId])}
                                    onChange={() => handleToggleItem(item.modelId)}
                                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                )}
                              </td>
                              <td className="py-2.5 px-3 align-top">
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {item.displayName}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                  Row {item.sheetRowNumber}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 align-top">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${LAB_BADGE[item.lab]}`}>
                                  {item.lab}
                                </span>
                                {item.matchedPlanName && (
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                    {item.matchedPlanName}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 align-top font-mono">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-slate-500 dark:text-slate-400">
                                    {item.currentDe || '—'}
                                  </span>
                                  {item.deStatus !== 'unchanged' && (
                                    <>
                                      <ArrowRight className="w-3 h-3 text-slate-400" />
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {item.liveDe || '—'}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="mt-1">{renderStatusPill(item.deStatus)}</div>
                              </td>
                              <td className="py-2.5 px-3 align-top font-mono">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-slate-500 dark:text-slate-400">
                                    {item.currentUs || '—'}
                                  </span>
                                  {item.usStatus !== 'unchanged' && (
                                    <>
                                      <ArrowRight className="w-3 h-3 text-slate-400" />
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {item.liveUs || '—'}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="mt-1">{renderStatusPill(item.usStatus)}</div>
                              </td>
                              <td className="py-2.5 px-3 align-top max-w-xs">
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                                  {item.reason}
                                </p>
                                {item.sourceUrl && (
                                  <a
                                    href={item.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                                  >
                                    <span>{lang === 'de' ? 'Quelle' : 'Source'}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sheet Update Action Bar */}
                {(report.changedCount > 0 || report.missingCount > 0) && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {lang === 'de'
                        ? 'Schreibt ausschließlich in Spalten T/U ab Zeile 36 (Top-30 VSTACK in Zeilen 3–32 bleibt unberührt).'
                        : 'Writes strictly to Columns T/U from Row 36+ (Rows 3–32 Top-30 VSTACK stays untouched).'}
                    </span>

                    {accessToken ? (
                      <button
                        type="button"
                        disabled={selectedCount === 0}
                        onClick={handlePrepareSheetUpdates}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-45"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>
                          {lang === 'de'
                            ? `${selectedCount} ausgewählte Zeile(n) prüfen & ins Sheet schreiben`
                            : `Review & Write ${selectedCount} Selected Row(s) to Sheet`}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void onSignIn()}
                        disabled={isSigningIn}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <span>
                          {isSigningIn
                            ? lang === 'de'
                              ? 'Verbinde…'
                              : 'Connecting…'
                            : authUser
                            ? lang === 'de'
                              ? 'Google Sheets neu verbinden um zu schreiben'
                              : 'Reconnect Google Sheets to Apply'
                            : lang === 'de'
                            ? 'Mit Google anmelden um Änderungen ins Sheet zu übernehmen'
                            : 'Sign in with Google to Apply Changes'}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Grounded Search Sources */}
              {report.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    {lang === 'de' ? 'Verwendete Web-Quellen (Google Search Grounding)' : 'Grounded Web Sources'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {report.sources.map((src, i) => (
                      <a
                        key={`${src.uri}-${i}`}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors max-w-xs truncate"
                        title={src.uri}
                      >
                        <span className="truncate">{src.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Explicit Sheet Write Confirmation Dialog */}
        {pendingWrite && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'de'
                      ? `${pendingWrite.length} Preiszelle(n) in Google Sheets schreiben?`
                      : `Write ${pendingWrite.length} pricing cell(s) to Google Sheets?`}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {lang === 'de'
                      ? 'Alle Updates erfolgen ausschließlich ab Zeile 36 in den Preisspalten T/U.'
                      : 'All updates target History rows (Row 36+) in pricing columns T/U only.'}
                  </p>
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-2">
                {pendingWrite.map((c, idx) => (
                  <div
                    key={`${c.cellRef}-${idx}`}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.label}</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {c.cellRef}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                      <div className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 break-words">
                        − {c.before}
                      </div>
                      <div className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 break-words">
                        + {c.after}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isWriting}
                  onClick={() => setPendingWrite(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {lang === 'de' ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isWriting}
                  onClick={() => void handleConfirmSheetWrite()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {isWriting
                      ? lang === 'de'
                        ? 'Schreibe…'
                        : 'Writing…'
                      : lang === 'de'
                      ? 'Bestätigen & schreiben'
                      : 'Confirm & Write'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
