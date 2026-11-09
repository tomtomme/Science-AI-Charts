import React, { useMemo } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ScoreMode, BenchmarkComponent } from '../types';
import { BENCHMARK_COMPONENTS, RETIRED_TIMELINE_BENCHMARKS, getBenchmarkCategoryLabel } from '../data/benchmarks';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { Tooltip } from './Tooltip';

interface ScoreSliderProps {
  scoreMode: ScoreMode;
  onScoreModeChange: (mode: ScoreMode) => void;
  selectedCategoryIndex: number;
  onSelectCategoryIndex: (index: number) => void;
  categoryNames?: string[];
  onHoverCategory?: (comp: BenchmarkComponent | null) => void;
  onScrollToParagraph?: (targetId: string) => void;
  lang: Language;
  allowRetiredScores?: boolean;
}

export const ScoreSlider: React.FC<ScoreSliderProps> = ({
  scoreMode,
  onScoreModeChange,
  selectedCategoryIndex,
  onSelectCategoryIndex,
  categoryNames,
  onHoverCategory,
  onScrollToParagraph,
  lang,
  allowRetiredScores = false,
}) => {
  const t = TRANSLATIONS[lang];
  const maxVal = allowRetiredScores ? 14 : 10;

  // Unified Slider Value:
  // 0 = New Score (scoreMode='new', category=0)
  // 1 = Old Score (scoreMode='old', category=0)
  // 2 = Worst Case (scoreMode='worstCase', category=0)
  // 3..10 = Categories 1..8
  // 11..14 = Retired Categories 9..12 (Columns U..X)
  const unifiedSliderValue = useMemo(() => {
    if (selectedCategoryIndex === 0) {
      if (scoreMode === 'old') return 1;
      if (scoreMode === 'worstCase') return 2;
      return 0;
    }
    return selectedCategoryIndex + 2;
  }, [selectedCategoryIndex, scoreMode]);

  const handleUnifiedSliderChange = (newVal: number) => {
    if (newVal === 0) {
      onScoreModeChange('new');
      onSelectCategoryIndex(0);
      onHoverCategory?.(null);
    } else if (newVal === 1) {
      onScoreModeChange('old');
      onSelectCategoryIndex(0);
      onHoverCategory?.(null);
    } else if (newVal === 2) {
      onScoreModeChange('worstCase');
      onSelectCategoryIndex(0);
      onHoverCategory?.(null);
    } else {
      const catIdx = newVal - 2;
      onSelectCategoryIndex(catIdx);
      if (catIdx <= 8) {
        onHoverCategory?.(BENCHMARK_COMPONENTS[catIdx - 1]);
      } else if (allowRetiredScores) {
        onHoverCategory?.(RETIRED_TIMELINE_BENCHMARKS[catIdx - 9]);
      }
    }
  };

  const handleUnifiedStep = (step: number) => {
    const nextVal = Math.max(0, Math.min(maxVal, unifiedSliderValue + step));
    handleUnifiedSliderChange(nextVal);
  };

  const activeCategoryComp = useMemo(() => {
    if (selectedCategoryIndex >= 1 && selectedCategoryIndex <= 8) {
      return BENCHMARK_COMPONENTS[selectedCategoryIndex - 1];
    }
    if (allowRetiredScores && selectedCategoryIndex >= 9 && selectedCategoryIndex <= 12) {
      return RETIRED_TIMELINE_BENCHMARKS[selectedCategoryIndex - 9];
    }
    return null;
  }, [selectedCategoryIndex, allowRetiredScores]);

  const activeCategoryName = activeCategoryComp
    ? getBenchmarkCategoryLabel(
        categoryNames && selectedCategoryIndex > 0 ? categoryNames[selectedCategoryIndex - 1] : undefined,
        lang,
        activeCategoryComp
      )
    : null;

  // Scroll targets for all 3 composite scores + all 8 benchmark categories + retired benchmarks
  const scoreScrollTargets = useMemo(() => {
    if (unifiedSliderValue === 0) return { targetId: 'note-col-m' };
    if (unifiedSliderValue === 1) return { targetId: 'note-col-l' };
    if (unifiedSliderValue === 2) return { targetId: 'note-col-n' };

    const catIdx = unifiedSliderValue - 2; // 1..8 for active, 9..12 for retired
    if (catIdx <= 8) {
      const colTargets = [
        'note-col-d',
        'note-col-e',
        'note-col-f',
        'note-col-g',
        'note-col-h',
        'note-col-i',
        'note-col-j',
        'note-col-k',
      ];
      return {
        targetId: colTargets[catIdx - 1] || 'final-scores-section',
      };
    }
    // Retired benchmarks: point to related note sections or top of notes
    const retiredTargets = ['note-col-d', 'note-col-e', 'note-col-f', 'note-col-j'];
    return {
      targetId: retiredTargets[catIdx - 9] || 'csv-notes-section',
    };
  }, [unifiedSliderValue]);

  const handleScroll = (targetId: string) => {
    if (onScrollToParagraph) {
      onScrollToParagraph(targetId);
    } else {
      const container = document.getElementById('csv-notes-section');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const doScrollToTarget = () => {
        const el = document.getElementById(targetId) || document.getElementById('final-scores-section');
        const box = document.getElementById('section1-scroll-box');
        if (el) {
          if (box) {
            const targetTop = el.offsetTop - box.offsetTop;
            box.scrollTo({ top: Math.max(0, targetTop - 12), behavior: 'smooth' });
          }
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-500/15', 'rounded-lg', 'transition-all');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-500/15');
          }, 3000);
        }
      };
      setTimeout(doScrollToTarget, 200);
      setTimeout(doScrollToTarget, 500);
    }
  };

  const activeScoreTooltip = useMemo(() => {
    if (unifiedSliderValue === 0) {
      return {
        title: t.scoreModeNew,
        badge: lang === 'de' ? '8 Benchmarks' : '8 Benchmarks',
        desc:
          lang === 'de'
            ? 'Umfassender Gesamt-Score aus allen 8 gleichgewichteten Benchmark-Kriterien (jeweils 12,5 %). Aktueller Standard für moderne Chatbots.'
            : 'Comprehensive final score composed of all 8 equally weighted benchmark criteria (12.5% each). Current standard for modern chatbots.',
        detail: lang === 'de' ? 'Final Score (Spalte M)' : 'Final Score (Col M)',
      };
    }
    if (unifiedSliderValue === 1) {
      return {
        title: t.scoreModeOld,
        badge: lang === 'de' ? '5 Benchmarks' : '5 Benchmarks',
        desc:
          lang === 'de'
            ? 'Historischer Gesamt-Score basierend auf den ursprünglichen 5 Benchmarks. Ermöglicht den Vergleich über einen längeren Zeitraum mit bis zu 224 Modellen.'
            : 'Historical final score based on the original 5 benchmarks. Enables long-term tracking across up to 224 models.',
        detail: lang === 'de' ? 'Final Score (Spalte L)' : 'Final Score (Col L)',
      };
    }
    if (unifiedSliderValue === 2) {
      return {
        title: t.scoreModeWorstCase,
        badge: lang === 'de' ? 'Straf-Score' : 'Penalty Score',
        desc:
          lang === 'de'
            ? 'Worst-Case-Score: Der 7-Benchmark-Durchschnitt wird mit der Nicht-Halluzinations-Rate multipliziert. Bestraft unzuverlässige und fabulierende Modelle drastisch.'
            : 'Worst-case penalty score: 7-benchmark average multiplied by non-hallucination rate. Heavily penalizes fabricating models.',
        detail: lang === 'de' ? 'Worst-Case IQ (Spalte N)' : 'Worst-Case IQ (Col N)',
      };
    }
    if (activeCategoryComp) {
      const isRetired = unifiedSliderValue > 10;
      const numPrefix = !isRetired ? `#${unifiedSliderValue - 2} ` : '';
      const name = activeCategoryName || (lang === 'de' ? activeCategoryComp.nameDe : activeCategoryComp.nameEn);
      return {
        title: `${numPrefix}${name}`,
        badge: activeCategoryComp.sourceName || (isRetired ? (lang === 'de' ? 'Archiv' : 'Retired') : 'Benchmark'),
        desc: lang === 'de' ? activeCategoryComp.descriptionDe : activeCategoryComp.descriptionEn,
        detail:
          activeCategoryComp.weightPct > 0
            ? lang === 'de'
              ? `Gewichtung: ${activeCategoryComp.weightPct}% (${activeCategoryComp.formulaDesc})`
              : `Weight: ${activeCategoryComp.weightPct}% (${activeCategoryComp.formulaDesc})`
            : lang === 'de'
              ? `Aussortierter Benchmark (${activeCategoryComp.formulaDesc})`
              : `Retired benchmark (${activeCategoryComp.formulaDesc})`,
      };
    }
    return null;
  }, [unifiedSliderValue, activeCategoryComp, activeCategoryName, lang, t]);

  return (
    <div className="relative flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 shrink-0 max-w-full font-mono text-xs">
      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 pl-1.5 whitespace-nowrap shrink-0">
        Score:
      </span>
      <button
        type="button"
        onClick={() => handleUnifiedStep(-1)}
        disabled={unifiedSliderValue <= 0}
        aria-label="Previous score criterion"
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0 transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <input
        type="range"
        min={0}
        max={maxVal}
        step={1}
        value={unifiedSliderValue}
        onChange={(e) => handleUnifiedSliderChange(Number(e.target.value))}
        aria-label="Score criteria slider"
        className="w-16 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 shrink-0"
      />
      <button
        type="button"
        onClick={() => handleUnifiedStep(1)}
        disabled={unifiedSliderValue >= maxVal}
        aria-label="Next score criterion"
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0 transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>

      {/* Badge button showing active criterion/score mode with unified tooltip */}
      {activeScoreTooltip && (
        <Tooltip
          title={activeScoreTooltip.title}
          badge={activeScoreTooltip.badge}
          position="bottom"
          align="center"
          width="w-72"
          content={
            <div className="space-y-1.5">
              <p className="leading-snug">{activeScoreTooltip.desc}</p>
              <div className="pt-1.5 border-t border-slate-700/60 font-mono text-[11px] text-amber-300">
                {activeScoreTooltip.detail}
              </div>
              <div className="pt-1 border-t border-slate-700/60 text-[11px] text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>
                  {lang === 'de'
                    ? 'Klicken, um zur Erklärung zu springen'
                    : 'Click to jump to explanation'}
                </span>
              </div>
            </div>
          }
        >
        <div className="w-[130px] sm:w-[165px] shrink-0 overflow-hidden flex items-center pr-0.5">
          {unifiedSliderValue === 0 && (
            <button
              type="button"
              onClick={() => handleScroll('note-col-m')}
              className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-emerald-500 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              <span className="truncate">{t.scoreModeNew}</span>
            </button>
          )}
          {unifiedSliderValue === 1 && (
            <button
              type="button"
              onClick={() => handleScroll('note-col-l')}
              className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-amber-500 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              <span className="truncate">{t.scoreModeOld}</span>
            </button>
          )}
          {unifiedSliderValue === 2 && (
            <button
              type="button"
              onClick={() => handleScroll('note-col-n')}
              className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white shadow-2xs flex items-center gap-1.5 truncate w-full cursor-pointer hover:bg-rose-500 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              <span className="truncate">{t.scoreModeWorstCase}</span>
            </button>
          )}
          {unifiedSliderValue >= 3 && activeCategoryComp && (
            <button
              type="button"
              onClick={() => handleScroll(scoreScrollTargets.targetId)}
              className="text-xs font-mono font-bold px-1.5 py-0.5 rounded text-white shadow-2xs flex items-center gap-1 truncate w-full cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: activeCategoryComp.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              <span className="truncate">
                {unifiedSliderValue <= 10 ? `#${unifiedSliderValue - 2} ` : ''}
                {activeCategoryName || (lang === 'de' ? activeCategoryComp.nameDe : activeCategoryComp.nameEn)}
              </span>
            </button>
          )}
        </div>
      </Tooltip>
    )}
    </div>
  );
};
