/**
 * ZENTRALE DATEI FÜR ALLE ENGLISCHEN & DEUTSCHEN UI-TEXTE
 * 
 * Alle UI-Strings, Knopfbeschriftungen, Tooltips, Statusanzeigen und Hilfetexte,
 * die nicht direkt dynamisch aus den Tabellenzellen der CSV stammen,
 * sind in dieser Datei gesammelt und können hier direkt geprüft und angepasst werden.
 */

export type Language = 'de' | 'en';

export const TRANSLATIONS = {
  de: {
    // Titel & Untertitel (Zellen A1+B2 sowie C1 der CSV)
    title: 'Science-IQ von ChatBots | Free Chat | Paid Chat 💲 | Free Chat & API 🌐',
    subtitle: 'Die Bewertung konzentriert sich auf faktische Genauigkeit (Non-Hallucination), wissenschaftliche Expertise und Datenanalysefähigkeiten statt Coding. Die Bots absolvierten Tests von ArtificialAnalysis.ai, Simple-Bench.com und Vals.ai.',
    headerPopupIntro:
      'Im Gegensatz zu herkömmlichen Benchmarks, die primär textbasierte Programmieraufgaben oder reine Sprachfähigkeiten messen, legt dieser Benchmark-Parcours den Fokus gezielt auf Forschungs- und Wissenschaftsrelevanz:',
    headerPopupItems: [
      { text: 'Multimodales Verstehen wissenschaftlicher Abbildungen & Plots (MMMU-Pro)', color: '#F59E0B' },
      { text: 'Mathematische & tabellarische Datenanalyse (Excel / FinanceBench)', color: '#06B6D4' },
      { text: 'Faktentreue & Non-Hallucination-Rate (Ehrlichkeit bei Nichtwissen statt Erfinden)', color: '#10B981' },
      { text: 'Medizinisches Langkontext-Denken über hunderte Seiten klinischer Fachliteratur', color: '#F43F5E' },
      { text: 'Räumliches Vorstellungsvermögen & gesunder Menschenverstand (SimpleBench)', color: '#6366F1' },
      { text: 'Automatisierte mehrstufige quantitative Workflows (Vals.ai)', color: '#EA580C' },
    ],

    // Schieberegler: Chatbot-Anzahl
    topSliderLabel: 'Max. Balkenanzahl:',
    topSliderTop: 'Max. Balkenanzahl',
    stepMinusChatbots: '-5',
    stepPlusChatbots: '+5',
    maxLabel: 'Max.',

    // Kategorie-Slider (0 = Alles, 1..8 = Einzelkategorie)
    categorySliderLabel: 'Kategorie:',
    categoryAll: 'Alles (8 Benchmarks)',
    categoryAllShort: 'Alles',
    categoryStepMinus: '-1 Kategorie',
    categoryStepPlus: '+1 Kategorie',

    // Sortierung
    sortByLabel: 'Sortierung:',
    sortScore: 'Punktzahl',
    sortDate: 'Datum',
    sortDateShort: 'Datum',
    sortScoreDesc: 'Nach Punktzahl absteigend sortieren',
    sortDateDesc: 'Nach Veröffentlichungsdatum sortieren (neueste zuerst)',
    sortedByDateLabel: 'Sortiert nach Veröffentlichungsdatum',

    // Score-Modi
    scoreModeNew: 'Neuer Score',
    scoreModeOld: 'Alter Score',
    scoreModeWorstCase: 'Worst Case',
    scoreModeNewDesc: 'Neuer Score: 8 Benchmarks',
    scoreModeOldDesc: 'Alter Score: 5 Benchmarks, bis zu 224 Modelle',
    scoreModeWorstCaseDesc: 'Worst-Case: 7-Benchmark-Durchschnitt multipliziert mit Non-Hallucination-Rate (Spalte N)',
    scoreModeHintTitle: 'Bedeutung der Scores',
    scoreModeHintText: 'Mehr Infos zur Bedeutung & Berechnung der Scores finden Sie im Text unter dem Diagramm.',
    scoreModeHintClick: 'Klicken für mehr Infos',

    // Scope: Current vs All
    scopeLabel: 'Chatbots:',
    scopeCurrent: 'Aktuell',
    scopeCurrentDesc: 'Nur noch aktuell verfügbare Chatbots',
    scopeAll: 'Alle',
    scopeAllDesc: 'Alle Chatbots der Tabelle (inkl. Historie)',

    // Explosion Knopf (an / teils / aus)
    explosionToggle: 'Explosion:',
    explosionOn: 'an',
    explosionHover: 'teils',
    explosionOff: 'aus',
    explosionOnDesc: 'Alle Balken werden forciert explodiert dargestellt',
    explosionHoverDesc: 'Nur Balken unter dem Mauszeiger und die benachbarten explodieren',
    explosionOffDesc: 'Balken explodieren auch bei Mausberührung nicht',
    fullExplosionToggle: 'Explosion:',
    fullExplosionOnDesc: 'Alle Balken werden forciert explodiert dargestellt',
    fullExplosionOffDesc: 'Balken explodieren nicht',
    on: 'an',
    hover: 'teils',
    off: 'aus',

    // Erweitert & Preis-Filter
    advanced: 'Erweitert',
    advancedDesc: 'Erweiterte Filter & Slider ein-/ausblenden',
    priceFree: 'Kostenlos',
    priceFreeApi: 'Free API',
    priceFreeChat: 'Free Chat OR API',
    pricePaid: 'Paid Chat',
    priceAll: 'Alle',
    priceFreeDesc: 'Nur kostenlose Chatbots anzeigen',
    priceFreeApiDesc: 'Nur Modelle mit kostenlosem API-Zugriff (🌐, z. B. für JASP oder AI-Agenten)',
    priceFreeChatDesc: 'Kostenlos im Web-Chat nutzbar ODER mit kostenloser API',
    pricePaidDesc: 'Nur kostenpflichtige Chatbots (💲, Plus/Pro/Abo)',
    priceAllDesc: 'Alle Chatbots anzeigen (kostenlos & bezahlt)',
    priceFilterDesc: 'Zwischen Free API, Free Chat OR API, Paid Chat (💲) und allen Chatbots wechseln',

    // Suche & Filter
    searchPlaceholder: 'Firma oder LLM-Familie suchen (z. B. ChatGPT, Claude, Gemini, Kimi, MiMo)...',
    all: 'Alle',
    reset: 'Zurücksetzen',
    modelsCount: 'Modelle',
    company: 'Firma:',
    rank: 'Rang',
    score: 'Punktzahl',
    points: 'Punkte',
    releaseDate: 'Veröffentlichung:',
    nonHallucinationLabel: 'Faktentreue',

    // Infoleiste & Kriterien-Details
    sourceLabel: 'Quelle:',
    sourceLink: 'Link zur Quelle',
    criterionLabel: 'Kriterien-Beschreibung:',
    hoverBarPrompt: 'Bewege den Mauszeiger über die einzelnen Segmente des Balkens, um Kriterien-Details und Quellen anzuzeigen.',
    openWebsite: 'Website öffnen',
    openChatbotApp: 'Chatbot / App öffnen',
    allBenchmarksOverall: 'Alle 8 Benchmarks (Gesamtbewertung)',
    hoverHelp: 'Mouse-Over über einen Balken explodiert diesen und seine Nachbarn in 8 Benchmark-Komponenten.',
    fullExplosionHelp: 'Volle Explosion aktiv: Alle Balken sind in ihre 8 Benchmark-Kriterien aufgefächert.',
    disabledHelp: 'Explosionsansicht deaktiviert.',

    // Synchronisation & externe Links
    sync: 'Synchronisieren',
    syncButtonTitle: 'Google Sheets synchronisieren',
    lastSync: 'Zuletzt synchronisiert:',
    hourly: 'stündlich',
    sheetOriginalDate: 'Google-Sheets Datei:',
    originalSheetFile: 'Originale Google-Sheets-Datei:',
    lastSyncFetch: 'Letzte Aktualisierung / Abruf:',
    autoSyncNotice: 'Automatische Aktualisierung stündlich oder per Klick.',
    dateNotInFile: 'Datum nicht in Datei',
    syncingText: 'Lädt...',
    googleSheetOpen: 'Google Sheet öffnen',
    staticChartOpen: 'Statisches Diagramm öffnen',
    githubRepoOpen: 'GitHub Repository tomtomme/Science-AI-Charts',
  },
  en: {
    // Title & Subtitle (Cells A1+B2 and C1 of CSV)
    title: 'Science-IQ of ChatBots | Free Chat | Paid Chat 💲 | Free Chat & API 🌐',
    subtitle: 'The scoring focusses on factual accuracy (non-hallucination), scientific expertise, and data analysis skills instead of coding. Bots completed tests from artificialanalysis.ai, simple-bench.com and vals.ai.',
    headerPopupIntro:
      'Unlike conventional benchmarks that primarily measure text-based coding tasks or pure language skills, this benchmark suite focuses specifically on research and scientific relevance:',
    headerPopupItems: [
      { text: 'Multimodal understanding of scientific figures & plots (MMMU-Pro)', color: '#F59E0B' },
      { text: 'Mathematical & tabular data analysis (Excel / FinanceBench)', color: '#06B6D4' },
      { text: 'Factual accuracy & Non-Hallucination Rate (honesty when uncertain instead of inventing)', color: '#10B981' },
      { text: 'Medical long-context reasoning across hundreds of pages of clinical literature', color: '#F43F5E' },
      { text: 'Spatial reasoning & common sense (SimpleBench)', color: '#6366F1' },
      { text: 'Automated multi-step quantitative workflows (Vals.ai)', color: '#EA580C' },
    ],

    // Chatbot Count Slider
    topSliderLabel: 'Max Bar Count:',
    topSliderTop: 'Max Bar Count',
    stepMinusChatbots: '-5',
    stepPlusChatbots: '+5',
    maxLabel: 'Max',

    // Category Slider (0 = All, 1..8 = Single Category)
    categorySliderLabel: 'Category:',
    categoryAll: 'All (8 Benchmarks)',
    categoryAllShort: 'All',
    categoryStepMinus: '-1 Category',
    categoryStepPlus: '+1 Category',

    // Sorting
    sortByLabel: 'Sort by:',
    sortScore: 'Score',
    sortDate: 'Date',
    sortDateShort: 'Date',
    sortScoreDesc: 'Sort descending by score',
    sortDateDesc: 'Sort by release date (newest first)',
    sortedByDateLabel: 'Sorted by Release Date',

    // Score Modes
    scoreModeNew: 'New Score',
    scoreModeOld: 'Old Score',
    scoreModeWorstCase: 'Worst Case',
    scoreModeNewDesc: 'New Score: 8 benchmarks',
    scoreModeOldDesc: 'Old Score: 5 benchmarks, up to 224 models',
    scoreModeWorstCaseDesc: 'Worst Case: 7-benchmark average multiplied by Non-Hallucination Rate (Column N)',
    scoreModeHintTitle: 'Meaning of the Scores',
    scoreModeHintText: 'More info on the meaning & calculation of the scores can be found in the text below the chart.',
    scoreModeHintClick: 'Click for more info',

    // Scope: Current vs All
    scopeLabel: 'Chatbots:',
    scopeCurrent: 'Current',
    scopeCurrentDesc: 'Only currently available chatbots',
    scopeAll: 'All',
    scopeAllDesc: 'All chatbots in CSV (including historical)',

    // Explosion Button (on / hover / off)
    explosionToggle: 'Explosion:',
    explosionOn: 'on',
    explosionHover: 'hover',
    explosionOff: 'off',
    explosionOnDesc: 'All bars are forced exploded',
    explosionHoverDesc: 'Only bars under cursor and adjacent neighbors explode',
    explosionOffDesc: 'Bars do not explode even on mouse touch',
    fullExplosionToggle: 'Explosion:',
    fullExplosionOnDesc: 'All bars are forced exploded',
    fullExplosionOffDesc: 'Bars do not explode',
    on: 'on',
    hover: 'hover',
    off: 'off',

    // Advanced & Price Filter
    advanced: 'Advanced',
    advancedDesc: 'Show/hide advanced filters & sliders',
    priceFree: 'Free',
    priceFreeApi: 'Free API',
    priceFreeChat: 'Free Chat OR API',
    pricePaid: 'Paid Chat',
    priceAll: 'All',
    priceFreeDesc: 'Show only free chatbots',
    priceFreeApiDesc: 'Only models with free API access (🌐, e.g. for JASP or AI agents)',
    priceFreeChatDesc: 'Free to use in web chat OR with free API',
    pricePaidDesc: 'Paid chatbots only (💲, subscription/paid tier)',
    priceAllDesc: 'Show all chatbots (free & paid)',
    priceFilterDesc: 'Switch between Free API, Free Chat OR API, Paid Chat (💲), and all chatbots',

    // Search & Filters
    searchPlaceholder: 'Filter by company or LLM family (e.g. ChatGPT, Claude, Gemini, Kimi, MiMo)...',
    all: 'All',
    reset: 'Reset',
    modelsCount: 'Models',
    company: 'Company:',
    rank: 'Rank',
    score: 'Score',
    points: 'Points',
    releaseDate: 'Release Date:',
    nonHallucinationLabel: 'Non-Hallucination',

    // Info Bar & Criteria Details
    sourceLabel: 'Source:',
    sourceLink: 'Source Link',
    criterionLabel: 'Criterion:',
    hoverBarPrompt: 'Hover over individual bar segments to view benchmark criteria & source links.',
    openWebsite: 'Open website',
    openChatbotApp: 'Open Chatbot / App',
    allBenchmarksOverall: 'All 8 benchmarks (overall score)',
    hoverHelp: 'Mouse-over a bar to explode it and its neighbors into 8 benchmark components.',
    fullExplosionHelp: 'Full explosion active: All bars are fanned out into their 8 benchmark criteria.',
    disabledHelp: 'Explosion view disabled.',

    // Sync & External Links
    sync: 'Sync',
    syncButtonTitle: 'Sync Google Sheets',
    lastSync: 'Last synced:',
    hourly: 'hourly',
    sheetOriginalDate: 'Google Sheet File:',
    originalSheetFile: 'Original Google Sheet:',
    lastSyncFetch: 'Last synchronized / fetched:',
    autoSyncNotice: 'Auto-syncs hourly or immediately on click.',
    dateNotInFile: 'Date not in file',
    syncingText: 'Syncing...',
    googleSheetOpen: 'Open Google Sheet',
    staticChartOpen: 'Open static chart',
    githubRepoOpen: 'GitHub Repository tomtomme/Science-AI-Charts',
  },
};
