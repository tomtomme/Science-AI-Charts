import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { BenchmarkMonitorApiClient } from '../services/monitorApiClient';
import { isStaticPreviewError } from '../services/pricingMonitorService';
import { ManualRowMapping } from '../types/integrityMonitor';
import {
  MonitorPreferencesState,
  loadLocalMonitorPreferences,
  prefsSignature,
  sanitizeMonitorPreferences,
  saveLocalMonitorPreferences,
  saveMonitorPreferencesToFirestore,
  seedMonitorPreferencesIfMissing,
  subscribeMonitorPreferences,
  toMonitorKey,
} from '../services/monitorPreferencesStore';

export interface BenchmarkMonitorStatusBase<TReport> {
  report: TReport | null;
  isDue: boolean;
  isRunning: boolean;
  lastError: string | null;
}

interface ReportWithPreferences {
  ignoredIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
}

interface UseBenchmarkMonitorOptions<
  TStatus extends BenchmarkMonitorStatusBase<TReport>,
  TReport,
  TSnapshot,
> {
  label: string;
  api: BenchmarkMonitorApiClient<TStatus, TReport, TSnapshot>;
  extractSnapshots: () => TSnapshot[];
  doesReportMatchLiveSheet: (report: TReport) => boolean;
  authUser: User | null;
  isSheetsConnected: boolean;
  hasLoadedModels: boolean;
  isModalOpen: boolean;
  dailyAutoCheckEnabled: boolean;
}

export function useBenchmarkMonitor<
  TStatus extends BenchmarkMonitorStatusBase<TReport>,
  TReport extends ReportWithPreferences,
  TSnapshot,
