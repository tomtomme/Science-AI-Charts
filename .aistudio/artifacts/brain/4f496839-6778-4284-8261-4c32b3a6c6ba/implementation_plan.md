# New Correlations Tab: Bivariate Scatterplot & Correlation Analysis

Architects and implements a new **Correlations** tab within the benchmark section, enabling deep analysis of bivariate relationships (linear, monotonic, and non-linear) between any two benchmark dimensions or composite scores.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product requirements and architectural choices have been aligned:

- **Navigation**: Integrated as a **third view button** in the Benchmark toolbar: `Balkendiagramm` (Bar Chart) | `Zeitachse` (Timeline) | `Korrelationen` (Correlations).
- **Dimension Selectors (X & Y)**: Both X- and Y-axes support all 8 individual benchmark categories (Columns D–K) as well as the 3 composite scores (New Score, Old Score, Worst Case), giving 11 selectable dimensions for each axis (121 cross-comparison combinations).
- **Correlation Metrics**: Displays **Pearson's $r$** (linear correlation) and **Spearman's $\rho$** (rank/monotonic correlation) side-by-side in high-contrast badges above the chart. The active regression model contextually highlights the most appropriate metric (e.g., Pearson for Linear, Spearman for non-linear/monotonic fits).
- **Regression Modeling**: Reuses the mathematical curve fitting engine from the Timeline tab (Linear, Polynomial, Power, Exponential, Moving Average, LOESS, Logistic), complete with the stable `w-[76px]` Param input for tunable hyperparameters.
- **Interactive Experience**: Leverages the smooth 1800ms hover persistence and invisible bridge so model details and chat links in tooltips remain effortlessly clickable.

---

## 1. Overview & Core Concept

- **What It Delivers**: A high-density analytical playground to explore trade-offs and emergent correlations across LLM capabilities—e.g., *Does high reasoning (MLCR-AA) correlate with low hallucination?*, *How strongly does Code (10 Evals) predict overall Old Score?*, or *Do models that excel at Trick Questions underperform on Excel Agent tasks?*
- **Target Audience**: AI researchers, benchmark evaluators, and engineers seeking empirical insight into capability trade-offs and non-linear clustering.
- **Key Value**: Moves beyond single-dimensional leaderboards to reveal multidimensional trade-offs with mathematically rigorous rank and linear correlation statistics.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Accessing the Tab**:
   - In the top sub-navigation, the user clicks the new **Korrelationen / Correlations** button (`GitCompare` / `ScatterChart` icon).
   - The view initializes by default with **X = Col D (Coding & Math)** and **Y = Col E (Non-Hallucination)**, or **X = Old Score** and **Y = New Score**, instantly rendering all models with scores on both axes.
2. **Configuring Axes**:
   - The toolbar provides two compact dimension pickers: **X-Achse** and **Y-Achse**, each offering:
     - Composite Scores: *New Score (8 Benchmarks)*, *Old Score (5 Benchmarks)*, *Worst Case*
     - Component Categories: *#1 Coding & Math*, *#2 Non-Hallucination*, *#3 Science Knowledge*, *#4 Vision & Plotting*, *#5 Medical Reasoning*, *#6 Excel Agent*, *#7 Trick Questions*, *#8 Economics & Legal*
   - Each axis displays its custom color badge matching the benchmark palette.
3. **Evaluating Correlation Metrics**:
   - Directly above the scatter canvas, two badges display side-by-side:
     - **Pearson $r$**: Color-coded by strength (e.g., $r = +0.78$ Strong Positive, emerald; $r = +0.32$ Moderate, sky; $r = -0.45$ Inverse, rose).
     - **Spearman $\rho$**: Captures non-linear monotonic trends regardless of whether data follows a straight line.
   - An intuitive interpretive label clarifies the relationship in plain language (e.g., *"Starke monotone Korrelation"* / *"Moderate lineale Beziehung"*).
4. **Fitting Non-Linear Curves**:
   - Users can toggle through the regression model slider (Linear, Polynomial, Moving Average, LOESS, Logistic, Power, Exponential).
   - The curve recalculates instantly against $(x_i, y_i)$ pairs, with the Param input adjusting degree, span, or window.
