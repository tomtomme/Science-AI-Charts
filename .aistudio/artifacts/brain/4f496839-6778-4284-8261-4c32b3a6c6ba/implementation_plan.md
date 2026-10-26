# LLM Labs & Model Ecosystem Redesign

Overhaul the **LLM Labs & Ecosystem** view into an intuitive, visually structured catalog by stacking vendor models vertically from smallest to largest, replacing raw billion/trillion counts with beginner-friendly tier names, introducing visual mini scale meters with parameter hover tooltips, setting 'All' as the default tab, and adding Open/Closed and Country filter controls.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were aligned during the interactive clarification phase:

- **Vertical Model Stacking**: Models inside each vendor card are stacked in a single vertical column from smallest (e.g. Micro / Small) to largest (e.g. Planetary / Singularity), creating an unambiguous ladder of scale.
- **Beginner-Friendly Tiers & Visual Scale Meters**: Tier names from the Google Sheet (*Small*, *Medium*, *Large*, *Massive*, *Colossal*, *Planetary*, etc.) are used instead of intimidating billion/trillion parameter counts. Each tier features a mini visual gauge/scale meter icon with a hover tooltip showing the exact parameter count.
- **Default Tab & Country Navigation**: **"All Labs"** is positioned as the first, default active tab on the far left. A country filter strip allows quick filtering by nation (US, China, France, etc.) with real-time lab counts.
- **Weights Architecture Filter**: A high-level toggle allows filtering labs by **Open Weights**, **Closed Weights**, or **All**.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the dense, multi-column ecosystem matrix into a clean, card-based catalog where users can explore 75+ AI labs and their model families.
- **Target Audience**: AI researchers, enterprise teams, and casual users seeking to understand which lab develops which models, how large those models are, and whether they are open or closed.
- **Key Value**: Eliminates cognitive overload by replacing cluttered 2D grids with a vertical hierarchy, human-readable labels, and instant multi-dimensional filtering (category, country, and open/closed weights).

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Default Landing**: User enters the tab and immediately sees **"All Labs"** selected by default, displaying a responsive grid of AI lab cards with country flags, primary chatbot engine, and ecosystem tooling.
2. **Filter by Country or Weights**: User clicks a country pill (e.g., `🇺🇸 America (US)`, `🇨🇳 China`, `🇫🇷 France`) or toggles `Open Weights` to instantly narrow the visible labs with zero layout shift.
3. **Inspect Model Ladders**: Inside any lab card (e.g. Google, Anthropic, Meta, DeepSeek), models are arranged top-to-bottom from smallest to largest.
4. **Hover for Parameter Precision**: Hovering over any tier label (e.g., *Small* or *Massive*) reveals a micro-tooltip displaying the exact parameter range (e.g., `< 32B Parameters: Gemma 2 27B, Gemma 3`).
5. **Cross-Reference Benchmark**: Clicking a lab name or model links directly to that model's benchmark performance in the main Bar Chart or Timeline views.

### Visual Identity & Theme

- **Aesthetic Direction**: High-density, professional technical dashboard adhering to the *SaaS & Dashboard Guidelines* and *Universal Frontend Design Constitution*.
- **Color Palette & Scale Meter Hierarchy**:
  - *Lightweight / Edge (<32B)*: Cool emerald / teal accents (`bg-emerald-500`) with level-1 meter.
  - *Mid-Tier (<128B–256B)*: Royal blue / cyan accents (`bg-blue-500`) with level-2 meter.
  - *Massive / Frontier (<512B–1.5T)*: Indigo / violet accents (`bg-indigo-500`) with level-3 meter.
  - *Planetary / Singularity (>5T)*: Rose / crimson accents (`bg-rose-500`) with level-4 meter.
- **Mini Scale Meter Component**: A refined 4-bar SVG/CSS stepped gauge `[ ▂▃▅]` indicating size tier at a glance.
- **Single-Elevation Depth**: Flat card surfaces with crisp hairline borders (`border border-slate-200 dark:border-slate-800`), avoiding nested cards within cards.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Single-Column Vertical Model Stacking vs. 2-Column Grid
- **Chosen Approach**: Single-column vertical list ordered strictly from smallest to largest tier.
- **Why**: Eliminates the zig-zag scanning problem where users had to read left-to-right and top-to-bottom simultaneously. Vertical stacking creates a natural cognitive "ladder" of model power.
- **Alternatives Considered**: 2-column grid was rejected because it placed small and massive models side-by-side, breaking visual hierarchy.

