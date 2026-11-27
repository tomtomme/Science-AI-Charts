import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { getCompanyMeta, getFaviconUrl, normalizeCompanyLookupKey } from '../data/companies';
import { AuthorHeadlineSegment, AuthorSocialLink, BenchmarkWeights, ComponentBreakdown, ModelRecord, RawBenchmarkScores, ScoreMode, CsvNotesMetadata, Row33Metadata, SheetAuthorMeta, SheetColumnLayout } from '../types';
import { computeWeightedBreakdown, isCustomWeighted } from './weighting';

/**
 * Robust RFC-4180 CSV line parser handling quotes, embedded commas, and escaped quotes.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Extracts sheet date (e.g. "2026-10-11") from a 2D row matrix.
 */
export function extractSheetDateFromRows(rows: string[][]): string | null {
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    for (const cell of rows[r] || []) {
      const match = String(cell || '').match(/(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
  }
  return null;
}

/**
 * Extracts sheet date (e.g. "2026-10-11") from the first lines of the CSV.
 */
export function extractSheetDate(csvText: string): string | null {
  return extractSheetDateFromRows(parseCsvRows(csvText.slice(0, 1500)));
}

export interface CsvHeaderMetadata {
  cellA1: string;
  cellC1: string;
  cellO1?: string;
  authorMeta?: SheetAuthorMeta;
  combinedTitle: string;
  subtitle: string;
  titleDe?: string;
  subtitleDe?: string;
  categoryNames?: string[];
  categoryNamesDe?: string[];
  compositeScoreNames?: string[];
  compositeScoreNamesDe?: string[];
  retiredCategoryNames?: string[];
  retiredCategoryNamesDe?: string[];
  translatedAt?: string;
  translationSource?: 'gemini_weekly' | 'local_fallback';
  row33?: Row33Metadata;
}

const KNOWN_AUTHOR_SOCIAL_URLS: Record<string, string> = {
  youtube: 'https://www.youtube.com/@StatisticsSupreme',
  github: 'https://github.com/tomtomme',
  orcid: 'https://orcid.org/0000-0001-5867-4997',
  zotero: 'https://www.zotero.org/thomas_langkamp',
  'google scholar': 'https://scholar.google.com/citations?user=aedKy9AAAAAJ&hl=de',
  scholar: 'https://scholar.google.com/citations?user=aedKy9AAAAAJ&hl=de',
  researchgate: 'https://www.researchgate.net/profile/Thomas-Langkamp',
};

const KNOWN_HEADLINE_URLS: Record<string, string> = {
  app: 'https://tomtomme.github.io/Science-AI-Charts/',
  table: 'https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/edit?gid=170267419#gid=170267419',
  tabelle: 'https://docs.google.com/spreadsheets/d/1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI/edit?gid=170267419#gid=170267419',
};

function normalizeSocialKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function linkifyHeadlineText(
  text: string,
  headlineLinksMap: Map<string, AuthorSocialLink>
): AuthorHeadlineSegment[] {
  if (!text) return [];
  if (headlineLinksMap.size === 0) return [{ text }];

  const escapedTerms = Array.from(headlineLinksMap.values())
    .map((item) => item.label.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (escapedTerms.length === 0) return [{ text }];

  const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');
  const segments: AuthorHeadlineSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      segments.push({ text: text.slice(lastIndex, idx) });
    }
    const matchedText = match[0];
    const matchedLink = headlineLinksMap.get(normalizeSocialKey(matchedText));
    segments.push({
      text: matchedText,
      url: matchedLink?.url,
    });
    lastIndex = idx + matchedText.length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text }];
}

