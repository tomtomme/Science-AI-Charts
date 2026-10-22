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
  actCodeReason: number | null; // Col D (10 Evals)
  nonHallucination: number | null; // Col E
  scienceKnowledge: number | null; // Col F (-100 to 100)
  visionPlot: number | null; // Col G (MMMU-Pro)
  medReasoning: number | null; // Col H (MLCR-AA)
  excelAgent: number | null; // Col I (ExcelAgent)
  trickQuestions: number | null; // Col J (SimpleBench)
  econLegal: number | null; // Col K (Vals.ai)
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
  scoreOldReported?: number | null;
  scoreOldCalculated?: number | null;
  hasAll5OldBenchmarks?: boolean;
  scoreNew: number | null;
  scoreNewCalculated: number;
  scoreNewReported: number | null;
  scoreWorstCase: number | null;
  scoreWorstCaseReported?: number | null;
  scoreWorstCaseCalculated?: number | null;
  
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
export type ScoreMode = 'new' | 'old' | 'worstCase';
export type ModelScope = 'current' | 'all';
export type PriceFilter = 'free' | 'paid' | 'all';
export type ExplosionMode = 'on' | 'hover' | 'off';

export interface CsvParagraph {
  heading?: string;
  isMajor?: boolean;
  text: string;
  link?: { url: string; label: string };
}

export interface CsvNotesMetadata {
  section1Title: string; // cell A34 (e.g. "How To Read")
  section1Content: string; // cell C34
  section2Title: string; // cell N34 (e.g. "What Bots can & can't do for you")
  section2Content: string; // cell O34
  section1Paragraphs?: CsvParagraph[];
  section2Paragraphs?: CsvParagraph[];
}

export interface LabEntry {
  id: string;
  group: 'top10' | 'contender' | 'tweakers' | 'small' | 'harness';
  country: string;
  countryFlag: string;
  creator: string;
  famousFor: string;
  engineName: string;
  basedOn?: string;
  harness?: string;
  form?: string;
  note?: string;
  weightsType?: 'open' | 'closed' | 'hybrid';
  openWeights?: {
    micro?: boolean;
    mini?: boolean;
    tiny?: boolean;
    small?: boolean;
    medium?: boolean;
    large?: boolean;
    massive?: boolean;
    colossal?: boolean;
    planetary?: boolean;
    singularity?: boolean;
    godTier?: boolean;
  };
  parameterSizes: {
    micro?: string;
    mini?: string;
    tiny?: string;
    small?: string;
    medium?: string;
    large?: string;
    massive?: string;
    colossal?: string;
    planetary?: string;
    singularity?: string;
    godTier?: string;
  };
  subscriptionTiers?: string;
  harnessSdk?: string;
  dailyAgent?: string;
  codingAgent?: string;
  specialties?: string;
}

export type RegressionType =
  | 'linear'
  | 'exponential'
  | 'power'
  | 'polynomial'
  | 'movingAverage'
  | 'logistic'
  | 'loess'
  | 'frontier';

export interface TimelineDataPoint {
  id: string;
  name: string;
  displayName: string;
  company: string;
  releaseDate: string;
  timestamp: number;
  score: number;
  chatUrl?: string;
  isPaid?: boolean;
  flag?: string;
}

export interface RegressionResult {
  type: RegressionType;
  name: string;
  r2: number;
  formula: string;
  points: Array<{ x: number; y: number }>;
}


