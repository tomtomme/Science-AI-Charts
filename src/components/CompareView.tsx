import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Trophy,
  Globe,
  BookOpen,
  Sparkles,
  Tag,
  Building2,
  Ruler,
  RotateCw,
  Minus,
  Plus,
  BarChart3,
  Radar,
} from 'lucide-react';
import {
  ActiveBenchmarkKey,
  BenchmarkWeights,
  LabEntry,
  ModelRecord,
  ScoreMode,
  ModelScope,
  Row33Metadata,
} from '../types';
import { getNormalizedWeights } from '../utils/weighting';
import {
  BENCHMARK_COMPONENTS,
  RETIRED_TIMELINE_BENCHMARKS,
  getBenchmarkCategoryLabel,
  getCompositeScoreLabel,
} from '../data/benchmarks';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { translateStoryline } from '../utils/storylineHelper';
import {
  BENCHMARK_ANCHOR_MAP,
  COMPARE_SLOTS,
  CompareSlot,
  MAX_COMPARE_MODELS,
  PresetKind,
  SLOT_THEME,
  SizeClassKey,
  SIZE_CLASS_LABELS,
  CategoryComparisonRow,
  getScoreForMode,
  formatNumber,
  formatCompactPrice,
  getPriceBucket,
  getRow33Source,
  pickNewestCompareModels,
  pickDefaultCompareIds,
  pickTopDiverseModels,
  inferModelSizeClass,
} from '../utils/compareHelpers';
import { CompareModelSelector } from './compare/CompareModelSelector';
import { CompareRadarChart } from './compare/CompareRadarChart';

export interface CompareViewProps {
  allModels: ModelRecord[];
  rankedModels: ModelRecord[];
  labs?: LabEntry[];
  scoreMode: ScoreMode;
  scope: ModelScope;
  lang: Language;
  categoryNames?: string[];
  isPreTranslatedCategoryNames?: boolean;
  compositeScoreNames?: string[];
  isPreTranslatedCompositeScoreNames?: boolean;
  retiredCategoryNames?: string[];
  isPreTranslatedRetiredCategoryNames?: boolean;
  row33Meta?: Row33Metadata;
  benchmarkWeights?: BenchmarkWeights;
  isCustomWeighted?: boolean;
  onScrollToParagraph?: (targetId: string) => void;
  onSelectCompany?: (company: string) => void;
}