>({
  label,
  api,
  extractSnapshots,
  doesReportMatchLiveSheet,
  authUser,
  isSheetsConnected,
  hasLoadedModels,
  isModalOpen,
  dailyAutoCheckEnabled,
}: UseBenchmarkMonitorOptions<TStatus, TReport, TSnapshot>) {
  const monitorKey = useMemo(() => toMonitorKey(label), [label]);
  const authUid = authUser?.uid ?? null;

  const [report, setReport] = useState<TReport | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);
  const [hasAutoCheckedSession, setHasAutoCheckedSession] = useState<boolean>(false);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);

  const prefsReady = authUid === null || loadedUid === authUid;
  const prefsRef = useRef<MonitorPreferencesState>(
    loadLocalMonitorPreferences(monitorKey, label, authUid)
  );
  const lastPushedSigRef = useRef<string | null>(null);
  const mutationSeqRef = useRef<number>(0);

  const extractSnapshotsRef = useRef(extractSnapshots);
  extractSnapshotsRef.current = extractSnapshots;
  const isSheetsConnectedRef = useRef(isSheetsConnected);
  isSheetsConnectedRef.current = isSheetsConnected;
  const hasLoadedModelsRef = useRef(hasLoadedModels);
  hasLoadedModelsRef.current = hasLoadedModels;

  const resetAuthState = useCallback(() => {
    setCheckError(null);
    setHasAutoCheckedSession(false);
    setLoadedUid(null);
    lastPushedSigRef.current = null;
  }, []);

  const syncReportWithAuthoritativePrefs = useCallback(
    async (incoming: TReport, targetPrefs: MonitorPreferencesState): Promise<TReport> => {
      const incomingPrefs = sanitizeMonitorPreferences({
        ignoredIds: incoming.ignoredIds,
        manualMappings: incoming.manualMappings,
      });
      const targetClean = sanitizeMonitorPreferences(targetPrefs);
      const targetSig = prefsSignature(targetClean);
      const incomingSig = prefsSignature(incomingPrefs);

      if (incomingSig === targetSig) {
        lastPushedSigRef.current = targetSig;
        return incoming;
      }

      if (
        !authUid &&
        targetClean.ignoredIds.length === 0 &&
        Object.keys(targetClean.manualMappings).length === 0 &&
        (incomingPrefs.ignoredIds.length > 0 ||
          Object.keys(incomingPrefs.manualMappings).length > 0)
      ) {
        prefsRef.current = incomingPrefs;
        saveLocalMonitorPreferences(monitorKey, label, incomingPrefs, null);
        lastPushedSigRef.current = incomingSig;
        return incoming;
      }

      try {
        const snapshots =
          isSheetsConnectedRef.current && hasLoadedModelsRef.current
            ? extractSnapshotsRef.current()
            : [];
        lastPushedSigRef.current = targetSig;
        const updated = await api.updatePreferences({
          replaceAll: true,
          ignoredIds: targetClean.ignoredIds,
          manualMappings: targetClean.manualMappings,
          models: snapshots,
        });
        if (updated) {
          if (snapshots.length > 0 && updated.manualMappings) {
            const healed = sanitizeMonitorPreferences({
              ignoredIds: targetClean.ignoredIds,
              manualMappings: updated.manualMappings,
            });
            if (prefsSignature(healed) !== targetSig) {
              prefsRef.current = healed;
              saveLocalMonitorPreferences(monitorKey, label, healed, authUid);
              lastPushedSigRef.current = prefsSignature(healed);
              if (authUid) {
                void saveMonitorPreferencesToFirestore(authUid, monitorKey, healed).catch((err) => {
                  console.warn(`Could not persist healed ${label} mappings:`, err);
                });
              }
            }
          }
          return updated;
        }
      } catch {
        // Keep incoming report if server sync fails transiently
      }
      return incoming;
    },
    [api, authUid, label, monitorKey]
  );

  // Subscribe to Firestore when signed in; load localStorage when anonymous
  useEffect(() => {
    lastPushedSigRef.current = null;

    if (!authUid) {
      prefsRef.current = loadLocalMonitorPreferences(monitorKey, label, null);
      return;
    }

    let cancelled = false;
    prefsRef.current = loadLocalMonitorPreferences(monitorKey, label, authUid);

    const unsubscribe = subscribeMonitorPreferences(authUid, monitorKey, {
      onSnapshotData: ({ exists, prefs }) => {
        if (cancelled) return;

        if (exists) {
          prefsRef.current = prefs;
          saveLocalMonitorPreferences(monitorKey, label, prefs, authUid);
          setLoadedUid(authUid);

          const nextSig = prefsSignature(prefs);
          if (lastPushedSigRef.current !== nextSig) {
            const seqAtPush = mutationSeqRef.current;
            const snapshots =
              isSheetsConnectedRef.current && hasLoadedModelsRef.current
                ? extractSnapshotsRef.current()
                : [];
            lastPushedSigRef.current = nextSig;
            void api
              .updatePreferences({
                replaceAll: true,
                ignoredIds: prefs.ignoredIds,
                manualMappings: prefs.manualMappings,
                models: snapshots,
              })
              .then((updated) => {
                if (!cancelled && updated && mutationSeqRef.current === seqAtPush) {
                  setReport(updated);
                }
              })
              .catch(() => {
                // ignore offline/static preview errors here
              });
          }
          return;
        }

        // Firestore document does not exist yet: seed from localStorage / active server cache if non-empty
        void (async () => {
          const localPrefs = loadLocalMonitorPreferences(monitorKey, label, authUid);
          const status = await api.fetchStatus().catch(() => null);
          if (cancelled) return;

          const serverReport = status?.report ?? null;
          const serverPrefs = serverReport
            ? sanitizeMonitorPreferences({
                ignoredIds: serverReport.ignoredIds,
                manualMappings: serverReport.manualMappings,
              })
            : { ignoredIds: [], manualMappings: {} };

          const mergedSeed = sanitizeMonitorPreferences({
            ignoredIds: [...localPrefs.ignoredIds, ...serverPrefs.ignoredIds],
            manualMappings: { ...serverPrefs.manualMappings, ...localPrefs.manualMappings },
          });

          prefsRef.current = mergedSeed;
          saveLocalMonitorPreferences(monitorKey, label, mergedSeed, authUid);

          if (
            mergedSeed.ignoredIds.length > 0 ||
            Object.keys(mergedSeed.manualMappings).length > 0
          ) {
            try {
              await seedMonitorPreferencesIfMissing(authUid, monitorKey, mergedSeed);
            } catch (err) {
              console.warn(`Could not seed ${label} preferences to Firestore:`, err);
            }
          }

          if (!cancelled) {
            setLoadedUid(authUid);
          }
        })();
      },
      onError: (err) => {
        if (cancelled) return;
        console.warn(`Firestore listener notice for ${label}:`, err.message);
        prefsRef.current = loadLocalMonitorPreferences(monitorKey, label, authUid);
        setLoadedUid(authUid);
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [api, authUid, label, monitorKey]);

  const handleRunCheck = useCallback(
    async (trigger: 'manual' | 'daily_auto' = 'manual') => {
      setIsChecking(true);
      setCheckError(null);
      try {
        const snapshots = isSheetsConnected ? extractSnapshots() : [];
        const activePrefs = sanitizeMonitorPreferences(prefsRef.current);
        lastPushedSigRef.current = prefsSignature(activePrefs);

        const nextReport = await api.triggerCheck(snapshots, trigger, {
          replaceAll: true,
          ignoredIds: activePrefs.ignoredIds,
          manualMappings: activePrefs.manualMappings,
        });

        if (snapshots.length > 0 && nextReport.manualMappings) {
          const healed = sanitizeMonitorPreferences({
            ignoredIds: activePrefs.ignoredIds,
            manualMappings: nextReport.manualMappings,
          });
          if (prefsSignature(healed) !== prefsSignature(activePrefs)) {
            prefsRef.current = healed;
            saveLocalMonitorPreferences(monitorKey, label, healed, authUid);
            lastPushedSigRef.current = prefsSignature(healed);
            if (authUid) {
              void saveMonitorPreferencesToFirestore(authUid, monitorKey, healed).catch((err) => {
                console.warn(`Could not persist healed ${label} mappings:`, err);
              });
            }
          }
        }

        setApiAvailable(true);
        setReport(nextReport);
      } catch (err) {
        if (isStaticPreviewError(err)) {
          setApiAvailable(false);
          setCheckError(null);
        } else {
          const msg = err instanceof Error ? err.message : `${label} check failed.`;
          setCheckError(msg);
        }
      } finally {
        setIsChecking(false);
      }
    },
    [api, authUid, extractSnapshots, isSheetsConnected, label, monitorKey]
  );

  const isDiffValidForSheet = useMemo(() => {
    if (!isSheetsConnected || !report) return false;
    return doesReportMatchLiveSheet(report);
  }, [isSheetsConnected, report, doesReportMatchLiveSheet]);

  const checkStatus = useCallback(async () => {
    try {
      const status = await api.fetchStatus();
      setApiAvailable(true);
      if (status.report) {
        const synced = await syncReportWithAuthoritativePrefs(
          status.report,
          prefsRef.current
        );
        setReport(synced);
        status.report = synced;
      }
      if (status.lastError) {
        setCheckError(status.lastError);
      }
      return status;
    } catch (err) {
      if (isStaticPreviewError(err)) {
        setApiAvailable(false);
      }
      return null;
    }
  }, [api, syncReportWithAuthoritativePrefs]);

  useEffect(() => {
    if (!prefsReady) return;

    let cancelled = false;
    (async () => {
      const status = await checkStatus();
      if (cancelled || !status) return;

      if (
        isModalOpen &&
        (!status.report ||
          (isSheetsConnected && hasLoadedModels && !doesReportMatchLiveSheet(status.report))) &&
        !isChecking &&
        !checkError
      ) {
        setHasAutoCheckedSession(true);
        await handleRunCheck('manual');
        return;
      }

      if (isSheetsConnected && hasLoadedModels) {
        const cachedMatchesLive =
          Boolean(status.report) && doesReportMatchLiveSheet(status.report as TReport);
        const needsRun = !cachedMatchesLive || status.isDue;

        if (!hasAutoCheckedSession && dailyAutoCheckEnabled && needsRun && !status.isRunning) {
          setHasAutoCheckedSession(true);
          await handleRunCheck('daily_auto');
        }
      } else if (!hasAutoCheckedSession && dailyAutoCheckEnabled && status.isDue && !status.isRunning) {
        setHasAutoCheckedSession(true);
        await handleRunCheck('daily_auto');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    prefsReady,
    isSheetsConnected,
    hasAutoCheckedSession,
    hasLoadedModels,
    dailyAutoCheckEnabled,
    isModalOpen,
    isChecking,
    checkError,
    handleRunCheck,
    checkStatus,
    doesReportMatchLiveSheet,
  ]);

  const applyPreferenceMutation = useCallback(
    async (nextPrefsRaw: MonitorPreferencesState, fallbackErrorMessage: string) => {
      const seq = ++mutationSeqRef.current;
      const nextPrefs = sanitizeMonitorPreferences(nextPrefsRaw);
      prefsRef.current = nextPrefs;
      saveLocalMonitorPreferences(monitorKey, label, nextPrefs, authUid);
      lastPushedSigRef.current = prefsSignature(nextPrefs);

      const snapshots = isSheetsConnected ? extractSnapshots() : [];
      const firestorePromise = authUid
        ? saveMonitorPreferencesToFirestore(authUid, monitorKey, nextPrefs)
        : Promise.resolve();
      const serverPromise = api.updatePreferences({
        replaceAll: true,
        ignoredIds: nextPrefs.ignoredIds,
        manualMappings: nextPrefs.manualMappings,
        models: snapshots,
      });

      const [fsResult, serverResult] = await Promise.allSettled([
        firestorePromise,
        serverPromise,
      ]);

      if (serverResult.status === 'fulfilled') {
        if (serverResult.value && mutationSeqRef.current === seq) {
          setReport(serverResult.value);
        }
      } else if (!isStaticPreviewError(serverResult.reason)) {
        const err = serverResult.reason;
        setCheckError(err instanceof Error ? err.message : fallbackErrorMessage);
      }

      if (fsResult.status === 'rejected') {
        console.warn(`Could not persist ${label} preferences to Firestore:`, fsResult.reason);
      }
    },
    [api, authUid, extractSnapshots, isSheetsConnected, label, monitorKey]
  );

  const handleIgnoreModel = useCallback(
    async (id: string) => {
      const cleanId = id.trim();
      if (!cleanId) return;
      const current = prefsRef.current;
      const nextMappings = { ...current.manualMappings };
      delete nextMappings[cleanId];
      const nextIgnored = current.ignoredIds.includes(cleanId)
        ? current.ignoredIds
        : [...current.ignoredIds, cleanId];
      await applyPreferenceMutation(
        { ignoredIds: nextIgnored, manualMappings: nextMappings },
        `Failed to ignore ${label} model.`
      );
    },
    [applyPreferenceMutation, label]
  );

  const handleRestoreModel = useCallback(
    async (id: string) => {
      const cleanId = id.trim();
      if (!cleanId) return;
      const current = prefsRef.current;
      const nextIgnored = current.ignoredIds.filter((item) => item !== cleanId);
      await applyPreferenceMutation(
        { ignoredIds: nextIgnored, manualMappings: current.manualMappings },
        `Failed to restore ${label} model.`
      );
    },
    [applyPreferenceMutation, label]
  );

  const saveManualMappings = useCallback(
    async (manualMappings: Record<string, ManualRowMapping>) => {
      const current = prefsRef.current;
      const nextMappings = { ...current.manualMappings, ...manualMappings };
      const mappedIds = new Set(Object.keys(manualMappings));
      const nextIgnored = current.ignoredIds.filter((id) => !mappedIds.has(id));
      await applyPreferenceMutation(
        { ignoredIds: nextIgnored, manualMappings: nextMappings },
        `Failed to save ${label} row mapping.`
      );
    },
    [applyPreferenceMutation, label]
  );

  const handleRemoveManualMapping = useCallback(
    async (id: string) => {
      const cleanId = id.trim();
      if (!cleanId) return;
      const current = prefsRef.current;
      const nextMappings = { ...current.manualMappings };
      delete nextMappings[cleanId];
      await applyPreferenceMutation(
        { ignoredIds: current.ignoredIds, manualMappings: nextMappings },
        `Failed to remove ${label} row mapping.`
      );
    },
    [applyPreferenceMutation, label]
  );

  return {
    report,
    isChecking,
    checkError,
    apiAvailable,
    isDiffValidForSheet,
    checkStatus,
    handleRunCheck,
    handleIgnoreModel,
    handleRestoreModel,
    saveManualMappings,
    handleRemoveManualMapping,
    resetAuthState,
  };
}
