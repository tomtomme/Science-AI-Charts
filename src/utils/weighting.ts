import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { ActiveBenchmarkKey, BenchmarkWeights, ComponentBreakdown, ModelRecord, RawBenchmarkScores } from '../types';

export const ACTIVE_BENCHMARK_KEYS: ActiveBenchmarkKey[] = [
  'actCodeReason',
  'nonHallucination',
  'scienceKnowledge',
  'visionPlot',
  'medReasoning',
  'excelAgent',
  'trickQuestions',
  'econLegal',
];

export const DEFAULT_BENCHMARK_WEIGHTS: BenchmarkWeights = {
  actCodeReason: 100,
  nonHallucination: 100,
  scienceKnowledge: 100,
  visionPlot: 100,
  medReasoning: 100,
  excelAgent: 100,
  trickQuestions: 100,
  econLegal: 100,
};

export interface BenchmarkWeightPrompt {
  promptDe: string;
  promptEn: string;
}

export const BENCHMARK_WEIGHT_PROMPTS: Record<ActiveBenchmarkKey, BenchmarkWeightPrompt> = {
  actCodeReason: {
    promptDe: 'Wie wichtig ist Ihnen allgemeiner IQ & Coding?',
    promptEn: 'How important is general IQ & coding?',
  },
  nonHallucination: {
    promptDe: 'Wie wichtig ist Ihnen geringe Halluzination?',
    promptEn: 'How important is low hallucination?',
  },
  scienceKnowledge: {
    promptDe: 'Wie wichtig ist Ihnen breites Faktenwissen?',
    promptEn: 'How important is broad science knowledge?',
  },
  visionPlot: {
    promptDe: 'Wie wichtig ist Ihnen Diagramm- & Bildanalyse?',
    promptEn: 'How important is chart & plot reading?',
  },
  medReasoning: {
    promptDe: 'Wie wichtig ist Ihnen medizinische Diagnostik?',
    promptEn: 'How important is medical reasoning?',
  },
  excelAgent: {
    promptDe: 'Wie wichtig ist Ihnen Excel- & Datenanalyse?',
    promptEn: 'How important is Excel & data analysis?',
  },
  trickQuestions: {
    promptDe: 'Wie wichtig ist Ihnen Experimentieren & Engineering?',
    promptEn: 'How important is experimenting & engineering?',
  },
  econLegal: {
    promptDe: 'Wie wichtig ist Ihnen Wirtschaft & Recht?',
    promptEn: 'How important is economics & legal work?',
  },
};

export interface WeightPreset {
  id: string;
  labelDe: string;
  labelEn: string;
  weights: BenchmarkWeights;
}

export const WEIGHT_PRESETS: WeightPreset[] = [
  {
    id: 'standard',
    labelDe: 'Standard (1/8)',
    labelEn: 'Default (1/8)',
    weights: { ...DEFAULT_BENCHMARK_WEIGHTS },
  },
  {
    id: 'research',
    labelDe: 'Forschung & Fakten',
    labelEn: 'Research & Facts',
    weights: {
      actCodeReason: 70,
      nonHallucination: 100,
      scienceKnowledge: 100,
      visionPlot: 85,
      medReasoning: 80,
      excelAgent: 50,
      trickQuestions: 45,
      econLegal: 25,
    },
  },
  {
    id: 'coding',
    labelDe: 'Coding & Agenten',
    labelEn: 'Coding & Agents',
    weights: {
      actCodeReason: 100,
      nonHallucination: 70,
      scienceKnowledge: 40,
      visionPlot: 50,
      medReasoning: 20,
      excelAgent: 80,
      trickQuestions: 100,
      econLegal: 65,
    },
  },
  {
    id: 'business',
    labelDe: 'Wirtschaft & Excel',
    labelEn: 'Finance & Legal',
    weights: {
      actCodeReason: 75,
      nonHallucination: 90,
      scienceKnowledge: 30,
      visionPlot: 60,
      medReasoning: 10,
      excelAgent: 100,
      trickQuestions: 45,
      econLegal: 100,
    },
  },
];

export function getTotalBenchmarkWeight(weights: BenchmarkWeights): number {
  return ACTIVE_BENCHMARK_KEYS.reduce((acc, key) => acc + Math.max(0, weights[key] ?? 0), 0);
}

/**
 * Returns true whenever weights diverge from equal weighting (1/8 per criterion),
 * including when all weights are set to 0.
 */
