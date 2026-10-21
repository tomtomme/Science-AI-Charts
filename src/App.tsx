/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ModelRecord, ScoreMode, SortField, ModelScope, BenchmarkComponent, PriceFilter, LabEntry, ExplosionMode } from './types';
import { FALLBACK_CSV_CONTENT, SHEET_HTML_URL, CHART_HTML_URL, GITHUB_REPO_URL } from './data/rawCsvFallback';
import { FALLBACK_LAB_ENTRIES } from './data/rawLabCsvFallback';
import { extractSheetDate, extractHeaderMetadata, extractCsvNotesMetadata, parseModelDataset, parseAllModels } from './utils/csvParser';
import { LoadedDatasets, loadModelsData } from './services/dataService';
import { fetchLiveLabEntries } from './services/labDataService';
import { BENCHMARK_COMPONENTS } from './data/benchmarks';
import { ExplodedBarChart } from './components/ExplodedBarChart';
import { SearchBar } from './components/SearchBar';
import { CsvNotesSection } from './components/CsvNotesSection';
import { LabMatrixView } from './components/LabMatrixView';
import { TimelineScatterplot } from './components/TimelineScatterplot';
import { CorrelationsScatterplot } from './components/CorrelationsScatterplot';
import { Language, TRANSLATIONS } from './utils/i18n';
import { matchesSearchQuery } from './utils/searchUtils';
import { RefreshCw, Github, FileSpreadsheet, BarChart2, Info, Building2, SlidersHorizontal, TrendingUp, GitCompare } from 'lucide-react';