export function parseCellO1(
  rawCellO1: string,
  extractedLinks?: AuthorSocialLink[]
): SheetAuthorMeta | undefined {
  const trimmed = (rawCellO1 || '').replace(/\s+/g, ' ').trim();
  const hasExtracted = Array.isArray(extractedLinks) && extractedLinks.length > 0;
  if (!trimmed && !hasExtracted) return undefined;

  const colonIdx = trimmed.indexOf(':');
  const headline = (colonIdx !== -1 ? trimmed.slice(0, colonIdx) : trimmed).trim();
  const linksRaw = colonIdx !== -1 ? trimmed.slice(colonIdx + 1).trim() : '';

  const extractedByKey = new Map<string, AuthorSocialLink>();
  if (hasExtracted) {
    for (const item of extractedLinks!) {
      if (item.label && item.url) {
        extractedByKey.set(normalizeSocialKey(item.label), item);
      }
    }
  }

  const linkTokens = linksRaw
    ? linksRaw
        .split(/\s*[,;|·]\s*/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const linkTokenKeys = new Set(linkTokens.map((t) => normalizeSocialKey(t)));

  // Separate extracted links into inline headline links (e.g. App, Table) vs. social icon links
  const headlineLinksMap = new Map<string, AuthorSocialLink>();
  const headlineKeySet = new Set<string>();

  if (hasExtracted) {
    for (const item of extractedLinks!) {
      const key = normalizeSocialKey(item.label);
      if (!key) continue;
      const appearsInHeadline =
        headline &&
        new RegExp(`\\b${item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(headline);
      const isExplicitHeadlineWord = key === 'app' || key === 'table' || key === 'tabelle';
      if ((appearsInHeadline && !linkTokenKeys.has(key)) || isExplicitHeadlineWord) {
        headlineLinksMap.set(key, item);
        headlineKeySet.add(key);
      }
    }
  }

  if (!headlineLinksMap.has('app') && /\bapp\b/i.test(headline)) {
    headlineLinksMap.set('app', { label: 'App', url: KNOWN_HEADLINE_URLS.app });
    headlineKeySet.add('app');
  }
  if (!headlineLinksMap.has('table') && !headlineLinksMap.has('tabelle') && /\b(table|tabelle)\b/i.test(headline)) {
    headlineLinksMap.set('table', { label: 'Table', url: KNOWN_HEADLINE_URLS.table });
    headlineKeySet.add('table');
  }

  let prefixEn = '';
  let prefixDe = '';
  let authorName = headline;
  let headlineSegmentsEn: AuthorHeadlineSegment[] | undefined;
  let headlineSegmentsDe: AuthorHeadlineSegment[] | undefined;

  const appTableMatch = headline.match(
    /^(App)\s*(&|and|und)\s*(Table|Tabelle)\s+(by|from|von)\s+(.+)$/i
  );

  if (appTableMatch) {
    const appTerm = appTableMatch[1];
    const tableTerm = appTableMatch[3];
    authorName = appTableMatch[5].trim();
    const appUrl =
      headlineLinksMap.get('app')?.url ||
      extractedByKey.get('app')?.url ||
      KNOWN_HEADLINE_URLS.app;
    const tableUrl =
      headlineLinksMap.get('table')?.url ||
      headlineLinksMap.get('tabelle')?.url ||
      extractedByKey.get('table')?.url ||
      extractedByKey.get('tabelle')?.url ||
      KNOWN_HEADLINE_URLS.table;

    prefixEn = `${appTerm} & ${tableTerm === 'Tabelle' ? 'Table' : tableTerm} by`;
    prefixDe = `${appTerm} & Tabelle von`;
    headlineSegmentsEn = [
      { text: appTerm, url: appUrl },
      { text: ' & ' },
      { text: tableTerm === 'Tabelle' ? 'Table' : tableTerm, url: tableUrl },
      { text: ' by' },
    ];
    headlineSegmentsDe = [
      { text: appTerm, url: appUrl },
      { text: ' & ' },
      { text: 'Tabelle', url: tableUrl },
      { text: ' von' },
    ];
  } else {
    const prefixMatch = headline.match(
      /^(A table from|Table by|Created by|By|Eine Tabelle von|Tabelle von|Erstellt von|Von)\s+(.+)$/i
    );
    if (prefixMatch) {
      const rawPrefix = prefixMatch[1].trim();
      authorName = prefixMatch[2].trim();
      const low = rawPrefix.toLowerCase();
      if (low === 'a table from' || low === 'eine tabelle von') {
        prefixEn = 'A table from';
        prefixDe = 'Eine Tabelle von';
      } else if (low === 'table by' || low === 'tabelle von') {
        prefixEn = 'Table by';
        prefixDe = 'Tabelle von';
      } else if (low === 'created by' || low === 'erstellt von') {
        prefixEn = 'Created by';
        prefixDe = 'Erstellt von';
      } else {
        prefixEn = 'By';
        prefixDe = 'Von';
      }
      const deMap = new Map(headlineLinksMap);
      const tblLink = deMap.get('table');
      if (tblLink) {
        deMap.set('tabelle', { label: 'Tabelle', url: tblLink.url });
      }
      headlineSegmentsEn = linkifyHeadlineText(prefixEn, headlineLinksMap);
      headlineSegmentsDe = linkifyHeadlineText(prefixDe, deMap);
    } else if (headline) {
      authorName = '';
      headlineSegmentsEn = linkifyHeadlineText(headline, headlineLinksMap);
      headlineSegmentsDe = headlineSegmentsEn;
    }
  }

  const links: AuthorSocialLink[] = [];
  const seenKeys = new Set<string>();

  for (const token of linkTokens) {
    const key = normalizeSocialKey(token);
    if (!key || seenKeys.has(key) || headlineKeySet.has(key)) continue;
    const matched = extractedByKey.get(key);
    const url = matched?.url || KNOWN_AUTHOR_SOCIAL_URLS[key];
    if (url) {
      links.push({ label: matched?.label || token, url });
      seenKeys.add(key);
    }
  }

  if (hasExtracted) {
    for (const item of extractedLinks!) {
      const key = normalizeSocialKey(item.label);
      if (key && !seenKeys.has(key) && !headlineKeySet.has(key) && item.url) {
        links.push(item);
        seenKeys.add(key);
      }
    }
  }

  if (!authorName && !headline && links.length === 0) return undefined;

  return {
    rawText: trimmed,
    prefixEn,
    prefixDe,
    authorName,
    headlineSegmentsEn,
    headlineSegmentsDe,
    links,
  };
}

/**
 * Translates header title and subtitle dynamically from English to German
 */
export function translateHeaderToDe(titleEn: string, subtitleEn: string): { titleDe: string; subtitleDe: string } {
  let titleDe = titleEn;
  titleDe = titleDe.replace(/Science[\s-]+IQ\s+of\s+Chat[bB]ots/gi, 'Wissenschafts-IQ von Chatbots');
  titleDe = titleDe.replace(/Science[\s-]+IQ\s+von\s+Chat[bB]ots/gi, 'Wissenschafts-IQ von Chatbots');
  titleDe = titleDe.replace(/Science[\s-]+IQ/gi, 'Wissenschafts-IQ');
  titleDe = titleDe.replace(/Ranking\s+of\s+chatbots(?:'|\s+)?\s*science\s+capabilities/gi, 'Ranking der wissenschaftlichen Fähigkeiten von Chatbots');
  titleDe = titleDe.replace(/with\s+scores\s+from\s+three\s+different\s+sources\s+for\s+robustness/gi, 'mit Scores aus drei verschiedenen Quellen für höhere Robustheit');
  titleDe = titleDe.replace(/An\s+Interactive\s+Info[\s-]*Graph/gi, 'Eine interaktive Infografik');
  titleDe = titleDe.replace(/Interactive\s+Info[\s-]*Graph/gi, 'Interaktive Infografik');
  titleDe = titleDe.replace(/An\s+Interactive\s+Dashboard/gi, 'Ein interaktives Dashboard');
  titleDe = titleDe.replace(/Interactive\s+Dashboard/gi, 'Interaktives Dashboard');
  titleDe = titleDe.replace(/An\s+Interactive\s+Chart/gi, 'Ein interaktives Diagramm');
  titleDe = titleDe.replace(/Interactive\s+Chart/gi, 'Interaktives Diagramm');
  titleDe = titleDe.replace(/An\s+Interactive\s+Graph/gi, 'Ein interaktiver Graph');
  titleDe = titleDe.replace(/Interactive\s+Graph/gi, 'Interaktiver Graph');
  titleDe = titleDe.replace(/An\s+Interactive\s+Comparison/gi, 'Ein interaktiver Vergleich');
  titleDe = titleDe.replace(/Interactive\s+Comparison/gi, 'Interaktiver Vergleich');
  titleDe = titleDe.replace(/An\s+Interactive\s+Ranking/gi, 'Ein interaktives Ranking');
  titleDe = titleDe.replace(/Interactive\s+Ranking/gi, 'Interaktives Ranking');
  titleDe = titleDe.replace(/An\s+Interactive\s+Overview/gi, 'Eine interaktive Übersicht');
  titleDe = titleDe.replace(/Interactive\s+Overview/gi, 'Interaktive Übersicht');
  titleDe = titleDe.replace(/update to AA-Index version 5 in progress/gi, 'Umstellung auf AA-Index Version 5 in Arbeit');
  titleDe = titleDe.replace(/update to AA-Index v5 in progress/gi, 'Umstellung auf AA-Index v5 in Arbeit');
  titleDe = titleDe.replace(/\bupdate to\b/gi, 'Umstellung auf');
  titleDe = titleDe.replace(/\bin progress\b/gi, 'in Arbeit');
  titleDe = titleDe.replace(/\bScience\s+Capabilities\b/gi, 'Wissenschaftliche Fähigkeiten');
  titleDe = titleDe.replace(/\bfor\s+Science\b/gi, 'für die Wissenschaft');
  titleDe = titleDe.replace(/\band\s+Research\b/gi, 'und Forschung');
  titleDe = titleDe.replace(/\band\s+Analytics\b/gi, 'und Datenanalyse');
  titleDe = titleDe.replace(/\bUpdated\s+Weekly\b/gi, 'Wöchentlich aktualisiert');
  titleDe = titleDe.replace(/\bUpdated\s+Hourly\b/gi, 'Stündlich aktualisiert');

  let subtitleDe = subtitleEn;
  if (subtitleEn) {
    let s = subtitleEn;
    // Full replacement for the current live Sheet C1 subtitle
    s = s.replace(
      /Unlike many tests that measure coding skills and pure language the composite scores here focus on capabilities important for science like factual accuracy \(non-hallucination\), data analysis, plot-reading, and automated multi-step workflows like diagnostics?\.\s*To counter potential dependencies of test-suite developers on AI companies,\s*benchmarks from different providers are included\.\s*The final composite scores \(old, new, worst case\) are averages,\s*with some sub-scores adjusted for guessing probability\.\s*More details below\./i,
      'Im Gegensatz zu vielen Tests, die Programmierfähigkeiten und reine Sprachleistung messen, konzentrieren sich die Gesamt-Scores hier auf wissenschaftlich relevante Fähigkeiten wie faktische Genauigkeit (Non-Hallucination), Datenanalyse, Diagrammverständnis und automatisierte mehrstufige Workflows wie Diagnostik. Um möglichen Abhängigkeiten von Testsuite-Entwicklern zu KI-Unternehmen entgegenzuwirken, werden Benchmarks verschiedener Anbieter einbezogen. Die finalen Gesamt-Scores (Alt, Neu, Worst Case) sind Durchschnitte, wobei einige Teilwerte an die Ratewahrscheinlichkeit angepasst wurden. Weitere Details unten.'
    );
    // Full replacement for the earlier long subtitle
    s = s.replace(
      /Unlike conventional tests that primarily measure text-based coding tasks or pure language skills,\s*this composite scoring focusses on capabilities important for science like factual accuracy \(non-hallucination\),\s*data analysis,\s*plot-reading,\s*and automated multi-step workflows like diagnostic\.\s*To counter potential dependencies of test-suite developers on major AI companies,\s*benchmarks from at least 3 different providers are included\.\s*The 3 final composite scores \(old, new, worst case\) are simple averages,\s*with some sub-scores adjusted for guessing probability\.\s*More details below\./i,
      'Im Gegensatz zu herkömmlichen Tests, die primär textbasierte Programmieraufgaben oder reine Sprachfähigkeiten messen, konzentriert sich dieser Gesamt-Score auf wissenschaftlich relevante Fähigkeiten wie faktische Genauigkeit (Non-Hallucination), Datenanalyse, Diagrammverständnis und automatisierte mehrstufige Workflows wie Diagnostik. Um möglichen Abhängigkeiten von Testsuite-Entwicklern zu großen KI-Unternehmen entgegenzuwirken, werden Benchmarks von mindestens 3 verschiedenen Anbietern einbezogen. Die 3 finalen Gesamt-Scores (Alt, Neu, Worst-Case) sind einfache Durchschnitte, wobei einige Teilwerte an die Ratewahrscheinlichkeit angepasst wurden. Weitere Details unten.'
    );
    // Legacy subtitle replacement
    s = s.replace(/The scoring focusses on factual accuracy \(non-hallucination\), scientific expertise, and data analysis skills instead of coding\./i, 'Die Bewertung konzentriert sich auf faktische Genauigkeit (Non-Hallucination), wissenschaftliche Expertise und Datenanalysefähigkeiten statt Coding.');
    s = s.replace(/The bots completed tests from ArtificialAnalysis\.ai, Simple-Bench\.com, and Vals\.ai\./i, 'Die Bots absolvierten Tests von ArtificialAnalysis.ai, Simple-Bench.com und Vals.ai.');
    // Component phrases for robustness
    s = s.replace(/Unlike many tests that measure coding skills and pure language the composite scores here focus on capabilities important for science/i, 'Im Gegensatz zu vielen Tests, die Programmierfähigkeiten und reine Sprachleistung messen, konzentrieren sich die Gesamt-Scores hier auf wissenschaftlich relevante Fähigkeiten');
    s = s.replace(/Unlike conventional tests that primarily measure text-based coding tasks or pure language skills/i, 'Im Gegensatz zu herkömmlichen Tests, die primär textbasierte Programmieraufgaben oder reine Sprachfähigkeiten messen');
    s = s.replace(/this composite scoring focusses on capabilities important for science/i, 'konzentriert sich dieser Gesamt-Score auf wissenschaftlich relevante Fähigkeiten');
    s = s.replace(/like factual accuracy \(non-hallucination\), data analysis, plot-reading, and automated multi-step workflows like diagnostics?/i, 'wie faktische Genauigkeit (Non-Hallucination), Datenanalyse, Diagrammverständnis und automatisierte mehrstufige Workflows wie Diagnostik');
    s = s.replace(/To counter potential dependencies of test-suite developers on major AI companies/i, 'Um möglichen Abhängigkeiten von Testsuite-Entwicklern zu großen KI-Unternehmen entgegenzuwirken');
    s = s.replace(/To counter potential dependencies of test-suite developers on AI companies/i, 'Um möglichen Abhängigkeiten von Testsuite-Entwicklern zu KI-Unternehmen entgegenzuwirken');
    s = s.replace(/benchmarks from at least 3 different providers are included/i, 'werden Benchmarks von mindestens 3 verschiedenen Anbietern einbezogen');
    s = s.replace(/benchmarks from different providers are included/i, 'werden Benchmarks verschiedener Anbieter einbezogen');
    s = s.replace(/The 3 final composite scores \(old, new, worst case\) are simple averages/i, 'Die 3 finalen Gesamt-Scores (Alt, Neu, Worst-Case) sind einfache Durchschnitte');
    s = s.replace(/The final composite scores \(old, new, worst case\) are averages/i, 'Die finalen Gesamt-Scores (Alt, Neu, Worst Case) sind Durchschnitte');
    s = s.replace(/3 different benchmark providers/i, '3 verschiedenen Benchmark-Anbietern');
    s = s.replace(/from 3 different benchmark providers/i, 'von 3 verschiedenen Benchmark-Anbietern');
    s = s.replace(/Final scores are averages, with some sub-scores adjusted for guessing probability/i, 'Final Scores sind Durchschnitte, wobei einige Teilwerte an die Ratewahrscheinlichkeit angepasst wurden');
    s = s.replace(/The scoring focusses on/i, 'Die Bewertung konzentriert sich auf');
    s = s.replace(/factual accuracy/i, 'faktische Genauigkeit');
    s = s.replace(/scientific expertise/i, 'wissenschaftliche Expertise');
    s = s.replace(/and data analysis skills instead of coding/i, 'und Datenanalysefähigkeiten statt Coding');
    s = s.replace(/The bots completed tests from/i, 'Die Bots absolvierten Tests von');
    s = s.replace(/Final scores are averages/i, 'Final Scores sind Durchschnitte');
    s = s.replace(/with some sub-scores adjusted for guessing probability/i, 'wobei einige Teilwerte an die Ratewahrscheinlichkeit angepasst wurden');
    s = s.replace(/More details below\./i, 'Weitere Details unten.');
    subtitleDe = s;
  }

  return { titleDe, subtitleDe };
}

function findSourcesHeaderRowIndex(rows: string[][]): number {
  for (let r = 0; r < Math.min(120, rows.length); r++) {
    const row = rows[r];
    if (!row) continue;
    let rowText = '';
    for (let c = 0; c < Math.min(6, row.length); c++) {
      rowText += ` ${row[c] || ''}`;
    }
    const low = rowText.toLowerCase();
    if (
      low.includes('sources & notes') ||
      (low.includes('current') && low.includes('history'))
    ) {
      return r;
    }
  }
  return rows.length > 32 ? 32 : -1;
}

/**
 * Dynamically detects all column indices and structural rows across arbitrary
 * column insertions, deletions, and moves in the Google Sheet.
 */
export function detectSheetColumns(rows: string[][]): SheetColumnLayout {
  const structure = findSheetStructuralRows(rows);
  const sourcesIdx = findSourcesHeaderRowIndex(rows);
  const row0 = rows[0] || [];
  const row1 = rows[1] || [];
  const row2 = rows[2] || [];
  const sourcesRow = (sourcesIdx >= 0 ? rows[sourcesIdx] : rows[32]) || [];
  const maxCols = Math.max(row0.length, row1.length, row2.length, sourcesRow.length, 42);

  const norm = (s: string | undefined) => (s || '').replace(/\s+/g, ' ').trim();
  const getCombined = (c: number) =>
    `${norm(row0[c])} ${norm(row1[c])} ${norm(sourcesRow[c])}`.trim().toLowerCase();

  // 1. Detect core structural anchor columns across the entire header row
  let colNameLabel: number | null = null;
  let colCreatorYear: number | null = null;
  let colOldScore: number | null = null;
  let colNewScore: number | null = null;
  let colWorstCaseScore: number | null = null;
  let colStoryline: number | null = null;
  let colChatLink: number | null = null;
  let colApiLink: number | null = null;
  let colModelName: number | null = null;
  let colAuthorMeta: number | null = null;

  for (let c = 0; c < maxCols; c++) {
    const h0 = norm(row0[c]).toLowerCase();
    const h1 = norm(row1[c]).toLowerCase();

    if (
      colAuthorMeta === null &&
      h0 &&
      (h0.includes('app &') ||
        h0.includes('table by') ||
        h0.includes('table from') ||
        h0.includes('tabelle von') ||
        (h0.includes('thomas') && (h0.includes('youtube') || h0.includes('github') || h0.includes('orcid'))))
    ) {
      colAuthorMeta = c;
    }

    if (
      colNameLabel === null &&
      h1.includes('free') &&
      (h1.includes('paid') || h1.includes('api') || h1.includes('chat'))
    ) {
      colNameLabel = c;
    } else if (
      colCreatorYear === null &&
      ((h1.includes('creator') && h1.includes('release')) || h1.includes('creator |'))
    ) {
      colCreatorYear = c;
    } else if (colOldScore === null && h1 === 'old') {
      colOldScore = c;
    } else if (colNewScore === null && h1 === 'new') {
      colNewScore = c;
    } else if (colWorstCaseScore === null && /^worst\s*case$/.test(h1)) {
      colWorstCaseScore = c;
    } else if (colStoryline === null && h1 === 'storyline') {
      colStoryline = c;
    } else if (colChatLink === null && h1.includes('link to chat')) {
      colChatLink = c;
    } else if (colApiLink === null && h1.includes('link to api')) {
      colApiLink = c;
    } else if (colModelName === null && h1.includes('model name')) {
      colModelName = c;
    }
  }

  const resolvedNameLabel = colNameLabel ?? 1;
  const resolvedCreatorYear = colCreatorYear ?? 2;
  const resolvedOldScore = colOldScore ?? 11;
  const resolvedNewScore = colNewScore ?? 12;
  const resolvedWorstCaseScore = colWorstCaseScore ?? 13;
  const resolvedStoryline = colStoryline ?? 14;
  const resolvedChatLink = colChatLink ?? 15;
  const resolvedApiLink = colApiLink ?? 16;
  const resolvedModelName = colModelName ?? 18;
  const resolvedAuthorMeta = colAuthorMeta ?? resolvedStoryline;

  const reservedAnchorCols = new Set<number>([
    resolvedNameLabel,
    resolvedCreatorYear,
    resolvedOldScore,
    resolvedNewScore,
    resolvedWorstCaseScore,
    resolvedStoryline,
    resolvedChatLink,
    resolvedApiLink,
    resolvedModelName,
  ]);

  // 2. Detect the 8 active benchmark columns in the left-side section (before Model Name & Version)
  let colActCodeReason: number | null = null;
  let colNonHallucination: number | null = null;
  let colScienceKnowledge: number | null = null;
  let colVisionPlot: number | null = null;
  let colMedReasoning: number | null = null;
  let colExcelAgent: number | null = null;
  let colTrickQuestions: number | null = null;
  let colEconLegal: number | null = null;

  const activeScanLimit = Math.max(resolvedModelName, resolvedWorstCaseScore + 1);
  for (let c = 0; c < activeScanLimit; c++) {
    if (reservedAnchorCols.has(c)) continue;
    const h0 = norm(row0[c]).toLowerCase();
    if (h0.includes('used for old score')) continue;
    const h1 = norm(row1[c]).toLowerCase();
    const hAll = getCombined(c);
    if (!h1 && !hAll) continue;

    if (
      colActCodeReason === null &&
      (h1 === 'iq' || hAll.includes('aa-intel') || hAll.includes('aa-int-index'))
    ) {
      colActCodeReason = c;
    } else if (
      colNonHallucination === null &&
      (h1.includes('non-hallu') || hAll.includes('non-hallu'))
    ) {
      colNonHallucination = c;
    } else if (
      colScienceKnowledge === null &&
      (h1.includes('scientific knowledge') ||
        hAll.includes('accuracy v1') ||
        (hAll.includes('omniscience') && !hAll.includes('hallu')))
    ) {
      colScienceKnowledge = c;
    } else if (colVisionPlot === null && (h1.includes('plot') || hAll.includes('mmmu'))) {
      colVisionPlot = c;
    } else if (colMedReasoning === null && (h1.includes('diagnostics') || hAll.includes('mlcr'))) {
      colMedReasoning = c;
    } else if (colExcelAgent === null && (h1.includes('excel') || hAll.includes('analyst'))) {
      colExcelAgent = c;
    } else if (
      colTrickQuestions === null &&
      (h1.includes('experiment') || h1.includes('gdpx') || hAll.includes('gdpx'))
    ) {
      colTrickQuestions = c;
    } else if (
      colEconLegal === null &&
      (h1.includes('econ') || h1.includes('legal') || hAll.includes('vals'))
    ) {
      colEconLegal = c;
    }
  }

  const benchBase = resolvedCreatorYear;
  const resolvedActCodeReason = colActCodeReason ?? benchBase + 1;
  const resolvedNonHallucination = colNonHallucination ?? benchBase + 2;
  const resolvedScienceKnowledge = colScienceKnowledge ?? benchBase + 3;
  const resolvedVisionPlot = colVisionPlot ?? benchBase + 4;
  const resolvedMedReasoning = colMedReasoning ?? benchBase + 5;
  const resolvedExcelAgent = colExcelAgent ?? benchBase + 6;
  const resolvedTrickQuestions = colTrickQuestions ?? benchBase + 7;
  const resolvedEconLegal = colEconLegal ?? benchBase + 8;

  // 3. Detect post-Model-Name columns (pricing, retired benchmarks, release date, creator)
  let colDePrice: number | null = null;
  let colUsPrice: number | null = null;
  let colIqOld: number | null = null;
  let colNonHalluOld: number | null = null;
  let colScienceOld: number | null = null;
  let colTrickOld: number | null = null;
  let colReleaseDate: number | null = null;
  let colModelCreator: number | null = null;

  let carriedRow0 = '';
  let carriedRow0Age = 0;

  const postScanStart = Math.max(resolvedModelName + 1, resolvedApiLink + 1, 17);
  for (let c = postScanStart; c < maxCols; c++) {
    const rawRow0 = norm(row0[c]);
    if (rawRow0) {
      carriedRow0 = rawRow0;
      carriedRow0Age = 0;
    } else if (carriedRow0 && carriedRow0Age < 3) {
      carriedRow0Age += 1;
    } else {
      carriedRow0 = '';
    }

    const effectiveRow0 = rawRow0 || carriedRow0;
    const h01 = `${effectiveRow0} ${norm(row1[c])}`.trim().toLowerCase();
    const hAll = getCombined(c);
    const h1 = norm(row1[c]).toLowerCase();
    const hasPricingContext =
      h01.includes('cost') ||
      h01.includes('abokosten') ||
      h01.includes('paid') ||
      h01.includes('chat') ||
      h01.includes('monthly');

    if (
      hasPricingContext &&
      (h1 === 'us' || h1 === 'usa' || /\b(us|usa|united states)\b/i.test(h01))
    ) {
      if (colUsPrice === null) colUsPrice = c;
      continue;
    }

    if (
      hasPricingContext &&
      (h1 === 'de' ||
        h01.includes('germany') ||
        h01.includes('deutschland') ||
        /\b(in de|de)\b/.test(h1) ||
        /\bin de\b/.test(h01) ||
        h01.includes('abokosten'))
    ) {
      if (colDePrice === null) colDePrice = c;
      continue;
    }

    if (
      colIqOld === null &&
      (h1 === 'iq' || (h01.includes('old score') && h01.includes('iq')) || hAll.includes('aa-int-index in % v4'))
    ) {
      colIqOld = c;
      continue;
    }
    if (colNonHalluOld === null && (h01.includes('non-hallu') || hAll.includes('non-hallu-rate v1 in %'))) {
      colNonHalluOld = c;
      continue;
    }
    if (colScienceOld === null && (h01.includes('science knowledge') || hAll.includes('omniscience v1 in pts'))) {
      colScienceOld = c;
      continue;
    }
    if (colTrickOld === null && (h01.includes('trick questions') || hAll.includes('simple-bench in %') || hAll.includes('simplebench'))) {
      colTrickOld = c;
      continue;
    }
    if (
      colReleaseDate === null &&
      (h1 === 'release' ||
        h1 === 'release date' ||
        h1 === 'veröffentlichung' ||
        (!h1.includes('creator') && /\brelease\b/i.test(h1)))
    ) {
      colReleaseDate = c;
      continue;
    }
    if (colModelCreator === null && (h1 === 'model creator' || h01.includes('model creator'))) {
      colModelCreator = c;
      continue;
    }
  }

  const hasUsPriceCol = colUsPrice !== null;
  const priceShift = hasUsPriceCol ? 1 : 0;
  const modelColShift = resolvedModelName - 18;
  const resolvedDePrice = colDePrice ?? resolvedModelName + 1;

  // 4. Detect Lookup Table (Company, Domain, Flag) & Integrity-Bench column across ALL columns
  let colCompany = 34 + priceShift + modelColShift;
  let colDomain = 35 + priceShift + modelColShift;
  let colFlag = 36 + priceShift + modelColShift;
  let colIntegrity: number | null = null;
  let colAaModelName: number | null = null;

  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const headerRow = rows[r];
    if (!headerRow) continue;
    for (let c = 0; c < headerRow.length; c++) {
      const cell = norm(headerRow[c]).toLowerCase();
      if (cell === 'company') colCompany = c;
      else if (cell === 'domain') colDomain = c;
      else if (cell === 'flag') colFlag = c;
    }
  }

  // Detect Column AH (exact AA.ai model name, header "name" right after "economics" in History header row)
  const candidateHeaderRows: string[][] = [row0, row1, row2];
  const histHeaderIdx = Math.max(0, structure.historyStartRow - 2);
  for (let r = Math.max(0, histHeaderIdx - 2); r <= Math.min(rows.length - 1, histHeaderIdx + 1); r++) {
    if (rows[r]) candidateHeaderRows.push(rows[r]);
  }
  for (const hRow of candidateHeaderRows) {
    for (let c = Math.max(20, (colModelCreator ?? 26) + 1); c < hRow.length; c++) {
      const cell = norm(hRow[c]).toLowerCase();
      const prevCell = c > 0 ? norm(hRow[c - 1]).toLowerCase() : '';
      if (
        cell === 'aa name' ||
        cell === 'aa_name' ||
        cell === 'artificial analysis name' ||
        (cell === 'name' && (prevCell === 'economics' || c === 33 + modelColShift))
      ) {
        colAaModelName = c;
        break;
      }
    }
    if (colAaModelName !== null) break;
  }

  for (let c = 0; c < maxCols; c++) {
    const headerText = `${norm(row0[c])} ${norm(row1[c])} ${norm(row2[c])} ${norm(sourcesRow[c])}`.toLowerCase();
    if (
      headerText.includes('integrity-bench') ||
      headerText.includes('integrity_bench') ||
      /\bintegrity\b/.test(headerText)
    ) {
      colIntegrity = c;
      break;
    }
  }

  return {
    historyStartRow: structure.historyStartRow,
    colNameLabel: resolvedNameLabel,
    colCreatorYear: resolvedCreatorYear,
    colActCodeReason: resolvedActCodeReason,
    colNonHallucination: resolvedNonHallucination,
    colScienceKnowledge: resolvedScienceKnowledge,
    colVisionPlot: resolvedVisionPlot,
    colMedReasoning: resolvedMedReasoning,
    colExcelAgent: resolvedExcelAgent,
    colTrickQuestions: resolvedTrickQuestions,
    colEconLegal: resolvedEconLegal,
    colOldScore: resolvedOldScore,
    colNewScore: resolvedNewScore,
    colWorstCaseScore: resolvedWorstCaseScore,
    colStoryline: resolvedStoryline,
    colChatLink: resolvedChatLink,
    colApiLink: resolvedApiLink,
    colModelName: resolvedModelName,
    colAuthorMeta: resolvedAuthorMeta,
    hasUsPriceCol,
    colDePrice: resolvedDePrice,
    colUsPrice,
    colIqOld: colIqOld ?? (resolvedDePrice + 1 + priceShift),
    colNonHalluOld: colNonHalluOld ?? (resolvedDePrice + 2 + priceShift),
    colScienceOld: colScienceOld ?? (resolvedDePrice + 3 + priceShift),
    colTrickOld: colTrickOld ?? (resolvedDePrice + 4 + priceShift),
    colReleaseDate: colReleaseDate ?? (resolvedDePrice + 5 + priceShift),
    colModelCreator: colModelCreator ?? (resolvedDePrice + 6 + priceShift),
    colCompany,
    colDomain,
    colFlag,
    colAaModelName: colAaModelName ?? (33 + modelColShift),
    colIntegrity: colIntegrity ?? Math.max(39 + modelColShift, colFlag + 2),
  };
}

/**
 * Extracts Row 33 (Sources & Notes) synced text and source URLs from the CSV dynamically.
 */
export function extractRow33Metadata(rows: string[][]): Row33Metadata {
  const layout = detectSheetColumns(rows);
  const sourcesIdx = findSourcesHeaderRowIndex(rows);
  const targetRow = sourcesIdx >= 0 ? rows[sourcesIdx] : null;

  const getCell = (colIdx: number, fallback: string) => {
    if (!targetRow || colIdx < 0 || !targetRow[colIdx]) return fallback;
    const text = targetRow[colIdx].trim();
    return text || fallback;
  };

  const resolveUrl = (text: string, defaultUrl: string) => {
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.includes('semianalysis.com') || trimmed.includes('gdpx')) return 'https://gdpx.semianalysis.com';
    if (trimmed.includes('simplebench.com') || trimmed.includes('simple-bench')) return 'https://epoch.ai/benchmarks/simplebench?view=graph&tab=leaderboard';
    if (trimmed.includes('vals.ai')) return 'https://www.vals.ai';
    if (trimmed.includes('artificialanalysis.ai')) return 'https://artificialanalysis.ai';
    if (trimmed.includes('mmmu')) return 'https://artificialanalysis.ai/evaluations/mmmu-pro';
    return defaultUrl;
  };

  const moreSourcesText = targetRow?.[layout.colStoryline]?.trim() || '';
  const urlMatches = moreSourcesText.match(/https?:\/\/[^\s]+/g) || [];

  const colD = getCell(layout.colActCodeReason, 'AA-Int-Index in % v5');
  const colE = getCell(layout.colNonHallucination, 'Non-Hallu-Rate v1.1 in %');
  const colF = getCell(layout.colScienceKnowledge, 'Accuracy v1.1 in %');
  const colG = getCell(layout.colVisionPlot, 'MMMU-Pro in %');
  const colH = getCell(layout.colMedReasoning, 'MLCR-AA in %');
  const colI = getCell(layout.colExcelAgent, 'ExcelAgent in %');
  const colJ = getCell(layout.colTrickQuestions, 'gdpx.semianalysis.com');
  const colK = getCell(layout.colEconLegal, 'Vals Econ Index 2.2 in %');

  const colL = getCell(layout.colOldScore, 'historic persp.');
  const colM = getCell(layout.colNewScore, 'if hallus are a small problem');
  const colN = getCell(layout.colWorstCaseScore, 'times non hallu-rate');

  const colU = getCell(layout.colIqOld, 'AA-Int-Index in % v4.3');
  const colV = getCell(layout.colNonHalluOld, 'Non-Hallu-Rate v1 in %');
  const colW = getCell(layout.colScienceOld, 'Omniscience v1 in PTS');
  const colX = getCell(layout.colTrickOld, 'simple-bench in %');

  return {
    scoreNewColM: {
      text: colM,
      sourceUrl: '#final-scores-section',
    },
    scoreOldColL: {
      text: colL,
      sourceUrl: '#final-scores-section',
    },
    scoreWorstCaseColN: {
      text: colN,
      sourceUrl: '#final-scores-section',
    },
    benchmarks: {
      actCodeReason: {
        text: colD,
        sourceUrl: resolveUrl(colD, 'https://artificialanalysis.ai/methodology/intelligence-benchmarking'),
      },
      nonHallucination: {
        text: colE,
        sourceUrl: resolveUrl(colE, 'https://artificialanalysis.ai/evaluations/omniscience#aa-omniscience-hallucination-rate'),
      },
      scienceKnowledge: {
        text: colF,
        sourceUrl: resolveUrl(colF, 'https://artificialanalysis.ai/evaluations/omniscience'),
      },
      visionPlot: {
        text: colG,
        sourceUrl: resolveUrl(colG, 'https://artificialanalysis.ai/evaluations/mmmu-pro'),
      },
      medReasoning: {
        text: colH,
        sourceUrl: resolveUrl(colH, 'https://artificialanalysis.ai/evaluations/mlcr-aa'),
      },
      excelAgent: {
        text: colI,
        sourceUrl: resolveUrl(colI, 'https://artificialanalysis.ai/evaluations/aa-analyst-agent'),
      },
      trickQuestions: {
        text: colJ,
        sourceUrl: resolveUrl(colJ, 'https://gdpx.semianalysis.com'),
      },
      econLegal: {
        text: colK,
        sourceUrl: resolveUrl(colK, 'https://www.vals.ai'),
      },
    },
    retiredBenchmarks: {
      iqOld: {
        text: colU,
        sourceUrl: resolveUrl(colU, 'https://artificialanalysis.ai/methodology/intelligence-benchmarking'),
      },
      nonHalluOld: {
        text: colV,
        sourceUrl: resolveUrl(colV, 'https://artificialanalysis.ai/evaluations/omniscience#aa-omniscience-hallucination-rate'),
      },
      scienceKnowledgeOld: {
        text: colW,
        sourceUrl: resolveUrl(colW, 'https://artificialanalysis.ai/evaluations/omniscience'),
      },
      trickQuestionsOld: {
        text: colX,
        sourceUrl: resolveUrl(colX, 'https://epoch.ai/benchmarks/simplebench?view=graph&tab=leaderboard'),
      },
    },
    moreSourcesText,
    moreSourcesUrls: urlMatches,
  };
}

/**
 * Extracts Title, Subtitle, Author & Social Links, Category Names,
 * and Sources & Notes synced benchmark metadata dynamically from a 2D row matrix.
 */
export function extractHeaderMetadataFromRows(
  rows: string[][],
  authorLinks?: AuthorSocialLink[]
): CsvHeaderMetadata {
  const layout = detectSheetColumns(rows);
  const cellA1 = (rows[0]?.[0] || 'Science-IQ of ChatBots').trim();
  const cellC1 = (rows[0]?.[layout.colCreatorYear] || rows[0]?.[2] || '').trim();
  const cellO1 = (rows[0]?.[layout.colAuthorMeta] || '').trim();
  const authorMeta = parseCellO1(cellO1, authorLinks);
  const combinedTitle = cellA1;

  const row1 = rows[1] || [];
  const cleanHeader = (colIdx: number, fallback: string) => {
    const val = (row1[colIdx] || '').replace(/\s+/g, ' ').trim();
    return val || fallback;
  };

  const activeCols = [
    layout.colActCodeReason,
    layout.colNonHallucination,
    layout.colScienceKnowledge,
    layout.colVisionPlot,
    layout.colMedReasoning,
    layout.colExcelAgent,
    layout.colTrickQuestions,
    layout.colEconLegal,
  ];
  const categoryNames = activeCols
    .map((colIdx) => (row1[colIdx] || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  // Slider indices 0, 1, 2 map to NEW, OLD, Worst Case
  const compositeScoreNames = [
    cleanHeader(layout.colNewScore, 'NEW'),
    cleanHeader(layout.colOldScore, 'OLD'),
    cleanHeader(layout.colWorstCaseScore, 'Worst Case'),
  ];

  // Retired historical benchmarks
  const retiredCategoryNames = [
    cleanHeader(layout.colIqOld, 'IQ old'),
    cleanHeader(layout.colNonHalluOld, 'Non-Hallu-Rate old'),
    cleanHeader(layout.colScienceOld, 'Science Knowledge old'),
    cleanHeader(layout.colTrickOld, 'Trick Questions old'),
  ];

  const { titleDe, subtitleDe } = translateHeaderToDe(combinedTitle, cellC1);
  const row33 = extractRow33Metadata(rows);

  return {
    cellA1,
    cellC1,
    cellO1: cellO1 || undefined,
    authorMeta,
    combinedTitle,
    subtitle: cellC1,
    titleDe,
    subtitleDe,
    categoryNames: categoryNames.length === 8 ? categoryNames : undefined,
    compositeScoreNames,
    retiredCategoryNames,
    translationSource: 'local_fallback',
    row33,
  };
}

/**
 * Extracts Title, Subtitle, Author, Category Names, and Sources metadata directly from CSV.
 */
export function extractHeaderMetadata(
  csvText: string,
  authorLinks?: AuthorSocialLink[]
): CsvHeaderMetadata {
  return extractHeaderMetadataFromRows(parseCsvRows(csvText), authorLinks);
}

/**
 * Extracts documentation notes sections ("How to read this" & "What Bots can & can't do")
 * dynamically even if rows or columns are shifted.
 */
export function extractCsvNotesMetadataFromRows(rows: string[][]): CsvNotesMetadata {
  const layout = detectSheetColumns(rows);
  let notesRow: string[] | null = null;

  // 1. Scan rows from index 10 onward (skipping top header rows) for documentation cues
  for (let i = 10; i < Math.min(140, rows.length); i++) {
    const r = rows[i] || [];
    let rowIntro = '';
    for (let c = 0; c < Math.min(6, r.length); c++) {
      rowIntro += ` ${r[c] || ''}`;
    }
    const low = rowIntro.toLowerCase();
    const longCellIdx = r.findIndex((cell, cIdx) => cIdx <= 6 && (cell || '').length > 400);
    if (
      low.includes('how to read') ||
      low.includes('what bot') ||
      longCellIdx !== -1
    ) {
      notesRow = r;
      break;
    }
  }

  // 2. Fallback scan between row 20 and 140 for any cell with long documentation text
  if (!notesRow) {
    for (let i = 20; i < Math.min(140, rows.length); i++) {
      const cand = rows[i] || [];
      if (cand.some((cell) => (cell || '').length > 300)) {
        notesRow = cand;
        break;
      }
    }
  }

  let section1Title = (
    notesRow?.[layout.colNameLabel] ||
    notesRow?.[layout.colNameLabel - 1] ||
    notesRow?.[1] ||
    notesRow?.[0] ||
    'How to read this'
  ).trim();
  let section1Content = (
    notesRow?.[layout.colCreatorYear] ||
    notesRow?.[2] ||
    ''
  ).trim();

  if (notesRow && section1Content.length < 150) {
    const longColIdx = notesRow.findIndex(
      (cell, idx) => idx < layout.colWorstCaseScore && (cell || '').length > 150
    );
    if (longColIdx !== -1) {
      section1Content = notesRow[longColIdx].trim();
      if (longColIdx > 0 && notesRow[longColIdx - 1] && notesRow[longColIdx - 1].length < 80) {
        section1Title = notesRow[longColIdx - 1].trim();
      }
    }
  }

  let section2Title = (
    notesRow?.[layout.colWorstCaseScore] ||
    notesRow?.[13] ||
    "What Bots can & can't do for you"
  ).trim();
  let section2Content = (notesRow?.[layout.colStoryline] || notesRow?.[14] || '').trim();

  // If section 2 content is empty at detected colStoryline, scan adjacent columns in notesRow
  if (notesRow && section2Content.length < 50) {
    const minSearch = Math.max(layout.colOldScore, 8);
    const maxSearch = Math.min(notesRow.length, Math.max(layout.colModelName + 2, 24));
    for (let c = minSearch; c < maxSearch; c++) {
      if (notesRow[c] && notesRow[c].length > 150) {
        section2Content = notesRow[c].trim();
        if (c > 0 && notesRow[c - 1] && notesRow[c - 1].length < 80) {
          section2Title = notesRow[c - 1].trim();
        }
        break;
      }
    }
  }

  return {
    section1Title: section1Title || 'How To Read',
    section1Content,
    section2Title: section2Title || "What Bots can & can't do for you",
    section2Content,
  };
}

export function extractCsvNotesMetadata(csvText: string): CsvNotesMetadata {
  return extractCsvNotesMetadataFromRows(parseCsvRows(csvText));
}

/**
 * Locates key 1-based structural row numbers in the main sheet dynamically.
 */
export function findSheetStructuralRows(rows: string[][]): {
  historyStartRow: number;
  sourcesNotesRow: number | null;
  notesRow: number;
} {
  let historyStartIndex = 35;
  let matchedHistoryLabel = false;
  for (let r = 0; r < Math.min(100, rows.length); r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < Math.min(5, row.length); c++) {
      const val = (row[c] || '').trim().toLowerCase();
      if (val === 'history') {
        historyStartIndex = r + 1;
        matchedHistoryLabel = true;
        break;
      }
    }
    if (matchedHistoryLabel) break;
  }
  if (!matchedHistoryLabel) {
    for (let r = 0; r < Math.min(100, rows.length); r++) {
      const row = rows[r];
      if (!row) continue;
      for (let c = 0; c < Math.min(5, row.length); c++) {
        const val = (row[c] || '').trim().toLowerCase();
        if (val.includes('full timeline') && val.length < 200) {
          historyStartIndex = r + 1;
          matchedHistoryLabel = true;
          break;
        }
      }
      if (matchedHistoryLabel) break;
    }
  }

  let sourcesNotesRow: number | null = null;
  for (let r = historyStartIndex; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    let hit = false;
    for (let c = 0; c < Math.min(5, row.length); c++) {
      const val = (row[c] || '').trim();
      if (val.includes('Sources & Notes') || val === 'min') {
        hit = true;
        break;
      }
    }
    if (hit) {
      sourcesNotesRow = r + 1;
      break;
    }
  }

  let notesRow = 34;
  for (let i = 10; i < Math.min(140, rows.length); i++) {
    const r = rows[i] || [];
    let hasCue = false;
    for (let c = 0; c < Math.min(6, r.length); c++) {
      const cell = r[c] || '';
      if (cell.toLowerCase().includes('how to read') || cell.length > 450) {
        hasCue = true;
        break;
      }
    }
    if (hasCue) {
      notesRow = i + 1;
      break;
    }
  }

  return {
    historyStartRow: historyStartIndex + 1,
    sourcesNotesRow,
    notesRow,
  };
}

/**
 * Parse numeric string safely, supporting European commas like "81,6" or "-40"
 */
function parseNum(val: string | undefined): number | null {
  if (!val) return null;
  const clean = val.trim().replace(',', '.').replace(/%/g, '');
  if (clean === '' || clean === '-' || clean.toLowerCase() === 'max' || clean.toLowerCase() === 'min') {
    return null;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Extracts flag emoji from text if present
 */
function extractFlag(text: string): { flag: string; cleanText: string } {
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/;
  const match = text.match(flagRegex);
  if (match) {
    return {
      flag: match[0],
      cleanText: text.replace(flagRegex, '').trim()
    };
  }
  return { flag: '', cleanText: text.trim() };
}

/**
 * Parses raw CSV into structured model records.
 * Supports distinct score modes:
 * - 'new': strictly models with Col M ("NEW Score").
 * - 'old': strictly models with Col L ("OLD Score").
 * - 'worstCase': strictly models with Col N ("Worst Case Score").
 */
/**
 * Parses all LLM model records by scanning from Row 36 down to where Column S ends.
 * - Collects the 29 current bots from rows 2-31 to identify active chatbots.
 * - Scans from row 36 (index 35) downwards, dynamically expanding as new LLMs are added.
 * - Stops at summary / notes rows (Sources & Notes, min, mean, median, max, count).
 * - Treats empty cells as missing (null) rather than zero.
 */
export function parseAllModelsFromRows(rows: string[][]): ModelRecord[] {
  if (rows.length < 3) return [];

  const layout = detectSheetColumns(rows);
  const startIndex = Math.max(2, layout.historyStartRow - 1);

  // 1. Current bot names from top table (above History start)
  const currentBotNames = new Set<string>();
  for (let r = 1; r < Math.min(startIndex - 1, rows.length); r++) {
    const row = rows[r];
    if (!row) continue;
    const s = (row[layout.colModelName] || '').trim().toLowerCase();
    const b = (row[layout.colNameLabel] || '').trim().toLowerCase();
    if (s) currentBotNames.add(s);
    if (b) currentBotNames.add(b);
  }

  // 2. Parse dynamic company lookup table (Company, Domain, Flag)
  const colCompany = layout.colCompany;
  const colDomain = layout.colDomain;
  const colFlag = layout.colFlag;

  // Helper to extract clean domain: strip http://, https://, www., and trailing slashes/paths
  const sanitizeDomain = (rawDomain: string): string => {
    let d = rawDomain.trim();
    d = d.replace(/^https?:\/\//i, '');
    d = d.replace(/^www\./i, '');
    d = d.split('/')[0].split('?')[0].split('#')[0].trim().toLowerCase();
    return d;
  };

  const companyLookupMap: Record<string, { name: string; domain: string; flag: string }> = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row && row.length > colCompany && row[colCompany]) {
      const comp = row[colCompany].trim();
      if (!comp || comp.toLowerCase().includes('lookup') || comp.toLowerCase() === 'company') continue;
      const rawDomain = (row[colDomain] || '').trim();
      const domain = sanitizeDomain(rawDomain);
      const flag = (row[colFlag] || '').trim();
      if (domain || flag) {
        companyLookupMap[comp.toLowerCase()] = { name: comp, domain, flag };
      }
    }
  }

  // 3. Pre-collect DE pricing and US pricing (when present) across top & history tables
  const colDeHeader = `${rows[0]?.[layout.colDePrice] || ''} ${rows[1]?.[layout.colDePrice] || ''}`.toLowerCase();
  const useColDePricing = colDeHeader.includes('cost') || colDeHeader.includes('abokosten') || colDeHeader.includes('paid') || !colDeHeader.includes('creator');

  const isPriceHeaderText = (v: string) => {
    const low = v.toLowerCase();
    return low.includes('abokosten') || low.includes('creator') || low.includes('release') || low.includes('monthly cost') || low.includes('if paid');
  };

  const colDePriceMap = new Map<string, string>();
  const colUsPriceMap = new Map<string, string>();

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const s = (row[layout.colModelName] || '').trim().toLowerCase();
    const b = (row[layout.colNameLabel] || '').trim().toLowerCase();
    const { cleanText: cleanB } = extractFlag(b);

    const valDePrimary = useColDePricing ? (row[layout.colDePrice] || '').trim() : '';
    const valDe = (valDePrimary && !isPriceHeaderText(valDePrimary)) ? valDePrimary : '';
    if (valDe) {
      if (s) colDePriceMap.set(s, valDe);
      if (cleanB) colDePriceMap.set(cleanB.toLowerCase(), valDe);
    }

    if (layout.colUsPrice !== null) {
      const valUsRaw = (row[layout.colUsPrice] || '').trim();
      if (valUsRaw && !isPriceHeaderText(valUsRaw)) {
        if (s) colUsPriceMap.set(s, valUsRaw);
        if (cleanB) colUsPriceMap.set(cleanB.toLowerCase(), valUsRaw);
      }
    }
  }

  const allModels: ModelRecord[] = [];
  const seenModelIds = new Map<string, number>();

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 5) continue;

    const rawNameCell = (row[layout.colNameLabel] || '').trim();
    const rawCreatorCell = (row[layout.colCreatorYear] || '').trim();
    const colS = (row[layout.colModelName] || '').trim();

    // Termination: when hitting summary rows, min/mean/median/max/count, or notes
    if (
      rawNameCell.includes('Sources & Notes') ||
      rawCreatorCell.includes('Sources & Notes') ||
      rawCreatorCell === 'min' ||
      rawCreatorCell === 'mean' ||
      rawCreatorCell === 'median' ||
      rawCreatorCell === 'max' ||
      rawCreatorCell.startsWith('count') ||
      rawNameCell === 'min' ||
      rawNameCell === 'mean' ||
      rawNameCell === 'median' ||
      rawNameCell === 'max' ||
      rawNameCell.startsWith('count')
    ) {
      break;
    }

    // Skip section placeholders / rumors where canonical Model Name column is empty
    if (!colS || rawNameCell.toLowerCase().includes('expectations') || rawNameCell.toLowerCase().includes('rumors')) {
      continue;
    }

    // Extract Flag and Name
    const { flag: nameFlag, cleanText: cleanedName } = extractFlag(rawNameCell);
    const { flag: creatorFlag, cleanText: cleanedCreator } = extractFlag(rawCreatorCell);

    // Lookup company info (domain, flag, name) dynamically from Google Sheets lookup table (Cols AJ-AL)
    let lookupFlag = '';
    let lookupDomain = '';
    let lookupCompName = '';
    const creatorLow = cleanedCreator.toLowerCase().trim();
    const colZLow = (row[layout.colModelCreator] || '').toLowerCase().trim(); // Dynamic model creator column (Z or AA)
    const nameLow = cleanedName.toLowerCase().trim();

    const normalizedCandidates = [
      normalizeCompanyLookupKey(creatorLow),
      creatorLow,
      normalizeCompanyLookupKey(colZLow),
      colZLow,
      normalizeCompanyLookupKey(nameLow),
      nameLow,
    ].filter(Boolean);

    for (const candidate of normalizedCandidates) {
      if (companyLookupMap[candidate]) {
        const info = companyLookupMap[candidate];
        lookupFlag = info.flag;
        lookupDomain = info.domain;
        lookupCompName = info.name;
        break;
      }
    }

    if (!lookupDomain && !lookupCompName) {
      for (const [key, info] of Object.entries(companyLookupMap)) {
        if (
          normalizedCandidates.some((cand) => cand === key || cand.includes(key) || key.includes(cand))
        ) {
          if (info.flag && !lookupFlag) lookupFlag = info.flag;
          if (info.domain && !lookupDomain) lookupDomain = info.domain;
          if (info.name && !lookupCompName) lookupCompName = info.name;
          if (lookupFlag && lookupDomain) break;
        }
      }
    }

    const fallbackCompany = getCompanyMeta(cleanedCreator);
    const company = {
      name: lookupCompName || fallbackCompany.name,
      domain: lookupDomain || fallbackCompany.domain,
      flag: lookupFlag || fallbackCompany.flag,
    };
    const flag = nameFlag || creatorFlag || lookupFlag || company.flag || '🌐';

    // Model badges
    const isPaid = rawNameCell.includes('💲');
    const isFreeApi = rawNameCell.includes('🌐');
    const isNew =
      rawNameCell.includes('🆕') ||
      rawNameCell.includes('✦') ||
      rawNameCell.includes('✧') ||
      rawNameCell.includes('★') ||
      rawNameCell.includes('⭐') ||
      /\bNEW\b/i.test(rawNameCell);

    // Canonical display name from Column S
    const displayName = colS;

    // Parse Active Benchmark Columns dynamically - Empty cells remain null (missing)
    const valD = parseNum(row[layout.colActCodeReason]);
    const valE = parseNum(row[layout.colNonHallucination]);
    const valF = parseNum(row[layout.colScienceKnowledge]);
    const valG = parseNum(row[layout.colVisionPlot]);
    const valH = parseNum(row[layout.colMedReasoning]);
    const valI = parseNum(row[layout.colExcelAgent]);
    const valJ = parseNum(row[layout.colTrickQuestions]);
    const valK = parseNum(row[layout.colEconLegal]);

    // Parse Retired Benchmark Columns dynamically (IQ_old, Non-Hallu-Rate_old, Science Knowledge_old, Trick Questions_old)
    const valU = parseNum(row[layout.colIqOld]);
    const valV = parseNum(row[layout.colNonHalluOld]);
    const valW = parseNum(row[layout.colScienceOld]);
    const valX = parseNum(row[layout.colTrickOld]);

    // Benchmark raw scores
    const rawScores: RawBenchmarkScores = {
      actCodeReason: valD,
      nonHallucination: valE,
      scienceKnowledge: valF,
      visionPlot: valG,
      medReasoning: valH,
      excelAgent: valI,
      trickQuestions: valJ,
      econLegal: valK,
      iqOld: valU,
      nonHalluOld: valV,
      scienceKnowledgeOld: valW,
      trickQuestionsOld: valX,
    };

    // Transformed benchmark values (0-100 scale)
    const tD = valD !== null ? Math.max(0, Math.min(100, valD)) : null;
    const tE = valE !== null ? Math.max(0, Math.min(100, valE)) : null;
    const tF = valF !== null ? Math.max(0, Math.min(100, valF)) : null;
    const tG = valG !== null ? Math.max(0, Math.min(100, 1.4085 * (valG - 29))) : null;
    const tH = valH !== null ? Math.max(0, Math.min(100, valH)) : null;
    const tI = valI !== null ? Math.max(0, Math.min(100, valI)) : null;
    const tJ = valJ !== null ? Math.max(0, Math.min(100, valJ)) : null;
    const tK = valK !== null ? Math.max(0, Math.min(100, valK)) : null;

    const hasAll8 =
      tD !== null && tE !== null && tF !== null && tG !== null &&
      tH !== null && tI !== null && tJ !== null && tK !== null;

    const hasAll5Old =
      tD !== null && tE !== null && tF !== null && tG !== null && tJ !== null;

    // Dynamically calculate OLD score from 5 benchmarks (averaging Col D, E, F, G, J)
    const scoreOldCalculated = hasAll5Old
      ? Math.round((tD! + tE! + tF! + tG! + tJ!) / 5)
      : null;

    // Dynamically calculate NEW score from all 8 benchmarks (averaging all 8 benchmarks)
    const scoreNewCalculated = hasAll8
      ? Math.round((tD! + tE! + tF! + tG! + tH! + tI! + tJ! + tK!) / 8)
      : null;

    // Dynamically calculate Worst Case score (7-benchmark average multiplied by non-hallucination rate)
    const scoreWorstCaseCalculated = hasAll8
      ? Math.round((((tD! + tF! + tG! + tH! + tI! + tJ! + tK!) / 7) * tE!) / 100)
      : null;

    const scoreOldReported = parseNum(row[layout.colOldScore]);
    const scoreNewReported = parseNum(row[layout.colNewScore]);
    const scoreWorstCaseReported = parseNum(row[layout.colWorstCaseScore]);

    // When score cells in the CSV are emptied (e.g. updating AA-Intelligence-Index to v5),
    // empty cells must strictly remain empty / null rather than falling back to synthetic calculations:
    const finalScoreOld = scoreOldReported;
    const finalScoreNew = scoreNewReported;
    const finalScoreWorstCase = scoreWorstCaseReported;

    const activeScore = finalScoreNew ?? finalScoreOld ?? finalScoreWorstCase ?? 0;
    const activeMode: ScoreMode = finalScoreNew !== null ? 'new' : finalScoreOld !== null ? 'old' : 'worstCase';

    const breakdown = createModelBreakdown(rawScores, activeScore, activeMode);

    const storyline = (row[layout.colStoryline] || '').trim();
    const chatLinkRaw = (row[layout.colChatLink] || '').trim();
    const apiLinkRaw = (row[layout.colApiLink] || '').trim();

    // Helper to extract first valid http/https URL (or schemeless domain URL) from a cell string
    const extractHttpUrl = (str: string): string | undefined => {
      if (!str) return undefined;
      const trimmed = str.trim();
      const httpMatch = trimmed.match(/https?:\/\/[^\s,]+/i);
      if (httpMatch) return httpMatch[0].trim();
      const wwwMatch = trimmed.match(/\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s,]*)?/i);
      if (wwwMatch) return `https://${wwwMatch[0].trim()}`;
      if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s,]*)?$/i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      return undefined;
    };

    const parsedChatLink = extractHttpUrl(chatLinkRaw);
    const parsedApiLink = extractHttpUrl(apiLinkRaw);
    const modelUrl = parsedChatLink || parsedApiLink;

    const faviconUrl = getFaviconUrl(company.domain);

    // Release date from dynamic release column (Col Y or Col Z) with concrete-date tracking
    const rawReleaseDate = (row[layout.colReleaseDate] || '').trim();
    let normalizedRawRelease = '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawReleaseDate)) {
      normalizedRawRelease = rawReleaseDate;
    } else if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(rawReleaseDate)) {
      const parts = rawReleaseDate.split(/[/-]/);
      normalizedRawRelease = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(rawReleaseDate)) {
      const parts = rawReleaseDate.split('.');
      normalizedRawRelease = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    const hasConcreteReleaseDate = /^\d{4}-\d{2}-\d{2}$/.test(normalizedRawRelease);
    let releaseDate = normalizedRawRelease;
    if (!hasConcreteReleaseDate) {
      const combined = `${rawCreatorCell} ${rawNameCell}`;
      const m = combined.match(/(Jan|Feb|Mär|Mar|Apr|Mai|May|Jun|Jul|Aug|Sep|Sept|Okt|Oct|Nov|Dez|Dec)\s*(\d{2})/i);
      if (m) {
        const monthMap: Record<string, string> = {
          jan: '01', feb: '02', mär: '03', mar: '03', apr: '04', mai: '05', may: '05',
          jun: '06', jul: '07', aug: '08', sep: '09', sept: '09', okt: '10', oct: '10',
          nov: '11', dez: '12', dec: '12'
        };
        const month = monthMap[m[1].toLowerCase()] || '01';
        const year = '20' + m[2];
        releaseDate = `${year}-${month}-01`;
      } else {
        releaseDate = '2024-01-01';
      }
    }

    const chatLinkLow = chatLinkRaw.toLowerCase();
    const isSupersededOrDiscontinued =
      chatLinkLow.includes('better') ||
      chatLinkLow.includes('discontinued') ||
      chatLinkRaw === '';

    const isAvailable =
      currentBotNames.has(colS.toLowerCase()) ||
      currentBotNames.has(cleanedName.toLowerCase()) ||
      (!isSupersededOrDiscontinued && (chatLinkLow.startsWith('http') || chatLinkLow.includes('paid') || chatLinkLow.includes('api') || !!parsedApiLink));

    const rawColDe = useColDePricing ? (row[layout.colDePrice] || '').trim() : '';
    const priceDeMonthly = (rawColDe && !isPriceHeaderText(rawColDe))
      ? rawColDe
      : colDePriceMap.get(displayName.toLowerCase()) || colDePriceMap.get(cleanedName.toLowerCase()) || undefined;

    let priceUsMonthly: string | undefined;
    if (layout.colUsPrice !== null) {
      const rawColUs = (row[layout.colUsPrice] || '').trim();
      priceUsMonthly = (rawColUs && !isPriceHeaderText(rawColUs))
        ? rawColUs
        : colUsPriceMap.get(displayName.toLowerCase()) || colUsPriceMap.get(cleanedName.toLowerCase()) || undefined;
    }

    const baseSlug =
      displayName
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/^_+|_+$/g, '') || `row_${r + 1}`;
    const baseId = `model-${baseSlug}`;
    const dupIdx = seenModelIds.get(baseId) ?? 0;
    seenModelIds.set(baseId, dupIdx + 1);
    const stableId = dupIdx === 0 ? baseId : `${baseId}__${dupIdx + 1}`;

    allModels.push({
      id: stableId,
      rank: 0,
      flag,
      name: rawNameCell,
      displayName,
      isPaid,
      isFreeApi,
      isNew,
      creator: rawCreatorCell,
      creatorClean: cleanedCreator,
      companyName: company.name,
      releaseDate,
      hasConcreteReleaseDate,
      releaseText: cleanedCreator,
      rawScores,
      hasAll8Benchmarks: hasAll8,
      hasAll5OldBenchmarks: hasAll5Old,
      breakdown,
      score: activeScore,
      scoreOld: finalScoreOld,
      scoreOldReported,
      scoreOldCalculated,
      scoreNew: finalScoreNew,
      scoreNewCalculated: scoreNewCalculated ?? activeScore,
      scoreNewReported,
      scoreWorstCase: finalScoreWorstCase,
      scoreWorstCaseReported,
      scoreWorstCaseCalculated,
      storyline,
      chatLink: parsedChatLink,
      apiLink: parsedApiLink,
      modelUrl,
      isAvailable,
      companyDomain: company.domain,
      faviconUrl,
      priceDeMonthly: priceDeMonthly || undefined,
      priceUsMonthly: priceUsMonthly || undefined,
      sheetRowNumber: r + 1,
    });
  }

  return allModels;
}

