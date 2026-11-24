import React from 'react';
import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { PricingCheckReport, PricingDiffItem } from '../../types/pricingMonitor';
import { Language } from '../../utils/i18n';
import { roundCurrencyString, roundCurrencyTokensInText } from '../../utils/priceFormat';
import { LAB_BADGE } from './PlansOverviewGrid';

interface PricingDiffSectionProps {
  lang: Language;
  report: PricingCheckReport;
  actionableDiffs: PricingDiffItem[];
  selectedPriceIds: Record<string, boolean>;
  onTogglePriceItem: (modelId: string) => void;
}

export const PricingDiffSection: React.FC<PricingDiffSectionProps> = ({
  lang,
  report,
  actionableDiffs,
  selectedPriceIds,
  onTogglePriceItem,
}) => {
  const renderPriceStatusLabel = (status: PricingDiffItem['deStatus']) => {
    if (status === 'changed') {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
          {lang === 'de' ? 'Geändert' : 'Changed'}
        </span>
      );
    }
    if (status === 'missing') {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
          {lang === 'de' ? 'Fehlt' : 'Missing'}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <div
        className={`px-3.5 py-2 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 ${
          report.changedCount > 0
            ? 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
            : actionableDiffs.length > 0
            ? 'border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/25'
            : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/25'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {report.changedCount > 0 ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )}
          <span className="text-xs text-slate-800 dark:text-slate-200 leading-snug truncate">
            <strong className="font-bold text-slate-900 dark:text-white">
              {report.changedCount > 0
                ? lang === 'de'
                  ? `Preise: ${report.changedCount} Diff(s):`
                  : `Plans: ${report.changedCount} Diff(s):`
                : actionableDiffs.length > 0
                ? lang === 'de'
                  ? `Preise: ${actionableDiffs.length} fehlend:`
                  : `Plans: ${actionableDiffs.length} missing:`
                : lang === 'de'
                ? 'Preise OK:'
                : 'Plans OK:'}
            </strong>{' '}
            {roundCurrencyTokensInText(lang === 'de' ? report.summaryDe : report.summaryEn)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs shrink-0">
          {report.changedCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
              {report.changedCount} {lang === 'de' ? 'geändert' : 'changed'}
            </span>
          )}
          {report.missingCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
              {report.missingCount} {lang === 'de' ? 'fehlt' : 'missing'}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold">
            {report.unchangedCount} OK
          </span>
        </div>
      </div>

      {actionableDiffs.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-400">
                  <th className="py-1.5 px-2.5 w-7"></th>
                  <th className="py-1.5 px-3">{lang === 'de' ? 'Modell' : 'Model'}</th>
                  <th className="py-1.5 px-3">{lang === 'de' ? 'Lab · Tarif' : 'Lab · Plan'}</th>
                  <th className="py-1.5 px-3">DE</th>
                  <th className="py-1.5 px-3">US</th>
                  <th className="py-1.5 px-3">{lang === 'de' ? 'Notiz' : 'Note'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {actionableDiffs.map((item) => {
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
                      <td className="py-1.5 px-2.5 align-middle">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedPriceIds[item.modelId])}
                          onChange={() => onTogglePriceItem(item.modelId)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-1.5 px-3 align-middle whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {item.displayName}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 align-middle whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${LAB_BADGE[item.lab]}`}
                        >
                          {item.lab}
                        </span>
                        {item.matchedPlanName && (
                          <span className="ml-1.5 text-xs text-slate-700 dark:text-slate-300">
                            {item.matchedPlanName.replace(/^(ChatGPT|Claude|Google AI)\s+/i, '')}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 align-middle font-mono tabular-nums whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {item.deStatus === 'unchanged' ? (
                            <span className="text-slate-700 dark:text-slate-200">
                              {item.currentDe ? roundCurrencyString(item.currentDe) : '—'}
                            </span>
                          ) : (
                            <>
                              <span className="text-slate-600 dark:text-slate-400 line-through">
                                {item.currentDe ? roundCurrencyString(item.currentDe) : '—'}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                              <span className="font-bold text-slate-900 dark:text-white">
                                {item.liveDe ? roundCurrencyString(item.liveDe) : '—'}
                              </span>
                              {renderPriceStatusLabel(item.deStatus)}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-3 align-middle font-mono tabular-nums whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {item.usStatus === 'unchanged' ? (
                            <span className="text-slate-700 dark:text-slate-200">
                              {item.currentUs ? roundCurrencyString(item.currentUs) : '—'}
                            </span>
                          ) : (
                            <>
                              <span className="text-slate-600 dark:text-slate-400 line-through">
                                {item.currentUs ? roundCurrencyString(item.currentUs) : '—'}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                              <span className="font-bold text-slate-900 dark:text-white">
                                {item.liveUs ? roundCurrencyString(item.liveUs) : '—'}
                              </span>
                              {renderPriceStatusLabel(item.usStatus)}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-3 align-middle max-w-[200px]">
                        <span
                          className="block truncate text-xs text-slate-600 dark:text-slate-400"
                          title={item.reason ? roundCurrencyTokensInText(item.reason) : ''}
                        >
                          {item.reason ? roundCurrencyTokensInText(item.reason) : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
