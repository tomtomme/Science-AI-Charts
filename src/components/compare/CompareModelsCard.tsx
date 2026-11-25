import React, { useMemo } from 'react';
import { ExternalLink, Eye, EyeOff, Globe, Trophy, Crosshair } from 'lucide-react';
import { ModelRecord, ScoreMode } from '../../types';
import { Language } from '../../utils/i18n';
import { translateStoryline } from '../../utils/storylineHelper';
import {
  CompareSlot,
  CompareSummaryStats,
  SlotTheme,
  formatNumber,
  formatCompactPrice,
} from '../../utils/compareHelpers';
import { CompareModelSelector } from './CompareModelSelector';

export interface CompareModelsCardProps {
  title: string;
  activeScoreLabel?: string;
  activeSlots: { slot: CompareSlot; model: ModelRecord }[];
  sortedPrimaryScores: { slot: CompareSlot; model: ModelRecord; score: number | null }[];
  slotThemes: Record<CompareSlot, SlotTheme>;
  pickerModels: ModelRecord[];
  onSelectSlot: (slotIndex: number, modelId: string) => void;
  onSelectCompany?: (company: string) => void;
  openChatbotLabel: string;
  summaryStats: CompareSummaryStats;
  scoreMode: ScoreMode;
  scoreModeOldLabel: string;
  rankMap: Map<string, number>;
  lang: Language;
  hiddenSlots: Set<CompareSlot>;
  focusedSlot: CompareSlot | null;
  effectivePinnedSlot: CompareSlot | null;
  onHoverSlot: (slot: CompareSlot | null) => void;
  onPinSlot: (slot: CompareSlot | null) => void;
  onToggleVisibility: (slot: CompareSlot) => void;
  focusActionLabel?: string;
  hideActionLabel?: string;
  showActionLabel?: string;
}

