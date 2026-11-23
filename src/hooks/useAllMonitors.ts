import { useState, useEffect, useMemo, useCallback } from 'react';
import { ModelRecord } from '../types';
import { LoadedDatasets } from '../services/dataService';
import { PricingCheckReport } from '../types/pricingMonitor';
import {
  extractMonitoredModelSnapshots,
  fetchPricingMonitorStatus,
  isStaticPreviewError,
  triggerPricingCheck,
} from '../services/pricingMonitorService';
import { GdpxCheckReport } from '../types/gdpxMonitor';
import {
  extractGdpxSheetSnapshots,
  GDPX_COL_INDEX,
  gdpxMonitorApi,
} from '../services/gdpxMonitorService';
import { IntegrityCheckReport, ManualRowMapping } from '../types/integrityMonitor';
import {
  extractIntegritySheetSnapshots,
  INTEGRITY_COL_INDEX,
  integrityMonitorApi,
} from '../services/integrityMonitorService';
import { ValsCheckReport } from '../types/valsMonitor';
import {
  extractValsSheetSnapshots,
  VALS_COL_INDEX,
  valsMonitorApi,
} from '../services/valsMonitorService';
import { SimpleBenchCheckReport } from '../types/simpleBenchMonitor';
import {
  DEFAULT_SIMPLEBENCH_COL_INDEX,
  extractSimpleBenchSheetSnapshots,
  simpleBenchMonitorApi,
} from '../services/simpleBenchMonitorService';
import { useBenchmarkMonitor } from './useBenchmarkMonitor';

interface UseAllMonitorsParams {
  loadedData: LoadedDatasets;
  oauthAccessToken: string | null;
  isSheetsConnected: boolean;
  isModalOpen: boolean;
}