export const CompareView: React.FC<CompareViewProps> = ({
  allModels,
  rankedModels,
  labs = [],
  scoreMode,
  scope,
  lang,
  categoryNames,
  isPreTranslatedCategoryNames = false,
  compositeScoreNames,
  isPreTranslatedCompositeScoreNames = false,
  retiredCategoryNames,
  isPreTranslatedRetiredCategoryNames = false,
  row33Meta,
  benchmarkWeights,
  isCustomWeighted = false,
  onScrollToParagraph,
  onSelectCompany,
}) => {
  const t = TRANSLATIONS[lang];

  const pickerModels = useMemo(() => {
    const scopeFiltered = scope === 'current' ? allModels.filter((m) => m.isAvailable) : allModels;
    const base = scopeFiltered.filter(
      (m) => Boolean(m.hasConcreteReleaseDate) && /^\d{4}-\d{2}-\d{2}$/.test(m.releaseDate || '')
    );
    return [...base].sort((a, b) => {
      const sa = getScoreForMode(a, scoreMode) ?? -9999;
      const sb = getScoreForMode(b, scoreMode) ?? -9999;
      if (sb !== sa) return sb - sa;
      const na = a.scoreNew ?? a.scoreNewReported ?? (a.hasAll8Benchmarks ? a.scoreNewCalculated : -9999);
      const nb = b.scoreNew ?? b.scoreNewReported ?? (b.hasAll8Benchmarks ? b.scoreNewCalculated : -9999);
      if (nb !== na) return nb - na;
      return (b.scoreOld ?? -9999) - (a.scoreOld ?? -9999);
    });
  }, [allModels, scope, scoreMode]);

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    rankedModels.forEach((m) => {
      map.set(m.id, m.rank);
    });
    return map;
  }, [rankedModels]);

  const maxCompareCount = Math.max(
    2,
    Math.min(MAX_COMPARE_MODELS, pickerModels.length || allModels.length)
  );
  const [modelCount, setModelCount] = useState<number>(2);
  const effectiveCount = Math.max(2, Math.min(modelCount, maxCompareCount));

  const [slotIds, setSlotIds] = useState<string[]>(() => {
    const pool =
      pickerModels.length >= 2
        ? pickerModels
        : rankedModels.length >= 2
        ? rankedModels
        : allModels;
    const newestIds = pickNewestCompareModels(pool, MAX_COMPARE_MODELS, scoreMode).map((m) => m.id);
    if (newestIds.length >= Math.min(MAX_COMPARE_MODELS, pool.length)) {
      return newestIds;
    }
    const fallback = pickDefaultCompareIds(pool, MAX_COMPARE_MODELS, scoreMode);
    const merged = [...newestIds];
    const seen = new Set(newestIds);
    for (const id of fallback) {
      if (merged.length >= MAX_COMPARE_MODELS) break;
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(id);
      }
    }
    return merged;
  });

  const [activePreset, setActivePreset] = useState<PresetKind | null>('newest');
  const [presetSubLabel, setPresetSubLabel] = useState<string>(() =>
    lang === 'de' ? 'Aktuellste Releases' : 'Latest releases'
  );
  const [priceBucketIndex, setPriceBucketIndex] = useState<number>(0);
  const [familyGroupIndex, setFamilyGroupIndex] = useState<number>(0);
  const [sizeClassIndex, setSizeClassIndex] = useState<number>(0);

  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [benchmarkChartMode, setBenchmarkChartMode] = useState<'bars' | 'radar'>('radar');
  const [showHistoricalBenchmarks, setShowHistoricalBenchmarks] = useState<boolean>(true);

  // Keep selections valid & mutually distinct across all slots whenever live Sheet updates reload models
  useEffect(() => {
    const byId = new Map(allModels.map((m) => [m.id, m]));
    const pool = pickerModels.length >= 2 ? pickerModels : allModels;
    if (pool.length === 0) return;

    const newestIds = pickNewestCompareModels(pool, MAX_COMPARE_MODELS, scoreMode).map((m) => m.id);
    const defaults =
      newestIds.length > 0 ? newestIds : pickDefaultCompareIds(pool, MAX_COMPARE_MODELS, scoreMode);

    setSlotIds((prev) => {
      const targetLen = Math.min(MAX_COMPARE_MODELS, pool.length);
      if (activePreset === 'newest') {
        const next: string[] = [];
        const used = new Set<string>();
        for (const id of defaults) {
          if (next.length >= targetLen) break;
          if (!used.has(id)) {
            next.push(id);
            used.add(id);
          }
        }
        for (const m of pool) {
          if (next.length >= targetLen) break;
          if (!used.has(m.id)) {
            next.push(m.id);
            used.add(m.id);
          }
        }
        if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
          return prev;
        }
        return next;
      }

      const next: string[] = [];
      const used = new Set<string>();
      for (let i = 0; i < targetLen; i++) {
        const cur = prev[i];
        if (cur && byId.has(cur) && !used.has(cur)) {
          next.push(cur);
          used.add(cur);
        } else {
          const fallback =
            defaults.find((id) => !used.has(id)) ||
            pool.find((m) => !used.has(m.id))?.id ||
            pool[0].id;
          next.push(fallback);
          used.add(fallback);
        }
      }
      if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
        return prev;
      }
      return next;
    });
  }, [allModels, pickerModels, scoreMode, activePreset]);

  const activeSlots = useMemo(() => {
    const byId = new Map(allModels.map((m) => [m.id, m]));
    const list: Array<{ slot: CompareSlot; model: ModelRecord }> = [];
    const used = new Set<string>();
    for (let i = 0; i < effectiveCount; i++) {
      const slot = COMPARE_SLOTS[i];
      const candidateId = slotIds[i];
      let model = candidateId ? byId.get(candidateId) : undefined;
      if (!model || used.has(model.id)) {
        model = pickerModels.find((m) => !used.has(m.id)) || allModels.find((m) => !used.has(m.id));
      }
      if (model) {
        used.add(model.id);
        list.push({ slot, model });
      }
    }
    return list;
  }, [allModels, pickerModels, slotIds, effectiveCount]);

  // Preset option groups
  const priceGroups = useMemo(() => {
    const buckets: Array<{ key: 'free' | 'plus' | 'pro'; labelDe: string; labelEn: string; models: ModelRecord[] }> = [
      { key: 'free', labelDe: 'Gratis / 0€', labelEn: 'Free / $0', models: [] },
      { key: 'plus', labelDe: 'Standard (~15–25€)', labelEn: 'Standard (~$15–25)', models: [] },
      { key: 'pro', labelDe: 'Pro / Ultra (90€+)', labelEn: 'Pro / Ultra ($90+)', models: [] },
    ];
    for (const m of pickerModels) {
      const b = getPriceBucket(m, lang);
      const target = buckets.find((x) => x.key === b);
      if (target) target.models.push(m);
    }
    return buckets.filter((b) => b.models.length >= 2);
  }, [pickerModels, lang]);

  const familyGroups = useMemo(() => {
    const byFamily = new Map<string, { name: string; models: ModelRecord[] }>();
    for (const m of pickerModels) {
      const name = (m.companyName || m.creatorClean || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const existing = byFamily.get(key);
      if (existing) {
        existing.models.push(m);
      } else {
        byFamily.set(key, { name, models: [m] });
      }
    }
    const groups = Array.from(byFamily.values()).filter((g) => g.models.length >= 2);
    return groups.sort((a, b) => {
      const aFit = a.models.length >= effectiveCount ? 1 : 0;
      const bFit = b.models.length >= effectiveCount ? 1 : 0;
      if (bFit !== aFit) return bFit - aFit;
      const sa = getScoreForMode(a.models[0], scoreMode) ?? -9999;
      const sb = getScoreForMode(b.models[0], scoreMode) ?? -9999;
      return sb - sa;
    });
  }, [pickerModels, scoreMode, effectiveCount]);

  const sizeGroups = useMemo(() => {
    const order: SizeClassKey[] = ['planetary', 'massive', 'singularity', 'colossal', 'large', 'small'];
    const map = new Map<SizeClassKey, ModelRecord[]>();
    for (const k of order) map.set(k, []);
    for (const m of pickerModels) {
      const cls = inferModelSizeClass(m, labs);
      if (cls) {
        map.get(cls)!.push(m);
      }
    }
    return order
      .map((k) => ({ key: k, label: SIZE_CLASS_LABELS[k], models: map.get(k)! }))
      .filter((g) => g.models.length >= 2)
      .sort((a, b) => Number(b.models.length >= effectiveCount) - Number(a.models.length >= effectiveCount));
  }, [pickerModels, labs, effectiveCount]);

  const applySlotSelection = (chosen: ModelRecord[]) => {
    if (chosen.length === 0) return;
    const chosenIds = chosen.slice(0, MAX_COMPARE_MODELS).map((m) => m.id);
    const chosenSet = new Set(chosenIds);
    const fillPool = pickDefaultCompareIds(pickerModels.length >= 2 ? pickerModels : allModels, MAX_COMPARE_MODELS, scoreMode);
    const merged = [...chosenIds];
    for (const id of [...slotIds, ...fillPool]) {
      if (merged.length >= MAX_COMPARE_MODELS) break;
      if (!chosenSet.has(id)) {
        chosenSet.add(id);
        merged.push(id);
      }
    }
    setSlotIds(merged);
    if (chosen.length < effectiveCount) {
      setModelCount(Math.max(2, chosen.length));
    }
  };

  const applyPresetForCount = (preset: PresetKind, count: number, idxOverride?: number) => {
    const targetCount = Math.max(2, Math.min(count, maxCompareCount));
    if (preset === 'newest') {
      const chosen = pickNewestCompareModels(pickerModels, targetCount, scoreMode);
      applySlotSelection(chosen);
      setActivePreset('newest');
      setPresetSubLabel(lang === 'de' ? 'Aktuellste Releases' : 'Latest releases');
      return;
    }

    if (preset === 'same_price' && priceGroups.length > 0) {
      const nextIdx =
        idxOverride !== undefined
          ? idxOverride % priceGroups.length
          : activePreset === 'same_price'
          ? (priceBucketIndex + 1) % priceGroups.length
          : 0;
      const group = priceGroups[nextIdx];
      const chosen = pickTopDiverseModels(group.models, targetCount, scoreMode);
      applySlotSelection(chosen);
      setPriceBucketIndex(nextIdx);
      setActivePreset('same_price');
      setPresetSubLabel(lang === 'de' ? group.labelDe : group.labelEn);
      return;
    }

    if (preset === 'same_family' && familyGroups.length > 0) {
      const nextIdx =
        idxOverride !== undefined
          ? idxOverride % familyGroups.length
          : activePreset === 'same_family'
          ? (familyGroupIndex + 1) % familyGroups.length
          : 0;
      const group = familyGroups[nextIdx];
      const sorted = [...group.models].sort(
        (a, b) => (getScoreForMode(b, scoreMode) ?? -9999) - (getScoreForMode(a, scoreMode) ?? -9999)
      );
      applySlotSelection(sorted.slice(0, targetCount));
      setFamilyGroupIndex(nextIdx);
      setActivePreset('same_family');
      setPresetSubLabel(group.name);
      return;
    }

    if (preset === 'same_size' && sizeGroups.length > 0) {
      const nextIdx =
        idxOverride !== undefined
          ? idxOverride % sizeGroups.length
          : activePreset === 'same_size'
          ? (sizeClassIndex + 1) % sizeGroups.length
          : 0;
      const group = sizeGroups[nextIdx];
      const chosen = pickTopDiverseModels(group.models, targetCount, scoreMode);
      applySlotSelection(chosen);
      setSizeClassIndex(nextIdx);
      setActivePreset('same_size');
      setPresetSubLabel(lang === 'de' ? group.label.de : group.label.en);
    }
  };

  const handleApplyPreset = (preset: PresetKind) => {
    applyPresetForCount(preset, effectiveCount);
  };

  const handleModelCountChange = (rawCount: number) => {
    const nextCount = Math.max(2, Math.min(rawCount, maxCompareCount));
    setModelCount(nextCount);
    if (!activePreset) return;

    if (activePreset === 'newest') {
      applyPresetForCount('newest', nextCount);
    } else if (activePreset === 'same_price' && priceGroups[priceBucketIndex]) {
      if (priceGroups[priceBucketIndex].models.length >= nextCount) {
        applyPresetForCount('same_price', nextCount, priceBucketIndex);
      } else {
        setActivePreset(null);
        setPresetSubLabel('');
      }
    } else if (activePreset === 'same_family' && familyGroups[familyGroupIndex]) {
      if (familyGroups[familyGroupIndex].models.length >= nextCount) {
        applyPresetForCount('same_family', nextCount, familyGroupIndex);
      } else {
        setActivePreset(null);
        setPresetSubLabel('');
      }
    } else if (activePreset === 'same_size' && sizeGroups[sizeClassIndex]) {
      if (sizeGroups[sizeClassIndex].models.length >= nextCount) {
        applyPresetForCount('same_size', nextCount, sizeClassIndex);
      } else {
        setActivePreset(null);
        setPresetSubLabel('');
      }
    }
  };

  const handleSelectSlot = (slotIndex: number, newId: string) => {
    setActivePreset(null);
    setPresetSubLabel('');
    setSlotIds((prev) => {
      const next = [...prev];
      const oldId = next[slotIndex];
      const existingIdx = next.findIndex((id, idx) => idx !== slotIndex && id === newId);
      if (existingIdx !== -1 && oldId) {
        next[existingIdx] = oldId;
      }
      next[slotIndex] = newId;
      return next;
    });
  };

  const handleSwapOrRotate = () => {
    if (activeSlots.length < 2) return;
    setActivePreset(null);
    setPresetSubLabel('');
    setSlotIds((prev) => {
      const next = [...prev];
      const count = activeSlots.length;
      const rotated = activeSlots.map((_, i) => activeSlots[(i + 1) % count].model.id);
      for (let i = 0; i < count; i++) {
        next[i] = rotated[i];
      }
      return next;
    });
  };

  // Row-2 synced composite score labels: index 0=NEW (M2), 1=OLD (L2), 2=WorstCase (N2)
  const labelScoreNew = getCompositeScoreLabel(
    0,
    compositeScoreNames?.[0],
    lang,
    t.scoreModeNew,
    isPreTranslatedCompositeScoreNames
  );
  const labelScoreOld = getCompositeScoreLabel(
    1,
    compositeScoreNames?.[1],
    lang,
    t.scoreModeOld,
    isPreTranslatedCompositeScoreNames
  );
  const labelScoreWorst = getCompositeScoreLabel(
    2,
    compositeScoreNames?.[2],
    lang,
    t.scoreModeWorstCase,
    isPreTranslatedCompositeScoreNames
  );

  const activeScoreLabel =
    scoreMode === 'old'
      ? labelScoreOld
      : scoreMode === 'worstCase'
      ? labelScoreWorst
      : labelScoreNew;

  const normalizedWeights = useMemo(
    () => (benchmarkWeights ? getNormalizedWeights(benchmarkWeights) : null),
    [benchmarkWeights]
  );

  // Compute detailed benchmark comparisons
  const categoryComparisons: CategoryComparisonRow[] = useMemo(() => {
    const specs =
      scoreMode === 'old'
        ? [
            {
              comp: { ...RETIRED_TIMELINE_BENCHMARKS[0], formulaDesc: 'U / 5', weightPct: 20 },
              rawLabel: retiredCategoryNames?.[0],
              isPreTranslated: isPreTranslatedRetiredCategoryNames,
              weightRatio: 1 / 5,
            },
            {
              comp: { ...RETIRED_TIMELINE_BENCHMARKS[1], formulaDesc: 'V / 5', weightPct: 20 },
              rawLabel: retiredCategoryNames?.[1],
              isPreTranslated: isPreTranslatedRetiredCategoryNames,
              weightRatio: 1 / 5,
            },
            {
              comp: { ...RETIRED_TIMELINE_BENCHMARKS[2], formulaDesc: 'W / 5', weightPct: 20 },
              rawLabel: retiredCategoryNames?.[2],
              isPreTranslated: isPreTranslatedRetiredCategoryNames,
              weightRatio: 1 / 5,
            },
            {
              comp: { ...BENCHMARK_COMPONENTS[3], formulaDesc: '1.4085 × (G - 29) / 5', weightPct: 20 },
              rawLabel: categoryNames?.[3],
              isPreTranslated: isPreTranslatedCategoryNames,
              weightRatio: 1 / 5,
            },
            {
              comp: { ...RETIRED_TIMELINE_BENCHMARKS[3], formulaDesc: '1.2 × (X - 16.67) / 5', weightPct: 20 },
              rawLabel: retiredCategoryNames?.[3],
              isPreTranslated: isPreTranslatedRetiredCategoryNames,
              weightRatio: 1 / 5,
            },
          ]
        : BENCHMARK_COMPONENTS.map((comp, idx) => ({
            comp,
            rawLabel: categoryNames?.[idx],
            isPreTranslated: isPreTranslatedCategoryNames,
            weightRatio:
              scoreMode === 'new' && isCustomWeighted && normalizedWeights
                ? normalizedWeights[comp.key as ActiveBenchmarkKey] ?? 1 / 8
                : 1 / 8,
          }));

    return specs.map(({ comp, rawLabel, isPreTranslated, weightRatio }) => {
      const entries = activeSlots.map(({ slot, model }) => {
        const raw = model.rawScores[comp.key] ?? null;
        const val = typeof raw === 'number' && raw !== null ? comp.transform(raw) : null;
        const contrib = val !== null ? val * weightRatio : null;
        return { slot, model, raw, val, contrib };
      });

      const valid = entries.filter((e) => e.val !== null);
      let winners: CompareSlot[] = [];
      let margin = 0;

      if (valid.length >= 2) {
        const sortedVals = [...valid].sort((x, y) => (y.val as number) - (x.val as number));
        const topVal = sortedVals[0].val as number;
        const closeTies = sortedVals.filter((e) => topVal - (e.val as number) < 0.05);
        winners = closeTies.map((e) => e.slot);
        const runnerUp = sortedVals.find((e) => topVal - (e.val as number) >= 0.05);
        margin = runnerUp ? topVal - (runnerUp.val as number) : 0;
      } else if (valid.length === 1) {
        winners = [valid[0].slot];
      }

      const label = getBenchmarkCategoryLabel(rawLabel, lang, comp, isPreTranslated);
      const row33 = getRow33Source(comp.id, row33Meta);
      const isRescaled = comp.id === 'visionPlot' || comp.id === 'trickQuestionsOld';

      return {
        comp,
        label,
        sourceName: row33.text || comp.sourceName,
        sourceUrl: row33.url || comp.sourceUrl,
        entries,
        winners,
        margin,
        isTie: valid.length >= 2 && winners.length === valid.length,
        isRescaled,
      };
    });
  }, [
    activeSlots,
    categoryNames,
    retiredCategoryNames,
    lang,
    isPreTranslatedCategoryNames,
    isPreTranslatedRetiredCategoryNames,
    row33Meta,
    scoreMode,
    isCustomWeighted,
    normalizedWeights,
  ]);

  // Historical sub-benchmarks from Columns V-Y (Synced Row-2 Labels) — only rows with available data
  const historicalComparisons = useMemo(() => {
    return RETIRED_TIMELINE_BENCHMARKS.map((comp, idx) => {
      const entries = activeSlots.map(({ slot, model }) => {
        const raw = model.rawScores[comp.key] ?? null;
        const val = typeof raw === 'number' && raw !== null ? comp.transform(raw) : null;
        return { slot, model, raw, val };
      });
      const valid = entries.filter((e) => e.val !== null);
      let winners: CompareSlot[] = [];
      if (valid.length >= 1) {
        const topVal = Math.max(...valid.map((e) => e.val as number));
        winners = valid.filter((e) => topVal - (e.val as number) < 0.05).map((e) => e.slot);
      }
      return {
        comp,
        label: getBenchmarkCategoryLabel(
          retiredCategoryNames?.[idx],
          lang,
          comp,
          isPreTranslatedRetiredCategoryNames
        ),
        entries,
        winners,
        isTie: valid.length >= 2 && winners.length === valid.length,
      };
    }).filter((row) => row.entries.some((e) => e.val !== null));
  }, [activeSlots, retiredCategoryNames, lang, isPreTranslatedRetiredCategoryNames]);

  const hasAnyHistorical = historicalComparisons.length > 0;

  // Aggregate summary metrics across 2 to 8 active models
  const summaryStats = useMemo(() => {
    const wins: Record<CompareSlot, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 };
    const bestEdge: Record<CompareSlot, { label: string; margin: number; color: string } | null> = {
      A: null,
      B: null,
      C: null,
      D: null,
      E: null,
      F: null,
      G: null,
      H: null,
    };
    let ties = 0;
    let comparableCount = 0;

    for (const row of categoryComparisons) {
      const validCount = row.entries.filter((e) => e.val !== null).length;
      if (validCount < 2) continue;
      comparableCount++;

      if (row.isTie || row.winners.length > 1) {
        ties++;
      } else if (row.winners.length === 1) {
        const winSlot = row.winners[0];
        wins[winSlot]++;
        if (
          row.margin > 0 &&
          (!bestEdge[winSlot] || row.margin > bestEdge[winSlot]!.margin)
        ) {
          bestEdge[winSlot] = { label: row.label, margin: row.margin, color: row.comp.color };
        }
      }
    }

    return { wins, ties, comparableCount, bestEdge };
  }, [categoryComparisons]);

  // Overall top composite score among active slots
  const primaryScores = activeSlots.map(({ slot, model }) => ({
    slot,
    model,
    score: getScoreForMode(model, scoreMode),
  }));
  const validPrimaries = primaryScores.filter((p) => p.score !== null);
  const topPrimaryScore =
    validPrimaries.length > 0 ? Math.max(...validPrimaries.map((p) => p.score as number)) : null;
  const overallLeaders =
    topPrimaryScore !== null
      ? validPrimaries.filter((p) => topPrimaryScore - (p.score as number) < 0.05)
      : [];

  if (activeSlots.length < 2) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-sm text-slate-600 dark:text-slate-400">
        {lang === 'de'
          ? 'Mindestens zwei Chatbots werden für den Vergleich benötigt.'
          : 'At least two chatbots are required for comparison.'}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Quick Presets + 2/8 Model Mode Toolbar */}
      <section
        aria-label={lang === 'de' ? 'Schnellauswahl und Vergleichsoptionen' : 'Quick presets and comparison options'}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-xs flex flex-wrap items-center justify-between gap-2"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold mr-1">
            Presets:
          </span>

          <button
            type="button"
            onClick={() => handleApplyPreset('newest')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              activePreset === 'newest'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={
              lang === 'de'
                ? `Die ${effectiveCount} aktuellsten erschienenen Modelle vergleichen`
                : `Compare the ${effectiveCount} most recently released models`
            }
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>
              {lang === 'de' ? `Neueste ${effectiveCount}` : `Newest ${effectiveCount}`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('same_price')}
            disabled={priceGroups.length === 0}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 ${
              activePreset === 'same_price'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={
              lang === 'de'
                ? 'Modelle desselben Preisniveaus vergleichen (klicken zum Durchwechseln: Gratis / Standard / Pro)'
                : 'Compare models in the same price tier (click to cycle: Free / Standard / Pro)'
            }
          >
            <Tag className="w-3 h-3 shrink-0" />
            <span>{lang === 'de' ? 'Gleiches Preisniveau' : 'Same Price Tier'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('same_family')}
            disabled={familyGroups.length === 0}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 ${
              activePreset === 'same_family'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={
              lang === 'de'
                ? 'Modelle einer Familie/Firma vergleichen (klicken zum Wechseln: OpenAI, Anthropic, Google, …)'
                : 'Compare models from the same family/company (click to cycle)'
            }
          >
            <Building2 className="w-3 h-3 shrink-0" />
            <span>{lang === 'de' ? 'Gleiche Familie' : 'Same Family'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('same_size')}
            disabled={sizeGroups.length === 0}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 ${
              activePreset === 'same_size'
                ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={
              lang === 'de'
                ? 'Modelle derselben Größenklasse vergleichen (klicken zum Wechseln: Planetary, Massive, Small, …)'
                : 'Compare models of the same size class (click to cycle)'
            }
          >
            <Ruler className="w-3 h-3 shrink-0" />
            <span>{lang === 'de' ? 'Gleiche Größenklasse' : 'Same Size Class'}</span>
          </button>

          {activePreset && (presetSubLabel || activePreset === 'newest') && (
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 pl-1">
              ·{' '}
              {activePreset === 'newest'
                ? lang === 'de'
                  ? 'Aktuellste Releases'
                  : 'Latest releases'
                : presetSubLabel}
              {activePreset !== 'newest' && (
                <span className="text-slate-600 dark:text-slate-400 font-normal">
                  {' '}
                  ({lang === 'de' ? 'nochmal klicken = nächstes' : 'click again = next'})
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSwapOrRotate}
            title={
              effectiveCount > 2
                ? lang === 'de'
                  ? `Positionen rotieren (A → B → … → ${COMPARE_SLOTS[effectiveCount - 1]})`
                  : `Rotate slots (A → B → … → ${COMPARE_SLOTS[effectiveCount - 1]})`
                : lang === 'de'
                ? 'Chatbots A und B tauschen'
                : 'Swap Chatbots A and B'
            }
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            {effectiveCount > 2 ? (
              <>
                <RotateCw className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                <span>
                  {effectiveCount === 3
                    ? 'A→B→C'
                    : `A→…→${COMPARE_SLOTS[effectiveCount - 1]}`}
                </span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                <span>A↔B</span>
              </>
            )}
          </button>

          {/* Model Count Slider (2 to 8 models) */}
          <div
            className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
            title={
              lang === 'de'
                ? 'Anzahl gleichzeitig verglichener Modelle (2 bis 8)'
                : 'Number of models compared side-by-side (2 to 8)'
            }
          >
            <button
              type="button"
              onClick={() => handleModelCountChange(effectiveCount - 1)}
              disabled={effectiveCount <= 2}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
              aria-label={lang === 'de' ? 'Ein Modell weniger' : 'One fewer model'}
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="range"
              min={2}
              max={maxCompareCount}
              step={1}
              value={effectiveCount}
              onChange={(e) => handleModelCountChange(Number(e.target.value))}
              aria-label={lang === 'de' ? 'Anzahl verglichener Modelle' : 'Number of compared models'}
              className="w-20 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 shrink-0"
            />
            <button
              type="button"
              onClick={() => handleModelCountChange(effectiveCount + 1)}
              disabled={effectiveCount >= maxCompareCount}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer shrink-0"
              aria-label={lang === 'de' ? 'Ein Modell mehr' : 'One more model'}
            >
              <Plus className="w-3 h-3" />
            </button>
            <span className="text-xs font-mono font-bold tabular-nums text-slate-800 dark:text-slate-100 pl-0.5 min-w-[70px] text-center">
              {effectiveCount} {lang === 'de' ? 'Modelle' : 'Models'}
            </span>
          </div>
        </div>
      </section>

      {/* Split Overview Cards (2 to 8 Responsive Cards) */}
      <section
        aria-label={lang === 'de' ? 'Modellauswahl und Übersicht' : 'Model Selection and Overview'}
        className={`grid gap-2 overflow-visible ${
          effectiveCount === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : effectiveCount === 3
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            : effectiveCount === 4
            ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
            : effectiveCount === 5
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
            : effectiveCount === 6
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}
      >
        {activeSlots.map(({ slot, model }, idx) => {
          const theme = SLOT_THEME[slot];
          const primaryScore = getScoreForMode(model, scoreMode);
          const rank = rankMap.get(model.id);
          const priceText = formatCompactPrice(model, lang);
          const storylineText = translateStoryline(model.storyline, lang)
            .replace(/^["„“'»«\s]+/, '')
            .replace(/["„“'»«\s]+$/, '')
            .trim();
          const chatUrl = model.chatLink || model.modelUrl;

          const scoreNewVal =
            model.scoreNew ?? model.scoreNewReported ?? (model.hasAll8Benchmarks ? model.scoreNewCalculated : null);
          const scoreOldVal = model.scoreOld ?? model.scoreOldReported ?? null;
          const scoreWorstVal = model.scoreWorstCase ?? model.scoreWorstCaseReported ?? null;

          const deltaVsTop =
            primaryScore !== null && topPrimaryScore !== null ? primaryScore - topPrimaryScore : null;
          const isLeader =
            primaryScore !== null &&
            topPrimaryScore !== null &&
            topPrimaryScore - primaryScore < 0.05 &&
            validPrimaries.length >= 2 &&
            overallLeaders.length < validPrimaries.length;
          const isAllTied =
            validPrimaries.length >= 2 && overallLeaders.length === validPrimaries.length;

          const otherMap = new Map<string, CompareSlot>();
          for (const s of activeSlots) {
            if (s.slot !== slot) otherMap.set(s.model.id, s.slot);
          }

          const isRightEdge =
            effectiveCount >= 2 &&
            ((effectiveCount === 2 && idx === 1) ||
              (effectiveCount === 3 && idx === 2) ||
              (effectiveCount === 4 && idx === 3) ||
              (effectiveCount === 5 && idx === 4) ||
              (effectiveCount === 6 && (idx === 2 || idx === 5)) ||
              (effectiveCount === 7 && (idx === 3 || idx === 6)) ||
              (effectiveCount === 8 && (idx === 3 || idx === 7)));

          return (
            <div
              key={slot}
              className={`p-2.5 flex flex-col gap-1.5 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs border-t-2 ${theme.borderTop}`}
            >
              {/* Selector + Compact Direct Links */}
              <div className="flex items-center gap-1">
                <div className="flex-1 min-w-0">
                  <CompareModelSelector
                    slot={slot}
                    selectedModel={model}
                    otherSlotsByModelId={otherMap}
                    models={pickerModels}
                    rankMap={rankMap}
                    scoreMode={scoreMode}
                    lang={lang}
                    alignRight={isRightEdge}
                    onSelect={(newId) => handleSelectSlot(idx, newId)}
                  />
                </div>
                {chatUrl && (
                  <a
                    href={chatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                    title={t.openChatbotApp}
                  >
                    <span>Chat</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                )}
                {model.isFreeApi && model.apiLink && (
                  <a
                    href={model.apiLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors shrink-0"
                    title={lang === 'de' ? 'Kostenloser API-Zugang' : 'Free API access'}
                  >
                    <Globe className="w-3 h-3" />
                    <span className="hidden sm:inline">API</span>
                  </a>
                )}
              </div>

              {/* Clean Compact Metadata Line */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-tight text-slate-600 dark:text-slate-400">
                {onSelectCompany ? (
                  <button
                    type="button"
                    onClick={() => onSelectCompany(model.companyName)}
                    className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 underline decoration-dotted underline-offset-2 cursor-pointer transition-colors"
                  >
                    {model.companyName}
                  </button>
                ) : (
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {model.companyName}
                  </span>
                )}
                {model.releaseDate && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono tabular-nums">{model.releaseDate}</span>
                  </>
                )}
                {rank && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      #{rank}
                    </span>
                  </>
                )}
                {priceText ? (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {priceText}
                    </span>
                  </>
                ) : !model.isPaid ? (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {lang === 'de' ? 'Gratis' : 'Free'}
                    </span>
                  </>
                ) : null}
                {model.isFreeApi && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      API
                    </span>
                  </>
                )}
                {!model.isAvailable && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      Hist.
                    </span>
                  </>
                )}
              </div>

              {/* Primary Composite Score + Gap to Leader */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/90 flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate">
                    {activeScoreLabel}
                  </span>
                  <span className={`text-xl font-mono tabular-nums font-extrabold tracking-tight leading-none ${theme.text}`}>
                    {primaryScore !== null ? formatNumber(primaryScore, 1) : '—'}
                  </span>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">/100</span>
                </div>

                {deltaVsTop !== null && (
                  <div
                    className={`text-xs font-mono tabular-nums font-bold flex items-center gap-1 shrink-0 ${
                      isLeader
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isLeader && <Trophy className="w-3 h-3 shrink-0" />}
                    <span>
                      {isLeader
                        ? lang === 'de'
                          ? '#1'
                          : 'Leader'
                        : isAllTied
                        ? lang === 'de'
                          ? 'Gleichstand'
                          : 'Tied'
                        : `${deltaVsTop.toFixed(1)} ${lang === 'de' ? 'Pkt.' : 'pts'}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Other Secondary Composite Scores (only the 2 non-active scores, avoiding redundancy with primary above) */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs leading-tight">
                {scoreMode !== 'new' && (
                  <div className="flex items-baseline justify-between gap-1 min-w-0" title={labelScoreNew}>
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                      {labelScoreNew}
                    </span>
                    <span className="font-mono tabular-nums font-bold shrink-0 text-slate-700 dark:text-slate-300">
                      {scoreNewVal !== null ? formatNumber(scoreNewVal, 1) : '—'}
                      {!model.hasAll8Benchmarks && scoreNewVal !== null && (
                        <span className="font-normal text-amber-600 dark:text-amber-400 ml-0.5">*</span>
                      )}
                    </span>
                  </div>
                )}
                {scoreMode !== 'old' && (
                  <div className="flex items-baseline justify-between gap-1 min-w-0" title={labelScoreOld}>
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                      {labelScoreOld}
                    </span>
                    <span className="font-mono tabular-nums font-bold shrink-0 text-slate-700 dark:text-slate-300">
                      {scoreOldVal !== null ? formatNumber(scoreOldVal, 1) : '—'}
                    </span>
                  </div>
                )}
                {scoreMode !== 'worstCase' && (
                  <div className="flex items-baseline justify-between gap-1 min-w-0" title={labelScoreWorst}>
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                      {labelScoreWorst}
                    </span>
                    <span className="font-mono tabular-nums font-bold shrink-0 text-slate-700 dark:text-slate-300">
                      {scoreWorstVal !== null ? formatNumber(scoreWorstVal, 1) : '—'}
                    </span>
                  </div>
                )}
              </div>

              {storylineText && (
                <p
                  className="text-xs text-slate-600 dark:text-slate-300 italic leading-tight border-t border-slate-100 dark:border-slate-800/80 pt-1 truncate"
                  title={storylineText}
                >
                  {storylineText}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Compact Summary Strip (Category Wins + Biggest Category Edge) */}
      <section
        aria-label={lang === 'de' ? 'Vergleichs-Zusammenfassung' : 'Comparison Summary'}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800"
      >
        {/* Category Wins Distribution */}
        <div className="p-3 sm:px-4 flex flex-col justify-between gap-1.5">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
            {scoreMode === 'old'
              ? lang === 'de'
                ? `Kategorie-Siege (${labelScoreOld} · 5 Benchmarks)`
                : `Category Wins (${labelScoreOld} · 5 Benchmarks)`
              : lang === 'de'
              ? 'Kategorie-Siege (D–K)'
              : 'Category Wins (D–K)'}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono tabular-nums text-xs sm:text-sm font-bold">
            {activeSlots.map(({ slot }, i) => (
              <React.Fragment key={slot}>
                {i > 0 && <span className="text-slate-400 dark:text-slate-700">·</span>}
                <span className={SLOT_THEME[slot].text}>
                  {slot}: {summaryStats.wins[slot]}
                </span>
              </React.Fragment>
            ))}
            <span className="text-slate-400 dark:text-slate-700">·</span>
            <span className="text-slate-600 dark:text-slate-400">
              {lang === 'de' ? 'Patt' : 'Tie'}: {summaryStats.ties}
            </span>
          </div>
          {summaryStats.comparableCount > 0 && (
            <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
              {activeSlots.map(({ slot }) =>
                summaryStats.wins[slot] > 0 ? (
                  <div
                    key={slot}
                    className={`${SLOT_THEME[slot].barActive} h-full`}
                    style={{ width: `${(summaryStats.wins[slot] / summaryStats.comparableCount) * 100}%` }}
                  />
                ) : null
              )}
              {summaryStats.ties > 0 && (
                <div
                  className="bg-slate-400 dark:bg-slate-600 h-full"
                  style={{ width: `${(summaryStats.ties / summaryStats.comparableCount) * 100}%` }}
                />
              )}
            </div>
          )}
        </div>

        {/* Peak Edge per Active Model */}
        <div className="p-3 sm:px-4 flex flex-col justify-between gap-1">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 font-semibold">
            {lang === 'de' ? 'Größte Einzelstärke' : 'Biggest Category Edge'}
          </div>
          <div
            className={
              activeSlots.length > 4
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-xs'
                : 'space-y-0.5 text-xs'
            }
          >
            {activeSlots.map(({ slot }) => {
              const edge = summaryStats.bestEdge[slot];
              const theme = SLOT_THEME[slot];
              return (
                <div key={slot} className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`font-mono font-bold shrink-0 ${theme.text}`}>{slot}:</span>
                    {edge ? (
                      <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                        {edge.label}
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">
                        {lang === 'de' ? 'kein Vorsprung' : 'no lead'}
                      </span>
                    )}
                  </div>
                  {edge && (
                    <span className={`font-mono tabular-nums font-bold shrink-0 ${theme.text}`}>
                      +{edge.margin.toFixed(1)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Unified Compact Category-by-Category Horizontal Comparison */}
      <section
        aria-label={
          lang === 'de'
            ? `Detaillierter Kategorienvergleich über alle ${categoryComparisons.length} Benchmarks`
            : `Detailed comparison across all ${categoryComparisons.length} benchmark categories`
        }
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden"
      >
        {/* Header Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 text-xs font-mono text-slate-800 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-3 min-h-[28px]">
            {/* Chart Type Switcher: Fixed Top-Left (Balken vs Spinnennetz) */}
            <div
              className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/90 p-0.5 font-mono shrink-0"
              role="group"
              aria-label={
                lang === 'de'
                  ? `Darstellungsform der ${categoryComparisons.length} Benchmarks`
                  : 'Benchmark chart view'
              }
            >
              <button
                type="button"
                onClick={() => setBenchmarkChartMode('bars')}
                aria-pressed={benchmarkChartMode === 'bars'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  benchmarkChartMode === 'bars'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{lang === 'de' ? 'Balken' : 'Bars'}</span>
              </button>
              <button
                type="button"
                onClick={() => setBenchmarkChartMode('radar')}
                aria-pressed={benchmarkChartMode === 'radar'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  benchmarkChartMode === 'radar'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Radar className="w-3.5 h-3.5" />
                <span>{lang === 'de' ? 'Spinnennetz' : 'Radar'}</span>
              </button>
            </div>

            <span className="uppercase tracking-wider font-semibold text-black dark:text-slate-100">
              {lang === 'de'
                ? `Alle ${categoryComparisons.length} Benchmarks im Direktvergleich`
                : `All ${categoryComparisons.length} Benchmarks Side-by-Side`}
              {scoreMode === 'old' ? ` (${labelScoreOld})` : ''}
            </span>
          </div>

          {benchmarkChartMode === 'bars' && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-h-[28px]">
              {activeSlots.map(({ slot, model }) => (
                <span key={slot} className={`font-bold ${SLOT_THEME[slot].text}`}>
                  {slot} · {model.displayName}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Benchmark Rows or Radar Chart */}
        {benchmarkChartMode === 'radar' ? (
          <CompareRadarChart
            categoryComparisons={categoryComparisons}
            activeSlots={activeSlots}
            primaryScores={primaryScores}
            rankMap={rankMap}
            lang={lang}
            expandedCategoryId={expandedCategoryId}
            onToggleExpandCategory={(categoryId) =>
              setExpandedCategoryId((prev) => (prev === categoryId ? null : categoryId))
            }
            onScrollToParagraph={onScrollToParagraph}
            sourceLinkLabel={t.sourceLink}
          />
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {/* Aligned 0–100% Scale Ruler */}
            <div className="hidden md:grid px-4 py-1.5 bg-slate-50/80 dark:bg-slate-950/50 grid-cols-[270px_minmax(0,1fr)] lg:grid-cols-[310px_minmax(0,1fr)] items-center gap-4">
              <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'de' ? 'Kategorie / Quelle' : 'Category / Source'}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 shrink-0" />
                <div className="flex-1 flex items-center justify-between text-xs font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
                <div className="w-20 sm:w-24 text-right text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                  Score
                </div>
              </div>
            </div>

            {categoryComparisons.map((row) => {
              const isExpanded = expandedCategoryId === row.comp.id;
              const anchorId = BENCHMARK_ANCHOR_MAP[row.comp.id] || 'note-col-d';

              return (
                <div
                  key={row.comp.id}
                  className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                >
                  <div className="px-4 py-2.5 grid grid-cols-1 md:grid-cols-[270px_minmax(0,1fr)] lg:grid-cols-[310px_minmax(0,1fr)] items-center gap-2.5 md:gap-4">
                    {/* Left: Category Label + Source + Leader */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCategoryId((prev) => (prev === row.comp.id ? null : row.comp.id))
                          }
                          className="group inline-flex items-center gap-1.5 max-w-full cursor-pointer focus:outline-hidden text-left"
                          title={
                            lang === 'de'
                              ? 'Methodik & Benchmark-Details anzeigen'
                              : 'Show methodology & benchmark details'
                          }
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: row.comp.color }}
                          />
                          <span className="text-[15px] font-sans font-bold text-black dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                            {row.label}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                          ) : (
                            <Info className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 group-hover:text-blue-500 shrink-0" />
                          )}
                        </button>

                        <div className="text-xs text-slate-700 dark:text-slate-300 pl-4 truncate">
                          {row.sourceName}
                        </div>
                      </div>

                      <div className="font-mono tabular-nums text-xs font-bold shrink-0 pt-0.5">
                        {row.winners.length === 0 ? (
                          <span className="text-slate-700 dark:text-slate-300">—</span>
                        ) : row.isTie ? (
                          <span className="text-slate-700 dark:text-slate-300">
                            {lang === 'de' ? 'Patt' : 'Tie'}
                          </span>
                        ) : (
                          <span className={SLOT_THEME[row.winners[0]].text}>
                            🏆 {row.winners.join('/')}
                            {row.margin > 0 ? ` +${row.margin.toFixed(1)}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Absolute Score Bars (0–100%) for A..H */}
                    <div className="space-y-1.5 min-w-0">
                      {row.entries.map((entry) => {
                        const theme = SLOT_THEME[entry.slot];
                        const isWinner =
                          row.winners.includes(entry.slot) && !row.isTie && row.winners.length > 0;
                        const widthPct =
                          entry.val !== null ? Math.max(0, Math.min(100, entry.val)) : 0;

                        return (
                          <div key={entry.slot} className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-5 h-5 rounded text-xs font-mono font-bold flex items-center justify-center shrink-0 ${theme.badgeBg}`}
                            >
                              {entry.slot}
                            </span>

                            <div className="relative flex-1 h-4 bg-slate-100 dark:bg-slate-800/90 rounded overflow-hidden border border-slate-300/80 dark:border-slate-700/70">
                              <div className="absolute inset-y-0 left-1/4 w-px bg-slate-300/60 dark:bg-slate-700/60 pointer-events-none" />
                              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300/60 dark:bg-slate-700/60 pointer-events-none" />
                              <div className="absolute inset-y-0 left-3/4 w-px bg-slate-300/60 dark:bg-slate-700/60 pointer-events-none" />

                              {entry.val !== null && (
                                <div
                                  className={`relative z-10 h-full rounded-r-xs transition-all duration-300 ${
                                    isWinner || row.isTie ? theme.barActive : theme.barDim
                                  }`}
                                  style={{ width: `${widthPct}%` }}
                                />
                              )}
                            </div>

                            <div className="w-20 sm:w-24 text-right font-mono tabular-nums text-[15px] shrink-0">
                              {entry.val !== null ? (
                                <span
                                  className={
                                    isWinner
                                      ? `font-extrabold ${theme.text}`
                                      : 'font-semibold text-slate-900 dark:text-slate-200'
                                  }
                                >
                                  {formatNumber(entry.val, 1)}%
                                </span>
                              ) : (
                                <span className="font-semibold text-slate-700 dark:text-slate-400">
                                  —
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expandable Category Details Drawer */}
                  {isExpanded && (
                    <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-800 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 max-w-3xl">
                        <p className="leading-relaxed">
                          {(lang === 'de' ? row.comp.descriptionDe : row.comp.descriptionEn)
                            .replace(/\s*Nur im Zeitreihendiagramm verfügbar\.?/i, '')
                            .replace(/\s*Available exclusively in the timeline chart\.?/i, '')}
                        </p>
                        <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {lang === 'de' ? 'Berechnung:' : 'Formula:'}{' '}
                          <span className="font-semibold text-slate-900 dark:text-slate-200">
                            {row.comp.formulaDesc}
                          </span>
                          {row.isRescaled && (
                            <span>
                              {' · '}
                              {row.comp.id === 'trickQuestionsOld'
                                ? lang === 'de'
                                  ? 'Skaliert von 16,7% Rate-Basis auf 0–100%'
                                  : 'Rescaled from 16.7% guessing floor to 0–100%'
                                : lang === 'de'
                                ? 'Skaliert von 29% Rate-Basis auf 0–100%'
                                : 'Rescaled from 29% guessing floor to 0–100%'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {row.sourceUrl && (
                          <a
                            href={row.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                          >
                            <span>{t.sourceLink}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {onScrollToParagraph && (
                          <button
                            type="button"
                            onClick={() => onScrollToParagraph(anchorId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{lang === 'de' ? 'Methodik unten' : 'Notes below'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Historical Sub-Benchmarks (Columns V-Y, Synced Row-2 Labels) */}
      {scoreMode !== 'old' && hasAnyHistorical && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHistoricalBenchmarks((prev) => !prev)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>
                {lang === 'de'
                  ? `Historische Einzel-Benchmarks (${labelScoreOld}, Spalten V–Y)`
                  : `Historical Sub-Benchmarks (${labelScoreOld}, Columns V–Y)`}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-slate-400">
              <span>
                {showHistoricalBenchmarks
                  ? lang === 'de'
                    ? 'Ausblenden'
                    : 'Hide'
                  : lang === 'de'
                  ? 'Anzeigen'
                  : 'Show'}
              </span>
              {showHistoricalBenchmarks ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {showHistoricalBenchmarks && (
            <div className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
              {historicalComparisons.map((row) => (
                <div
                  key={row.comp.id}
                  className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-[240px_minmax(0,1fr)] items-center gap-2 text-xs"
                >
                  <div>
                    <div className="text-[15px] font-sans font-semibold text-black dark:text-slate-100">
                      {row.label}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {row.comp.sourceName}
                    </div>
                  </div>
                  <div
                    className={`grid ${
                      effectiveCount === 2
                        ? 'grid-cols-2'
                        : effectiveCount === 3
                        ? 'grid-cols-3'
                        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                    } gap-2 font-mono tabular-nums`}
                  >
                    {row.entries.map((entry) => {
                      const theme = SLOT_THEME[entry.slot];
                      const isWin =
                        row.winners.includes(entry.slot) && !row.isTie && row.winners.length > 0;
                      return (
                        <div
                          key={entry.slot}
                          className="flex items-center justify-between px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60"
                        >
                          <span className={`font-bold ${theme.text}`}>{entry.slot}</span>
                          <span
                            className={
                              entry.val === null
                                ? 'text-slate-600 dark:text-slate-400'
                                : isWin
                                ? `font-extrabold ${theme.text}`
                                : 'font-semibold text-slate-800 dark:text-slate-200'
                            }
                          >
                            {entry.val !== null ? `${formatNumber(entry.val, 1)}%` : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
