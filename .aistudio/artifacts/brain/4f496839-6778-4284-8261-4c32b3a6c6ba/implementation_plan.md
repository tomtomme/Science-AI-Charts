# Header Navigation & Controls Alignment Across All 4 Tabs

Unify the top sticky navigation header by elevating the primary interactive controls for all 4 views—**Balkendiagramm (Bar Chart)**, **Zeitreihe (Timeline)**, **Korrelationen (Correlations)**, and **Ökosystem (Ecosystem / Labs)**—directly into the same row as the main tab switcher when horizontal space permits, eliminating redundant secondary control toolbars and maximizing vertical viewport presence for data visualizations.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed during the interactive interview:

- **Timeline & Correlations Header Controls**: Move **all controls including fine-tuning parameters** into the top header row:
  - **Scope Toggle**: `All Models` vs `Pioneers` (`Pioniere`) with model count badges and icons.
  - **Regression Model Slider**: `[-] [slider] [+]` stepping between Linear, Quadratic, Cubic, Exponential, Logarithmic, LOESS, and Pioneers Envelope.
  - **Active Model Pill & Tooltip**: Colored badge showing the active model short name, with hover popover revealing description and mathematical formula.
  - **Fine-Tuning Parameter Inputs**: Polynomial degree selector (`Degree: 2–5`) when Polynomial is selected, and LOESS bandwidth slider (`Span: 15–80%`) when LOESS is selected.
- **Ecosystem (Labs) Header Controls**: Position controls in the exact requested sequential order:
  1. **Original Sheet pill**: External link pill opening the Google Sheet with sheet icon and target `_blank`.
  2. **Glossary pill**: Anchor button linking/jumping directly to the `#glossary-section` with book icon.
  3. **Lab category pills**: Segmented filter strip spanning `All Labs`, `Big Tech & Frontier`, `Open Weights`, `Model Tweakers`, `Contenders`, `Small & Fast`, and `Agent Scaffolding`.
  4. **Advanced toggle**: Button toggling the secondary filter drawer (revealing country pills, open/hybrid/closed weights toggle, and model size slider).
- **Responsive Screen Adaptation**: When screen width is constrained on mobile or tablet, the header row controls **wrap neatly or scroll horizontally** (`overflow-x-auto no-scrollbar`), exactly matching the established Bar Chart header controls behavior.
- **Visual Typography & Spacing Discipline**: All elevated controls strictly maintain the universal **12pt minimum (`text-xs` / 12px)**, standard interactive focus states, and zero-pill clean text hierarchy.

---

## 1. Overview & Core Concept

- **What It Does**: Consolidates the application's interactive controls into the sticky top navigation bar so each view presents its view-specific controls in the same row as the view tabs (`Balkendiagramm | Zeitreihe | Korrelationen | Ökosystem`).
- **Target Audience**: Researchers, data analysts, and decision-makers comparing LLM benchmark capabilities across time, parameter size, and cost dimensions.
- **Key Value**: Saves 40px–55px of vertical screen real estate per view, eliminating visual fragmentation from stacked toolbar strips while keeping controls immediately accessible at the top of the viewport without needing to scroll.

---

## 2. User Experience & Visual Design

### Unified Sticky Header Layout

When switching tabs, the left side of the top header always hosts the primary view switcher (`Balkendiagramm`, `Zeitreihe`, `Korrelationen`, `Ökosystem`). The right side of the header row dynamically displays the contextual controls for the currently active tab:

```
Desktop Header Bar (≥ 1280px / XL Viewport):
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Balkendiagramm | Zeitreihe | Korrelationen | Ökosystem]              [Contextual Controls for Active Tab]              │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Tab 1: Balkendiagramm (Bar Chart)
[Balkendiagramm | Zeitreihe | Korrelationen | Ökosystem]   [Score: Final Score (M) ▾]  [Free(API|Chat)Paid|All]  [⚙ Erweitert]

Tab 2: Zeitreihe (Timeline)
[Balkendiagramm | Zeitreihe | Korrelationen | Ökosystem]   [All | ✦ Pioniere]  [Modell: - ──●── +] [Linear] [Grad: 2]

Tab 3: Korrelationen (Correlations)
[Balkendiagramm | Zeitreihe | Korrelationen | Ökosystem]   [All | ✦ Pioniere]  [Modell: - ──●── +] [Linear] [Span: 30%]

Tab 4: Ökosystem (Ecosystem / Labs)
[Balkendiagramm | Zeitreihe | Korrelationen | Ökosystem]   [↗ Original Sheet] [📖 Glossar] [All | Big Tech | Open...] [⚙ Erweitert]
```

### Mobile / Tablet Adaptation (< 1280px)

- The header container uses `flex flex-col lg:flex-row lg:items-center justify-between gap-2 py-1.5 sm:py-2`.
- When horizontal width is insufficient to display both the tab group and all controls in a single line, the controls wrap cleanly below the tabs and allow smooth horizontal scrolling (`max-w-full overflow-x-auto no-scrollbar`) without breaking page margins or viewport width.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: State Management (Lifted vs Controlled Props)**
  - *Chosen Approach*: Lift the active regression model, scope, parameter values, and ecosystem category filters into `App.tsx` (or pass control render callbacks) so the sticky header in `App.tsx` directly renders and controls the state, passing the values down to `TimelineScatterplot`, `CorrelationsScatterplot`, and `LabMatrixView`.
  - *Why*: Guarantees instant responsiveness, avoids component re-mounting glitches, keeps URL synchronization clean, and ensures tooltips and popovers mount cleanly in the sticky top bar.
