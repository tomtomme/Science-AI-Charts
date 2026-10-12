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
    title: 'Chatbots mit Bild-Eingabe für die Wissenschaft | Paid Chat 💲 | Free Chat+API 🌐',
    subtitle: 'Anleitung: Nach unten scrollen',

    // Schieberegler: Chatbot-Anzahl
    topSliderLabel: 'Chatbot Count:',
    topSliderTop: 'Chatbot Count',
    stepMinusChatbots: '-5 Chatbots',
    stepPlusChatbots: '+5 Chatbots',
    maxLabel: 'max',

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
    scoreModeNew: 'NEW Score',
    scoreModeOld: 'OLD Score',
    scoreModeNewDesc: 'NEW Score: 8 Benchmarks',
    scoreModeOldDesc: 'OLD Score: 5 Benchmarks, bis zu 224 Modelle',

    // Scope: Current vs All
    scopeLabel: 'Chatbots:',
    scopeCurrent: 'Current',
    scopeCurrentDesc: 'Nur noch verfügbare Chatbots',
    scopeAll: 'All',
    scopeAllDesc: 'Alle Chatbots der CSV (inkl. Historie)',

    // Volle Explosion
    explosionToggle: 'Explosion:',
    fullExplosionToggle: 'Volle Explosion:',
    fullExplosionOnDesc: 'Volle Explosion deaktivieren',
    fullExplosionOffDesc: 'Alle Balken gleichzeitig vollständig explodieren',
    on: 'AN',
    off: 'AUS',

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
    githubRepoOpen: 'GitHub Repository tomtomme/AI-Top30',
  },
  en: {
    // Title & Subtitle (Cells A1+B2 and C1 of CSV)
    title: 'Chatbots with Image-Input for Science | Paid Chat 💲 | Free Chat+API 🌐',
    subtitle: 'How To Read: Scroll down',

    // Chatbot Count Slider
    topSliderLabel: 'Chatbot Count:',
    topSliderTop: 'Chatbot Count',
    stepMinusChatbots: '-5 Chatbots',
    stepPlusChatbots: '+5 Chatbots',
    maxLabel: 'max',

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
    scoreModeNew: 'NEW Score',
    scoreModeOld: 'OLD Score',
    scoreModeNewDesc: 'NEW Score: 8 benchmarks',
    scoreModeOldDesc: 'OLD Score: 5 benchmarks, up to 224 models',

    // Scope: Current vs All
    scopeLabel: 'Chatbots:',
    scopeCurrent: 'Current',
    scopeCurrentDesc: 'Only currently available chatbots',
    scopeAll: 'All',
    scopeAllDesc: 'All chatbots in CSV (including historical)',

    // Full Explosion
    explosionToggle: 'Explosion:',
    fullExplosionToggle: 'Full Explosion:',
    fullExplosionOnDesc: 'Disable full explosion',
    fullExplosionOffDesc: 'Explode all bars simultaneously',
    on: 'ON',
    off: 'OFF',

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
    githubRepoOpen: 'GitHub Repository tomtomme/AI-Top30',
  },
};