5. **Inspecting Models**:
   - Hovering any dot opens the persistent card showing Model Name, Company Flag, Release Date, exact X and Y scores, and clickable Chat/Paper links.

---

## 3. Mathematical & Data Strategy

### Correlation Formulas

1. **Pearson Correlation ($r$)**:
   $$\bar{x} = \frac{1}{n} \sum x_i, \quad \bar{y} = \frac{1}{n} \sum y_i$$
   $$r = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum (x_i - \bar{x})^2 \sum (y_i - \bar{y})^2}}$$
2. **Spearman Rank Correlation ($\rho$)**:
   - Convert $x_i$ and $y_i$ into fractional ranks $R(x_i)$ and $R(y_i)$ (accurately averaging tied ranks).
   - Compute Pearson correlation over the rank arrays:
     $$\rho = \frac{\text{Cov}(R_x, R_y)}{\sigma(R_x)\sigma(R_y)}$$
   - Resilient against outliers, saturation ceilings, and non-linear monotonic pacing.

### Dimension Data Extractor

A clean accessor maps any dimension index $0..10$ to a numeric score for a given `ModelRecord`:
- Index 0: `scoreNew`
- Index 1: `scoreOld`
- Index 2: `scoreWorstCase`
- Index 3..10: Component raw/transformed score from `model.rawScores` or `model.breakdown[idx - 3]`

---

## 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App.tsx (Root State)                            │
│  - benchmarkView: 'barchart' | 'timeline' | 'correlations'             │
│  - fullTimelineModels: 224+ historical models                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼ (when benchmarkView === 'correlations')
┌────────────────────────────────────────────────────────────────────────┐
│                 CorrelationsScatterplot.tsx                            │
│  State:                                                                │
│  - xAxisDimension: 3 (Col D - Coding & Math)                           │
│  - yAxisDimension: 4 (Col E - Non-Hallucination)                       │
│  - regressionIndex: 0 (Linear) or 3 (Polynomial)                       │
│  - movingAvgDays / polyDegree / loessSpan / logisticCeiling            │
│  - timelineScope: 'all' | 'frontier'                                   │
├───────────────────────────────────┬────────────────────────────────────┤
│   Controls Toolbar                │   Scatterplot SVG Canvas           │
│   ├── X-Axis Dimension Selector   │   ├── X-Axis Ticks & Label         │
│   ├── Y-Axis Dimension Selector   │   ├── Y-Axis Ticks & Label         │
│   ├── Model Slider + Param Input  │   ├── Scatter Circles (x, y)       │
│   └── Pearson r + Spearman rho    │   ├── Fitted Curve SVG Path        │
│                                   │   └── Persistent Hover Card        │
└───────────────────────────────────┴────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   mathRegression.ts & correlationUtils.ts              │
│  - calculatePearsonR(points): number                                   │
│  - calculateSpearmanRho(points): number                                │
│  - calculateRegression(points, type, steps, param): RegressionResult   │
└────────────────────────────────────────────────────────────────────────┘
```

### Proposed Files & Modifications:

1. `src/utils/correlationUtils.ts` (New):
   - `calculatePearson(x: number[], y: number[]): { r: number; labelDe: string; labelEn: string }`
   - `calculateSpearman(x: number[], y: number[]): { rho: number; labelDe: string; labelEn: string }`
   - Fast fractional rank calculator for tied scores.
2. `src/components/CorrelationsScatterplot.tsx` (New Component):
   - Full scatterplot implementation with two dimension selectors (X & Y), regression model slider, side-by-side Pearson & Spearman badges, dynamic SVG axis scaling, and persistent hover tooltips.
3. `src/App.tsx`:
   - Extend `benchmarkView` union: `'barchart' | 'timeline' | 'correlations'`.
   - Add view switcher button for "Korrelationen" with icon (`GitCompare`).
   - Render `CorrelationsScatterplot` when `activeTab === 'benchmark' && benchmarkView === 'correlations'`.
4. Verification:
   - Run `compile_applet` and `lint_applet` to ensure zero compilation or type issues.
