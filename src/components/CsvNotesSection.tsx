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
  const urlRegex = /(https?:\/\/[^\s,)]+|www\.[^\s,)]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-black dark:text-white hover:text-slate-700 dark:hover:text-slate-200 underline decoration-slate-400 dark:decoration-slate-500 hover:decoration-black dark:hover:decoration-white font-mono inline-flex items-center gap-0.5 break-all font-semibold underline-offset-2 text-[11px]"
        >
          <span>{part}</span>
          <ExternalLink className="w-2 h-2 shrink-0 inline ml-0.5 opacity-80" />
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

  // 7. Experimenting & Engineering / GDPx (Col J, formerly (3D) Trick Questions)
  if (clean.includes('experimenting') || clean.includes('engineering') || clean.includes('agentic') || clean.includes('gdpx') || clean.includes('trick questions') || clean.includes('trickfragen') || clean.includes('simplebench') || clean.includes('(3d)')) return '#6366F1';

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

  // Major section: Benchmarks explainer ("The different benchmarks which result in the Final Scores")
  if (
    (h.includes('different benchmarks') || h.includes('verschiedenen benchmarks') || h.includes('result in the')) &&
    !h.includes('comprise') &&
    !h.includes('zusammensetzen')
  ) {
    return 'categories-section';
  }

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

  // Cat 7: Experimenting & Engineering (formerly Agentic Work / GDPx) (Col J)
  if (h.includes('spalte j') || h.includes('column j') || h.includes('experimenting') || h.includes('engineering') || h.includes('agentic') || h.includes('gdpx')) return 'note-col-j';

  // Cat 8: Real Econ & Legal Work (Col K)
  if (h.includes('spalte k') || h.includes('column k') || h.includes('real econ') || h.includes('econ & legal') || h.includes('vals') || h.includes('wirtschaft')) return 'note-col-k';

  // SimpleBench (historical Benchmark #7 / Col X, located right under Real Econ & Legal Work)
  if (h.includes('simplebench') || h.includes('trick questions') || h.includes('trickfragen') || h.includes('(3d)')) return 'note-col-simplebench';

  // Major section: Final Scores explainer ("The Final Scores which are comprised of the different benchmarks")
  if (
    (h.includes('final scores') || h.includes('final score') || h.includes('finale scores')) &&
    (h.includes('comprise') || h.includes('comprised') || h.includes('zusammensetzen') || (!h.includes('old') && !h.includes('new') && !h.includes('worst')))
  ) {
    return 'final-scores-section';
  }

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

  // 1. Major section dividers with 3+ dashes (e.g. 'Chatbot Ranking\n------------------', 'The different benchmarks which result in the "Final Scores" (explained below)\n------------------')
  const secRegex = /(?:^|\r?\n)\s*([^\r\n]+?)\s*\r?\n\s*-{3,}\s*/g;
  let match: RegExpExecArray | null;
  while ((match = secRegex.exec(rawText)) !== null) {
    const full = match[0];
    const heading = match[1].trim();
    const headingOffsetInMatch = full.indexOf(heading);
    cuts.push({
      start: match.index + headingOffsetInMatch,
      end: match.index + full.length,
      heading,
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

  // 3. Explicit known benchmark keywords (e.g. IQ, Non-Hallucination-Rate, Science Knowledge, Experimenting & Engineering, etc.)
  // Handles punctuation boundaries, optional dashes, spaces, and 'in %' suffixes
  const benchmarkKeywordsRegex = /(?:^|\r?\n|[.!?):]|\bquestions)\s*(?:-+\s*)?(IQ|Non-Hallu(?:cination)?-Rate(?:\s+in\s+%)?|Science Knowledge|Plot Reading|Diagnostics?|Excel Analyst|Experimenting(?:\s*&\s*Engineering)?|Agentic(?:\s+Work)?|GDPx|SimpleBench|\(3D\)\s*Trick Questions|Real Econ\s*&\s*Legal\s*Work)\s*([:=])\s*/gi;
  while ((match = benchmarkKeywordsRegex.exec(rawText)) !== null) {
    cuts.push({
      start: match.index,
      end: match.index + match[0].length,
      heading: match[1].trim(),
      isMajor: false,
    });
  }

  // 4. General bullets starting with '-' followed by label with ':' or '=' (now supporting %, /, &, and unicode dashes)
  const bulletRegex = /(?:^|\r?\n|[.!?):]|\bquestions|[^\w\s])\s*-+\s*([A-Z(][A-Za-z0-9()&'"\/%\s–—-]*?)([:=])\s*/g;
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
 * Dynamically parse Section 2 content from Cell O34 into headings & paragraphs,
 * detecting bullets starting with '-' followed by a heading and text.
 * Accurately parses bullet points without ever splitting URLs (http:// or https://).
 */
export function parseSection2Text(rawText: string): CsvParagraph[] {
  if (!rawText) return [];

  // Dedicated cues targeting the exact bullet structure of cell O34
  const topicCues = [
    { key: 'censorship', regex: /(?:^|\r?\n|\s)-\s*(Zensur\s*&\s*Datenschutz|Censorship\s*&\s*Data\s*Privacy)(?::|\r?\n|\s+)/i, defaultHeading: 'Zensur & Datenschutz' },
    { key: 'iq', regex: /(?:^|\r?\n|\s)-\s*(IQ)(?::|\r?\n|\s+)/i, defaultHeading: 'IQ' },
    { key: 'frugal', regex: /(?:^|\r?\n|\s)-\s*(Sparfuchs-Tipp|Frugal\s*Tip)(?::|\r?\n|\s+)/i, defaultHeading: 'Sparfuchs-Tipp' },
    { key: 'saturation', regex: /(?:^|\r?\n|\s)-\s*(Sättigungs-Problem|"Saturation"\s*Problem|Saturation\s*Problem)(?::|\r?\n|\s+)/i, defaultHeading: 'Sättigungs-Problem' },
    { key: 'conversation', regex: /(?:^|\r?\n|\s)-\s*(Konversations-Tipp|Conversation\s*Tip)(?::|\r?\n|\s+)/i, defaultHeading: 'Konversations-Tipp' },
    { key: 'antibullshit', regex: /(?:^|\r?\n|\s)-\s*(Anti-Unsinn-Tipp|Anti-Bullshit\s*Tip)(?::|\r?\n|\s+)/i, defaultHeading: 'Anti-Unsinn-Tipp' },
    { key: 'whentouse', regex: /(?:^|\r?\n|\s)-\s*(Wann\s+KI\s+nutzen\s+und\s+wann\s+nicht\?|When\s+to\s+use\s+AI\s+and\s+when\s+not\?)(?:\s+|\r?\n|$)/i, defaultHeading: 'Wann KI nutzen und wann nicht?' },
    { key: 'statsmachines', regex: /(?:^|\r?\n|\s)-\s*(KIs\s+sind\s+statistische\s+Maschinen\s+bzw\.\s+neuronale\s+Netze|AIs\s+are\s+statistical\s+machines\s+\(neural\s+networks\))(?:[.:]|\s+|\r?\n|$)/i, defaultHeading: 'KIs sind statistische Maschinen bzw. neuronale Netze' },
    { key: 'newreqs', regex: /(?:^|\r?\n|\s)-\s*(Neue\s+Anforderungen|Higher\s+Evaluation\s+Standards\s*&\s*Academic\s*Integrity)(?::|\s+|\r?\n|$)/i, defaultHeading: 'Neue Anforderungen' },
  ];

  interface Cut {
    start: number;
    end: number;
    heading: string;
    key?: string;
  }
  const cuts: Cut[] = [];

  for (const cue of topicCues) {
    const m = cue.regex.exec(rawText);
    if (m) {
      cuts.push({
        start: m.index,
        end: m.index + m[0].length,
        heading: cue.defaultHeading,
        key: cue.key,
      });
    }
  }

  // Also match general bullets starting with '-' followed by heading (using negative lookahead :(?!//) to never break on URLs)
  const generalBulletRegex = /(?:^|\r?\n)\s*-\s*([A-Za-z0-9ÄÖÜäöü"&(),.?!' -]{3,65}?)(?::(?!\/\/)|[?]\s+|\r?\n|$)\s*/g;
  let gMatch: RegExpExecArray | null;
  while ((gMatch = generalBulletRegex.exec(rawText)) !== null) {
    const heading = gMatch[1].trim();
    if (heading.length > 0 && !cuts.some((c) => Math.abs(c.start - gMatch!.index) < 10)) {
      cuts.push({
        start: gMatch.index,
        end: gMatch.index + gMatch[0].length,
        heading,
      });
    }
  }

  cuts.sort((a, b) => a.start - b.start);

  if (cuts.length === 0) {
    return rawText
      .split(/\r?\n\r?\n/)
      .map((chunk) => chunk.trim())
      .filter((text) => text.length > 0)
      .map((text) => ({ text }));
  }

  const result: CsvParagraph[] = [];
  if (cuts[0].start > 0) {
    const intro = rawText.slice(0, cuts[0].start).trim();
    if (intro) result.push({ text: intro });
  }

  for (let i = 0; i < cuts.length; i++) {
    const cur = cuts[i];
    const nextStart = i + 1 < cuts.length ? cuts[i + 1].start : rawText.length;
    let body = rawText.slice(cur.end, nextStart).trim();
    body = body.replace(/^[:.]\s*/, '').trim();
    if (body || cur.heading) {
      result.push({
        heading: cur.heading,
        text: body,
      });
    }
  }

  return result;
}

/**
 * Matches a Section 2 heading or text to one of the standard topic categories.
 */
function matchSection2Topic(heading?: string, text?: string): string {
  const norm = ((heading || '') + ' ' + (text || '').slice(0, 100)).toLowerCase();
  const cleanHeading = (heading || '').trim().toLowerCase();
  if (norm.includes('zensur') || norm.includes('censor') || norm.includes('datenschutz') || norm.includes('privacy')) return 'censorship';
  if (cleanHeading === 'iq' || cleanHeading.startsWith('iq:') || norm.includes('iq-tests') || norm.includes('aa-ii') || norm.includes('artificialanalysis')) return 'iq';
  if (norm.includes('sparfuchs') || norm.includes('frugal') || norm.includes('kostenpflichtig') || norm.includes('drittanbieter')) return 'frugal';
  if (norm.includes('saturation') || norm.includes('sättigung') || norm.includes('geleakte fragen')) return 'saturation';
  if (norm.includes('konversation') || norm.includes('conversation') || norm.includes('deep think')) return 'conversation';
  if (norm.includes('anti-unsinn') || norm.includes('anti-bullshit') || norm.includes('fake news') || norm.includes('fakenews')) return 'antibullshit';
  if (norm.includes('wann ki') || norm.includes('when to use') || norm.includes('wichtige kriterien') || norm.includes('inspiration')) return 'whentouse';
  if (norm.includes('statistische maschine') || norm.includes('statistical machine') || norm.includes('neuronale netze') || norm.includes('flowingdata') || norm.includes('terence tao')) return 'statsmachines';
  if (norm.includes('neue anforderung') || norm.includes('higher evaluation') || norm.includes('lischke') || norm.includes('wissenschaftlich arbeiten')) return 'newreqs';
  return '';
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
          heading: p.heading ? p.heading.replace(/[:=]+$/, '').trim() : match.heading,
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
        if ((pClean.includes('experimenting') || pClean.includes('engineering') || pClean.includes('agentic') || pClean.includes('gdpx')) && (cClean.includes('experimenting') || cClean.includes('engineering') || cClean.includes('agentic') || cClean.includes('gdpx'))) return true;
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
  if (dynamicParagraphs.length === 0) {
    return isDe ? curatedDe : curatedEn;
  }

  const findCuratedMatch = (p: CsvParagraph, pool: CsvParagraph[], fallbackIdx: number) => {
    const topicKey = matchSection2Topic(p.heading, p.text);
    if (topicKey) {
      const match = pool.find((c) => matchSection2Topic(c.heading, c.text) === topicKey);
      if (match) return match;
    }
    return pool[fallbackIdx] || null;
  };

  // GERMAN MODE: 1:1 LIVE SYNCHRONIZATION WITH CELL O34!
  // Any text edits, new sentences, links, or notes from the user in Google Sheets are rendered 1:1!
  if (isDe) {
    return dynamicParagraphs.map((p, idx) => {
      const matched = findCuratedMatch(p, curatedDe, idx);
      return {
        heading: p.heading || matched?.heading || '',
        text: p.text, // 1:1 Live CSV Text directly from cell O34
        link: matched?.link || p.link,
      };
    });
  }

  // ENGLISH MODE: Translate dynamic paragraphs to English!
  // Preserves any newly added links (such as the Golem link, Google Scholar Labs, etc.)
  return dynamicParagraphs.map((p, idx) => {
    const matched = findCuratedMatch(p, curatedEn, idx);
    if (matched) {
      let translatedText = matched.text;

      // Check if the live German text contains newly added URLs that are not yet in the baseline English translation
      const urlRegex = /(https?:\/\/[^\s,)]+)/g;
      const liveUrls: string[] = p.text.match(urlRegex) || [];
      const englishUrls: string[] = matched.text.match(urlRegex) || [];

      for (const url of liveUrls) {
        if (!englishUrls.includes(url)) {
          if (url.includes('golem.de')) {
            translatedText += `\nIt is just as unrealistic to revere AI as the savior of a utopia, see also: ${url}`;
          } else {
            translatedText += `\nSee also: ${url}`;
          }
        }
      }

      return {
        ...matched,
        heading: matched.heading,
        text: translatedText,
        link: matched.link || p.link,
      };
    }

    return p;
  });
}

export const CsvNotesSection: React.FC<CsvNotesSectionProps> = ({ appLang, notesMeta }) => {
  const { columnsGuide, practicalGuide } = CSV_NOTES_DATA;
  const isDe = appLang === 'de';

  // Section 1 Title: dynamically from Cell A34 / B34 (synced from CSV)
  const dynamicSec1Title = notesMeta?.section1Title?.trim();
  const isSec1TitleEn = !dynamicSec1Title || dynamicSec1Title.toLowerCase().includes('how to');
  const isSec1TitleDe = dynamicSec1Title && (
    dynamicSec1Title.toLowerCase().includes('anleitung') ||
    dynamicSec1Title.toLowerCase().includes('lesen')
  );
  const title1 = isDe
    ? (isSec1TitleEn ? columnsGuide.titleDe : dynamicSec1Title)
    : (isSec1TitleDe ? columnsGuide.titleEn : (dynamicSec1Title || columnsGuide.titleEn));

  // Section 2 Title: dynamically from Cell N34 (synced from CSV)
  const dynamicSec2Title = notesMeta?.section2Title?.trim();
  const isSec2TitleEn = !dynamicSec2Title || dynamicSec2Title.toLowerCase().includes('what bot');
  const isSec2TitleDe = dynamicSec2Title && (
    dynamicSec2Title.toLowerCase().includes('was bot') ||
    dynamicSec2Title.toLowerCase().includes('tun können')
  );
  const title2 = isDe
    ? (isSec2TitleEn ? practicalGuide.titleDe : dynamicSec2Title)
    : (isSec2TitleDe ? practicalGuide.titleEn : (dynamicSec2Title || practicalGuide.titleEn));

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
          <div className="flex items-center gap-2 pb-1.5 mb-1.5">
            <Table2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {title1}
            </h3>
          </div>

          {/* Inhalt Bereich 1 (1:1 Text strukturiert mit Banderolen & Aufzählungs-Badges) */}
          <div id="section1-scroll-box" className="space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300 overflow-y-auto max-h-[620px] pr-2 scrollbar-thin">
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
                    className={`mt-2.5 mb-0.5 first:mt-0 ${
                      anchorId ? 'scroll-mt-6 rounded-lg' : ''
                    }`}
                  >
                    <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-lg border-l-4 border-slate-700 dark:border-slate-300 mb-1 shadow-2xs">
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-[13px] tracking-tight leading-snug">
                        {p.heading}
                      </h4>
                    </div>
                    {p.text && (
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line px-1 mb-1 text-xs">
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
                  className={`${anchorId ? 'scroll-mt-6 p-1 rounded-lg' : ''}`}
                >
                  {p.heading && (() => {
                    const headingColor = getBenchmarkHeadingColor(p.heading);
                    return (
                      <h4 className="font-normal text-slate-800 dark:text-slate-200 text-xs mb-0.5 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: headingColor }}
                        />
                        <span
                          className="font-normal font-mono text-xs tracking-tight"
                          style={{ color: headingColor }}
                        >
                          {p.heading}
                        </span>
                      </h4>
                    );
                  })()}
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {renderTextWithLinks(p.text)}
                  </p>
                  {p.link && (
                    <a
                      href={p.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-black dark:text-white hover:text-slate-700 dark:hover:text-slate-200 underline decoration-slate-400 dark:decoration-slate-500 hover:decoration-black dark:hover:decoration-white underline-offset-2 mt-0.5 font-semibold"
                    >
                      <span>{p.link.label}</span>
                      <ExternalLink className="w-2 h-2 opacity-80" />
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
          <div className="flex items-center gap-2 pb-1.5 mb-1.5">
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {title2}
            </h3>
          </div>

          {/* Inhalt Bereich 2 (1:1 Text aus CSV Tabelle) */}
          <div className="space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300 overflow-y-auto max-h-[620px] pr-2 scrollbar-thin">
            {paragraphs2.map((p, idx) => (
              <div key={idx}>
                {p.heading && (
                  <h4 className="font-normal text-slate-800 dark:text-slate-200 text-xs mb-0.5 flex items-center gap-1.5">
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
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-black dark:text-white hover:text-slate-700 dark:hover:text-slate-200 underline decoration-slate-400 dark:decoration-slate-500 hover:decoration-black dark:hover:decoration-white underline-offset-2 mt-0.5 font-semibold"
                  >
                    <span>{p.link.label}</span>
                    <ExternalLink className="w-2 h-2 opacity-80" />
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
