import { CorrelationDimension } from '../../utils/correlationUtils';
import {
  BENCHMARK_COMPONENTS,
  RETIRED_TIMELINE_BENCHMARKS,
  getBenchmarkCategoryLabel,
  getCompositeScoreLabel,
} from '../../data/benchmarks';
import { TRANSLATIONS } from '../../utils/i18n';

export interface Row2LabelContext {
  categoryNames?: string[];
  isPreTranslatedCategoryNames?: boolean;
  compositeScoreNames?: string[];
  isPreTranslatedCompositeScoreNames?: boolean;
  retiredCategoryNames?: string[];
  isPreTranslatedRetiredCategoryNames?: boolean;
}

export function getResolvedDimensionName(
  dim: CorrelationDimension,
  lang: 'de' | 'en',
  row2: Row2LabelContext
): string {
  const t = TRANSLATIONS[lang];
  if (dim.index === 0) {
    return getCompositeScoreLabel(
      0,
      row2.compositeScoreNames?.[0],
      lang,
      t.scoreModeNew,
      row2.isPreTranslatedCompositeScoreNames
    );
  }
  if (dim.index === 1) {
    return getCompositeScoreLabel(
      1,
      row2.compositeScoreNames?.[1],
      lang,
      t.scoreModeOld,
      row2.isPreTranslatedCompositeScoreNames
    );
  }
  if (dim.index === 2) {
    return getCompositeScoreLabel(
      2,
      row2.compositeScoreNames?.[2],
      lang,
      t.scoreModeWorstCase,
      row2.isPreTranslatedCompositeScoreNames
    );
  }
  if (dim.index >= 3 && dim.index <= 10) {
    const catIdx = dim.index - 3;
    const comp = BENCHMARK_COMPONENTS[catIdx];
    const label = getBenchmarkCategoryLabel(
      row2.categoryNames?.[catIdx],
      lang,
      comp,
      row2.isPreTranslatedCategoryNames
    );
    return `#${catIdx + 1} ${label}`;
  }
  if (dim.index >= 11 && dim.index <= 14) {
    const retIdx = dim.index - 11;
    const comp = RETIRED_TIMELINE_BENCHMARKS[retIdx];
    const colTag = ['V', 'W', 'X', 'Y'][retIdx];
    const label = getBenchmarkCategoryLabel(
      row2.retiredCategoryNames?.[retIdx],
      lang,
      comp,
      row2.isPreTranslatedRetiredCategoryNames
    );
    return `${label} (${colTag})`;
  }
  return lang === 'de' ? dim.nameDe : dim.nameEn;
}

export function getResolvedDimensionShortLabel(
  dim: CorrelationDimension,
  lang: 'de' | 'en',
  row2: Row2LabelContext
): string {
  if (dim.index <= 2) {
    return getResolvedDimensionName(dim, lang, row2);
  }
  if (dim.index >= 3 && dim.index <= 10) {
    const full = getResolvedDimensionName(dim, lang, row2);
    return full.length > 15 ? `${full.slice(0, 14)}…` : full;
  }
  if (dim.index >= 11 && dim.index <= 14) {
    const retIdx = dim.index - 11;
    const comp = RETIRED_TIMELINE_BENCHMARKS[retIdx];
    const colTag = ['V', 'W', 'X', 'Y'][retIdx];
    const base = getBenchmarkCategoryLabel(
      row2.retiredCategoryNames?.[retIdx],
      lang,
      comp,
      row2.isPreTranslatedRetiredCategoryNames
    );
    const trimmed = base.length > 11 ? `${base.slice(0, 10)}…` : base;
    return `${colTag}·${trimmed}`;
  }
  return lang === 'de' ? dim.shortDe : dim.shortEn;
}