export const CompareModelsCard: React.FC<CompareModelsCardProps> = ({
  title,
  activeScoreLabel,
  activeSlots,
  sortedPrimaryScores,
  slotThemes,
  pickerModels,
  onSelectSlot,
  onSelectCompany,
  openChatbotLabel,
  summaryStats,
  scoreMode,
  scoreModeOldLabel,
  rankMap,
  lang,
  hiddenSlots,
  focusedSlot,
  effectivePinnedSlot,
  onHoverSlot,
  onPinSlot,
  onToggleVisibility,
  focusActionLabel,
  hideActionLabel,
  showActionLabel,
}) => {
  const slotIndexMap = useMemo(() => {
    const map = new Map<CompareSlot, number>();
    activeSlots.forEach((s, idx) => map.set(s.slot, idx));
    return map;
  }, [activeSlots]);

  const validPrimaries = useMemo(
    () => sortedPrimaryScores.filter((p) => p.score !== null),
    [sortedPrimaryScores]
  );

  const topPrimaryScore = useMemo(
    () => (validPrimaries.length > 0 ? Math.max(...validPrimaries.map((p) => p.score as number)) : null),
    [validPrimaries]
  );

  const overallLeaders = useMemo(
    () =>
      topPrimaryScore !== null
        ? validPrimaries.filter((p) => topPrimaryScore - (p.score as number) < 0.05)
        : [],
    [validPrimaries, topPrimaryScore]
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-visible">
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 rounded-t-xl flex items-center justify-between gap-2 text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
        <span>{title}</span>
        <div className="flex items-center gap-2">
          {effectivePinnedSlot ? (
            <button
              type="button"
              onClick={() => onPinSlot(null)}
              className="text-xs normal-case font-sans font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {lang === 'de' ? 'Fokus lösen' : 'Clear focus'}
            </button>
          ) : (
            activeScoreLabel && (
              <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                {activeScoreLabel}
              </span>
            )
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {sortedPrimaryScores.map(({ slot, model, score }) => {
          const theme = slotThemes[slot];
          const isHidden = hiddenSlots.has(slot);
          const isPinned = effectivePinnedSlot === slot;
          const isFocused = focusedSlot === slot;
          const rank = rankMap.get(model.id);
          const slotIdx = slotIndexMap.get(slot) ?? 0;
          const priceText = formatCompactPrice(model, lang);
          const chatUrl = model.chatLink || model.modelUrl;
          const storylineText = translateStoryline(model.storyline, lang)
            .replace(/^["„“'»«\s]+/, '')
            .replace(/["„“'»«\s]+$/, '')
            .trim();

          const edge = summaryStats.bestEdge[slot];
          const winsCount = summaryStats.wins[slot];

          const deltaVsTop =
            score !== null && topPrimaryScore !== null ? score - topPrimaryScore : null;
          const isLeader =
            score !== null &&
            topPrimaryScore !== null &&
            topPrimaryScore - score < 0.05 &&
            validPrimaries.length >= 2 &&
            overallLeaders.length < validPrimaries.length;
          const isAllTied =
            validPrimaries.length >= 2 && overallLeaders.length === validPrimaries.length;

          const otherMap = new Map<string, CompareSlot>();
          for (const s of activeSlots) {
            if (s.slot !== slot) otherMap.set(s.model.id, s.slot);
          }

          return (
            <div
              key={slot}
              onMouseEnter={() => {
                if (!isHidden) onHoverSlot(slot);
              }}
              onMouseLeave={() => onHoverSlot(null)}
              className={`px-2.5 py-2 space-y-1 border-l-2 ${theme.borderLeft} transition-colors ${
                isFocused
                  ? theme.rowSelected
                  : isHidden
                  ? 'opacity-45 bg-slate-50/40 dark:bg-slate-950/30'
                  : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/35'
              }`}
            >
              {/* Line 1: Selector + Direct Links + Active Score + Focus/Visibility */}
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex-1 min-w-0">
                  <CompareModelSelector
                    slot={slot}
                    selectedModel={model}
                    otherSlotsByModelId={otherMap}
                    models={pickerModels}
                    rankMap={rankMap}
                    scoreMode={scoreMode}
                    lang={lang}
                    alignRight
                    compact
                    theme={theme}
                    onSelect={(newId) => onSelectSlot(slotIdx, newId)}
                  />
                </div>

                {chatUrl && (
                  <a
                    href={chatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 px-1.5 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                    title={openChatbotLabel}
                  >
                    <span className="hidden sm:inline">Chat</span>
                    <ExternalLink className="w-3 h-3 opacity-75" />
                  </a>
                )}
                {model.isFreeApi && model.apiLink && (
                  <a
                    href={model.apiLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 px-1.5 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors shrink-0"
                    title={lang === 'de' ? 'Kostenloser API-Zugang' : 'Free API access'}
                  >
                    <Globe className="w-3 h-3" />
                  </a>
                )}

                <div className="flex items-baseline gap-1 shrink-0 pl-0.5">
                  <span className={`font-mono tabular-nums text-sm font-extrabold ${theme.text}`}>
                    {score !== null ? formatNumber(score, 1) : '—'}
                    {scoreMode === 'new' && !model.hasAll8Benchmarks && score !== null && (
                      <span
                        className="text-[11px] font-normal text-amber-600 dark:text-amber-400 ml-0.5 align-top"
                        title={
                          lang === 'de'
                            ? 'Nicht alle 8 Benchmarks vorhanden'
                            : 'Not all 8 benchmarks available'
                        }
                      >
                        *
                      </span>
                    )}
                  </span>
                  {deltaVsTop !== null && (
                    <span
                      className={`text-[11px] font-mono tabular-nums font-bold inline-flex items-center gap-0.5 ${
                        isLeader
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isLeader ? (
                        <Trophy className="w-2.5 h-2.5 shrink-0" />
                      ) : isAllTied ? (
                        '='
                      ) : (
                        `${deltaVsTop.toFixed(1)}`
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (isHidden) {
                        onToggleVisibility(slot);
                        onPinSlot(slot);
                      } else {
                        onPinSlot(isPinned ? null : slot);
                      }
                    }}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      isPinned
                        ? `${theme.badgeBg}`
                        : 'hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    aria-pressed={isPinned}
                    title={
                      isPinned
                        ? lang === 'de'
                          ? 'Fokus aufheben'
                          : 'Unpin focus'
                        : focusActionLabel ||
                          (lang === 'de' ? 'Modell im Diagramm fokussieren' : 'Focus model')
                    }
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleVisibility(slot)}
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
                        ? showActionLabel ||
                          (lang === 'de' ? 'Im Diagramm einblenden' : 'Show in chart')
                        : hideActionLabel ||
                          (lang === 'de' ? 'Im Diagramm ausblenden' : 'Hide in chart')
                    }
                  >
                    {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Line 2: Compact Metadata + Category Wins + Biggest Edge */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-tight text-slate-600 dark:text-slate-400">
                {onSelectCompany ? (
                  <button
                    type="button"
                    onClick={() => onSelectCompany(model.companyName)}
                    className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 underline decoration-dotted underline-offset-2 cursor-pointer transition-colors"
                  >
                    {model.companyName}
                  </button>
                ) : (
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {model.companyName}
                  </span>
                )}
                {model.releaseDate && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono tabular-nums">{model.releaseDate}</span>
                  </>
                )}
                {rank !== undefined && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      #{rank}
                    </span>
                  </>
                )}
                {priceText ? (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {priceText}
                    </span>
                  </>
                ) : !model.isPaid ? (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {lang === 'de' ? 'Gratis' : 'Free'}
                    </span>
                  </>
                ) : null}
                {model.isFreeApi && !model.apiLink && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      API
                    </span>
                  </>
                )}
                {!model.isAvailable && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      Hist.
                    </span>
                  </>
                )}
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'de' ? 'Siege' : 'Wins'}: {winsCount}
                </span>
                {edge && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <span className="text-slate-600 dark:text-slate-400">
                        {lang === 'de' ? 'Stärke:' : 'Edge:'}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                        {edge.label}
                      </span>
                      <span className={`font-mono tabular-nums font-bold ${theme.text}`}>
                        +{edge.margin.toFixed(1)}
                      </span>
                    </span>
                  </>
                )}
              </div>

              {storylineText && (
                <p
                  className="text-[11px] text-slate-600 dark:text-slate-400 italic leading-tight truncate"
                  title={storylineText}
                >
                  {storylineText}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact Overall Category Wins Footer inside Card */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 rounded-b-xl space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums font-bold">
          <span className="uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
            {scoreMode === 'old'
              ? lang === 'de'
                ? `Siege (${scoreModeOldLabel})`
                : `Wins (${scoreModeOldLabel})`
              : lang === 'de'
              ? 'Kategorie-Siege (D–K)'
              : 'Category Wins (D–K)'}
          </span>
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            {sortedPrimaryScores.map(({ slot }, i) => (
              <React.Fragment key={slot}>
                {i > 0 && <span className="text-slate-400 dark:text-slate-700">·</span>}
                <span className={slotThemes[slot].text}>
                  {slot}: {summaryStats.wins[slot]}
                </span>
              </React.Fragment>
            ))}
            <span className="text-slate-400 dark:text-slate-700">·</span>
            <span className="text-slate-600 dark:text-slate-400">
              {lang === 'de' ? 'Patt' : 'Tie'}: {summaryStats.ties}
            </span>
          </div>
        </div>
        {summaryStats.comparableCount > 0 && (
          <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-200/80 dark:bg-slate-800 flex">
            {sortedPrimaryScores.map(({ slot }) =>
              summaryStats.wins[slot] > 0 ? (
                <div
                  key={slot}
                  className={`${slotThemes[slot].barActive} h-full`}
                  style={{
                    width: `${(summaryStats.wins[slot] / summaryStats.comparableCount) * 100}%`,
                  }}
                />
              ) : null
            )}
            {summaryStats.ties > 0 && (
              <div
                className="bg-slate-400 dark:bg-slate-600 h-full"
                style={{
                  width: `${(summaryStats.ties / summaryStats.comparableCount) * 100}%`,
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
