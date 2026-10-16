import React, { useState, useMemo } from 'react';
import { LabEntry, ModelRecord } from '../types';
import { Search, ExternalLink, Cpu, Wrench, Sparkles, Terminal } from 'lucide-react';

interface LabMatrixViewProps {
  labs: LabEntry[];
  models: ModelRecord[];
  onSelectLabForBenchmark: (creatorName: string) => void;
  lang?: 'de' | 'en';
}

type LabGroup = 'top10' | 'contender' | 'tweakers' | 'small' | 'harness' | 'all';

export const LabMatrixView: React.FC<LabMatrixViewProps> = ({
  labs,
  models,
  onSelectLabForBenchmark,
  lang = 'de',
}) => {
  const [activeGroup, setActiveGroup] = useState<LabGroup>('top10');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null);

  // Compute how many models in the current benchmark match each lab
  const labBenchmarkStats = useMemo(() => {
    const stats: Record<string, { count: number; bestScore: number; bestModel: string }> = {};

    labs.forEach((lab) => {
      const creatorLower = lab.creator.toLowerCase();
      const engineLower = (lab.engineName || '').toLowerCase();

      const matched = models.filter((m) => {
        const cClean = (m.creatorClean || '').toLowerCase();
        const cName = (m.companyName || '').toLowerCase();
        const mName = (m.displayName || m.name || '').toLowerCase();

        // Specific matching logic
        if (creatorLower.includes('anthropic') && (cClean.includes('anthropic') || mName.includes('claude'))) return true;
        if (creatorLower.includes('google') && (cClean.includes('google') || mName.includes('gemini') || mName.includes('gemma'))) return true;
        if (creatorLower.includes('meta') && (cClean.includes('meta') || mName.includes('muse') || mName.includes('llama'))) return true;
        if (creatorLower.includes('nvidia') && (cClean.includes('nvidia') || mName.includes('nemotron'))) return true;
        if ((creatorLower.includes('openai') || creatorLower.includes('microsoft')) && (cClean.includes('openai') || mName.includes('chatgpt') || mName.includes('gpt'))) return true;
        if ((creatorLower.includes('spacex') || creatorLower.includes('xai')) && (cClean.includes('xai') || cClean.includes('spacex') || mName.includes('grok'))) return true;
        if (creatorLower.includes('alibaba') && (cClean.includes('alibaba') || mName.includes('qwen'))) return true;
        if (creatorLower.includes('deepseek') && (cClean.includes('deepseek') || mName.includes('deepseek'))) return true;
        if (creatorLower.includes('moonshot') && (cClean.includes('moonshot') || mName.includes('kimi'))) return true;
        if ((creatorLower.includes('z.ai') || creatorLower.includes('zhipu')) && (cClean.includes('z.ai') || cClean.includes('zhipu') || mName.includes('glm'))) return true;
        if (creatorLower.includes('mistral') && (cClean.includes('mistral') || mName.includes('mistral'))) return true;
        if (creatorLower.includes('sapiens') && (cClean.includes('sapiens') || mName.includes('agnes'))) return true;
        if (creatorLower.includes('xiaomi') && (cClean.includes('xiaomi') || mName.includes('mimo'))) return true;
        if (creatorLower.includes('stepfun') && (cClean.includes('stepfun') || mName.includes('step'))) return true;
        if (creatorLower.includes('minimax') && (cClean.includes('minimax') || mName.includes('minimax'))) return true;
        if (creatorLower.includes('baidu') && (cClean.includes('baidu') || mName.includes('ernie'))) return true;
        if (creatorLower.includes('cohere') && (cClean.includes('cohere') || mName.includes('command'))) return true;
        if (creatorLower.includes('hugging face') && (cClean.includes('hugging') || mName.includes('smollm'))) return true;
        if (creatorLower.includes('ibm') && (cClean.includes('ibm') || mName.includes('granite'))) return true;

        // General fallback match
        return cClean.includes(creatorLower) || cName.includes(creatorLower) || (engineLower && mName.includes(engineLower));
      });

      if (matched.length > 0) {
        const best = matched.reduce((max, cur) => (cur.score > max.score ? cur : max), matched[0]);
        stats[lab.id] = {
          count: matched.length,
          bestScore: best.score,
          bestModel: best.displayName || best.name,
        };
      } else {
        stats[lab.id] = { count: 0, bestScore: 0, bestModel: '' };
      }
    });

    return stats;
  }, [labs, models]);

  // Group counts
  const top10Count = labs.filter((l) => l.group === 'top10').length;
  const contenderCount = labs.filter((l) => l.group === 'contender').length;
  const tweakersCount = labs.filter((l) => l.group === 'tweakers').length;
  const smallCount = labs.filter((l) => l.group === 'small').length;
  const harnessCount = labs.filter((l) => l.group === 'harness').length;

  // Filtered labs list
  const filteredLabs = useMemo(() => {
    return labs.filter((lab) => {
      // Group filter
      if (activeGroup !== 'all' && lab.group !== activeGroup) return false;

      // Search query
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
  }, [labs, activeGroup, searchQuery]);

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Intro Header */}
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
              ? 'Strukturierte Übersicht der führenden LLM-Entwickler, ihrer Modell-Größenklassen (<32B bis 15T+) und ihrer Software- & Agenten-Ökosysteme. Klicke auf ein Lab, um dessen Modelle im Wissenschafts-IQ Benchmark anzuzeigen.'
              : 'Structured overview of leading LLM developers, parameter size tiers (<32B to 15T+), and agent software ecosystems. Click on any lab to cross-reference with the Science-IQ benchmark.'}
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

      {/* Control Bar: Extended Tabs & Search */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
        {/* Segmented Filter with 5 sections + All */}
        <div className="flex flex-wrap items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            onClick={() => setActiveGroup('top10')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              activeGroup === 'top10'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {`Top 10 LLM Labs (${top10Count})`}
          </button>
          <button
            onClick={() => setActiveGroup('contender')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              activeGroup === 'contender'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {`24 Contenders (${contenderCount})`}
          </button>
          <button
            onClick={() => setActiveGroup('tweakers')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              activeGroup === 'tweakers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {`12 Model Tweakers (${tweakersCount})`}
          </button>
          <button
            onClick={() => setActiveGroup('small')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              activeGroup === 'small'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {`14 Small Model Labs (${smallCount})`}
          </button>
          <button
            onClick={() => setActiveGroup('harness')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              activeGroup === 'harness'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {`17 Harness Only Labs (${harnessCount})`}
          </button>
          <button
            onClick={() => setActiveGroup('all')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              activeGroup === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {lang === 'de' ? `Alle (${labs.length})` : `All (${labs.length})`}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'de'
                ? 'Lab, Modellfamilie, Tooling, Basis oder Land filtern...'
                : 'Filter by lab, model family, tooling, base or country...'
            }
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid of Lab Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredLabs.map((lab) => {
          const stats = labBenchmarkStats[lab.id];
          const isExpanded = expandedLabId === lab.id;

          return (
            <div
              key={lab.id}
              className="flex flex-col justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-xs hover:shadow-md"
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none" title={lab.country}>
                      {lab.countryFlag}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {lab.creator}
                      </h3>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {lab.country}
                      </div>
                    </div>
                  </div>

                  {/* Benchmark models badge */}
                  {stats && stats.count > 0 ? (
                    <button
                      onClick={() => onSelectLabForBenchmark(lab.creator)}
                      title={`Im Diagramm nach ${lab.creator} filtern`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>{stats.count} {stats.count === 1 ? 'Modell' : 'Modelle'}</span>
                    </button>
                  ) : null}
                </div>

                {/* Group 5: Harness Only Labs Special Card Layout */}
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

                {/* Group 3: Model Tweakers Special Card Layout */}
                {lab.group === 'tweakers' && (
                  <div className="space-y-2 mb-3">
                    {lab.engineName && lab.engineName !== '-' && (
                      <div className="mb-1 pb-1 border-b border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                          Modell-Familie
                        </div>
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {lab.engineName}
                        </div>
                      </div>
                    )}
                    {lab.basedOn && (
                      <div className="bg-purple-50 dark:bg-purple-950/40 p-2 rounded-lg border border-purple-200 dark:border-purple-900/60">
                        <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">
                          Basiert auf OpenWeights
                        </div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {lab.basedOn}
                        </div>
                      </div>
                    )}
                    {lab.specialties && lab.specialties !== `Based on ${lab.basedOn}` && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Fokus: </span>
                        <span>{lab.specialties}</span>
                      </div>
                    )}
                    {/* Any available size tiers for tweakers */}
                    {Object.values(lab.parameterSizes).some(Boolean) && (
                      <div className="space-y-1 pt-1">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          <span>Größenstufen</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[11px]">
                          {lab.parameterSizes.small && (
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-1 rounded border border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400 block text-[9.5px]">&lt; 32B</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                                {lab.parameterSizes.small}
                              </span>
                            </div>
                          )}
                          {lab.parameterSizes.medium && (
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-1 rounded border border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400 block text-[9.5px]">&lt; 128B</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                                {lab.parameterSizes.medium}
                              </span>
                            </div>
                          )}
                          {lab.parameterSizes.massive && (
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-1 rounded border border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400 block text-[9.5px]">&lt; 512B</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                                {lab.parameterSizes.massive}
                              </span>
                            </div>
                          )}
                          {lab.parameterSizes.colossal && (
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-1 rounded border border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400 block text-[9.5px]">&lt; 1.5T</span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                                {lab.parameterSizes.colossal}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Group 4: Small Model Labs Special Card Layout */}
                {lab.group === 'small' && (
                  <div className="space-y-2 mb-3">
                    {lab.engineName && (
                      <div className="mb-1 pb-1 border-b border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                          Modell-Familie
                        </div>
                        <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {lab.engineName}
                        </div>
                      </div>
                    )}
                    {/* Small parameter sizes: Micro, Mini, Tiny, Small, Medium, Large */}
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        <span>Kleine & Lokale Modelle</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {lab.parameterSizes.micro && (
                          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-1 rounded border border-emerald-100 dark:border-emerald-900/50">
                            <span className="text-emerald-700 dark:text-emerald-400 block text-[9.5px] font-semibold">Micro &lt; 0.5B</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.micro}
                            </span>
                          </div>
                        )}
                        {lab.parameterSizes.mini && (
                          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-1 rounded border border-emerald-100 dark:border-emerald-900/50">
                            <span className="text-emerald-700 dark:text-emerald-400 block text-[9.5px] font-semibold">Mini &lt; 2B</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.mini}
                            </span>
                          </div>
                        )}
                        {lab.parameterSizes.tiny && (
                          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-1 rounded border border-emerald-100 dark:border-emerald-900/50">
                            <span className="text-emerald-700 dark:text-emerald-400 block text-[9.5px] font-semibold">Tiny &lt; 8B</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.tiny}
                            </span>
                          </div>
                        )}
                        {lab.parameterSizes.small && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-1 rounded border border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400 block text-[9.5px]">Small &lt; 32B</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.small}
                            </span>
                          </div>
                        )}
                        {lab.parameterSizes.medium && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-1 rounded border border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400 block text-[9.5px]">Medium &lt; 128B</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.medium}
                            </span>
                          </div>
                        )}
                        {lab.parameterSizes.large && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-1 rounded border border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400 block text-[9.5px]">Large &lt; 256B</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.large}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {lab.specialties && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Besonderheiten: </span>
                        <span>{lab.specialties}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Groups 1 & 2: Top 10 & Contenders Standard Layout */}
                {(lab.group === 'top10' || lab.group === 'contender') && (
                  <>
                    {/* Primary Engine / ChatBot name */}
                    {lab.engineName && (
                      <div className="mb-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                          Engine / ChatBot
                        </div>
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {lab.engineName}
                        </div>
                      </div>
                    )}

                    {/* Famous for / Specialties */}
                    {(lab.famousFor || lab.specialties) && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {lab.specialties ? 'Besonderheiten: ' : 'Bekannt für: '}
                        </span>
                        <span>{lab.famousFor || lab.specialties}</span>
                      </div>
                    )}

                    {/* Parameter Sizes Preview / Matrix */}
                    <div className="space-y-1.5 mb-3">
                      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        <span>Größenstufen (Parameters)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {lab.parameterSizes.small && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded border border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400 block text-[10px]">&lt; 32B</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.small}
                            </span>
                          </div>
                        )}
                        {lab.parameterSizes.medium && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded border border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400 block text-[10px]">&lt; 128B</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.medium}
                            </span>
                          </div>
                        )}
                        {lab.parameterSizes.large && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded border border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400 block text-[10px]">&lt; 256B</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.large}
                            </span>
                          </div>
                        )}
                        {lab.parameterSizes.massive && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded border border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400 block text-[10px]">&lt; 512B</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.massive}
                            </span>
                          </div>
                        )}
                        {lab.parameterSizes.colossal && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded border border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400 block text-[10px]">&lt; 1.5T</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.colossal}
                            </span>
                          </div>
                        )}
                        {lab.parameterSizes.planetary && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded border border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400 block text-[10px]">&lt; 5T</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.planetary}
                            </span>
                          </div>
                        )}
                        {lab.parameterSizes.singularity && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded border border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400 block text-[10px]">&lt; 15T</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {lab.parameterSizes.singularity}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tooling / Agents for Top 10 or when available */}
                    {(lab.codingAgent || lab.dailyAgent || lab.harnessSdk || lab.subscriptionTiers) && (
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-2.5">
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
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredLabs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">
            {lang === 'de'
              ? 'Keine LLM-Labs gefunden, die den Filterkriterien entsprechen.'
              : 'No LLM labs found matching the search criteria.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveGroup('all');
            }}
            className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            Filter zurücksetzen
          </button>
        </div>
      )}
    </div>
  );
};
