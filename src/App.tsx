/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ModelRecord, ScoreMode, SortField, ModelScope, BenchmarkComponent, PriceFilter, LabEntry, ExplosionMode } from './types';
import { FALLBACK_CSV_CONTENT, SHEET_HTML_URL, GITHUB_REPO_URL } from './data/rawCsvFallback';
import { FALLBACK_LAB_ENTRIES } from './data/rawLabCsvFallback';
import { extractSheetDate, extractHeaderMetadata, extractCsvNotesMetadata, parseModelDataset, parseAllModels } from './utils/csvParser';
import { LoadedDatasets, loadModelsData } from './services/dataService';
import { fetchLiveLabEntries } from './services/labDataService';
import { BENCHMARK_COMPONENTS, RETIRED_TIMELINE_BENCHMARKS } from './data/benchmarks';
import { ExplodedBarChart } from './components/ExplodedBarChart';
import { ScoreSlider } from './components/ScoreSlider';
import { SearchBar } from './components/SearchBar';
import { CsvNotesSection } from './components/CsvNotesSection';
import { LabMatrixView, LabGroup } from './components/LabMatrixView';
import { TimelineScatterplot, TIMELINE_REGRESSION_OPTIONS, DEFAULT_TIMELINE_REGRESSION_INDEX } from './components/TimelineScatterplot';
import { CorrelationsScatterplot, CORRELATION_REGRESSION_OPTIONS, DEFAULT_CORRELATION_REGRESSION_INDEX } from './components/CorrelationsScatterplot';
import { extractFrontierPoints, isMultiLevelSupported } from './utils/mathRegression';
import { DEFAULT_TIMELINE_LAB_LEVELS } from './data/labLevels';
import { Language, TRANSLATIONS } from './utils/i18n';
import { matchesSearchQuery } from './utils/searchUtils';
import { RefreshCw, Github, FileSpreadsheet, BarChart2, Building2, SlidersHorizontal, TrendingUp, GitCompare, Sun, Moon, MapPin, BookOpen, Minus, Plus, Sparkles, ExternalLink, Layers } from 'lucide-react';
import { Tooltip } from './components/Tooltip';

export type ThemePreference = 'auto' | 'light' | 'dark';

export interface GeoCoords {
  lat: number;
  lng: number;
  updatedAt: number;
}

export interface AutoThemeResult {
  theme: 'light' | 'dark';
  source: 'gps' | 'system' | 'clock';
  sunriseStr?: string;
  sunsetStr?: string;
  detail: string;
}

/**
 * Calculates exact astronomical sunrise and sunset for a given date, latitude and longitude.
 */
export function getSolarDayNight(date: Date, lat: number, lng: number): {
  sunrise: Date;
  sunset: Date;
  isDay: boolean;
} {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const declination = 23.45 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
  const latRad = (lat * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;

  const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
  const clampedCos = Math.max(-1, Math.min(1, cosHourAngle));
  const hourAngle = (Math.acos(clampedCos) * 180) / Math.PI;

  const b = ((2 * Math.PI) / 365) * (dayOfYear - 81);
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const solarNoonUtc = 12 - lng / 15 - eot / 60;

  const sunriseUtcHours = solarNoonUtc - hourAngle / 15;
  const sunsetUtcHours = solarNoonUtc + hourAngle / 15;

  const sunrise = new Date(date);
  sunrise.setUTCHours(Math.floor(sunriseUtcHours), Math.round((sunriseUtcHours % 1) * 60), 0, 0);

  const sunset = new Date(date);
  sunset.setUTCHours(Math.floor(sunsetUtcHours), Math.round((sunsetUtcHours % 1) * 60), 0, 0);

  const nowTime = date.getTime();
  const isDay = nowTime >= sunrise.getTime() && nowTime < sunset.getTime();

  return { sunrise, sunset, isDay };
}

function getStoredGeoCoords(): GeoCoords | null {
  try {
    const raw = localStorage.getItem('science_iq_user_coords');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
        return parsed;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

function getStoredThemePref(): ThemePreference {
  try {
    const stored = localStorage.getItem('science_iq_theme_preference');
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'auto';
}

function getTimezoneInfo(): { timezone: string; timeStr: string } {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { timezone: tz, timeStr };
  } catch {
    return { timezone: 'Local', timeStr: '' };
  }
}

/**
 * Computes theme automatically with 3-tier intelligence:
 * 1. Exact GPS solar calculation (if coordinates available)
 * 2. Operating system / browser dark mode schedule (prefers-color-scheme)
 * 3. Seasonal clock threshold (adjusted for winter/summer day lengths)
 */
export function computeAutoTheme(coords: GeoCoords | null, lang: 'de' | 'en' = 'de'): AutoThemeResult {
  const now = new Date();

  // 1. If GPS coordinates are available, compute exact astronomical sunrise/sunset
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    const { sunrise, sunset, isDay } = getSolarDayNight(now, coords.lat, coords.lng);
    const sunriseStr = sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sunsetStr = sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      theme: isDay ? 'light' : 'dark',
      source: 'gps',
      sunriseStr,
      sunsetStr,
      detail:
        lang === 'de'
          ? `GPS: Sonnenaufgang ${sunriseStr}, Sonnenuntergang ${sunsetStr} (${isDay ? 'Tag = Hell' : 'Nacht = Dunkel'})`
          : `GPS: Sunrise ${sunriseStr}, Sunset ${sunsetStr} (${isDay ? 'Day = Light' : 'Night = Dark'})`,
    };
  }

  // 2. Check system / OS theme preference (Android scheduled dark mode / Linux theme)
  if (typeof window !== 'undefined' && window.matchMedia) {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isSystemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    if (isSystemDark || isSystemLight) {
      return {
        theme: isSystemDark ? 'dark' : 'light',
        source: 'system',
        detail:
          lang === 'de'
            ? `System / Browser: Orientiert am Betriebssystem (${isSystemDark ? 'Dunkelmodus' : 'Hellmodus'})`
            : `System / Browser: Matched to OS theme (${isSystemDark ? 'Dark Mode' : 'Light Mode'})`,
      };
    }
  }

  // 3. Fallback to seasonal clock hour (Winter: 07:00 - 17:30, Summer: 06:00 - 20:30)
  const month = now.getMonth();
  const isWinterHalf = month >= 9 || month <= 2; // Oct - March
  const dayStart = 7;
  const dayEnd = isWinterHalf ? 17.5 : 20.5;
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const isDay = currentHour >= dayStart && currentHour < dayEnd;
  const hourStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    theme: isDay ? 'light' : 'dark',
    source: 'clock',
    detail:
      lang === 'de'
        ? `Ortszeit: ${hourStr} (${isDay ? 'Tag = Hell' : 'Nacht = Dunkel'}, Richtwert ${dayStart}:00–${Math.floor(dayEnd)}:${dayEnd % 1 ? '30' : '00'})`
        : `Local Time: ${hourStr} (${isDay ? 'Day = Light' : 'Night = Dark'}, approx ${dayStart}:00–${Math.floor(dayEnd)}:${dayEnd % 1 ? '30' : '00'})`,
  };
}

