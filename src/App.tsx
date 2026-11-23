/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ScoreMode, ModelScope } from './types';
import { BENCHMARK_COMPONENTS, RETIRED_TIMELINE_BENCHMARKS } from './data/benchmarks';
import { DEFAULT_LAB_PLANS } from './data/pricingPlansFallback';
import {
  DEFAULT_TIMELINE_REGRESSION_INDEX,
  DEFAULT_CORRELATION_REGRESSION_INDEX,
} from './data/regressionOptions';
import { DEFAULT_TIMELINE_LAB_LEVELS } from './data/labLevels';
import { Language } from './utils/i18n';
import { ExplodedBarChart } from './components/ExplodedBarChart';
import { SearchBar } from './components/SearchBar';
import { WeightingPanel } from './components/WeightingPanel';
import { CsvNotesSection } from './components/CsvNotesSection';
import { AppHeader } from './components/AppHeader';
import { TabControlBar } from './components/TabControlBar';
import { AppFooter } from './components/AppFooter';
import type { LabGroup } from './components/LabMatrixView';
import { useAutoTheme } from './hooks/useAutoTheme';
import { useSheetSyncAndAuth } from './hooks/useSheetSyncAndAuth';
import { useBenchmarkFilters } from './hooks/useBenchmarkFilters';
import { useAllMonitors } from './hooks/useAllMonitors';

export type { ThemePreference, GeoCoords, AutoThemeResult } from './hooks/useAutoTheme';
export { getSolarDayNight, computeAutoTheme } from './hooks/useAutoTheme';

const LabMatrixView = lazy(() =>
  import('./components/LabMatrixView').then((m) => ({ default: m.LabMatrixView }))
);
const TimelineScatterplot = lazy(() =>
  import('./components/TimelineScatterplot').then((m) => ({ default: m.TimelineScatterplot }))
);
const CorrelationsScatterplot = lazy(() =>
  import('./components/CorrelationsScatterplot').then((m) => ({
    default: m.CorrelationsScatterplot,
  }))
);
const CompareView = lazy(() =>
  import('./components/CompareView').then((m) => ({ default: m.CompareView }))
);
const PricingMonitorModal = lazy(() =>
  import('./components/PricingMonitorModal').then((m) => ({ default: m.PricingMonitorModal }))
);

const LANGUAGE_STORAGE_KEY = 'science_iq_language';

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'de' || stored === 'en') {
      return stored;
    }
  } catch {
    // Ignore localStorage errors
  }

  if (typeof navigator !== 'undefined') {
    const browserLangs =
      Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages
        : navigator.language
        ? [navigator.language]
        : [];

    for (const candidate of browserLangs) {
      const normalized = (candidate || '').trim().toLowerCase();
      if (normalized === 'de' || normalized.startsWith('de-')) return 'de';
      if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
    }
  }

  return 'en';
}

const OnTabReadyEffect: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
};

