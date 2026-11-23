import React from 'react';
import { ExternalLink, Terminal, Wrench } from 'lucide-react';
import { LabEntry, ModelRecord } from '../../types';
import { LabPlanInfo } from '../../types/pricingMonitor';
import { matchMonitoredLabKey } from '../../data/pricingPlansFallback';
import { getSubscriptionBookingUrl, resolveLabTierChatUrl } from '../../data/subscriptionLinks';
import { getSizeFilterTiers, PARAMETER_TIERS, WEIGHTS_CONCEPTS } from '../../data/labMatrixData';
import {
  isZeroPriceString,
  normalizePricingLabKey,
  resolveLabPricingSummary,
  resolveTierRowPrice,
  TierRowPriceInfo,
} from '../../utils/labMatrixPricing';
import { roundCurrencyString, roundCurrencyTokensInText } from '../../utils/priceFormat';
import { Tooltip } from '../Tooltip';

/**
 * Visual mini scale meter gauge indicating model parameter size (1 to 5 bars)
 */
const MiniScaleMeter: React.FC<{ level: number; colorClass?: string }> = ({
  level,
  colorClass = 'bg-blue-500',
}) => {
  return (
    <div className="flex items-end gap-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((bar) => {
        const heightPct = `${bar * 20}%`;
        const isActive = bar <= level;
        return (
          <span
            key={bar}
            className={`w-0.5 rounded-full transition-colors ${
              isActive ? colorClass : 'bg-slate-200 dark:bg-slate-700'
            }`}
            style={{ height: heightPct }}
          />
        );
      })}
    </div>
  );
};

export interface LabMatrixCardProps {
  lab: LabEntry;
  lang: 'de' | 'en';
  isExpanded: boolean;
  onToggleExpand: () => void;
  isSimplifiedView: boolean;
  sizeFilter: string;
  modelsByLabKey: Map<string, ModelRecord[]>;
  pricingPlans: LabPlanInfo[];
  onSelectLabForBenchmark?: (creatorName: string) => void;
  onScrollToWeightsExplainer: (targetId?: string) => void;
}

