import React from 'react';
import { Bell, FileSpreadsheet, Github, RefreshCw } from 'lucide-react';
import { GITHUB_REPO_URL } from '../data/rawCsvFallback';
import { LoadedDatasets } from '../services/dataService';
import { PricingCheckReport } from '../types/pricingMonitor';
import { GdpxCheckReport } from '../types/gdpxMonitor';
import { ValsCheckReport } from '../types/valsMonitor';
import { SimpleBenchCheckReport } from '../types/simpleBenchMonitor';
import { IntegrityCheckReport } from '../types/integrityMonitor';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { AuthorSocialSubtitle } from './AuthorSocialIcons';
import { Tooltip } from './Tooltip';

interface AppFooterProps {
  lang: Language;
  loadedData: LoadedDatasets;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  onSync: () => void;
  activeSpreadsheetId: string;
  onOpenCheckerModal: () => void;
  totalAlerts: number;
  isAnyMonitorChecking: boolean;
  allSyncedOk: boolean;
  pricingReport: PricingCheckReport | null;
  isPricingDiffValidForSheet: boolean;
  gdpxReport: GdpxCheckReport | null;
  isGdpxDiffValidForSheet: boolean;
  valsReport: ValsCheckReport | null;
  isValsDiffValidForSheet: boolean;
  simpleBenchReport: SimpleBenchCheckReport | null;
  isSimpleBenchDiffValidForSheet: boolean;
  integrityReport: IntegrityCheckReport | null;
  isIntegrityDiffValidForSheet: boolean;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  lang,
  loadedData,
  lastSyncedAt,
  isSyncing,
  onSync,
  activeSpreadsheetId,
  onOpenCheckerModal,
  totalAlerts,
  isAnyMonitorChecking,
  allSyncedOk,
  pricingReport,
  isPricingDiffValidForSheet,
  gdpxReport,
  isGdpxDiffValidForSheet,
  valsReport,
  isValsDiffValidForSheet,
  simpleBenchReport,
  isSimpleBenchDiffValidForSheet,
  integrityReport,
  isIntegrityDiffValidForSheet,
}) => {
  const t = TRANSLATIONS[lang];

  const formatSyncDate = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-3">
      <div className="w-full max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
        {/* Left: Dataset Source, Last Sync & Author / Social Links (Cell O1) */}
        <div className="flex flex-col items-center sm:items-start gap-1.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Science-AI Benchmarks
            </span>
            <span className="text-slate-400 dark:text-slate-700">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  loadedData.dataSource === 'sheets_api'
                    ? 'bg-emerald-500'
                    : loadedData.isLive
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
              />
              <span>
                {loadedData.dataSource === 'sheets_api'
                  ? `Sheets API (${loadedData.activeSheetTitle || 'Live'})`
                  : loadedData.dataSource === 'csv'
                  ? 'CSV Live'
                  : 'Snapshot'}
              </span>
            </span>
            {lastSyncedAt && (
              <>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span>
                  {t.lastSync}:{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {formatSyncDate(lastSyncedAt)}
                  </strong>
                </span>
              </>
            )}
          </div>
          <AuthorSocialSubtitle authorMeta={loadedData.headerMeta?.authorMeta} lang={lang} />
        </div>

        {/* Right: Sync, Unified Checker, Data Source Link & Code Source Link */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
          {/* Sync */}
          <Tooltip
            title="Google Sheets Sync"
            badge={
              isSyncing
                ? t.syncingText
                : loadedData.dataSource === 'sheets_api'
                ? 'Sheets API'
                : loadedData.isLive
                ? 'CSV Live'
                : 'Fallback'
            }
            content={
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400 font-medium">{t.lastSync}:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {formatSyncDate(lastSyncedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400 font-medium">
                    {lang === 'de' ? 'Quelle:' : 'Source:'}
                  </span>
                  <span className="font-mono text-blue-300 font-semibold">
                    {loadedData.dataSource === 'sheets_api'
                      ? `Google Sheets API (${loadedData.activeSheetTitle || 'Live'})`
                      : loadedData.dataSource === 'csv'
                      ? 'Public CSV'
                      : 'Embedded Snapshot'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 border-t border-slate-700/60 pt-1 leading-normal">
                  {t.autoSyncNotice}
                </div>
              </div>
            }
            position="top"
            align="center"
            width="w-64"
          >
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              aria-label={t.syncButtonTitle}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isSyncing
                    ? 'animate-spin text-blue-500'
                    : loadedData.dataSource === 'sheets_api'
                    ? 'text-emerald-500'
                    : ''
                }`}
              />
              <span>{isSyncing ? t.syncingText : 'Sync'}</span>
            </button>
          </Tooltip>

          {/* Unified Preis-, GDPx-, Vals-, SimpleBench- & Integrity-Prüfer */}
          <Tooltip
            title={
              lang === 'de'
                ? 'Preis-, GDPx-, Vals-, SimpleBench- & Integrity-Prüfer'
                : 'Plans, Price, GDPx, Vals, SimpleBench & Integrity Checker'
            }
            badge={
              isAnyMonitorChecking
                ? lang === 'de'
                  ? 'Prüfe…'
                  : 'Checking…'
                : totalAlerts > 0
                ? `${totalAlerts} Diff`
                : allSyncedOk
                ? 'OK'
                : lang === 'de'
                ? '5 Prüfer'
                : '5 Checks'
            }
            content={
              <div className="space-y-1 text-xs">
                <div>
                  {isPricingDiffValidForSheet && pricingReport
                    ? lang === 'de'
                      ? pricingReport.summaryDe
                      : pricingReport.summaryEn
                    : lang === 'de'
                    ? 'Aktuelle DE/US Browser-Chat-Tarife & Preis-Diffs.'
                    : 'Current DE/US browser chat plans & pricing diffs.'}
                </div>
                <div className="border-t border-slate-700/50 pt-1">
                  {isGdpxDiffValidForSheet && gdpxReport
                    ? lang === 'de'
                      ? gdpxReport.summaryDe
                      : gdpxReport.summaryEn
                    : lang === 'de'
                    ? 'Überwacht gdpx.semianalysis.com auf Neuzugänge.'
                    : 'Monitors gdpx.semianalysis.com for new LLMs.'}
                </div>
                <div className="border-t border-slate-700/50 pt-1">
                  {isValsDiffValidForSheet && valsReport
                    ? lang === 'de'
                      ? valsReport.summaryDe
                      : valsReport.summaryEn
                    : lang === 'de'
                    ? 'Prüft Vals Index v2.2 auf Abweichungen.'
                    : 'Checks Vals Index v2.2 for updates.'}
                </div>
                <div className="border-t border-slate-700/50 pt-1">
                  {isSimpleBenchDiffValidForSheet && simpleBenchReport
                    ? lang === 'de'
                      ? simpleBenchReport.summaryDe
                      : simpleBenchReport.summaryEn
                    : lang === 'de'
                    ? 'Prüft simple-bench.com auf Abweichungen.'
                    : 'Checks simple-bench.com for updates.'}
                </div>
                <div className="border-t border-slate-700/50 pt-1">
                  {isIntegrityDiffValidForSheet && integrityReport
                    ? lang === 'de'
                      ? integrityReport.summaryDe
                      : integrityReport.summaryEn
                    : lang === 'de'
                    ? 'Überwacht integrity-bench.com ("Table") auf Abweichungen.'
                    : 'Monitors integrity-bench.com ("Table") for updates.'}
                </div>
              </div>
            }
            position="top"
            align="center"
            width="w-80"
          >
            <button
              type="button"
              onClick={onOpenCheckerModal}
              className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border ${
                totalAlerts > 0
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              aria-label={
                lang === 'de'
                  ? 'Preis-, GDPx-, Vals-, SimpleBench- & Integrity-Prüfer öffnen'
                  : 'Open price, GDPx, Vals, SimpleBench & integrity checker'
              }
            >
              <Bell
                className={`w-3.5 h-3.5 ${
                  isAnyMonitorChecking
                    ? 'animate-pulse text-blue-500'
                    : totalAlerts > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : allSyncedOk
                    ? 'text-emerald-500'
                    : 'text-slate-500'
                }`}
              />
              <span>{lang === 'de' ? 'Prüfer' : 'Checker'}</span>
              {totalAlerts > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-xs leading-[18px] text-center font-mono font-bold bg-amber-600 text-white">
                  {totalAlerts}
                </span>
              )}
            </button>
          </Tooltip>

          {/* Data Source Link */}
          <Tooltip content={t.googleSheetOpen} position="top" align="right" width="w-44">
            <a
              href={`https://docs.google.com/spreadsheets/d/${activeSpreadsheetId}/edit?gid=${loadedData.activeSheetId ?? 170267419}#gid=${loadedData.activeSheetId ?? 170267419}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              aria-label={t.googleSheetOpen}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Data Source</span>
            </a>
          </Tooltip>

          {/* Code Source Link */}
          <Tooltip content={t.githubRepoOpen} position="top" align="right" width="w-36">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              aria-label={t.githubRepoOpen}
            >
              <Github className="w-3.5 h-3.5" />
              <span>Code Source</span>
            </a>
          </Tooltip>
        </div>
      </div>
    </footer>
  );
};
