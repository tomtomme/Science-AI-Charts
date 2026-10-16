import React, { useState, useEffect } from 'react';
import { ModelRecord, BenchmarkComponent, PriceFilter, ExplosionMode } from '../types';
import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { ExternalLink } from 'lucide-react';

interface ExplodedBarChartProps {
  models: ModelRecord[];
  activeBenchmarkId: string | null;
  activeCategoryIndex?: number;
  sortBy?: 'score' | 'date';
  explodedViewEnabled?: boolean;
  explosionMode?: ExplosionMode;
  onExplosionModeChange?: (mode: ExplosionMode) => void;
  fullExplosionEnabled?: boolean;
  onFullExplosionToggle?: () => void;
  searchFilter: string;
  selectedFamilies?: string[];
  selectedCompany?: string | null;
  lang: Language;
  onExplosionStateChange?: (isExplodedActive: boolean) => void;
  hoveredCategoryComp?: BenchmarkComponent | null;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  priceFilter?: PriceFilter;
  onPriceFilterChange?: (filter: PriceFilter) => void;
  categoryNames?: string[];
}

interface HoveredSegmentInfo {
  comp: BenchmarkComponent;
  model: ModelRecord;
  points: number;
  raw: number;
}

export const ExplodedBarChart: React.FC<ExplodedBarChartProps> = ({
  models,
  activeBenchmarkId,
  activeCategoryIndex = 0,
  sortBy = 'score',
  explodedViewEnabled = true,
  explosionMode,
  onExplosionModeChange,
  fullExplosionEnabled,
  onFullExplosionToggle,
  searchFilter,
  selectedFamilies = [],
  selectedCompany = null,
  lang,
  onExplosionStateChange,
  hoveredCategoryComp = null,
  showAdvanced = false,
  onToggleAdvanced,
  priceFilter = 'free',
  onPriceFilterChange,
  categoryNames,
}) => {
  const t = TRANSLATIONS[lang];

  // Explosion state: 'on' (an) | 'hover' (teils) | 'off' (aus)
  const currentExplosionMode: ExplosionMode =
    explosionMode ?? (fullExplosionEnabled ? 'on' : 'hover');

  // Active benchmark component if a single category is selected (1 to 8)
  const activeComp = activeCategoryIndex > 0 ? BENCHMARK_COMPONENTS[activeCategoryIndex - 1] : null;
  const displayedCategoryComp = hoveredCategoryComp || activeComp;

  // Index of hovered bar
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<HoveredSegmentInfo | null>(null);

  // Persistent model & segment detail to keep showing the info even after the mouse leaves the bar
  const [persistentModel, setPersistentModel] = useState<ModelRecord | null>(null);
  const [persistentSegment, setPersistentSegment] = useState<HoveredSegmentInfo | null>(null);

  // Reset persistent bar info when switching categories
  useEffect(() => {
    setPersistentModel(null);
    setPersistentSegment(null);
  }, [activeCategoryIndex, hoveredCategoryComp]);

  // Dynamic Y-axis scale based on single category (0-100%) or overall score (e.g. 74 in OLD mode, 69 in NEW mode)
  const maxScoreInPlot = activeComp
    ? 100
    : Math.max(70, ...models.map((m) => m.score ?? m.scoreNewReported ?? 0));
  const maxAxisScore = activeComp ? 100 : Math.ceil((maxScoreInPlot + 2) / 10) * 10;
  const chartHeight = 500;
  const topPadding = 65; // Streamlined headroom now that the popup is integrated into the header bar
  const bottomPadding = 165; // Generous space below baseline for rotated model names with badges without clipping
  const availablePlotHeight = chartHeight - topPadding - bottomPadding; // 270px
  const baselineY = chartHeight - bottomPadding; // 335px

  const barWidth = 26;
  const barGap = 12;
  const totalBarSlot = barWidth + barGap; // 38px
  const marginLeft = 100; // Generous left margin so rotated text for bar 0 never clips off the left edge
  const marginRight = 40; // Right margin so the last bar and label are never clipped
  const chartWidth = Math.max(1050, marginLeft + models.length * totalBarSlot + marginRight);

  // Height formula strictly proportional to score
  const scaleY = (val: number) => {
    return (Math.max(0, val) / maxAxisScore) * availablePlotHeight;
  };

  // Determine if a model matches the search/family filters (multi-select supported)
  const isModelHighlighted = (model: ModelRecord): boolean => {
    const q = searchFilter.trim().toLowerCase();
    const matchesSearch =
      !q ||
      model.displayName.toLowerCase().includes(q) ||
      model.name.toLowerCase().includes(q) ||
      model.companyName.toLowerCase().includes(q) ||
      model.creatorClean.toLowerCase().includes(q) ||
      Boolean(model.creator && model.creator.toLowerCase().includes(q));

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
  };

  const hasActiveHighlight =
    searchFilter.trim().length > 0 || selectedFamilies.length > 0 || selectedCompany !== null;

  // Is a bar exploded?
  // an: wie bisher, alle balken werden forciert explodiert dargestellt
  // teils: wie das bisherige aus, nur Balken unter dem Mauszeiger und die benachbarten explodieren
  // aus: Balken explodieren auch bei Mausberührung nicht
  const isExploded = (index: number) => {
    if (currentExplosionMode === 'on') return true;
    if (currentExplosionMode === 'off') return false;
    // 'hover' mode
    if (!explodedViewEnabled || hoveredIndex === null) return false;
    return index === hoveredIndex || index === hoveredIndex - 1 || index === hoveredIndex + 1;
  };

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);
    const m = models[index];
    if (m) {
      setPersistentModel(m);
      if (activeComp) {
        const raw = m.rawScores[activeComp.key] ?? 0;
        const breakdown = m.breakdown.find((b) => b.id === activeComp.id);
        const pts = breakdown?.pointsContribution ?? (activeComp.transform(raw) / 8);
        const segInfo: HoveredSegmentInfo = {
          comp: activeComp,
          model: m,
          points: pts,
          raw,
        };
        setHoveredSegment(segInfo);
        setPersistentSegment(segInfo);
      } else {
        // Multi-Kategorie Modus: Falls bereits ein Segment vorgewählt war, auf das neue Modell übertragen
        if (persistentSegment) {
          const comp = persistentSegment.comp;
          const raw = m.rawScores[comp.key] ?? 0;
          const breakdown = m.breakdown.find((b) => b.id === comp.id);
          const pts = breakdown?.pointsContribution ?? (comp.transform(raw) / 8);
          const segInfo: HoveredSegmentInfo = {
            comp,
            model: m,
            points: pts,
            raw,
          };
          setHoveredSegment(segInfo);
          setPersistentSegment(segInfo);
        }
      }
    }
    if (onExplosionStateChange) {
      onExplosionStateChange(currentExplosionMode === 'on' || currentExplosionMode === 'hover');
    }
  };

  const handleMouseLeave = (index?: number) => {
    if (typeof index === 'number') {
      setHoveredIndex((prev) => (prev === index ? null : prev));
    } else {
      setHoveredIndex(null);
    }
    setHoveredSegment(null);
    // Behalte persistentModel und persistentSegment bei, damit die Kriterien-Beschreibung und Quellenlinks sichtbar bleiben!
    // Verschwindet erst, wenn ein anderes Balkenelement gehovert oder eine Kategorie oben gewählt wird.
    if (onExplosionStateChange) {
      onExplosionStateChange(currentExplosionMode === 'on');
    }
  };

  // Wenn die Kategorie über den Schieberegler geändert wird, Beschreibung anpassen
  useEffect(() => {
    if (activeCategoryIndex > 0) {
      const comp = BENCHMARK_COMPONENTS[activeCategoryIndex - 1];
      if (comp && persistentModel) {
        const raw = persistentModel.rawScores[comp.key] ?? 0;
        const breakdown = persistentModel.breakdown.find((b) => b.id === comp.id);
        const pts = breakdown?.pointsContribution ?? (comp.transform(raw) / 8);
        setPersistentSegment({
          comp,
          model: persistentModel,
          points: pts,
          raw,
        });
      }
    } else {
      // Zurück auf 'Alles': Einzelnes Segment zurücksetzen
      setPersistentSegment(null);
    }
  }, [activeCategoryIndex]);

  const hoveredModel = hoveredIndex !== null ? models[hoveredIndex] : null;
  const displayedModel = hoveredModel || persistentModel;
  const displayedSegment = hoveredSegment || persistentSegment;

  // Grid tick lines: if single category (0-100%), ticks: 0, 20, 40, 60, 80, 100
  const yTicks = activeComp
    ? [0, 20, 40, 60, 80, 100]
    : [0, 10, 20, 30, 40, 50, 60, 70, ...(maxAxisScore > 70 ? [80] : [])];

  // Regional pattern fill for unexploded bars:
  // Dynamically colors each bar strictly matching the flag of the LLM creator (from CSV lookup table / model metadata):
  // - 🇸🇬 Singapore: Red & White halves with crescent and 5 stars (Agnes / Sapiens AI)
  // - 🇨🇳 China: Red with yellow star & sickle
  // - 🇫🇷 France / Europe: Classic Tricolore (Blue-White-Red)
  // - 🇰🇷 South Korea: White with central Taegeuk & black trigrams
  // - 🇪🇸 Spain: Red-Yellow-Red horizontal stripes with coat of arms
  // - 🇨🇦 Canada: Red-White-Red vertical stripes with red maple leaf
  // - 🇩🇪 Germany: Black-Red-Gold horizontal stripes
  // - 🇺🇸 USA & default: Blue with white stars
  const getCountryBarFill = (model: ModelRecord): string => {
    const flag = model.flag || '';
    const norm = (model.creatorClean + ' ' + model.companyName + ' ' + model.displayName).toLowerCase();

    // 1. Singapore (🇸🇬) - e.g. Agnes / Sapiens AI
    if (
      flag.includes('🇸🇬') ||
      norm.includes('agnes') ||
      norm.includes('sapiens') ||
      norm.includes('singapore')
    ) {
      return 'url(#pattern-singapore)';
    }

    // 2. China (🇨🇳) - e.g. DeepSeek, Alibaba/Qwen, Kimi, MiniMax, Xiaomi, StepFun, GLM
    if (
      flag.includes('🇨🇳') ||
      norm.includes('alibaba') ||
      norm.includes('deepseek') ||
      norm.includes('z.ai') ||
      norm.includes('z ai') ||
      norm.includes('glm') ||
      norm.includes('moonshot') ||
      norm.includes('kimi') ||
      norm.includes('xiaomi') ||
      norm.includes('mimo') ||
      norm.includes('stepfun') ||
      norm.includes('minimax') ||
      norm.includes('inclusion') ||
      norm.includes('baidu') ||
      norm.includes('longcat') ||
      norm.includes('china mobile') ||
      norm.includes('nex agi')
    ) {
      return 'url(#pattern-china)';
    }

    // 3. France / Europe (🇫🇷, 🇪🇺) - e.g. Mistral AI
    if (
      flag.includes('🇫🇷') ||
      flag.includes('🇪🇺') ||
      norm.includes('mistral')
    ) {
      return 'url(#pattern-france)';
    }

    // 4. South Korea (🇰🇷) - e.g. Motif Technologies, Upstage (Solar)
    if (
      flag.includes('🇰🇷') ||
      norm.includes('motif') ||
      norm.includes('upstage') ||
      norm.includes('solar')
    ) {
      return 'url(#pattern-korea)';
    }

    // 5. Spain (🇪🇸) - e.g. Multiverse Computing (Quasar)
    if (
      flag.includes('🇪🇸') ||
      norm.includes('multiverse') ||
      norm.includes('quasar')
    ) {
      return 'url(#pattern-spain)';
    }

    // 6. Canada (🇨🇦) - e.g. Cohere (Command A+)
    if (
      flag.includes('🇨🇦') ||
      norm.includes('cohere') ||
      norm.includes('command a')
    ) {
      return 'url(#pattern-canada)';
    }

    // 7. Germany (🇩🇪) - e.g. DeepL SE
    if (
      flag.includes('🇩🇪') ||
      norm.includes('deepl') ||
      norm.includes('linguee')
    ) {
      return 'url(#pattern-germany)';
    }

    // 8. USA (🇺🇸) & Default
    return 'url(#pattern-usa)';
  };

  // Determine if a company's favicon needs stronger zoom to eliminate excess whitespace
  const isZoomedCompany = (model: ModelRecord): boolean => {
    const norm = (model.companyName + ' ' + model.creatorClean + ' ' + model.displayName).toLowerCase();
    return (
      norm.includes('google') ||
      norm.includes('anthropic') ||
      norm.includes('openai') ||
      norm.includes('chatgpt') ||
      norm.includes('gpt') ||
      norm.includes('meta')
    );
  };

  // Format Month + 2-digit Year (e.g. "Sep 26") for bar top display when sorted by date
  // Strictly displays ONLY Month and 2-digit Year, NEVER the day and NEVER the point score!
  const formatMonthYearShort = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const clean = dateStr.trim();
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsDe = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const monthList = lang === 'de' ? monthsDe : monthsEn;

    // 1. Try ISO date YYYY-MM-DD or YYYY-MM
    const isoMatch = clean.match(/^(\d{4})-(\d{1,2})/);
    if (isoMatch) {
      const year2 = isoMatch[1].slice(-2);
      const monthNum = parseInt(isoMatch[2], 10);
      if (monthNum >= 1 && monthNum <= 12) {
        return `${monthList[monthNum - 1]} ${year2}`;
      }
    }

    // 2. Try text formats with month word and 2/4 digit year: e.g. "Google Sept 26", "Sep 2026", "Oct 24"
    const textMatch = clean.match(/(Jan|Feb|Mär|Mar|Apr|Mai|May|Jun|Jul|Aug|Sep|Sept|Okt|Oct|Nov|Dez|Dec)[a-z]*[\s./\-_]*(\d{2,4})/i);
    if (textMatch) {
      const monthMap: Record<string, number> = {
        jan: 1, feb: 2, mär: 3, mar: 3, apr: 4, mai: 5, may: 5,
        jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, okt: 10, oct: 10,
        nov: 11, dez: 12, dec: 12
      };
      const mNum = monthMap[textMatch[1].toLowerCase()] || 1;
      const year2 = textMatch[2].slice(-2);
      return `${monthList[mNum - 1]} ${year2}`;
    }

    // Fallback: If split by hyphen
    const parts = clean.split('-');
    if (parts.length >= 2) {
      const year2 = parts[0].slice(-2);
      const monthNum = parseInt(parts[1], 10);
      if (monthNum >= 1 && monthNum <= 12) {
        return `${monthList[monthNum - 1]} ${year2}`;
      }
    }

    return '';
  };

  // Format X-axis label without country flag, but with 💲, 🌐, and prominent ✦ NEW badge
  const formatAxisLabel = (model: ModelRecord): string => {
    let label = model.displayName;
    if (model.isNew && !label.includes('✦') && !label.includes('★') && !label.includes('NEW')) {
      label += ' ✦ NEW';
    }
    if (model.isPaid && !label.includes('💲')) label += ' 💲';
    else if (model.isFreeApi && !label.includes('🌐')) label += ' 🌐';
    return label;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs transition-colors">
      {/* Non-intrusive Info Bar above chart: locked fixed height to guarantee rock-solid zero layout shift */}
      <div className="flex flex-col justify-between gap-1.5 h-[86px] min-h-[86px] max-h-[86px] pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs overflow-hidden">
        {/* Row 1: Model & Benchmark details across full width (locked 32px height) */}
        <div className="flex items-center w-full h-[32px] min-h-[32px] max-h-[32px] overflow-hidden">
          <div className="w-full min-w-0 overflow-hidden">
            {displayedModel ? (
              <div className="flex items-center gap-x-2.5 text-slate-700 dark:text-slate-300 h-[32px] overflow-hidden whitespace-nowrap">
                {/* Model Name & Favicon (Clickable link if modelUrl is available) */}
                {displayedModel.modelUrl ? (
                  <a
                    href={displayedModel.modelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors group cursor-pointer"
                    title={`${displayedModel.displayName} · ${t.openChatbotApp}`}
                  >
                    <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                      <img
                        src={displayedModel.faviconUrl}
                        alt=""
                        className={`w-full h-full object-contain ${
                          isZoomedCompany(displayedModel) ? 'scale-145' : 'scale-110'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </span>
                    <span className="underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2 group-hover:decoration-blue-500">
                      {displayedModel.displayName}
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  </a>
                ) : (
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                      <img
                        src={displayedModel.faviconUrl}
                        alt=""
                        className={`w-full h-full object-contain ${
                          isZoomedCompany(displayedModel) ? 'scale-145' : 'scale-110'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </span>
                    {displayedModel.displayName}
                  </span>
                )}

                <span className="text-slate-400">·</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {t.company} <strong>{displayedModel.companyName}</strong>
                </span>

                {displayedModel.releaseDate && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                      <span className="opacity-75">📅</span>
                      <span>{displayedModel.releaseDate}</span>
                    </span>
                  </>
                )}

                {/* Specific segment info if hovered, else summary score */}
                {displayedSegment ? (
                  <>
                    <span className="text-slate-400">·</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span
                        className="w-3 h-3 rounded-xs shrink-0 shadow-2xs border border-black/10 dark:border-white/10"
                        style={{ backgroundColor: displayedSegment.comp.color }}
                      />
                      <span style={{ color: displayedSegment.comp.color }}>
                        {lang === 'en' ? displayedSegment.comp.nameEn : displayedSegment.comp.nameDe}
                      </span>
                      <span className="font-mono text-slate-900 dark:text-white font-bold">
                        {Math.round(displayedSegment.raw)}%
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400 font-normal">
                        (+{displayedSegment.points.toFixed(1)} {t.points})
                      </span>
                    </div>

                    <span className="text-slate-400">·</span>
                    {displayedSegment.comp.sourceUrl ? (
                      <a
                        href={displayedSegment.comp.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300 inline-flex items-center gap-1 transition-colors underline decoration-slate-300 dark:decoration-slate-600 cursor-pointer"
                        title={`${displayedSegment.comp.sourceName} ${t.openWebsite} (${displayedSegment.comp.sourceUrl})`}
                      >
                        <span>{t.sourceLabel} <strong>{displayedSegment.comp.sourceName}</strong></span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                      </a>
                    ) : (
                      <span className="font-mono text-[11px] text-slate-400">
                        {t.sourceLabel} {displayedSegment.comp.sourceName}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {t.score}: {displayedModel.scoreNewReported ?? displayedModel.scoreNewCalculated} {t.points} ({t.rank} #{displayedModel.rank})
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {t.nonHallucinationLabel}: {displayedModel.rawScores.nonHallucination}% (+{(displayedModel.rawScores.nonHallucination / 8).toFixed(1)} {t.points})
                    </span>
                  </>
                )}
              </div>
            ) : displayedCategoryComp ? (
              <div className="flex items-center gap-x-2.5 text-slate-700 dark:text-slate-300 h-[32px] overflow-hidden whitespace-nowrap">
                <div className="flex items-center gap-1.5 font-bold shrink-0" style={{ color: displayedCategoryComp.color }}>
                  <span
                    className="w-3 h-3 rounded-xs shrink-0 shadow-2xs border border-black/10 dark:border-white/10"
                    style={{ backgroundColor: displayedCategoryComp.color }}
                  />
                  <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                    {(categoryNames && activeCategoryIndex > 0 && categoryNames[activeCategoryIndex - 1]) ||
                     (lang === 'en' ? displayedCategoryComp.nameEn : displayedCategoryComp.nameDe)}
                  </span>
                </div>

                <span className="text-slate-400">·</span>
                {displayedCategoryComp.sourceUrl ? (
                  <a
                    href={displayedCategoryComp.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300 inline-flex items-center gap-1 transition-colors underline decoration-slate-300 dark:decoration-slate-600 cursor-pointer shrink-0"
                    title={`${displayedCategoryComp.sourceName} ${t.openWebsite} (${displayedCategoryComp.sourceUrl})`}
                  >
                    <span>{t.sourceLabel} <strong className="underline">{displayedCategoryComp.sourceName}</strong></span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                  </a>
                ) : (
                  <span className="font-mono text-xs text-slate-400 shrink-0">
                    {t.sourceLabel} {displayedCategoryComp.sourceName}
                  </span>
                )}

                {sortBy === 'date' && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px] font-semibold flex items-center gap-1 shrink-0">
                      <span>📅</span>
                      <span>{t.sortedByDateLabel}</span>
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 h-[32px] overflow-hidden whitespace-nowrap">
                <span className="font-bold text-slate-900 dark:text-white shrink-0">AI-Top30 Ranking</span>
                {sortBy === 'date' && (
                  <>
                    <span className="text-slate-400">·</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono text-[11px] font-semibold flex items-center gap-1 shrink-0">
                      <span>📅</span>
                      <span>{t.sortedByDateLabel}</span>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Always present with strictly locked 38px height to guarantee rock-solid zero-shift height */}
        <div className="text-[11.5px] rounded px-2.5 py-0.5 border flex items-center gap-2.5 leading-snug h-[38px] min-h-[38px] max-h-[38px] overflow-hidden transition-colors bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60">
          {displayedModel ? (
            displayedSegment ? (
              <div className="flex items-center gap-2 flex-1 min-w-0 h-full overflow-hidden">
                <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                  {t.criterionLabel}
                </span>
                <span
                  className="text-slate-600 dark:text-slate-300 line-clamp-2 min-w-0 flex-1 leading-snug"
                  title={lang === 'en' ? displayedSegment.comp.descriptionEn : displayedSegment.comp.descriptionDe}
                >
                  {lang === 'en' ? displayedSegment.comp.descriptionEn : displayedSegment.comp.descriptionDe}
                </span>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 line-clamp-1 truncate">
                {t.hoverBarPrompt}
              </span>
            )
          ) : displayedCategoryComp ? (
            <div className="flex items-center gap-2 flex-1 min-w-0 h-full overflow-hidden">
              <span className="font-semibold text-slate-800 dark:text-slate-100 shrink-0">
                {t.criterionLabel}
              </span>
              <span
                className="text-slate-600 dark:text-slate-300 line-clamp-2 min-w-0 flex-1 leading-snug"
                title={lang === 'en' ? displayedCategoryComp.descriptionEn : displayedCategoryComp.descriptionDe}
              >
                {lang === 'en' ? displayedCategoryComp.descriptionEn : displayedCategoryComp.descriptionDe}
              </span>
            </div>
          ) : (
            <span className="line-clamp-2 leading-snug">
              {currentExplosionMode === 'on'
                ? t.fullExplosionHelp
                : currentExplosionMode === 'hover'
                ? t.hoverHelp
                : t.disabledHelp}
            </span>
          )}
        </div>
      </div>

      {/* SVG Chart Container: Zoom-out capped at 75% original size + horizontal scrollbar for discoverability */}
      <div className="relative select-none w-full overflow-x-auto pb-2 custom-scrollbar">
        <div style={{ minWidth: `${Math.round(chartWidth * 0.75)}px` }} className="w-full">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="block w-full h-auto"
            style={{ minWidth: `${Math.round(chartWidth * 0.75)}px` }}
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => handleMouseLeave()}
          >
            <defs>
              {/* USA: Blau mit weißen Sternen - Stärker gezoomt & dezent verteilt */}
              <pattern
                id="pattern-usa"
                x="24"
                width="38"
                height="42"
                patternUnits="userSpaceOnUse"
              >
                <rect width="38" height="42" fill="#1E3A8A" />
                <polygon
                  points="13,13.5 14.9,18.4 20.1,18.7 16.0,22.0 17.4,27.1 13,24.2 8.6,27.1 10.0,22.0 5.9,18.7 11.1,18.4"
                  fill="#FFFFFF"
                />
                <circle cx="13" cy="0" r="1.6" fill="#FFFFFF" />
                <circle cx="13" cy="42" r="1.6" fill="#FFFFFF" />
              </pattern>

              {/* China: Rot mit gelber Sichel und Stern */}
              <pattern
                id="pattern-china"
                x="24"
                width="38"
                height="44"
                patternUnits="userSpaceOnUse"
              >
                <rect width="38" height="44" fill="#DC2626" />
                <path
                  d="M 8.5,14 A 7.5,7.5 0 1 0 17.5,23 A 5.5,5.5 0 1 1 8.5,14 Z"
                  fill="#FACC15"
                />
                <line x1="17.5" y1="23" x2="21.5" y2="28" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" />
                <polygon
                  points="18,8.2 19,10.6 21.6,10.6 19.5,12.2 20.2,14.6 18,13.1 15.8,14.6 16.5,12.2 14.4,10.6 17,10.6"
                  fill="#FACC15"
                />
              </pattern>

              {/* Singapur: Oben Rot mit weißer Mondsichel und 5 Sternen, unten Weiß (Flag of Singapore - z. B. Agnes) */}
              <pattern
                id="pattern-singapore"
                width="38"
                height="42"
                patternUnits="userSpaceOnUse"
              >
                {/* Obere Hälfte: Rot */}
                <rect x="0" y="0" width="38" height="21" fill="#EF3340" />
                {/* Untere Hälfte: Weiß */}
                <rect x="0" y="21" width="38" height="21" fill="#FFFFFF" />
                {/* Weiße Mondsichel auf rotem Feld */}
                <path
                  d="M 8,6 A 5,5 0 1 0 8,16 A 4.1,4.1 0 1 1 8,6 Z"
                  fill="#FFFFFF"
                />
                {/* 5 weiße fünfzackige Sterne im Kreis angeordnet */}
                <circle cx="14.5" cy="8" r="0.85" fill="#FFFFFF" />
                <circle cx="17.2" cy="9.8" r="0.85" fill="#FFFFFF" />
                <circle cx="16.2" cy="13.2" r="0.85" fill="#FFFFFF" />
                <circle cx="13" cy="13.2" r="0.85" fill="#FFFFFF" />
                <circle cx="12" cy="9.8" r="0.85" fill="#FFFFFF" />
              </pattern>

              {/* Frankreich / Europa: Klassische vertikale Tricolore (Blau-Weiß-Rot) */}
              <pattern
                id="pattern-france"
                width="1"
                height="1"
                viewBox="0 0 3 1"
                preserveAspectRatio="none"
              >
                <rect x="0" y="0" width="1" height="1" fill="#002654" />
                <rect x="1" y="0" width="1" height="1" fill="#FFFFFF" />
                <rect x="2" y="0" width="1" height="1" fill="#ED2939" />
              </pattern>
              <pattern
                id="pattern-europe"
                width="1"
                height="1"
                viewBox="0 0 3 1"
                preserveAspectRatio="none"
              >
                <rect x="0" y="0" width="1" height="1" fill="#002654" />
                <rect x="1" y="0" width="1" height="1" fill="#FFFFFF" />
                <rect x="2" y="0" width="1" height="1" fill="#ED2939" />
              </pattern>

              {/* Südkorea: Weißer Hintergrund, zentrales rot-blaues Taegeuk & schwarze Trigramme */}
              <pattern
                id="pattern-korea"
                width="38"
                height="42"
                patternUnits="userSpaceOnUse"
              >
                <rect width="38" height="42" fill="#FFFFFF" />
                {/* Zentrales rot-blaues Taegeuk */}
                <circle cx="19" cy="21" r="7.5" fill="#CD2E3A" />
                <path d="M 11.5,21 A 3.75,3.75 0 0,0 19,21 A 3.75,3.75 0 0,1 26.5,21 A 7.5,7.5 0 0,1 11.5,21 Z" fill="#0047A0" />
                {/* Trigramme links und rechts */}
                <line x1="4" y1="14" x2="8" y2="14" stroke="#000000" strokeWidth="1.2" />
                <line x1="4" y1="16.5" x2="8" y2="16.5" stroke="#000000" strokeWidth="1.2" />
                <line x1="30" y1="14" x2="34" y2="14" stroke="#000000" strokeWidth="1.2" />
                <line x1="30" y1="16.5" x2="34" y2="16.5" stroke="#000000" strokeWidth="1.2" />
                <line x1="4" y1="26" x2="8" y2="26" stroke="#000000" strokeWidth="1.2" />
                <line x1="4" y1="28.5" x2="8" y2="28.5" stroke="#000000" strokeWidth="1.2" />
                <line x1="30" y1="26" x2="34" y2="26" stroke="#000000" strokeWidth="1.2" />
                <line x1="30" y1="28.5" x2="34" y2="28.5" stroke="#000000" strokeWidth="1.2" />
              </pattern>

              {/* Spanien: Rot - Gelb (doppelt so breit) - Rot horizontal mit Wappen-Emblem */}
              <pattern
                id="pattern-spain"
                width="38"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <rect x="0" y="0" width="38" height="10" fill="#AA151B" />
                <rect x="0" y="10" width="38" height="20" fill="#F1BF00" />
                <rect x="0" y="30" width="38" height="10" fill="#AA151B" />
                {/* Spanisches Wappen auf dem gelben Streifen */}
                <rect x="15" y="15" width="8" height="10" rx="1.5" fill="#AA151B" />
                <circle cx="19" cy="13.5" r="1.5" fill="#AA151B" />
                <rect x="17" y="17" width="4" height="6" fill="#F1BF00" />
              </pattern>

              {/* Kanada: Rot - Weiß (doppelt so breit) - Rot vertikal mit rotem Ahornblatt */}
              <pattern
                id="pattern-canada"
                width="38"
                height="38"
                patternUnits="userSpaceOnUse"
              >
                <rect x="0" y="0" width="9" height="38" fill="#FF0000" />
                <rect x="9" y="0" width="20" height="38" fill="#FFFFFF" />
                <rect x="29" y="0" width="9" height="38" fill="#FF0000" />
                {/* Rotes Ahornblatt im weißen Zentrum */}
                <path
                  d="M 19,10 L 20.5,14 L 24,13.5 L 22.5,16.5 L 25,18.5 L 22,19.5 L 22.5,22 L 19.5,20.5 L 19.5,26 L 18.5,26 L 18.5,20.5 L 15.5,22 L 16,19.5 L 13,18.5 L 15.5,16.5 L 14,13.5 L 17.5,14 Z"
                  fill="#FF0000"
                />
              </pattern>

              {/* Deutschland: Schwarz - Rot - Gold (drei gleiche horizontale Streifen) */}
              <pattern
                id="pattern-germany"
                width="38"
                height="42"
                patternUnits="userSpaceOnUse"
              >
                <rect x="0" y="0" width="38" height="14" fill="#000000" />
                <rect x="0" y="14" width="38" height="14" fill="#DD0000" />
                <rect x="0" y="28" width="38" height="14" fill="#FFCE00" />
              </pattern>
            </defs>

          {/* Horizontal Gridlines */}
          {yTicks.map((tick) => {
            const yPos = baselineY - scaleY(tick);
            return (
              <g key={`tick-${tick}`}>
                <line
                  x1={marginLeft - 12}
                  y1={yPos}
                  x2={chartWidth - 25}
                  y2={yPos}
                  stroke={tick === 0 ? '#94A3B8' : '#E2E8F0'}
                  className="dark:stroke-slate-800"
                  strokeWidth={tick === 0 ? 1.5 : 1}
                />
                <text
                  x={marginLeft - 18}
                  y={yPos + 4}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="monospace"
                  className="tabular-nums font-semibold"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Model Bars */}
          {models.map((model, index) => {
            const barX = marginLeft + index * totalBarSlot;
            const barCenterX = barX + barWidth / 2;
            const exploded = isExploded(index);
            const isHovered = hoveredIndex === index;
            const highlighted = isModelHighlighted(model);

            // In single category mode, measure that category's raw score (0-100%)
            const catRaw = activeComp ? (model.rawScores[activeComp.key] ?? 0) : 0;
            const catBreakdown = activeComp ? model.breakdown.find((b) => b.id === activeComp.id) : null;
            const catPoints = catBreakdown?.pointsContribution ?? (activeComp ? activeComp.transform(catRaw) / 8 : 0);

            const score = model.scoreNewReported ?? model.scoreNewCalculated;
            const totalBarHeight = activeComp ? scaleY(catRaw) : scaleY(score);
            const barCenterY = baselineY - totalBarHeight / 2;

            // Explosion gap: 0 when not exploded (including in 'off' mode), 2.5 when hovered & exploded, 2.2 when forced 'on', 1.8 for neighbors in 'hover'
            const explosionGap = !exploded
              ? 0
              : isHovered
              ? 2.5
              : currentExplosionMode === 'on'
              ? 2.2
              : 1.8;

            // Stack segments from bottom to top (for multi-category mode)
            let currentOffset = 0;
            const segments = model.breakdown.map((comp, segIdx) => {
              const segHeight = scaleY(comp.pointsContribution);
              const gapOffset = exploded ? segIdx * explosionGap : 0;
              const segY = baselineY - (currentOffset + segHeight + gapOffset);
              currentOffset += segHeight;
              return {
                comp,
                segHeight,
                segY,
              };
            });

            // Top of the bar
            const topSegment = segments[segments.length - 1];
            const barTopY = activeComp
              ? baselineY - totalBarHeight
              : exploded && topSegment
              ? topSegment.segY
              : baselineY - totalBarHeight;

            // Unexploded country color fill: USA stars, China sickle, Europe blue-yellow
            const countryFill = getCountryBarFill(model);

            // Opacity handling
            let barOpacity = 1;
            if (currentExplosionMode !== 'on' && hoveredIndex !== null && !activeComp) {
              if (!exploded && hoveredIndex !== index) {
                barOpacity = 0.45;
              }
            }

            return (
              <g
                key={model.id}
                className="cursor-pointer"
                style={{ opacity: barOpacity, transition: 'opacity 0.2s' }}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={(e) => {
                  const related = e.relatedTarget as Node | null;
                  if (related && e.currentTarget.contains(related)) {
                    return;
                  }
                  handleMouseLeave(index);
                }}
              >
                {/* Full-column invisible hit rect for smooth mouse tracking with zero dead zones */}
                <rect
                  x={barX - barGap / 2}
                  y={0}
                  width={totalBarSlot}
                  height={chartHeight}
                  fill="#000000"
                  opacity={0}
                  pointerEvents="all"
                  style={{ pointerEvents: 'all' }}
                  onMouseEnter={() => {
                    if (activeComp) {
                      const segInfo: HoveredSegmentInfo = {
                        comp: activeComp,
                        model,
                        points: catPoints,
                        raw: catRaw,
                      };
                      setHoveredSegment(segInfo);
                      setPersistentSegment(segInfo);
                      setPersistentModel(model);
                    }
                  }}
                />

                {/* Render either single category bar or the 8 multi-category segments */}
                {activeComp ? (
                  <g>
                    <rect
                      x={barX}
                      y={barTopY}
                      width={barWidth}
                      height={Math.max(1, totalBarHeight)}
                      rx={2}
                      ry={2}
                      fill={activeComp.color}
                      stroke={isHovered ? '#FFFFFF' : 'rgba(0,0,0,0.18)'}
                      strokeWidth={isHovered ? 1.5 : 0.75}
                      style={{
                        transition: 'y 0.25s ease-out, height 0.25s ease-out',
                      }}
                    />

                    {/* Centered raw percentage inside bar if height >= 20 */}
                    {totalBarHeight >= 20 && (
                      <text
                        x={barCenterX}
                        y={barCenterY + 3.5}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                        pointerEvents="none"
                        style={{
                          textShadow: '0 1px 2px rgba(0,0,0,0.85)',
                        }}
                      >
                        {`${Math.round(catRaw)}%`}
                      </text>
                    )}
                  </g>
                ) : (
                  /* The 8 Segments */
                  segments.map((seg, sIdx) => {
                    const isBenchmarkFocused = activeBenchmarkId === seg.comp.id;
                    const isOtherFocused = activeBenchmarkId !== null && !isBenchmarkFocused;

                    const fillColor = exploded ? seg.comp.color : countryFill;
                    const opacity = isOtherFocused && exploded ? 0.35 : 1;
                    const isTop = sIdx === segments.length - 1;
                    const benchMeta = BENCHMARK_COMPONENTS.find((b) => b.id === seg.comp.id);

                    return (
                      <g key={seg.comp.id}>
                        <rect
                          x={barX}
                          y={seg.segY}
                          width={barWidth}
                          height={Math.max(1, seg.segHeight)}
                          rx={exploded ? 1.5 : isTop ? 2 : 0}
                          ry={exploded ? 1.5 : isTop ? 2 : 0}
                          fill={fillColor}
                          opacity={opacity}
                          stroke={
                            exploded
                              ? 'rgba(255,255,255,0.3)'
                              : model.flag.includes('🇨🇳')
                              ? '#991B1B'
                              : model.flag.includes('🇫🇷')
                              ? '#002654'
                              : '#1E3A8A'
                          }
                          strokeWidth={exploded ? 0.5 : 0.75}
                          style={{
                            transition: 'y 0.25s ease-out, fill 0.25s ease-out, opacity 0.2s',
                          }}
                          onMouseEnter={() => {
                            if (exploded && benchMeta) {
                              const segInfo: HoveredSegmentInfo = {
                                comp: benchMeta,
                                model,
                                points: seg.comp.pointsContribution,
                                raw: seg.comp.rawValue,
                              };
                              setHoveredSegment(segInfo);
                              setPersistentSegment(segInfo);
                              setPersistentModel(model);
                            }
                          }}
                        />

                        {/* Seamless hit area covering the segment and explosion gap to eliminate any dead zones */}
                        {exploded && benchMeta && (
                          <rect
                            x={barX - 2}
                            y={seg.segY - 1}
                            width={barWidth + 4}
                            height={Math.max(1, seg.segHeight + explosionGap + 2)}
                            fill="#000000"
                            opacity={0}
                            pointerEvents="all"
                            className="cursor-pointer"
                            style={{
                              pointerEvents: 'all',
                              transition: 'y 0.25s ease-out, height 0.25s ease-out',
                            }}
                            onMouseEnter={() => {
                              const segInfo: HoveredSegmentInfo = {
                                comp: benchMeta,
                                model,
                                points: seg.comp.pointsContribution,
                                raw: seg.comp.rawValue,
                              };
                              setHoveredSegment(segInfo);
                              setPersistentSegment(segInfo);
                              setPersistentModel(model);
                            }}
                          />
                        )}

                        {/* Originale Prozentzahl mittig im jeweiligen Balkenteil bei Explosion (auch Nachbarbalken & volle Explosion) */}
                        {exploded && seg.segHeight >= 6 && (
                          <text
                            x={barCenterX}
                            y={seg.segY + seg.segHeight / 2 + 3}
                            textAnchor="middle"
                            fill="#FFFFFF"
                            fontSize={seg.segHeight < 11 ? '8' : '8.5'}
                            fontFamily="monospace"
                            fontWeight="bold"
                            pointerEvents="none"
                            style={{
                              textShadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 1px rgba(0,0,0,0.95)',
                            }}
                          >
                            {`${Math.round(seg.comp.rawValue)}%`}
                          </text>
                        )}
                      </g>
                    );
                  })
                )}

                {/* MITTIGES FAVICON AUF UNEXPLODIERTEN BALKEN BZW. KATEGORIE-BALKEN */}
                {((!activeComp && !exploded && totalBarHeight >= 22) || (activeComp && totalBarHeight >= 36)) && (() => {
                  const isZoomed = isZoomedCompany(model);
                  const circleRadius = 11.5;
                  const imgSize = isZoomed ? 27 : 19;
                  const clipId = `clip-unexp-${model.id}`;
                  const iconCenterY = activeComp && totalBarHeight >= 48 ? barCenterY - 10 : barCenterY;

                  return (
                    <g pointerEvents="none" className="transition-opacity duration-200">
                      <defs>
                        <clipPath id={clipId}>
                          <circle cx={barCenterX} cy={iconCenterY} r={circleRadius - 0.75} />
                        </clipPath>
                      </defs>
                      <circle
                        cx={barCenterX}
                        cy={iconCenterY}
                        r={circleRadius}
                        fill="#FFFFFF"
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth="1"
                      />
                      <image
                        href={model.faviconUrl}
                        x={barCenterX - imgSize / 2}
                        y={iconCenterY - imgSize / 2}
                        width={imgSize}
                        height={imgSize}
                        preserveAspectRatio="xMidYMid meet"
                        clipPath={`url(#${clipId})`}
                      />
                    </g>
                  );
                })()}

                {/* Score Number OR (when sorted by date) Month & 2-Digit Year only */}
                <g>
                  {sortBy === 'date' ? (
                    <text
                      x={barCenterX}
                      y={barTopY - 6}
                      textAnchor="middle"
                      className="fill-blue-600 dark:fill-blue-400 font-bold tabular-nums"
                      fontSize="9.5"
                      fontFamily="monospace"
                      style={{
                        transition: 'y 0.25s ease-out',
                      }}
                    >
                      {formatMonthYearShort(model.releaseDate)}
                    </text>
                  ) : (
                    <text
                      x={barCenterX}
                      y={barTopY - 6}
                      textAnchor="middle"
                      fill={isHovered || (hasActiveHighlight && highlighted) ? '#0F172A' : '#64748B'}
                      className="dark:fill-slate-300 font-bold tabular-nums"
                      fontSize="10"
                      fontFamily="monospace"
                      style={{
                        transition: 'y 0.25s ease-out',
                      }}
                    >
                      {activeComp ? `${Math.round(catRaw)}%` : score}
                    </text>
                  )}
                </g>

                {/* Company Favicon shifted high enough and larger above exploded bar */}
                {exploded && isHovered && (() => {
                  const isZoomed = isZoomedCompany(model);
                  const circleRadius = 13;
                  const imgSize = isZoomed ? 33 : 23;
                  const clipId = `clip-exp-hov-${model.id}`;

                  return (
                    <g
                      pointerEvents="none"
                      style={{
                        transition: 'opacity 0.2s ease-out',
                      }}
                    >
                      <defs>
                        <clipPath id={clipId}>
                          <circle cx={barCenterX} cy={barTopY - 38} r={circleRadius - 0.75} />
                        </clipPath>
                      </defs>
                      <circle
                        cx={barCenterX}
                        cy={barTopY - 38}
                        r={circleRadius}
                        fill="#FFFFFF"
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth="1"
                      />
                      <image
                        href={model.faviconUrl}
                        x={barCenterX - imgSize / 2}
                        y={barTopY - 38 - imgSize / 2}
                        width={imgSize}
                        height={imgSize}
                        preserveAspectRatio="xMidYMid meet"
                        clipPath={`url(#${clipId})`}
                      />
                    </g>
                  );
                })()}

                {/* Companion Mini-Favicon above Neighbor Exploded Bars */}
                {exploded && !isHovered && !fullExplosionEnabled && (() => {
                  const isZoomed = isZoomedCompany(model);
                  const circleRadius = 10;
                  const imgSize = isZoomed ? 25 : 17;
                  const clipId = `clip-exp-nbr-${model.id}`;

                  return (
                    <g pointerEvents="none" opacity="0.9">
                      <defs>
                        <clipPath id={clipId}>
                          <circle cx={barCenterX} cy={barTopY - 32} r={circleRadius - 0.75} />
                        </clipPath>
                      </defs>
                      <circle
                        cx={barCenterX}
                        cy={barTopY - 32}
                        r={circleRadius}
                        fill="#FFFFFF"
                        stroke="rgba(0,0,0,0.15)"
                        strokeWidth="0.75"
                      />
                      <image
                        href={model.faviconUrl}
                        x={barCenterX - imgSize / 2}
                        y={barTopY - 32 - imgSize / 2}
                        width={imgSize}
                        height={imgSize}
                        preserveAspectRatio="xMidYMid meet"
                        clipPath={`url(#${clipId})`}
                      />
                    </g>
                  );
                })()}

                {/* Rotated Model Name below Baseline: OHNE Flagge, mit vergrößerten 💲, 🌐 Symbolen & klickbar falls modelUrl vorhanden */}
                <g transform={`translate(${barCenterX}, ${baselineY + 12})`}>
                  {model.modelUrl ? (
                    <a
                      href={model.modelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer group"
                    >
                      <text
                        x="0"
                        y="0"
                        textAnchor="end"
                        transform="rotate(-52)"
                        fill={isHovered || (hasActiveHighlight && highlighted) ? '#2563EB' : '#475569'}
                        className="dark:fill-slate-300 transition-colors hover:fill-blue-600 dark:hover:fill-blue-400 cursor-pointer"
                        fontSize="10"
                        fontWeight={isHovered || (hasActiveHighlight && highlighted) ? '700' : '500'}
                      >
                        <title>{`${model.displayName}${model.releaseDate ? ` (${model.releaseDate})` : ''} · ${t.openChatbotApp}`}</title>
                        {model.displayName}
                        {model.isNew && (
                          <tspan fill="#F59E0B" fontWeight="bold"> ✦ NEW</tspan>
                        )}
                        {model.isPaid && (
                          <tspan fontSize="15" fontWeight="bold" fill="#059669"> 💲</tspan>
                        )}
                        {model.isFreeApi && (
                          <tspan fontSize="15" fontWeight="bold" fill="#2563EB"> 🌐</tspan>
                        )}
                      </text>
                    </a>
                  ) : (
                    <text
                      x="0"
                      y="0"
                      textAnchor="end"
                      transform="rotate(-52)"
                      fill={isHovered || (hasActiveHighlight && highlighted) ? '#0F172A' : '#475569'}
                      className="dark:fill-slate-300 transition-colors"
                      fontSize="10"
                      fontWeight={isHovered || (hasActiveHighlight && highlighted) ? '700' : '500'}
                    >
                      <title>{`${model.displayName}${model.releaseDate ? ` (${model.releaseDate})` : ''}`}</title>
                      {model.displayName}
                      {model.isNew && (
                        <tspan fill="#F59E0B" fontWeight="bold"> ✦ NEW</tspan>
                      )}
                      {model.isPaid && (
                        <tspan fontSize="15" fontWeight="bold" fill="#059669"> 💲</tspan>
                      )}
                      {model.isFreeApi && (
                        <tspan fontSize="15" fontWeight="bold" fill="#2563EB"> 🌐</tspan>
                      )}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
          </svg>
        </div>
      </div>
    </div>
  );
};
