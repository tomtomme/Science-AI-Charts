import React, { useState, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
import { LabEntry, ModelRecord } from '../types';
import { LabPlanInfo } from '../types/pricingMonitor';
import { DEFAULT_LAB_PLANS } from '../data/pricingPlansFallback';
import { Search, ExternalLink, Cpu, Layers, HelpCircle, BookOpen, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import { Tooltip } from './Tooltip';
import {
  WEIGHTS_CONCEPTS,
  GlossaryCategory,
  GlossaryTermDef,
  GLOSSARY_TERMS,
  SizeCategoryDef,
  SIZE_CATEGORIES,
  GranularSizeDef,
  GRANULAR_SLIDER_STEPS,
  GRANULAR_SLIDER_KEYS,
  getSizeFilterTiers,
} from '../data/labMatrixData';
import {
  hasExactEnSubscriptionTiersTranslation,
  looksGermanSubscriptionTiers,
  normalizePricingLabKey,
} from '../utils/labMatrixPricing';
import { fetchLabTiersEnTranslations } from '../services/translationService';
import { LabMatrixCard } from './labs/LabMatrixCard';
import { LabWeightsAndGlossary } from './labs/LabWeightsAndGlossary';
import { CountryFlag } from './labs/CountryFlag';

export {
  WEIGHTS_CONCEPTS,
  GLOSSARY_TERMS,
  SIZE_CATEGORIES,
  GRANULAR_SLIDER_STEPS,
  GRANULAR_SLIDER_KEYS,
  getSizeFilterTiers,
};
export type { GlossaryCategory, GlossaryTermDef, SizeCategoryDef, GranularSizeDef };

export type LabGroup = 'all' | 'top10' | 'contender' | 'tweakers' | 'small' | 'harness';

export interface LabMatrixViewProps {
  labs: LabEntry[];
  models?: ModelRecord[];
  allModels?: ModelRecord[];
  pricingPlans?: LabPlanInfo[];
  onSelectLabForBenchmark?: (creatorName: string) => void;
  lang?: 'de' | 'en';
  activeGroup?: LabGroup;
  onActiveGroupChange?: (group: LabGroup) => void;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  hideHeaderControls?: boolean;
}

type WeightsFilter = 'all' | 'open' | 'hybrid' | 'closed';

export const LabMatrixView: React.FC<LabMatrixViewProps> = React.memo(({
  labs,
  models,
  allModels,
  pricingPlans = DEFAULT_LAB_PLANS,
  onSelectLabForBenchmark,
  lang = 'de',
  activeGroup: controlledActiveGroup,
  onActiveGroupChange,
  showAdvanced: controlledShowAdvanced,
  onToggleAdvanced,
  hideHeaderControls = false,
}) => {
  // Default to 'top10' (Top LLM Labs) as requested
  const [internalActiveGroup, setInternalActiveGroup] = useState<LabGroup>('top10');
  const [weightsFilter, setWeightsFilter] = useState<WeightsFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [simplifiedSizeView, setSimplifiedSizeView] = useState<boolean>(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [internalShowAdvanced, setInternalShowAdvanced] = useState<boolean>(false);
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null);
  const [glossaryCategory, setGlossaryCategory] = useState<GlossaryCategory | 'all'>('all');
  const [glossarySearch, setGlossarySearch] = useState<string>('');
  const [dynamicLabTiersEn, setDynamicLabTiersEn] = useState<Record<string, string>>({});

  useEffect(() => {
    if (lang !== 'en') return;
    const entriesToTranslate: Record<string, string> = {};
    for (const lab of labs) {
      const tiers = (lab.subscriptionTiers || '').trim();
      if (
        tiers &&
        !hasExactEnSubscriptionTiersTranslation(tiers) &&
        looksGermanSubscriptionTiers(tiers)
      ) {
        entriesToTranslate[lab.id] = tiers;
      }
    }
    if (Object.keys(entriesToTranslate).length === 0) return;

    let cancelled = false;
    void fetchLabTiersEnTranslations(entriesToTranslate).then((translations) => {
      if (!cancelled && translations) {
        setDynamicLabTiersEn(translations);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lang, labs]);

  const activeGroup = controlledActiveGroup ?? internalActiveGroup;
  const showAdvanced = controlledShowAdvanced ?? internalShowAdvanced;
  const toggleAdvanced = onToggleAdvanced ?? (() => setInternalShowAdvanced((prev) => !prev));

  const isSimplifiedView = sizeFilter !== 'all' && simplifiedSizeView;

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (weightsFilter !== 'all') count++;
    if (selectedCountry !== 'all') count++;
    if (searchQuery.trim() !== '') count++;
    if (sizeFilter !== 'all') count++;
    return count;
  }, [weightsFilter, selectedCountry, searchQuery, sizeFilter]);

  // Group counts
  const allCount = labs.length;
  const top10Count = labs.filter((l) => l.group === 'top10').length;
  const contenderCount = labs.filter((l) => l.group === 'contender').length;
  const tweakersCount = labs.filter((l) => l.group === 'tweakers').length;
  const smallCount = labs.filter((l) => l.group === 'small').length;
  const harnessCount = labs.filter((l) => l.group === 'harness').length;

  const handleGroupChange = (group: LabGroup) => {
    if (onActiveGroupChange) {
      onActiveGroupChange(group);
    } else {
      setInternalActiveGroup(group);
    }
    if (selectedCountry !== 'all') {
      const targetLabs = group === 'all' ? labs : labs.filter((l) => l.group === group);
      const hasCountry = targetLabs.some((l) => l.country === selectedCountry);
      if (!hasCountry) {
        setSelectedCountry('all');
      }
    }
  };

  // Slider helpers: granular single-category steps (0 to 10)
  const currentSliderIndex = useMemo(() => {
    const directIdx = GRANULAR_SLIDER_KEYS.indexOf(sizeFilter);
    if (directIdx !== -1) return directIdx;
    // Map 2-category-combined pill selections to their base slider positions
    if (sizeFilter === 'planetary_singularity') return 9;
    if (sizeFilter === 'massive_colossal') return 7;
    if (sizeFilter === 'medium_large') return 5;
    if (sizeFilter === 'small_tiny') return 3;
    if (sizeFilter === 'mini_micro') return 1;
    if (sizeFilter === 'small_micro') return 3; // backward compatibility fallback
    return 0;
  }, [sizeFilter]);

  const handleSliderChange = (newIndex: number) => {
    const safeIdx = Math.max(0, Math.min(GRANULAR_SLIDER_KEYS.length - 1, newIndex));
    setSizeFilter(GRANULAR_SLIDER_KEYS[safeIdx]);
  };

  const handleSliderStep = (delta: number) => {
    const nextIdx = Math.max(0, Math.min(GRANULAR_SLIDER_KEYS.length - 1, currentSliderIndex + delta));
    setSizeFilter(GRANULAR_SLIDER_KEYS[nextIdx]);
  };

  // Aggregate distinct countries with flags and lab counts for active group
  const countries = useMemo(() => {
    const targetLabs = activeGroup === 'all' ? labs : labs.filter((l) => l.group === activeGroup);
    const map = new Map<string, { country: string; flag: string; count: number }>();
    targetLabs.forEach((l) => {
      const raw = l.country?.trim();
      if (!raw || raw.toLowerCase().startsWith('small llm')) return;
      const existing = map.get(raw);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(raw, { country: raw, flag: l.countryFlag || '🌐', count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [labs, activeGroup]);

  // Aggregate lab counts per model size category based on active group, weights, and country filter
  const sizeCategoryCounts = useMemo(() => {
    const baseLabs = labs.filter((l) => {
      if (activeGroup !== 'all' && l.group !== activeGroup) return false;
      if (weightsFilter === 'open' && l.weightsType !== 'open') return false;
      if (weightsFilter === 'hybrid' && l.weightsType !== 'hybrid') return false;
      if (weightsFilter === 'closed' && l.weightsType !== 'closed') return false;
      if (selectedCountry !== 'all' && l.country !== selectedCountry) return false;
      return true;
    });

    const counts: Record<string, number> = {
      all: baseLabs.length,
    };

    SIZE_CATEGORIES.forEach((cat) => {
      if (cat.key === 'all') return;
      counts[cat.key] = baseLabs.filter((lab) => {
        return cat.tiers.some((tierKey) => {
          const val = lab.parameterSizes[tierKey];
          return Boolean(val && val.trim() && val.trim() !== '-');
        });
      }).length;
    });

    GRANULAR_SLIDER_STEPS.forEach((step) => {
      if (step.key === 'all') return;
      counts[step.key] = baseLabs.filter((lab) => {
        return step.tiers.some((tierKey) => {
          const val = lab.parameterSizes[tierKey];
          return Boolean(val && val.trim() && val.trim() !== '-');
        });
      }).length;
    });

    return counts;
  }, [labs, activeGroup, weightsFilter, selectedCountry]);

  // Filtered labs list based on Group, Weights Filter, Size Filter, Country, and Search Query
  const filteredLabs = useMemo(() => {
    const list = labs.filter((lab) => {
      // 1. Group filter
      if (activeGroup !== 'all' && lab.group !== activeGroup) return false;

      // 2. Weights filter (Vendor level: All, Open, Hybrid, Closed)
      if (weightsFilter === 'open') {
        if (lab.weightsType !== 'open') return false;
      } else if (weightsFilter === 'hybrid') {
        if (lab.weightsType !== 'hybrid') return false;
      } else if (weightsFilter === 'closed') {
        if (lab.weightsType !== 'closed') return false;
      }

      // 3. Country filter
      if (selectedCountry !== 'all') {
        if (lab.country !== selectedCountry) return false;
      }

      // 4. Model Size Filter (Parameter Size Category or Granular Single Category)
      if (sizeFilter !== 'all') {
        const targetTiers = getSizeFilterTiers(sizeFilter);
        if (targetTiers.length > 0) {
          const hasMatchingTier = targetTiers.some((tierKey) => {
            const val = lab.parameterSizes[tierKey];
            return Boolean(val && val.trim() && val.trim() !== '-');
          });
          if (!hasMatchingTier) return false;
        }
      }

      // 5. Search query
      if (!deferredSearchQuery.trim()) return true;
      const q = deferredSearchQuery.toLowerCase().trim();
      return (
        lab.creator.toLowerCase().includes(q) ||
        lab.country.toLowerCase().includes(q) ||
        (lab.engineName && lab.engineName.toLowerCase().includes(q)) ||
        (lab.basedOn && lab.basedOn.toLowerCase().includes(q)) ||
        (lab.harness && lab.harness.toLowerCase().includes(q)) ||
        (lab.form && lab.form.toLowerCase().includes(q)) ||
        (lab.note && lab.note.toLowerCase().includes(q)) ||
        (lab.famousFor && lab.famousFor.toLowerCase().includes(q)) ||
        (lab.specialties && lab.specialties.toLowerCase().includes(q)) ||
        Object.values(lab.parameterSizes).some((v) => v && v.toLowerCase().includes(q))
      );
    });

    // Always sort labs alphabetically by vendor / creator name (A-Z) across all filter states
    return [...list].sort((a, b) =>
      a.creator.localeCompare(b.creator, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [labs, activeGroup, weightsFilter, sizeFilter, selectedCountry, deferredSearchQuery]);

  // Index benchmark models by normalized lab key so every card gets live pricing/availability metadata
  const modelsByLabKey = useMemo(() => {
    const sourceModels = allModels && allModels.length > 0 ? allModels : models || [];
    const map = new Map<string, ModelRecord[]>();
    for (const m of sourceModels) {
      const keys = new Set<string>([
        normalizePricingLabKey(m.companyName),
        normalizePricingLabKey(m.creatorClean),
      ]);
      for (const key of keys) {
        if (!key) continue;
        const arr = map.get(key);
        if (arr) {
          arr.push(m);
        } else {
          map.set(key, [m]);
        }
      }
    }
    return map;
  }, [allModels, models]);

  // Horizontal mouse wheel scrolling for overflow button strips
  const handleHorizontalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  const scrollToWeightsExplainer = useCallback((targetId?: string) => {
    const targetElementId = targetId || 'weights-explainer-section';
    const el = document.getElementById(targetElementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-500', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-500');
      }, 2500);
    }
  }, []);

  const handleToggleExpandLab = useCallback((labId: string) => {
    setExpandedLabId((prev) => (prev === labId ? null : labId));
  }, []);

  const scrollToGlossary = (targetId?: string) => {
    if (targetId && targetId !== 'glossary-section') {
      setGlossaryCategory('all');
      setGlossarySearch('');
    }
    const targetElementId = targetId || 'glossary-section';
    const el = document.getElementById(targetElementId);
    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: targetElementId === 'glossary-section' ? 'start' : 'center',
      });
      el.classList.add('ring-4', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-900', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-2', 'dark:ring-offset-slate-900');
      }, 3500);
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Top Bar: Permanently visible Category Tabs on the left, Glossary / Original Sheet / Advanced on the right */}
      {!hideHeaderControls && (
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          {/* Segmented Filter: "All Labs" to "Agent Scaffolding" */}
          <div
            className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80 overflow-x-auto scrollbar-none sm:scrollbar-thin w-full min-w-0 max-w-full"
            onWheel={handleHorizontalWheel}
          >
            <button
              type="button"
              onClick={() => handleGroupChange('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `Alle Labore (${allCount})` : `All Labs (${allCount})`}
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange('top10')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'top10'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `Top LLM-Labore (${top10Count})` : `Top LLM Labs (${top10Count})`}
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange('contender')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'contender'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `Herausforderer (${contenderCount})` : `Contenders (${contenderCount})`}
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange('tweakers')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'tweakers'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `Modell-Optimierer (${tweakersCount})` : `Model Tweakers (${tweakersCount})`}
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange('small')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'small'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `Labore kleiner Modelle (${smallCount})` : `Small Model Labs (${smallCount})`}
            </button>
            <Tooltip
              title={lang === 'de' ? 'Agentensteuerung' : 'Agent Scaffolding & Harness'}
              badge={lang === 'de' ? 'Glossar' : 'Glossary'}
              align="center"
              width="w-72"
              content={
                <div>
                  <p className="text-slate-300 leading-snug mb-2">
                    {lang === 'de'
                      ? 'Entwickler von Software-Umgebungen wie Aider, OpenHands oder Cursor. Sie bauen die Agentensteuerung: Sie statten LLMs mit Werkzeugen (Terminal, Dateizugriff) aus, zerlegen komplexe Aufgaben in Teilschritte und halten das Modell in einer autonomen Ausführungsschleife (ReAct-Loop), bis die Arbeit vollständig erledigt ist.'
                      : 'Developers of agentic runtime environments like Aider, OpenHands, or Cursor. Instead of training raw models, they build the execution scaffolding ("harness"): equipping LLMs with tools (terminal, file system), decomposing tasks into sub-steps, and running them in autonomous loops until finished.'}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToGlossary('term-harness');
                    }}
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline pt-1 border-t border-slate-800/80 w-full cursor-pointer font-semibold"
                  >
                    <span>{lang === 'de' ? 'Agentensteuerung im Glossar nachschlagen ↓' : 'View Harness in Glossary ↓'}</span>
                  </button>
                </div>
              }
            >
              <button
                type="button"
                onClick={() => handleGroupChange('harness')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  activeGroup === 'harness'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {lang === 'de' ? `Agentensteuerung (${harnessCount})` : `Agent Scaffolding (${harnessCount})`}
              </button>
            </Tooltip>
          </div>

          {/* Action Buttons: Glossary, Original Sheet, and Advanced toggle */}
          <div className="shrink-0 flex items-center gap-2 self-end xl:self-auto">
            <Tooltip
              title={lang === 'de' ? 'Glossar & Fachbegriffe' : 'Glossary & Terms'}
              align="right"
              width="w-64"
              content={
                lang === 'de'
                  ? 'Zu den Definitionen springen (Neuronales Netz, Modell, Chatbot, Generative KI, Agentensteuerung etc.)'
                  : 'Jump to definitions (Neural Network, Model, Chatbot, Generative AI, Harness etc.)'
              }
            >
              <button
                type="button"
                onClick={() => scrollToGlossary()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700/80 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                <span>{lang === 'de' ? 'Glossar' : 'Glossary'}</span>
              </button>
            </Tooltip>

            <a
              href="https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/edit?gid=355721692#gid=355721692"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700/80"
              title={lang === 'de' ? 'Original-Tabelle in neuem Tab öffnen' : 'Open original spreadsheet in new tab'}
            >
              <span>{lang === 'de' ? 'Original-Sheet' : 'Original Sheet'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Advanced Button */}
            <button
              type="button"
              onClick={toggleAdvanced}
              aria-expanded={showAdvanced}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer shrink-0 ${
                showAdvanced
                  ? 'bg-blue-600 text-white border-blue-500 shadow-2xs ring-2 ring-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
              }`}
            >
              <SlidersHorizontal className={`w-3.5 h-3.5 ${showAdvanced ? 'text-white' : 'text-blue-500'}`} />
              <span>{lang === 'de' ? 'Erweitert' : 'Advanced'}</span>
              {activeAdvancedFiltersCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 leading-none rounded-full font-bold ${
                  showAdvanced ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'
                }`}>
                  {activeAdvancedFiltersCount}
                </span>
              )}
              <span className={`text-xs ${showAdvanced ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
                {showAdvanced ? '▲' : '▼'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Advanced Drawer: Revealed when showAdvanced is true */}
      {showAdvanced && (
        <div className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
            {/* Country Filter Buttons: wrap cleanly instead of being squeezed into horizontal scroll */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs min-w-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                <span>🌐</span>
                <span>{lang === 'de' ? 'Land:' : 'Country:'}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCountry('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCountry === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'de' ? 'Alle Länder (A-Z)' : 'All Countries (A-Z)'}
              </button>
              {countries.map((c) => {
                const isSelected = selectedCountry === c.country;
                return (
                  <button
                    key={c.country}
                    type="button"
                    onClick={() => setSelectedCountry(isSelected ? 'all' : c.country)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CountryFlag country={c.country} fallbackEmoji={c.flag} size="sm" />
                    <span>{c.country}</span>
                    <span className={`text-xs ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      ({c.count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 max-w-full">
              {/* Open / Hybrid / Closed Weights Segmented Toggle Button */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'de' ? 'Gewichte:' : 'Weights:'}</span>
                  <Tooltip
                    title={lang === 'de' ? 'Modellgewichte' : 'Model Weights'}
                    align="center"
                    width="w-60"
                    content={
                      lang === 'de'
                        ? 'Erklärung zu Open, Hybrid und Closed anzeigen.'
                        : 'Show explanation of Open, Hybrid, and Closed weights.'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => scrollToWeightsExplainer()}
                      className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                      aria-label="Weights explanation"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </span>
                <button
                  type="button"
                  onClick={() => setWeightsFilter('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    weightsFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'de' ? 'Alle' : 'All'}
                </button>

                {/* Open Button with Tooltip */}
                <Tooltip
                  title={
                    <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      <span>{lang === 'de' ? WEIGHTS_CONCEPTS.open.titleDe : WEIGHTS_CONCEPTS.open.titleEn}</span>
                    </span>
                  }
                  badge={lang === 'de' ? 'Offen' : 'Open'}
                  align="center"
                  width="w-64"
                  content={
                    <div>
                      <p className="text-slate-300 leading-snug mb-2">
                        {lang === 'de' ? WEIGHTS_CONCEPTS.open.tooltipDe : WEIGHTS_CONCEPTS.open.tooltipEn}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToWeightsExplainer('weights-open');
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline pt-1 border-t border-slate-800/80 w-full cursor-pointer font-semibold"
                      >
                        <span>{lang === 'de' ? 'Ausführliche Erklärung anzeigen ↓' : 'Show full explanation ↓'}</span>
                      </button>
                    </div>
                  }
                >
                  <button
                    type="button"
                    onClick={() => setWeightsFilter('open')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      weightsFilter === 'open'
                        ? 'bg-cyan-600 text-white shadow-2xs'
                        : 'text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40'
                    }`}
                  >
                    {lang === 'de' ? 'Offen' : 'Open'}
                  </button>
                </Tooltip>

                {/* Hybrid Button with Tooltip */}
                <Tooltip
                  title={
                    <span className="flex items-center gap-1.5 text-purple-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>{lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.titleDe : WEIGHTS_CONCEPTS.hybrid.titleEn}</span>
                    </span>
                  }
                  badge="Hybrid"
                  align="center"
                  width="w-64"
                  content={
                    <div>
                      <p className="text-slate-300 leading-snug mb-2">
                        {lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.tooltipDe : WEIGHTS_CONCEPTS.hybrid.tooltipEn}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToWeightsExplainer('weights-hybrid');
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline pt-1 border-t border-slate-800/80 w-full cursor-pointer font-semibold"
                      >
                        <span>{lang === 'de' ? 'Ausführliche Erklärung anzeigen ↓' : 'Show full explanation ↓'}</span>
                      </button>
                    </div>
                  }
                >
                  <button
                    type="button"
                    onClick={() => setWeightsFilter('hybrid')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      weightsFilter === 'hybrid'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                    }`}
                  >
                    Hybrid
                  </button>
                </Tooltip>

                {/* Closed Button with Tooltip */}
                <Tooltip
                  title={
                    <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span>{lang === 'de' ? WEIGHTS_CONCEPTS.closed.titleDe : WEIGHTS_CONCEPTS.closed.titleEn}</span>
                    </span>
                  }
                  badge={lang === 'de' ? 'Geschlossen' : 'Closed'}
                  align="center"
                  width="w-64"
                  content={
                    <div>
                      <p className="text-slate-300 leading-snug mb-2">
                        {lang === 'de' ? WEIGHTS_CONCEPTS.closed.tooltipDe : WEIGHTS_CONCEPTS.closed.tooltipEn}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToWeightsExplainer('weights-closed');
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline pt-1 border-t border-slate-800/80 w-full cursor-pointer font-semibold"
                      >
                        <span>{lang === 'de' ? 'Ausführliche Erklärung anzeigen ↓' : 'Show full explanation ↓'}</span>
                      </button>
                    </div>
                  }
                >
                  <button
                    type="button"
                    onClick={() => setWeightsFilter('closed')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      weightsFilter === 'closed'
                        ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'de' ? 'Geschlossen' : 'Closed'}
                  </button>
                </Tooltip>
              </div>

              {/* Search Input */}
              <div className="relative flex-1 sm:flex-initial min-w-[210px] sm:w-64 max-w-full">
                <Search className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'de'
                      ? 'Lab, Modellfamilie, Tooling oder Land filtern...'
                      : 'Filter by lab, model family, tooling or country...'
                  }
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-xs px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Model Size Filter (Slider & Quick Category Pills) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
            {/* Left: Size Slider with [-] and [+] step buttons and active size indicator */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Tooltip
                title={lang === 'de' ? 'Modellgröße (Parameter)' : 'Model Size (Parameters)'}
                align="left"
                width="w-64"
                content={
                  lang === 'de'
                    ? 'Filtert Modelle nach Parameteranzahl: von On-Device (< 0,5 Mrd. / Micro) bis zu Frontier-Giganten (≥ 15 Bio. / Singularity). Stufenlos über Schieberegler oder Schnellwahl-Kategorien wählbar.'
                    : 'Filter models by parameter count: from on-device (< 0.5B / Micro) to frontier megascale (≥ 15T / Singularity). Adjust via slider steps or quick-select categories.'
                }
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-help">
                  <Cpu className="w-3.5 h-3.5 text-blue-500" />
                  <span>{lang === 'de' ? 'Modellgröße:' : 'Model Size:'}</span>
                  <HelpCircle className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                </div>
              </Tooltip>

              {/* Range slider with step buttons */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleSliderStep(-1)}
                  disabled={currentSliderIndex === 0}
                  aria-label="Decrease model size filter"
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
                >
                  <Minus className="w-3 h-3" />
                </button>

                <input
                  type="range"
                  min={0}
                  max={GRANULAR_SLIDER_KEYS.length - 1}
                  step={1}
                  value={currentSliderIndex}
                  onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
                  className="w-24 sm:w-36 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                  aria-label={lang === 'de' ? 'Granularer Modellgrößen-Schieberegler' : 'Granular model size slider'}
                />

                <button
                  type="button"
                  onClick={() => handleSliderStep(1)}
                  disabled={currentSliderIndex === GRANULAR_SLIDER_KEYS.length - 1}
                  aria-label="Increase model size filter"
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
                >
                  <Plus className="w-3 h-3" />
                </button>

                {/* Active size indicator badge */}
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-w-[84px] text-center whitespace-nowrap">
                  {sizeFilter === 'all'
                    ? (lang === 'de' ? 'Alle' : 'All')
                    : sizeFilter === 'planetary_singularity'
                    ? (lang === 'de' ? 'Planetar / Sing.' : 'Planetary / Sing.')
                    : sizeFilter === 'massive_colossal'
                    ? (lang === 'de' ? 'Massiv / Kolossal' : 'Massive / Colossal')
                    : sizeFilter === 'medium_large'
                    ? (lang === 'de' ? 'Mittel / Groß' : 'Medium / Large')
                    : sizeFilter === 'small_tiny'
                    ? (lang === 'de' ? 'Klein / Winzig' : 'Small / Tiny')
                    : sizeFilter === 'mini_micro'
                    ? (lang === 'de' ? 'Mini / Mikro' : 'Mini / Micro')
                    : (lang === 'de'
                        ? `${GRANULAR_SLIDER_STEPS.find((s) => s.key === sizeFilter)?.nameDe || ''} (${GRANULAR_SLIDER_STEPS.find((s) => s.key === sizeFilter)?.rangeBadgeDe || ''})`
                        : `${GRANULAR_SLIDER_STEPS.find((s) => s.key === sizeFilter)?.nameEn || ''} (${GRANULAR_SLIDER_STEPS.find((s) => s.key === sizeFilter)?.rangeBadgeEn || ''})`)}
                </span>
              </div>
            </div>

            {/* Right: Quick filter buttons for the 5 primary 2-category-combined pills + All */}
            <div className="flex flex-wrap items-center gap-1.5">
              {SIZE_CATEGORIES.map((cat) => {
                const isExact = sizeFilter === cat.key;
                const isSubSelected =
                  (cat.key === 'planetary_singularity' && (sizeFilter === 'planetary' || sizeFilter === 'singularity')) ||
                  (cat.key === 'massive_colossal' && (sizeFilter === 'massive' || sizeFilter === 'colossal')) ||
                  (cat.key === 'medium_large' && (sizeFilter === 'medium' || sizeFilter === 'large')) ||
                  (cat.key === 'small_tiny' && (sizeFilter === 'tiny' || sizeFilter === 'small')) ||
                  (cat.key === 'mini_micro' && (sizeFilter === 'micro' || sizeFilter === 'mini'));
                const count = sizeCategoryCounts[cat.key] ?? 0;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSizeFilter(isExact && cat.key !== 'all' ? 'all' : cat.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isExact
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : isSubSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-2 border-blue-500 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:text-slate-950 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {cat.key !== 'all' && (
                      <span className={`w-2 h-2 rounded-full ${cat.dotClass} shrink-0`} />
                    )}
                    <span>{lang === 'de' ? cat.nameDe : cat.nameEn}</span>
                    <span className={`text-xs ${isExact ? 'text-blue-100' : isSubSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}

              {/* Clear size filter button if active */}
              {sizeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSizeFilter('all')}
                  className="px-2 py-1 text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer shrink-0"
                >
                  ✕ {lang === 'de' ? 'Zurücksetzen' : 'Reset'}
                </button>
              )}
            </div>
          </div>

          {/* Informative banner when a specific size filter is active */}
          {sizeFilter !== 'all' && (() => {
            const activeInfo =
              GRANULAR_SLIDER_STEPS.find((s) => s.key === sizeFilter) ||
              SIZE_CATEGORIES.find((c) => c.key === sizeFilter);
            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
                  <span className="font-bold shrink-0">
                    {lang === 'de' ? activeInfo?.nameDe : activeInfo?.nameEn}:
                  </span>
                  <span className="text-blue-700 dark:text-blue-300 truncate">
                    {lang === 'de' ? activeInfo?.descDe : activeInfo?.descEn}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <Tooltip
                    content={
                      lang === 'de'
                        ? 'Karten auf Vendor, Modellfamilie & gewähltes Modell reduzieren oder Vollansicht anzeigen'
                        : 'Toggle reduced cards (Vendor, chatbot family & selected model) vs. full cards'
                    }
                    align="right"
                    width="w-64"
                  >
                    <button
                      type="button"
                      onClick={() => setSimplifiedSizeView((prev) => !prev)}
                      className="px-2 py-0.5 text-xs font-semibold rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                    >
                      {simplifiedSizeView
                        ? (lang === 'de' ? 'Kompakte Ansicht: An' : 'Compact View: On')
                        : (lang === 'de' ? 'Vollansicht: An' : 'Full View: On')}
                    </button>
                  </Tooltip>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {filteredLabs.length} {lang === 'de' ? 'Labore' : 'labs'}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Grid of Lab Cards (Responsive 1 to 4 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredLabs.map((lab) => (
          <LabMatrixCard
            key={lab.id}
            lab={lab}
            lang={lang}
            translatedTiersEn={dynamicLabTiersEn[lab.id]}
            isExpanded={expandedLabId === lab.id}
            onToggleExpand={handleToggleExpandLab}
            isSimplifiedView={isSimplifiedView}
            sizeFilter={sizeFilter}
            modelsByLabKey={modelsByLabKey}
            pricingPlans={pricingPlans}
            onSelectLabForBenchmark={onSelectLabForBenchmark}
            onScrollToWeightsExplainer={scrollToWeightsExplainer}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredLabs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">
            {lang === 'de'
              ? 'Keine LLM-Labs gefunden, die den Filterkriterien entsprechen.'
              : 'No LLM labs found matching the search criteria.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              handleGroupChange('all');
              setSelectedCountry('all');
              setWeightsFilter('all');
              setSizeFilter('all');
            }}
            className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            {lang === 'de' ? 'Alle Filter zurücksetzen' : 'Reset all filters'}
          </button>
        </div>
      )}

      {/* Weights Concepts Explainer & Glossary */}
      <LabWeightsAndGlossary
        lang={lang}
        glossaryCategory={glossaryCategory}
        onGlossaryCategoryChange={setGlossaryCategory}
        glossarySearch={glossarySearch}
        onGlossarySearchChange={setGlossarySearch}
      />
    </div>
  );
});
