import React from 'react';
import { Minus, Plus, TrendingUp } from 'lucide-react';
import { RegressionOption } from '../data/regressionOptions';
import { Language } from '../utils/i18n';
import { Tooltip } from './Tooltip';

export interface RegressionModelControlsProps {
  lang: Language;
  options: RegressionOption[];
  regressionIndex: number;
  onRegressionIndexChange: React.Dispatch<React.SetStateAction<number>>;
  polyDegree: number;
  onPolyDegreeChange: (deg: number) => void;
  loessSpan: number;
  onLoessSpanChange: (span: number) => void;
  iconColorClass?: string;
  sliderAccentClass?: string;
  formula?: string;
}

export const RegressionModelControls: React.FC<RegressionModelControlsProps> = ({
  lang,
  options,
  regressionIndex,
  onRegressionIndexChange,
  polyDegree,
  onPolyDegreeChange,
  loessSpan,
  onLoessSpanChange,
  iconColorClass = 'text-rose-500',
  sliderAccentClass = 'accent-rose-500',
  formula,
}) => {
  const activeRegression = options[regressionIndex] || options[0];

  return (
    <>
      <Tooltip
        title={lang === 'de' ? activeRegression.labelDe : activeRegression.labelEn}
        badge={lang === 'de' ? 'Modell' : 'Model'}
        position="bottom"
        align="center"
        width="w-96"
        className="w-full sm:w-auto max-w-full min-w-0"
        content={
          <div className="space-y-2">
            <p className="leading-relaxed text-slate-200">
              {lang === 'de' ? activeRegression.descDe : activeRegression.descEn}
            </p>
            {formula && (
              <div className="pt-1.5 border-t border-slate-700/60 font-mono text-xs text-amber-300">
                {formula}
              </div>
            )}
            {activeRegression.id === 'polynomial' && (
              <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-xs text-amber-300">
                <span className="text-slate-300">
                  {lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}
                </span>
                <span className="font-bold">
                  {lang === 'de'
                    ? `Grad ${polyDegree} (${
                        polyDegree === 2
                          ? 'Parabel'
                          : polyDegree === 3
                          ? 'Wendepunkt'
                          : 'Höhere Ordnung'
                      })`
                    : `Degree ${polyDegree} (${
                        polyDegree === 2
                          ? 'Parabola'
                          : polyDegree === 3
                          ? 'Inflection'
                          : 'Higher order'
                      })`}
                </span>
              </div>
            )}
            {activeRegression.id === 'loess' && (
              <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-xs text-amber-300">
                <span className="text-slate-300">
                  {lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}
                </span>
                <span className="font-bold">
                  {lang === 'de'
                    ? `Span = ${loessSpan}% (Fensterbreite)`
                    : `Span = ${loessSpan}% (Window width)`}
                </span>
              </div>
            )}
            {activeRegression.id !== 'frontier' && (
              <div className="pt-1.5 border-t border-slate-700/60 text-xs text-slate-300 leading-snug">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span>{lang === 'de' ? '95%-Konfidenzband' : '95% Confidence Band'}</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  {lang === 'de'
                    ? 'Das schattierte Band zeigt den statistischen Unsicherheitsbereich der Schätzung: Bei dichter Datenlage ist es schmal, bei wenigen oder streuenden Punkten weitet es sich.'
                    : 'The shaded ribbon reflects estimation uncertainty: narrow where data is abundant, wider where observations are scarce or dispersed.'}
                </p>
              </div>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 w-full sm:w-auto min-w-0 max-w-full cursor-pointer">
          <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0 flex items-center gap-1">
            <TrendingUp className={`w-3.5 h-3.5 ${iconColorClass}`} />
            <span>{lang === 'de' ? 'Modell:' : 'Model:'}</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRegressionIndexChange((prev) => Math.max(0, prev - 1));
            }}
            disabled={regressionIndex <= 0}
            className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
            title="-1"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="range"
            min={0}
            max={options.length - 1}
            step={1}
            value={regressionIndex}
            onChange={(e) => onRegressionIndexChange(Number(e.target.value))}
            className={`flex-1 min-w-[44px] sm:flex-none sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer ${sliderAccentClass}`}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRegressionIndexChange((prev) => Math.min(options.length - 1, prev + 1));
            }}
            disabled={regressionIndex >= options.length - 1}
            className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
            title="+1"
          >
            <Plus className="w-3 h-3" />
          </button>

          <div className="min-w-0 flex-1 max-w-[140px] sm:flex-none sm:w-[125px] sm:max-w-none flex items-center">
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded text-white shadow-2xs flex items-center gap-1.5 truncate w-full hover:opacity-95 transition-opacity"
              style={{ backgroundColor: activeRegression.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              <span className="truncate">
                {lang === 'de' ? activeRegression.shortDe : activeRegression.shortEn}
              </span>
            </span>
          </div>
        </div>
      </Tooltip>

      <div
        className={`w-full sm:w-[140px] flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 max-w-full ${
          activeRegression.id !== 'polynomial' && activeRegression.id !== 'loess'
            ? 'opacity-40 cursor-not-allowed'
            : ''
        }`}
      >
        <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
          Param:
        </span>
        {activeRegression.id === 'polynomial' ? (
          <div className="w-[72px] sm:w-[76px] h-6 flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 shadow-2xs">
            <input
              type="number"
              min={2}
              max={4}
              step={1}
              value={polyDegree}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onPolyDegreeChange(Math.min(4, Math.max(2, val)));
              }}
              className="w-full bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right pr-1"
            />
            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 select-none">
              deg
            </span>
          </div>
        ) : activeRegression.id === 'loess' ? (
          <div className="w-[72px] sm:w-[76px] h-6 flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 shadow-2xs">
            <input
              type="number"
              min={10}
              max={100}
              step={5}
              value={loessSpan}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onLoessSpanChange(Math.min(100, Math.max(10, val)));
              }}
              className="w-full bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right pr-1"
            />
            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 select-none">
              %
            </span>
          </div>
        ) : (
          <div className="w-[72px] sm:w-[76px] h-6 flex items-center justify-center font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/40 rounded border border-transparent select-none">
            —
          </div>
        )}
      </div>
    </>
  );
};
