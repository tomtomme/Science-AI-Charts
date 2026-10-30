# LLM Labs & Model Ecosystem Redesign

Overhaul the **LLM Labs & Ecosystem** view into an intuitive, visually structured catalog by stacking vendor models vertically from smallest to largest, replacing raw billion/trillion counts with beginner-friendly tier names, introducing visual mini scale meters with parameter hover tooltips, setting 'All' as the default tab, and adding Open/Closed, Country, and Model Size filter controls with granular single-category slider steps and clean compact card views.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were aligned during the interactive clarification phase:

- **Vertical Model Stacking**: Models inside each vendor card are stacked directly from smallest (e.g. Micro / Mini / Tiny / Small) to largest (e.g. Planetary / Singularity).
- **Granular Single-Category Slider with Small-Model Lab Tiers**: The model size slider is granular with **11 positions (0 to 10)**, isolating every single tier:
  - `0`: All Sizes (Alle Größen)
  - `1`: Micro (< 0.5B Parameters: Micro)
  - `2`: Mini (< 2B Parameters: Mini)
  - `3`: Tiny (< 8B Parameters: Tiny)
  - `4`: Small (< 32B Parameters: Small)
  - `5`: Medium (< 128B Parameters: Medium)
  - `6`: Large (< 256B Parameters: Large)
  - `7`: Massive (< 512B Parameters: Massive)
  - `8`: Colossal (< 1.5T Parameters: Colossal)
  - `9`: Planetary (< 5T Parameters: Planetary)
  - `10`: Singularity (≥ 15T to 45T Parameters: Singularity, God Tier)
- **2-Category-Combined Pills**: The quick-selection pill buttons follow the 2-category-combined paradigm:
  1. `Planetary / Singularity` (combines Planetary and Singularity/GodTier)
  2. `Massive / Colossal` (combines Massive and Colossal)
  3. `Medium / Large` (combines Medium and Large)
  4. `Small / Tiny` (combines Tiny and Small)
  5. `Mini / Micro` (combines Micro and Mini)
  plus `All Sizes` (Alle Größen). Clicking a pill selects the combined bracket; using the slider steps through individual categories. When an individual category is selected, its parent combined pill indicates active state.
- **Removed Open / Hybrid / Closed Notes in Compact Cards**: In the compact model cards (displayed when a model size is active):
  - The vendor header weights badge (`Offen` / `Hybrid` / `Geschlossen`) is hidden.
  - The model row open/closed badge is hidden.
  - The card is strictly focused on: Vendor Name & Country, Model Family, and the selected model(s) matching that exact size tier.
- **Universal Alphabetical Sorting (A-Z)**: Labs are consistently sorted alphabetically by vendor name across all filter states, including when selecting individual country pills.
- **Space-Saving Price Switcher `Free(API|Chat)Paid|All`**: In the bar chart view, the price switcher has been upgraded from `Free | Paid | All` to the space-saving format `Free(API|Chat)Paid|All`:
  - `API`: Free API only (`isFreeApi`)
  - `Chat`: Free Chat OR API (`!isPaid || isFreeApi`)
  - `Paid`: Paid Chat only (`isPaid`, indicated with 💲)
  - `All`: All models (Kostenlos & Bezahlt)
  with active state highlighting and bilingual tooltips.
