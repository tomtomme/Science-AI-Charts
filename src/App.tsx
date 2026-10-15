/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ModelRecord, ScoreMode, SortField, ModelScope, BenchmarkComponent, PriceFilter, LabEntry } from './types';
import { FALLBACK_CSV_CONTENT, SHEET_HTML_URL, CHART_HTML_URL, GITHUB_REPO_URL } from './data/rawCsvFallback';
import { FALLBACK_LAB_ENTRIES } from './data/rawLabCsvFallback';
import { extractSheetDate, extractHeaderMetadata, extractCsvNotesMetadata, parseModelDataset } from './utils/csvParser';
import { LoadedDatasets, loadModelsData } from './services/dataService';
import { fetchLiveLabEntries } from './services/labDataService';
import { BENCHMARK_COMPONENTS } from './data/benchmarks';
import { ExplodedBarChart } from './components/ExplodedBarChart';
import { SearchBar } from './components/SearchBar';
import { CsvNotesSection } from './components/CsvNotesSection';
import { LabMatrixView } from './components/LabMatrixView';
import { Language, TRANSLATIONS } from './utils/i18n';
import { RefreshCw, Github, FileSpreadsheet, BarChart2, Info, Building2 } from 'lucide-react';


export default function App() {
  // Standardeinstellung: Englisch
  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];

  // Score-Modus: 'new' (8 Benchmarks) vs 'old' (5 Benchmarks)
  const [scoreMode, setScoreMode] = useState<ScoreMode>('new');

  // Schalter: 'current' (nur noch verfügbare Chatbots) vs 'all' (alle Chatbots der CSV)
  const [modelScope, setModelScope] = useState<ModelScope>('current');

  // Preis-Filter: 'free' (Standard), 'paid', 'all'
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('free');

  // Pop-Up für Titel / Untertitel bei Mouse-Over
  const [showHeaderInfo, setShowHeaderInfo] = useState<boolean>(false);

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
    headerMeta: extractHeaderMetadata(FALLBACK_CSV_CONTENT),
    notesMeta: extractCsvNotesMetadata(FALLBACK_CSV_CONTENT),
  }));

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  
  // Slider: Anzahl angezeigter Modelle in 5er-Schritten (Standard: 35)
  const [topCount, setTopCount] = useState<number>(35);

  // Volle Explosion Schalter
  const [fullExplosionEnabled, setFullExplosionEnabled] = useState<boolean>(false);

  // Sortierung: 'score' (Punktzahl) vs 'date' (Datum aus Spalte Y)
  const [sortBy, setSortBy] = useState<SortField>('score');

  // Slider für Kategorien: 0 = Alles (8 Benchmarks), 1..8 = nur eine der 8 Kategorien
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(0);

  // Erweiterter Modus (Buttons & Slider eingeklappt als Standard, auf Klick ausklappbar)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Tab-Navigation: 'benchmark' vs 'labs'
  const [activeTab, setActiveTab] = useState<'benchmark' | 'labs'>('benchmark');

  // LLM Labs Datensatz (aus Google Sheets gid=355721692 mit Fallback)
  const [labs, setLabs] = useState<LabEntry[]>(FALLBACK_LAB_ENTRIES);

  useEffect(() => {
    fetchLiveLabEntries().then((res) => {
      if (res.entries && res.entries.length > 0) {
        setLabs(res.entries);
      }
    });
  }, []);

  // Filter: Freitext-Suche und Schnellfilter mit Standard-Vorauswahl: ChatGPT, Claude, Gemini
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>(['ChatGPT', 'Claude', 'Gemini']);
  const [selectedCompany] = useState<string | null>(null);

  const handleSelectLabFromMatrix = useCallback((creatorName: string) => {
    setSearchFilter(creatorName);
    setSelectedFamilies([]);
    setActiveTab('benchmark');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);


  // Active models based on scoreMode, modelScope & priceFilter ('current' vs 'all', 'free' vs 'paid' vs 'all')
  const currentModels = useMemo(() => {
    const base = scoreMode === 'new' ? loadedData.newModels : loadedData.oldModels;
    let list = modelScope === 'current' ? base.filter((m) => m.isAvailable) : base;

    // Preis-Filter: Default 'free', sonst 'paid' oder 'all'
    if (priceFilter === 'free') {
      list = list.filter((m) => !m.isPaid);
    } else if (priceFilter === 'paid') {
      list = list.filter((m) => m.isPaid);
    }

    return list;
  }, [scoreMode, modelScope, loadedData, priceFilter]);

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

  const formatSyncDate = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Clean top bar */}
      <header className="relative z-40 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-2.5">
        <div className="w-full max-w-[1720px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Title & Subtitle directly from CSV cells with Pop-Up on hover */}
          <div
            className="relative min-w-0 flex-1 group"
            onMouseEnter={() => setShowHeaderInfo(true)}
            onMouseLeave={() => setShowHeaderInfo(false)}
          >
            <div className="cursor-help inline-block max-w-full">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                <span>{loadedData.headerMeta?.combinedTitle || t.title}</span>
                <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0 opacity-70 group-hover:opacity-100 transition-all" />
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal font-sans line-clamp-2 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-300">
                {loadedData.headerMeta?.subtitle || t.subtitle}
              </p>
            </div>

            {/* Pop-Up on hovering title or subtitle - fully opaque with 0% transparency */}
            <div
              className={`absolute left-0 top-full mt-2 w-full max-w-xl sm:max-w-2xl bg-slate-900 text-slate-100 border border-slate-700 rounded-xl p-4 shadow-2xl z-50 text-xs transition-all duration-200 pointer-events-none ${
                showHeaderInfo
                  ? 'opacity-100 translate-y-0 visible'
                  : 'opacity-0 -translate-y-1 invisible'
              }`}
              style={{ backgroundColor: '#0f172a' }}
            >
              {/* Decorative top arrow pointing to the title */}
              <div
                className="absolute -top-1.5 left-7 w-3 h-3 bg-slate-900 border-t border-l border-slate-700 rotate-45"
                style={{ backgroundColor: '#0f172a' }}
              />

              {/* Intro paragraph */}
              <p className="text-[12px] leading-relaxed text-slate-200 font-medium mb-3">
                {t.headerPopupIntro}
              </p>

              {/* 6 Benchmark Items */}
              <ul className="space-y-2 text-[11.5px] leading-snug text-slate-300">
                {t.headerPopupItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 mt-1 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="flex-1">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
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

            {/* Synchronisieren-Button mit Popup für Datum der letzten Synchronisierung */}
            <div className="relative group">
              <button
                onClick={refreshData}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                title={`${t.syncButtonTitle}\n${t.lastSync} ${formatSyncDate(lastSyncedAt)}`}
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
                <span>{t.sync}</span>
              </button>

              {/* Hover-Popup mit Datum der letzten Synchronisierung */}
              <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col gap-1.5 min-w-[220px] p-2.5 bg-slate-900/95 text-white dark:bg-slate-800/95 backdrop-blur-xs border border-slate-700/80 rounded-lg shadow-xl text-[11px] z-50 pointer-events-none transition-all">
                <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5">
                  <span className="font-semibold text-slate-200 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-emerald-400" />
                    Google Sheets Sync
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                    {isSyncing ? t.syncingText : (loadedData.isLive ? 'Live' : 'Fallback')}
                  </span>
                </div>

                {/* Datum der letzten Synchronisierung (nur Datum ohne Uhrzeit) */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {t.lastSync}
                  </span>
                  <span className="font-mono text-emerald-300 font-bold text-[11.5px]">
                    {formatSyncDate(lastSyncedAt)}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 border-t border-slate-800/60 pt-1">
                  {t.autoSyncNotice}
                </div>
              </div>
            </div>

            {/* Letzter Sync direkt sichtbar auf XL-Bildschirmen (nur Datum) */}
            <span className="hidden xl:inline text-slate-500 dark:text-slate-400 text-[11px] font-mono">
              {t.lastSync} {formatSyncDate(lastSyncedAt)}
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

      {/* Primary Tab Switcher */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-30 px-4 sm:px-6 shadow-2xs">
        <div className="w-full max-w-[1720px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2">
          {/* Segmented Tab Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'benchmark'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{lang === 'de' ? 'Wissenschafts-IQ Benchmark' : 'Science-IQ Benchmark'}</span>
              <span className="text-[11px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-600/70 rounded text-slate-700 dark:text-slate-200 tabular-nums">
                {displayedModels.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('labs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'labs'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{lang === 'de' ? 'LLM-Labs & Ökosystem' : 'LLM Labs & Ecosystem'}</span>
              <span className="text-[11px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-600/70 rounded text-slate-700 dark:text-slate-200 tabular-nums">
                {labs.length}
              </span>
            </button>
          </div>

          {/* Active filter reset notice */}
          {searchFilter && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 text-[11px]">
                {lang === 'de' ? 'Aktiver Lab-/Modell-Filter:' : 'Active Lab/Model filter:'} <strong className="text-slate-800 dark:text-slate-200 font-semibold">{searchFilter}</strong>
              </span>
              <button
                onClick={() => setSearchFilter('')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
              >
                {lang === 'de' ? 'Filter aufheben' : 'Reset filter'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'benchmark' ? (
        <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col space-y-3.5">
          {/* Search Bar mit Sortierung (Datum / Punktzahl), Kategorie-Slider, 5er-Schritt-Slider, NEW/OLD Score, Current/All Scope, Volle Explosion und alphabetischen Hersteller-Filtern */}
          <SearchBar
            value={searchFilter}
            onChange={(val) => {
              setSearchFilter(val);
              if (val.trim().length > 0) {
                setSelectedFamilies([]);
              }
            }}
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
            scoreMode={scoreMode}
            onScoreModeChange={setScoreMode}
            modelScope={modelScope}
            onModelScopeChange={setModelScope}
            fullExplosionEnabled={fullExplosionEnabled}
            onFullExplosionToggle={() => setFullExplosionEnabled((prev) => !prev)}
            showAdvanced={showAdvanced}
            categoryNames={loadedData.headerMeta?.categoryNames}
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
              onFullExplosionToggle={() => setFullExplosionEnabled((prev) => !prev)}
              searchFilter={searchFilter}
              selectedFamilies={selectedFamilies}
              selectedCompany={selectedCompany}
              lang={lang}
              showAdvanced={showAdvanced}
              onToggleAdvanced={() => setShowAdvanced((prev) => !prev)}
              priceFilter={priceFilter}
              onPriceFilterChange={setPriceFilter}
              categoryNames={loadedData.headerMeta?.categoryNames}
            />
          </div>

          {/* Textfeld-Bereich unter dem Balkendiagramm: CSV-Zellen B34/C34 & N34/O34 */}
          <div className="w-full pt-1 pb-4">
            <CsvNotesSection appLang={lang} notesMeta={loadedData.notesMeta} />
          </div>
        </main>
      ) : (
        <main className="flex-1 w-full">
          <LabMatrixView
            labs={labs}
            models={currentModels}
            onSelectLabForBenchmark={handleSelectLabFromMatrix}
            lang={lang}
          />
        </main>
      )}

    </div>
  );
}
