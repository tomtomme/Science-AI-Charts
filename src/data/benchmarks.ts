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
    descriptionDe: 'AA-Omniscience: Kombiniert Nicht-Halluzination (33%) mit wissenschaftlichem Faktenwissen (67%). Belohnt korrekte Antworten, bestraft Halluzinationen, neutral bei Nichtwissen (-100 bis +100 auf 0–100% skaliert).',
    descriptionEn: 'AA-Omniscience: Combines non-hallucination (33%) and scientific knowledge (67%). Rewards correct answers, penalizes hallucinations, zero penalty for refusing (-100..+100 rescaled to 0..100%).',
    formulaDesc: '(F / 2 + 50) / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val / 2 + 50)),
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
    nameDe: '(3D) Trickfragen',
    nameEn: '(3D) Trick Questions',
    sourceName: 'SimpleBench',
    sourceUrl: 'https://simple-bench.com',
    color: '#6366F1', // Indigo
    darkColor: '#4F46E5',
    lightBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    descriptionDe: 'SimpleBench (Fangfragen & 3D-Denken): 200 Trickfragen (1 aus 6) zu räumlicher Vorstellung und gesundem Menschenverstand – für Menschen intuitiv, für KI anspruchsvoll (skaliert ab 16.67% Ratebasis).',
    descriptionEn: 'SimpleBench: 200 trick questions (1 of 6) testing spatial reasoning and common sense that are natural to physical humans but difficult for bots (rescaled above 16.67% random guessing).',
    formulaDesc: '1.2 × (J - 16.6666) / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, 1.2 * (val - 16.6666))),
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
    if (raw && raw !== '-' && !raw.startsWith('Col ')) {
      return raw;
    }
    return compFallback?.nameEn || raw;
  }

  // German: translate score label into German
  if (lower.includes('iq') || lower.includes('aa-ii')) return 'IQ';
  if (lower.includes('non-hallu') || lower.includes('faktentreue')) return 'Faktentreue';
  if (lower.includes('science knowledge') || lower.includes('faktenwissen') || lower.includes('omniscience')) return 'Faktenwissen';
  if (lower.includes('plot reading') || lower.includes('plot') || lower.includes('diagramm') || lower.includes('vision') || lower.includes('mmmu')) return 'Diagrammanalyse';
  if (lower.includes('diagnostic') || lower.includes('diagnostik') || lower.includes('medical') || lower.includes('mlcr')) return 'Diagnostik';
  if (lower.includes('excel')) return 'Excel-Analyst';
  if (lower.includes('trick') || lower.includes('simplebench') || lower.includes('(3d)')) return '(3D) Trickfragen';
  if (lower.includes('econ') || lower.includes('legal') || lower.includes('wirtschaft') || lower.includes('recht') || lower.includes('vals')) return 'Wirtschaft & Recht';

  if (compFallback) {
    return compFallback.nameDe;
  }
  return raw;
}
