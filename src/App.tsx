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
import { BENCHMARK_COMPONENTS } from './data/benchmarks';
import { ExplodedBarChart } from './components/ExplodedBarChart';
import { SearchBar } from './components/SearchBar';
import { CsvNotesSection } from './components/CsvNotesSection';
import { LabMatrixView } from './components/LabMatrixView';
import { TimelineScatterplot } from './components/TimelineScatterplot';
import { CorrelationsScatterplot } from './components/CorrelationsScatterplot';
import { Language, TRANSLATIONS } from './utils/i18n';
import { matchesSearchQuery } from './utils/searchUtils';
import { RefreshCw, Github, FileSpreadsheet, BarChart2, Info, Building2, SlidersHorizontal, TrendingUp, GitCompare, Sun, Moon, MapPin, BookOpen } from 'lucide-react';
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

  // Schalter: 'current' (nur noch verfügbare Chatbots) vs 'all' (alle Chatbots der CSV)
  const [modelScope, setModelScope] = useState<ModelScope>('all');

  // Preis-Filter: 'all' (Standard), 'free', 'paid'
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');

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
          {/* Title & Subtitle directly from CSV cells with Pop-Up on hover */}
          <div
            className="relative min-w-0 flex-1 group"
            onMouseEnter={() => setShowHeaderInfo(true)}
            onMouseLeave={() => setShowHeaderInfo(false)}
          >
            <div className="cursor-help inline-block max-w-full">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                <span>{lang === 'de' ? t.title : (loadedData.headerMeta?.combinedTitle || t.title)}</span>
                <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0 opacity-70 group-hover:opacity-100 transition-all" />
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal font-sans line-clamp-2 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-300">
                {lang === 'de' ? t.subtitle : (loadedData.headerMeta?.subtitle || t.subtitle)}
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
            {/* Synchronisieren-Button mit einheitlichem Tooltip */}
            <Tooltip
              title="Google Sheets Sync"
              badge={isSyncing ? t.syncingText : (loadedData.isLive ? 'Live' : 'Fallback')}
              content={
                <div className="flex flex-col gap-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400 font-medium">{t.lastSync}:</span>
                    <span className="font-mono text-emerald-400 font-bold">{formatSyncDate(lastSyncedAt)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 border-t border-slate-700/60 pt-1 leading-normal">
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
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
                <span>{t.sync}</span>
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
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
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
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
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
                  className={`p-1 sm:px-1.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
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
                  className={`p-1 sm:px-1.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
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
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
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
                  className={`p-1 py-0.5 rounded text-[11px] transition-all cursor-pointer flex items-center justify-center ${
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
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono whitespace-nowrap">
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
                <Tooltip
                  title={t.advanced}
                  align="left"
                  width="w-60"
                  content={t.advancedDesc}
                >
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border shrink-0 ${
                      showAdvanced
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{t.advanced}</span>
                    <span className="text-[10px] opacity-80">{showAdvanced ? '▲' : '▼'}</span>
                  </button>
                </Tooltip>

                {/* Price Filter Switcher: Free(API|Chat)Paid|All */}
                <div
                  className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 font-mono text-[10px] sm:text-[11px] font-bold shrink-0"
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
                        className={`pl-1 font-bold text-[10px] sm:text-[11px] select-none cursor-pointer transition-colors ${
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
                            className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-blue-400 hover:text-blue-300 hover:underline pt-1.5 border-t border-slate-800/90 w-full cursor-pointer transition-colors"
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
                        API
                      </button>
                    </Tooltip>

                    <span className="text-slate-400 dark:text-slate-600 text-[10px] px-0.5 select-none">|</span>

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
                      className={`pr-1 font-bold text-[10px] sm:text-[11px] select-none ${
                        priceFilter === 'free_api' || priceFilter === 'free_chat'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      )
                    </span>
                  </div>

                  {/* Paid Chat */}
                  <Tooltip
                    title={<span className="text-amber-400">Paid Chat 💲</span>}
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
                      Paid 💲
                    </button>
                  </Tooltip>

                  <span className="text-slate-300 dark:text-slate-600 text-[10px] px-0.5 select-none">|</span>

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
              maxAvailableModels={maxAvailableModels}
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
              explosionMode={explosionMode}
              onExplosionModeChange={handleExplosionModeChange}
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
                onScrollToParagraph={scrollToParagraph}
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
