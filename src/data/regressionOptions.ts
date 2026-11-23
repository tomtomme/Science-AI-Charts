import { RegressionType } from '../types';

export interface RegressionOption {
  id: RegressionType;
  labelDe: string;
  labelEn: string;
  shortDe: string;
  shortEn: string;
  descDe: string;
  descEn: string;
  color: string;
}

export type CorrelationRegressionOption = RegressionOption;

export const TIMELINE_REGRESSION_OPTIONS: RegressionOption[] = [
  {
    id: 'linear',
    labelDe: 'Linear (Trendlinie)',
    labelEn: 'Linear (Trendline)',
    shortDe: 'Linear',
    shortEn: 'Linear',
    descDe: 'Geht von einem gleichmäßigen Zuwachs pro Zeiteinheit aus. Als elementares Basismodell der deskriptiven Statistik veranschaulicht die Gerade die fundamentale Entwicklungsrichtung, kann jedoch Beschleunigungen oder Sättigungseffekte nicht abbilden.',
    descEn: 'Assumes a steady rate of improvement over time. As the fundamental baseline in descriptive statistics, this straight line captures the general trajectory, though it cannot reflect acceleration or plateaus.',
    color: '#6366f1', // Indigo
  },
  {
    id: 'exponential',
    labelDe: 'Exponential (Wachstum)',
    labelEn: 'Exponential (Growth)',
    shortDe: 'Expon.',
    shortEn: 'Expon.',
    descDe: 'Modelliert ein sich selbst verstärkendes, prozentuales Wachstum: Mit jedem Entwicklungsschritt fällt der absolute Punktgewinn größer aus. Eignet sich zur empirischen Prüfung von Thesen eines unaufhaltsamen KI-Sprungs („Law of Accelerating Returns“), stößt in der Realität jedoch unweigerlich an Grenzen.',
    descEn: 'Models compounding percentage growth: absolute gains expand with every stage. Useful to empirically test hypotheses of runaway AI leaps, though real-world physical and evaluation constraints inevitably lead to saturation.',
    color: '#8b5cf6', // Violet
  },
  {
    id: 'power',
    labelDe: 'Power (Potenzkurve)',
    labelEn: 'Power (Scaling)',
    shortDe: 'Power',
    shortEn: 'Power',
    descDe: 'Veranschaulicht klassische Skalierungsgesetze (Power Laws, y ∝ xᵇ): Anfangs steile Fortschritte flachen mit wachsender Modellbasis zunehmend ab (abnehmender Grenznutzen). Verdeutlicht, wie viel mehr Trainingsaufwand für die letzten Prozentpunkte auf dem Weg zur Perfektion nötig wird.',
    descEn: 'Illustrates classic scaling laws (y ∝ xᵇ): rapid early leaps gradually taper off as the base expands (diminishing returns). Highlights how each subsequent percentage gain demands exponentially greater training effort and compute.',
    color: '#ec4899', // Pink
  },
  {
    id: 'polynomial',
    labelDe: 'Polynom (Grad 2-4)',
    labelEn: 'Polynomial (deg 2-4)',
    shortDe: 'Polynom',
    shortEn: 'Polynom.',
    descDe: 'Passt eine flexible Bogenkurve an den empirischen Verlauf an. Grad 2 modelliert Beschleunigung oder Verlangsamung (Parabel), höhere Grade (3–4) erfassen auch Wendepunkte. Studierende sollten hierbei das statistische Risiko von „Overfitting“ an den Datenrändern beachten.',
    descEn: 'Fits a flexible curved trajectory to empirical points. Degree 2 captures simple acceleration or deceleration (parabola), while degrees 3–4 model inflection points. Beware of the statistical risk of "overfitting" near the outer boundaries.',
    color: '#f43f5e', // Rose
  },
  {
    id: 'loess',
    labelDe: 'LOESS (Smoothing)',
    labelEn: 'LOESS (Smoothing)',
    shortDe: 'LOESS',
    shortEn: 'LOESS',
    descDe: 'Ein nicht-parametrisches Verfahren: Statt einer starren mathematischen Formel berechnet LOESS für jeden Abschnitt eine gewichtete Regression aus benachbarten Beobachtungen. Folgt realen Entwicklungswellen besonders naturgetreu, ohne theoretische Vorannahmen aufzuzwingen.',
    descEn: 'A non-parametric approach: instead of imposing a rigid global formula, LOESS fits weighted regressions locally to neighboring observations. Faithfully tracks empirical innovation waves without forcing preconceived mathematical assumptions.',
    color: '#f59e0b', // Amber
  },
  {
    id: 'frontier',
    labelDe: 'Pioniere (Rekorde)',
    labelEn: 'Pioneers (Records)',
    shortDe: 'Pioniere',
    shortEn: 'Pioneers',
    descDe: 'Keine statistische Ausgleichskurve, sondern die empirische Pareto-Front: Sie verbindet ausschließlich historische Meilensteine, die zum jeweiligen Zeitpunkt einen neuen Rekordwert aller bisherigen Chatbots aufgestellt haben. Zeigt die technologische Speerspitze (State of the Art).',
    descEn: 'Not a statistical best-fit curve, but the empirical Pareto frontier: connects only those milestone models that broke previous all-time records upon release. Highlights the cutting edge of technological capability (State of the Art).',
    color: '#d97706', // Gold / Bronze
  },
];

