import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import {
  ActiveBenchmarkKey,
  BenchmarkComponent,
  BenchmarkWeights,
  ExplosionMode,
  ModelRecord,
  ModelScope,
  PriceFilter,
  ScoreMode,
  SortField,
} from '../types';
import { LoadedDatasets } from '../services/dataService';
import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { matchesSearchQuery } from '../utils/searchUtils';
import { DEFAULT_BENCHMARK_WEIGHTS, applyBenchmarkWeightsToModels } from '../utils/weighting';
import { extractFrontierPoints } from '../utils/mathRegression';

export function useBenchmarkFilters(
  loadedData: LoadedDatasets,
  onWeightsActivated?: () => void
) {
  const [scoreMode, setScoreMode] = useState<ScoreMode>('new');
  const [modelScope, setModelScope] = useState<ModelScope>('current');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('paid');
  const [categoryInfoComp, setCategoryInfoComp] = useState<BenchmarkComponent | null>(null);

  const [userAdjustedTopCount, setUserAdjustedTopCount] = useState<boolean>(false);
  const [userTopCount, setUserTopCount] = useState<number>(9999);

  const [explosionMode, setExplosionMode] = useState<ExplosionMode>('hover');
  const [sortBy, setSortBy] = useState<SortField>('score');
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Global custom benchmark weighting (shared across Ranking, Compare, History, Analysis & Ecosystem)
  const [showWeighting, setShowWeighting] = useState<boolean>(false);
  const [benchmarkWeights, setBenchmarkWeights] = useState<BenchmarkWeights>(() => ({
    ...DEFAULT_BENCHMARK_WEIGHTS,
  }));

  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const handleBenchmarkWeightChange = useCallback(
    (key: ActiveBenchmarkKey, value: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      setBenchmarkWeights((prev) => ({ ...prev, [key]: clamped }));
      setScoreMode('new');
      setSelectedCategoryIndex(0);
      setCategoryInfoComp(null);
      onWeightsActivated?.();
    },
    [onWeightsActivated]
  );

  const handleApplyBenchmarkWeights = useCallback(
    (nextWeights: BenchmarkWeights) => {
      setBenchmarkWeights({ ...nextWeights });
      setScoreMode('new');
      setSelectedCategoryIndex(0);
      setCategoryInfoComp(null);
      onWeightsActivated?.();
    },
    [onWeightsActivated]
  );

  const handleResetBenchmarkWeights = useCallback(() => {
    setBenchmarkWeights({ ...DEFAULT_BENCHMARK_WEIGHTS });
  }, []);

  const deferredBenchmarkWeights = useDeferredValue(benchmarkWeights);
  const deferredSearchFilter = useDeferredValue(searchFilter);

  const weightedDataset = useMemo(
    () =>
      applyBenchmarkWeightsToModels(
        loadedData.newModels,
        loadedData.allModels,
        deferredBenchmarkWeights
      ),
    [loadedData.newModels, loadedData.allModels, deferredBenchmarkWeights]
  );

  // When searching by text, search across all models (not just currently available ones)
  const effectiveModelScope: ModelScope =
    deferredSearchFilter.trim().length > 0 ? 'all' : modelScope;

  const currentModels = useMemo(() => {
    let base: ModelRecord[];
    if (selectedCategoryIndex === 0) {
      base =
        scoreMode === 'new'
          ? weightedDataset.newModels
          : scoreMode === 'old'
          ? loadedData.oldModels
          : loadedData.worstCaseModels;
    } else {
      const comp = BENCHMARK_COMPONENTS[selectedCategoryIndex - 1];
      base = weightedDataset.allModels.filter((m) => m.rawScores[comp.key] !== null);
    }

    let list = effectiveModelScope === 'current' ? base.filter((m) => m.isAvailable) : base;

    if (priceFilter === 'free_api') {
      list = list.filter((m) => m.isFreeApi);
    } else if (priceFilter === 'free_chat' || priceFilter === 'free') {
      list = list.filter((m) => !m.isPaid || m.isFreeApi);
    } else if (priceFilter === 'paid') {
      list = list.filter((m) => m.isPaid);
    }

    return list;
  }, [scoreMode, selectedCategoryIndex, effectiveModelScope, loadedData, weightedDataset, priceFilter]);

  const fullTimelineModels = useMemo(() => {
    return weightedDataset.allModels;
  }, [weightedDataset.allModels]);

  const correlationsFrontierCount = useMemo(() => {
    const eligible = fullTimelineModels
      .filter((m) => {
        const sc = m.scoreOld ?? m.scoreNew ?? m.scoreNewReported;
        return typeof sc === 'number' && sc > 0;
      })
      .map((m) => ({
        id: m.id,
        timestamp: new Date(m.releaseDate).getTime(),
        score: (m.scoreOld ?? m.scoreNew ?? m.scoreNewReported) as number,
      }));
    eligible.sort((a, b) => a.timestamp - b.timestamp);
    return extractFrontierPoints(eligible as any).length;
  }, [fullTimelineModels]);

  const hasFilterActive =
    deferredSearchFilter.trim().length > 0 ||
    selectedFamilies.length > 0 ||
    selectedCompany !== null;

  const matchesFilter = useCallback(
    (model: ModelRecord) => {
      const targetText = `${model.displayName} ${model.name} ${model.companyName} ${model.creatorClean} ${model.creator || ''}`;
      const matchesSearch = matchesSearchQuery(deferredSearchFilter, targetText);

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
    [deferredSearchFilter, selectedFamilies, selectedCompany]
  );

  const matchCount = useMemo(() => {
    if (!hasFilterActive) return currentModels.length;
    return currentModels.filter(matchesFilter).length;
  }, [currentModels, hasFilterActive, matchesFilter]);

  useEffect(() => {
    setUserAdjustedTopCount(false);
  }, [
    deferredSearchFilter,
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

  const setTopCount = useCallback(
    (n: number) => {
      if (n >= matchCount) {
        setUserAdjustedTopCount(false);
        setUserTopCount(matchCount);
      } else {
        setUserAdjustedTopCount(true);
        setUserTopCount(n);
      }
    },
    [matchCount]
  );

  const displayedModels = useMemo(() => {
    let list = currentModels;
    if (hasFilterActive) {
      list = list.filter(matchesFilter);
    }

    const activeComp = selectedCategoryIndex > 0 ? BENCHMARK_COMPONENTS[selectedCategoryIndex - 1] : null;
    const sorted = [...list];

    if (sortBy === 'date') {
      sorted.sort((a, b) => {
        const cmp = (b.releaseDate || '').localeCompare(a.releaseDate || '');
        if (cmp !== 0) return cmp;
        return (b.score ?? 0) - (a.score ?? 0);
      });
    } else {
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

  const handleExplosionModeChange = useCallback(
    (mode: ExplosionMode) => {
      setExplosionMode(mode);
      if (mode === 'off' && selectedCategoryIndex === 0) {
        setCategoryInfoComp(null);
      }
    },
    [selectedCategoryIndex]
  );

  const resetBenchmarkFilters = useCallback(() => {
    setScoreMode('new');
    setModelScope('current');
    setPriceFilter('paid');
    setUserTopCount(9999);
    setUserAdjustedTopCount(false);
    setExplosionMode('hover');
    setSortBy('score');
    setSelectedCategoryIndex(0);
    setShowAdvanced(false);
    setShowWeighting(false);
    setBenchmarkWeights({ ...DEFAULT_BENCHMARK_WEIGHTS });
    setSearchFilter('');
    setSelectedFamilies([]);
    setSelectedCompany(null);
    setCategoryInfoComp(null);
  }, []);

  return {
    scoreMode,
    setScoreMode,
    modelScope,
    setModelScope,
    effectiveModelScope,
    priceFilter,
    setPriceFilter,
    categoryInfoComp,
    setCategoryInfoComp,
    explosionMode,
    handleExplosionModeChange,
    sortBy,
    setSortBy,
    selectedCategoryIndex,
    setSelectedCategoryIndex,
    showAdvanced,
    setShowAdvanced,
    showWeighting,
    setShowWeighting,
    benchmarkWeights,
    deferredBenchmarkWeights,
    weightedDataset,
    handleBenchmarkWeightChange,
    handleApplyBenchmarkWeights,
    handleResetBenchmarkWeights,
    searchFilter,
    deferredSearchFilter,
    setSearchFilter,
    selectedFamilies,
    setSelectedFamilies,
    selectedCompany,
    setSelectedCompany,
    handleToggleFamily,
    handleClearFamilies,
    handleSelectCompany,
    topCount,
    setTopCount,
    maxAvailableModels,
    matchCount,
    currentModels,
    displayedModels,
    fullTimelineModels,
    correlationsFrontierCount,
    resetBenchmarkFilters,
  };
}
