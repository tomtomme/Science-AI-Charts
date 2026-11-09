import { BenchmarkComponent } from '../types';

/**
 * Benchmark components sorted exactly in the column order of the raw table:
 * Col D: Act Code Reason Research (IQ)
 * Col E: Non-Hallucination-Rate (Faktentreue)
 * Col F: Science Knowledge (Faktenwissen)
 * Col G: Vision / Plot Reading (Diagrammanalyse)
 * Col H: Medical Long Cont. Reasoning (Diagnostik)
 * Col I: Analysis Excel Agent (Excel)
 * Col J: Trick-Questions & 3D Reasoning (Trickfragen & 3D-Vorstellung)
 * Col K: 7 Evals: Econ Excel Code Legal (Wirtschaft & Recht)
 */
export const BENCHMARK_COMPONENTS: BenchmarkComponent[] = [
  {
    id: 'actCodeReason',
    key: 'actCodeReason',
    nameDe: 'IQ',
    nameEn: 'IQ',
    sourceName: 'AA-II v4.3',
    sourceUrl: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking',
    color: '#8B5CF6', // Purple
    darkColor: '#7C3AED',
    lightBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    descriptionDe: 'Prozentwert des „Artificial Analysis Intelligence Index“ (AA-II). Der meistzitierte Benchmark/IQ-Test für Bots mit tausenden Aufgaben aus allen Disziplinen (rein englischer Text).',
    descriptionEn: 'Percentage score of the "Artificial Analysis Intelligence Index" (AA-II), the most cited general IQ-Test for bots across thousands of tasks in all disciplines (English text only).',
    formulaDesc: 'D / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'nonHallucination',
    key: 'nonHallucination',
    nameDe: 'Faktentreue',
    nameEn: 'Non-Hallu-Rate',
    sourceName: 'Non-Hallu-Rate',
    sourceUrl: 'https://artificialanalysis.ai/evaluations/omniscience#aa-omniscience-hallucination-rate',
    color: '#10B981', // Emerald
    darkColor: '#059669',
    lightBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    descriptionDe: 'Nicht-Halluzinations-Rate in %: Misst, wie selten der Bot Fakten erfindet, wenn er nach unbekannten Inhalten gefragt wird. Für wissenschaftliche Zwecke ist es essenziell, dass der Bot ehrlich zugibt, wenn etwas unbekannt ist.',
    descriptionEn: 'Non-Hallucination Rate in %: Measures how rarely the bot fabricates facts when asked about unknown topics. Essential for research where models must truthfully admit limits.',
    formulaDesc: 'E / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'scienceKnowledge',
    key: 'scienceKnowledge',
    nameDe: 'Faktenwissen',
    nameEn: 'Science Knowledge',
    sourceName: 'AA-Omniscience',
    sourceUrl: 'https://artificialanalysis.ai/evaluations/omniscience',
    color: '#3B82F6', // Blue
    darkColor: '#2563EB',
    lightBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    descriptionDe: 'AA-Omniscience in % (0–100%): Bewertet wissenschaftliches Faktenwissen und Genauigkeit. Belohnt korrekte Antworten, bestraft Halluzinationen und ist neutral bei Nichtwissen.',
    descriptionEn: 'AA-Omniscience in % (0–100%): Evaluates scientific domain knowledge and factual accuracy. Rewards correct answers, penalizes hallucinations, zero penalty for refusing.',
    formulaDesc: 'F / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'visionPlot',
    key: 'visionPlot',
    nameDe: 'Diagrammanalyse',
    nameEn: 'Plot Reading',
    sourceName: 'MMMU-Pro',
    sourceUrl: 'https://artificialanalysis.ai/evaluations/mmmu-pro',
    color: '#F59E0B', // Amber
    darkColor: '#D97706',
    lightBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    descriptionDe: 'MMMU Pro Bild-/Plot-Verständnis in %: Unverzichtbar für statistische Datenanalyse. Prüft 1.700 Aufgaben mit Bild- und Diagramminterpretation (skaliert ab Mindestbasis 29% auf 0–100%).',
    descriptionEn: 'MMMU Pro visual plot & chart reading: 1,700 questions requiring visual reasoning over plots and figures for data analysis (rescaled assuming 29% baseline as real 0).',
    formulaDesc: '1.4085 × (G - 29) / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, 1.4085 * (val - 29))),
  },
  {
    id: 'medReasoning',
    key: 'medReasoning',
    nameDe: 'Diagnostik',
    nameEn: 'Diagnostics',
    sourceName: 'MLCR-AA',
    sourceUrl: 'https://artificialanalysis.ai/evaluations/mlcr-aa',
    color: '#F43F5E', // Rose
    darkColor: '#E11D48',
    lightBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    descriptionDe: 'Medical Long Context Reasoning (MLCR) in %: Bewertet Argumentationsketten über hunderte Seiten klinischer Fachliteratur hinweg und bestraft logische Widersprüche.',
    descriptionEn: 'Medical Long Context Reasoning Score (MLCR): Assesses continuous reasoning across hundreds of pages of clinical literature, penalizing contradictions in thought chains.',
    formulaDesc: 'H / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'excelAgent',
    key: 'excelAgent',
    nameDe: 'Excel-Analyst',
    nameEn: 'Excel Analyst',
    sourceName: 'ExcelAgent',
    sourceUrl: 'https://artificialanalysis.ai/evaluations/aa-analyst-agent',
    color: '#06B6D4', // Cyan
    darkColor: '#0891B2',
    lightBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    descriptionDe: 'Excel-Analyse-Agent: Misst den Prozentsatz korrekt autonom gelöster Datenanalyse- und Transformationsaufgaben direkt in Microsoft Excel.',
    descriptionEn: 'Excel Agent: Measures the percentage of correctly solved data analysis, quantitative operations, and automation tasks inside Microsoft Excel.',
    formulaDesc: 'I / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'trickQuestions',
    key: 'trickQuestions',
    nameDe: 'Agentic Work',
    nameEn: 'Agentic Work',
    sourceName: 'GDPx',
    sourceUrl: 'https://gdpx.semianalysis.com',
    color: '#6366F1', // Indigo
    darkColor: '#4F46E5',
    lightBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    descriptionDe: 'Agentic Work (GDPx in %): Misst autonome Agentenfähigkeiten in wertschöpfungsstarken Sektoren (Chip-Design, Cybersicherheit, Biologie, Finanzen, Recht, Quant Trading, Software-Entwicklung).',
    descriptionEn: 'Agentic Work (GDPx in %): Measures autonomous agentic capabilities across high-impact sectors (chip design, cybersecurity, biology, finance, legal, quant trading, software engineering).',
    formulaDesc: 'J / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'econLegal',
    key: 'econLegal',
    nameDe: 'Wirtschaft & Recht',
    nameEn: 'Real Econ & Legal Work',
    sourceName: 'Vals Econ 2',
    sourceUrl: 'https://www.vals.ai',
    color: '#EA580C', // Orange
    darkColor: '#C2410C',
    lightBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    descriptionDe: 'Vals.ai Benchmark: Tausende Aufgaben in Finanzen (Excel), Coding und Rechtsarbeit. Prüft mehrstufige quantitative Workflows und strukturierte Datensätze.',
    descriptionEn: 'Vals.ai Benchmark: Solves multi-step quantitative workflows across finance (Excel), programming, and legal analysis with structured statistical environments.',
    formulaDesc: 'K / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
];

/**
 * Historical/retired benchmark components from Columns U through X.
 * Exclusively available via the slider in the Timeline chart (Zeitreihendiagramm).
 * Col U: IQ_old (AA-II v4.3)
 * Col V: Non-Hallu-Rate_old (Non-Hallucination Rate v1)
 * Col W: Science Knowledge_old (Omniscience v1)
 * Col X: Trick Questions_old (SimpleBench)
 */
export const RETIRED_TIMELINE_BENCHMARKS: BenchmarkComponent[] = [
  {
    id: 'iqOld',
    key: 'iqOld',
    nameDe: 'IQ (Alt, v4.3)',
    nameEn: 'IQ (Old, v4.3)',
    sourceName: 'AA-II v4.3',
    sourceUrl: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking',
    color: '#8B5CF6',
    darkColor: '#7C3AED',
    lightBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    descriptionDe: 'Historischer IQ-Score (AA-II v4.3 aus Spalte U). Nur im Zeitreihendiagramm verfügbar.',
    descriptionEn: 'Historical IQ score (AA-II v4.3 from Column U). Available exclusively in the timeline chart.',
    formulaDesc: 'U',
    weightPct: 0,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'nonHalluOld',
    key: 'nonHalluOld',
    nameDe: 'Faktentreue (Alt, v1)',
    nameEn: 'Non-Hallu-Rate (Old, v1)',
    sourceName: 'Non-Hallu-Rate v1',
    sourceUrl: 'https://artificialanalysis.ai/evaluations/omniscience#aa-omniscience-hallucination-rate',
    color: '#10B981',
    darkColor: '#059669',
    lightBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    descriptionDe: 'Historische Nicht-Halluzinations-Rate v1 (aus Spalte V). Nur im Zeitreihendiagramm verfügbar.',
    descriptionEn: 'Historical Non-Hallucination Rate v1 (from Column V). Available exclusively in the timeline chart.',
    formulaDesc: 'V',
    weightPct: 0,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'scienceKnowledgeOld',
    key: 'scienceKnowledgeOld',
    nameDe: 'Faktenwissen (Alt)',
    nameEn: 'Science Knowledge (Old)',
    sourceName: 'Omniscience v1',
    sourceUrl: 'https://artificialanalysis.ai/evaluations/omniscience',
    color: '#3B82F6',
    darkColor: '#2563EB',
    lightBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    descriptionDe: 'Historisches Faktenwissen (Omniscience v1 aus Spalte W). Nur im Zeitreihendiagramm verfügbar.',
    descriptionEn: 'Historical Science Knowledge (Omniscience v1 from Column W). Available exclusively in the timeline chart.',
    formulaDesc: 'W',
    weightPct: 0,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'trickQuestionsOld',
    key: 'trickQuestionsOld',
    nameDe: '(3D) Trickfragen (Alt)',
    nameEn: '(3D) Trick Questions (Old)',
    sourceName: 'SimpleBench',
    sourceUrl: 'https://simple-bench.com',
    color: '#6366F1',
    darkColor: '#4F46E5',
    lightBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    descriptionDe: 'Historische SimpleBench Trickfragen (aus Spalte X, skaliert: 1.2 × (X - 16.67)). Nur im Zeitreihendiagramm verfügbar.',
    descriptionEn: 'Historical SimpleBench Trick Questions (from Column X, rescaled: 1.2 × (X - 16.67)). Available exclusively in the timeline chart.',
    formulaDesc: '1.2 × (X - 16.67)',
    weightPct: 0,
    transform: (val: number) => Math.max(0, Math.min(100, 1.2 * (val - 16.6666))),
  },
];

/**
 * Resolves a bilingual score/category label given an optional raw CSV string or BenchmarkComponent.
 * Keeps in sync with original CSV strings while providing precise German translations when German is active.
 */
export function getBenchmarkCategoryLabel(
  rawCsvOrKey: string | undefined,
  lang: 'de' | 'en',
  compFallback?: BenchmarkComponent | null
): string {
  if (!rawCsvOrKey && !compFallback) return '';
  const raw = (rawCsvOrKey || compFallback?.key || '').trim();
  const lower = raw.toLowerCase();

  if (lang === 'en') {
    // English: return raw CSV string or English component name
    if (raw && raw !== '-' && !raw.startsWith('Col ') && !raw.endsWith('Old')) {
      return raw;
    }
    return compFallback?.nameEn || raw;
  }

  // German: check retired components first if matching key
  if (compFallback && (compFallback.id.endsWith('Old') || compFallback.key.endsWith('Old'))) {
    return compFallback.nameDe;
  }
  if (lower.includes('iqold') || lower.includes('iq (alt')) return 'IQ (Alt, v4.3)';
  if (lower.includes('nonhalluold') || lower.includes('faktentreue (alt')) return 'Faktentreue (Alt, v1)';
  if (lower.includes('scienceknowledgeold') || lower.includes('faktenwissen (alt')) return 'Faktenwissen (Alt)';
  if (lower.includes('trickquestionsold') || lower.includes('trickfragen (alt')) return '(3D) Trickfragen (Alt)';

  // German: translate standard score labels into German
  if (lower.includes('iq') || lower.includes('aa-ii')) return 'IQ';
  if (lower.includes('non-hallu') || lower.includes('faktentreue')) return 'Faktentreue';
  if (lower.includes('science knowledge') || lower.includes('faktenwissen') || lower.includes('omniscience')) return 'Faktenwissen';
  if (lower.includes('plot reading') || lower.includes('plot') || lower.includes('diagramm') || lower.includes('vision') || lower.includes('mmmu')) return 'Diagrammanalyse';
  if (lower.includes('diagnostic') || lower.includes('diagnostik') || lower.includes('medical') || lower.includes('mlcr')) return 'Diagnostik';
  if (lower.includes('excel')) return 'Excel-Analyst';
  if (lower.includes('agentic') || lower.includes('gdpx')) return 'Agentic Work';
  if (lower.includes('trick') || lower.includes('simplebench') || lower.includes('(3d)')) return 'Agentic Work';
  if (lower.includes('econ') || lower.includes('legal') || lower.includes('wirtschaft') || lower.includes('recht') || lower.includes('vals')) return 'Wirtschaft & Recht';

  if (compFallback) {
    return compFallback.nameDe;
  }
  return raw;
}

