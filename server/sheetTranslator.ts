import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-weekly-translations-v2.json');
const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SheetTranslationPayload {
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

export interface TranslatedSheetContent {
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

interface PersistedTranslationCache {
  translatedAt: string;
  sourceHash?: string;
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

function computePayloadHash(payload: SheetTranslationPayload): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16);
}

function isCacheFreshWeekly(cache: PersistedTranslationCache | null, sourceHash: string): boolean {
  if (!cache?.translatedAt) return false;
  if (cache.sourceHash && cache.sourceHash !== sourceHash) return false;
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
  const sourceHash = computePayloadHash(payload);
  const cached = await readCache();
  if (!force && isCacheFreshWeekly(cached, sourceHash)) {
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
1. Translate a1, c1, categoryNames (exact same array length: ${payload.categoryNames.length}), compositeScoreNames (exact same array length: ${(payload.compositeScoreNames || []).length}, concise German slider labels like "Neuer Score", "Alter Score", "Worst Case"), retiredCategoryNames (exact same array length: ${(payload.retiredCategoryNames || []).length}), b34, c34, and n34 from English into clear, natural, concise German.
2. For o34: keep/ensure a natural German version in section2ContentDe (if o34 is already German, keep it verbatim without rewriting/shortening it), AND provide a natural English translation in section2ContentEn (if o34 is already English, keep it verbatim).
3. CRITICAL STRUCTURE PRESERVATION for c34 and o34:
   - Keep ALL line breaks, dashed divider lines ("---" / "------------------"), and "- " bullet prefixes intact.
   - Keep every URL (https://..., http://...) completely unchanged.
   - Keep recognizable label/column cues before ":" on bullet lines in c34 (e.g., "- IQ:", "- Faktentreue:", "- Faktenwissen:", "- Diagrammanalyse:", "- Diagnostik:", "- Excel-Analyst:", "- Experimenting & Engineering:", "- Wirtschaft & Recht:", "- SimpleBench:", "- OLD:", "- NEW:", "- Worst-Case:", "- Storyline:", "- Aktuell:", "- Verlauf:").
   - Do not summarize or omit any paragraphs, bullet points, or links.

INPUT DATA (JSON):
${JSON.stringify(payload, null, 2)}`;

      const runTranslationModel = async (model: string, useThinking: boolean) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...(useThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
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
                compositeScoreNamesDe: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                retiredCategoryNamesDe: {
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
                'compositeScoreNamesDe',
                'retiredCategoryNamesDe',
                'section1TitleDe',
                'section1ContentDe',
                'section2TitleDe',
                'section2ContentDe',
                'section2ContentEn',
              ],
            },
          },
        });

      const translationAttempts: Array<{ model: string; useThinking: boolean; delayMs: number }> = [
        { model: 'gemini-4-hydrogen', useThinking: true, delayMs: 0 },
        { model: 'gemini-3.5-flash-lite', useThinking: false, delayMs: 1200 },
        { model: 'gemini-flash-lite-latest', useThinking: false, delayMs: 1500 },
      ];

      let response;
      let lastTranslationErr: unknown;
      for (const attempt of translationAttempts) {
        if (attempt.delayMs > 0) {
          await new Promise((r) => setTimeout(r, attempt.delayMs));
        }
        try {
          response = await runTranslationModel(attempt.model, attempt.useThinking);
          break;
        } catch (err) {
          lastTranslationErr = err;
          const msg = err instanceof Error ? err.message : String(err || '');
          if (!/503|UNAVAILABLE|high demand|overloaded|429|RESOURCE_EXHAUSTED|500|404/i.test(msg)) {
            throw err;
          }
        }
      }
      if (!response) {
        throw lastTranslationErr;
      }

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
        sourceHash,
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

const LAB_TIERS_CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-lab-tiers-en-v1.json');

interface PersistedLabTiersCache {
  translatedAt: string;
  sourceHash: string;
  translations: Record<string, string>;
}

let inMemoryLabTiersCache: PersistedLabTiersCache | null = null;
let inFlightLabTiersTranslation: Promise<PersistedLabTiersCache | null> | null = null;

async function readLabTiersCache(): Promise<PersistedLabTiersCache | null> {
  if (inMemoryLabTiersCache) return inMemoryLabTiersCache;
  try {
    const raw = await fs.readFile(LAB_TIERS_CACHE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as PersistedLabTiersCache;
    if (parsed && parsed.sourceHash && parsed.translations && typeof parsed.translations === 'object') {
      inMemoryLabTiersCache = parsed;
      return parsed;
    }
  } catch {
    // Cache file may not exist yet
  }
  return null;
}

async function writeLabTiersCache(cache: PersistedLabTiersCache): Promise<void> {
  inMemoryLabTiersCache = cache;
  try {
    await fs.writeFile(LAB_TIERS_CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist lab tiers EN translation cache:', err);
  }
}

export async function getOrRefreshLabTiersEnTranslation(
  entries: Record<string, string>
): Promise<{
  available: boolean;
  translatedAt: string | null;
  translations: Record<string, string>;
}> {
  const normalizedKeys = Object.keys(entries)
    .filter((k) => typeof entries[k] === 'string' && entries[k].trim().length > 0)
    .sort();
  if (normalizedKeys.length === 0) {
    return { available: true, translatedAt: null, translations: {} };
  }

  const orderedEntries: Array<{ id: string; text: string }> = normalizedKeys.map((id) => ({
    id,
    text: entries[id].trim(),
  }));

  const sourceHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(orderedEntries))
    .digest('hex')
    .slice(0, 16);

  const cached = await readLabTiersCache();
  if (
    cached &&
    cached.sourceHash === sourceHash &&
    Number.isFinite(new Date(cached.translatedAt).getTime()) &&
    Date.now() - new Date(cached.translatedAt).getTime() < WEEKLY_INTERVAL_MS
  ) {
    return {
      available: true,
      translatedAt: cached.translatedAt,
      translations: cached.translations,
    };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return {
      available: false,
      translatedAt: cached?.translatedAt ?? null,
      translations: cached?.translations ?? {},
    };
  }

  if (inFlightLabTiersTranslation) {
    const res = await inFlightLabTiersTranslation;
    return {
      available: Boolean(res?.translations),
      translatedAt: res?.translatedAt ?? null,
      translations: res?.translations ?? {},
    };
  }

  inFlightLabTiersTranslation = (async () => {
    try {
      const prompt = `Translate the following German AI lab subscription-tier and API-billing summary strings into concise, natural English.

RULES:
1. Keep every product name, tier name, model name, domain/URL (e.g. build.nvidia.com, chat.qwen.ai, api.meta.ai, JASP, Hydrogen, Claude Console, Qoder), and pipe separator ("|") intact.
2. Do not omit, shorten, or summarize any details—every clause in each entry must be fully translated.
3. Keep the exact same "id" for each item.

INPUT (JSON):
${JSON.stringify(orderedEntries, null, 2)}`;

      const runModel = async (model: string, useThinking: boolean) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            ...(useThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      en: { type: Type.STRING },
                    },
                    required: ['id', 'en'],
                  },
                },
              },
              required: ['items'],
            },
          },
        });

      const attempts: Array<{ model: string; useThinking: boolean; delayMs: number }> = [
        { model: 'gemini-4-hydrogen', useThinking: true, delayMs: 0 },
        { model: 'gemini-3.1-flash-lite', useThinking: false, delayMs: 1000 },
      ];

      let response;
      let lastErr: unknown;
      for (const attempt of attempts) {
        if (attempt.delayMs > 0) {
          await new Promise((r) => setTimeout(r, attempt.delayMs));
        }
        try {
          response = await runModel(attempt.model, attempt.useThinking);
          break;
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err || '');
          if (!/503|UNAVAILABLE|high demand|overloaded|429|RESOURCE_EXHAUSTED|500|404/i.test(msg)) {
            throw err;
          }
        }
      }
      if (!response) throw lastErr;

      const rawJson = (response.text || '').trim();
      if (!rawJson) return cached;

      const parsed = JSON.parse(rawJson) as { items?: Array<{ id?: string; en?: string }> };
      if (!Array.isArray(parsed.items)) return cached;

      const translations: Record<string, string> = {};
      for (const item of parsed.items) {
        if (item?.id && typeof item.en === 'string' && item.en.trim()) {
          translations[item.id] = item.en.trim();
        }
      }
      if (Object.keys(translations).length === 0) return cached;

      const nextCache: PersistedLabTiersCache = {
        translatedAt: new Date().toISOString(),
        sourceHash,
        translations,
      };
      await writeLabTiersCache(nextCache);
      return nextCache;
    } catch (err) {
      console.warn('Lab tiers EN translation skipped/failed:', err instanceof Error ? err.message : err);
      return cached;
    } finally {
      inFlightLabTiersTranslation = null;
    }
  })();

  const finalResult = await inFlightLabTiersTranslation;
  return {
    available: Boolean(finalResult?.translations),
    translatedAt: finalResult?.translatedAt ?? null,
    translations: finalResult?.translations ?? {},
  };
}