export default function App() {
  // Standardeinstellung: Englisch
  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];

  // Score-Modus: 'new' (8 Benchmarks) vs 'old' (5 Benchmarks)
  const [scoreMode, setScoreMode] = useState<ScoreMode>('new');

  // Score-Modus für die Timeline: Default 'old' (umfasst bis zu 224 historische Modelle)
  const [timelineScoreMode, setTimelineScoreMode] = useState<ScoreMode>('old');

  // Schalter: 'current' (nur noch verfügbare Chatbots) vs 'all' (alle Chatbots der CSV)
  const [modelScope, setModelScope] = useState<ModelScope>('current');

  // Preis-Filter: 'paid' (Standard), 'free', 'all'
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('paid');

  // Pop-Up für Titel / Untertitel bei Mouse-Over
  const [showHeaderInfo, setShowHeaderInfo] = useState<boolean>(false);

  // Aktive oder per Hover gewählte Kategorie für detaillierte Infos & Quellen-Link
  const [categoryInfoComp, setCategoryInfoComp] = useState<BenchmarkComponent | null>(null);

  // Pre-load all models from embedded fallback for instant zero-latency render
  const [loadedData, setLoadedData] = useState<LoadedDatasets>(() => ({
    models: parseModelDataset(FALLBACK_CSV_CONTENT, 'new'),
    allModels: parseAllModels(FALLBACK_CSV_CONTENT),
    newModels: parseModelDataset(FALLBACK_CSV_CONTENT, 'new'),
    oldModels: parseModelDataset(FALLBACK_CSV_CONTENT, 'old'),
    worstCaseModels: parseModelDataset(FALLBACK_CSV_CONTENT, 'worstCase'),
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
  
  // Slider: Anzahl angezeigter Modelle in 5er-Schritten (Standard: 250, damit alle Modelle sichtbar sind)
  const [topCount, setTopCount] = useState<number>(250);

  // Explosion Schalter: 'on' (an) | 'hover' (teils) | 'off' (aus) - Standard: 'hover' (wie bisheriges 'aus')
  const [explosionMode, setExplosionMode] = useState<ExplosionMode>('hover');

  // Sortierung: 'score' (Punktzahl) vs 'date' (Datum aus Spalte Y)
  const [sortBy, setSortBy] = useState<SortField>('score');

  // Slider für Kategorien: 0 = Alles (8 Benchmarks), 1..8 = nur eine der 8 Kategorien
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(0);
  // Separater Slider für Kategorien in der Timeline: Default 0 (führt bei timelineScoreMode 'old' zu Old Score als Standard)
  const [timelineCategoryIndex, setTimelineCategoryIndex] = useState<number>(0);

  // Erweiterter Modus (Buttons & Slider eingeklappt als Standard, auf Klick ausklappbar)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Tab-Navigation: 'benchmark' vs 'labs'
  const [activeTab, setActiveTab] = useState<'benchmark' | 'labs'>('benchmark');
  // Three-Way Tab for Benchmark: 'barchart' (Balkendiagramm) vs 'timeline' (Zeitachse) vs 'correlations' (Korrelationen)
  const [benchmarkView, setBenchmarkView] = useState<'barchart' | 'timeline' | 'correlations'>('barchart');


  // LLM Labs Datensatz (aus Google Sheets gid=355721692 mit Fallback)
  const [labs, setLabs] = useState<LabEntry[]>(FALLBACK_LAB_ENTRIES);

  useEffect(() => {
    fetchLiveLabEntries().then((res) => {
      if (res.entries && res.entries.length > 0) {
        setLabs(res.entries);
      }
    });
  }, []);

  // Filter: Freitext-Suche und Schnellfilter mit Standard-Vorauswahl 'All' (alle Modell-Familien)
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedCompany] = useState<string | null>(null);

  const handleSelectLabFromMatrix = useCallback((creatorName: string) => {
    setSearchFilter(creatorName);
    setSelectedFamilies([]);
    setPriceFilter('all');
    setActiveTab('benchmark');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Smooth scroll down to exact paragraph in notes below chart (Columns D to N)
  const scrollToParagraph = useCallback((targetId: string) => {
    const container = document.getElementById('csv-notes-section');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const doScrollToTarget = () => {
      const el = document.getElementById(targetId) || document.getElementById('final-scores-section');
      const box = document.getElementById('section1-scroll-box');
      if (el) {
        if (box) {
          const targetTop = el.offsetTop - box.offsetTop;
          box.scrollTo({ top: Math.max(0, targetTop - 12), behavior: 'smooth' });
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-500/15', 'rounded-lg', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-500/15');
        }, 3000);
      }
    };

    setTimeout(doScrollToTarget, 200);
    setTimeout(doScrollToTarget, 500);
  }, []);

  // Smooth scroll down to "final scores" explainer section in notes below chart
  const scrollToFinalScores = useCallback(() => {
    scrollToParagraph('final-scores-section');
  }, [scrollToParagraph]);

  // Active models based on scoreMode, modelScope & priceFilter ('current' vs 'all', 'free' vs 'paid' vs 'all')
  // HINWEIS: Wenn im Freitextfilter gesucht wird, sollen immer alle Bots durchsucht werden, nicht nur 'current' Bots.
  const effectiveModelScope: ModelScope = searchFilter.trim().length > 0 ? 'all' : modelScope;

  const currentModels = useMemo(() => {
    let base: ModelRecord[];
    if (selectedCategoryIndex === 0) {
      base =
        scoreMode === 'new'
          ? loadedData.newModels
          : scoreMode === 'old'
          ? loadedData.oldModels
          : loadedData.worstCaseModels;
    } else {
      // Individual category selected: include ALL models from the CSV that have a valid score in this category
      const comp = BENCHMARK_COMPONENTS[selectedCategoryIndex - 1];
      base = loadedData.allModels.filter((m) => m.rawScores[comp.key] !== null);
    }

    let list = effectiveModelScope === 'current' ? base.filter((m) => m.isAvailable) : base;

    // Preis-Filter: Default 'paid', sonst 'free' oder 'all'
    if (priceFilter === 'free') {
      list = list.filter((m) => !m.isPaid);
    } else if (priceFilter === 'paid') {
      list = list.filter((m) => m.isPaid);
    }

    return list;
  }, [scoreMode, selectedCategoryIndex, effectiveModelScope, loadedData, priceFilter]);

  // Full unfiltered models dataset for Timeline tab and Correlations tab:
  // Supplies all 237+ models scanned from row 36 downwards across all 8 categories and 3 scores.
  const fullTimelineModels = useMemo(() => {
    return loadedData.allModels;
  }, [loadedData.allModels]);

  const hasFilterActive =
    searchFilter.trim().length > 0 || selectedFamilies.length > 0 || selectedCompany !== null;

  const matchesFilter = useCallback(
    (model: ModelRecord) => {
      const targetText = `${model.displayName} ${model.name} ${model.companyName} ${model.creatorClean} ${model.creator || ''}`;
      const matchesSearch = matchesSearchQuery(searchFilter, targetText);

      const matchesFamilies =
        selectedFamilies.length === 0 ||
        selectedFamilies.some((fam) => {
          const famLow = fam.toLowerCase();
          return (
            model.displayName.toLowerCase().includes(famLow) ||
            model.name.toLowerCase().includes(famLow) ||
            model.companyName.toLowerCase().includes(famLow) ||
            model.creatorClean.toLowerCase().includes(famLow) ||
            Boolean(model.creator && model.creator.toLowerCase().includes(famLow))
          );
        });

      const matchesCompany =
        !selectedCompany ||
        model.companyName.toLowerCase() === selectedCompany.toLowerCase() ||
        model.creatorClean.toLowerCase().includes(selectedCompany.toLowerCase()) ||
        Boolean(model.creator && model.creator.toLowerCase().includes(selectedCompany.toLowerCase()));

      return Boolean(matchesSearch && matchesFamilies && matchesCompany);
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
          const rawA = a.rawScores[activeComp.key];
          const rawB = b.rawScores[activeComp.key];
          const valA = typeof rawA === 'number' && rawA !== null ? activeComp.transform(rawA) : -9999;
          const valB = typeof rawB === 'number' && rawB !== null ? activeComp.transform(rawB) : -9999;
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

  const handleExplosionModeChange = useCallback((mode: ExplosionMode) => {
    setExplosionMode(mode);
    if (mode === 'off' && selectedCategoryIndex === 0) {
      setCategoryInfoComp(null);
    }
  }, [selectedCategoryIndex]);

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

          {/* Controls, sync, date, language toggle & external link icons */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono shrink-0 self-start xl:self-center">
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

            {/* Datum der letzten Synchronisierung */}
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono whitespace-nowrap">
              <span className="hidden sm:inline">{t.lastSync} </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{formatSyncDate(lastSyncedAt)}</span>
            </span>

            {/* Language Switcher DE / EN - rechts vom Datum des letzten Syncs */}
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
            {/* Two-Way Tab: Bar Chart & Timeline */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-700/60 rounded-lg p-0.5">
              <button
                onClick={() => {
                  setActiveTab('benchmark');
                  setBenchmarkView('barchart');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'benchmark' && benchmarkView === 'barchart'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{lang === 'de' ? 'Balkendiagramm' : 'Bar Chart'}</span>
                <span className="text-[11px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-600/70 rounded text-slate-700 dark:text-slate-200 tabular-nums">
                  {displayedModels.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('benchmark');
                  setBenchmarkView('timeline');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'benchmark' && benchmarkView === 'timeline'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                <span>{lang === 'de' ? 'Zeitachse' : 'Timeline'}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('benchmark');
                  setBenchmarkView('correlations');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'benchmark' && benchmarkView === 'correlations'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5 text-indigo-500" />
                <span>{lang === 'de' ? 'Korrelationen' : 'Correlations'}</span>
              </button>
            </div>

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

          {/* Right section: Active filter reset notice + Benchmark Controls (only on barchart benchmark view) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 sm:ml-auto">
            {/* Active filter reset notice */}
            {searchFilter && activeTab === 'benchmark' && benchmarkView === 'barchart' && (
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

            {/* Benchmark Controls: Advanced Button + Paid/Free/All Switcher + Explosion Button (only on Bar Chart view) */}
            {activeTab === 'benchmark' && benchmarkView === 'barchart' && (
              <div className="flex items-center gap-1.5 shrink-0">

                {/* Advanced Button */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border shrink-0 ${
                    showAdvanced
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                  title={t.advancedDesc}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{t.advanced}</span>
                  <span className="text-[10px] opacity-80">{showAdvanced ? '▲' : '▼'}</span>
                </button>

                {/* Price Filter Switcher: Free / Paid / All */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 font-mono text-[10px] sm:text-[11px] font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setPriceFilter('free')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      priceFilter === 'free'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={t.priceFreeDesc}
                  >
                    {t.priceFree}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceFilter('paid')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      priceFilter === 'paid'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={t.pricePaidDesc}
                  >
                    {t.pricePaid} 💲
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceFilter('all')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      priceFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={t.priceAllDesc}
                  >
                    {t.priceAll}
                  </button>
                </div>

                {/* Explosion Button: an / teils / aus (on / hover / off) */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 font-mono text-[10px] sm:text-[11px] font-bold shrink-0">
                  <span className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-mono font-medium px-1.5 whitespace-nowrap">
                    {t.explosionToggle}
                  </span>
                  <div className="flex items-center bg-slate-200/60 dark:bg-slate-900/50 rounded p-0.5 gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleExplosionModeChange('on')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        explosionMode === 'on'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={t.explosionOnDesc}
                    >
                      {t.explosionOn}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExplosionModeChange('hover')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        explosionMode === 'hover'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={t.explosionHoverDesc}
                    >
                      {t.explosionHover}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExplosionModeChange('off')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        explosionMode === 'off'
                          ? 'bg-slate-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={t.explosionOffDesc}
                    >
                      {t.explosionOff}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'benchmark' ? (
        benchmarkView === 'timeline' ? (
          <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-4 flex flex-col space-y-4">
            <TimelineScatterplot
              models={fullTimelineModels}
              allModels={fullTimelineModels}
              scoreMode={timelineScoreMode}
              onScoreModeChange={setTimelineScoreMode}
              selectedCategoryIndex={timelineCategoryIndex}
              onCategoryIndexChange={(idx) => {
                setTimelineCategoryIndex(idx);
                if (idx > 0) {
                  setCategoryInfoComp(BENCHMARK_COMPONENTS[idx - 1]);
                } else {
                  setCategoryInfoComp(null);
                }
              }}
              onScrollToParagraph={scrollToParagraph}
              onScrollToFinalScores={scrollToFinalScores}
              lang={lang}
            />

            {/* Notes Section under Timeline */}
            <div className="w-full pt-1 pb-4">
              <CsvNotesSection appLang={lang} notesMeta={loadedData.notesMeta} />
            </div>
          </main>
        ) : benchmarkView === 'correlations' ? (
          <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-4 flex flex-col space-y-4">
            <CorrelationsScatterplot
              models={fullTimelineModels}
              allModels={fullTimelineModels}
              onScrollToParagraph={scrollToParagraph}
              onScrollToFinalScores={scrollToFinalScores}
              lang={lang}
            />

            {/* Notes Section under Correlations */}
            <div className="w-full pt-1 pb-4">
              <CsvNotesSection appLang={lang} notesMeta={loadedData.notesMeta} />
            </div>
          </main>
        ) : (
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
              onScrollToFinalScores={scrollToFinalScores}
              onScrollToParagraph={scrollToParagraph}
              modelScope={effectiveModelScope}
              onModelScopeChange={setModelScope}
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
                scoreMode={scoreMode}
                explosionMode={explosionMode}
                onExplosionModeChange={handleExplosionModeChange}
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
        )
      ) : (
        <main className="flex-1 w-full">
          <LabMatrixView
            labs={labs}
            models={loadedData.newModels}
            onSelectLabForBenchmark={handleSelectLabFromMatrix}
            lang={lang}
          />
        </main>
      )}


    </div>
  );
}