export function parseAllModels(csvText: string): ModelRecord[] {
  return parseAllModelsFromRows(parseCsvRows(csvText));
}

/**
 * Calculates the 8-component segment breakdown strictly tailored to the selected score mode:
 * - 'new': strictly proportional to all 8 benchmarks (Col D through K, 12.5% each), normalized to targetScore.
 * - 'worstCase': strictly proportional to all 8 benchmarks scaled down to match the conservative Worst Case score.
 * - 'old': strictly proportional to the 5 benchmarks of the old score (Col D, E, F, G, J), normalized to targetScore.
 */
export function createModelBreakdown(
  rawScores: RawBenchmarkScores,
  targetScore: number,
  mode: ScoreMode = 'new',
  weights?: BenchmarkWeights
): ComponentBreakdown[] {
  if (mode === 'new' && weights && isCustomWeighted(weights)) {
    return computeWeightedBreakdown(rawScores, targetScore, weights);
  }
  if (mode === 'old') {
    const oldKeys = ['actCodeReason', 'nonHallucination', 'scienceKnowledge', 'visionPlot', 'trickQuestions'];
    const oldComponents = BENCHMARK_COMPONENTS.filter((comp) => oldKeys.includes(comp.id));

    const rawContributions = oldComponents.map((comp) => {
      const raw = rawScores[comp.key] ?? 0;
      const transformed = comp.transform(raw);
      const pts = transformed / 5;
      return { comp, raw, transformed, pts };
    });

    const sumTransformed = rawContributions.reduce((acc, c) => acc + c.pts, 0);
    const effectiveScore = targetScore > 0 ? targetScore : Math.round(sumTransformed);
    const normFactor = sumTransformed > 0 && effectiveScore > 0 ? effectiveScore / sumTransformed : 1;

    return rawContributions.map(({ comp, raw, transformed, pts }) => {
      const normalizedContribution = parseFloat((pts * normFactor).toFixed(2));
      return {
        id: comp.id,
        name: comp.nameDe,
        color: comp.color,
        rawValue: raw,
        transformedValue: transformed,
        pointsContribution: normalizedContribution,
        percentageOfTotal: effectiveScore > 0 ? parseFloat(((normalizedContribution / effectiveScore) * 100).toFixed(1)) : 0,
      };
    });
  }

  // mode === 'new' or 'worstCase'
  // When values in columns H (Diagnostics) or K (Vals.ai) change in the CSV,
  // each segment is recalculated proportionally from its raw value and scaled to targetScore.
  const rawContributions = BENCHMARK_COMPONENTS.map((comp) => {
    const raw = rawScores[comp.key] ?? 0;
    const transformed = comp.transform(raw);
    const pts = transformed / 8;
    return { comp, raw, transformed, pts };
  });

  const sumTransformed = rawContributions.reduce((acc, c) => acc + c.pts, 0);
  const normFactor = sumTransformed > 0 && targetScore > 0 ? targetScore / sumTransformed : 1;

  return rawContributions.map(({ comp, raw, transformed, pts }) => {
    const normalizedContribution = parseFloat((pts * normFactor).toFixed(2));
    return {
      id: comp.id,
      name: comp.nameDe,
      color: comp.color,
      rawValue: raw,
      transformedValue: transformed,
      pointsContribution: normalizedContribution,
      percentageOfTotal: targetScore > 0 ? parseFloat(((normalizedContribution / targetScore) * 100).toFixed(1)) : 0,
    };
  });
}

