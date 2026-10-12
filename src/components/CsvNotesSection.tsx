import React, { useState } from 'react';
import { CSV_NOTES_DATA } from '../data/csvNotesData';
import { Language } from '../utils/i18n';
import { BookOpen, ExternalLink, HelpCircle, Lightbulb, Quote, Table2 } from 'lucide-react';

interface CsvNotesSectionProps {
  appLang: Language;
}

export const CsvNotesSection: React.FC<CsvNotesSectionProps> = ({ appLang }) => {
  // Can follow appLang by default, with local toggle allowing reading in either language
  const [sectionLang, setSectionLang] = useState<Language>(appLang);

  // Sync if appLang changes, but let user toggle locally
  React.useEffect(() => {
    setSectionLang(appLang);
  }, [appLang]);

  const { columnsGuide, practicalGuide } = CSV_NOTES_DATA;
  const isDe = sectionLang === 'de';

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs transition-colors">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {isDe ? 'CSV-Leitfaden & Hintergrundwissen' : 'CSV Guide & In-Depth Notes'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {isDe
                ? 'Original-Dokumentation aus den CSV-Zellen B34/C34 und N34/O34'
                : 'Original documentation from CSV cells B34/C34 and N34/O34'}
            </p>
          </div>
        </div>

        {/* Language selector for the guide */}
        <div className="flex items-center gap-1.5 self-start sm:self-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5 text-xs font-mono">
          <span className="text-[10px] text-slate-400 px-1 font-sans">
            {isDe ? 'Sprache:' : 'Language:'}
          </span>
          <button
            type="button"
            onClick={() => setSectionLang('de')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              sectionLang === 'de'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            DE (Deutsch)
          </button>
          <button
            type="button"
            onClick={() => setSectionLang('en')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              sectionLang === 'en'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            EN (English)
          </button>
        </div>
      </div>

      {/* Two visually separated areas: Area 1 (B34 / C34) & Area 2 (N34 / O34) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Area 1: Zellen B34 & C34 (Columns & Benchmarks Guide) */}
        <div className="flex flex-col bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs">
          {/* Header Area 1 */}
          <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {isDe ? columnsGuide.titleDe : columnsGuide.titleEn}
              </h3>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
              CSV: B34 / C34
            </span>
          </div>

          {/* Content Area 1 */}
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 overflow-y-auto max-h-[600px] pr-1.5 scrollbar-thin">
            {(isDe ? columnsGuide.paragraphsDe : columnsGuide.paragraphsEn).map((p, idx) => (
              <div
                key={idx}
                className={p.heading ? 'pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 first:border-t-0 first:pt-0' : ''}
              >
                {p.heading && (
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{p.heading}</span>
                  </h4>
                )}
                <p className="text-slate-600 dark:text-slate-300 leading-normal">{p.text}</p>
                {p.link && (
                  <a
                    href={p.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline mt-1 font-medium"
                  >
                    <span>{p.link.label}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Area 2: Zellen N34 & O34 (What Bots can & can't do for you) */}
        <div className="flex flex-col bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs">
          {/* Header Area 2 */}
          <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {isDe ? practicalGuide.titleDe : practicalGuide.titleEn}
              </h3>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shrink-0">
              CSV: N34 / O34
            </span>
          </div>

          {/* Content Area 2 */}
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 overflow-y-auto max-h-[600px] pr-1.5 scrollbar-thin">
            {(isDe ? practicalGuide.paragraphsDe : practicalGuide.paragraphsEn).map((p, idx) => (
              <div
                key={idx}
                className={p.heading ? 'pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 first:border-t-0 first:pt-0' : ''}
              >
                {p.heading && (
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>{p.heading}</span>
                  </h4>
                )}
                <p className="text-slate-600 dark:text-slate-300 leading-normal">{p.text}</p>
                {p.link && (
                  <a
                    href={p.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline mt-1 font-medium"
                  >
                    <span>{p.link.label}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            ))}

            {/* Quote Block Prof. Lischke */}
            {practicalGuide.quote && (
              <div className="mt-3 p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 relative">
                <Quote className="w-4 h-4 text-blue-400 dark:text-blue-500 absolute top-2.5 right-2.5 opacity-60" />
                <div className="font-semibold text-blue-900 dark:text-blue-200 text-xs mb-1">
                  {isDe ? `Zitat ${practicalGuide.quote.author}:` : `Citation ${practicalGuide.quote.author}:`}
                </div>
                <blockquote className="text-[11.5px] italic text-blue-950 dark:text-blue-100 leading-relaxed">
                  {isDe ? practicalGuide.quote.textDe : practicalGuide.quote.textEn}
                </blockquote>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
