import React from 'react';
import { RotateCcw, Sliders } from 'lucide-react';
import { BENCHMARK_COMPONENTS, getBenchmarkCategoryLabel } from '../data/benchmarks';
import { ActiveBenchmarkKey, BenchmarkWeights } from '../types';
import { Language } from '../utils/i18n';
import {
  BENCHMARK_WEIGHT_PROMPTS,
  DEFAULT_BENCHMARK_WEIGHTS,
  WEIGHT_PRESETS,
  getNormalizedWeights,
  getTotalBenchmarkWeight,
  isCustomWeighted,
} from '../utils/weighting';

interface WeightingPanelProps {
  weights: BenchmarkWeights;
  onWeightChange: (key: ActiveBenchmarkKey, value: number) => void;
  onApplyWeights: (weights: BenchmarkWeights) => void;
  onReset: () => void;
  categoryNames?: string[];
  isPreTranslatedCategoryNames?: boolean;
  lang: Language;
  onClose?: () => void;
}

export const WeightingPanel: React.FC<WeightingPanelProps> = React.memo(({
  weights,
  onWeightChange,
  onApplyWeights,
  onReset,
  categoryNames,
  isPreTranslatedCategoryNames = false,
  lang,
  onClose,
}) => {
  const isDe = lang === 'de';
  const totalWeight = getTotalBenchmarkWeight(weights);
  const customActive = isCustomWeighted(weights);
  const normalized = getNormalizedWeights(weights);

  const isPresetActive = (presetWeights: BenchmarkWeights) =>
    BENCHMARK_COMPONENTS.every((comp) => {
      const key = comp.key as ActiveBenchmarkKey;
      return Math.round(weights[key] ?? 0) === Math.round(presetWeights[key] ?? 0);
    });

  return (
    <section
      aria-label={isDe ? 'Personalisierte Benchmark-Gewichtung' : 'Personalized Benchmark Weighting'}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-2xs transition-colors"
    >
      {/* Top Bar: Title, Formula Note & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {isDe ? 'Personalisierter Benchmark (Gewichtung)' : 'Personalized Benchmark (Weights)'}
            </h2>
            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">
              {customActive
                ? isDe
                  ? '· Aktiv auf New Score'
                  : '· Active on New Score'
                : isDe
                ? '· Standard: 1/8 (12,5 %) je Kriterium'
                : '· Default: 1/8 (12.5%) per criterion'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
            {isDe
              ? 'Gewichten Sie die 8 Faktoren von 0 % bis 100 %. Der New Score berechnet sich in Echtzeit neu und sortiert die Rangliste automatisch um.'
              : 'Weight each of the 8 factors from 0% to 100%. The New Score recalculates in real time and smoothly re-sorts the ranking.'}
          </p>
        </div>

        {/* Presets & Reset */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {WEIGHT_PRESETS.map((preset) => {
            const active =
              preset.id === 'standard'
                ? !customActive
                : isPresetActive(preset.weights);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyWeights({ ...preset.weights })}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {isDe ? preset.labelDe : preset.labelEn}
              </button>
            );
          })}

          {customActive && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title={isDe ? 'Alle Faktoren auf Standard (1/8) zurücksetzen' : 'Reset all factors to default (1/8)'}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isDe ? 'Zurücksetzen' : 'Reset'}</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 rounded-md text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              aria-label={isDe ? 'Gewichtungsleiste schließen' : 'Close weighting panel'}
            >
              {isDe ? 'Ausblenden' : 'Hide'}
            </button>
          )}
        </div>
      </div>

      {/* Zero-weight guard banner */}
      {totalWeight <= 0 && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
          <span>
            {isDe
              ? 'Alle 8 Faktoren stehen auf 0 %. Erhöhen Sie mindestens einen Regler über 0 %, um einen gewichteten Score zu berechnen.'
              : 'All 8 factors are at 0%. Increase at least one slider above 0% to compute a weighted score.'}
          </span>
          <button
            type="button"
            onClick={() => onApplyWeights({ ...DEFAULT_BENCHMARK_WEIGHTS })}
            className="font-mono font-bold underline cursor-pointer shrink-0"
          >
            {isDe ? 'Standard (1/8)' : 'Default (1/8)'}
          </button>
        </div>
      )}

      {/* 8 Criterion Sliders Grid (flat layout, no nested card borders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3.5 pt-3">
        {BENCHMARK_COMPONENTS.map((comp, idx) => {
          const key = comp.key as ActiveBenchmarkKey;
          const weightVal = Math.round(weights[key] ?? 100);
          const effectivePct = normalized[key] * 100;
          const label = getBenchmarkCategoryLabel(
            categoryNames?.[idx],
            lang,
            comp,
            isPreTranslatedCategoryNames
          );
          const promptText = isDe
            ? BENCHMARK_WEIGHT_PROMPTS[key].promptDe
            : BENCHMARK_WEIGHT_PROMPTS[key].promptEn;
          const isZero = weightVal === 0;

          return (
            <div key={comp.id} className="flex flex-col gap-1 min-w-0">
              {/* Row 1: Criterion Label & Tabular Weights */}
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={`weight-slider-${comp.id}`}
                  className={`flex items-center gap-1.5 text-xs font-semibold truncate cursor-pointer ${
                    isZero
                      ? 'text-slate-500 dark:text-slate-500 line-through'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{
                      backgroundColor: comp.color,
                      opacity: isZero ? 0.35 : 1,
                    }}
                  />
                  <span className="truncate">{label}</span>
                </label>

                <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums shrink-0">
                  <span
                    className={`font-bold ${
                      isZero
                        ? 'text-slate-500 dark:text-slate-500'
                        : 'text-slate-950 dark:text-white'
                    }`}
                  >
                    {weightVal}%
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    ({effectivePct.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Row 2: Intuitive importance prompt */}
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate leading-tight">
                {promptText}
              </p>

              {/* Row 3: 0% to 100% Slider */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => onWeightChange(key, weightVal === 0 ? 100 : 0)}
                  className="text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer shrink-0 tabular-nums"
                  title={
                    weightVal === 0
                      ? isDe
                        ? 'Auf 100 % setzen'
                        : 'Set to 100%'
                      : isDe
                      ? 'Auf 0 % stummschalten'
                      : 'Mute to 0%'
                  }
                >
                  0%
                </button>
                <input
                  id={`weight-slider-${comp.id}`}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={weightVal}
                  onChange={(e) => onWeightChange(key, Number(e.target.value))}
                  aria-label={`${label}: ${promptText}`}
                  style={{ accentColor: comp.color }}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => onWeightChange(key, 100)}
                  className="text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer shrink-0 tabular-nums"
                  title={isDe ? 'Auf 100 % setzen' : 'Set to 100%'}
                >
                  100%
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});
