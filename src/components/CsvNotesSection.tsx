import React from 'react';
import { CSV_NOTES_DATA } from '../data/csvNotesData';
import { Language } from '../utils/i18n';
import { CsvNotesMetadata, CsvParagraph } from '../types';
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

/**
 * Resolves the color of benchmark headings in cell C34 to match the bar graph and category slider
 */
function getBenchmarkHeadingColor(heading?: string): string {
  if (!heading) return '#10B981';
  const clean = heading.toLowerCase().replace(/^[-–—\s]+/, '').replace(/[:=.]/g, '').trim();

  // 1. IQ (Col D)
  if (clean === 'iq' || clean.startsWith('iq ') || clean.includes('aa-ii')) return '#8B5CF6';

  // 2. Non-Hallu-Rate (Col E)
  if (clean.includes('non-hallu') || clean.includes('non-hallucination') || clean.includes('faktentreue')) return '#10B981';

  // 3. Science Knowledge (Col F)
  if (clean.includes('science knowledge') || clean.includes('faktenwissen') || clean.includes('omniscience')) return '#3B82F6';

  // 4. Plot Reading (Col G)
  if (clean.includes('plot reading') || clean.includes('diagrammanalyse') || clean.includes('mmmu')) return '#F59E0B';

  // 5. Diagnostics (Col H)
  if (clean.includes('diagnostic') || clean.includes('diagnostik') || clean.includes('medical') || clean.includes('mlcr')) return '#F43F5E';

  // 6. Excel Analyst (Col I)
  if (clean.includes('excel analyst') || clean.includes('excel agent') || clean === 'excel') return '#06B6D4';

  // 7. (3D) Trick Questions (Col J)
  if (clean.includes('trick questions') || clean.includes('trickfragen') || clean.includes('simplebench') || clean.includes('(3d)')) return '#6366F1';

  // 8. Real Econ & Legal Work (Col K)
  if (clean.includes('real econ') || clean.includes('econ & legal') || clean.includes('wirtschaft') || clean.includes('vals')) return '#EA580C';

  // Sub-headings under Chatbot Ranking
  if (clean === 'current' || clean.startsWith('current')) return '#2563EB';
  if (clean === 'history' || clean.startsWith('history')) return '#7C3AED';

  // Final scores & other sub-headings
  if (clean === 'old' || clean.startsWith('old') || clean.includes('spalte l') || clean.includes('column l')) return '#D97706';
  if (clean === 'new' || clean.startsWith('new') || clean.includes('spalte m') || clean.includes('column m')) return '#10B981';
  if (clean.includes('worst-case') || clean.includes('worst case') || clean.includes('spalte n') || clean.includes('column n') || clean.includes('why') || clean.includes('warum')) return '#F43F5E';
  if (clean.includes('storyline')) return '#06B6D4';

  return '#10B981';
}

/**
 * Resolves exact anchor DOM IDs for column paragraphs (Col D to N) to support targeted scrolling from the slider
 */
