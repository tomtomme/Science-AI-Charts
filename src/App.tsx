/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ModelRecord, ScoreMode, SortField, ModelScope, BenchmarkComponent } from './types';
import { FALLBACK_CSV_CONTENT, SHEET_HTML_URL, CHART_HTML_URL, GITHUB_REPO_URL } from './data/rawCsvFallback';
import { extractSheetDate, parseModelDataset } from './utils/csvParser';
import { LoadedDatasets, loadModelsData } from './services/dataService';
import { BENCHMARK_COMPONENTS } from './data/benchmarks';
import { ExplodedBarChart } from './components/ExplodedBarChart';
import { SearchBar } from './components/SearchBar';
import { CsvNotesSection } from './components/CsvNotesSection';
import { Language, TRANSLATIONS } from './utils/i18n';
import { RefreshCw, Github, FileSpreadsheet, BarChart2 } from 'lucide-react';

export default function App() {
  // Standardeinstellung: Englisch
  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];

  // Score-Modus: 'new' (Spalte M, 8 Benchmarks) vs 'old' (Spalte L, 5 Benchmarks)
  const [scoreMode, setScoreMode] = useState<ScoreMode>('new');

  // Schalter: 'current' (nur noch verfügbare Chatbots) vs 'all' (alle Chatbots der CSV)
  const [modelScope, setModelScope] = useState<ModelScope>('current');

  // Aktive oder per Hover gewählte Kategorie für detaillierte Infos & Quellen-Link
  const [categoryInfoComp, setCategoryInfoComp] = useState<BenchmarkComponent | null>(null);

  // Pre-load all models from embedded fallback for instant zero-latency render
  const [loadedData, setLoadedData] = useState<LoadedDatasets>(() => ({
    models: parseModelDataset(FALLBACK_CSV_CONTENT, 'new'),
    newModels: parseModelDataset(FALLBACK_CSV_CONTENT, 'new'),
    oldModels: parseModelDataset(FALLBACK_CSV_CONTENT, 'old'),
    sheetFileDate: extractSheetDate(FALLBACK_CSV_CONTENT),
    sheetHeaderDate: null,
    lastSyncedAt: new Date(),
    isLive: false,
    error: null,
  }));

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  
  // Slider: Anzahl angezeigter Modelle in 5er-Schritten (Standard: 15)
  const [topCount, setTopCount] = useState<number>(15);

  // Volle Explosion Schalter
  const [fullExplosionEnabled, setFullExplosionEnabled] = useState<boolean>(false);

  // Sortierung: 'score' (Punktzahl) vs 'date' (Datum aus Spalte Y)
  const [sortBy, setSortBy] = useState<SortField>('score');

  // Slider für Kategorien: 0 = Alles (8 Benchmarks), 1..8 = nur eine der 8 Kategorien
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(0);

  // Filter: Freitext-Suche und Schnellfilter mit Standard-Vorauswahl: ChatGPT, Claude, Gemini
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>(['ChatGPT', 'Claude', 'Gemini']);
  const [selectedCompany] = useState<string | null>(null);

  // Active models based on scoreMode & modelScope ('current' = nur verfügbare Chatbots, 'all' = alle Chatbots)
  const currentModels = useMemo(() => {
    const base = scoreMode === 'new' ? loadedData.newModels : loadedData.oldModels;
    if (modelScope === 'current') {
      return base.filter((m) => m.isAvailable);
    }
    return base;
  }, [scoreMode, modelScope, loadedData]);

  const hasFilterActive =
    searchFilter.trim().length > 0 || selectedFamilies.length > 0 || selectedCompany !== null;

  const matchesFilter = useCallback(
    (model: ModelRecord) => {
      const q = searchFilter.trim().toLowerCase();
      const matchesSearch =
        !q ||
        model.displayName.toLowerCase().includes(q) ||
        model.name.toLowerCase().includes(q) ||
        model.companyName.toLowerCase().includes(q) ||
        model.creatorClean.toLowerCase().includes(q);

      const matchesFamilies =
        selectedFamilies.length === 0 ||
        selectedFamilies.some((fam) => {
          const famLow = fam.toLowerCase();
          return (
            model.displayName.toLowerCase().includes(famLow) ||
            model.name.toLowerCase().includes(famLow) ||
            model.companyName.toLowerCase().includes(famLow) ||
            model.creatorClean.toLowerCase().includes(famLow)
          );
        });

      const matchesCompany =
        !selectedCompany ||
        model.companyName.toLowerCase() === selectedCompany.toLowerCase() ||
        model.creatorClean.toLowerCase().includes(selectedCompany.toLowerCase());

      return matchesSearch && matchesFamilies && matchesCompany;
    },
    [searchFilter, selectedFamilies, selectedCompany]
  );

  // Beim Setzen eines Schnellfilters: Nicht-gewählte Modelle komplett entfernen!
  // Zudem Sortierung nach Datum (Spalte Y) oder Punktzahl (Gesamt / aktive Kategorie)
  const displayedModels = useMemo(() => {
    let list = currentModels;
    if (hasFilterActive) {
      list = list.filter(matchesFilter);
    }

    const activeComp = selectedCategoryIndex > 0 ? BENCHMARK_COMPONENTS[selectedCategoryIndex - 1] : null;
    const sorted = [...list];

    if (sortBy === 'date') {
      // Sortieren nach Veröffentlichungsdatum aus Spalte Y (neueste Modelle zuerst)
      sorted.sort((a, b) => {
        const cmp = (b.releaseDate || '').localeCompare(a.releaseDate || '');
        if (cmp !== 0) return cmp;
        return (b.score ?? 0) - (a.score ?? 0);
      });
    } else {
      // Sortieren nach Punktzahl: Bei Einzelkategorie nach der Kategorie, sonst Gesamtwert
      if (activeComp) {
        sorted.sort((a, b) => {
          const valA = a.rawScores[activeComp.key] ?? 0;
          const valB = b.rawScores[activeComp.key] ?? 0;
          if (valB !== valA) return valB - valA;
          return (b.score ?? 0) - (a.score ?? 0);
        });
      } else {
        sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      }
    }

    return sorted.slice(0, topCount);
  }, [currentModels, hasFilterActive, matchesFilter, selectedCategoryIndex, sortBy, topCount]);

  const matchCount = useMemo(() => {
    if (!hasFilterActive) return currentModels.length;
    return currentModels.filter(matchesFilter).length;
  }, [currentModels, hasFilterActive, matchesFilter]);

  const handleToggleFamily = useCallback((family: string) => {
    setSelectedFamilies((prev) =>
      prev.includes(family) ? prev.filter((f) => f !== family) : [...prev, family]
    );
  }, []);

  const handleClearFamilies = useCallback(() => {
    setSelectedFamilies([]);
  }, []);

  // Hourly countdown timer (3600 seconds)
  const SYNC_INTERVAL = 3600;
  const [, setCountdown] = useState<number>(SYNC_INTERVAL);

  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await loadModelsData();
      if (result.newModels.length > 0 || result.oldModels.length > 0) {
        setLoadedData(result);
      }
      setLastSyncedAt(new Date());
      setCountdown(SYNC_INTERVAL);
    } catch (e) {
      console.warn('Sync notice:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Hourly timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshData();
          return SYNC_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshData]);

  const formatDateTime = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatSheetDate = (isoDate: string | null) => {
    if (!isoDate) return null;
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      if (lang === 'de') return `${parts[2]}.${parts[1]}.${parts[0]}`;
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return isoDate;
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Clean top bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-4 sm:px-6 py-2.5">
        <div className="w-full max-w-[1720px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Title & Subtitle: Begrenzt auf maximal 2 Zeilen für optimale Lesbarkeit */}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2">
              {t.title}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal font-sans line-clamp-2">
              {t.subtitle}
            </p>
          </div>

          {/* Controls, language toggle & sync / external link icons */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono shrink-0 self-start xl:self-center">
            {/* Language Switcher DE / EN */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setLang('de')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  lang === 'de'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={lang === 'de' ? 'Auf Deutsch umschalten' : 'Switch to German'}
              >
                DE
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={lang === 'de' ? 'Auf Englisch umschalten' : 'Switch to English'}
              >
                EN
              </button>
            </div>

            {/* Schalter: NEW Score vs. OLD Score sauber getrennt */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setScoreMode('new')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  scoreMode === 'new'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={lang === 'de' ? 'NEW Score: Spalte M (8 Benchmarks)' : 'NEW Score: Column M (8 benchmarks)'}
              >
                NEW Score
              </button>
              <button
                type="button"
                onClick={() => setScoreMode('old')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  scoreMode === 'old'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={lang === 'de' ? 'OLD Score: Spalte L (5 Benchmarks, bis zu 224 Modelle)' : 'OLD Score: Column L (5 benchmarks, up to 224 models)'}
              >
                OLD Score
              </button>
            </div>

            {/* Schalter: Current (nur noch verfügbare Chatbots) vs All (alle Chatbots der CSV) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setModelScope('current')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  modelScope === 'current'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t.scopeCurrentDesc}
              >
                {t.scopeCurrent}
              </button>
              <button
                type="button"
                onClick={() => setModelScope('all')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  modelScope === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={t.scopeAllDesc}
              >
                {t.scopeAll}
              </button>
            </div>

            {/* Toggle: Volle Explosion ON / OFF */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2 py-1">
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                {t.fullExplosionToggle}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={fullExplosionEnabled}
                onClick={() => {
                  setFullExplosionEnabled((prev) => !prev);
                }}
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  fullExplosionEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                title={fullExplosionEnabled ? (lang === 'de' ? 'Volle Explosion deaktivieren' : 'Disable full explosion') : (lang === 'de' ? 'Alle Balken gleichzeitig vollständig explodieren' : 'Explode all bars simultaneously')}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    fullExplosionEnabled ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {fullExplosionEnabled ? t.on : t.off}
              </span>
            </div>

            {/* Synchronisieren-Button mit Popup für Datum und Zeitpunkt der letzten Aktualisierung */}
            <div className="relative group">
              <button
                onClick={refreshData}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                title={`${t.syncButtonTitle}\n${t.sheetOriginalDate} ${formatSheetDate(loadedData.sheetFileDate) || '–'}\n${t.lastSync} ${formatDateTime(lastSyncedAt)}`}
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
                <span>{t.sync}</span>
              </button>

              {/* Hover-Popup mit Datum der originalen Google-Sheets-Datei & Zeitpunkt des letzten Abrufs */}
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col gap-1.5 min-w-[250px] p-2.5 bg-slate-900/95 text-white dark:bg-slate-800/95 backdrop-blur-xs border border-slate-700/80 rounded-lg shadow-xl text-[11px] z-50 pointer-events-none transition-all">
                <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5">
                  <span className="font-semibold text-slate-200 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-emerald-400" />
                    Google Sheets Sync
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                    {isSyncing ? t.syncingText : (loadedData.isLive ? 'Live' : 'Fallback')}
                  </span>
                </div>

                {/* Datum der originalen Google Sheets Datei */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {t.originalSheetFile}
                  </span>
                  <span className="font-mono text-emerald-300 font-bold text-[11.5px]">
                    {formatSheetDate(loadedData.sheetFileDate) || t.dateNotInFile}
                  </span>
                </div>

                {/* Zeitpunkt der letzten Synchronisierung */}
                <div className="flex flex-col gap-0.5 border-t border-slate-800/80 pt-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {t.lastSyncFetch}
                  </span>
                  <span className="font-mono text-slate-200 text-[11px]">
                    {formatDateTime(lastSyncedAt)}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 border-t border-slate-800/60 pt-1">
                  {t.autoSyncNotice}
                </div>
              </div>
            </div>

            {/* Datum der Google-Sheets Datei & letzter Sync auch direkt sichtbar auf XL-Bildschirmen */}
            <span className="hidden xl:inline text-slate-500 dark:text-slate-400 text-[11px] font-mono">
              {formatSheetDate(loadedData.sheetFileDate) ? `${t.sheetOriginalDate} ${formatSheetDate(loadedData.sheetFileDate)} · ` : ''}
              {t.lastSync} {formatDateTime(lastSyncedAt)}
            </span>

            {/* Statisches Diagramm als Icon neben Google Sheets & GitHub */}
            <a
              href={CHART_HTML_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              title={t.staticChartOpen}
            >
              <BarChart2 className="w-4 h-4" />
            </a>

            <a
              href={SHEET_HTML_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              title={t.googleSheetOpen}
            >
              <FileSpreadsheet className="w-4 h-4" />
            </a>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              title={t.githubRepoOpen}
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Bar Chart Container */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col space-y-3.5">
        {/* Search Bar mit Sortierung (Datum / Punktzahl), Kategoriebuttons (Alles oder 1 der 8 Kategorien), 5er-Schritt-Slider und alphabetischen Schnellfiltern */}
        <SearchBar
          value={searchFilter}
          onChange={setSearchFilter}
          selectedFamilies={selectedFamilies}
          onToggleFamily={handleToggleFamily}
          onClearFamilies={handleClearFamilies}
          topCount={topCount}
          onTopCountChange={setTopCount}
          maxAvailableModels={currentModels.length}
          matchCount={matchCount}
          totalCount={currentModels.length}
          lang={lang}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          selectedCategoryIndex={selectedCategoryIndex}
          onCategoryIndexChange={(idx) => {
            setSelectedCategoryIndex(idx);
            if (idx > 0) {
              setCategoryInfoComp(BENCHMARK_COMPONENTS[idx - 1]);
            } else {
              setCategoryInfoComp(null);
            }
          }}
          onHoverCategory={setCategoryInfoComp}
        />

        {/* Balkendiagramm: Breit dargestellt, die volle Containerbreite nutzend */}
        <div className="w-full">
          <ExplodedBarChart
            models={displayedModels}
            activeBenchmarkId={null}
            activeCategoryIndex={selectedCategoryIndex}
            hoveredCategoryComp={categoryInfoComp}
            sortBy={sortBy}
            fullExplosionEnabled={fullExplosionEnabled}
            searchFilter={searchFilter}
            selectedFamilies={selectedFamilies}
            selectedCompany={selectedCompany}
            lang={lang}
          />
        </div>

        {/* Textfeld-Bereich unter dem Balkendiagramm: CSV-Zellen B34/C34 & N34/O34 */}
        <div className="w-full pt-1 pb-4">
          <CsvNotesSection appLang={lang} />
        </div>
      </main>
    </div>
  );
}
