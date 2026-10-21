import { ModelRecord, BenchmarkComponent } from '../types';
import { BENCHMARK_COMPONENTS } from '../data/benchmarks';

export interface CorrelationDimension {
  id: string;
  index: number; // 0..10
  nameDe: string;
  nameEn: string;
  shortDe: string;
  shortEn: string;
  color: string;
  bgColor: string;
  targetId: string;
  getValue: (model: ModelRecord) => number | null;
}

export interface CorrelationPoint {
  id: string;
  name: string;
  displayName: string;
  company: string;
  releaseDate: string;
  x: number;
  y: number;
  flag: string;
  chatUrl?: string;
  isPaid: boolean;
}

export interface CorrelationMetricResult {
  value: number; // between -1 and +1
  labelDe: string;
  labelEn: string;
  strengthDe: string;
  strengthEn: string;
  color: string;
}

// 11 selectable dimensions: 3 composite scores + 8 component categories
export const CORRELATION_DIMENSIONS: CorrelationDimension[] = [
  {
    id: 'new_score',
    index: 0,
    nameDe: 'Neuer Gesamt-Score (8 Benchmarks)',
    nameEn: 'New Overall Score (8 Benchmarks)',
    shortDe: 'Score (Neu)',
    shortEn: 'Score (New)',
    color: '#059669', // Emerald
    bgColor: '#ecfdf5',
    targetId: 'note-col-m',
    getValue: (m) => (typeof m.scoreNewReported === 'number' ? m.scoreNewReported : typeof m.scoreNew === 'number' ? m.scoreNew : null),
  },
  {
    id: 'old_score',
    index: 1,
    nameDe: 'Alter Gesamt-Score (5 Benchmarks)',
    nameEn: 'Old Overall Score (5 Benchmarks)',
    shortDe: 'Score (Alt)',
    shortEn: 'Score (Old)',
    color: '#d97706', // Amber
    bgColor: '#fffbeb',
    targetId: 'note-col-l',
    getValue: (m) => (typeof m.scoreOld === 'number' ? m.scoreOld : null),
  },
  {
    id: 'worst_case',
    index: 2,
    nameDe: 'Worst-Case Score (Konservativ)',
    nameEn: 'Worst-Case Score (Conservative)',
    shortDe: 'Worst Case',
    shortEn: 'Worst Case',
    color: '#e11d48', // Rose
    bgColor: '#fff1f2',
    targetId: 'note-col-n',
    getValue: (m) => (typeof m.scoreWorstCase === 'number' ? m.scoreWorstCase : null),
  },
  ...BENCHMARK_COMPONENTS.map((comp: BenchmarkComponent, i: number) => {
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
      id: comp.id,
      index: i + 3,
      nameDe: `#${i + 1} ${comp.nameDe}`,
      nameEn: `#${i + 1} ${comp.nameEn}`,
      shortDe: `#${i + 1} ${comp.nameDe.split(' ')[0]}`,
      shortEn: `#${i + 1} ${comp.nameEn.split(' ')[0]}`,
      color: comp.color,
      bgColor: comp.lightBg,
      targetId: colTargets[i] || 'final-scores-section',
      getValue: (m: ModelRecord) => {
        const raw = m.rawScores[comp.key];
        if (typeof raw !== 'number' || isNaN(raw)) return null;
        return comp.transform(raw);
      },
    };
  }),
];

/**
 * Calculates Pearson linear correlation coefficient r.
 * r in [-1, 1]
 */
export function calculatePearson(points: Array<{ x: number; y: number }>): CorrelationMetricResult {
  const n = points.length;
  if (n < 3) {
    return {
      value: 0,
      labelDe: 'Zu wenige Daten',
      labelEn: 'Insufficient data',
      strengthDe: 'Keine Daten',
      strengthEn: 'No data',
      color: '#94a3b8',
    };
  }

  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  const r = den !== 0 ? Math.max(-1, Math.min(1, num / den)) : 0;

  return formatCorrelationResult(r, 'pearson');
}

/**
 * Calculates Spearman rank correlation coefficient rho.
 * Assigns fractional ranks for ties, then computes Pearson of ranks.
 */
export function calculateSpearman(points: Array<{ x: number; y: number }>): CorrelationMetricResult {
  const n = points.length;
  if (n < 3) {
    return {
      value: 0,
      labelDe: 'Zu wenige Daten',
      labelEn: 'Insufficient data',
      strengthDe: 'Keine Daten',
      strengthEn: 'No data',
      color: '#94a3b8',
    };
  }

  // Fractional rank calculation
  const getRanks = (arr: number[]): number[] => {
    const indexed = arr.map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => a.val - b.val);

    const ranks = new Array(n).fill(0);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && indexed[j + 1].val === indexed[j].val) {
        j++;
      }
      // Average rank for tie group (1-based ranks)
      const avgRank = (i + 1 + j + 1) / 2;
      for (let k = i; k <= j; k++) {
        ranks[indexed[k].idx] = avgRank;
      }
      i = j + 1;
    }
    return ranks;
  };

  const xRanks = getRanks(points.map((p) => p.x));
  const yRanks = getRanks(points.map((p) => p.y));

  const rankedPoints = xRanks.map((rx, idx) => ({ x: rx, y: yRanks[idx] }));
  const pearsonOnRanks = calculatePearson(rankedPoints);

  return formatCorrelationResult(pearsonOnRanks.value, 'spearman');
}

function formatCorrelationResult(val: number, type: 'pearson' | 'spearman'): CorrelationMetricResult {
  const abs = Math.abs(val);
  const isPos = val >= 0;

  let strengthDe = 'Keine / vernachlässigbare Korrelation';
  let strengthEn = 'Negligible / no correlation';
  let color = '#64748b'; // Slate

  if (abs >= 0.75) {
    strengthDe = isPos ? 'Sehr starke positive Korrelation' : 'Sehr starke inverse Korrelation';
    strengthEn = isPos ? 'Very strong positive correlation' : 'Very strong inverse correlation';
    color = isPos ? '#059669' : '#dc2626'; // Emerald or Red
  } else if (abs >= 0.5) {
    strengthDe = isPos ? 'Deutliche positive Korrelation' : 'Deutliche inverse Korrelation';
    strengthEn = isPos ? 'Moderate to strong correlation' : 'Moderate to strong inverse correlation';
    color = isPos ? '#0284c7' : '#e11d48'; // Sky or Rose
  } else if (abs >= 0.3) {
    strengthDe = isPos ? 'Mäßige positive Korrelation' : 'Mäßige inverse Korrelation';
    strengthEn = isPos ? 'Weak to moderate correlation' : 'Weak to moderate inverse correlation';
    color = isPos ? '#0d9488' : '#f97316'; // Teal or Orange
  } else if (abs >= 0.15) {
    strengthDe = isPos ? 'Geringe positive Tendenz' : 'Geringe inverse Tendenz';
    strengthEn = isPos ? 'Slight positive tendency' : 'Slight inverse tendency';
    color = '#64748b';
  }

  const prefix = val >= 0 ? '+' : '';
  const formattedVal = `${prefix}${val.toFixed(3)}`;

  return {
    value: val,
    labelDe: `${type === 'pearson' ? "Pearson's r" : "Spearman's ρ"} = ${formattedVal}`,
    labelEn: `${type === 'pearson' ? "Pearson's r" : "Spearman's ρ"} = ${formattedVal}`,
    strengthDe,
    strengthEn,
    color,
  };
}