- **Decision 2: Elimination of Redundant Duplicate Control Bars**
  - *Chosen Approach*: Remove the redundant secondary control bars from within the bodies of `TimelineScatterplot.tsx`, `CorrelationsScatterplot.tsx`, and `LabMatrixView.tsx` once their controls are elevated to the header bar.
  - *Why*: Avoids confusing duplicate controls and reclaims full vertical viewport height for the charts and lab cards.
- **Decision 3: Preserving Tooltips & Formula Displays**
  - *Chosen Approach*: Preserve the rich interactive tooltips (R² metrics, Pearson r, Spearman Rho, regression formula, and parameter explainers) directly within the elevated controls using our unified `Tooltip.tsx` component.
  - *Why*: Retains full mathematical interpretability without visual clutter.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Sticky Top Navigation Bar                                        │  │
│  │ ┌─────────────────────────┐  ┌─────────────────────────────────┐ │  │
│  │ │ Primary Tab Switcher    │  │ Active View Controls Slot       │ │  │
│  │ │ - Balkendiagramm        │  │ - Bar Chart: ScoreSlider + Price│ │  │
│  │ │ - Zeitreihe             │  │ - Timeline: Scope + Model+Params│ │  │
│  │ │ - Korrelationen         │  │ - Correl: Scope + Model+Params  │ │  │
│  │ │ - Ökosystem             │  │ - Labs: Sheet+Glossar+Cats+Adv  │ │  │
│  │ └─────────────────────────┘  └─────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Main Content Area                                                │  │
│  │  - ExplodedBarChart.tsx (reclaims height)                         │  │
│  │  - TimelineScatterplot.tsx (reclaims 50px top control bar)       │  │
│  │  - CorrelationsScatterplot.tsx (reclaims 50px top control bar)   │  │
│  │  - LabMatrixView.tsx (reclaims category & sheet bar)             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Component State Mapping

| View | Elevated Header Controls | State in App.tsx / Handlers |
|---|---|---|
| **Bar Chart** | Filter reset badge, `ScoreSlider`, `Free(API\|Chat)Paid\|All`, `Advanced toggle` | Existing `scoreMode`, `priceFilter`, `showAdvanced` |
| **Timeline** | Scope (`all` \| `frontier`), Regression Model Slider (`0..6`), Param Input (`polyDegree` \| `loessSpan`) | Lift `timelineScope`, `timelineRegressionIndex`, `timelinePolyDegree`, `timelineLoessSpan` |
| **Correlations**| Scope (`all` \| `frontier`), Regression Model Slider (`0..6`), Param Input (`polyDegree` \| `loessSpan`) | Lift `correlationsScope`, `correlationsRegressionIndex`, `correlationsPolyDegree`, `correlationsLoessSpan` |
| **Ecosystem** | `Original Sheet` button, `Glossary` anchor button, Category pills (`all`..`harness`), `Advanced toggle` | Lift `labCategory`, `showLabAdvanced`, scroll to `#glossary-section` |

---

## 5. Verification & Testing Plan

1. **Header Row Rendering on Each Tab**:
   - Switch to **Balkendiagramm**: Verify ScoreSlider, Price Filter, and Advanced button remain functional.
   - Switch to **Zeitreihe**: Verify Scope (`All` / `Pioniere`), Regression Model slider, model pill tooltip, and degree/span inputs appear in the header row and actively update the regression curve in the scatterplot.
   - Switch to **Korrelationen**: Verify Scope, Model slider, and parameter inputs appear in the header row and actively update the 3 correlation plots.
   - Switch to **Ökosystem**: Verify `Original Sheet`, `Glossar`, category pills (`All Labs` to `Agent Scaffolding`), and `Advanced` toggle appear in the header row in exact sequence and filter cards.
2. **Responsive Wrapping**: Verify on screen widths from 375px (mobile) to 1920px (desktop) that controls wrap or scroll horizontally with `no-scrollbar` without overflow breaks.
3. **Typography & Styling**: Verify all font sizes are $\ge 12\text{pt}$ (`text-xs`), dark/light theme tokens match, and tooltips open cleanly.
4. **Code Quality**: Verify build with `compile_applet` and type-checking with `lint_applet` (`tsc --noEmit`).

---

## 6. Implementation Status: Complete

- [x] **TimelineScatterplot.tsx**: Added controlled props (`timelineScope`, `regressionIndex`, `polyDegree`, `loessSpan`, `hideHeaderControls`), compacted top metrics bar to single compact row, and suppressed duplicate regression controls when elevated to header.
- [x] **CorrelationsScatterplot.tsx**: Added controlled props (`scope`, `regressionIndex`, `polyDegree`, `loessSpan`, `hideHeaderControls`), wrapped internal controls with `!hideHeaderControls` condition.
- [x] **LabMatrixView.tsx**: Added controlled props (`activeGroup`, `showAdvanced`, `hideHeaderControls`), wrapped top category and action toolbar with `!hideHeaderControls` condition, and wired reset filter handler.
- [x] **App.tsx**: Elevated state for Timeline, Correlations, and LabMatrix. Rendered controls directly into the sticky top navigation row alongside the tabs with responsive horizontal scrolling (`no-scrollbar`). Preserved exact order for Ecosystem (`Original Sheet` → `Glossar` → `Kategorien` → `Erweitert`).
- [x] **Compilation & Linting**: Passed `compile_applet` and `lint_applet` (`tsc --noEmit`) with zero errors. Dev server restarted.
