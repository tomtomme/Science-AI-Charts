import React, { useMemo } from 'react';
import { BookOpen, Layers, Search } from 'lucide-react';
import { GLOSSARY_TERMS, GlossaryCategory, WEIGHTS_CONCEPTS } from '../../data/labMatrixData';

export interface LabWeightsAndGlossaryProps {
  lang: 'de' | 'en';
  glossaryCategory: GlossaryCategory | 'all';
  onGlossaryCategoryChange: (cat: GlossaryCategory | 'all') => void;
  glossarySearch: string;
  onGlossarySearchChange: (query: string) => void;
}

export const LabWeightsAndGlossary: React.FC<LabWeightsAndGlossaryProps> = ({
  lang,
  glossaryCategory,
  onGlossaryCategoryChange,
  glossarySearch,
  onGlossarySearchChange,
}) => {
  // Alphabetically sorted glossary terms according to active language (A-Z)
  const sortedGlossaryTerms = useMemo(() => {
    return [...GLOSSARY_TERMS].sort((a, b) => {
      const nameA = lang === 'de' ? a.termDe : a.termEn;
      const nameB = lang === 'de' ? b.termDe : b.termEn;
      return nameA.localeCompare(nameB, lang === 'de' ? 'de' : 'en', { sensitivity: 'base' });
    });
  }, [lang]);

  // Filtered glossary terms based on active category & search
  const filteredGlossaryTerms = useMemo(() => {
    return sortedGlossaryTerms.filter((term) => {
      if (glossaryCategory !== 'all' && term.category !== glossaryCategory) {
        return false;
      }
      if (glossarySearch.trim()) {
        const query = glossarySearch.toLowerCase().trim();
        const text = `${term.termDe} ${term.termEn} ${term.badgeDe} ${term.badgeEn} ${term.shortDe} ${term.shortEn} ${term.detailDe} ${term.detailEn}`.toLowerCase();
        return text.includes(query);
      }
      return true;
    });
  }, [sortedGlossaryTerms, glossaryCategory, glossarySearch]);

  return (
    <>
      {/* Weights Concepts Explainer Section */}
      <section
        id="weights-explainer-section"
        className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
        aria-label={lang === 'de' ? 'Erklärung der Bereitstellungsmodelle' : 'Distribution models explanation'}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {lang === 'de' ? 'Konzepte: Open vs. Hybrid vs. Closed' : 'Concepts: Open vs. Hybrid vs. Closed'}
            </h3>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {lang === 'de' ? 'Definition der Bereitstellungs- und Betriebsmodelle' : 'Definition of model distribution and access models'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Open Weights Card */}
          <div
            id="weights-open"
            className="p-4 rounded-xl border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/40 dark:bg-cyan-950/20 transition-all scroll-mt-20"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0" />
                <span>{lang === 'de' ? WEIGHTS_CONCEPTS.open.titleDe : WEIGHTS_CONCEPTS.open.titleEn}</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800">
                {lang === 'de' ? 'Offen' : 'Open'}
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 mb-3">
              {(lang === 'de' ? WEIGHTS_CONCEPTS.open.bulletsDe : WEIGHTS_CONCEPTS.open.bulletsEn).map((bullet, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-cyan-500 shrink-0 font-bold">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-cyan-100 dark:border-cyan-900/40 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-300">
                {lang === 'de' ? 'Beispiele: ' : 'Examples: '}
              </span>
              <span>{WEIGHTS_CONCEPTS.open.examples}</span>
            </div>
          </div>

          {/* Hybrid Card */}
          <div
            id="weights-hybrid"
            className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 transition-all scroll-mt-20"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                <span>{lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.titleDe : WEIGHTS_CONCEPTS.hybrid.titleEn}</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                Hybrid
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 mb-3">
              {(lang === 'de' ? WEIGHTS_CONCEPTS.hybrid.bulletsDe : WEIGHTS_CONCEPTS.hybrid.bulletsEn).map((bullet, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-purple-500 shrink-0 font-bold">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-purple-100 dark:border-purple-900/40 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-300">
                {lang === 'de' ? 'Beispiele: ' : 'Examples: '}
              </span>
              <span>{WEIGHTS_CONCEPTS.hybrid.examples}</span>
            </div>
          </div>

          {/* Closed Weights Card */}
          <div
            id="weights-closed"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 transition-all scroll-mt-20"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
                <span>{lang === 'de' ? WEIGHTS_CONCEPTS.closed.titleDe : WEIGHTS_CONCEPTS.closed.titleEn}</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                {lang === 'de' ? 'Geschlossen' : 'Closed'}
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 mb-3">
              {(lang === 'de' ? WEIGHTS_CONCEPTS.closed.bulletsDe : WEIGHTS_CONCEPTS.closed.bulletsEn).map((bullet, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-slate-600 dark:text-slate-400 shrink-0 font-bold">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-300">
                {lang === 'de' ? 'Beispiele: ' : 'Examples: '}
              </span>
              <span>{WEIGHTS_CONCEPTS.closed.examples}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Glossary & Key Concepts Explainer Section */}
      <section
        className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
        aria-label={lang === 'de' ? 'Glossar und Fachbegriffe' : 'Glossary and key terms'}
      >
        <div
          id="glossary-section"
          className="scroll-mt-24 flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {lang === 'de' ? 'Glossar: Fachbegriffe, Modelltypen & Methoden' : 'Glossary: Key Concepts, Model Types & Methods'}
            </h3>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {lang === 'de'
              ? 'Didaktisch aufbereitet für Erstsemester: Metaphern und Symbolbilder statt Fachchinesisch'
              : 'Intuitive explanations designed for first-semester students: visual metaphors over jargon'}
          </span>
        </div>

        {/* Filter-Leiste & Suchfeld für das Glossar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
          {/* Kategorie-Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            {[
              { key: 'all', labelDe: 'Alle Begriffe', labelEn: 'All Terms' },
              { key: 'foundations', labelDe: 'Wissenschaftstheorie', labelEn: 'Science & Foundations' },
              { key: 'statistics', labelDe: 'Statistische Modelle & Regression', labelEn: 'Statistical Models' },
              { key: 'architecture', labelDe: 'Sprachmodelle & KI', labelEn: 'LLMs & AI Architecture' },
              { key: 'agentic', labelDe: 'Agentensteuerung', labelEn: 'Agents & Scaffolding' },
              { key: 'evaluation', labelDe: 'Tests & Benchmarks', labelEn: 'Tests & Benchmarks' },
              { key: 'infrastructure', labelDe: 'Infrastruktur & APIs', labelEn: 'Infrastructure' },
            ].map((cat) => {
              const count = cat.key === 'all'
                ? GLOSSARY_TERMS.length
                : GLOSSARY_TERMS.filter((t) => t.category === cat.key).length;
              const isActive = glossaryCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => onGlossaryCategoryChange(cat.key as GlossaryCategory | 'all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 border border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  <span>{lang === 'de' ? cat.labelDe : cat.labelEn}</span>
                  <span className={`text-xs px-1.5 py-0.5 leading-none rounded-full font-mono ${isActive ? 'bg-blue-500/80 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Suchleiste */}
          <div className="relative min-w-[200px] sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={glossarySearch}
              onChange={(e) => onGlossarySearchChange(e.target.value)}
              placeholder={lang === 'de' ? 'Begriff filtern...' : 'Filter concepts...'}
              className="w-full pl-8 pr-7 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            {glossarySearch && (
              <button
                type="button"
                onClick={() => onGlossarySearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold"
                title="Suche leeren"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Karten-Raster der Begriffe */}
        {filteredGlossaryTerms.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">
            {lang === 'de'
              ? 'Kein Glossarbegriff entspricht dem aktuellen Filter.'
              : 'No glossary terms match your current filter.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredGlossaryTerms.map((term) => {
              const badgeClass =
                term.category === 'statistics'
                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                  : term.category === 'foundations'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : term.category === 'architecture'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                  : term.category === 'agentic'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  : term.category === 'evaluation'
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

              const detailText = lang === 'de' ? term.detailDe : term.detailEn;
              const hasMetaphor = detailText.includes('Metapher:') || detailText.includes('Grundsatz:') || detailText.includes('Analogy:') || detailText.includes('Foundational rule:');

              return (
                <div
                  key={term.id}
                  id={term.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all scroll-mt-24 flex flex-col justify-between shadow-2xs hover:shadow-xs"
                >
                  <div>
                    {/* Header: Name + Category Badge */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {lang === 'de' ? term.termDe : term.termEn}
                      </h4>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badgeClass}`}>
                        {lang === 'de' ? term.badgeDe : term.badgeEn}
                      </span>
                    </div>

                    {/* Short summary definition */}
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 leading-snug mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                      {lang === 'de' ? term.shortDe : term.shortEn}
                    </p>

                    {/* Detailed explanation with highlighted metaphor / symbol */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1.5">
                      {hasMetaphor ? (
                        detailText.split(/(Grundsatz:|Metapher:|Analogy:|Foundational rule:)/g).map((part, i) => {
                          if (['Grundsatz:', 'Metapher:', 'Analogy:', 'Foundational rule:'].includes(part)) {
                            return (
                              <span key={i} className="font-bold text-slate-800 dark:text-slate-200 block pt-1 text-xs">
                                💡 {part}
                              </span>
                            );
                          }
                          return <span key={i}>{part}</span>;
                        })
                      ) : (
                        <span>{detailText}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
};