export function getParagraphAnchorId(heading?: string): string | undefined {
  if (!heading) return undefined;
  const h = heading.toLowerCase().replace(/^[-–—\s]+/, '').replace(/[:=.]/g, '').trim();

  // Major section: Chatbot Ranking
  if (h.includes('chatbot ranking') || h.includes('chatbot-rangliste') || h.includes('chatbot rangliste') || h === 'ranking') return 'ranking-section';

  // Sub-headings under Chatbot Ranking
  if (h === 'current' || h.startsWith('current')) return 'note-current';
  if (h === 'history' || h.startsWith('history')) return 'note-history';

  // Major section: Benchmarks explainer
  if (h.includes('different benchmarks') || h.includes('verschiedenen benchmarks') || h.includes('result in the') || h.includes('comprise')) return 'categories-section';

  // Cat 1: IQ (Col D)
  if (h.includes('spalte d') || h.includes('column d') || h.startsWith('iq') || h.includes('aa-ii')) return 'note-col-d';

  // Cat 2: Non-Hallu-Rate (Col E)
  if (h.includes('spalte e') || h.includes('column e') || h.includes('non-hallu') || h.includes('non-hallucination') || h.includes('faktentreue')) return 'note-col-e';

  // Cat 3: Science Knowledge (Col F)
  if (h.includes('spalte f') || h.includes('column f') || h.includes('science knowledge') || h.includes('omniscience') || h.includes('faktenwissen')) return 'note-col-f';

  // Cat 4: Plot Reading (Col G)
  if (h.includes('spalte g') || h.includes('column g') || h.includes('plot reading') || h.includes('mmmu') || h.includes('diagrammanalyse')) return 'note-col-g';

  // Cat 5: Diagnostics (Col H)
  if (h.includes('spalte h') || h.includes('column h') || h.includes('diagnostic') || h.includes('diagnostik') || h.includes('medical') || h.includes('mlcr')) return 'note-col-h';

  // Cat 6: Excel Analyst (Col I)
  if (h.includes('spalte i') || h.includes('column i') || h.includes('excel')) return 'note-col-i';

  // Cat 7: (3D) Trick Questions (Col J)
  if (h.includes('spalte j') || h.includes('column j') || h.includes('trick questions') || h.includes('trickfragen') || h.includes('simplebench') || h.includes('(3d)')) return 'note-col-j';

  // Cat 8: Real Econ & Legal Work (Col K)
  if (h.includes('spalte k') || h.includes('column k') || h.includes('real econ') || h.includes('econ & legal') || h.includes('vals') || h.includes('wirtschaft')) return 'note-col-k';

  // Major section: Final Scores
  if ((h.includes('final scores') || h.includes('final score') || h.includes('finale scores')) && (h.includes('comprised') || h.includes('zusammensetzen') || (!h.includes('old') && !h.includes('new') && !h.includes('worst')))) return 'final-scores-section';

  // Final Score OLD (Col L)
  if (h.includes('spalte l') || h.includes('column l') || h.includes('score old') || h === 'old' || h.startsWith('old ') || h.startsWith('old:')) return 'note-col-l';

  // Final Score NEW (Col M)
  if (h.includes('spalte m') || h.includes('column m') || h.includes('score new') || h === 'new' || h.startsWith('new ') || h.startsWith('new:')) return 'note-col-m';

  // Worst-Case (Col N)
  if (h.includes('spalte n') || h.includes('column n') || h.includes('worst-case') || h.includes('worst case') || h.startsWith('worst')) return 'note-col-n';

  // Storyline
  if (h.includes('storyline')) return 'note-storyline';

  return undefined;
}

/**
 * Dynamically parse Section 1 content from Cell C34 into headings & paragraphs,
 * honoring dash cues ('- '), dashed divider lines ('---'), and section cues added by the user.
 */