- **Light / Dark Mode Switcher with GPS & Timezone Auto-Switching (`☀️ | 🌙 | Auto | 📍`)**: A compact segmented switcher is located next to the DE/EN language switcher:
  - **Browser Geolocation API (`📍`)**: Integrated `navigator.geolocation.getCurrentPosition()`. Clicking the location pin (`📍`) or switching to `Auto` actively triggers the browser's native location permission dialog ("Darf die Website auf Ihren Standort zugreifen?").
  - **Exact Astronomical Solar Calculation**: Using exact latitude & longitude, the app calculates the precise sunrise and sunset times for the user's location based on astronomical solar declination (e.g. ~17:10 sunset in late October in Germany).
  - **Firefox Privacy / Anti-Fingerprinting Fallback**: Standard JavaScript time reading in Firefox on Linux (Manjaro) and Android is often spoofed to UTC by privacy protections (e.g. `privacy.resistFingerprinting`). If location is not granted, the app automatically checks `window.matchMedia('(prefers-color-scheme: dark)')` to match the OS theme schedule (which Android & Linux desktops trigger at sunset), followed by seasonal clock estimation.
  - **Manual Override Anytime**: Users can click the Sun (`☀️`) or Moon (`🌙`) buttons to override the automatic mode at any time, with persistence in `localStorage`.
  - **Activate Auto Mode**: Clicking the `Auto` button strictly activates automatic mode (idempotent).
  - **Anti-FOUC & Tailwind v4 Custom Variant**: Configured `@custom-variant dark (&:where(.dark, .dark *));` in `index.css` and a lightweight pre-hydration inline script in `index.html` to prevent any flash of unstyled theme on initial load.
- **Universal Tooltip & Popover Architecture Across All 4 Tabs (`Tooltip.tsx`)**:
  - Replaced erratic CSS-only hover states and native `title="..."` attributes (which spawn under the cursor and instantly close when the pointer moves diagonally) with a unified, accessible `Tooltip` component across all 4 application tabs (Bar Chart, Timeline, Correlations, and LLM-Labs).
  - **Grace Period (280ms debounce)**: When moving the cursor away from a pill or button toward interactive links inside the popover (such as the API Glossary link or Weights Details jump marks), the popover remains open seamlessly. Entering the popover clears the close timer, keeping it open indefinitely during interaction.
  - **Cursor Clearance**: Ample vertical clearance (`mt-2.5 sm:mt-3` or `mb-2.5 sm:mb-3`) and upward indicator arrows ensure the cursor never covers or obscures text.
  - **Unified Styling**: Sleek dark glassmorphism card (`bg-slate-900/95 dark:bg-slate-950/95 border-slate-700/80 shadow-2xl backdrop-blur-md z-50 text-xs text-slate-100`).
  - **Applied Everywhere**: Model Size combined pills, Country pills, Open/Hybrid/Closed weights pills, Free(API|Chat)Paid|All switchers, Explosion toggle, Scope buttons, Sort buttons, Timeline regression badges, and Correlation coefficient badges.
- **Header Pop-Up & Tooltip Cleanups**:
  - **Sync-Button Popover Unification**: Replaced the native browser `title` and old inline hover div with our unified `Tooltip` component. Removed the redundant static date text next to the sync button. The sync popover now displays a single, clean card with the live sync badge, last sync date, and auto-sync notice.
  - **Google Sheet & GitHub Popover**: Replaced native `title="..."` attributes with the unified `Tooltip` component (`align="right"` with ample cursor clearance), preventing the mouse pointer from overlapping or obscuring the text.
  - **Suppressed Geolocation Warning Toast**: In environments like Firefox on Manjaro (where privacy/anti-fingerprinting settings reject geolocation without prompting), the noisy "Location permission denied" message is completely suppressed; the app silently and seamlessly relies on system theme and clock fallback.
- **Bar Chart "Erweitert" Controls Restructuring**:
  - **Explosion Switch Relocation**: Moved the Explosion Switch (`an` | `teils` | `aus`) from the sticky top bar into the first row of the expanded "Erweitert" panel (`SearchBar.tsx`), positioned centered between the Search input and the Score-Slider.
  - **Style Harmonization**: Aligned its padding (`px-2 py-1`), font sizes (`text-[10px] sm:text-[11px]`), font families (`font-mono`), and container border styling to match the Score-Slider and surrounding button groups.
  - **Score-Slider "Klick mich" Popover**: Positioned a compact, focused `Tooltip` pop-up displaying strictly `"Klick mich"` centered directly above the clickable colored score label button (`position="top"`).


---

## 1. Overview & Core Concept