export const LabMatrixCard: React.FC<LabMatrixCardProps> = ({
  lab,
  lang,
  isExpanded,
  onToggleExpand,
  isSimplifiedView,
  sizeFilter,
  modelsByLabKey,
  pricingPlans,
  onSelectLabForBenchmark,
  onScrollToWeightsExplainer,
}) => {
  // Collect available model size tiers for this lab, strictly ordered from smallest to largest
  const availableTiers = PARAMETER_TIERS.filter((tier) => {
    const val = lab.parameterSizes[tier.key];
    return Boolean(val && val.trim() && val.trim() !== '-');
  });

  // In simplified view (when size filter is active), show only the models in the selected size category or granular step
  const targetTiers = getSizeFilterTiers(sizeFilter);
  const displayTiers =
    isSimplifiedView && targetTiers.length > 0
      ? availableTiers.filter((tier) => targetTiers.includes(tier.key))
      : availableTiers;

  const labModelKey =
    normalizePricingLabKey(lab.creator) ||
    normalizePricingLabKey(lab.id) ||
    normalizePricingLabKey(lab.engineName);
  const matchedLabModels = modelsByLabKey.get(labModelKey) || [];
  const monitoredLab = matchMonitoredLabKey(lab.creator) || matchMonitoredLabKey(lab.id);
  const labConsumerPlans = monitoredLab
    ? pricingPlans.filter((p) => p.lab === monitoredLab)
    : [];

  const tierRowPrices = new Map<keyof LabEntry['parameterSizes'], TierRowPriceInfo>();
  for (const tier of displayTiers) {
    const val = lab.parameterSizes[tier.key];
    if (!val) continue;
    const rowPriceInfo = resolveTierRowPrice(
      lab,
      tier.key,
      val,
      matchedLabModels,
      labConsumerPlans,
      lang
    );
    if (rowPriceInfo) {
      tierRowPrices.set(tier.key, rowPriceInfo);
    }
  }

  const pricingSummary = resolveLabPricingSummary(
    lab,
    matchedLabModels,
    pricingPlans,
    tierRowPrices.size > 0,
    lang
  );

  return (
    <div
      className={`flex flex-col justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-xs hover:shadow-md ${
        isSimplifiedView ? 'p-3.5' : 'p-4'
      }`}
    >
      <div>
        {/* Lab Card Header */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl leading-none shrink-0" title={lab.country}>
              {lab.countryFlag}
            </span>
            <div className="min-w-0">
              {onSelectLabForBenchmark ? (
                <button
                  type="button"
                  onClick={() => onSelectLabForBenchmark(lab.creator)}
                  className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors text-left cursor-pointer"
                  title={lang === 'de' ? `Benchmark-Modelle von ${lab.creator} anzeigen` : `Show benchmark models for ${lab.creator}`}
                >
                  <span className="truncate">{lab.creator}</span>
                </button>
              ) : (
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {lab.creator}
                </h3>
              )}
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {lab.country}
              </div>
            </div>
          </div>

          {/* Top Status Badges: Gratis API + Open/Hybrid/Closed Weights */}
          {!isSimplifiedView && (pricingSummary?.freeApiBadge || lab.weightsType) && (
            <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
              {pricingSummary?.freeApiBadge && (() => {
                const freeBadge = pricingSummary.freeApiBadge;
                const freeClasses = `text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${
                  freeBadge.href
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/70 hover:border-blue-400 dark:hover:border-blue-600 hover:underline transition-colors cursor-pointer'
                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                }`;
                return freeBadge.href ? (
                  <a
                    href={freeBadge.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={freeBadge.title}
                    className={freeClasses}
                  >
                    {freeBadge.label}
                  </a>
                ) : (
                  <span title={freeBadge.title} className={freeClasses}>
                    {freeBadge.label}
                  </span>
                );
              })()}

              {lab.weightsType && (
                <button
                  type="button"
                  onClick={() => onScrollToWeightsExplainer(`weights-${lab.weightsType}`)}
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 cursor-pointer transition-transform hover:scale-105 ${
                    lab.weightsType === 'open'
                      ? 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800'
                      : lab.weightsType === 'hybrid'
                      ? 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                      : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                  title={
                    lab.weightsType === 'open'
                      ? (lang === 'de' ? WEIGHTS_CONCEPTS.open.tooltipDe : WEIGHTS_CONCEPTS.open.tooltipEn)
                      : lab.weightsType === 'hybrid'
                      ? (lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.tooltipDe : WEIGHTS_CONCEPTS.hybrid.tooltipEn)
                      : (lang === 'de' ? WEIGHTS_CONCEPTS.closed.tooltipDe : WEIGHTS_CONCEPTS.closed.tooltipEn)
                  }
                >
                  {lab.weightsType === 'open'
                    ? (lang === 'de' ? 'Offen' : 'Open')
                    : lab.weightsType === 'hybrid'
                    ? 'Hybrid'
                    : (lang === 'de' ? 'Geschlossen' : 'Closed')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Primary Engine / ChatBot name or Harness Only Lab */}
        {(lab.engineName || lab.harness) && lab.engineName !== '-' && (
          <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            {lab.group === 'harness' ? (
              <>
                <div className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold mb-0.5">
                  {lang === 'de' ? 'Agentensteuerung' : 'Agent Scaffolding & Execution Harness'}
                </div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate">
                  {lab.harness || lab.engineName}
                </div>
              </>
            ) : (
              <div
                className="text-sm font-semibold whitespace-nowrap truncate flex items-baseline gap-1.5"
                title={
                  (lab.famousFor || lab.specialties) && lab.specialties !== `Based on ${lab.basedOn}`
                    ? `${lab.engineName} chatbot family ${
                        lang === 'de' ? 'bekannt für' : 'famous for'
                      } ${lab.famousFor || lab.specialties}`
                    : `${lab.engineName} chatbot family`
                }
              >
                <span className="text-blue-600 dark:text-blue-400 shrink-0">
                  {lab.engineName}
                </span>
                <span className="text-xs font-normal text-slate-600 dark:text-slate-400 shrink-0">
                  chatbot family
                </span>
                {(lab.famousFor || lab.specialties) && lab.specialties !== `Based on ${lab.basedOn}` && (
                  <span className="text-xs font-normal text-slate-600 dark:text-slate-400 truncate flex items-baseline gap-1 min-w-0">
                    <span className="text-slate-600 dark:text-slate-400 font-normal shrink-0">
                      {lang === 'de' ? 'bekannt für' : 'famous for'}
                    </span>
                    <span className="text-slate-800 dark:text-slate-300 truncate">
                      {lab.famousFor || lab.specialties}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Group: Harness Only Labs Special Overview (hidden in simplified size view) */}
        {!isSimplifiedView && lab.group === 'harness' && (
          <div className="space-y-2 mb-3">
            {lab.form && (
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Form:</span>
                <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium text-slate-800 dark:text-slate-200">
                  {lab.form}
                </span>
              </div>
            )}
            {lab.note && (
              <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {lang === 'de' ? 'Hinweis: ' : 'Note: '}
                </span>
                <span>{lab.note}</span>
              </div>
            )}
          </div>
        )}

        {/* Group: Model Tweakers - Based on OpenWeights note (hidden in simplified size view) */}
        {!isSimplifiedView && lab.group === 'tweakers' && lab.basedOn && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 mb-2.5">
            <div className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">
              {lang === 'de' ? 'Basiert auf OpenWeights' : 'Based on Open Weights'}
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {lab.basedOn}
            </div>
          </div>
        )}

        {/* Fallback Famous for / Notes only if not already shown above with engineName */}
        {!isSimplifiedView && (!lab.engineName || lab.engineName === '-') && lab.group !== 'harness' && (lab.famousFor || lab.specialties) && lab.specialties !== `Based on ${lab.basedOn}` && (
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-2.5 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {lab.notesLabel?.toLowerCase().includes('note') || lab.group === 'contender' || lab.group === 'small'
                ? (lang === 'de' ? 'Hinweise: ' : 'Notes: ')
                : lab.famousFor
                ? (lang === 'de' ? 'Bekannt für: ' : 'Famous for: ')
                : (lang === 'de' ? 'Besonderheiten: ' : 'Specialties: ')}
            </span>
            <span>{lab.famousFor || lab.specialties}</span>
          </div>
        )}

        {/* Models */}
        {displayTiers.length > 0 && (
          <div className={`space-y-1 ${isSimplifiedView ? 'mb-2' : 'mb-3'}`}>
            <div className="flex flex-col gap-1">
              {displayTiers.map((tier) => {
                const modelVal = lab.parameterSizes[tier.key];
                if (!modelVal) return null;

                // Check open/closed status for this specific size or lab
                const isOpen =
                  lab.openWeights && lab.openWeights[tier.key] !== undefined
                    ? lab.openWeights[tier.key]
                    : lab.weightsType === 'open';

                // Check if this tier matches the active size category or granular step filter
                const isMatchingSizeFilter =
                  sizeFilter !== 'all' &&
                  getSizeFilterTiers(sizeFilter).includes(tier.key);

                const rowPriceInfo = tierRowPrices.get(tier.key);
                const rowPrice = rowPriceInfo?.price;
                const rowPlanLabel = rowPriceInfo?.planLabel;
                const modelChatUrl = resolveLabTierChatUrl({
                  lab,
                  tierKey: tier.key,
                  modelVal,
                  matchedModels: matchedLabModels,
                });
                const priceBookingUrl = rowPrice
                  ? getSubscriptionBookingUrl({
                      labOrCompany: lab.creator,
                      modelName: modelVal,
                      planText: rowPlanLabel || rowPrice,
                      priceText: rowPrice,
                      lang,
                      consumerPlans: labConsumerPlans,
                    })
                  : undefined;

                return (
                  <div
                    key={tier.key}
                    className={`group relative flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-all text-xs ${
                      isSimplifiedView
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 shadow-2xs'
                        : isMatchingSizeFilter
                        ? 'bg-blue-50/90 dark:bg-blue-950/60 border-2 border-blue-500 shadow-xs'
                        : 'bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    {/* Left: Mini Scale Meter + Friendly Tier Name */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <MiniScaleMeter level={tier.level} colorClass={tier.colorClass} />
                      <span
                        className={`font-bold text-xs cursor-help ${
                          isSimplifiedView
                            ? 'text-blue-900 dark:text-blue-200'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {lang === 'de' ? tier.nameDe : tier.nameEn}
                      </span>
                    </div>

                    {/* Hover Tooltip: Parameter count + Open/Closed weights status */}
                    <div className="absolute left-2 bottom-full mb-1.5 hidden group-hover:flex flex-wrap items-center gap-1.5 w-max max-w-[320px] px-2.5 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-lg text-xs font-mono pointer-events-none z-30">
                      <span className="font-bold">{lang === 'de' ? tier.nameDe : tier.nameEn}:</span>
                      <span>{lang === 'de' ? tier.paramCountDe : tier.paramCountEn}</span>
                      {!isSimplifiedView && (
                        <span
                          className={`text-xs font-sans font-semibold px-1.5 py-0.5 rounded-full border ${
                            isOpen
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 dark:bg-cyan-100 dark:text-cyan-800 dark:border-cyan-300'
                              : 'bg-slate-700/80 text-slate-300 border-slate-500/60 dark:bg-slate-200 dark:text-slate-700 dark:border-slate-300'
                          }`}
                        >
                          {isOpen
                            ? (lang === 'de' ? 'Offen' : 'Open')
                            : (lang === 'de' ? 'Geschlossen' : 'Closed')}
                        </span>
                      )}
                    </div>

                    {/* Right: Price directly left of the flush-right Model Name */}
                    <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                      {rowPrice && (() => {
                        const combinedLabel = rowPlanLabel ? `${rowPlanLabel}: ${rowPrice}` : rowPrice;
                        return priceBookingUrl ? (
                          <a
                            href={priceBookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono tabular-nums text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 hover:border-emerald-400 dark:hover:border-emerald-600 hover:underline shrink-0 transition-colors cursor-pointer"
                            title={
                              lang === 'de'
                                ? `${combinedLabel} — Abo buchen / Tarifseite öffnen`
                                : `${combinedLabel} — Book plan / open pricing page`
                            }
                          >
                            {rowPrice}
                          </a>
                        ) : (
                          <span
                            className="font-mono tabular-nums text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70 shrink-0"
                            title={
                              lang === 'de'
                                ? `Freischaltung / Preis (${combinedLabel})`
                                : `Unlock / Price (${combinedLabel})`
                            }
                          >
                            {rowPrice}
                          </span>
                        );
                      })()}

                      {modelChatUrl ? (
                        <a
                          href={modelChatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${modelVal} — ${lang === 'de' ? 'Chat öffnen' : 'Open chat'}`}
                          title={`${modelVal} — ${lang === 'de' ? 'Zum Chat öffnen' : 'Open chat'}`}
                          className={`group/chatlink inline-flex items-center justify-end gap-1 font-mono text-xs text-right min-w-0 text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-200 underline decoration-blue-400/45 hover:decoration-blue-500 underline-offset-2 transition-colors ${
                            isSimplifiedView ? 'font-bold' : 'font-semibold'
                          }`}
                        >
                          <span className="truncate">{modelVal}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-blue-500 dark:text-blue-400 group-hover/chatlink:translate-x-0.5 group-hover/chatlink:-translate-y-0.5 transition-transform" />
                        </a>
                      ) : (
                        <span
                          className={`font-mono text-xs text-right truncate min-w-0 ${
                            isSimplifiedView
                              ? 'font-bold text-slate-900 dark:text-slate-100'
                              : 'font-semibold text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {modelVal}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* General Pricing Summary Row (only for Top 10 labs; heading removed) */}
        {lab.group === 'top10' && pricingSummary && (pricingSummary.accessBadges.length > 0 || pricingSummary.primaryText) && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 space-y-1">
            {pricingSummary.accessBadges.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {pricingSummary.accessBadges.map((badge) => {
                  const badgeClasses = `text-xs font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${
                    badge.kind === 'paidOnly'
                      ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      : badge.href
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/70 hover:border-blue-400 dark:hover:border-blue-600 hover:underline transition-colors cursor-pointer'
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                  }`;
                  return badge.href ? (
                    <a
                      key={badge.kind}
                      href={badge.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={badge.title}
                      className={badgeClasses}
                    >
                      {badge.label}
                    </a>
                  ) : (
                    <span
                      key={badge.kind}
                      title={badge.title}
                      className={badgeClasses}
                    >
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            )}

            {pricingSummary.primaryText && (
              pricingSummary.consumerPlans.length > 0 ? (
                <Tooltip
                  title={`${lab.creator} · ${lang === 'de' ? 'Monatstarife (DE)' : 'Monthly Plans (US)'}`}
                  position="top"
                  align="left"
                  width="w-72"
                  className="w-full max-w-full"
                  content={
                    <div className="space-y-1 text-xs">
                      {pricingSummary.consumerPlans
                        .filter((plan) => {
                          const raw = lang === 'de' ? plan.deMonthly : plan.usMonthly;
                          return Boolean(raw && !isZeroPriceString(raw));
                        })
                        .map((plan, idx) => {
                          const localizedPrice = roundCurrencyString(
                            lang === 'de' ? plan.deMonthly : plan.usMonthly
                          );
                          const planHref =
                            getSubscriptionBookingUrl({
                              labOrCompany: lab.creator,
                              planText: plan.planName,
                              priceText: localizedPrice,
                              lang,
                              consumerPlans: pricingSummary.consumerPlans,
                            }) || plan.sourceUrl;
                          if (planHref) {
                            return (
                              <a
                                key={`${plan.planName}-${idx}`}
                                href={planHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-baseline justify-between gap-2 rounded px-1 -mx-1 py-0.5 hover:bg-slate-800/80 transition-colors cursor-pointer"
                              >
                                <span className="font-semibold text-slate-200 truncate">
                                  {plan.planName.replace(/^(ChatGPT|Claude|Google AI)\s+/i, '')}
                                </span>
                                <span className="font-mono tabular-nums text-emerald-300 underline decoration-emerald-400/50 shrink-0">
                                  {localizedPrice}
                                </span>
                              </a>
                            );
                          }
                          return (
                            <div key={`${plan.planName}-${idx}`} className="flex items-baseline justify-between gap-2">
                              <span className="font-semibold text-slate-200 truncate">
                                {plan.planName.replace(/^(ChatGPT|Claude|Google AI)\s+/i, '')}
                              </span>
                              <span className="font-mono tabular-nums text-slate-100 shrink-0">
                                {localizedPrice}
                              </span>
                            </div>
                          );
                        })}
                      {pricingSummary.subscriptionTiers && (
                        <div className="pt-1 mt-1 border-t border-slate-700/70 text-xs text-slate-300">
                          {lang === 'de' ? 'Alle Stufen:' : 'All tiers:'} {pricingSummary.subscriptionTiers}
                        </div>
                      )}
                    </div>
                  }
                >
                  <p className="w-full font-mono tabular-nums text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug cursor-help truncate">
                    {pricingSummary.primaryText}
                  </p>
                </Tooltip>
              ) : (
                <p
                  className={`font-mono tabular-nums text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug ${
                    isSimplifiedView ? 'truncate' : ''
                  }`}
                  title={pricingSummary.primaryText}
                >
                  {pricingSummary.primaryText}
                </p>
              )
            )}
          </div>
        )}

        {/* Tooling / Agents Collapsible Details (hidden in simplified view) */}
        {!isSimplifiedView && (lab.codingAgent || lab.dailyAgent || lab.harnessSdk || lab.subscriptionTiers) && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-full flex items-center justify-between py-1 text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold cursor-pointer transition-colors group select-none"
            >
              <span className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 group-hover:text-blue-500 transition-colors" />
                <span className="group-hover:underline">
                  {lang === 'de' ? 'Werkzeuge & Agenten' : 'Tooling & Agents'}
                </span>
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-normal normal-case tracking-normal flex items-center gap-1">
                <span>{isExpanded ? (lang === 'de' ? 'ausblenden' : 'hide') : (lang === 'de' ? 'Details' : 'Details')}</span>
                <span className="text-xs">{isExpanded ? '▲' : '▼'}</span>
              </span>
            </button>

            {/* Full tooling and agents revealed when clicked */}
            {isExpanded && (
              <div className="text-xs space-y-1.5 pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg transition-all">
                {lab.codingAgent && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-slate-600 dark:text-slate-400 text-xs shrink-0 font-medium">
                      {lang === 'de' ? 'Coding-Agent:' : 'Coding Agent:'}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {lab.codingAgent}
                    </span>
                  </div>
                )}
                {lab.dailyAgent && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-slate-600 dark:text-slate-400 text-xs shrink-0 font-medium">
                      {lang === 'de' ? 'Alltags-Agent:' : 'Daily Agent:'}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {lab.dailyAgent}
                    </span>
                  </div>
                )}
                {lab.harnessSdk && (
                  <div className="flex items-start gap-1.5 pt-0.5">
                    <span className="text-slate-600 dark:text-slate-400 text-xs shrink-0 font-medium">
                      {lang === 'de' ? 'Agentensteuerung / SDK:' : 'Harness / SDK:'}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {lab.harnessSdk}
                    </span>
                  </div>
                )}
                {lab.subscriptionTiers && (
                  <div className="flex items-start gap-1.5 pt-0.5">
                    <span className="text-slate-600 dark:text-slate-400 text-xs shrink-0 font-medium">
                      {lang === 'de' ? 'Abo-Stufen:' : 'Subscription Tiers:'}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {roundCurrencyTokensInText(lab.subscriptionTiers)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
