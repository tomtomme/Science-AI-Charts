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
  LogOut,
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
  onSignOut?: () => Promise<void> | void;
  activeSpreadsheetId: string;
  onRefreshFromSheets: (spreadsheetIdOverride?: string) => Promise<void>;
  isSheetsConnected: boolean;
  apiAvailable?: boolean;
  onRetryConnection?: () => Promise<void>;
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
  onSignOut,
  activeSpreadsheetId,
  onRefreshFromSheets,
  isSheetsConnected,
  apiAvailable = true,
  onRetryConnection,
}) => {
  const [filterMode, setFilterMode] = useState<'actionable' | 'all'>('actionable');
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [pendingWrite, setPendingWrite] = useState<PendingSheetCellChange[] | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeSuccess, setWriteSuccess] = useState<string | null>(null);

  // Pre-select any rows with changed prices & pick sensible default filter whenever report updates
  useEffect(() => {
    if (!report) return;
    const next: Record<string, boolean> = {};
    let actionableCount = 0;
    for (const item of report.diffs) {
      const hasChange = item.deStatus === 'changed' || item.usStatus === 'changed';
      const hasMissing = item.deStatus === 'missing' || item.usStatus === 'missing';
      if (hasChange || hasMissing) {
        next[item.modelId] = hasChange;
        actionableCount++;
      }
    }
    setSelectedIds(next);
    setFilterMode(actionableCount > 0 ? 'actionable' : 'all');
  }, [report]);

  useEffect(() => {
    if (isOpen) {
      setWriteError(null);
      setWriteSuccess(null);
      setPendingWrite(null);
    }
  }, [isOpen]);

  const effectiveReport = isSheetsConnected ? report : null;

  const layout = loadedData.columnLayout;
  const colDeIdx = layout?.colDePrice ?? 19;
  const colUsIdx = layout?.colUsPrice ?? null;
  const colDeLetter = columnIndexToA1(colDeIdx);
  const colUsLetter = colUsIdx !== null ? columnIndexToA1(colUsIdx) : null;
  const sheetTitle = loadedData.activeSheetTitle || 'Sheet1';

  const hasActionable = effectiveReport
    ? effectiveReport.changedCount + effectiveReport.missingCount > 0
    : false;

  const visibleDiffs = useMemo(() => {
    if (!effectiveReport) return [];
    if (filterMode === 'all' || !hasActionable) return effectiveReport.diffs;
    return effectiveReport.diffs.filter(
      (d) => d.deStatus !== 'unchanged' || d.usStatus !== 'unchanged'
    );
  }, [effectiveReport, filterMode, hasActionable]);

  const selectedCount = useMemo(() => {
    if (!effectiveReport) return 0;
    return effectiveReport.diffs.filter((d) => selectedIds[d.modelId]).length;
  }, [effectiveReport, selectedIds]);

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
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                effectiveReport && effectiveReport.changedCount > 0
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {lang === 'de' ? 'KI-Preischecker' : 'AI Price Checker'}
              </h2>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 shrink-0" />
                <span>{effectiveReport ? formatTimestamp(effectiveReport.checkedAt) : '—'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dailyAutoEnabled}
                onChange={(e) => onToggleDailyAuto(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Auto (24h)</span>
            </label>

            <button
              type="button"
              onClick={() => void onRunCheck()}
              disabled={isChecking || !apiAvailable || !isSheetsConnected}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>
                {isChecking
                  ? lang === 'de'
                    ? 'Prüfe…'
                    : 'Checking…'
                  : lang === 'de'
                  ? 'Prüfen'
                  : 'Check'}
              </span>
            </button>

            {accessToken && onSignOut && (
              <button
                type="button"
                onClick={() => void onSignOut()}
                title={lang === 'de' ? 'Von Google abmelden' : 'Sign out of Google'}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={lang === 'de' ? 'Von Google abmelden' : 'Sign out of Google'}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}

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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
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

          {!apiAvailable && !isChecking && (
            <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'de'
                  ? 'Preischecker benötigt Full-Stack-Server'
                  : 'Price Checker Requires Full-Stack Server'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === 'de'
                  ? 'In rein statischem Hosting (z. B. GitHub Pages oder „vite preview“) existiert kein /api-Backend für Live-Abrufe und Gemini API. Öffnen Sie die Full-Stack-App in AI Studio oder starten Sie lokal mit „npm run dev“.'
                  : 'Static hosting (such as GitHub Pages or vite preview) has no /api backend for live fetches or Gemini API calls. Open the full-stack app in AI Studio or run “npm run dev” locally.'}
              </p>
              {onRetryConnection && (
                <button
                  type="button"
                  onClick={() => void onRetryConnection()}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === 'de' ? 'Serververbindung testen' : 'Retry Server Connection'}</span>
                </button>
              )}
            </div>
          )}

          {apiAvailable && !isSheetsConnected && (
            <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'de'
                    ? 'Mit Google Sheets verbinden'
                    : 'Connect to Google Sheets'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'de'
                    ? 'Damit immer gegen Ihr aktuelles Live-Google-Sheet geprüft wird (ohne veraltete CSV-Zwischenstände), melden Sie sich bitte direkt hier mit Google an.'
                    : 'Sign in with Google right here so live pricing is compared strictly against your live Google Sheet (with no stale CSV fallback data).'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onSignIn()}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-55"
              >
                <svg className="w-4 h-4 block shrink-0" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                <span>
                  {isSigningIn
                    ? lang === 'de'
                      ? 'Verbinde mit Google…'
                      : 'Signing in…'
                    : lang === 'de'
                    ? 'Mit Google anmelden & prüfen'
                    : 'Sign in with Google & Check'}
                </span>
              </button>
            </div>
          )}

          {apiAvailable && isSheetsConnected && !effectiveReport && isChecking && (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'de'
                  ? 'Durchsuche aktuelle US- ($) & DE-Preise (€) für Meta, OpenAI, Anthropic und Google…'
                  : 'Searching current US ($) & DE (€) pricing for Meta, OpenAI, Anthropic, and Google…'}
              </p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {lang === 'de'
                  ? 'Vergleicht direkt mit Ihrem verbundenen Google Sheet (Spalten T/U ab Zeile 36)'
                  : 'Comparing directly against your connected Google Sheet (Columns T/U, Row 36+)'}
              </p>
            </div>
          )}

          {apiAvailable && isSheetsConnected && !effectiveReport && !isChecking && (
            <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'de'
                  ? 'Noch keine Preisprüfung durchgeführt'
                  : 'No Pricing Check Run Yet'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === 'de'
                  ? 'Prüft die aktuellen Abo-Preise in Deutschland (€) und den USA ($) für Meta, OpenAI, Anthropic und Google und vergleicht sie direkt mit Ihrem verbundenen Google Sheet.'
                  : 'Checks current subscription pricing in Germany (€) and the US ($) for Meta, OpenAI, Anthropic, and Google and compares directly against your connected Google Sheet.'}
              </p>
              <button
                type="button"
                onClick={() => void onRunCheck()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'de' ? 'Preisprüfung starten' : 'Run Pricing Check'}</span>
              </button>
            </div>
          )}

          {apiAvailable && isSheetsConnected && effectiveReport && (
            <>
              {/* Compact Status Strip */}
              <div
                className={`px-3.5 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                  effectiveReport.changedCount > 0
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
                    : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/25'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {effectiveReport.changedCount > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  <span className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                    <strong className="font-bold text-slate-900 dark:text-white">
                      {effectiveReport.changedCount > 0
                        ? lang === 'de'
                          ? `${effectiveReport.changedCount} Abweichung(en):`
                          : `${effectiveReport.changedCount} Change(s):`
                        : lang === 'de'
                        ? 'Alle Preise aktuell:'
                        : 'All prices up to date:'}
                    </strong>{' '}
                    {lang === 'de' ? effectiveReport.summaryDe : effectiveReport.summaryEn}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                  {effectiveReport.changedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                      {effectiveReport.changedCount} {lang === 'de' ? 'geändert' : 'changed'}
                    </span>
                  )}
                  {effectiveReport.missingCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                      {effectiveReport.missingCount} {lang === 'de' ? 'fehlt' : 'missing'}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold">
                    {effectiveReport.unchangedCount} OK
                  </span>
                </div>
              </div>

              {/* 4-Lab Compact Plans Grid */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {lang === 'de' ? 'Aktuelle Tarife (DE / US)' : 'Current Plans (DE / US)'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {LAB_ORDER.map((lab) => {
                    const labPlans = effectiveReport.labs.filter((p) => p.lab === lab);
                    const labUrl =
                      labPlans.find((p) => p.sourceUrl)?.sourceUrl ||
                      effectiveReport.sources.find((s) => s.title.startsWith(`${lab}:`))?.uri;
                    return (
                      <div
                        key={lab}
                        className={`p-2.5 rounded-xl border ${LAB_ACCENT[lab]} space-y-2`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${LAB_BADGE[lab]}`}>
                            {lab}
                          </span>
                          {labUrl && (
                            <a
                              href={labUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                              title={labUrl}
                            >
                              <span>{lang === 'de' ? 'Quellen' : 'Source'}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        {labPlans.length === 0 ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {lang === 'de' ? 'Keine Daten.' : 'No data.'}
                          </p>
                        ) : (
                          <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70 rounded-lg bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 px-2">
                            {labPlans.map((plan, idx) => (
                              <div
                                key={`${lab}-${plan.planName}-${idx}`}
                                className="py-1.5 space-y-0.5 text-[11px]"
                              >
                                <div className="flex items-baseline justify-between gap-1.5">
                                  {plan.sourceUrl ? (
                                    <a
                                      href={plan.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
                                      title={plan.sourceUrl}
                                    >
                                      {plan.planName.replace(/^(ChatGPT|Claude|Google AI)\s+/i, '')}
                                    </a>
                                  ) : (
                                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                                      {plan.planName.replace(/^(ChatGPT|Claude|Google AI)\s+/i, '')}
                                    </span>
                                  )}
                                  <span className="font-mono text-[11px] shrink-0 text-slate-700 dark:text-slate-200">
                                    <strong>{plan.deMonthly || '—'}</strong>
                                    <span className="text-slate-400 mx-1">/</span>
                                    <span>{plan.usMonthly || '—'}</span>
                                  </span>
                                </div>
                                {plan.billingNotes && (
                                  <p
                                    className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate"
                                    title={plan.billingNotes}
                                  >
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

              {/* Compact Sheet Comparison Table */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {lang === 'de'
                      ? `Sheet-Abgleich (${colDeLetter} / ${colUsLetter || 'US'} · ab Z. 36)`
                      : `Sheet Diff (${colDeLetter} / ${colUsLetter || 'US'} · Row 36+)`}
                  </h3>

                  {hasActionable && (
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setFilterMode('actionable')}
                        className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-colors ${
                          filterMode === 'actionable'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {lang === 'de' ? 'Änderungen' : 'Changes'} ({effectiveReport.changedCount + effectiveReport.missingCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode('all')}
                        className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer transition-colors ${
                          filterMode === 'all'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {lang === 'de' ? 'Alle' : 'All'} ({effectiveReport.diffs.length})
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {hasActionable && <th className="py-1.5 px-2.5 w-7"></th>}
                          <th className="py-1.5 px-3">{lang === 'de' ? 'Modell' : 'Model'}</th>
                          <th className="py-1.5 px-3">{lang === 'de' ? 'Lab · Tarif' : 'Lab · Plan'}</th>
                          <th className="py-1.5 px-3">DE ({colDeLetter})</th>
                          <th className="py-1.5 px-3">US ({colUsLetter || 'EN'})</th>
                          <th className="py-1.5 px-3">{lang === 'de' ? 'Notiz' : 'Note'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                        {visibleDiffs.map((item) => {
                          const isActionable = item.deStatus !== 'unchanged' || item.usStatus !== 'unchanged';
                          const isChanged = item.deStatus === 'changed' || item.usStatus === 'changed';
                          return (
                            <tr
                              key={item.modelId}
                              className={
                                isChanged
                                  ? 'bg-amber-50/45 dark:bg-amber-950/15'
                                  : 'bg-white dark:bg-slate-900'
                              }
                            >
                              {hasActionable && (
                                <td className="py-2 px-2.5 align-middle">
                                  {isActionable && (
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selectedIds[item.modelId])}
                                      onChange={() => handleToggleItem(item.modelId)}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  )}
                                </td>
                              )}
                              <td className="py-2 px-3 align-middle whitespace-nowrap">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {item.displayName}
                                </span>
                                <span className="ml-1.5 text-[10px] font-mono text-slate-400">
                                  #{item.sheetRowNumber}
                                </span>
                              </td>
                              <td className="py-2 px-3 align-middle whitespace-nowrap">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${LAB_BADGE[item.lab]}`}>
                                  {item.lab}
                                </span>
                                {item.matchedPlanName && (
                                  <span className="ml-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                    {item.matchedPlanName.replace(/^(ChatGPT|Claude|Google AI)\s+/i, '')}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 align-middle font-mono whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  {item.deStatus === 'unchanged' ? (
                                    <span className="text-slate-700 dark:text-slate-200">{item.currentDe || '—'}</span>
                                  ) : (
                                    <>
                                      <span className="text-slate-400 line-through">{item.currentDe || '—'}</span>
                                      <ArrowRight className="w-3 h-3 text-slate-400" />
                                      <span className="font-bold text-slate-900 dark:text-white">{item.liveDe || '—'}</span>
                                      {renderStatusPill(item.deStatus)}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 align-middle font-mono whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  {item.usStatus === 'unchanged' ? (
                                    <span className="text-slate-700 dark:text-slate-200">{item.currentUs || '—'}</span>
                                  ) : (
                                    <>
                                      <span className="text-slate-400 line-through">{item.currentUs || '—'}</span>
                                      <ArrowRight className="w-3 h-3 text-slate-400" />
                                      <span className="font-bold text-slate-900 dark:text-white">{item.liveUs || '—'}</span>
                                      {renderStatusPill(item.usStatus)}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 align-middle max-w-[220px]">
                                <span
                                  className="block truncate text-[11px] text-slate-500 dark:text-slate-400"
                                  title={item.reason}
                                >
                                  {item.reason || 'OK'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sheet Update Action Bar */}
                {(effectiveReport.changedCount > 0 || effectiveReport.missingCount > 0) && (
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