// Helper to find optimal tooltip position with minimal data-point overlaps
export function getOptimalTooltipPosition(
  dotX: number,
  dotY: number,
  containerW: number,
  containerH: number,
  allPoints: Array<{ id: string; x: number; y: number }>,
  currentPointId: string,
  tipW = 230,
  tipH = 68,
  padding = 8
): { left: number; top: number } {
  const candidates = [
    { left: dotX + 12, top: dotY - tipH - 8, name: 'TR' },
    { left: dotX - tipW - 12, top: dotY - tipH - 8, name: 'TL' },
    { left: dotX + 12, top: dotY + 12, name: 'BR' },
    { left: dotX - tipW - 12, top: dotY + 12, name: 'BL' },
  ];

  let bestCandidate = candidates[0];
  let minScore = Infinity;

  for (const c of candidates) {
    let left = c.left;
    let top = c.top;
    let boundaryPenalty = 0;

    if (left < padding) {
      boundaryPenalty += (padding - left) * 4;
      left = padding;
    } else if (left + tipW > containerW - padding) {
      boundaryPenalty += (left + tipW - (containerW - padding)) * 4;
      left = Math.max(padding, containerW - padding - tipW);
    }

    if (top < padding) {
      boundaryPenalty += (padding - top) * 4;
      top = padding;
    } else if (top + tipH > containerH - padding) {
      boundaryPenalty += (top + tipH - (containerH - padding)) * 4;
      top = Math.max(padding, containerH - padding - tipH);
    }

    let overlaps = 0;
    const rLeft = left - 2;
    const rRight = left + tipW + 2;
    const rTop = top - 2;
    const rBottom = top + tipH + 2;

    for (let i = 0; i < allPoints.length; i++) {
      const p = allPoints[i];
      if (p.id === currentPointId) continue;
      if (p.x >= rLeft && p.x <= rRight && p.y >= rTop && p.y <= rBottom) {
        overlaps++;
      }
    }

    const score = overlaps * 100 + boundaryPenalty;

    if (score < minScore) {
      minScore = score;
      bestCandidate = { left, top, name: c.name };
    }
  }

  return {
    left: Math.round(bestCandidate.left),
    top: Math.round(bestCandidate.top),
  };
}

export const HEATMAP_MIN = -0.2;
export const HEATMAP_MAX = 1.0;
export const HEATMAP_STEP_COUNT = 13; // -0.2 to +1.0 in 0.1 increments
export const HEATMAP_PALETTE_INDICES = Array.from({ length: HEATMAP_STEP_COUNT }, (_, i) => i);

export function roundHeatmapTenths(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function getHeatmapColorFromUnit(u: number): { bg: string; text: string } {
  const clampedU = Math.max(0, Math.min(1, u));
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const rgbStr = (r: number, g: number, b: number) => `rgb(${r}, ${g}, ${b})`;

  if (clampedU >= 0.5) {
    // 0.5 -> white (#ffffff), 0.75 -> blue-300 (#93c5fd), 1.0 -> blue-900 (#1e3a8a)
    const s = (clampedU - 0.5) / 0.5;
    if (s <= 0.5) {
      const t = s / 0.5;
      return {
        bg: rgbStr(lerp(255, 147, t), lerp(255, 197, t), lerp(255, 253, t)),
        text: '#0f172a',
      };
    }
    const t = (s - 0.5) / 0.5;
    return {
      bg: rgbStr(lerp(147, 30, t), lerp(197, 58, t), lerp(253, 138, t)),
      text: clampedU >= 0.78 ? '#ffffff' : '#0f172a',
    };
  }

  // 0.5 -> white (#ffffff), 0.25 -> red-300 (#fca5a5), 0.0 -> red-900 (#7f1d1d)
  const s = (0.5 - clampedU) / 0.5;
  if (s <= 0.5) {
    const t = s / 0.5;
    return {
      bg: rgbStr(lerp(255, 252, t), lerp(255, 165, t), lerp(255, 165, t)),
      text: '#0f172a',
    };
  }
  const t = (s - 0.5) / 0.5;
  return {
    bg: rgbStr(lerp(252, 127, t), lerp(165, 29, t), lerp(165, 29, t)),
    text: clampedU <= 0.12 ? '#ffffff' : '#0f172a',
  };
}

export function getHeatmapCellColors(value: number | null): { bg: string; text: string } {
  if (value === null || isNaN(value)) {
    return { bg: '#f1f5f9', text: '#94a3b8' };
  }
  // Round first using the exact same rule as the cell label so identical displayed numbers always get the exact same color
  const rounded = roundHeatmapTenths(value);
  const clamped = Math.max(HEATMAP_MIN, Math.min(HEATMAP_MAX, rounded));
  const bucket = Math.min(
    HEATMAP_STEP_COUNT - 1,
    Math.max(0, Math.round((clamped - HEATMAP_MIN) * 10))
  );
  return getHeatmapColorFromUnit(bucket / (HEATMAP_STEP_COUNT - 1));
}
