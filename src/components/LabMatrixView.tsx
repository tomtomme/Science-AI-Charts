import React, { useState, useMemo } from 'react';
import { LabEntry, ModelRecord } from '../types';
import { Search, ExternalLink, Cpu, Wrench, Terminal, Layers } from 'lucide-react';

interface LabMatrixViewProps {
  labs: LabEntry[];
  models?: ModelRecord[];
  onSelectLabForBenchmark?: (creatorName: string) => void;
  lang?: 'de' | 'en';
}

type LabGroup = 'all' | 'top10' | 'contender' | 'tweakers' | 'small' | 'harness';
type WeightsFilter = 'all' | 'open' | 'hybrid' | 'closed';

interface TierDef {
  key: keyof LabEntry['parameterSizes'];
  nameEn: string;
  nameDe: string;
  paramCount: string;
  level: number; // 1 to 5 for mini scale meter
  colorClass: string;
}

// Ordered strictly from smallest to largest parameter size
const PARAMETER_TIERS: TierDef[] = [
  { key: 'micro', nameEn: 'Micro', nameDe: 'Micro', paramCount: '< 0.5B Parameters', level: 1, colorClass: 'bg-emerald-500' },
  { key: 'mini', nameEn: 'Mini', nameDe: 'Mini', paramCount: '< 2B Parameters', level: 1, colorClass: 'bg-emerald-500' },
  { key: 'tiny', nameEn: 'Tiny', nameDe: 'Tiny', paramCount: '< 8B Parameters', level: 2, colorClass: 'bg-teal-500' },
  { key: 'small', nameEn: 'Small', nameDe: 'Small', paramCount: '< 32B Parameters', level: 2, colorClass: 'bg-cyan-500' },
  { key: 'medium', nameEn: 'Medium', nameDe: 'Medium', paramCount: '< 128B Parameters', level: 3, colorClass: 'bg-blue-500' },
  { key: 'large', nameEn: 'Large', nameDe: 'Large', paramCount: '< 256B Parameters', level: 3, colorClass: 'bg-indigo-500' },
  { key: 'massive', nameEn: 'Massive', nameDe: 'Massive', paramCount: '< 512B Parameters', level: 4, colorClass: 'bg-violet-500' },
  { key: 'colossal', nameEn: 'Colossal', nameDe: 'Colossal', paramCount: '< 1.5T Parameters', level: 4, colorClass: 'bg-purple-500' },
  { key: 'planetary', nameEn: 'Planetary', nameDe: 'Planetary', paramCount: '< 5T Parameters', level: 5, colorClass: 'bg-rose-500' },
  { key: 'singularity', nameEn: 'Singularity', nameDe: 'Singularity', paramCount: '< 15T Parameters', level: 5, colorClass: 'bg-rose-600' },
  { key: 'godTier', nameEn: 'God Tier', nameDe: 'God Tier', paramCount: '< 45T Parameters', level: 5, colorClass: 'bg-amber-500' },
];

/**
 * Visual mini scale meter gauge indicating model parameter size (1 to 5 bars)
 */
const MiniScaleMeter: React.FC<{ level: number; colorClass?: string }> = ({
  level,
  colorClass = 'bg-blue-500',
}) => {
  return (
    <div className="flex items-end gap-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((bar) => {
        const heightPct = `${bar * 20}%`;
        const isActive = bar <= level;
        return (
          <span
            key={bar}
            className={`w-0.5 rounded-full transition-colors ${
              isActive ? colorClass : 'bg-slate-200 dark:bg-slate-700'
            }`}
            style={{ height: heightPct }}
          />
        );
      })}
    </div>
  );
};

