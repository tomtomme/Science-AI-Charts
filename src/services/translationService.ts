import type { CsvNotesMetadata } from '../types';
import type { CsvHeaderMetadata } from '../utils/csvParser';

export interface WeeklyTranslationRequest {
  a1: string;
  c1: string;
  categoryNames: string[];
  b34: string;
  c34: string;
  n34: string;
  o34: string;
}

export interface WeeklyTranslationResult {
  titleDe: string;
  subtitleDe: string;
  categoryNamesDe: string[];
  section1TitleDe: string;
  section1ContentDe: string;
  section2TitleDe: string;
  section2ContentDe: string;
  section2ContentEn: string;
}

export interface WeeklyTranslationApiResponse {
  available: boolean;
  translatedAt: string | null;
  translation: WeeklyTranslationResult | null;
}

export async function fetchWeeklySheetTranslations(
  headerMeta: CsvHeaderMetadata,
  notesMeta: CsvNotesMetadata
): Promise<WeeklyTranslationApiResponse | null> {
  const categoryNames = headerMeta.categoryNames || [];
  if (categoryNames.length !== 8 && !headerMeta.cellA1 && !notesMeta.section1Content) {
    return null;
  }

  try {
    const res = await fetch('/api/translations/sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        a1: headerMeta.cellA1 || '',
        c1: headerMeta.cellC1 || '',
        categoryNames,
        b34: notesMeta.section1Title || '',
        c34: notesMeta.section1Content || '',
        n34: notesMeta.section2Title || '',
        o34: notesMeta.section2Content || '',
      } satisfies WeeklyTranslationRequest),
    });

    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;

    return (await res.json()) as WeeklyTranslationApiResponse;
  } catch {
    return null;
  }
}
