# Implementierungsplan: Tab „LLM-Labs & Ökosystem“ (Matrix-Vergleich & Benchmark-Synchronisation)

Dieser Plan beschreibt die Architektur und Umsetzung eines neuen, voll synchronisierten Tabs im Science-AI-Dashboard, der die Struktur- und Modell-Ecosystem-Daten der Google Sheets Tabelle (`gid=355721692`) als interaktive Matrix darstellt und nahtlos mit den bestehenden Benchmark-Modellen verknüpft.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Basierend auf den geklärten Präferenzen:
> 1. **Darstellung**: Interaktive Vergleichsmatrix mit Modellgrößen-Stufen (<32B bis 15T+) und Agenten-Tooling (Harness, Daily Agent, Coding Agent, Tiers).
> 2. **Datenumfang**: Primärer Fokus auf die **Top 10 LLM Labs** (Zeilen 2–17) mit einem leicht erreichbaren Umschalter für die **24 Top 10 Contenders** (Zeilen 19–28).
> 3. **Synchronisation**: Ein Klick auf ein Lab (z. B. Anthropic, Google, OpenAI, DeepSeek, Agnes/Sapiens AI) filtert und markiert die entsprechenden Modelle im Benchmark-Hauptdiagramm.

- **Bestätigte Entscheidung 1**: Der neue Tab wird als gleichwertige Hauptansicht neben dem Benchmark-Diagramm im Dashboard-Header platziert (`[📊 Wissenschafts-IQ Benchmark]` / `[🏢 LLM-Labs & Ökosystem]`).
- **Bestätigte Entscheidung 2**: Live-Synchronisation der CSV-Daten von Google Sheets via Proxy/Fetch mit integriertem statischem Fallback-Datensatz für maximale Zuverlässigkeit und Offline-Fähigkeit.

---

## 1. Overview & Core Concept

- **Ziel**: Nutzer können neben den rein quantitativen Testergebnissen der Benchmarks (Wissenschafts-IQ) die dahinterstehenden Organisationen, Modell-Familien, Größenklassen und das praktische Tooling (Entwickler-SDKs, Web-Agenten, Coding-Agenten, Abo-Stufen) vergleichen.
- **Zielgruppe**: Forscher, Data Scientists, Entwickler und Technologieentscheider, die ein Modell nicht nur nach Benchmark-Scores auswählen, sondern nach Plattform-Reife, Tool-Ökosystem und Modellauswahl.
- **Mehrwert**: Schließt die Lücke zwischen theoretischem Benchmark-Score und praktischer Nutzbarkeit im wissenschaftlichen Alltag.

---

## 2. User Experience & Visual Design

### A. Navigation & Tab-Struktur
- Im oberen Dashboard-Bereich (unterhalb der Kopfzeile) befindet sich eine dezente, tastaturbedienbare Segmentsteuerung:
  - **`📊 Benchmark-Diagramm`**: Das bestehende, zoom- und explosionsfähige Balkendiagramm mit allen Filtern (Paid/Free, Disziplinen, Schwellenwerten).
  - **`🏢 LLM-Labs & Ökosystem`**: Die neue Vergleichsansicht.
- Im Tab „LLM-Labs & Ökosystem“:
  - Ein Filter-Segment: `Top 10 LLM Labs (Fokus)` | `24 Top 10 Contenders`
  - Eine Suche / Filtersuche nach Lab-Name, Land oder Modell-Familie.
  - Ein Badge mit der Anzahl der im aktuellen Benchmark getesteten Modelle des Labs (z. B. „4 Modelle im Benchmark“).

### B. Matrix- und Kartendesign
- **Lab-Köpfe**:
  - Flagge des Landes (🇺🇸, 🇨🇳, 🇫🇷, 🇸🇬, 🇨🇦, 🇩🇪 etc.)
  - Creator / Organisationsname
  - Bekannt für (z. B. „YouTube, Android“, „AI- & Graphics Chips“, „Tesla, Twitter“)
  - Primäre ChatBot- / Engine-Namen
  - Interaktiver Button: *„Im Benchmark ansehen (N) →“*, der direkt in das Hauptdiagramm springt und den Filter auf diesen Anbieter setzt.
- **Größenklassen-Matrix**:
  - `Small (< 32B)`: z. B. Gemma, gpt-oss, Lite, Flash, Qwen 2.5
  - `Medium (< 128B)`: z. B. Instant, Flash-Lite, Scout, Super
  - `Large (< 256B)`: z. B. Flash (Cyber), Spark, 4o, K1
  - `Massive (< 512B)`: z. B. Sonnet, Maverick, Plus, GLM
  - `Colossal (< 1.5T)`: z. B. Pro, Wonder, Ultra, R1, K2
  - `Planetary (< 5T)`: z. B. Opus, Behemoth, Sol, Max, K3
  - `Singularity (< 15T)`: z. B. Fable/Mythos, Argon/Carbon, Astra