export const DEFAULT_TIMELINE_REGRESSION_INDEX = Math.max(
  0,
  TIMELINE_REGRESSION_OPTIONS.findIndex((o) => o.id === 'loess')
);

export const CORRELATION_REGRESSION_OPTIONS: CorrelationRegressionOption[] = [
  {
    id: 'linear',
    labelDe: 'Linear (Trendlinie)',
    labelEn: 'Linear (Trendline)',
    shortDe: 'Linear',
    shortEn: 'Linear',
    descDe: 'Klassische Pearson-Regressionsgerade: Zeigt den proportionalen Zusammenhang zwischen zwei Benchmarks. Die Steigung quantifiziert, wie viele Punkte Benchmark Y durchschnittlich pro Punkt in Benchmark X hinzugewinnt.',
    descEn: 'Standard Pearson regression line: shows the proportional relationship between two benchmarks. The slope quantifies expected gains on benchmark Y per point increase in benchmark X.',
    color: '#6366f1', // Indigo
  },
  {
    id: 'polynomial',
    labelDe: 'Polynom (Grad 2-4)',
    labelEn: 'Polynomial (deg 2-4)',
    shortDe: 'Polynom',
    shortEn: 'Polynom.',
    descDe: 'Kurvenförmiger Zusammenhang: Prüft, ob der Fähigkeitstransfer zwischen beiden Benchmarks bei höherer Leistung ansteigt (progressive Synergien) oder abflacht (Sättigungseffekt). Vorsicht vor Überanpassung (Overfitting) an den Rändern.',
    descEn: 'Curvilinear relationship: tests whether cross-domain transfer accelerates at higher skill tiers (progressive synergies) or tapers off (saturation effect). Beware of boundary overfitting.',
    color: '#f43f5e', // Rose
  },
  {
    id: 'power',
    labelDe: 'Power (Potenzkurve)',
    labelEn: 'Power (Scaling)',
    shortDe: 'Power',
    shortEn: 'Power',
    descDe: 'Potenzbeziehung (Power Law, y ∝ xᵇ): Untersucht, ob Fähigkeiten als multiplikativer Hebel wirken, wobei Zuwächse in der Spitze häufig abnehmenden Grenzerträgen unterliegen.',
    descEn: 'Power-law scaling (y ∝ xᵇ): tests whether one capability acts as a compounding multiplier for another, often showing diminishing returns at the top tier.',
    color: '#ec4899', // Pink
  },
  {
    id: 'exponential',
    labelDe: 'Exponential (Wachstum)',
    labelEn: 'Exponential (Growth)',
    shortDe: 'Expon.',
    shortEn: 'Expon.',
    descDe: 'Exponentielle Kopplung: Modelliert Szenarien, in denen hohe Punktzahlen in Benchmark X einen überproportionalen, sprunghaften Durchbruch in Benchmark Y auslösen.',
    descEn: 'Exponential coupling: models scenarios where high mastery in benchmark X triggers disproportionate breakthrough jumps in benchmark Y.',
    color: '#8b5cf6', // Violet
  },
  {
    id: 'loess',
    labelDe: 'LOESS (Smoothing)',
    labelEn: 'LOESS (Smoothing)',
    shortDe: 'LOESS',
    shortEn: 'LOESS',
    descDe: 'Lokale Glättung: Bildet den realen Zusammenhang empirisch ab, ohne eine lineare oder quadratische Form zu erzwingen. Deckt auch lokale Schwelleneffekte oder Stagnationsplateaus auf.',
    descEn: 'Local scatterplot smoothing: maps empirical dependencies without forcing linear or quadratic shapes, revealing local threshold effects or performance plateaus.',
    color: '#f59e0b', // Amber
  },
];

export const DEFAULT_CORRELATION_REGRESSION_INDEX = Math.max(
  0,
  CORRELATION_REGRESSION_OPTIONS.findIndex((o) => o.id === 'loess')
);