export function isCustomWeighted(weights?: BenchmarkWeights | null): boolean {
  if (!weights) return false;
  const values = ACTIVE_BENCHMARK_KEYS.map((k) => Math.max(0, weights[k] ?? 0));
  const first = values[0];
  if (first <= 0) return true;
  return values.some((v) => Math.abs(v - first) > 0.001);
}

export function getNormalizedWeights(weights: BenchmarkWeights): Record<ActiveBenchmarkKey, number> {
  const total = getTotalBenchmarkWeight(weights);
  const result = {} as Record<ActiveBenchmarkKey, number>;
  for (const key of ACTIVE_BENCHMARK_KEYS) {
    result[key] = total > 0 ? Math.max(0, weights[key] ?? 0) / total : 0;
  }
  return result;
}

export function computeWeightedNewScore(
  rawScores: RawBenchmarkScores,
  weights: BenchmarkWeights
): number {
  const norm = getNormalizedWeights(weights);
  let sum = 0;
  for (const comp of BENCHMARK_COMPONENTS) {
    const key = comp.key as ActiveBenchmarkKey;
    const raw = rawScores[key] ?? 0;
    const transformed = comp.transform(raw);
    sum += transformed * norm[key];
  }
  return Math.round(sum * 10) / 10;
}

export function computeWeightedBreakdown(
  rawScores: RawBenchmarkScores,
  targetScore: number,
  weights: BenchmarkWeights
): ComponentBreakdown[] {
  const norm = getNormalizedWeights(weights);
  const rawContributions = BENCHMARK_COMPONENTS.map((comp) => {
    const key = comp.key as ActiveBenchmarkKey;
    const raw = rawScores[key] ?? 0;
    const transformed = comp.transform(raw);
    const pts = transformed * norm[key];
    return { comp, raw, transformed, pts };
  });

  const sumPts = rawContributions.reduce((acc, c) => acc + c.pts, 0);
  const normFactor = sumPts > 0 && targetScore > 0 ? targetScore / sumPts : 1;

  return rawContributions.map(({ comp, raw, transformed, pts }) => {
    const contribution = parseFloat((pts * normFactor).toFixed(2));
    return {
      id: comp.id,
      name: comp.nameDe,
      color: comp.color,
      rawValue: raw,
      transformedValue: transformed,
      pointsContribution: contribution,
      percentageOfTotal:
        targetScore > 0 ? parseFloat(((contribution / targetScore) * 100).toFixed(1)) : 0,
    };
  });
}

export function applyBenchmarkWeightsToModels(
  newModels: ModelRecord[],
  allModels: ModelRecord[],
  weights: BenchmarkWeights
): { newModels: ModelRecord[]; allModels: ModelRecord[]; isWeighted: boolean } {
  if (!isCustomWeighted(weights)) {
    return { newModels, allModels, isWeighted: false };
  }

  const weightedNewModels = newModels.map((m) => {
    const weightedScore = computeWeightedNewScore(m.rawScores, weights);
    return {
      ...m,
      score: weightedScore,
      scoreNew: weightedScore,
      scoreNewCalculated: weightedScore,
      breakdown: computeWeightedBreakdown(m.rawScores, weightedScore, weights),
    };
  });

  weightedNewModels.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const origA = a.scoreNewReported ?? 0;
    const origB = b.scoreNewReported ?? 0;
    if (origB !== origA) return origB - origA;
    return a.displayName.localeCompare(b.displayName);
  });

  const rankById = new Map<string, number>();
  weightedNewModels.forEach((m, idx) => {
    m.rank = idx + 1;
    rankById.set(m.id, idx + 1);
  });

  const weightedAllModels = allModels.map((m) => {
    if (m.scoreNew === null && !m.hasAll8Benchmarks) {
      return m;
    }
    const weightedScore = computeWeightedNewScore(m.rawScores, weights);
    const hasNewScore = m.scoreNew !== null;
    return {
      ...m,
      rank: rankById.get(m.id) ?? m.rank,
      score: hasNewScore ? weightedScore : m.score,
      scoreNew: hasNewScore ? weightedScore : null,
      scoreNewCalculated: weightedScore,
      breakdown: hasNewScore
        ? computeWeightedBreakdown(m.rawScores, weightedScore, weights)
        : m.breakdown,
    };
  });

  return {
    newModels: weightedNewModels,
    allModels: weightedAllModels,
    isWeighted: true,
  };
}