export function useAllMonitors({
  loadedData,
  oauthAccessToken,
  isSheetsConnected,
  isModalOpen,
}: UseAllMonitorsParams) {
  // Pricing monitor state
  const [pricingReport, setPricingReport] = useState<PricingCheckReport | null>(null);
  const [isCheckingPricing, setIsCheckingPricing] = useState<boolean>(false);
  const [pricingCheckError, setPricingCheckError] = useState<string | null>(null);
  const [pricingApiAvailable, setPricingApiAvailable] = useState<boolean>(true);
  const [dailyAutoCheckEnabled, setDailyAutoCheckEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('science_iq_daily_pricing_auto');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [hasAutoCheckedSession, setHasAutoCheckedSession] = useState<boolean>(false);

  const handleToggleDailyAutoCheck = useCallback((enabled: boolean) => {
    setDailyAutoCheckEnabled(enabled);
    try {
      localStorage.setItem('science_iq_daily_pricing_auto', String(enabled));
    } catch {}
  }, []);

  const minHistoryRow = loadedData.historyStartRow ?? 36;

  // --- Pricing Monitor ---
  const doesReportMatchLiveSheet = useCallback(
    (report: PricingCheckReport, allModels: ModelRecord[]): boolean => {
      const liveSnapshots = extractMonitoredModelSnapshots(allModels, minHistoryRow);
      if (liveSnapshots.length === 0 || report.diffs.length !== liveSnapshots.length) {
        return false;
      }
      const liveById = new Map(liveSnapshots.map((m) => [m.id, m]));
      for (const diff of report.diffs) {
        const live = liveById.get(diff.modelId);
        if (!live) return false;
        if ((live.priceDeMonthly || '').trim() !== (diff.currentDe || '').trim()) return false;
        if ((live.priceUsMonthly || '').trim() !== (diff.currentUs || '').trim()) return false;
      }
      return true;
    },
    [minHistoryRow]
  );

  const handleRunPricingCheck = useCallback(
    async (trigger: 'manual' | 'daily_auto' = 'manual') => {
      if (!oauthAccessToken || loadedData.dataSource !== 'sheets_api') {
        return;
      }
      setIsCheckingPricing(true);
      setPricingCheckError(null);
      try {
        const snapshots = extractMonitoredModelSnapshots(loadedData.allModels, minHistoryRow);
        const report = await triggerPricingCheck(snapshots, trigger);
        setPricingApiAvailable(true);
        setPricingReport(report);
      } catch (err) {
        if (isStaticPreviewError(err)) {
          setPricingApiAvailable(false);
          setPricingCheckError(null);
        } else {
          const msg = err instanceof Error ? err.message : 'Pricing check failed.';
          setPricingCheckError(msg);
        }
      } finally {
        setIsCheckingPricing(false);
      }
    },
    [oauthAccessToken, loadedData.dataSource, loadedData.allModels, minHistoryRow]
  );

  const isPricingDiffValidForSheet = useMemo(() => {
    if (!isSheetsConnected || !pricingReport) return false;
    return doesReportMatchLiveSheet(pricingReport, loadedData.allModels);
  }, [isSheetsConnected, pricingReport, loadedData.allModels, doesReportMatchLiveSheet]);

  const checkPricingMonitorStatus = useCallback(async () => {
    try {
      const status = await fetchPricingMonitorStatus();
      setPricingApiAvailable(true);
      if (status.report) {
        setPricingReport(status.report);
      }
      if (isSheetsConnected && status.lastError) {
        setPricingCheckError(status.lastError);
      }
      return status;
    } catch (err) {
      if (isStaticPreviewError(err)) {
        setPricingApiAvailable(false);
      }
      return null;
    }
  }, [isSheetsConnected]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const status = await checkPricingMonitorStatus();
      if (cancelled || !status || !isSheetsConnected || loadedData.allModels.length === 0) {
        return;
      }

      const cachedMatchesLive =
        Boolean(status.report) &&
        doesReportMatchLiveSheet(status.report as PricingCheckReport, loadedData.allModels);
      const needsRun = !cachedMatchesLive || status.isDue;
      const inCooldown =
        Boolean(status.cooldownUntil) &&
        new Date(status.cooldownUntil as string).getTime() > Date.now();

      if (isModalOpen && !cachedMatchesLive && !isCheckingPricing && !hasAutoCheckedSession && !inCooldown) {
        setHasAutoCheckedSession(true);
        await handleRunPricingCheck('manual');
        return;
      }

      if (
        !hasAutoCheckedSession &&
        dailyAutoCheckEnabled &&
        needsRun &&
        status.hasGeminiKey &&
        !status.isRunning &&
        !status.lastError &&
        !inCooldown
      ) {
        setHasAutoCheckedSession(true);
        await handleRunPricingCheck('daily_auto');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isSheetsConnected,
    hasAutoCheckedSession,
    loadedData.allModels,
    dailyAutoCheckEnabled,
    isModalOpen,
    isCheckingPricing,
    pricingCheckError,
    handleRunPricingCheck,
    checkPricingMonitorStatus,
    doesReportMatchLiveSheet,
  ]);

  const hasLoadedModels = loadedData.allModels.length > 0;
  const gdpxColIdx = loadedData.columnLayout?.colTrickQuestions ?? GDPX_COL_INDEX;
  const valsColIdx = loadedData.columnLayout?.colEconLegal ?? VALS_COL_INDEX;
  const simpleBenchColIdx = loadedData.columnLayout?.colTrickOld ?? DEFAULT_SIMPLEBENCH_COL_INDEX;
  const integrityColIdx = loadedData.columnLayout?.colIntegrity ?? INTEGRITY_COL_INDEX;

  // --- GDPx Monitor ---
  const extractGdpx = useCallback(
    () =>
      extractGdpxSheetSnapshots(
        loadedData.allModels,
        loadedData.boldMask,
        gdpxColIdx,
        minHistoryRow
      ),
    [loadedData.allModels, loadedData.boldMask, gdpxColIdx, minHistoryRow]
  );
  const doesGdpxMatch = useCallback(
    (report: GdpxCheckReport) => {
      const liveSnapshots = extractGdpx();
      if (
        liveSnapshots.length === 0 ||
        report.diffs.length === 0 ||
        typeof report.overwriteEstimateCount !== 'number'
      ) {
        return false;
      }
      const liveById = new Map(liveSnapshots.map((m) => [m.id, m]));
      for (const diff of report.diffs) {
        if (!diff.matchedModelId) continue;
        const live = liveById.get(diff.matchedModelId);
        if (
          !live ||
          live.colJ !== diff.currentColJ ||
          live.colJIsBold !== diff.currentColJIsBold ||
          (diff.sheetRowNumber !== null && live.sheetRowNumber !== diff.sheetRowNumber) ||
          (diff.matchedDisplayName && live.displayName !== diff.matchedDisplayName)
        ) {
          return false;
        }
      }
      return true;
    },
    [extractGdpx]
  );

  const gdpx = useBenchmarkMonitor({
    label: 'GDPx',
    api: gdpxMonitorApi,
    extractSnapshots: extractGdpx,
    doesReportMatchLiveSheet: doesGdpxMatch,
    isSheetsConnected,
    hasLoadedModels,
    isModalOpen,
    dailyAutoCheckEnabled,
  });

  // --- Integrity-Bench Monitor ---
  const extractIntegrity = useCallback(
    () =>
      extractIntegritySheetSnapshots(
        loadedData.allModels,
        loadedData.rawRows,
        loadedData.boldMask,
        integrityColIdx,
        minHistoryRow
      ),
    [loadedData.allModels, loadedData.rawRows, loadedData.boldMask, integrityColIdx, minHistoryRow]
  );
  const doesIntegrityMatch = useCallback(
    (report: IntegrityCheckReport) => {
      const liveSnapshots = extractIntegrity();
      if (
        liveSnapshots.length === 0 ||
        report.diffs.length === 0 ||
        typeof report.overwriteEstimateCount !== 'number'
      ) {
        return false;
      }
      const liveById = new Map(liveSnapshots.map((m) => [m.id, m]));
      for (const diff of report.diffs) {
        if (!diff.matchedModelId) continue;
        const live = liveById.get(diff.matchedModelId);
        if (
          !live ||
          live.colAN !== diff.currentColAN ||
          live.colANIsBold !== diff.currentColANIsBold ||
          (diff.sheetRowNumber !== null && live.sheetRowNumber !== diff.sheetRowNumber) ||
          (diff.matchedDisplayName && live.displayName !== diff.matchedDisplayName)
        ) {
          return false;
        }
      }
      return true;
    },
    [extractIntegrity]
  );

  const integrity = useBenchmarkMonitor({
    label: 'Integrity-Bench',
    api: integrityMonitorApi,
    extractSnapshots: extractIntegrity,
    doesReportMatchLiveSheet: doesIntegrityMatch,
    isSheetsConnected,
    hasLoadedModels,
    isModalOpen,
    dailyAutoCheckEnabled,
  });

  // --- Vals Index v2.2 Monitor ---
  const extractVals = useCallback(
    () =>
      extractValsSheetSnapshots(
        loadedData.allModels,
        loadedData.boldMask,
        valsColIdx,
        minHistoryRow
      ),
    [loadedData.allModels, loadedData.boldMask, valsColIdx, minHistoryRow]
  );
  const doesValsMatch = useCallback(
    (report: ValsCheckReport) => {
      const liveSnapshots = extractVals();
      if (liveSnapshots.length === 0 || report.diffs.length === 0) return false;
      const liveById = new Map(liveSnapshots.map((m) => [m.id, m]));
      for (const diff of report.diffs) {
        if (!diff.matchedModelId) continue;
        const live = liveById.get(diff.matchedModelId);
        if (
          !live ||
          live.colK !== diff.currentColK ||
          live.colKIsBold !== diff.currentColKIsBold ||
          (diff.sheetRowNumber !== null && live.sheetRowNumber !== diff.sheetRowNumber) ||
          (diff.matchedDisplayName && live.displayName !== diff.matchedDisplayName)
        ) {
          return false;
        }
      }
      return true;
    },
    [extractVals]
  );

  const vals = useBenchmarkMonitor({
    label: 'Vals Index',
    api: valsMonitorApi,
    extractSnapshots: extractVals,
    doesReportMatchLiveSheet: doesValsMatch,
    isSheetsConnected,
    hasLoadedModels,
    isModalOpen,
    dailyAutoCheckEnabled,
  });

  // --- SimpleBench Monitor ---
  const extractSimpleBench = useCallback(
    () =>
      extractSimpleBenchSheetSnapshots(
        loadedData.allModels,
        loadedData.boldMask,
        simpleBenchColIdx,
        minHistoryRow
      ),
    [loadedData.allModels, loadedData.boldMask, simpleBenchColIdx, minHistoryRow]
  );
  const doesSimpleBenchMatch = useCallback(
    (report: SimpleBenchCheckReport) => {
      const liveSnapshots = extractSimpleBench();
      if (liveSnapshots.length === 0 || report.diffs.length === 0) return false;
      const liveById = new Map(liveSnapshots.map((m) => [m.id, m]));
      for (const diff of report.diffs) {
        if (!diff.matchedModelId) continue;
        const live = liveById.get(diff.matchedModelId);
        if (
          !live ||
          live.colY !== diff.currentColY ||
          live.colYIsBold !== diff.currentColYIsBold ||
          (diff.sheetRowNumber !== null && live.sheetRowNumber !== diff.sheetRowNumber) ||
          (diff.matchedDisplayName && live.displayName !== diff.matchedDisplayName)
        ) {
          return false;
        }
      }
      return true;
    },
    [extractSimpleBench]
  );

  const simpleBench = useBenchmarkMonitor({
    label: 'SimpleBench',
    api: simpleBenchMonitorApi,
    extractSnapshots: extractSimpleBench,
    doesReportMatchLiveSheet: doesSimpleBenchMatch,
    isSheetsConnected,
    hasLoadedModels,
    isModalOpen,
    dailyAutoCheckEnabled,
  });

  const resetMonitorAuthState = useCallback(() => {
    setPricingReport(null);
    setPricingCheckError(null);
    setHasAutoCheckedSession(false);
    gdpx.resetAuthState();
    integrity.resetAuthState();
    vals.resetAuthState();
    simpleBench.resetAuthState();
  }, [gdpx, integrity, vals, simpleBench]);

  const handleSaveManualMappings = useCallback(
    async (mappings: {
      gdpx?: Record<string, ManualRowMapping>;
      integrity?: Record<string, ManualRowMapping>;
      vals?: Record<string, ManualRowMapping>;
      simpleBench?: Record<string, ManualRowMapping>;
    }) => {
      const tasks: Promise<unknown>[] = [];
      if (mappings.gdpx && Object.keys(mappings.gdpx).length > 0) {
        tasks.push(gdpx.saveManualMappings(mappings.gdpx));
      }
      if (mappings.integrity && Object.keys(mappings.integrity).length > 0) {
        tasks.push(integrity.saveManualMappings(mappings.integrity));
      }
      if (mappings.vals && Object.keys(mappings.vals).length > 0) {
        tasks.push(vals.saveManualMappings(mappings.vals));
      }
      if (mappings.simpleBench && Object.keys(mappings.simpleBench).length > 0) {
        tasks.push(simpleBench.saveManualMappings(mappings.simpleBench));
      }
      await Promise.allSettled(tasks);
    },
    [gdpx, integrity, vals, simpleBench]
  );

  const retryAllConnections = useCallback(async () => {
    await Promise.all([
      checkPricingMonitorStatus(),
      gdpx.checkStatus(),
      vals.checkStatus(),
      simpleBench.checkStatus(),
      integrity.checkStatus(),
    ]);
  }, [checkPricingMonitorStatus, gdpx, vals, simpleBench, integrity]);

  const priceAlertCount =
    isPricingDiffValidForSheet && pricingReport ? pricingReport.changedCount : 0;
  const gdpxAlertCount =
    gdpx.isDiffValidForSheet && gdpx.report ? gdpx.report.actionableCount : 0;
  const valsAlertCount =
    vals.isDiffValidForSheet && vals.report ? vals.report.actionableCount : 0;
  const simpleBenchAlertCount =
    simpleBench.isDiffValidForSheet && simpleBench.report ? simpleBench.report.actionableCount : 0;
  const integrityAlertCount =
    integrity.isDiffValidForSheet && integrity.report ? integrity.report.actionableCount : 0;

  const totalAlerts =
    priceAlertCount +
    gdpxAlertCount +
    valsAlertCount +
    simpleBenchAlertCount +
    integrityAlertCount;

  const isAnyMonitorChecking =
    isCheckingPricing ||
    gdpx.isChecking ||
    vals.isChecking ||
    simpleBench.isChecking ||
    integrity.isChecking;

  const allSyncedOk = Boolean(
    isPricingDiffValidForSheet &&
      pricingReport &&
      gdpx.isDiffValidForSheet &&
      gdpx.report &&
      vals.isDiffValidForSheet &&
      vals.report &&
      simpleBench.isDiffValidForSheet &&
      simpleBench.report &&
      integrity.isDiffValidForSheet &&
      integrity.report &&
      totalAlerts === 0
  );

  const apiAvailable =
    pricingApiAvailable ||
    gdpx.apiAvailable ||
    vals.apiAvailable ||
    simpleBench.apiAvailable ||
    integrity.apiAvailable;

  const handlePersistGdpxMapping = useCallback(
    (id: string, mapping: ManualRowMapping) => gdpx.saveManualMappings({ [id]: mapping }),
    [gdpx]
  );
  const handlePersistValsMapping = useCallback(
    (id: string, mapping: ManualRowMapping) => vals.saveManualMappings({ [id]: mapping }),
    [vals]
  );
  const handlePersistSimpleBenchMapping = useCallback(
    (id: string, mapping: ManualRowMapping) => simpleBench.saveManualMappings({ [id]: mapping }),
    [simpleBench]
  );
  const handlePersistIntegrityMapping = useCallback(
    (id: string, mapping: ManualRowMapping) => integrity.saveManualMappings({ [id]: mapping }),
    [integrity]
  );

  return {
    dailyAutoCheckEnabled,
    handleToggleDailyAutoCheck,
    resetMonitorAuthState,
    pricingReport,
    isPricingDiffValidForSheet,
    isCheckingPricing,
    pricingCheckError,
    handleRunPricingCheck,
    gdpxReport: gdpx.report,
    isGdpxDiffValidForSheet: gdpx.isDiffValidForSheet,
    isCheckingGdpx: gdpx.isChecking,
    gdpxCheckError: gdpx.checkError,
    handleRunGdpxCheck: gdpx.handleRunCheck,
    handleIgnoreGdpxModel: gdpx.handleIgnoreModel,
    handleRestoreGdpxModel: gdpx.handleRestoreModel,
    handlePersistGdpxMapping,
    handleRemoveGdpxMapping: gdpx.handleRemoveManualMapping,
    valsReport: vals.report,
    isValsDiffValidForSheet: vals.isDiffValidForSheet,
    isCheckingVals: vals.isChecking,
    valsCheckError: vals.checkError,
    handleRunValsCheck: vals.handleRunCheck,
    handleIgnoreValsModel: vals.handleIgnoreModel,
    handleRestoreValsModel: vals.handleRestoreModel,
    handlePersistValsMapping,
    handleRemoveValsMapping: vals.handleRemoveManualMapping,
    simpleBenchReport: simpleBench.report,
    isSimpleBenchDiffValidForSheet: simpleBench.isDiffValidForSheet,
    isCheckingSimpleBench: simpleBench.isChecking,
    simpleBenchCheckError: simpleBench.checkError,
    handleRunSimpleBenchCheck: simpleBench.handleRunCheck,
    handleIgnoreSimpleBenchModel: simpleBench.handleIgnoreModel,
    handleRestoreSimpleBenchModel: simpleBench.handleRestoreModel,
    handlePersistSimpleBenchMapping,
    handleRemoveSimpleBenchMapping: simpleBench.handleRemoveManualMapping,
    integrityReport: integrity.report,
    isIntegrityDiffValidForSheet: integrity.isDiffValidForSheet,
    isCheckingIntegrity: integrity.isChecking,
    integrityCheckError: integrity.checkError,
    handleRunIntegrityCheck: integrity.handleRunCheck,
    handleIgnoreIntegrityModel: integrity.handleIgnoreModel,
    handleRestoreIntegrityModel: integrity.handleRestoreModel,
    handlePersistIntegrityMapping,
    handleRemoveIntegrityMapping: integrity.handleRemoveManualMapping,
    handleSaveManualMappings,
    totalAlerts,
    isAnyMonitorChecking,
    allSyncedOk,
    apiAvailable,
    retryAllConnections,
  };
}
