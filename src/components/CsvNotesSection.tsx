import React from 'react';
import { CSV_NOTES_DATA } from '../data/csvNotesData';
import { Language } from '../utils/i18n';
import { CsvNotesMetadata } from '../types';
import { ExternalLink, Lightbulb, Table2 } from 'lucide-react';

interface CsvNotesSectionProps {
  appLang: Language;
  notesMeta?: CsvNotesMetadata;
}

/**
 * Helper to render text with automatically clickable URLs
 */
function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s,)]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 dark:text-emerald-400 hover:underline font-mono inline-flex items-center gap-0.5 break-all font-medium"
        >
          <span>{part}</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0 inline ml-0.5" />
        </a>
      );
    }
    return part;
  });
}

export const CsvNotesSection: React.FC<CsvNotesSectionProps> = ({ appLang, notesMeta }) => {
  const { columnsGuide, practicalGuide } = CSV_NOTES_DATA;
  const isDe = appLang === 'de';

  // Section 1 Title: dynamically from Cell A34 (synced from CSV)
  const dynamicSec1Title = notesMeta?.section1Title?.trim();
  const title1 = isDe
    ? (dynamicSec1Title && dynamicSec1Title !== 'How To Read'
        ? dynamicSec1Title
        : columnsGuide.titleDe)
    : (dynamicSec1Title || columnsGuide.titleEn);

  // Section 2 Title: dynamically from Cell N34 (synced from CSV)
  const dynamicSec2Title = notesMeta?.section2Title?.trim();
  const title2 = isDe
    ? (dynamicSec2Title && dynamicSec2Title !== "What Bots can & can't do for you"
        ? dynamicSec2Title
        : practicalGuide.titleDe)
    : (dynamicSec2Title || practicalGuide.titleEn);

  // Paragraphs: 1:1 text from CSV table
  const paragraphs1 = isDe ? columnsGuide.paragraphsDe : columnsGuide.paragraphsEn;
  const paragraphs2 = isDe ? practicalGuide.paragraphsDe : practicalGuide.paragraphsEn;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs transition-colors">
      {/* Zwei visuell getrennte Bereiche direkt aus der CSV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Bereich 1: How To Read (Titel aus Zelle A34, Inhalt aus Zelle C34) */}
        <div className="flex flex-col bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs">
          {/* Header Bereich 1 */}
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <Table2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {title1}
            </h3>
          </div>

          {/* Inhalt Bereich 1 (1:1 Text) */}
          <div className="space-y-3.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 overflow-y-auto max-h-[620px] pr-2 scrollbar-thin">
            {paragraphs1.map((p, idx) => (
              <div
                key={idx}
                className={p.heading ? 'pt-2 border-t border-slate-200/60 dark:border-slate-800/60 first:border-t-0 first:pt-0' : ''}
              >
                {p.heading && (
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{p.heading}</span>
                  </h4>
                )}
                <p className="text-slate-600 dark:text-slate-300 leading-normal whitespace-pre-line">
                  {renderTextWithLinks(p.text)}
                </p>
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

        {/* Bereich 2: What Bots can & can't do for you (Titel aus Zelle N34, Inhalt aus Zelle O34) */}
        <div className="flex flex-col bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs">
          {/* Header Bereich 2 */}
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {title2}
            </h3>
          </div>

          {/* Inhalt Bereich 2 (1:1 Text aus CSV Tabelle) */}
          <div className="space-y-3.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 overflow-y-auto max-h-[620px] pr-2 scrollbar-thin">
            {paragraphs2.map((p, idx) => (
              <div
                key={idx}
                className={p.heading ? 'pt-2 border-t border-slate-200/60 dark:border-slate-800/60 first:border-t-0 first:pt-0' : ''}
              >
                {p.heading && (
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>{p.heading}</span>
                  </h4>
                )}
                <p className="text-slate-600 dark:text-slate-300 leading-normal whitespace-pre-line">
                  {renderTextWithLinks(p.text)}
                </p>
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
          </div>
        </div>
      </div>
    </section>
  );
};
