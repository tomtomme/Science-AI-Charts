import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { LabEntry } from '../types';
import { FALLBACK_CSV_CONTENT } from '../data/rawCsvFallback';
import { FALLBACK_LAB_ENTRIES } from '../data/rawLabCsvFallback';
import {
  extractSheetDate,
  extractHeaderMetadata,
  extractCsvNotesMetadata,
  parseModelDataset,
  parseAllModels,
  parseCsvRows,
  detectSheetColumns,
} from '../utils/csvParser';
import { LoadedDatasets, loadModelsData } from '../services/dataService';
import { fetchLiveLabEntries } from '../services/labDataService';
import { fetchWeeklySheetTranslations } from '../services/translationService';
import { initGoogleAuth, googleSignIn, googleSignOut, clearAccessToken } from '../services/googleAuthService';
import { DEFAULT_SPREADSHEET_ID } from '../services/googleSheetsService';

const SYNC_INTERVAL_SECONDS = 3600;

export function useSheetSyncAndAuth(onSignedOut?: () => void) {
  const [loadedData, setLoadedData] = useState<LoadedDatasets>(() => ({
    models: parseModelDataset(FALLBACK_CSV_CONTENT, 'new'),
    allModels: parseAllModels(FALLBACK_CSV_CONTENT),
    newModels: parseModelDataset(FALLBACK_CSV_CONTENT, 'new'),
    oldModels: parseModelDataset(FALLBACK_CSV_CONTENT, 'old'),
    worstCaseModels: parseModelDataset(FALLBACK_CSV_CONTENT, 'worstCase'),
    sheetFileDate: extractSheetDate(FALLBACK_CSV_CONTENT),
    sheetHeaderDate: null,
    lastSyncedAt: new Date(),
    isLive: false,
    columnLayout: detectSheetColumns(parseCsvRows(FALLBACK_CSV_CONTENT)),
    error: null,
    headerMeta: extractHeaderMetadata(FALLBACK_CSV_CONTENT),
    notesMeta: extractCsvNotesMetadata(FALLBACK_CSV_CONTENT),
  }));

  const [labs, setLabs] = useState<LabEntry[]>(FALLBACK_LAB_ENTRIES);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [, setCountdown] = useState<number>(SYNC_INTERVAL_SECONDS);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [oauthAccessToken, setOauthAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [activeSpreadsheetId] = useState<string>(DEFAULT_SPREADSHEET_ID);

  const isSheetsConnected =
    Boolean(oauthAccessToken) && loadedData.dataSource === 'sheets_api';

  const refreshData = useCallback(
    async (tokenOverride?: string | null, spreadsheetIdOverride?: string, forceRefresh = false) => {
      const effectiveToken = tokenOverride !== undefined ? tokenOverride : oauthAccessToken;
      const effectiveSpreadsheetId = spreadsheetIdOverride || activeSpreadsheetId;
      setIsSyncing(true);
      try {
        const [result, labRes] = await Promise.all([
          loadModelsData({
            accessToken: effectiveToken,
            spreadsheetId: effectiveSpreadsheetId,
            forceRefresh,
          }),
          fetchLiveLabEntries({
            accessToken: effectiveToken,
            spreadsheetId: effectiveSpreadsheetId,
            forceRefresh,
          }),
        ]);
        if (result.authError) {
          clearAccessToken();
          setOauthAccessToken(null);
        }
        if (result.newModels.length > 0 || result.oldModels.length > 0) {
          setLoadedData(result);
          if (result.isLive) {
            fetchWeeklySheetTranslations(result.headerMeta, result.notesMeta).then((tr) => {
              if (!tr?.translation) return;
              const translated = tr.translation;
              setLoadedData((prev) => ({
                ...prev,
                headerMeta: {
                  ...prev.headerMeta,
                  titleDe: translated.titleDe || prev.headerMeta.titleDe,
                  subtitleDe: translated.subtitleDe || prev.headerMeta.subtitleDe,
                  categoryNamesDe:
                    Array.isArray(translated.categoryNamesDe) && translated.categoryNamesDe.length === 8
                      ? translated.categoryNamesDe
                      : prev.headerMeta.categoryNamesDe,
                  compositeScoreNamesDe:
                    Array.isArray(translated.compositeScoreNamesDe) && translated.compositeScoreNamesDe.length === 3
                      ? translated.compositeScoreNamesDe
                      : prev.headerMeta.compositeScoreNamesDe,
                  retiredCategoryNamesDe:
                    Array.isArray(translated.retiredCategoryNamesDe) && translated.retiredCategoryNamesDe.length === 4
                      ? translated.retiredCategoryNamesDe
                      : prev.headerMeta.retiredCategoryNamesDe,
                  translatedAt: tr.translatedAt ?? prev.headerMeta.translatedAt,
                  translationSource: 'gemini_weekly',
                },
                notesMeta: {
                  ...prev.notesMeta,
                  section1TitleDe: translated.section1TitleDe || prev.notesMeta.section1TitleDe,
                  section1ContentDe: translated.section1ContentDe || prev.notesMeta.section1ContentDe,
                  section2TitleDe: translated.section2TitleDe || prev.notesMeta.section2TitleDe,
                  section2ContentDe: translated.section2ContentDe || prev.notesMeta.section2ContentDe,
                  section2ContentEn: translated.section2ContentEn || prev.notesMeta.section2ContentEn,
                },
              }));
            });
          }
        }
        if (labRes.entries && labRes.entries.length > 0) {
          setLabs(labRes.entries);
        }
        setLastSyncedAt(new Date());
        setCountdown(SYNC_INTERVAL_SECONDS);
      } catch (e) {
        console.warn('Sync notice:', e);
      } finally {
        setIsSyncing(false);
      }
    },
    [oauthAccessToken, activeSpreadsheetId]
  );

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setAuthUser(user);
        setOauthAccessToken(token);
      },
      (user) => {
        setAuthUser(user);
        setOauthAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setAuthUser(result.user);
        setOauthAccessToken(result.accessToken);
      }
    } catch (err) {
      console.error('Google sign-in failed:', err);
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const handleGoogleSignOut = useCallback(async () => {
    await googleSignOut();
    setAuthUser(null);
    setOauthAccessToken(null);
    onSignedOut?.();
  }, [onSignedOut]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshData();
          return SYNC_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshData]);

  return {
    loadedData,
    labs,
    isSyncing,
    lastSyncedAt,
    authUser,
    oauthAccessToken,
    isSigningIn,
    activeSpreadsheetId,
    isSheetsConnected,
    refreshData,
    handleGoogleSignIn,
    handleGoogleSignOut,
  };
}