export const LabMatrixView: React.FC<LabMatrixViewProps> = ({
  labs,
  onSelectLabForBenchmark,
  lang = 'de',
}) => {
  // Default to 'all' as requested
  const [activeGroup, setActiveGroup] = useState<LabGroup>('all');
  const [weightsFilter, setWeightsFilter] = useState<WeightsFilter>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null);

  // Group counts
  const allCount = labs.length;
  const top10Count = labs.filter((l) => l.group === 'top10').length;
  const contenderCount = labs.filter((l) => l.group === 'contender').length;
  const tweakersCount = labs.filter((l) => l.group === 'tweakers').length;
  const smallCount = labs.filter((l) => l.group === 'small').length;
  const harnessCount = labs.filter((l) => l.group === 'harness').length;

  const handleGroupChange = (group: LabGroup) => {
    setActiveGroup(group);
    if (selectedCountry !== 'all') {
      const targetLabs = group === 'all' ? labs : labs.filter((l) => l.group === group);
      const hasCountry = targetLabs.some((l) => l.country === selectedCountry);
      if (!hasCountry) {
        setSelectedCountry('all');
      }
    }
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

  // Filtered labs list based on Group, Weights Filter, Country, and Search Query
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

      // 4. Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
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

    // If filter is "all countries", sorting should be alphabetical by vendor name
    if (selectedCountry === 'all') {
      return [...list].sort((a, b) =>
        a.creator.localeCompare(b.creator, undefined, { sensitivity: 'base', numeric: true })
      );
    }

    return list;
  }, [labs, activeGroup, weightsFilter, selectedCountry, searchQuery]);

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏢</span>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {lang === 'de' ? 'LLM-Labs & Modell-Ökosystem' : 'LLM Labs & Model Ecosystem'}
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            {lang === 'de'
              ? 'Strukturierte Übersicht der führenden LLM-Entwickler, ihrer Modellfamilien nach Größenstufen (von Micro/Small bis Singularity) und ihrer Software- & Agenten-Ökosysteme.'
              : 'Structured overview of leading LLM developers, their model families stacked by size tiers (from Micro/Small to Singularity), and their agent software ecosystems.'}
          </p>
        </div>

        {/* Source Link */}
        <div className="shrink-0 flex items-center gap-2">
          <a
            href="https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/edit?gid=355721692#gid=355721692"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title={lang === 'de' ? 'Original-Tabelle in neuem Tab öffnen' : 'Open original spreadsheet in new tab'}
          >
            <span>{lang === 'de' ? 'Original-Sheet' : 'Original Sheet'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Control Bar: Extended Tabs, Open/Closed Toggle & Search */}
      <div className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Segmented Filter: "All Labs" is first / default on the far left */}
          <div className="flex flex-wrap items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              type="button"
              onClick={() => handleGroupChange('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {lang === 'de' ? `Alle Labs (${allCount})` : `All Labs (${allCount})`}
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
              {`Top 10 LLM Labs (${top10Count})`}
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
              {`24 Contenders (${contenderCount})`}
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
              {`12 Model Tweakers (${tweakersCount})`}
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
              {`Small Model Labs (${smallCount})`}
            </button>
            <button
              type="button"
              onClick={() => handleGroupChange('harness')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                activeGroup === 'harness'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {`Harness Only Labs (${harnessCount})`}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Open / Hybrid / Closed Weights Segmented Toggle Button */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>{lang === 'de' ? 'Gewichte:' : 'Weights:'}</span>
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
              <button
                type="button"
                onClick={() => setWeightsFilter('open')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  weightsFilter === 'open'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
                title={lang === 'de' ? 'Nur Open-Weights Labs anzeigen' : 'Show only open weights labs'}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setWeightsFilter('hybrid')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  weightsFilter === 'hybrid'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}
                title={lang === 'de' ? 'Nur hybride Labs (Open & Closed) anzeigen' : 'Show only hybrid labs (open & closed)'}
              >
                Hybrid
              </button>
              <button
                type="button"
                onClick={() => setWeightsFilter('closed')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  weightsFilter === 'closed'
                    ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={lang === 'de' ? 'Nur Closed-Weights Labs anzeigen' : 'Show only closed weights labs'}
              >
                Closed
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'de'
                    ? 'Lab, Modellfamilie, Tooling oder Land filtern...'
                    : 'Filter by lab, model family, tooling or country...'
                }
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Country Filter Strip (Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs scrollbar-thin">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <span>🌐</span>
            <span>{lang === 'de' ? 'Land:' : 'Country:'}</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedCountry('all')}
            title={lang === 'de' ? 'Alle Länder (alphabetisch nach Vendor-Name sortiert)' : 'All Countries (sorted alphabetically by vendor name)'}
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
                <span>{c.flag}</span>
                <span>{c.country}</span>
                <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  ({c.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Lab Cards (Responsive 1 to 4 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredLabs.map((lab) => {
          const isExpanded = expandedLabId === lab.id;

          // Collect available model size tiers for this lab, strictly ordered from smallest to largest
          const availableTiers = PARAMETER_TIERS.filter((tier) => {
            const val = lab.parameterSizes[tier.key];
            return Boolean(val && val.trim() && val.trim() !== '-');
          });

          return (
            <div
              key={lab.id}
              className="flex flex-col justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-xs hover:shadow-md"
            >
              <div>
                {/* Lab Card Header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none" title={lab.country}>
                      {lab.countryFlag}
                    </span>
                    <div>
                      {onSelectLabForBenchmark ? (
                        <button
                          type="button"
                          onClick={() => onSelectLabForBenchmark(lab.creator)}
                          className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors text-left cursor-pointer"
                          title={lang === 'de' ? `Benchmark-Modelle von ${lab.creator} anzeigen` : `Show benchmark models for ${lab.creator}`}
                        >
                          <span>{lab.creator}</span>
                        </button>
                      ) : (
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {lab.creator}
                        </h3>
                      )}
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {lab.country}
                      </div>
                    </div>
                  </div>

                  {/* Weights Badge */}
                  {lab.weightsType && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                        lab.weightsType === 'open'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : lab.weightsType === 'hybrid'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                      title={
                        lab.weightsType === 'open'
                          ? 'OpenWeights'
                          : lab.weightsType === 'hybrid'
                          ? 'Open & Closed Weights Modelle'
                          : 'ClosedWeights (proprietär)'
                      }
                    >
                      {lab.weightsType === 'open' ? 'Open' : lab.weightsType === 'hybrid' ? 'Hybrid' : 'Closed'}
                    </span>
                  )}
                </div>

                {/* Primary Engine / ChatBot name */}
                {lab.engineName && lab.engineName !== '-' && (
                  <div className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                      {lang === 'de' ? 'Engine / Modell-Familie' : 'Engine / Model Family'}
                    </div>
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {lab.engineName}
                    </div>
                  </div>
                )}

                {/* Group: Harness Only Labs Special Overview */}
                {lab.group === 'harness' && (
                  <div className="space-y-2 mb-3">
                    {lab.harness && (
                      <div className="bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-200 dark:border-blue-900/60">
                        <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                          Harness
                        </div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {lab.harness}
                        </div>
                      </div>
                    )}
                    {lab.form && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-500 text-[11px]">Form:</span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium text-slate-800 dark:text-slate-200">
                          {lab.form}
                        </span>
                      </div>
                    )}
                    {lab.note && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Info: </span>
                        <span>{lab.note}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Group: Model Tweakers - Based on OpenWeights note */}
                {lab.group === 'tweakers' && lab.basedOn && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 mb-2.5">
                    <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                      {lang === 'de' ? 'Basiert auf OpenWeights' : 'Based on Open Weights'}
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {lab.basedOn}
                    </div>
                  </div>
                )}

                {/* Famous for / Specialties / Focus */}
                {(lab.famousFor || lab.specialties) && lab.specialties !== `Based on ${lab.basedOn}` && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2.5 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {lab.specialties ? (lang === 'de' ? 'Besonderheiten: ' : 'Focus: ') : (lang === 'de' ? 'Bekannt für: ' : 'Famous for: ')}
                    </span>
                    <span>{lab.famousFor || lab.specialties}</span>
                  </div>
                )}

                {/* Vertical Model Stacking: Top-to-Bottom from Smallest to Largest */}
                {availableTiers.length > 0 && (
                  <div className="space-y-1 mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-slate-400" />
                        <span>{lang === 'de' ? 'Modelle nach Größe' : 'Models by Size'}</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">
                        {lang === 'de' ? 'klein → groß' : 'small → large'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 pt-0.5">
                      {availableTiers.map((tier) => {
                        const modelVal = lab.parameterSizes[tier.key];
                        if (!modelVal) return null;

                        // Check open/closed status for this specific size or lab
                        const isOpen =
                          lab.openWeights && lab.openWeights[tier.key] !== undefined
                            ? lab.openWeights[tier.key]
                            : lab.weightsType === 'open';

                        return (
                          <div
                            key={tier.key}
                            className="group relative flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800 transition-all text-xs"
                          >
                            {/* Left: Mini Scale Meter + Friendly Tier Name */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <MiniScaleMeter level={tier.level} colorClass={tier.colorClass} />
                              <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200 cursor-help">
                                {lang === 'de' ? tier.nameDe : tier.nameEn}
                              </span>

                              {/* Tooltip on hover showing parameter count */}
                              <div className="absolute left-2 -top-8 hidden group-hover:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-lg text-[10px] font-mono pointer-events-none z-30 whitespace-nowrap">
                                <span className="font-bold">{lang === 'de' ? tier.nameDe : tier.nameEn}:</span>
                                <span>{tier.paramCount}</span>
                              </div>
                            </div>

                            {/* Center: Model Name(s) */}
                            <span
                              className="font-mono text-[11px] text-slate-800 dark:text-slate-200 text-right truncate flex-1 font-semibold"
                              title={modelVal}
                            >
                              {modelVal}
                            </span>

                            {/* Right: Open / Closed Badge */}
                            {isOpen !== undefined && (
                              <span
                                className={`text-[8.5px] font-semibold px-1.5 py-0.2 rounded-full border shrink-0 ${
                                  isOpen
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}
                              >
                                {isOpen ? 'Open' : 'Closed'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tooling / Agents Collapsible Details */}
                {(lab.codingAgent || lab.dailyAgent || lab.harnessSdk || lab.subscriptionTiers) && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setExpandedLabId(isExpanded ? null : lab.id)}
                      className="w-full flex items-center justify-between py-1 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold cursor-pointer transition-colors group select-none"
                    >
                      <span className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span className="group-hover:underline">Tooling & Agent-Stack</span>
                      </span>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal normal-case tracking-normal flex items-center gap-1">
                        <span>{isExpanded ? (lang === 'de' ? 'ausblenden' : 'hide') : (lang === 'de' ? 'Details' : 'Details')}</span>
                        <span className="text-[9px]">{isExpanded ? '▲' : '▼'}</span>
                      </span>
                    </button>

                    {/* Full tooling and agent stack revealed when clicked */}
                    {isExpanded && (
                      <div className="text-xs space-y-1.5 pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg transition-all">
                        {lab.codingAgent && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-slate-400 text-[11px] shrink-0 font-medium">Coding:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lab.codingAgent}
                            </span>
                          </div>
                        )}
                        {lab.dailyAgent && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-slate-400 text-[11px] shrink-0 font-medium">Daily:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lab.dailyAgent}
                            </span>
                          </div>
                        )}
                        {lab.harnessSdk && (
                          <div className="flex items-start gap-1.5 pt-0.5">
                            <span className="text-slate-400 text-[11px] shrink-0 font-medium">Harness/SDK:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lab.harnessSdk}
                            </span>
                          </div>
                        )}
                        {lab.subscriptionTiers && (
                          <div className="flex items-start gap-1.5 pt-0.5">
                            <span className="text-slate-400 text-[11px] shrink-0 font-medium">Abo-Stufen:</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lab.subscriptionTiers}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
              setActiveGroup('all');
              setSelectedCountry('all');
              setWeightsFilter('all');
            }}
            className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            {lang === 'de' ? 'Alle Filter zurücksetzen' : 'Reset all filters'}
          </button>
        </div>
      )}
    </div>
  );
};
