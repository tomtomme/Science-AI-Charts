import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CreditCard, ExternalLink } from 'lucide-react';
import { MonitoredLab, LabPlanInfo, GroundingSource } from '../../types/pricingMonitor';
import { Language } from '../../utils/i18n';
import { roundCurrencyString, roundCurrencyTokensInText } from '../../utils/priceFormat';

const LAB_ORDER: MonitoredLab[] = [
  'OpenAI',
  'Anthropic',
  'Google',
  'Meta',
  'xAI',
  'Moonshot',
];

const LAB_DISPLAY_LABEL: Record<MonitoredLab, string> = {
  OpenAI: 'OpenAI',
  Anthropic: 'Anthropic',
  Google: 'Google',
  Meta: 'Meta',
  xAI: 'xAI (Grok)',
  Moonshot: 'Moonshot (Kimi)',
};

export const LAB_ACCENT: Record<MonitoredLab, string> = {
  OpenAI: 'border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/60 dark:bg-emerald-950/20',
  Anthropic: 'border-amber-200 dark:border-amber-900/70 bg-amber-50/60 dark:bg-amber-950/20',
  Google: 'border-blue-200 dark:border-blue-900/70 bg-blue-50/60 dark:bg-blue-950/20',
  Meta: 'border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/60 dark:bg-indigo-950/20',
  xAI: 'border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/40',
  Moonshot: 'border-cyan-200 dark:border-cyan-900/70 bg-cyan-50/60 dark:bg-cyan-950/20',
};

export const LAB_BADGE: Record<MonitoredLab, string> = {
  OpenAI: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300',
  Anthropic: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300',
  Google: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300',
  Meta: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300',
  xAI: 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100',
  Moonshot: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300',
};

interface PlansOverviewGridProps {
  lang: Language;
  displayedLabs: LabPlanInfo[];
  displayedSources: GroundingSource[];
}

export const PlansOverviewGrid: React.FC<PlansOverviewGridProps> = ({
  lang,
  displayedLabs,
  displayedSources,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer"
        title={
          lang === 'de'
            ? 'Top-10-Labs mit Browser-Chat-Abos pro Monat (ohne reine CLI-/API-Tarife)'
            : 'Top-10 labs with monthly consumer browser-chat plans (CLI/API-only excluded)'
        }
      >
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          )}
          <CreditCard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{lang === 'de' ? 'Tarif-Übersicht (DE / US)' : 'Plan Overview (DE / US)'}</span>
        </span>
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {LAB_ORDER.length} Labs · {displayedLabs.length}{' '}
          {lang === 'de' ? 'Tarife' : 'Plans'}
        </span>
      </button>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {LAB_ORDER.map((lab) => {
            const labPlans = displayedLabs.filter((p) => p.lab === lab);
            const labUrl =
              labPlans.find((p) => p.sourceUrl)?.sourceUrl ||
              displayedSources.find((s) => s.title.startsWith(`${lab}:`))?.uri;
            return (
              <div key={lab} className={`p-2 rounded-lg border ${LAB_ACCENT[lab]} space-y-1.5`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${LAB_BADGE[lab]}`}>
                    {LAB_DISPLAY_LABEL[lab]}
                  </span>
                  {labUrl && (
                    <a
                      href={labUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                      title={labUrl}
                    >
                      <span>{lang === 'de' ? 'Quelle' : 'Source'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {labPlans.length === 0 ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {lang === 'de' ? 'Keine Daten.' : 'No data.'}
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70 rounded-md bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 px-2">
                    {labPlans.map((plan, idx) => (
                      <div key={`${lab}-${plan.planName}-${idx}`} className="py-1 text-xs">
                        <div className="flex items-baseline justify-between gap-1.5">
                          {plan.sourceUrl ? (
                            <a
                              href={plan.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
                              title={
                                plan.billingNotes
                                  ? roundCurrencyTokensInText(plan.billingNotes)
                                  : plan.sourceUrl
                              }
                            >
                              {plan.planName.replace(/^(ChatGPT|Claude|Google AI|Grok|Kimi)\s+/i, '')}
                            </a>
                          ) : (
                            <span
                              className="font-semibold text-slate-900 dark:text-white truncate"
                              title={
                                plan.billingNotes
                                  ? roundCurrencyTokensInText(plan.billingNotes)
                                  : undefined
                              }
                            >
                              {plan.planName.replace(/^(ChatGPT|Claude|Google AI|Grok|Kimi)\s+/i, '')}
                            </span>
                          )}
                          <span className="font-mono tabular-nums text-[11px] shrink-0 text-slate-700 dark:text-slate-200">
                            <strong>{plan.deMonthly ? roundCurrencyString(plan.deMonthly) : '—'}</strong>
                            <span className="text-slate-500 dark:text-slate-400 mx-0.5">/</span>
                            <span>{plan.usMonthly ? roundCurrencyString(plan.usMonthly) : '—'}</span>
                          </span>
                        </div>
                        {plan.billingNotes && (
                          <p
                            className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate"
                            title={roundCurrencyTokensInText(plan.billingNotes)}
                          >
                            {roundCurrencyTokensInText(plan.billingNotes)}
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
      )}
    </div>
  );
};