export default function App() {
  // Standardeinstellung: Deutsch / Englisch
  const [lang, setLang] = useState<Language>('en');
  const t = TRANSLATIONS[lang];

  // Theme state: 'auto' | 'light' | 'dark' with GPS & timezone auto-switching & manual override
  const [themePref, setThemePref] = useState<ThemePreference>(getStoredThemePref);
  const [geoCoords, setGeoCoords] = useState<GeoCoords | null>(getStoredGeoCoords);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const [autoThemeInfo, setAutoThemeInfo] = useState<AutoThemeResult>(() =>
    computeAutoTheme(getStoredGeoCoords(), lang)
  );
  const [tzInfo, setTzInfo] = useState<{ timezone: string; timeStr: string }>(getTimezoneInfo);

  // Effective active theme (user override or automatic calculation)
  const effectiveTheme: 'light' | 'dark' = themePref === 'auto' ? autoThemeInfo.theme : themePref;

  // Apply effective theme to document.documentElement (<html class="dark">)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [effectiveTheme]);

  // Periodic recalculation every 60s for automatic sunrise/sunset transitions
  useEffect(() => {
    const update = () => {
      setAutoThemeInfo(computeAutoTheme(geoCoords, lang));
      setTzInfo(getTimezoneInfo());
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [geoCoords, lang]);

  // Request browser location permission via navigator.geolocation API
  const requestGeoLocation = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus(
        lang === 'de'
          ? 'Geolocation wird von diesem Browser nicht unterstützt.'
          : 'Geolocation is not supported by this browser.'
      );
      return;
    }

    setIsLocating(true);
    setLocationStatus(lang === 'de' ? 'Standort wird ermittelt...' : 'Locating...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const coords: GeoCoords = {
          lat: Math.round(pos.coords.latitude * 100) / 100,
          lng: Math.round(pos.coords.longitude * 100) / 100,
          updatedAt: Date.now(),
        };
        setGeoCoords(coords);
        try {
          localStorage.setItem('science_iq_user_coords', JSON.stringify(coords));
        } catch {}
        // Recalculate auto theme with new coords
        setAutoThemeInfo(computeAutoTheme(coords, lang));
        setLocationStatus(
          lang === 'de'
            ? `Standort aktiv: ${coords.lat}° N, ${coords.lng}° O`
            : `Location active: ${coords.lat}° N, ${coords.lng}° E`
        );
        setTimeout(() => setLocationStatus(null), 4000);
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation prompt error / denied:', err);
        // Silently fallback without noisy warning toast
        setLocationStatus(null);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleSelectTheme = (mode: ThemePreference) => {
    setThemePref(mode);
    try {
      localStorage.setItem('science_iq_theme_preference', mode);
    } catch {}

    // When explicitly switching to Auto, if coords are not yet stored, ask for browser location permission
    if (mode === 'auto' && !geoCoords) {
      requestGeoLocation();
    }
  };

  // Score-Modus: 'new' (8 Benchmarks) vs 'old' (5 Benchmarks)
  const [scoreMode, setScoreMode] = useState<ScoreMode>('new');

  // Score-Modus für die Timeline: Default 'old' (umfasst bis zu 224 historische Modelle)
  const [timelineScoreMode, setTimelineScoreMode] = useState<ScoreMode>('old');

  // Schalter: 'current' (nur noch verfügbare Chatbots) vs 'all' (alle Chatbots der CSV) - Standard: 'current'
  const [modelScope, setModelScope] = useState<ModelScope>('current');

  // Preis-Filter: 'paid' (Standard), 'free', 'all'
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('paid');


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
  
  // Slider: Anzahl angezeigter Modelle - standardmäßig immer auf Maximum (alle Modelle),
  // bis der Benutzer den Slider aktiv mit dem Regler oder +/- verkleinert.
  const [userAdjustedTopCount, setUserAdjustedTopCount] = useState<boolean>(false);
  const [userTopCount, setUserTopCount] = useState<number>(9999);

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

  // Timeline State elevated to header
  const [timelineScope, setTimelineScope] = useState<'all' | 'frontier'>('all');
  const [timelineRegressionIndex, setTimelineRegressionIndex] = useState<number>(DEFAULT_TIMELINE_REGRESSION_INDEX);
  const [timelinePolyDegree, setTimelinePolyDegree] = useState<number>(2);
  const [timelineLoessSpan, setTimelineLoessSpan] = useState<number>(50);
  const [timelineMultiLevel, setTimelineMultiLevel] = useState<boolean>(false);
  const [timelineSelectedLabLevels, setTimelineSelectedLabLevels] = useState<string[]>(DEFAULT_TIMELINE_LAB_LEVELS);

  // Correlations State elevated to header
  const [correlationsScope, setCorrelationsScope] = useState<'all' | 'frontier'>('all');
  const [correlationsRegressionIndex, setCorrelationsRegressionIndex] = useState<number>(DEFAULT_CORRELATION_REGRESSION_INDEX);
  const [correlationsPolyDegree, setCorrelationsPolyDegree] = useState<number>(2);
  const [correlationsLoessSpan, setCorrelationsLoessSpan] = useState<number>(50);

  // Ecosystem / Lab Matrix State elevated to header
  const [labActiveGroup, setLabActiveGroup] = useState<LabGroup>('top10');
  const [showLabAdvanced, setShowLabAdvanced] = useState<boolean>(false);


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
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const handleSelectLabFromMatrix = useCallback((creatorName: string) => {
    setSearchFilter(creatorName);
    setSelectedFamilies([]);
    setPriceFilter('all');
    setActiveTab('benchmark');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Jump smoothly to a specific term in the Glossary on the LLM-Labs tab & highlight it
  const navigateToGlossaryTerm = useCallback((termId: string = 'term-api') => {
    setActiveTab('labs');
    const tryHighlight = (attemptsLeft: number) => {
      const el = document.getElementById(termId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-900', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
        }, 3500);
      } else if (attemptsLeft > 0) {
        setTimeout(() => tryHighlight(attemptsLeft - 1), 100);
      } else {
        const sec = document.getElementById('glossary-section');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    setTimeout(() => tryHighlight(6), 100);
  }, []);

  // Smooth scroll down to exact paragraph in notes below chart (Columns D to N)
  const scrollToParagraph = useCallback((targetId: string) => {
    const container = document.getElementById('csv-notes-section');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const doScrollToTarget = () => {
      const el = document.getElementById(targetId) || document.getElementById('note-col-simplebench') || document.getElementById('note-col-k') || document.getElementById('final-scores-section');
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

  // Reset all state, filters, searches, views and sliders to initial defaults
  const handleResetToDefaults = useCallback((e?: React.MouseEvent) => {
    // If standard left-click without modifiers, reset state without full page reload
    if (e && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
      e.preventDefault();
    }
    setScoreMode('new');
    setTimelineScoreMode('old');
    setModelScope('current');
    setPriceFilter('paid');
    setUserTopCount(9999);
    setUserAdjustedTopCount(false);
    setExplosionMode('hover');
    setSortBy('score');
    setSelectedCategoryIndex(0);
    setTimelineCategoryIndex(0);
    setShowAdvanced(false);
    setActiveTab('benchmark');
    setBenchmarkView('barchart');
    setTimelineScope('all');
    setTimelineRegressionIndex(DEFAULT_TIMELINE_REGRESSION_INDEX);
    setTimelinePolyDegree(2);
    setTimelineLoessSpan(50);
    setCorrelationsScope('all');
    setCorrelationsRegressionIndex(DEFAULT_CORRELATION_REGRESSION_INDEX);
    setCorrelationsPolyDegree(2);
    setCorrelationsLoessSpan(50);
    setLabActiveGroup('top10');
    setShowLabAdvanced(false);
    setSearchFilter('');
    setSelectedFamilies([]);
    setSelectedCompany(null);
    setCategoryInfoComp(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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

    // Preis-Filter: 'free_api' | 'free_chat' | 'paid' | 'all'
    if (priceFilter === 'free_api') {
      list = list.filter((m) => m.isFreeApi);
    } else if (priceFilter === 'free_chat' || priceFilter === 'free') {
      list = list.filter((m) => !m.isPaid || m.isFreeApi);
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

  // Active regression options for header display
  const activeTimelineRegression = TIMELINE_REGRESSION_OPTIONS[timelineRegressionIndex] || TIMELINE_REGRESSION_OPTIONS[0];
  const isTimelineMultiLevelFeasible = isMultiLevelSupported(activeTimelineRegression.id);
  const isTimelineMultiLevelActive = timelineMultiLevel && isTimelineMultiLevelFeasible;
  const activeCorrelationsRegression = CORRELATION_REGRESSION_OPTIONS[correlationsRegressionIndex] || CORRELATION_REGRESSION_OPTIONS[0];

  // Timeline eligible models count for header scope badge count
  const timelineEligibleCount = useMemo(() => {
    let count = 0;
    for (const m of fullTimelineModels) {
      if (!m.releaseDate) continue;
      const ts = new Date(m.releaseDate).getTime();
      if (isNaN(ts)) continue;
      let score: number | null = null;
      if (timelineCategoryIndex === 0) {
        score = timelineScoreMode === 'old' ? m.scoreOld : timelineScoreMode === 'worstCase' ? m.scoreWorstCase : m.scoreNewReported;
      } else {
        const comp = timelineCategoryIndex > 8
          ? RETIRED_TIMELINE_BENCHMARKS[timelineCategoryIndex - 9]
          : BENCHMARK_COMPONENTS[timelineCategoryIndex - 1];
        if (comp && m.rawScores) {
          const raw = m.rawScores[comp.key];
          score = typeof raw === 'number' && raw !== null ? comp.transform(raw) : null;
        }
      }
      if (typeof score === 'number' && score > 0) {
        count++;
      }
    }
    return count;
  }, [fullTimelineModels, timelineCategoryIndex, timelineScoreMode]);

  // Timeline frontier points calculation for header scope badge count
  const timelineFrontierCount = useMemo(() => {
    const list: Array<{ id: string; timestamp: number; score: number }> = [];
    for (const m of fullTimelineModels) {
      if (!m.releaseDate) continue;
      const ts = new Date(m.releaseDate).getTime();
      if (isNaN(ts)) continue;
      let score: number | null = null;
      if (timelineCategoryIndex === 0) {
        score = timelineScoreMode === 'old' ? m.scoreOld : timelineScoreMode === 'worstCase' ? m.scoreWorstCase : m.scoreNewReported;
      } else {
        const comp = timelineCategoryIndex > 8
          ? RETIRED_TIMELINE_BENCHMARKS[timelineCategoryIndex - 9]
          : BENCHMARK_COMPONENTS[timelineCategoryIndex - 1];
        if (comp && m.rawScores) {
          const raw = m.rawScores[comp.key];
          score = typeof raw === 'number' && raw !== null ? comp.transform(raw) : null;
        }
      }
      if (typeof score === 'number' && score > 0) {
        list.push({ id: m.id, timestamp: ts, score });
      }
    }
    list.sort((a, b) => a.timestamp - b.timestamp);
    return extractFrontierPoints(list as any).length;
  }, [fullTimelineModels, timelineCategoryIndex, timelineScoreMode]);

  // Correlation frontier points calculation for header scope badge count
  const correlationsFrontierCount = useMemo(() => {
    const eligible = fullTimelineModels
      .filter((m) => {
        const sc = m.scoreOld ?? m.scoreNewReported;
        return typeof sc === 'number' && sc > 0;
      })
      .map((m) => ({
        id: m.id,
        timestamp: new Date(m.releaseDate).getTime(),
        score: (m.scoreOld ?? m.scoreNewReported) as number,
      }));
    eligible.sort((a, b) => a.timestamp - b.timestamp);
    return extractFrontierPoints(eligible as any).length;
  }, [fullTimelineModels]);

  // Ecosystem group counts for header pills
  const labCounts = useMemo(() => {
    return {
      all: labs.length,
      top10: labs.filter((l) => l.group === 'top10').length,
      contender: labs.filter((l) => l.group === 'contender').length,
      tweakers: labs.filter((l) => l.group === 'tweakers').length,
      small: labs.filter((l) => l.group === 'small').length,
      harness: labs.filter((l) => l.group === 'harness').length,
    };
  }, [labs]);

  const scrollToGlossary = useCallback(() => {
    setActiveTab('labs');
    setTimeout(() => {
      const el = document.getElementById('glossary-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-blue-500', 'ring-offset-4', 'dark:ring-offset-slate-950', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-4', 'dark:ring-offset-slate-950');
        }, 2500);
      }
    }, 80);
  }, []);

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

  const matchCount = useMemo(() => {
    if (!hasFilterActive) return currentModels.length;
    return currentModels.filter(matchesFilter).length;
  }, [currentModels, hasFilterActive, matchesFilter]);

  // Max-Bar-Count Slider: Immer auf Maximum (alle Treffer der aktuellen Auswahl/Filter),
  // unabhängig von Filtern/Auswahlen, bis der Benutzer den Slider aktiv verkleinert.
  // Wenn Filter oder Auswahlen geändert werden, wird der Slider automatisch wieder auf das Maximum gesetzt.
  useEffect(() => {
    setUserAdjustedTopCount(false);
  }, [
    searchFilter,
    selectedFamilies,
    selectedCompany,
    priceFilter,
    effectiveModelScope,
    scoreMode,
    selectedCategoryIndex,
    loadedData,
  ]);

  const maxAvailableModels = matchCount;
  const topCount = userAdjustedTopCount ? Math.min(userTopCount, maxAvailableModels) : maxAvailableModels;

  const setTopCount = useCallback((n: number) => {
    if (n >= matchCount) {
      setUserAdjustedTopCount(false);
      setUserTopCount(matchCount);
    } else {
      setUserAdjustedTopCount(true);
      setUserTopCount(n);
    }
  }, [matchCount]);

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

  const handleToggleFamily = useCallback((family: string) => {
    setSelectedFamilies((prev) =>
      prev.includes(family) ? prev.filter((f) => f !== family) : [...prev, family]
    );
  }, []);

  const handleClearFamilies = useCallback(() => {
    setSelectedFamilies([]);
    setSelectedCompany(null);
  }, []);

  const handleSelectCompany = useCallback((company: string) => {
    setSelectedCompany((prev) => (prev?.toLowerCase() === company.toLowerCase() ? null : company));
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
      const [result, labRes] = await Promise.all([
        loadModelsData(),
        fetchLiveLabEntries(),
      ]);
      if (result.newModels.length > 0 || result.oldModels.length > 0) {
        setLoadedData(result);
      }
      if (labRes.entries && labRes.entries.length > 0) {
        setLabs(labRes.entries);
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
          {/* Title directly from CSV: links to site & resets on click; subtitle popup on hover */}
          <div className="min-w-0 flex-1">
            <Tooltip
              content={
                <div className="space-y-2 text-xs sm:text-sm text-slate-100 font-normal leading-relaxed">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 pb-1.5">
                    <span className="font-bold text-sm sm:text-base text-blue-400">
                      {lang === 'de' ? (loadedData.headerMeta?.titleDe || t.title) : (loadedData.headerMeta?.combinedTitle || t.title)}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 shrink-0">
                      {lang === 'de' ? 'Methodik & Fokus' : 'Methodology & Focus'}
                    </span>
                  </div>
                  <p className="leading-relaxed text-slate-200">
                    {lang === 'de' ? (loadedData.headerMeta?.subtitleDe || t.subtitle) : (loadedData.headerMeta?.subtitle || t.subtitle)}
                  </p>
                  <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>{lang === 'de' ? 'Klicken: Alle Filter & Ansichten auf Standard zurücksetzen' : 'Click: Reset all filters & views to defaults'}</span>
                    <span className="text-emerald-400 font-semibold">{lang === 'de' ? '↺ Zurücksetzen' : '↺ Reset'}</span>
                  </div>
                </div>
              }
              position="bottom"
              align="left"
              width="w-[90vw] sm:w-[580px] md:w-[720px] lg:w-[840px] xl:w-[920px]"
              popupClassName="p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-2xl rounded-xl bg-slate-900/98 dark:bg-slate-950/98 border border-slate-700/90"
              className="inline-block max-w-full"
            >
              <a
                href="https://tomtomme.github.io/Science-AI-Charts/"
                onClick={handleResetToDefaults}
                className="group cursor-pointer inline-block max-w-full text-left focus:outline-hidden"
              >
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {lang === 'de' ? (loadedData.headerMeta?.titleDe || t.title) : (loadedData.headerMeta?.combinedTitle || t.title)}
                </h1>
              </a>
            </Tooltip>
          </div>

          {/* Controls, sync, date, language toggle & external link icons */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono shrink-0 self-start xl:self-center">
            {/* Synchronisieren-Button mit einheitlichem Tooltip */}
            <Tooltip
              title="Google Sheets Sync"
              badge={isSyncing ? t.syncingText : (loadedData.isLive ? 'Live' : 'Fallback')}
              content={
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400 font-medium">{t.lastSync}:</span>
                    <span className="font-mono text-emerald-400 font-bold">{formatSyncDate(lastSyncedAt)}</span>
                  </div>
                  <div className="text-xs text-slate-400 border-t border-slate-700/60 pt-1 leading-normal">
                    {t.autoSyncNotice}
                  </div>
                </div>
              }
              align="center"
              width="w-60"
            >
              <button
                type="button"
                onClick={refreshData}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                aria-label={t.syncButtonTitle}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
                <span>{t.sync}</span>
              </button>
            </Tooltip>

            {/* Glossar-Knopf direkt in der obersten Zeile zwischen Sync und DE/EN */}
            <Tooltip
              title={lang === 'de' ? 'Interaktives Glossar' : 'Interactive Glossary'}
              badge={lang === 'de' ? 'Fachbegriffe' : 'Key Concepts'}
              content={
                lang === 'de'
                  ? 'Öffnet das Glossar mit anschaulichen Erklärungen für Einsteiger zu wissenschaftlichen Modellen, Regressionen, Konfidenzbändern und KI-Grundlagen.'
                  : 'Opens the interactive glossary with intuitive explanations of scientific models, regressions, confidence ribbons, and AI concepts.'
              }
              align="center"
              width="w-72"
            >
              <button
                type="button"
                onClick={scrollToGlossary}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer font-medium text-xs border border-slate-200/80 dark:border-slate-700/80"
                aria-label={lang === 'de' ? 'Glossar öffnen' : 'Open glossary'}
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                <span>{lang === 'de' ? 'Glossar' : 'Glossary'}</span>
              </button>
            </Tooltip>

            {/* Language Switcher DE / EN - rechts vom Datum des letzten Syncs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
              <Tooltip
                content={lang === 'de' ? 'Auf Deutsch umschalten' : 'Switch to German'}
                align="center"
                width="w-40"
              >
                <button
                  type="button"
                  onClick={() => setLang('de')}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                    lang === 'de'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  DE
                </button>
              </Tooltip>
              <Tooltip
                content={lang === 'de' ? 'Auf Englisch umschalten' : 'Switch to English'}
                align="center"
                width="w-40"
              >
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                    lang === 'en'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  EN
                </button>
              </Tooltip>
            </div>

            {/* Theme Mode Switcher (Light / Dark / Auto by timezone/GPS) */}
            <div
              className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5"
              role="group"
              aria-label={lang === 'de' ? 'Designmodus (Hell, Dunkel oder Automatisch)' : 'Theme mode (Light, Dark or Automatic)'}
            >
              <Tooltip
                title={lang === 'de' ? 'Hellmodus' : 'Light Mode'}
                content={
                  lang === 'de'
                    ? 'Hellmodus erzwingen (Auto-Modus überschreiben).'
                    : 'Force Light Mode (Override Auto mode).'
                }
                align="center"
                width="w-48"
              >
                <button
                  type="button"
                  onClick={() => handleSelectTheme('light')}
                  className={`p-1 sm:px-1.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    themePref === 'light'
                      ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-2xs'
                      : themePref === 'auto' && effectiveTheme === 'light'
                      ? 'text-amber-500/80 hover:text-amber-500'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  aria-pressed={themePref === 'light'}
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
              </Tooltip>

              <Tooltip
                title={lang === 'de' ? 'Dunkelmodus' : 'Dark Mode'}
                content={
                  lang === 'de'
                    ? 'Dunkelmodus erzwingen (Auto-Modus überschreiben).'
                    : 'Force Dark Mode (Override Auto mode).'
                }
                align="center"
                width="w-48"
              >
                <button
                  type="button"
                  onClick={() => handleSelectTheme('dark')}
                  className={`p-1 sm:px-1.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    themePref === 'dark'
                      ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-2xs'
                      : themePref === 'auto' && effectiveTheme === 'dark'
                      ? 'text-blue-400/80 hover:text-blue-400'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  aria-pressed={themePref === 'dark'}
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
              </Tooltip>

              <Tooltip
                title="Auto Mode"
                badge={themePref === 'auto' ? 'Aktiv' : 'Inaktiv'}
                content={
                  themePref === 'auto'
                    ? lang === 'de'
                      ? `Auto-Modus aktiv: ${autoThemeInfo.detail}. Zum Deaktivieren auf Sonne oder Mond klicken.`
                      : `Auto mode active: ${autoThemeInfo.detail}. Click Sun or Moon to deactivate.`
                    : lang === 'de'
                    ? `Manuell überschrieben (${themePref === 'dark' ? 'Dunkel' : 'Hell'}). Klicken, um Auto-Modus (Zeitzonen- & GPS-Steuerung) zu aktivieren.`
                    : `Manually overridden (${themePref === 'dark' ? 'Dark' : 'Light'}). Click to activate Auto mode (timezone & GPS control).`
                }
                align="center"
                width="w-60"
              >
                <button
                  type="button"
                  onClick={() => handleSelectTheme('auto')}
                  className={`px-1.5 py-0.5 rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                    themePref === 'auto'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  aria-pressed={themePref === 'auto'}
                >
                  Auto
                </button>
              </Tooltip>

              {/* GPS Location Pin Button - triggers native browser permission dialog */}
              <Tooltip
                title={geoCoords ? 'GPS: Aktiv' : 'GPS: Standort'}
                content={
                  geoCoords
                    ? lang === 'de'
                      ? `📍 GPS-Standort aktiv (${geoCoords.lat}° N, ${geoCoords.lng}° O). Sonnenaufgang: ${autoThemeInfo.sunriseStr || '-'}, Sonnenuntergang: ${autoThemeInfo.sunsetStr || '-'}. Klicken zum erneuten Abfragen.`
                      : `📍 GPS location active (${geoCoords.lat}° N, ${geoCoords.lng}° E). Sunrise: ${autoThemeInfo.sunriseStr || '-'}, Sunset: ${autoThemeInfo.sunsetStr || '-'}. Click to re-query.`
                    : lang === 'de'
                    ? '📍 Standort abfragen (GPS): Klicken, damit der Browser um Erlaubnis fragt. Berechnet exakte Sonnenauf- & -untergangszeiten für Ihren Standort.'
                    : '📍 Query location (GPS): Click to trigger browser location permission dialog. Calculates exact sunrise & sunset for your location.'
                }
                align="right"
                width="w-64"
              >
                <button
                  type="button"
                  onClick={requestGeoLocation}
                  disabled={isLocating}
                  className={`p-1 py-0.5 rounded text-xs transition-all cursor-pointer flex items-center justify-center ${
                    geoCoords
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  } ${isLocating ? 'animate-pulse opacity-75' : ''}`}
                  aria-label={lang === 'de' ? 'Standort via GPS abfragen' : 'Query location via GPS'}
                >
                  <MapPin className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>

            {locationStatus && (
              <span className="text-xs text-blue-600 dark:text-blue-400 font-mono whitespace-nowrap">
                {locationStatus}
              </span>
            )}


            <Tooltip
              content={t.googleSheetOpen}
              align="right"
              width="w-44"
            >
              <a
                href={SHEET_HTML_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                aria-label={t.googleSheetOpen}
              >
                <FileSpreadsheet className="w-4 h-4" />
              </a>
            </Tooltip>

            <Tooltip
              content={t.githubRepoOpen}
              align="right"
              width="w-36"
            >
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                aria-label={t.githubRepoOpen}
              >
                <Github className="w-4 h-4" />
              </a>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Primary Tab Switcher */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-30 px-3 sm:px-6 shadow-2xs">
        <div className="w-full max-w-[1720px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-2.5 py-1.5 sm:py-2">
          {/* Segmented Tab Controls: Horizontally scrollable on mobile/tablet without overflowing */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl max-w-full overflow-x-auto no-scrollbar shrink-0">
            {/* Two-Way Tab: Bar Chart & Timeline */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-700/60 rounded-lg p-0.5 shrink-0">
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
                <span>{lang === 'de' ? 'Zeitreihe' : 'Timeline'}</span>
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
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shrink-0 ${
                activeTab === 'labs'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{lang === 'de' ? 'Ökosystem' : 'Ecosystem'}</span>
            </button>
          </div>

          {/* Right section: Active filter reset notice + Benchmark Controls (accessible on mobile/tablet) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 lg:ml-auto max-w-full py-0.5">
            {/* Active filter reset notice */}
            {searchFilter && activeTab === 'benchmark' && benchmarkView === 'barchart' && (
              <div className="flex items-center gap-2 text-xs shrink-0">
                <span className="text-slate-500 text-xs">
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

            {/* Benchmark Controls: ScoreSlider + Paid/Free/All Switcher + Advanced Button (only on Bar Chart view) */}
            {activeTab === 'benchmark' && benchmarkView === 'barchart' && (
              <div className="flex flex-wrap items-center gap-1.5 max-w-full">
                {/* Score / Category Criteria Slider */}
                <ScoreSlider
                  scoreMode={scoreMode}
                  onScoreModeChange={setScoreMode}
                  selectedCategoryIndex={selectedCategoryIndex}
                  onSelectCategoryIndex={setSelectedCategoryIndex}
                  categoryNames={loadedData.headerMeta?.categoryNames}
                  row33Meta={loadedData.headerMeta?.row33}
                  onHoverCategory={setCategoryInfoComp}
                  onScrollToParagraph={scrollToParagraph}
                  lang={lang}
                />

                {/* Price Filter Switcher: Free(API|Chat)Paid|All */}
                <div
                  className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 font-mono text-xs font-bold shrink-0 max-w-full overflow-x-auto no-scrollbar"
                  role="group"
                  aria-label={t.priceFilterDesc}
                >
                  {/* Free Group: Free(API|Chat) */}
                  <div className="flex items-center">
                    {/* Free( prefix */}
                    <Tooltip
                      title={<span className="text-emerald-400">Free ({lang === 'de' ? 'Kostenlos' : 'Free'})</span>}
                      align="left"
                      width="w-60"
                      content={
                        lang === 'de'
                          ? 'Kostenlose Modelle: Zwischen Free API und Free Chat OR API umschalten.'
                          : 'Free models: Toggle between Free API and Free Chat OR API.'
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setPriceFilter(priceFilter === 'free_api' ? 'free_chat' : 'free_api')}
                        className={`pl-1 font-bold text-xs select-none cursor-pointer transition-colors ${
                          priceFilter === 'free_api' || priceFilter === 'free_chat'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Free(
                      </button>
                    </Tooltip>

                    {/* API Button with detailed explanation and Glossary link */}
                    <Tooltip
                      title={<span className="text-emerald-400">🌐 Free API</span>}
                      badge={lang === 'de' ? 'Schnittstelle' : 'Interface'}
                      align="left"
                      width="w-72"
                      content={
                        <div>
                          <div className="mb-2">
                            {lang === 'de'
                              ? 'Nur Modelle mit kostenlosem API-Zugriff (🌐). Ermöglicht den direkten programmatischen Zugriff über Netzwerk-Endpunkte – z. B. für JASP, Python-Skripte oder automatisierte KI-Agenten ohne monatliche Grundgebühr.'
                              : 'Only models offering free API access (🌐). Provides direct programmatic access over network endpoints – e.g. for JASP, Python scripts, or automated AI agent workflows without monthly subscription fees.'}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToGlossaryTerm('term-api');
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline pt-1.5 border-t border-slate-800/90 w-full cursor-pointer transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{lang === 'de' ? 'Ausführliche Erklärung im Glossar öffnen →' : 'Read full explanation in Glossary →'}</span>
                          </button>
                        </div>
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setPriceFilter('free_api')}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                          priceFilter === 'free_api'
                            ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        aria-pressed={priceFilter === 'free_api'}
                      >
                        API🌐
                      </button>
                    </Tooltip>

                    <span className="text-slate-400 dark:text-slate-600 text-xs px-0.5 select-none">|</span>

                    {/* Chat Button */}
                    <Tooltip
                      title={<span className="text-emerald-400">Free Chat OR API</span>}
                      align="center"
                      width="w-64"
                      content={
                        lang === 'de'
                          ? 'Kostenlos im Web-Chat nutzbar ODER mit kostenloser API verfügbar.'
                          : 'Free to use in web chat OR available with a free API tier.'
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setPriceFilter('free_chat')}
                        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                          priceFilter === 'free_chat'
                            ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        aria-pressed={priceFilter === 'free_chat'}
                      >
                        Chat
                      </button>
                    </Tooltip>

                    <span
                      className={`pr-1 font-bold text-xs select-none ${
                        priceFilter === 'free_api' || priceFilter === 'free_chat'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      )
                    </span>
                  </div>

                  {/* Paid / € */}
                  <Tooltip
                    title={<span className="text-amber-400">{lang === 'de' ? 'Kostenpflichtig (€)' : 'Paid (€)'}</span>}
                    align="center"
                    width="w-64"
                    content={
                      lang === 'de'
                        ? 'Nur kostenpflichtige Chatbots, die ein aktives kostenpflichtiges Abonnement (Plus/Pro/Abo) voraussetzen.'
                        : 'Paid chatbots only (requiring a subscription tier like Plus/Pro or paid billing).'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setPriceFilter('paid')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        priceFilter === 'paid'
                          ? 'bg-amber-600 text-white shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      aria-pressed={priceFilter === 'paid'}
                    >
                      €
                    </button>
                  </Tooltip>

                  <span className="text-slate-300 dark:text-slate-600 text-xs px-0.5 select-none">|</span>

                  {/* All */}
                  <Tooltip
                    title={<span className="text-blue-400">{lang === 'de' ? 'Alle Modelle' : 'All Models'}</span>}
                    align="right"
                    width="w-56"
                    content={
                      lang === 'de'
                        ? 'Alle Chatbots anzeigen (kostenlos & bezahlt).'
                        : 'Show all chatbots (free & paid).'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setPriceFilter('all')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        priceFilter === 'all'
                          ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      aria-pressed={priceFilter === 'all'}
                    >
                      {t.priceAll}
                    </button>
                  </Tooltip>
                </div>

                {/* Advanced Button (ganz rechts, Pop-up entfernt) */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border shrink-0 ${
                    showAdvanced
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{t.advanced}</span>
                  <span className="text-xs opacity-80">{showAdvanced ? '▲' : '▼'}</span>
                </button>
              </div>
            )}

            {/* Timeline View Header Controls: ScoreSlider, Scope toggle, Regression slider & badges, and Contextual param input */}
            {activeTab === 'benchmark' && benchmarkView === 'timeline' && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Score / Category Criteria Slider (Timeline includes retired benchmarks from Cols U-X) */}
                <ScoreSlider
                  scoreMode={timelineScoreMode}
                  onScoreModeChange={setTimelineScoreMode}
                  selectedCategoryIndex={timelineCategoryIndex}
                  onSelectCategoryIndex={(idx) => {
                    setTimelineCategoryIndex(idx);
                    if (idx > 8) {
                      setCategoryInfoComp(RETIRED_TIMELINE_BENCHMARKS[idx - 9]);
                    } else if (idx > 0) {
                      setCategoryInfoComp(BENCHMARK_COMPONENTS[idx - 1]);
                    } else {
                      setCategoryInfoComp(null);
                    }
                  }}
                  categoryNames={loadedData.headerMeta?.categoryNames}
                  row33Meta={loadedData.headerMeta?.row33}
                  onHoverCategory={setCategoryInfoComp}
                  onScrollToParagraph={scrollToParagraph}
                  lang={lang}
                  allowRetiredScores={true}
                />

                {/* Scope Segmented Control */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTimelineScope('all')}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      timelineScope === 'all'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'de' ? 'Alle Modelle' : 'All Models'} ({timelineEligibleCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineScope('frontier')}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      timelineScope === 'frontier'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
                    }`}
                    title={
                      lang === 'de'
                        ? 'Nur Pionier-Modelle (historische Rekordhalter / Pareto-Front)'
                        : 'Only pioneer models (historical record breakers / Pareto frontier)'
                    }
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{lang === 'de' ? 'Pioniere' : 'Pioneers'}</span>
                    <span className="text-xs opacity-90">({timelineFrontierCount})</span>
                  </button>
                </div>

                {/* Regression Model Controller wrapped in Tooltip */}
                <Tooltip
                  title={lang === 'de' ? activeTimelineRegression.labelDe : activeTimelineRegression.labelEn}
                  badge={lang === 'de' ? 'Modell' : 'Model'}
                  position="bottom"
                  align="center"
                  width="w-96"
                  content={
                    <div className="space-y-2">
                      <p className="leading-relaxed text-slate-200">
                        {lang === 'de' ? activeTimelineRegression.descDe : activeTimelineRegression.descEn}
                      </p>
                      {activeTimelineRegression.id === 'polynomial' && (
                        <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-[11px] text-amber-300">
                          <span className="text-slate-400">{lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}</span>
                          <span className="font-bold">
                            {lang === 'de'
                              ? `Grad ${timelinePolyDegree} (${timelinePolyDegree === 2 ? 'Parabel' : timelinePolyDegree === 3 ? 'Wendepunkt' : 'Höhere Ordnung'})`
                              : `Degree ${timelinePolyDegree} (${timelinePolyDegree === 2 ? 'Parabola' : timelinePolyDegree === 3 ? 'Inflection' : 'Higher order'})`}
                          </span>
                        </div>
                      )}
                      {activeTimelineRegression.id === 'loess' && (
                        <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-[11px] text-amber-300">
                          <span className="text-slate-400">{lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}</span>
                          <span className="font-bold">
                            {lang === 'de' ? `Span = ${timelineLoessSpan}% (Fensterbreite)` : `Span = ${timelineLoessSpan}% (Window width)`}
                          </span>
                        </div>
                      )}
                      {activeTimelineRegression.id !== 'frontier' && (
                        <div className="pt-1.5 border-t border-slate-700/60 text-[11px] text-slate-300 leading-snug">
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span>{lang === 'de' ? '95%-Konfidenzband' : '95% Confidence Band'}</span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 leading-normal">
                            {lang === 'de'
                              ? 'Das schattierte Band zeigt den statistischen Unsicherheitsbereich der Schätzung: Bei dichter Datenlage ist es schmal, bei wenigen oder streuenden Punkten weitet es sich.'
                              : 'The shaded ribbon reflects estimation uncertainty: narrow where data is abundant, wider where observations are scarce or dispersed.'}
                          </p>
                        </div>
                      )}
                    </div>
                  }
                >
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0 cursor-pointer">
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                      <span>{lang === 'de' ? 'Modell:' : 'Model:'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTimelineRegressionIndex((prev) => Math.max(0, prev - 1));
                      }}
                      disabled={timelineRegressionIndex <= 0}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                      title="-1"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={TIMELINE_REGRESSION_OPTIONS.length - 1}
                      step={1}
                      value={timelineRegressionIndex}
                      onChange={(e) => setTimelineRegressionIndex(Number(e.target.value))}
                      className="w-16 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 shrink-0"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTimelineRegressionIndex((prev) => Math.min(TIMELINE_REGRESSION_OPTIONS.length - 1, prev + 1));
                      }}
                      disabled={timelineRegressionIndex >= TIMELINE_REGRESSION_OPTIONS.length - 1}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                      title="+1"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    {/* Model Badge */}
                    <div className="w-[105px] sm:w-[125px] shrink-0 flex items-center">
                      <span
                        className="text-xs font-mono font-bold px-2 py-0.5 rounded text-white shadow-2xs flex items-center gap-1.5 truncate w-full hover:opacity-95 transition-opacity"
                        style={{ backgroundColor: activeTimelineRegression.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                        <span className="truncate">
                          {lang === 'de' ? activeTimelineRegression.shortDe : activeTimelineRegression.shortEn}
                        </span>
                      </span>
                    </div>
                  </div>
                </Tooltip>

                {/* Contextual Param Input */}
                <div
                  className={`w-[130px] sm:w-[140px] flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0 ${
                    activeTimelineRegression.id !== 'polynomial' && activeTimelineRegression.id !== 'loess'
                      ? 'opacity-40 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                    Param:
                  </span>
                  {activeTimelineRegression.id === 'polynomial' ? (
                    <div className="w-[72px] sm:w-[76px] h-6 flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 shadow-2xs">
                      <input
                        type="number"
                        min={2}
                        max={4}
                        step={1}
                        value={timelinePolyDegree}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setTimelinePolyDegree(Math.min(4, Math.max(2, val)));
                        }}
                        className="w-full bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right pr-1"
                      />
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500 select-none">
                        deg
                      </span>
                    </div>
                  ) : activeTimelineRegression.id === 'loess' ? (
                    <div className="w-[72px] sm:w-[76px] h-6 flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 shadow-2xs">
                      <input
                        type="number"
                        min={10}
                        max={100}
                        step={5}
                        value={timelineLoessSpan}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setTimelineLoessSpan(Math.min(100, Math.max(10, val)));
                        }}
                        className="w-full bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right pr-1"
                      />
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500 select-none">
                        %
                      </span>
                    </div>
                  ) : (
                    <div className="w-[72px] sm:w-[76px] h-6 flex items-center justify-center font-mono text-xs text-slate-400 dark:text-slate-500 bg-slate-100/60 dark:bg-slate-800/40 rounded border border-transparent select-none">
                      —
                    </div>
                  )}
                </div>

                {/* Multi-Level Model Switch */}
                <Tooltip
                  title={lang === 'de' ? 'Multi-Level-Modell' : 'Multi-level model'}
                  badge={
                    !isTimelineMultiLevelFeasible
                      ? lang === 'de'
                        ? 'Nicht verfügbar'
                        : 'Unavailable'
                      : isTimelineMultiLevelActive
                      ? lang === 'de'
                        ? 'Aktiv'
                        : 'Active'
                      : lang === 'de'
                      ? 'Aus'
                      : 'Off'
                  }
                  position="bottom"
                  align="right"
                  width="w-72"
                  content={
                    isTimelineMultiLevelFeasible
                      ? lang === 'de'
                        ? 'Schätzt eine hierarchische Multi-Level-Regression (Partial Pooling) mit eigener Trendkurve pro KI-Labor.'
                        : 'Fits a hierarchical multi-level regression (partial pooling) with separate trajectory curves per LLM lab company.'
                      : lang === 'de'
                      ? 'Multi-Level-Regression ist für Linear, Exponential, Power und Polynom verfügbar – nicht für LOESS oder Pioniere.'
                      : 'Multi-level regression is available for Linear, Exponential, Power, and Polynomial models — not feasible for LOESS or Pioneers.'
                  }
                >
                  <button
                    type="button"
                    disabled={!isTimelineMultiLevelFeasible}
                    onClick={() => isTimelineMultiLevelFeasible && setTimelineMultiLevel((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all shrink-0 ${
                      !isTimelineMultiLevelFeasible
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                        : isTimelineMultiLevelActive
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xs ring-2 ring-indigo-500/20 cursor-pointer'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>Multi-level</span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        !isTimelineMultiLevelFeasible
                          ? 'bg-slate-400'
                          : isTimelineMultiLevelActive
                          ? 'bg-emerald-300'
                          : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  </button>
                </Tooltip>
              </div>
            )}

            {/* Correlations View Header Controls: Scope toggle, Regression slider & badges, and Contextual param input */}
            {activeTab === 'benchmark' && benchmarkView === 'correlations' && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Scope Segmented Control */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCorrelationsScope('all')}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      correlationsScope === 'all'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'de' ? 'Alle Modelle' : 'All Models'} ({fullTimelineModels.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCorrelationsScope('frontier')}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      correlationsScope === 'frontier'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
                    }`}
                    title={
                      lang === 'de'
                        ? 'Nur Pionier-Modelle (historische Rekordhalter / Pareto-Front)'
                        : 'Only pioneer models (historical record breakers / Pareto frontier)'
                    }
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{lang === 'de' ? 'Pioniere' : 'Pioneers'}</span>
                    <span className="text-xs opacity-90">({correlationsFrontierCount})</span>
                  </button>
                </div>

                {/* Regression Model Controller wrapped in Tooltip */}
                <Tooltip
                  title={lang === 'de' ? activeCorrelationsRegression.labelDe : activeCorrelationsRegression.labelEn}
                  badge={lang === 'de' ? 'Modell' : 'Model'}
                  position="bottom"
                  align="center"
                  width="w-96"
                  content={
                    <div className="space-y-2">
                      <p className="leading-relaxed text-slate-200">
                        {lang === 'de' ? activeCorrelationsRegression.descDe : activeCorrelationsRegression.descEn}
                      </p>
                      {activeCorrelationsRegression.id === 'polynomial' && (
                        <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-[11px] text-amber-300">
                          <span className="text-slate-400">{lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}</span>
                          <span className="font-bold">
                            {lang === 'de'
                              ? `Grad ${correlationsPolyDegree} (${correlationsPolyDegree === 2 ? 'Parabel' : correlationsPolyDegree === 3 ? 'Wendepunkt' : 'Höhere Ordnung'})`
                              : `Degree ${correlationsPolyDegree} (${correlationsPolyDegree === 2 ? 'Parabola' : correlationsPolyDegree === 3 ? 'Inflection' : 'Higher order'})`}
                          </span>
                        </div>
                      )}
                      {activeCorrelationsRegression.id === 'loess' && (
                        <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between font-mono text-[11px] text-amber-300">
                          <span className="text-slate-400">{lang === 'de' ? 'Aktiver Parameter:' : 'Active parameter:'}</span>
                          <span className="font-bold">
                            {lang === 'de' ? `Span = ${correlationsLoessSpan}% (Fensterbreite)` : `Span = ${correlationsLoessSpan}% (Window width)`}
                          </span>
                        </div>
                      )}
                      {activeCorrelationsRegression.id !== 'frontier' && (
                        <div className="pt-1.5 border-t border-slate-700/60 text-[11px] text-slate-300 leading-snug">
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span>{lang === 'de' ? '95%-Konfidenzband' : '95% Confidence Band'}</span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 leading-normal">
                            {lang === 'de'
                              ? 'Das schattierte Band zeigt den statistischen Unsicherheitsbereich der Schätzung: Bei dichter Datenlage ist es schmal, bei wenigen oder streuenden Punkten weitet es sich.'
                              : 'The shaded ribbon reflects estimation uncertainty: narrow where data is abundant, wider where observations are scarce or dispersed.'}
                          </p>
                        </div>
                      )}
                    </div>
                  }
                >
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0 cursor-pointer">
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                      <span>{lang === 'de' ? 'Modell:' : 'Model:'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCorrelationsRegressionIndex((prev) => Math.max(0, prev - 1));
                      }}
                      disabled={correlationsRegressionIndex <= 0}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                      title="-1"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={CORRELATION_REGRESSION_OPTIONS.length - 1}
                      step={1}
                      value={correlationsRegressionIndex}
                      onChange={(e) => setCorrelationsRegressionIndex(Number(e.target.value))}
                      className="w-16 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500 shrink-0"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCorrelationsRegressionIndex((prev) => Math.min(CORRELATION_REGRESSION_OPTIONS.length - 1, prev + 1));
                      }}
                      disabled={correlationsRegressionIndex >= CORRELATION_REGRESSION_OPTIONS.length - 1}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
                      title="+1"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    {/* Model Badge */}
                    <div className="w-[105px] sm:w-[125px] shrink-0 flex items-center">
                      <span
                        className="text-xs font-mono font-bold px-2 py-0.5 rounded text-white shadow-2xs flex items-center gap-1.5 truncate w-full hover:opacity-95 transition-opacity"
                        style={{ backgroundColor: activeCorrelationsRegression.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                        <span className="truncate">
                          {lang === 'de' ? activeCorrelationsRegression.shortDe : activeCorrelationsRegression.shortEn}
                        </span>
                      </span>
                    </div>
                  </div>
                </Tooltip>

                {/* Contextual Param Input */}
                <div
                  className={`w-[130px] sm:w-[140px] flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 shrink-0 ${
                    activeCorrelationsRegression.id !== 'polynomial' && activeCorrelationsRegression.id !== 'loess'
                      ? 'opacity-40 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                    Param:
                  </span>
                  {activeCorrelationsRegression.id === 'polynomial' ? (
                    <div className="w-[72px] sm:w-[76px] h-6 flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 shadow-2xs">
                      <input
                        type="number"
                        min={2}
                        max={4}
                        step={1}
                        value={correlationsPolyDegree}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setCorrelationsPolyDegree(Math.min(4, Math.max(2, val)));
                        }}
                        className="w-full bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right pr-1"
                      />
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500 select-none">
                        deg
                      </span>
                    </div>
                  ) : activeCorrelationsRegression.id === 'loess' ? (
                    <div className="w-[72px] sm:w-[76px] h-6 flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 shadow-2xs">
                      <input
                        type="number"
                        min={10}
                        max={100}
                        step={5}
                        value={correlationsLoessSpan}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setCorrelationsLoessSpan(Math.min(100, Math.max(10, val)));
                        }}
                        className="w-full bg-transparent font-mono text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden text-right pr-1"
                      />
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500 select-none">
                        %
                      </span>
                    </div>
                  ) : (
                    <div className="w-[72px] sm:w-[76px] h-6 flex items-center justify-center font-mono text-xs text-slate-400 dark:text-slate-500 bg-slate-100/60 dark:bg-slate-800/40 rounded border border-transparent select-none">
                      —
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ecosystem / Lab Matrix View Header Controls: original sheet pill -> glossary pill -> lab category pills -> advanced toggle */}
            {activeTab === 'labs' && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* 1. Original Sheet Pill */}
                <a
                  href="https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/edit?gid=355721692#gid=355721692"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shrink-0"
                  title={lang === 'de' ? 'Original-Tabelle in neuem Tab öffnen' : 'Open original spreadsheet in new tab'}
                >
                  <span>{lang === 'de' ? 'Original-Sheet' : 'Original Sheet'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* 2. Lab Category Pills */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs shrink-0 max-w-full overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setLabActiveGroup('all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                      labActiveGroup === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {lang === 'de' ? `Alle (${labCounts.all})` : `All (${labCounts.all})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabActiveGroup('top10')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                      labActiveGroup === 'top10'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {lang === 'de' ? `Top LLM (${labCounts.top10})` : `Top LLM (${labCounts.top10})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabActiveGroup('contender')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                      labActiveGroup === 'contender'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {lang === 'de' ? `Herausforderer (${labCounts.contender})` : `Contenders (${labCounts.contender})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabActiveGroup('tweakers')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                      labActiveGroup === 'tweakers'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {lang === 'de' ? `Tweakers (${labCounts.tweakers})` : `Tweakers (${labCounts.tweakers})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabActiveGroup('small')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                      labActiveGroup === 'small'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {lang === 'de' ? `Spezialisiert (${labCounts.small})` : `Specialized (${labCounts.small})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabActiveGroup('harness')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                      labActiveGroup === 'harness'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {lang === 'de' ? `Scaffolding (${labCounts.harness})` : `Scaffolding (${labCounts.harness})`}
                  </button>
                </div>

                {/* 4. Advanced Toggle */}
                <button
                  type="button"
                  onClick={() => setShowLabAdvanced((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border cursor-pointer shrink-0 ${
                    showLabAdvanced
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                      : 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs'
                  }`}
                >
                  <SlidersHorizontal className={`w-3.5 h-3.5 ${showLabAdvanced ? 'text-white' : 'text-blue-500'}`} />
                  <span>{lang === 'de' ? 'Erweitert' : 'Advanced'}</span>
                  <span className={`text-xs ml-0.5 ${showLabAdvanced ? 'text-blue-200' : 'text-slate-400'}`}>
                    {showLabAdvanced ? '▲' : '▼'}
                  </span>
                </button>
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
              timelineScope={timelineScope}
              onTimelineScopeChange={setTimelineScope}
              regressionIndex={timelineRegressionIndex}
              onRegressionIndexChange={setTimelineRegressionIndex}
              polyDegree={timelinePolyDegree}
              onPolyDegreeChange={setTimelinePolyDegree}
              loessSpan={timelineLoessSpan}
              onLoessSpanChange={setTimelineLoessSpan}
              multiLevelEnabled={timelineMultiLevel}
              onMultiLevelEnabledChange={setTimelineMultiLevel}
              selectedLabLevels={timelineSelectedLabLevels}
              onSelectedLabLevelsChange={setTimelineSelectedLabLevels}
              hideHeaderControls={true}
              row33Meta={loadedData.headerMeta?.row33}
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
              scope={correlationsScope}
              onScopeChange={setCorrelationsScope}
              regressionIndex={correlationsRegressionIndex}
              onRegressionIndexChange={setCorrelationsRegressionIndex}
              polyDegree={correlationsPolyDegree}
              onPolyDegreeChange={setCorrelationsPolyDegree}
              loessSpan={correlationsLoessSpan}
              onLoessSpanChange={setCorrelationsLoessSpan}
              hideHeaderControls={true}
            />

            {/* Notes Section under Correlations */}
            <div className="w-full pt-1 pb-4">
              <CsvNotesSection appLang={lang} notesMeta={loadedData.notesMeta} />
            </div>
          </main>
        ) : (
          <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-5 py-2.5 sm:py-3 flex flex-col space-y-2.5">
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
              maxAvailableModels={maxAvailableModels}
              matchCount={matchCount}
              totalCount={currentModels.length}
              lang={lang}
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
              explosionMode={explosionMode}
              onExplosionModeChange={handleExplosionModeChange}
              selectedCompany={selectedCompany}
              onSelectCompany={setSelectedCompany}
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
                onSelectCompany={handleSelectCompany}
                lang={lang}
                showAdvanced={showAdvanced}
                onToggleAdvanced={() => setShowAdvanced((prev) => !prev)}
                priceFilter={priceFilter}
                onPriceFilterChange={setPriceFilter}
                categoryNames={loadedData.headerMeta?.categoryNames}
                onScrollToParagraph={scrollToParagraph}
              />
            </div>

            {/* Textfeld-Bereich unter dem Balkendiagramm: CSV-Zellen B34/C34 & N34/O34 */}
            <div className="w-full pt-0 pb-2">
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
            activeGroup={labActiveGroup}
            onActiveGroupChange={setLabActiveGroup}
            showAdvanced={showLabAdvanced}
            onToggleAdvanced={() => setShowLabAdvanced((prev) => !prev)}
            hideHeaderControls={true}
          />
        </main>
      )}


    </div>
  );
}