export function parseSection1Text(rawText: string): CsvParagraph[] {
  if (!rawText) return [];

  interface Cut {
    start: number;
    end: number;
    heading: string;
    isMajor: boolean;
  }
  const cuts: Cut[] = [];

  // 1. Major section dividers with 3+ dashes (e.g. 'Chatbot Ranking------------------', 'The different benchmarks which comprise the "Final Scores"------------------')
  const secRegex = /([A-Za-z0-9"'\s]+?)\s*-{3,}\s*/g;
  let match: RegExpExecArray | null;
  while ((match = secRegex.exec(rawText)) !== null) {
    cuts.push({
      start: match.index,
      end: match.index + match[0].length,
      heading: match[1].trim(),
      isMajor: true,
    });
  }

  // 2. Sub-headings: Current & History under Chatbot Ranking
  const currentRegex = /(?:^|\r?\n|[:.!?)]|[^\w\s])\s*-+\s*(Current)\b(?:\s*[:=]|\s*\r?\n|\s+(?=is\b))/gi;
  while ((match = currentRegex.exec(rawText)) !== null) {
    cuts.push({
      start: match.index,
      end: match.index + match[0].length,
      heading: 'Current',
      isMajor: false,
    });
  }

  const historyRegex = /(?:^|\r?\n|[:.!?)]|[^\w\s])\s*-+\s*(History)\b(?:\s*[:=]|\s*\r?\n|\s+(?=shows\b))/gi;
  while ((match = historyRegex.exec(rawText)) !== null) {
    cuts.push({
      start: match.index,
      end: match.index + match[0].length,
      heading: 'History',
      isMajor: false,
    });
  }

  // 3. Bullets starting with '-' followed by label with ':' or '='
  const bulletRegex = /(?:^|\r?\n|[.!?):]|\bquestions|[^\w\s])\s*-+\s*([A-Z(][A-Za-z0-9()&'" \/-]*?)([:=])\s*/g;
  while ((match = bulletRegex.exec(rawText)) !== null) {
    cuts.push({
      start: match.index,
      end: match.index + match[0].length,
      heading: match[1].trim(),
      isMajor: false,
    });
  }

  // 4. Match 'OLD:' right after Final Scores divider
  const idxOld = rawText.indexOf('OLD:');
  if (idxOld !== -1) {
    cuts.push({
      start: idxOld,
      end: idxOld + 4,
      heading: 'OLD',
      isMajor: false,
    });
  }

  // 5. Match 'Storyline' note (with or without dash or colon)
  const storyRegex = /(?:^|\r?\n)\s*(?:-+\s*)?Storyline\b(?:\s*[:=]|\s+contains\b)?/gi;
  while ((match = storyRegex.exec(rawText)) !== null) {
    cuts.push({
      start: match.index,
      end: match.index + match[0].length,
      heading: 'Storyline',
      isMajor: false,
    });
  }

  // Sort by start index
  cuts.sort((a, b) => a.start - b.start || (b.isMajor ? 1 : 0) - (a.isMajor ? 1 : 0));

  // Remove overlapping cuts, preferring major sections if they overlap
  const filtered: Cut[] = [];
  for (const c of cuts) {
    if (filtered.length === 0) {
      filtered.push(c);
    } else {
      const prev = filtered[filtered.length - 1];
      if (c.start < prev.end) {
        if (c.isMajor && !prev.isMajor) {
          filtered[filtered.length - 1] = c;
        }
        continue;
      }
      filtered.push(c);
    }
  }

  if (filtered.length === 0) {
    return rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(text => ({ text }));
  }

  const result: CsvParagraph[] = [];

  // If there is intro text before the first cut
  if (filtered[0].start > 0) {
    const intro = rawText.slice(0, filtered[0].start).trim().replace(/^[.\s\-]+/, '');
    if (intro) {
      result.push({ text: intro, isMajor: false });
    }
  }

  for (let i = 0; i < filtered.length; i++) {
    const cur = filtered[i];
    const nextStart = i + 1 < filtered.length ? filtered[i + 1].start : rawText.length;
    let chunk = rawText.slice(cur.end, nextStart).trim();
    chunk = chunk.replace(/^[.\s\-]+/, '').trim();
    if (chunk || cur.isMajor) {
      result.push({
        heading: cur.heading,
        isMajor: cur.isMajor,
        text: chunk,
      });
    }
  }

  return result;
}

/**
 * Dynamically parse Section 2 content from Cell O34 into headings & paragraphs
 */
function parseSection2Text(rawText: string): CsvParagraph[] {
  if (!rawText) return [];
  const headers = [
    'Zensur & Datenschutz:',
    'IQ:',
    'Sparfuchs-Tipp:',
    '"Saturation"-Problem:',
    'Konversations-Tipp:',
    'Anti-Bullshit-Tipp:',
    'Wann KI nutzen und wann nicht?',
    'Censorship & Data Privacy:',
    'Frugal Tip:',
    'Conversation Tip:',
    'Anti-Bullshit Tip:',
    'When to use AI and when not?'
  ];

  interface Cut {
    start: number;
    end: number;
    heading: string;
  }
  const cuts: Cut[] = [];
  for (const h of headers) {
    const idx = rawText.indexOf(h);
    if (idx !== -1) {
      cuts.push({
        start: idx,
        end: idx + h.length,
        heading: h.replace(/[:.]+$/, '').trim(),
      });
    }
  }
  cuts.sort((a, b) => a.start - b.start);

  if (cuts.length === 0) {
    return rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(text => ({ text }));
  }

  const result: CsvParagraph[] = [];
  if (cuts[0].start > 0) {
    const intro = rawText.slice(0, cuts[0].start).trim();
    if (intro) result.push({ text: intro });
  }

  for (let i = 0; i < cuts.length; i++) {
    const cur = cuts[i];
    const nextStart = i + 1 < cuts.length ? cuts[i + 1].start : rawText.length;
    const chunk = rawText.slice(cur.end, nextStart).trim();
    if (chunk) {
      result.push({
        heading: cur.heading,
        text: chunk,
      });
    }
  }

  return result;
}

/**
 * Maps dynamically parsed paragraphs from cell C34 to German when DE is active.
 * Retains full synchronization with CSV while providing high-quality German translations.
 */
function getBilingualSection1Paragraphs(
  dynamicParagraphs: CsvParagraph[],
  curatedDe: CsvParagraph[],
  curatedEn: CsvParagraph[],
  isDe: boolean
): CsvParagraph[] {
  if (!isDe) {
    return dynamicParagraphs.length > 0 ? dynamicParagraphs : curatedEn;
  }

  if (dynamicParagraphs.length === 0) {
    return curatedDe;
  }

  return dynamicParagraphs.map((p, idx) => {
    const anchorId = getParagraphAnchorId(p.heading);

    // 1. Try to find match in curatedDe by anchor ID
    if (anchorId) {
      const match = curatedDe.find((c) => getParagraphAnchorId(c.heading) === anchorId);
      if (match) {
        return {
          ...match,
          isMajor: p.isMajor ?? match.isMajor,
          link: p.link || match.link,
        };
      }
    }

    // 2. Keyword match by heading
    if (p.heading) {
      const pClean = p.heading.toLowerCase();
      const match = curatedDe.find((c) => {
        const cClean = (c.heading || '').toLowerCase();
        if (pClean.includes('ranking') && (cClean.includes('ranking') || cClean.includes('rangliste'))) return true;
        if (pClean.includes('benchmark') && (cClean.includes('benchmark') || cClean.includes('kategorie'))) return true;
        if (pClean.includes('final score') && (cClean.includes('final score') || cClean.includes('finale score'))) return true;
        if (pClean.includes('storyline') && cClean.includes('storyline')) return true;
        if (pClean === 'current' && cClean === 'current') return true;
        if (pClean === 'history' && cClean === 'history') return true;
        return false;
      });
      if (match) {
        return {
          ...match,
          isMajor: p.isMajor ?? match.isMajor,
          link: p.link || match.link,
        };
      }
    }

    // 3. Fallback to index match if available
    if (curatedDe[idx]) {
      return {
        ...curatedDe[idx],
        isMajor: p.isMajor ?? curatedDe[idx].isMajor,
      };
    }

    // 4. Return paragraph with original content
    return p;
  });
}

function getBilingualSection2Paragraphs(
  dynamicParagraphs: CsvParagraph[],
  curatedDe: CsvParagraph[],
  curatedEn: CsvParagraph[],
  isDe: boolean
): CsvParagraph[] {
  // If German is requested:
  // Cell O34 in the sheet is written in German. If dynamic paragraphs are in German, use them!
  if (isDe) {
    if (dynamicParagraphs.length > 0) {
      const firstHeading = (dynamicParagraphs[0]?.heading || '').toLowerCase();
      const isDynamicDe =
        firstHeading.includes('zensur') ||
        firstHeading.includes('sparfuchs') ||
        firstHeading.includes('konversation') ||
        firstHeading.includes('wann');
      if (isDynamicDe) {
        return dynamicParagraphs;
      }
    }
    return curatedDe;
  }

  // If English is requested (!isDe):
  // Check if dynamic is already English (e.g. if the sheet was updated to English in the future)
  if (dynamicParagraphs.length > 0) {
    const firstHeading = (dynamicParagraphs[0]?.heading || '').toLowerCase();
    const isDynamicEn =
      firstHeading.includes('censor') ||
      firstHeading.includes('privacy') ||
      firstHeading.includes('frugal') ||
      firstHeading.includes('conversation');
    if (isDynamicEn) {
      return dynamicParagraphs;
    }
  }

  // Since cell O34 in the sheet is German only, return curatedEn for English users
  return curatedEn;
}

export const CsvNotesSection: React.FC<CsvNotesSectionProps> = ({ appLang, notesMeta }) => {
  const { columnsGuide, practicalGuide } = CSV_NOTES_DATA;
  const isDe = appLang === 'de';

  // Section 1 Title: dynamically from Cell A34 (synced from CSV)
  const dynamicSec1Title = notesMeta?.section1Title?.trim();
  const isSec1TitleEn = !dynamicSec1Title || dynamicSec1Title.toLowerCase().includes('how to');
  const title1 = isDe
    ? (isSec1TitleEn ? columnsGuide.titleDe : dynamicSec1Title)
    : (dynamicSec1Title || columnsGuide.titleEn);

  // Section 2 Title: dynamically from Cell N34 (synced from CSV)
  const dynamicSec2Title = notesMeta?.section2Title?.trim();
  const isSec2TitleEn = !dynamicSec2Title || dynamicSec2Title.toLowerCase().includes('what bot');
  const title2 = isDe
    ? (isSec2TitleEn ? practicalGuide.titleDe : dynamicSec2Title)
    : (dynamicSec2Title || practicalGuide.titleEn);

  // Dynamically parse live CSV strings from C34 and O34
  const dynamicP1 = notesMeta?.section1Content
    ? parseSection1Text(notesMeta.section1Content)
    : [];
  const dynamicP2 = notesMeta?.section2Content
    ? parseSection2Text(notesMeta.section2Content)
    : [];

  // Paragraphs for Box 1 (Cell C34):
  // Synchronized with live CSV, presenting German when 'de' is selected and English when 'en' is selected
  const paragraphs1 = getBilingualSection1Paragraphs(
    dynamicP1,
    columnsGuide.paragraphsDe,
    columnsGuide.paragraphsEn,
    isDe
  );

  // Paragraphs for Box 2 (Cell O34):
  // Synchronized with live CSV, presenting German when 'de' is selected and English when 'en' is selected
  const paragraphs2 = getBilingualSection2Paragraphs(
    dynamicP2,
    practicalGuide.paragraphsDe,
    practicalGuide.paragraphsEn,
    isDe
  );

  return (
    <section id="csv-notes-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs transition-colors">
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

          {/* Inhalt Bereich 1 (1:1 Text strukturiert mit Banderolen & Aufzählungs-Badges) */}
          <div id="section1-scroll-box" className="space-y-3.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 overflow-y-auto max-h-[620px] pr-2 scrollbar-thin">
            {paragraphs1.map((p, idx) => {
              // Differentiate between Header 1 (categories explainer: "The different benchmarks which comprise the Final Scores")
              // and Header 2 (the actual final scores section: "Final Scores")
              const cleanHeading = (p.heading || '').toLowerCase().trim();
              const isFinalScoresHeading =
                p.isMajor &&
                (cleanHeading.includes('final score') ||
                 cleanHeading.includes('final scores') ||
                 cleanHeading.includes('finale scores')) &&
                !cleanHeading.includes('result in the');

              const isCategoriesHeading =
                p.isMajor &&
                !isFinalScoresHeading &&
                (cleanHeading.includes('comprise') ||
                 cleanHeading.includes('result') ||
                 cleanHeading.includes('kategorie') ||
                 cleanHeading.includes('benchmark'));

              const isRankingHeading =
                p.isMajor &&
                (cleanHeading.includes('ranking') || cleanHeading.includes('chatbot'));

              const isFirstScoreParagraph =
                !p.isMajor &&
                (p.heading === 'Column L' ||
                 p.heading === 'Spalte L' ||
                 p.heading === 'OLD' ||
                 cleanHeading === 'final score old');

              const hasActualFinalScoresMajor = paragraphs1.some(
                (x) =>
                  x.isMajor &&
                  !x.heading?.toLowerCase().includes('result in the') &&
                  (x.heading?.toLowerCase().includes('final scores') ||
                   x.heading?.toLowerCase().trim() === 'final score' ||
                   x.heading?.toLowerCase().trim() === 'finale scores')
              );
              const isFinalScoresAnchor = isFinalScoresHeading || (!hasActualFinalScoresMajor && isFirstScoreParagraph);
              const paragraphAnchor = getParagraphAnchorId(p.heading);
              const anchorId = paragraphAnchor || (isFinalScoresAnchor ? 'final-scores-section' : isCategoriesHeading ? 'categories-section' : isRankingHeading ? 'ranking-section' : undefined);

              if (p.isMajor) {
                return (
                  <div
                    key={idx}
                    id={anchorId}
                    className={`mt-4 pt-3.5 pb-1 border-t border-slate-200 dark:border-slate-800 first:border-t-0 first:pt-0 first:mt-0 ${
                      anchorId ? 'scroll-mt-6 rounded-lg' : ''
                    }`}
                  >
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/90 rounded-lg border-l-4 border-slate-700 dark:border-slate-300 border-y border-r border-slate-200/90 dark:border-slate-700/80 mb-2 shadow-2xs">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-[13px] tracking-tight leading-snug">
                        {p.heading}
                      </h4>
                    </div>
                    {p.text && (
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line px-1 mb-2.5 text-xs">
                        {renderTextWithLinks(p.text)}
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  id={anchorId}
                  className={`${
                    p.heading ? 'pt-2 border-t border-slate-200/60 dark:border-slate-800/60 first:border-t-0 first:pt-0' : ''
                  } ${anchorId ? 'scroll-mt-6 p-2 rounded-lg' : ''}`}
                >
                  {p.heading && (() => {
                    const headingColor = getBenchmarkHeadingColor(p.heading);
                    return (
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs mb-1 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: headingColor }}
                        />
                        <span
                          className="font-bold font-mono text-xs tracking-tight"
                          style={{ color: headingColor }}
                        >
                          {p.heading}
                        </span>
                      </h4>
                    );
                  })()}
                  <p
                    className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-2.5 border-l-2"
                    style={{ borderColor: `${getBenchmarkHeadingColor(p.heading)}33` }}
                  >
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
              );
            })}
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
