import React, { useMemo } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ScoreMode, BenchmarkComponent } from '../types';
import { BENCHMARK_COMPONENTS, getBenchmarkCategoryLabel } from '../data/benchmarks';
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
}) => {
  const t = TRANSLATIONS[lang];

  // Unified Slider Value:
  // 0 = New Score (scoreMode='new', category=0)
  // 1 = Old Score (scoreMode='old', category=0)
  // 2 = Worst Case (scoreMode='worstCase', category=0)
  // 3..10 = Categories 1..8
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
      onHoverCategory?.(BENCHMARK_COMPONENTS[catIdx - 1]);
    }
  };

  const handleUnifiedStep = (step: number) => {
    const nextVal = Math.max(0, Math.min(10, unifiedSliderValue + step));
    handleUnifiedSliderChange(nextVal);
  };

  const activeCategoryComp =
    selectedCategoryIndex > 0 ? BENCHMARK_COMPONENTS[selectedCategoryIndex - 1] : null;

  const activeCategoryName = activeCategoryComp
    ? getBenchmarkCategoryLabel(
        categoryNames && selectedCategoryIndex > 0 ? categoryNames[selectedCategoryIndex - 1] : undefined,
        lang,
        activeCategoryComp
      )
    : null;

  // Scroll targets for all 3 composite scores + all 8 benchmark categories
  const scoreScrollTargets = useMemo(() => {
    if (unifiedSliderValue === 0) return { targetId: 'note-col-m' };
    if (unifiedSliderValue === 1) return { targetId: 'note-col-l' };
    if (unifiedSliderValue === 2) return { targetId: 'note-col-n' };

    const catIdx = unifiedSliderValue - 2; // 1..8
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

  return (
    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 shrink-0 max-w-full font-mono text-xs overflow-x-auto no-scrollbar">
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
        max={10}
        step={1}
        value={unifiedSliderValue}
        onChange={(e) => handleUnifiedSliderChange(Number(e.target.value))}
        aria-label="Score criteria slider"
        className="w-16 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 shrink-0"
      />
      <button
        type="button"
        onClick={() => handleUnifiedStep(1)}
        disabled={unifiedSliderValue >= 10}
        aria-label="Next score criterion"
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0 transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>

      {/* Badge button showing active criterion/score mode with click-to-explain tooltip */}
      <Tooltip
        content={lang === 'de' ? 'Klick mich (zur Erklärung springen)' : 'Click me (jump to explanation)'}
        position="bottom"
        align="center"
        width="w-max"
        popupClassName="px-2.5 py-1 text-xs font-semibold tracking-wide whitespace-nowrap"
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
          {unifiedSliderValue >= 3 && activeCategoryComp && activeCategoryName && (
            <button
              type="button"
              onClick={() => handleScroll(scoreScrollTargets.targetId)}
              className="text-xs font-mono font-bold px-1.5 py-0.5 rounded text-white shadow-2xs flex items-center gap-1 truncate w-full cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: activeCategoryComp.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              <span className="truncate">
                #{unifiedSliderValue - 2} {activeCategoryName}
              </span>
            </button>
          )}
        </div>
      </Tooltip>
    </div>
  );
};
