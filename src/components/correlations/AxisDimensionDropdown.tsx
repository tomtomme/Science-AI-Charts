import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { CORRELATION_DIMENSIONS } from '../../utils/correlationUtils';
import { Row2LabelContext, getResolvedDimensionName } from './correlationHelpers';

export interface AxisDimensionDropdownProps {
  currentDimIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  lang: 'de' | 'en';
  row2Labels: Row2LabelContext;
  align?: 'left' | 'center' | 'right';
  direction?: 'up' | 'down';
  onScrollToParagraph?: (targetId: string) => void;
}

export const AxisDimensionDropdown: React.FC<AxisDimensionDropdownProps> = ({
  currentDimIndex,
  onSelect,
  onClose,
  lang,
  row2Labels,
  align = 'left',
  direction = 'down',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const componentDims = CORRELATION_DIMENSIONS.slice(3, 11);
  const retiredDims = CORRELATION_DIMENSIONS.slice(11);
  const totalOptionsCount = componentDims.length + retiredDims.length;

  const alignClass =
    align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : align === 'right'
      ? 'right-0'
      : 'left-0';

  const positionClass =
    direction === 'up'
      ? `bottom-full mb-2 ${alignClass}`
      : `top-full mt-2 ${alignClass}`;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40 backdrop-blur-2xs cursor-default"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        className={`absolute z-50 ${positionClass} w-[270px] sm:w-[290px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl p-2 select-none animate-in fade-in zoom-in-95 duration-150 max-h-[360px] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 py-1 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold tracking-wider text-slate-700 dark:text-slate-300">
            {lang === 'de' ? 'Metrik auswählen' : 'Select Metric'}
          </span>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
            {totalOptionsCount} {lang === 'de' ? 'Optionen' : 'Options'}
          </span>
        </div>

        {/* Section 1: Component Categories */}
        <div className="mb-2">
          <div className="px-2 py-0.5 text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300">
            {lang === 'de' ? 'Einzel-Kategorien (8)' : 'Benchmark Categories (8)'}
          </div>
          <div className="space-y-0.5 mt-0.5">
            {componentDims.map((dim) => {
              const isSelected = dim.index === currentDimIndex;
              return (
                <button
                  key={dim.id}
                  type="button"
                  onClick={() => onSelect(dim.index)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs font-mono transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: dim.color }}
                    />
                    <span className="truncate">{getResolvedDimensionName(dim, lang, row2Labels)}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Retired Historical Benchmarks (Cols V-Y) */}
        {retiredDims.length > 0 && (
          <div>
            <div className="px-2 py-0.5 text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300">
              {lang === 'de' ? 'Historische Scores · Sp. V–Y (4)' : 'Historical Scores · Cols V–Y (4)'}
            </div>
            <div className="space-y-0.5 mt-0.5">
              {retiredDims.map((dim) => {
                const isSelected = dim.index === currentDimIndex;
                return (
                  <button
                    key={dim.id}
                    type="button"
                    onClick={() => onSelect(dim.index)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs font-mono transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: dim.color }}
                      />
                      <span className="truncate">{getResolvedDimensionName(dim, lang, row2Labels)}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
