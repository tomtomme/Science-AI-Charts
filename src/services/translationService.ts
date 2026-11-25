import type { CsvNotesMetadata } from '../types';
import type { CsvHeaderMetadata } from '../utils/csvParser';

export interface WeeklyTranslationRequest {
  a1: string;
  c1: string;
  categoryNames: string[];
  compositeScoreNames?: string[];
  retiredCategoryNames?: string[];
  b34: string;
  c34: string;
  n34: string;
  o34: string;
}

export interface WeeklyTranslationResult {
  titleDe: string;
  subtitleDe: string;
  categoryNamesDe: string[];
  compositeScoreNamesDe?: string[];
  retiredCategoryNamesDe?: string[];
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
        compositeScoreNames: headerMeta.compositeScoreNames || [],
        retiredCategoryNames: headerMeta.retiredCategoryNames || [],
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

const LAB_TIERS_EN_CACHE_KEY = 'science_iq_lab_tiers_en_cache_v1';

interface LabTiersEnLocalCache {
  fingerprint: string;
  translations: Record<string, string>;
}

export async function fetchLabTiersEnTranslations(
  entries: Record<string, string>
): Promise<Record<string, string> | null> {
  const keys = Object.keys(entries)
    .filter((k) => entries[k]?.trim())
    .sort();
  if (keys.length === 0) return null;

  const fingerprint = JSON.stringify(keys.map((k) => [k, entries[k].trim()]));

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(LAB_TIERS_EN_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LabTiersEnLocalCache;
        if (parsed?.fingerprint === fingerprint && parsed.translations) {
          return parsed.translations;
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  try {
    const res = await fetch('/api/translations/lab-tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;

    const data = (await res.json()) as {
      available?: boolean;
      translations?: Record<string, string>;
    };
    if (!data?.translations || Object.keys(data.translations).length === 0) {
      return null;
    }

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          LAB_TIERS_EN_CACHE_KEY,
          JSON.stringify({
            fingerprint,
            translations: data.translations,
          } satisfies LabTiersEnLocalCache)
        );
      } catch {
        // ignore storage quota errors
      }
    }

    return data.translations;
  } catch {
    return null;
  }
}