export default function App() {
  const [lang, setLang] = useState<Language>(getInitialLanguage);
  const handleSelectLanguage = useCallback((nextLang: Language) => {
    setLang(nextLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const theme = useAutoTheme(lang);

  // Tab & view navigation state
  const tabBarAnchorRef = useRef<HTMLDivElement | null>(null);
  const pendingTabAnchorScrollRef = useRef<boolean>(false);
  const [activeTab, setActiveTab] = useState<'benchmark' | 'labs'>('benchmark');
  const [benchmarkView, setBenchmarkView] = useState<
    'barchart' | 'timeline' | 'correlations' | 'compare'
  >('barchart');
  const [compareScope, setCompareScope] = useState<ModelScope>('current');

  const scrollToTabBarAnchor = useCallback(() => {
    const getAnchorTop = () => {
      const anchor = tabBarAnchorRef.current;
      return anchor
        ? Math.max(0, Math.round(anchor.getBoundingClientRect().top + window.scrollY))
        : 0;
    };

    const initialAnchorTop = getAnchorTop();
    if (window.scrollY > initialAnchorTop + 4) {
      pendingTabAnchorScrollRef.current = true;
      window.scrollTo({ top: initialAnchorTop, behavior: 'auto' });
      requestAnimationFrame(() => {
        const nextAnchorTop = getAnchorTop();
        if (window.scrollY > nextAnchorTop + 4 || pendingTabAnchorScrollRef.current) {
          window.scrollTo({ top: nextAnchorTop, behavior: 'auto' });
        }
      });
    } else {
      pendingTabAnchorScrollRef.current = false;
    }
  }, []);

  const flushPendingTabAnchorScroll = useCallback(() => {
    if (!pendingTabAnchorScrollRef.current) return;
    pendingTabAnchorScrollRef.current = false;
    const anchor = tabBarAnchorRef.current;
    if (!anchor) return;
    const anchorTop = Math.max(
      0,
      Math.round(anchor.getBoundingClientRect().top + window.scrollY)
    );
    requestAnimationFrame(() => {
      window.scrollTo({ top: anchorTop, behavior: 'auto' });
    });
  }, []);

  // Timeline view state
  const [timelineScoreMode, setTimelineScoreMode] = useState<ScoreMode>('old');
  const [timelineCategoryIndex, setTimelineCategoryIndex] = useState<number>(0);
  const [timelineScope, setTimelineScope] = useState<'all' | 'frontier'>('all');
  const [timelineRegressionIndex, setTimelineRegressionIndex] = useState<number>(
    DEFAULT_TIMELINE_REGRESSION_INDEX
  );
  const [timelinePolyDegree, setTimelinePolyDegree] = useState<number>(2);
  const [timelineLoessSpan, setTimelineLoessSpan] = useState<number>(50);
  const [timelineMultiLevel, setTimelineMultiLevel] = useState<boolean>(false);
  const [timelineSelectedLabLevels, setTimelineSelectedLabLevels] = useState<string[]>(
    DEFAULT_TIMELINE_LAB_LEVELS
  );

  // Correlations view state
  const [correlationsScope, setCorrelationsScope] = useState<'all' | 'frontier'>('all');
  const [correlationsRegressionIndex, setCorrelationsRegressionIndex] = useState<number>(
    DEFAULT_CORRELATION_REGRESSION_INDEX
  );
  const [correlationsPolyDegree, setCorrelationsPolyDegree] = useState<number>(2);
  const [correlationsLoessSpan, setCorrelationsLoessSpan] = useState<number>(50);

  // Ecosystem / Lab matrix view state
  const [labActiveGroup, setLabActiveGroup] = useState<LabGroup>('top10');
  const [showLabAdvanced, setShowLabAdvanced] = useState<boolean>(false);

  // Checker modal visibility
  const [isPricingModalOpen, setIsPricingModalOpen] = useState<boolean>(false);

  // Live Google Sheets sync, fallback snapshot & OAuth
  const onSignedOutRef = useRef<() => void>(() => {});
  const handleSignedOutCallback = useCallback(() => {
    onSignedOutRef.current();
  }, []);

  const syncAuth = useSheetSyncAndAuth(handleSignedOutCallback);

  // When custom benchmark weights are modified or applied, ensure Timeline also switches
  // from historical 'old' mode to 'new' so custom weights apply across every tab.
  const handleWeightsActivated = useCallback(() => {
    setTimelineScoreMode('new');
    setTimelineCategoryIndex(0);
  }, []);

  const filters = useBenchmarkFilters(syncAuth.loadedData, handleWeightsActivated);

  const monitors = useAllMonitors({
    loadedData: syncAuth.loadedData,
    oauthAccessToken: syncAuth.oauthAccessToken,
    isSheetsConnected: syncAuth.isSheetsConnected,
    isModalOpen: isPricingModalOpen,
  });
  onSignedOutRef.current = monitors.resetMonitorAuthState;

  const labCounts = useMemo(
    () => ({
      all: syncAuth.labs.length,
      top10: syncAuth.labs.filter((l) => l.group === 'top10').length,
      contender: syncAuth.labs.filter((l) => l.group === 'contender').length,
      tweakers: syncAuth.labs.filter((l) => l.group === 'tweakers').length,
      small: syncAuth.labs.filter((l) => l.group === 'small').length,
      harness: syncAuth.labs.filter((l) => l.group === 'harness').length,
    }),
    [syncAuth.labs]
  );

  const handleSelectLabFromMatrix = useCallback(
    (creatorName: string) => {
      filters.setSearchFilter(creatorName);
      filters.setSelectedFamilies([]);
      filters.setPriceFilter('all');
      setActiveTab('benchmark');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [filters]
  );

  const navigateToGlossaryTerm = useCallback((termId: string = 'term-api') => {
    setActiveTab('labs');
    const tryHighlight = (attemptsLeft: number) => {
      const el = document.getElementById(termId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add(
          'ring-4',
          'ring-blue-500',
          'ring-offset-2',
          'dark:ring-offset-slate-900',
          'transition-all'
        );
        setTimeout(() => {
          el.classList.remove(
            'ring-4',
            'ring-blue-500',
            'ring-offset-2',
            'dark:ring-offset-slate-900'
          );
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

  const scrollToParagraph = useCallback((targetId: string) => {
    const container = document.getElementById('csv-notes-section');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const doScrollToTarget = () => {
      const el =
        document.getElementById(targetId) ||
        document.getElementById('note-col-simplebench') ||
        document.getElementById('note-col-k') ||
        document.getElementById('final-scores-section');
      const box = document.getElementById('section1-scroll-box');
      if (el) {
        if (box) {
          const targetTop = el.offsetTop - box.offsetTop;
          box.scrollTo({ top: Math.max(0, targetTop - 12), behavior: 'smooth' });
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add(
          'ring-2',
          'ring-emerald-500',
          'bg-emerald-500/15',
          'rounded-lg',
          'transition-all'
        );
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-500/15');
        }, 3000);
      }
    };

    setTimeout(doScrollToTarget, 200);
    setTimeout(doScrollToTarget, 500);
  }, []);

  const scrollToFinalScores = useCallback(() => {
    scrollToParagraph('final-scores-section');
  }, [scrollToParagraph]);

  const scrollToGlossary = useCallback(() => {
    setActiveTab('labs');
    setTimeout(() => {
      const el = document.getElementById('glossary-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add(
          'ring-2',
          'ring-blue-500',
          'ring-offset-4',
          'dark:ring-offset-slate-950',
          'transition-all'
        );
        setTimeout(() => {
          el.classList.remove(
            'ring-2',
            'ring-blue-500',
            'ring-offset-4',
            'dark:ring-offset-slate-950'
          );
        }, 2500);
      }
    }, 80);
  }, []);

  const handleResetToDefaults = useCallback(
    (e?: React.MouseEvent) => {
      if (e && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
        e.preventDefault();
      }
      filters.resetBenchmarkFilters();
      setTimelineScoreMode('old');
      setTimelineCategoryIndex(0);
      setActiveTab('benchmark');
      setBenchmarkView('barchart');
      setCompareScope('current');
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [filters]
  );

  const resolvedCategoryNames =
    lang === 'de'
      ? syncAuth.loadedData.headerMeta?.categoryNamesDe ||
        syncAuth.loadedData.headerMeta?.categoryNames
      : syncAuth.loadedData.headerMeta?.categoryNames;
  const isPreTranslatedCategoryNames = Boolean(
    lang === 'de' && syncAuth.loadedData.headerMeta?.categoryNamesDe?.length === 8
  );
  const resolvedCompositeScoreNames =
    lang === 'de'
      ? syncAuth.loadedData.headerMeta?.compositeScoreNamesDe ||
        syncAuth.loadedData.headerMeta?.compositeScoreNames
      : syncAuth.loadedData.headerMeta?.compositeScoreNames;
  const isPreTranslatedCompositeScoreNames = Boolean(
    lang === 'de' && syncAuth.loadedData.headerMeta?.compositeScoreNamesDe?.length === 3
  );
  const resolvedRetiredCategoryNames =
    lang === 'de'
      ? syncAuth.loadedData.headerMeta?.retiredCategoryNamesDe ||
        syncAuth.loadedData.headerMeta?.retiredCategoryNames
      : syncAuth.loadedData.headerMeta?.retiredCategoryNames;
  const isPreTranslatedRetiredCategoryNames = Boolean(
    lang === 'de' && syncAuth.loadedData.headerMeta?.retiredCategoryNamesDe?.length === 4
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased [overflow-anchor:none]">
      {/* Global Top Bar (Title, Global Weighting Toggle, Glossary, Language, Theme/GPS) */}
      <AppHeader
        lang={lang}
        headerMeta={syncAuth.loadedData.headerMeta}
        onResetToDefaults={handleResetToDefaults}
        showWeighting={filters.showWeighting}
        onToggleWeighting={() => filters.setShowWeighting((prev) => !prev)}
        isCustomWeighted={filters.weightedDataset.isWeighted}
        onOpenGlossary={scrollToGlossary}
        onSelectLanguage={handleSelectLanguage}
        themePref={theme.themePref}
        effectiveTheme={theme.effectiveTheme}
        autoThemeInfo={theme.autoThemeInfo}
        geoCoords={theme.geoCoords}
        isLocating={theme.isLocating}
        locationStatus={theme.locationStatus}
        onSelectTheme={theme.handleSelectTheme}
        onRequestGeoLocation={theme.requestGeoLocation}
      />

      {/* Personalized Benchmark Weighting Panel (positioned globally above all tabs) */}
      {filters.showWeighting && (
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/90 px-3 sm:px-6 py-2.5">
          <div className="w-full max-w-[1720px] mx-auto">
            <WeightingPanel
              weights={filters.benchmarkWeights}
              onWeightChange={filters.handleBenchmarkWeightChange}
              onApplyWeights={filters.handleApplyBenchmarkWeights}
              onReset={filters.handleResetBenchmarkWeights}
              categoryNames={resolvedCategoryNames}
              isPreTranslatedCategoryNames={isPreTranslatedCategoryNames}
              lang={lang}
              onClose={() => filters.setShowWeighting(false)}
            />
          </div>
        </div>
      )}

      {/* Static scroll anchor placed immediately above the sticky TabControlBar */}
      <div id="tab-bar-anchor" ref={tabBarAnchorRef} className="h-0 w-full" aria-hidden="true" />

      {/* Primary Tab Switcher + Active View Toolbar Controls */}
      <TabControlBar
        lang={lang}
        activeTab={activeTab}
        benchmarkView={benchmarkView}
        onSelectBenchmarkView={(view) => {
          setActiveTab('benchmark');
          setBenchmarkView(view);
          scrollToTabBarAnchor();
        }}
        onSelectLabsTab={() => {
          setActiveTab('labs');
          scrollToTabBarAnchor();
        }}
        headerMeta={syncAuth.loadedData.headerMeta}
        onHoverCategory={filters.setCategoryInfoComp}
        onScrollToParagraph={scrollToParagraph}
        onNavigateToGlossaryTerm={navigateToGlossaryTerm}
        searchFilter={filters.searchFilter}
        onClearSearchFilter={() => filters.setSearchFilter('')}
        scoreMode={filters.scoreMode}
        onScoreModeChange={filters.setScoreMode}
        selectedCategoryIndex={filters.selectedCategoryIndex}
        onSelectCategoryIndex={filters.setSelectedCategoryIndex}
        priceFilter={filters.priceFilter}
        onPriceFilterChange={filters.setPriceFilter}
        showAdvanced={filters.showAdvanced}
        onToggleAdvanced={() => {
          const willOpen = !filters.showAdvanced;
          filters.setShowAdvanced(willOpen);
          if (willOpen) scrollToTabBarAnchor();
        }}
        timelineScoreMode={timelineScoreMode}
        onTimelineScoreModeChange={setTimelineScoreMode}
        timelineCategoryIndex={timelineCategoryIndex}
        onTimelineCategoryIndexChange={setTimelineCategoryIndex}
        timelineRegressionIndex={timelineRegressionIndex}
        onTimelineRegressionIndexChange={setTimelineRegressionIndex}
        timelinePolyDegree={timelinePolyDegree}
        onTimelinePolyDegreeChange={setTimelinePolyDegree}
        timelineLoessSpan={timelineLoessSpan}
        onTimelineLoessSpanChange={setTimelineLoessSpan}
        correlationsScope={correlationsScope}
        onCorrelationsScopeChange={setCorrelationsScope}
        fullTimelineModelCount={filters.fullTimelineModels.length}
        correlationsFrontierCount={filters.correlationsFrontierCount}
        correlationsRegressionIndex={correlationsRegressionIndex}
        onCorrelationsRegressionIndexChange={setCorrelationsRegressionIndex}
        correlationsPolyDegree={correlationsPolyDegree}
        onCorrelationsPolyDegreeChange={setCorrelationsPolyDegree}
        correlationsLoessSpan={correlationsLoessSpan}
        onCorrelationsLoessSpanChange={setCorrelationsLoessSpan}
        compareScope={compareScope}
        onCompareScopeChange={setCompareScope}
        availableModelCount={
          syncAuth.loadedData.allModels.filter((m) => m.isAvailable).length
        }
        totalModelCount={syncAuth.loadedData.allModels.length}
        labActiveGroup={labActiveGroup}
        onLabActiveGroupChange={(group) => {
          setLabActiveGroup(group);
          scrollToTabBarAnchor();
        }}
        labCounts={labCounts}
        showLabAdvanced={showLabAdvanced}
        onToggleLabAdvanced={() => {
          const willOpen = !showLabAdvanced;
          setShowLabAdvanced(willOpen);
          if (willOpen) scrollToTabBarAnchor();
        }}
      />

      {/* Main Content Area */}
      {activeTab === 'benchmark' ? (
        benchmarkView === 'timeline' ? (
          <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 py-4 flex flex-col space-y-4">
            <Suspense
              fallback={
                <div className="min-h-[80vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs font-mono text-slate-600 dark:text-slate-400">
                  {lang === 'de' ? 'Lade Verlaufsdiagramm…' : 'Loading timeline chart…'}
                </div>
              }
            >
              <OnTabReadyEffect onReady={flushPendingTabAnchorScroll} />
              <TimelineScatterplot
                models={filters.fullTimelineModels}
                allModels={filters.fullTimelineModels}
                scoreMode={timelineScoreMode}
                onScoreModeChange={setTimelineScoreMode}
                selectedCategoryIndex={timelineCategoryIndex}
                onCategoryIndexChange={(idx) => {
                  setTimelineCategoryIndex(idx);
                  if (idx > 8) {
                    filters.setCategoryInfoComp(RETIRED_TIMELINE_BENCHMARKS[idx - 9]);
                  } else if (idx > 0) {
                    filters.setCategoryInfoComp(BENCHMARK_COMPONENTS[idx - 1]);
                  } else {
                    filters.setCategoryInfoComp(null);
                  }
                }}
                categoryNames={resolvedCategoryNames}
                isPreTranslatedCategoryNames={isPreTranslatedCategoryNames}
                compositeScoreNames={resolvedCompositeScoreNames}
                isPreTranslatedCompositeScoreNames={isPreTranslatedCompositeScoreNames}
                retiredCategoryNames={resolvedRetiredCategoryNames}
                isPreTranslatedRetiredCategoryNames={isPreTranslatedRetiredCategoryNames}
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
                row33Meta={syncAuth.loadedData.headerMeta?.row33}
              />
            </Suspense>

            <div className="w-full pt-1 pb-4">
              <CsvNotesSection appLang={lang} notesMeta={syncAuth.loadedData.notesMeta} />
            </div>
          </main>
        ) : benchmarkView === 'correlations' ? (
          <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 py-4 flex flex-col space-y-4">
            <Suspense
              fallback={
                <div className="min-h-[80vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs font-mono text-slate-600 dark:text-slate-400">
                  {lang === 'de' ? 'Lade Korrelationsdiagramm…' : 'Loading correlation chart…'}
                </div>
              }
            >
              <OnTabReadyEffect onReady={flushPendingTabAnchorScroll} />
              <CorrelationsScatterplot
                models={filters.fullTimelineModels}
                allModels={filters.fullTimelineModels}
                onScrollToParagraph={scrollToParagraph}
                onScrollToFinalScores={scrollToFinalScores}
                lang={lang}
                categoryNames={resolvedCategoryNames}
                isPreTranslatedCategoryNames={isPreTranslatedCategoryNames}
                compositeScoreNames={resolvedCompositeScoreNames}
                isPreTranslatedCompositeScoreNames={isPreTranslatedCompositeScoreNames}
                retiredCategoryNames={resolvedRetiredCategoryNames}
                isPreTranslatedRetiredCategoryNames={isPreTranslatedRetiredCategoryNames}
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
            </Suspense>

            <div className="w-full pt-1 pb-4">
              <CsvNotesSection appLang={lang} notesMeta={syncAuth.loadedData.notesMeta} />
            </div>
          </main>
        ) : benchmarkView === 'compare' ? (
          <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 py-4 flex flex-col space-y-4">
            <Suspense
              fallback={
                <div className="min-h-[80vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs font-mono text-slate-600 dark:text-slate-400">
                  {lang === 'de' ? 'Lade Modellvergleich…' : 'Loading model comparison…'}
                </div>
              }
            >
              <OnTabReadyEffect onReady={flushPendingTabAnchorScroll} />
              <CompareView
                allModels={filters.weightedDataset.allModels}
                rankedModels={
                  filters.scoreMode === 'old'
                    ? syncAuth.loadedData.oldModels
                    : filters.scoreMode === 'worstCase'
                    ? syncAuth.loadedData.worstCaseModels
                    : filters.weightedDataset.newModels
                }
                labs={syncAuth.labs}
                scoreMode={filters.scoreMode}
                scope={compareScope}
                lang={lang}
                categoryNames={resolvedCategoryNames}
                isPreTranslatedCategoryNames={isPreTranslatedCategoryNames}
                compositeScoreNames={resolvedCompositeScoreNames}
                isPreTranslatedCompositeScoreNames={isPreTranslatedCompositeScoreNames}
                retiredCategoryNames={resolvedRetiredCategoryNames}
                isPreTranslatedRetiredCategoryNames={isPreTranslatedRetiredCategoryNames}
                row33Meta={syncAuth.loadedData.headerMeta?.row33}
                benchmarkWeights={filters.benchmarkWeights}
                isCustomWeighted={filters.weightedDataset.isWeighted}
                onScrollToParagraph={scrollToParagraph}
                onSelectCompany={(company) => {
                  filters.setSelectedCompany(company);
                  setActiveTab('benchmark');
                  setBenchmarkView('barchart');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </Suspense>

            <div className="w-full pt-1 pb-4">
              <CsvNotesSection appLang={lang} notesMeta={syncAuth.loadedData.notesMeta} />
            </div>
          </main>
        ) : (
          <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col space-y-2.5">
            <SearchBar
              value={filters.searchFilter}
              onChange={(val) => {
                filters.setSearchFilter(val);
                if (val.trim().length > 0) {
                  filters.setSelectedFamilies([]);
                }
              }}
              selectedFamilies={filters.selectedFamilies}
              onToggleFamily={filters.handleToggleFamily}
              onClearFamilies={filters.handleClearFamilies}
              topCount={filters.topCount}
              onTopCountChange={filters.setTopCount}
              maxAvailableModels={filters.maxAvailableModels}
              matchCount={filters.matchCount}
              totalCount={filters.currentModels.length}
              lang={lang}
              selectedCategoryIndex={filters.selectedCategoryIndex}
              onCategoryIndexChange={(idx) => {
                filters.setSelectedCategoryIndex(idx);
                if (idx > 0) {
                  filters.setCategoryInfoComp(BENCHMARK_COMPONENTS[idx - 1]);
                } else {
                  filters.setCategoryInfoComp(null);
                }
              }}
              onHoverCategory={filters.setCategoryInfoComp}
              scoreMode={filters.scoreMode}
              onScoreModeChange={filters.setScoreMode}
              onScrollToFinalScores={scrollToFinalScores}
              onScrollToParagraph={scrollToParagraph}
              modelScope={filters.effectiveModelScope}
              onModelScopeChange={filters.setModelScope}
              showAdvanced={filters.showAdvanced}
              categoryNames={syncAuth.loadedData.headerMeta?.categoryNames}
              explosionMode={filters.explosionMode}
              onExplosionModeChange={filters.handleExplosionModeChange}
              selectedCompany={filters.selectedCompany}
              onSelectCompany={filters.setSelectedCompany}
            />

            <div className="w-full">
              <ExplodedBarChart
                models={filters.displayedModels}
                activeBenchmarkId={null}
                activeCategoryIndex={filters.selectedCategoryIndex}
                hoveredCategoryComp={filters.categoryInfoComp}
                sortBy={filters.sortBy}
                scoreMode={filters.scoreMode}
                benchmarkWeights={filters.benchmarkWeights}
                isCustomWeighted={filters.weightedDataset.isWeighted}
                explosionMode={filters.explosionMode}
                onExplosionModeChange={filters.handleExplosionModeChange}
                searchFilter={filters.searchFilter}
                selectedFamilies={filters.selectedFamilies}
                selectedCompany={filters.selectedCompany}
                onSelectCompany={filters.handleSelectCompany}
                lang={lang}
                showAdvanced={filters.showAdvanced}
                onToggleAdvanced={() => filters.setShowAdvanced((prev) => !prev)}
                priceFilter={filters.priceFilter}
                onPriceFilterChange={filters.setPriceFilter}
                categoryNames={resolvedCategoryNames}
                isPreTranslatedCategoryNames={isPreTranslatedCategoryNames}
                onScrollToParagraph={scrollToParagraph}
              />
            </div>

            <div className="w-full pt-0 pb-2">
              <CsvNotesSection appLang={lang} notesMeta={syncAuth.loadedData.notesMeta} />
            </div>
          </main>
        )
      ) : (
        <main className="flex-1 w-full">
          <Suspense
            fallback={
              <div className="max-w-[1720px] mx-auto px-3 sm:px-6 py-4">
                <div className="min-h-[80vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs font-mono text-slate-600 dark:text-slate-400">
                  {lang === 'de' ? 'Lade Ökosystem-Ansicht…' : 'Loading ecosystem matrix…'}
                </div>
              </div>
            }
          >
            <OnTabReadyEffect onReady={flushPendingTabAnchorScroll} />
            <LabMatrixView
              labs={syncAuth.labs}
              models={filters.weightedDataset.newModels}
              allModels={filters.weightedDataset.allModels}
              pricingPlans={
                monitors.pricingReport?.labs?.length
                  ? monitors.pricingReport.labs
                  : DEFAULT_LAB_PLANS
              }
              onSelectLabForBenchmark={handleSelectLabFromMatrix}
              lang={lang}
              activeGroup={labActiveGroup}
              onActiveGroupChange={setLabActiveGroup}
              showAdvanced={showLabAdvanced}
              onToggleAdvanced={() => setShowLabAdvanced((prev) => !prev)}
              hideHeaderControls={true}
            />
          </Suspense>
        </main>
      )}

      {/* App Footer with Sync, Unified Checker, Cell O1 Attribution & Repo Links */}
      <AppFooter
        lang={lang}
        loadedData={syncAuth.loadedData}
        lastSyncedAt={syncAuth.lastSyncedAt}
        isSyncing={syncAuth.isSyncing}
        onSync={() => void syncAuth.refreshData(undefined, undefined, true)}
        activeSpreadsheetId={syncAuth.activeSpreadsheetId}
        onOpenCheckerModal={() => setIsPricingModalOpen(true)}
        totalAlerts={monitors.totalAlerts}
        isAnyMonitorChecking={monitors.isAnyMonitorChecking}
        allSyncedOk={monitors.allSyncedOk}
        pricingReport={monitors.pricingReport}
        isPricingDiffValidForSheet={monitors.isPricingDiffValidForSheet}
        gdpxReport={monitors.gdpxReport}
        isGdpxDiffValidForSheet={monitors.isGdpxDiffValidForSheet}
        valsReport={monitors.valsReport}
        isValsDiffValidForSheet={monitors.isValsDiffValidForSheet}
        simpleBenchReport={monitors.simpleBenchReport}
        isSimpleBenchDiffValidForSheet={monitors.isSimpleBenchDiffValidForSheet}
        integrityReport={monitors.integrityReport}
        isIntegrityDiffValidForSheet={monitors.isIntegrityDiffValidForSheet}
      />

      {/* Unified Plans, Pricing, GDPx, Vals, SimpleBench & Integrity Monitor Modal */}
      {isPricingModalOpen && (
        <Suspense fallback={null}>
          <PricingMonitorModal
            isOpen={isPricingModalOpen}
            onClose={() => setIsPricingModalOpen(false)}
            lang={lang}
            report={monitors.pricingReport}
            isDiffValid={monitors.isPricingDiffValidForSheet}
            isChecking={monitors.isCheckingPricing}
            checkError={monitors.pricingCheckError}
            onRunCheck={() => monitors.handleRunPricingCheck('manual')}
            gdpxReport={monitors.gdpxReport}
            isGdpxDiffValid={monitors.isGdpxDiffValidForSheet}
            isCheckingGdpx={monitors.isCheckingGdpx}
            gdpxCheckError={monitors.gdpxCheckError}
            onRunGdpxCheck={() => monitors.handleRunGdpxCheck('manual')}
            valsReport={monitors.valsReport}
            isValsDiffValid={monitors.isValsDiffValidForSheet}
            isCheckingVals={monitors.isCheckingVals}
            valsCheckError={monitors.valsCheckError}
            onRunValsCheck={() => monitors.handleRunValsCheck('manual')}
            simpleBenchReport={monitors.simpleBenchReport}
            isSimpleBenchDiffValid={monitors.isSimpleBenchDiffValidForSheet}
            isCheckingSimpleBench={monitors.isCheckingSimpleBench}
            simpleBenchCheckError={monitors.simpleBenchCheckError}
            onRunSimpleBenchCheck={() => monitors.handleRunSimpleBenchCheck('manual')}
            integrityReport={monitors.integrityReport}
            isIntegrityDiffValid={monitors.isIntegrityDiffValidForSheet}
            isCheckingIntegrity={monitors.isCheckingIntegrity}
            integrityCheckError={monitors.integrityCheckError}
            onRunIntegrityCheck={() => monitors.handleRunIntegrityCheck('manual')}
            onIgnoreGdpxModel={monitors.handleIgnoreGdpxModel}
            onRestoreGdpxModel={monitors.handleRestoreGdpxModel}
            onPersistGdpxMapping={monitors.handlePersistGdpxMapping}
            onRemoveGdpxMapping={monitors.handleRemoveGdpxMapping}
            onIgnoreValsModel={monitors.handleIgnoreValsModel}
            onRestoreValsModel={monitors.handleRestoreValsModel}
            onPersistValsMapping={monitors.handlePersistValsMapping}
            onRemoveValsMapping={monitors.handleRemoveValsMapping}
            onIgnoreSimpleBenchModel={monitors.handleIgnoreSimpleBenchModel}
            onRestoreSimpleBenchModel={monitors.handleRestoreSimpleBenchModel}
            onPersistSimpleBenchMapping={monitors.handlePersistSimpleBenchMapping}
            onRemoveSimpleBenchMapping={monitors.handleRemoveSimpleBenchMapping}
            onIgnoreIntegrityModel={monitors.handleIgnoreIntegrityModel}
            onRestoreIntegrityModel={monitors.handleRestoreIntegrityModel}
            onPersistIntegrityMapping={monitors.handlePersistIntegrityMapping}
            onRemoveIntegrityMapping={monitors.handleRemoveIntegrityMapping}
            onSaveManualMappings={monitors.handleSaveManualMappings}
            dailyAutoEnabled={monitors.dailyAutoCheckEnabled}
            onToggleDailyAuto={monitors.handleToggleDailyAutoCheck}
            loadedData={syncAuth.loadedData}
            accessToken={syncAuth.oauthAccessToken}
            authUser={syncAuth.authUser}
            isSigningIn={syncAuth.isSigningIn}
            onSignIn={syncAuth.handleGoogleSignIn}
            onSignOut={syncAuth.handleGoogleSignOut}
            activeSpreadsheetId={syncAuth.activeSpreadsheetId}
            onRefreshFromSheets={(sheetIdOverride) =>
              syncAuth.refreshData(syncAuth.oauthAccessToken, sheetIdOverride)
            }
            isSheetsConnected={syncAuth.isSheetsConnected}
            apiAvailable={monitors.apiAvailable}
            onRetryConnection={monitors.retryAllConnections}
          />
        </Suspense>
      )}
    </div>
  );
}
