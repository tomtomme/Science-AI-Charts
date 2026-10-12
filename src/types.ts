export interface BenchmarkComponent {
  id: string;
  key: keyof RawBenchmarkScores;
  nameDe: string;
  nameEn: string;
  sourceName: string;
  sourceUrl?: string;
  color: string;
  darkColor: string;
  lightBg: string;
  descriptionDe: string;
  descriptionEn: string;
  formulaDesc: string;
  weightPct: number; // 12.5% (1/8)
  transform: (val: number) => number;
}

export interface RawBenchmarkScores {
  actCodeReason: number; // Col D (10 Evals)
  nonHallucination: number; // Col E
  scienceKnowledge: number; // Col F (-100 to 100)
  visionPlot: number; // Col G (MMMU-Pro)
  medReasoning: number; // Col H (MLCR-AA)
  excelAgent: number; // Col I (ExcelAgent)
  trickQuestions: number; // Col J (SimpleBench)
  econLegal: number; // Col K (Vals.ai)
}

export interface ComponentBreakdown {
  id: string;
  name: string;
  color: string;
  rawValue: number;
  transformedValue: number;
  pointsContribution: number; // transformedValue / 8
  percentageOfTotal: number;
}

export interface ModelRecord {
  id: string;
  rank: number;
  flag: string;
  name: string;
  displayName: string;
  isPaid: boolean;
  isFreeApi: boolean;
  isNew: boolean;
  creator: string;
  creatorClean: string;
  companyName: string;
  releaseDate: string;
  releaseText: string;
  
  // Raw scores from sheet
  rawScores: RawBenchmarkScores;
  hasAll8Benchmarks: boolean;
  
  // Computed components
  breakdown: ComponentBreakdown[];
  
  // Final scores
  score: number;
  scoreOld: number | null;
  scoreNew: number | null;
  scoreNewCalculated: number;
  scoreNewReported: number | null;
  scoreWorstCase: number | null;
  
  // Meta
  storyline: string;
  chatLink?: string;
  apiLink?: string;
  modelUrl?: string;
  isAvailable: boolean;
  companyDomain: string;
  companyColor: string;
  faviconUrl: string;
}

export interface CompanyInfo {
  name: string;
  domain: string;
  color: string;
  flag: string;
}

export type ViewFilter = 'all' | 'free' | 'paid' | 'top10' | 'top25';
export type SortOption = 'newScore' | 'nonHallu' | 'vision' | 'science' | 'worstCase' | 'rank';
export type SortField = 'score' | 'date';
export type ScoreMode = 'new' | 'old';
export type ModelScope = 'current' | 'all';
