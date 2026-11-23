import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BenchmarkMonitorApiClient } from '../services/monitorApiClient';
import { isStaticPreviewError } from '../services/pricingMonitorService';
import { ManualRowMapping } from '../types/integrityMonitor';

const MANUAL_MAPPING_STORAGE_PREFIX = 'science_iq_manual_mappings_';

function loadLocalManualMappings(label: string): Record<string, ManualRowMapping> {
  try {
    const raw = localStorage.getItem(`${MANUAL_MAPPING_STORAGE_PREFIX}${label}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, ManualRowMapping> = {};
    for (const [id, m] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        m &&
        typeof m === 'object' &&
        typeof (m as ManualRowMapping).sheetRowNumber === 'number' &&
        (m as ManualRowMapping).sheetRowNumber >= 2
      ) {
        result[id] = m as ManualRowMapping;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function saveLocalManualMappings(label: string, mappings: Record<string, ManualRowMapping>): void {
  try {
    if (Object.keys(mappings).length === 0) {
      localStorage.removeItem(`${MANUAL_MAPPING_STORAGE_PREFIX}${label}`);
    } else {
      localStorage.setItem(`${MANUAL_MAPPING_STORAGE_PREFIX}${label}`, JSON.stringify(mappings));
    }
  } catch {
    // ignore storage quota / privacy mode errors
  }
}

export interface BenchmarkMonitorStatusBase<TReport> {
  report: TReport | null;
  isDue: boolean;
  isRunning: boolean;
  lastError: string | null;
}

interface ReportWithMappings {
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
  isSheetsConnected: boolean;
  hasLoadedModels: boolean;
  isModalOpen: boolean;
  dailyAutoCheckEnabled: boolean;
}

export function useBenchmarkMonitor<
  TStatus extends BenchmarkMonitorStatusBase<TReport>,
  TReport extends ReportWithMappings,
  TSnapshot,
>({
  label,
  api,
  extractSnapshots,
  doesReportMatchLiveSheet,
  isSheetsConnected,
  hasLoadedModels,
  isModalOpen,
  dailyAutoCheckEnabled,
}: UseBenchmarkMonitorOptions<TStatus, TReport, TSnapshot>) {
  const [report, setReport] = useState<TReport | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);
  const [hasAutoCheckedSession, setHasAutoCheckedSession] = useState<boolean>(false);
  const hasSyncedLocalMappingsRef = useRef<boolean>(false);

  const resetAuthState = useCallback(() => {
    setCheckError(null);
    setHasAutoCheckedSession(false);
    hasSyncedLocalMappingsRef.current = false;
  }, []);

  const syncManualMappingsWithReport = useCallback(
    async (incoming: TReport, allowPushFromLocal: boolean): Promise<TReport> => {
      const serverMappings = incoming.manualMappings ?? {};
      const serverKeys = Object.keys(serverMappings);
      const localMappings = loadLocalManualMappings(label);

      if (serverKeys.length > 0) {
        saveLocalManualMappings(label, { ...localMappings, ...serverMappings });
        return incoming;
      }

      if (
        allowPushFromLocal &&
        !hasSyncedLocalMappingsRef.current &&
        Object.keys(localMappings).length > 0 &&
        isSheetsConnected &&
        hasLoadedModels
      ) {
        hasSyncedLocalMappingsRef.current = true;
        try {
          const snapshots = extractSnapshots();
          const updated = await api.updatePreferences({
            manualMappings: localMappings,
            models: snapshots,
          });
          if (updated) {
            if (updated.manualMappings) {
              saveLocalManualMappings(label, updated.manualMappings);
            }
            return updated;
          }
        } catch {
          // keep incoming report if sync fails
        }
      }
      return incoming;
    },
    [api, extractSnapshots, hasLoadedModels, isSheetsConnected, label]
  );

  const handleRunCheck = useCallback(
    async (trigger: 'manual' | 'daily_auto' = 'manual') => {
      setIsChecking(true);
      setCheckError(null);
      try {
        const snapshots = isSheetsConnected ? extractSnapshots() : [];
        const rawReport = await api.triggerCheck(snapshots, trigger);
        const nextReport = await syncManualMappingsWithReport(rawReport, true);
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
    [api, extractSnapshots, isSheetsConnected, label, syncManualMappingsWithReport]
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
        const synced = await syncManualMappingsWithReport(status.report, true);
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
  }, [api, syncManualMappingsWithReport]);

  useEffect(() => {
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

  const handleIgnoreModel = useCallback(
    async (id: string) => {
      try {
        const snapshots = isSheetsConnected ? extractSnapshots() : [];
        const updated = await api.updatePreferences({
          ignoreIds: [id],
          models: snapshots,
        });
        if (updated) setReport(updated);
      } catch (err) {
        if (!isStaticPreviewError(err)) {
          setCheckError(err instanceof Error ? err.message : `Failed to ignore ${label} model.`);
        }
      }
    },
    [api, extractSnapshots, isSheetsConnected, label]
  );

  const handleRestoreModel = useCallback(
    async (id: string) => {
      try {
        const snapshots = isSheetsConnected ? extractSnapshots() : [];
        const updated = await api.updatePreferences({
          unignoreIds: [id],
          models: snapshots,
        });
        if (updated) setReport(updated);
      } catch (err) {
        if (!isStaticPreviewError(err)) {
          setCheckError(err instanceof Error ? err.message : `Failed to restore ${label} model.`);
        }
      }
    },
    [api, extractSnapshots, isSheetsConnected, label]
  );

  const saveManualMappings = useCallback(
    async (manualMappings: Record<string, ManualRowMapping>) => {
      const mergedLocal = { ...loadLocalManualMappings(label), ...manualMappings };
      saveLocalManualMappings(label, mergedLocal);
      try {
        const snapshots = isSheetsConnected ? extractSnapshots() : [];
        const updated = await api.updatePreferences({
          manualMappings,
          models: snapshots,
        });
        if (updated) {
          if (updated.manualMappings) {
            saveLocalManualMappings(label, updated.manualMappings);
          }
          setReport(updated);
        }
      } catch (err) {
        if (!isStaticPreviewError(err)) {
          setCheckError(
            err instanceof Error ? err.message : `Failed to save ${label} row mapping.`
          );
        }
      }
    },
    [api, extractSnapshots, isSheetsConnected, label]
  );

  const handleRemoveManualMapping = useCallback(
    async (id: string) => {
      const currentLocal = loadLocalManualMappings(label);
      if (currentLocal[id]) {
        delete currentLocal[id];
        saveLocalManualMappings(label, currentLocal);
      }
      try {
        const snapshots = isSheetsConnected ? extractSnapshots() : [];
        const updated = await api.updatePreferences({
          unmapIds: [id],
          models: snapshots,
        });
        if (updated) {
          if (updated.manualMappings) {
            saveLocalManualMappings(label, updated.manualMappings);
          }
          setReport(updated);
        }
      } catch (err) {
        if (!isStaticPreviewError(err)) {
          setCheckError(
            err instanceof Error ? err.message : `Failed to remove ${label} row mapping.`
          );
        }
      }
    },
    [api, extractSnapshots, isSheetsConnected, label]
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