/**
 * Parses models filtered and ranked by specific score mode:
 * - 'new': strictly models with Col M ("NEW Score"), recalculating segment breakdown to match target score
 * - 'old': strictly models with Col L ("OLD Score"), recalculating segment breakdown to match target score
 * - 'worstCase': strictly models with Col N ("Worst Case Score"), recalculating segment breakdown to match target score
 */
export function parseModelDatasetFromRows(rows: string[][], mode: ScoreMode = 'new'): ModelRecord[] {
  const all = parseAllModelsFromRows(rows);

  let filtered: ModelRecord[] = [];
  if (mode === 'old') {
    filtered = all
      .filter((m) => m.scoreOld !== null && m.scoreOld > 0)
      .map((m) => {
        const score = m.scoreOld as number;
        return {
          ...m,
          score,
          scoreNewCalculated: score,
          breakdown: createModelBreakdown(m.rawScores, score, 'old'),
        };
      });
  } else if (mode === 'worstCase') {
    filtered = all
      .filter((m) => m.scoreWorstCase !== null && m.scoreWorstCase > 0)
      .map((m) => {
        const score = m.scoreWorstCase as number;
        return {
          ...m,
          score,
          scoreNewCalculated: score,
          breakdown: createModelBreakdown(m.rawScores, score, 'worstCase'),
        };
      });
  } else {
    filtered = all
      .filter((m) => m.scoreNew !== null && m.scoreNew > 0)
      .map((m) => {
        const score = m.scoreNew as number;
        return {
          ...m,
          score,
          scoreNewCalculated: score,
          breakdown: createModelBreakdown(m.rawScores, score, 'new'),
        };
      });
  }

  // Sort descending by target score
  filtered.sort((a, b) => b.score - a.score);

  // Assign sequential ranks 1..N
  filtered.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  return filtered;
}

export function parseModelDataset(csvText: string, mode: ScoreMode = 'new'): ModelRecord[] {
  return parseModelDatasetFromRows(parseCsvRows(csvText), mode);
}