### Decision 2: Beginner Tier Names with Hover Parameter Tooltips
- **Chosen Approach**: Primary label displays the friendly tier name (e.g., *Small*, *Medium*, *Massive*) alongside the mini scale meter. Hovering reveals the exact parameter specification (`< 32B`, `< 512B`).
- **Why**: Protects non-technical users from confusing parameter terminology while retaining full precision for advanced researchers via instant hover.

### Decision 3: Country Filter Pills vs. Slider
- **Chosen Approach**: Segmented horizontal pill buttons with country flags and count badges.
- **Why**: Discrete countries (US, China, France, etc.) are categorical data with no natural continuous order; a linear slider would be unintuitive and awkward for discrete national entities.

---

## 4. Technical Architecture & Data Strategy

### Component Architecture & State Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LabMatrixView Container                         │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Controls & Filter Toolbar                                        │  │
│  │ ┌─────────────────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │ │ Group Tabs: All | Top10 │  │ Open/Closed  │  │ Search Bar   │  │  │
│  │ └─────────────────────────┘  └──────────────┘  └──────────────┘  │  │
│  │ ┌──────────────────────────────────────────────────────────────┐ │  │
│  │ │ Country Filter Strip: All (75) | 🇺🇸 US (38) | 🇨🇳 China (22) │ │  │
│  │ └──────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Responsive Lab Card Grid (1 to 4 cols)                           │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────┐  ┌────────────────────────────┐  │  │
│  │  │ Lab Card (e.g. Anthropic)  │  │ Lab Card (e.g. Google)     │  │  │
│  │  │ • Flag + Lab Name + Open   │  │ • Flag + Lab Name + Hybrid │  │  │
│  │  │ • Engine / Chatbot Name    │  │ • Engine / Chatbot Name    │  │  │
│  │  │ • Vertical Model Ladder:   │  │ • Vertical Model Ladder:   │  │  │
│  │  │   [ ▂] Medium: Haiku       │  │   [ ] Small: Gemma         │  │  │
│  │  │   [ ▃] Massive: Sonnet     │  │   [ ▂] Medium: Flash-Lite  │  │  │
│  │  │   [ ▄] Planetary: Opus     │  │   [ ▃] Large: Flash        │  │  │
│  │  │   [ ▅] Singularity: Fable  │  │   [ ▄] Colossal: Pro       │  │  │
│  │  │ • Tooling: SDK & Agents    │  │ • Tooling: SDK & Agents    │  │  │
│  │  └────────────────────────────┘  └────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Pipeline & State Management

- **Dataset**: `FALLBACK_LAB_ENTRIES` and live sync from Google Sheets GID `355721692`.
- **Tier Definitions**:
  - Micro: `< 0.5B` (Level 1)
  - Mini: `< 2B` (Level 1)
  - Tiny: `< 8B` (Level 1)
  - Small: `< 32B` (Level 1)
  - Medium: `< 128B` (Level 2)
  - Large: `< 256B` (Level 2)
  - Massive: `< 512B` (Level 3)
  - Colossal: `< 1.5T` (Level 3)
  - Planetary: `< 5T` (Level 4)
  - Singularity: `< 15T` (Level 4)
  - God Tier: `< 45T` (Level 4)
- **Active State Store**:
  - `activeGroup`: `'all' | 'top10' | 'contender' | 'tweakers' | 'small' | 'harness'` (default: `'all'`)
  - `activeWeightsFilter`: `'all' | 'open' | 'closed'`
  - `selectedCountry`: `'all' | string`
  - `searchQuery`: `string`

---

## 5. Verification & Testing Plan

1. **Layout Integrity**: Verify that cards render cleanly in responsive 1, 2, 3, and 4-column desktop grids without clipping or horizontal overflow.
2. **Ladder Ordering**: Confirm that models within every vendor card are strictly ordered from smallest parameter tier to largest.
3. **Hover Tooltip Fidelity**: Verify that hovering over tier names or scale meters displays the parameter bounds with high contrast and zero delay.
4. **Filtering Accuracy**: Test combinations of Group Tab + Country Pill + Open/Closed Toggle to ensure filtered counts and results match expectations.
5. **Compilation & Linting**: Run `lint_applet` and `compile_applet` to confirm zero TypeScript warnings or errors.
