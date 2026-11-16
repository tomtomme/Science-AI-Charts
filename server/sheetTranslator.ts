import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-weekly-translations-v1.json');
const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SheetTranslationPayload {
  a1: string;
  c1: string;
  categoryNames: string[];
  b34: string;
  c34: string;
  n34: string;
  o34: string;
}

export interface TranslatedSheetContent {
  titleDe: string;
  subtitleDe: string;
  categoryNamesDe: string[];
  section1TitleDe: string;
  section1ContentDe: string;
  section2TitleDe: string;
  section2ContentDe: string;
  section2ContentEn: string;
}

interface PersistedTranslationCache {
  translatedAt: string;
  translated: TranslatedSheetContent;
}

let inMemoryCache: PersistedTranslationCache | null = null;
let inFlightTranslation: Promise<PersistedTranslationCache | null> | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function readCache(): Promise<PersistedTranslationCache | null> {
  if (inMemoryCache) {
    return inMemoryCache;
  }
  try {
    const raw = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as PersistedTranslationCache;
    if (parsed && parsed.translatedAt && parsed.translated) {
      inMemoryCache = parsed;
      return parsed;
    }
  } catch {
    // Cache file may not exist yet
  }
  return null;
}

async function writeCache(cache: PersistedTranslationCache): Promise<void> {
  inMemoryCache = cache;
  try {
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist weekly sheet translation cache:', err);
  }
}

function isCacheFreshWeekly(cache: PersistedTranslationCache | null): boolean {
  if (!cache?.translatedAt) return false;
  const ts = new Date(cache.translatedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < WEEKLY_INTERVAL_MS;
}

export async function getOrRefreshWeeklyTranslation(
  payload: SheetTranslationPayload,
  force = false
): Promise<{
  available: boolean;
  translatedAt: string | null;
  translation: TranslatedSheetContent | null;
}> {
  const cached = await readCache();
  if (!force && isCacheFreshWeekly(cached)) {
    return {
      available: true,
      translatedAt: cached!.translatedAt,
      translation: cached!.translated,
    };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return {
      available: Boolean(cached?.translated),
      translatedAt: cached?.translatedAt ?? null,
      translation: cached?.translated ?? null,
    };
  }

  if (inFlightTranslation) {
    const result = await inFlightTranslation;
    return {
      available: Boolean(result?.translated),
      translatedAt: result?.translatedAt ?? null,
      translation: result?.translated ?? null,
    };
  }

  inFlightTranslation = (async () => {
    try {
      const prompt = `Translate the following spreadsheet header, category labels, and explanatory notes for a scientific AI chatbot benchmark dashboard.

RULES:
1. Translate a1, c1, categoryNames (exact same array length: ${payload.categoryNames.length}), b34, c34, and n34 from English into clear, natural, concise German.
2. For o34: keep/ensure a natural German version in section2ContentDe (if o34 is already German, keep it verbatim without rewriting/shortening it), AND provide a natural English translation in section2ContentEn (if o34 is already English, keep it verbatim).
3. CRITICAL STRUCTURE PRESERVATION for c34 and o34:
   - Keep ALL line breaks, dashed divider lines ("---" / "------------------"), and "- " bullet prefixes intact.
   - Keep every URL (https://..., http://...) completely unchanged.
   - Keep recognizable label/column cues before ":" on bullet lines in c34 (e.g., "- IQ:", "- Faktentreue:", "- Faktenwissen:", "- Diagrammanalyse:", "- Diagnostik:", "- Excel-Analyst:", "- Experimenting & Engineering:", "- Wirtschaft & Recht:", "- SimpleBench:", "- OLD:", "- NEW:", "- Worst-Case:", "- Storyline:", "- Aktuell:", "- Verlauf:").
   - Do not summarize or omit any paragraphs, bullet points, or links.

INPUT DATA (JSON):
${JSON.stringify(payload, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titleDe: { type: Type.STRING },
              subtitleDe: { type: Type.STRING },
              categoryNamesDe: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              section1TitleDe: { type: Type.STRING },
              section1ContentDe: { type: Type.STRING },
              section2TitleDe: { type: Type.STRING },
              section2ContentDe: { type: Type.STRING },
              section2ContentEn: { type: Type.STRING },
            },
            required: [
              'titleDe',
              'subtitleDe',
              'categoryNamesDe',
              'section1TitleDe',
              'section1ContentDe',
              'section2TitleDe',
              'section2ContentDe',
              'section2ContentEn',
            ],
          },
        },
      });

      const rawJson = (response.text || '').trim();
      if (!rawJson) return cached;

      const parsed = JSON.parse(rawJson) as TranslatedSheetContent;
      if (
        !parsed.titleDe ||
        !Array.isArray(parsed.categoryNamesDe) ||
        parsed.categoryNamesDe.length !== payload.categoryNames.length
      ) {
        return cached;
      }

      const nextCache: PersistedTranslationCache = {
        translatedAt: new Date().toISOString(),
        translated: parsed,
      };
      await writeCache(nextCache);
      return nextCache;
    } catch (err) {
      console.warn('Weekly sheet translation skipped/failed:', err instanceof Error ? err.message : err);
      return cached;
    } finally {
      inFlightTranslation = null;
    }
  })();

  const finalResult = await inFlightTranslation;
  return {
    available: Boolean(finalResult?.translated),
    translatedAt: finalResult?.translatedAt ?? null,
    translation: finalResult?.translated ?? null,
  };
}