- **What It Does**: Transforms the dense, multi-column ecosystem matrix into a clean, card-based catalog where users can explore 75+ AI labs and their model families.
- **Target Audience**: AI researchers, enterprise teams, and casual users seeking to understand which lab develops which models, how large those models are, and whether they are open or closed.
- **Key Value**: Eliminates cognitive overload by replacing cluttered 2D grids with a vertical hierarchy, human-readable labels, and instant multi-dimensional filtering (category, country, model size, and open/closed weights).

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Default Landing**: User enters the tab and immediately sees **"All Labs"** selected by default, displaying a responsive grid of AI lab cards with country flags, primary chatbot engine, model stacks, and ecosystem tooling.
2. **Granular Model Size Exploration**: User moves the slider step-by-step through individual categories (`Micro < 0.5B` → `Mini < 2B` → `Tiny < 8B` → `Small < 32B` → `Medium < 128B` → `Large < 256B` → `Massive < 512B` → `Colossal < 1.5T` → `Planetary < 5T` → `Singularity ≥ 15T`). Only models of that specific category are shown in each card.
3. **Combined Model Size Exploration**: User clicks one of the 5 combined pills (e.g. `Mini / Micro`, `Small / Tiny`, `Medium / Large`, `Massive / Colossal`, `Planetary / Singularity`) to view models spanning both categories in that bracket.
4. **Clean Focused Cards**: When any size filter is active, cards are stripped of all secondary metadata—including open/closed notes—leaving only the Vendor, Model Family, and the selected model.
5. **Alphabetical Country Filtering**: Clicking any country pill immediately displays matching labs in strict alphabetical order (A-Z).

---

## 3. Technical Architecture & Data Strategy

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
│  │ │ Granular Slider: [All ─ Micro ─ Mini ─ Tiny ─ Small ... Sing] │ │  │
│  │ │ Combined Pills: [All] [Planetary/Sing] ... [Small/Tiny] ...   │ │  │
│  │ └──────────────────────────────────────────────────────────────┘ │  │
│  │ ┌──────────────────────────────────────────────────────────────┐ │  │
│  │ │ Country Strip: All (A-Z) | 🇺🇸 US (A-Z) | 🇨🇳 China (A-Z) ... │ │  │
│  │ └──────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Compact Cards in Size Mode (No Open/Closed badges or notes)      │  │
│  │  ┌────────────────────────────┐  ┌────────────────────────────┐  │  │
│  │  │ 🇺🇸 Anthropic               │  │ 🇫🇷 Mistral AI              │  │  │
│  │  │ Model Family: Claude       │  │ Model Family: Mistral      │  │  │
│  │  │ [ ▄] Planetary: Opus       │  │ [ ▄] Tiny: Ministral 8B    │  │  │
│  │  │ (No Open/Closed notes)     │  │ (No Open/Closed notes)     │  │  │
│  │  └────────────────────────────┘  └────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Verification & Testing Plan

1. **Granular Slider Steps**: Verified 11 slider positions (0 to 10) with individual single-category labels:
   - `All`
   - `Micro (< 0.5B)`
   - `Mini (< 2B)`
   - `Tiny (< 8B)`
   - `Small (< 32B)`
   - `Medium (< 128B)`
   - `Large (< 256B)`
   - `Massive (< 512B)`
   - `Colossal (< 1.5T)`
   - `Planetary (< 5T)`
   - `Singularity (≥ 15T)`
2. **2-Category-Combined Pills**: Verified all 5 combined pills (`Planetary / Singularity`, `Massive / Colossal`, `Medium / Large`, `Small / Tiny`, `Mini / Micro`) with accurate counts, parent highlight state when child steps are picked, and full DE/EN i18n support.
3. **No Open/Hybrid/Closed in Compact Cards**: Confirmed that when a model size is active, neither vendor weights badges nor model row tags appear in compact view.
4. **Compilation & Linting**: Verified with `lint_applet` (`tsc --noEmit`) and `compile_applet`.