- **Software- & Agenten-Ökosystem**:
  - **Subscription Tiers**: Pro, Max, Enterprise, API per Token
  - **The Harness (SDK)**: z. B. Claude SDK, Antigravity, NeMo Toolkit, Codex
  - **Daily Agent**: z. B. Claude Cowork, Spark/Deep Research, ChatGPT Work
  - **Coding Agent**: z. B. Claude Code, Jules Tools/Antigravity, Cursor Agent, Qwen Code

### C. Responsives Verhalten
- Auf Desktop: Vollständig horizontale Vergleichstabelle mit fixierter Merkmal-Spalte links und sauber scrollbaren Lab-Spalten oder als interaktive Grid-Karten mit aufklappbaren Parameter-Ebenen.
- Auf Tablets/Mobile: Kompakte Karten mit Akkordeon-Aufklappung für Größenstufen und Agenten-Tools.

---

## 3. Key Product Decisions & Trade-Offs

- **Entscheidung 1: Getrennter Tab statt Überfrachtung des Balkendiagramms**
  - *Begründung*: Das Balkendiagramm visualisiert metrische Prozentwerte (MMMU-Pro, Excel, etc.). Würde man Modellgrößen, SDKs und Abo-Pläne in die Balken einbauen, wäre das Diagramm unlesbar. Ein separater Tab mit klarer Querverlinkung wahrt die Übersichtlichkeit.
- **Entscheidung 2: Datenhaltung mit Live-Sync und Fallback**
  - *Begründung*: Wie beim Haupt-Sheet wird die CSV `gid=355721692` beim Start asynchron geladen. Schlägt der Abruf fehl (z. B. Netzwerk-/CORS-Blockade), greift ein integrierter Fallback-Datensatz. Das garantiert 100 % Stabilität.
- **Entscheidung 3: Bidirektionale Synchronisation**
  - *Begründung*: Wenn ein Nutzer in der Matrix auf ein Lab klickt, wird das Diagramm gefiltert. Umgekehrt zeigt die Matrix für jedes Lab die durchschnittliche Platzierung und Anzahl der Modelle im Benchmark an.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                        App.tsx                         │
│  State: activeTab ('benchmark' | 'labs')               │
│  State: selectedCreatorFilter (sync between tabs)      │
└──────────┬─────────────────────────────────┬───────────┘
           │                                 │
           ▼                                 ▼
┌─────────────────────────┐       ┌───────────────────────────────┐
│   Benchmark View        │       │    Lab Ecosystem View         │
│  - ExplodedBarChart     │       │  - LabMatrixView.tsx          │
│  - Discipline Filters   │       │  - Top-10 vs Contenders Toggle│
│  - Paid/Free/All Switch │       │  - Parameter & Tooling Matrix │
│  - Zoom & Explosions    │       │  - Creator Cross-Link Action  │
└─────────────────────────┘       └───────────────────────────────┘
           │                                 │
           ▼                                 ▼
┌─────────────────────────┐       ┌───────────────────────────────┐
│  dataService.ts         │       │  labDataService.ts            │
│  (gid=170267419)        │       │  (gid=355721692)              │
│  + rawCsvFallback.ts    │       │  + rawLabCsvFallback.ts       │
└─────────────────────────┘       └───────────────────────────────┘
```

### Datenstruktur (`LabEntry`)
```typescript
export interface LabEntry {
  id: string;
  group: 'top10' | 'contender';
  country: string;
  countryFlag: string;
  creator: string;
  famousFor: string;
  engineName: string;
  parameterSizes: {
    small?: string;      // < 32B
    medium?: string;     // < 128B
    large?: string;      // < 256B
    massive?: string;    // < 512B
    colossal?: string;   // < 1.5T
    planetary?: string;  // < 5T
    singularity?: string;// < 15T
  };
  subscriptionTiers?: string;
  harnessSdk?: string;
  dailyAgent?: string;
  codingAgent?: string;
  specialties?: string;
}
```

---

## 5. Umsetzungsschritte nach Freigabe

1. **Parser & Fallback-Daten (`src/data/labDataService.ts`, `src/data/rawLabCsvFallback.ts`)**:
   - Robuster CSV-Parser für die Spaltenmatrix der Tabelle `gid=355721692`.
   - Einbettung der extrahierten Daten als stabiler Fallback.
2. **Komponente `LabMatrixView.tsx`**:
   - Tab-Navigation im oberen App-Bereich (`Benchmark` / `LLM-Labs & Ökosystem`).
   - Schalter zwischen Top 10 und 24 Contenders.
   - Matrix-Layout mit Größenstufen, Agenten-Stack und Link-Button zum Hauptdiagramm.
3. **Synchronisation in `App.tsx`**:
   - Klick auf ein Lab setzt den Creator-Filter und wechselt zum Diagramm.
   - Anzeige von Benchmark-Statistiken direkt an jedem Lab-Eintrag.
4. **Validierung**:
   - `compile_applet` & `lint_applet` zur Prüfung von Typensicherheit und Fehlerfreiheit.
