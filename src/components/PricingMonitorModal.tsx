import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Save,
  LogOut,
  Trophy,
  Scale,
  Briefcase,
  HelpCircle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { LoadedDatasets } from '../services/dataService';
import {
  applyCellsBoldFormatting,
  batchUpdateSheetCells,
  CellBoldSpec,
  CellUpdateSpec,
  columnIndexToA1,
  fetchMultiRowFormulas,
  FormulaCopySpec,
  insertRowAndWriteSparseCells,
  MAIN_SHEET_GID,
  quoteSheetTitle,
} from '../services/googleSheetsService';
import { getCompanyMeta } from '../data/companies';
import { PricingCheckReport } from '../types/pricingMonitor';
import { GdpxCheckReport, GdpxDiffItem } from '../types/gdpxMonitor';
import { GDPX_COL_INDEX } from '../services/gdpxMonitorService';
import {
  IntegrityCheckReport,
  IntegrityDiffItem,
  ManualRowMapping,
} from '../types/integrityMonitor';
import {
  INTEGRITY_COL_INDEX,
  parseIntegrityCellNumber,
} from '../services/integrityMonitorService';
import { ValsCheckReport, ValsDiffItem } from '../types/valsMonitor';
import { VALS_COL_INDEX } from '../services/valsMonitorService';
import {
  SimpleBenchCheckReport,
  SimpleBenchDiffItem,
} from '../types/simpleBenchMonitor';
import { DEFAULT_SIMPLEBENCH_COL_INDEX } from '../services/simpleBenchMonitorService';
import {
  AA_METRIC_KEYS,
  AaCheckReport,
  AaDiffItem,
  AaMetricDiffItem,
  AaMetricDiffStatus,
  AaMetricKey,
  ModelResearchRequest,
  NewModelRowDraft,
} from '../types/aaMonitor';
import { requestNewModelRowDraft } from '../services/aaMonitorService';
import {
  DEFAULT_PRICING_SNAPSHOT_DATE,
  mergePricingPlansWithDefaults,
} from '../data/pricingPlansFallback';
import { Language } from '../utils/i18n';
import {
  IGNORE_OPTION_VALUE,
  INSERT_NEW_ROW_OPTION_VALUE,
  PendingSheetCellChange,
  decimalsToPattern,
  formatCreatorColC,
  formatExactScore,
  formatMonitorTimestamp,
} from './monitor/monitorTypes';
import { PlansOverviewGrid } from './monitor/PlansOverviewGrid';
import { PricingDiffSection } from './monitor/PricingDiffSection';
import {
  BenchmarkDiffRowViewModel,
  BenchmarkDiffSection,
  BenchmarkPickerOption,
  ResolvedBenchmarkTarget,
  useBenchmarkSelectionState,
} from './monitor/BenchmarkDiffSection';
import {
  AA_METRIC_LABELS,
  ArtificialAnalysisDiffSection,
  ResolvedAaTarget,
} from './monitor/ArtificialAnalysisDiffSection';
import { NewModelRowDraftDialog } from './monitor/NewModelRowDraftDialog';
import { SheetWriteConfirmDialog } from './monitor/SheetWriteConfirmDialog';

interface PricingMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  // Pricing monitor state
  report: PricingCheckReport | null;
  isDiffValid?: boolean;
  isChecking: boolean;
  checkError: string | null;
  onRunCheck: () => Promise<void>;
  // Artificial Analysis 6-column monitor state (Columns D–I)
  aaReport: AaCheckReport | null;
  isAaDiffValid?: boolean;
  isCheckingAa: boolean;
  aaCheckError: string | null;
  onRunAaCheck: () => Promise<void>;
  onIgnoreAaModel?: (aaId: string) => Promise<void>;
  onRestoreAaModel?: (aaId: string) => Promise<void>;
  onPersistAaMapping?: (aaId: string, mapping: ManualRowMapping) => Promise<void>;
  onRemoveAaMapping?: (aaId: string) => Promise<void>;
  // GDPx monitor state (unified)
  gdpxReport: GdpxCheckReport | null;
  isGdpxDiffValid?: boolean;
  isCheckingGdpx: boolean;
  gdpxCheckError: string | null;
  onRunGdpxCheck: () => Promise<void>;
  // Integrity-Bench monitor state (unified)
  integrityReport: IntegrityCheckReport | null;
  isIntegrityDiffValid?: boolean;
  isCheckingIntegrity: boolean;
  integrityCheckError: string | null;
  onRunIntegrityCheck: () => Promise<void>;
  // Vals Index v2.2 monitor state (Column K)
  valsReport: ValsCheckReport | null;
  isValsDiffValid?: boolean;
  isCheckingVals: boolean;
  valsCheckError: string | null;
  onRunValsCheck: () => Promise<void>;
  // SimpleBench monitor state (Column Y)
  simpleBenchReport: SimpleBenchCheckReport | null;
  isSimpleBenchDiffValid?: boolean;
  isCheckingSimpleBench: boolean;
  simpleBenchCheckError: string | null;
  onRunSimpleBenchCheck: () => Promise<void>;
  // Persistent ignore & manual row mapping callbacks
  onIgnoreGdpxModel?: (gdpxId: string) => Promise<void>;
  onRestoreGdpxModel?: (gdpxId: string) => Promise<void>;
  onPersistGdpxMapping?: (gdpxId: string, mapping: ManualRowMapping) => Promise<void>;
  onRemoveGdpxMapping?: (gdpxId: string) => Promise<void>;
  onIgnoreValsModel?: (valsId: string) => Promise<void>;
  onRestoreValsModel?: (valsId: string) => Promise<void>;
  onPersistValsMapping?: (valsId: string, mapping: ManualRowMapping) => Promise<void>;
  onRemoveValsMapping?: (valsId: string) => Promise<void>;
  onIgnoreSimpleBenchModel?: (simpleBenchId: string) => Promise<void>;
  onRestoreSimpleBenchModel?: (simpleBenchId: string) => Promise<void>;
  onPersistSimpleBenchMapping?: (simpleBenchId: string, mapping: ManualRowMapping) => Promise<void>;
  onRemoveSimpleBenchMapping?: (simpleBenchId: string) => Promise<void>;
  onIgnoreIntegrityModel?: (integrityId: string) => Promise<void>;
  onRestoreIntegrityModel?: (integrityId: string) => Promise<void>;
  onPersistIntegrityMapping?: (integrityId: string, mapping: ManualRowMapping) => Promise<void>;
  onRemoveIntegrityMapping?: (integrityId: string) => Promise<void>;
  onSaveManualMappings?: (mappings: {
    aa?: Record<string, ManualRowMapping>;
    gdpx?: Record<string, ManualRowMapping>;
    integrity?: Record<string, ManualRowMapping>;
    vals?: Record<string, ManualRowMapping>;
    simpleBench?: Record<string, ManualRowMapping>;
  }) => Promise<void>;
  // Shared auto-24h & Google Sheets state
  dailyAutoEnabled: boolean;
  onToggleDailyAuto: (enabled: boolean) => void;
  loadedData: LoadedDatasets;
  accessToken: string | null;
  authUser: User | null;
  isSigningIn: boolean;
  onSignIn: () => Promise<void>;
  onSignOut?: () => Promise<void> | void;
  activeSpreadsheetId: string;
  onRefreshFromSheets: (spreadsheetIdOverride?: string) => Promise<void>;
  isSheetsConnected: boolean;
  apiAvailable?: boolean;
  onRetryConnection?: () => Promise<void>;
}

export const PricingMonitorModal: React.FC<PricingMonitorModalProps> = ({
  isOpen,
  onClose,
  lang,
  report,
  isDiffValid = true,
  isChecking,
  checkError,
  onRunCheck,
  aaReport,
  isAaDiffValid = true,
  isCheckingAa,
  aaCheckError,
  onRunAaCheck,
  onIgnoreAaModel,
  onRestoreAaModel,
  onPersistAaMapping,
  onRemoveAaMapping,
  gdpxReport,
  isGdpxDiffValid = true,
  isCheckingGdpx,
  gdpxCheckError,
  onRunGdpxCheck,
  integrityReport,
  isIntegrityDiffValid = true,
  isCheckingIntegrity,
  integrityCheckError,
  onRunIntegrityCheck,
  valsReport,
  isValsDiffValid = true,
  isCheckingVals,
  valsCheckError,
  onRunValsCheck,
  simpleBenchReport,
  isSimpleBenchDiffValid = true,
  isCheckingSimpleBench,
  simpleBenchCheckError,
  onRunSimpleBenchCheck,
  onIgnoreGdpxModel,
  onRestoreGdpxModel,
  onPersistGdpxMapping,
  onRemoveGdpxMapping,
  onIgnoreValsModel,
  onRestoreValsModel,
  onPersistValsMapping,
  onRemoveValsMapping,
  onIgnoreSimpleBenchModel,
  onRestoreSimpleBenchModel,
  onPersistSimpleBenchMapping,
  onRemoveSimpleBenchMapping,
  onIgnoreIntegrityModel,
  onRestoreIntegrityModel,
  onPersistIntegrityMapping,
  onRemoveIntegrityMapping,
  onSaveManualMappings,
  dailyAutoEnabled,
  onToggleDailyAuto,
  loadedData,
  accessToken,
  authUser,
  isSigningIn,
  onSignIn,
  onSignOut,
  activeSpreadsheetId,
  onRefreshFromSheets,
  isSheetsConnected,
  apiAvailable = true,
  onRetryConnection,
}) => {
  const [selectedPriceIds, setSelectedPriceIds] = useState<Record<string, boolean>>({});
  const [selectedAaCells, setSelectedAaCells] = useState<Record<string, boolean>>({});
  const [aaManualOverrides, setAaManualOverrides] = useState<Record<string, number>>({});
  const [aaShowIgnored, setAaShowIgnored] = useState<boolean>(false);
  const [researchingRowId, setResearchingRowId] = useState<string | null>(null);
  const [activeRowDraft, setActiveRowDraft] = useState<NewModelRowDraft | null>(null);
  const [isWritingFullRow, setIsWritingFullRow] = useState<boolean>(false);
  const [pendingWrite, setPendingWrite] = useState<PendingSheetCellChange[] | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeSuccess, setWriteSuccess] = useState<string | null>(null);

  const layout = loadedData.columnLayout;
  const minHistoryRow = loadedData.historyStartRow ?? layout?.historyStartRow ?? 36;
  const colDeIdx = layout?.colDePrice ?? 19;
  const colUsIdx = layout?.colUsPrice ?? null;
  const aaColByMetric = useMemo<Record<AaMetricKey, number>>(
    () => ({
      iq: layout?.colActCodeReason ?? 3,
      nonHallucination: layout?.colNonHallucination ?? 4,
      accuracy: layout?.colScienceKnowledge ?? 5,
      mmmuPro: layout?.colVisionPlot ?? 6,
      mlcr: layout?.colMedReasoning ?? 7,
      excelAgent: layout?.colExcelAgent ?? 8,
    }),
    [layout]
  );
  const gdpxColIdx = layout?.colTrickQuestions ?? GDPX_COL_INDEX;
  const valsColIdx = layout?.colEconLegal ?? VALS_COL_INDEX;
  const simpleBenchColIdx = layout?.colTrickOld ?? DEFAULT_SIMPLEBENCH_COL_INDEX;
  const integrityColIdx = layout?.colIntegrity ?? INTEGRITY_COL_INDEX;
  const colDeLetter = columnIndexToA1(colDeIdx);
  const colUsLetter = colUsIdx !== null ? columnIndexToA1(colUsIdx) : null;
  const gdpxColLetter = columnIndexToA1(gdpxColIdx);
  const valsColLetter = columnIndexToA1(valsColIdx);
  const simpleBenchColLetter = columnIndexToA1(simpleBenchColIdx);
  const integrityColLetter = columnIndexToA1(integrityColIdx);
  const sheetTitle = loadedData.activeSheetTitle || 'Sheet1';

  const effectiveDiffReport =
    apiAvailable && isSheetsConnected && isDiffValid && report ? report : null;
  const effectiveAaDiffReport =
    apiAvailable && isSheetsConnected && isAaDiffValid && aaReport && aaReport.diffs.length > 0
      ? aaReport
      : null;
  const effectiveGdpxDiffReport =
    apiAvailable && isSheetsConnected && isGdpxDiffValid && gdpxReport && gdpxReport.diffs.length > 0
      ? gdpxReport
      : null;
  const effectiveValsDiffReport =
    apiAvailable && isSheetsConnected && isValsDiffValid && valsReport && valsReport.diffs.length > 0
      ? valsReport
      : null;
  const effectiveSimpleBenchDiffReport =
    apiAvailable &&
    isSheetsConnected &&
    isSimpleBenchDiffValid &&
    simpleBenchReport &&
    simpleBenchReport.diffs.length > 0
      ? simpleBenchReport
      : null;
  const effectiveIntegrityDiffReport =
    apiAvailable &&
    isSheetsConnected &&
    isIntegrityDiffValid &&
    integrityReport &&
    integrityReport.diffs.length > 0
      ? integrityReport
      : null;

  const sheetRowsForPicker = useMemo(() => {
    return loadedData.allModels
      .filter((m) => typeof m.sheetRowNumber === 'number' && m.sheetRowNumber >= minHistoryRow)
      .sort((a, b) => (a.sheetRowNumber ?? 9999) - (b.sheetRowNumber ?? 9999));
  }, [loadedData.allModels, minHistoryRow]);

  // First released History row (below Rumors block), where new models get inserted
  const firstReleasedHistoryRow = useMemo(() => {
    const firstReleased = sheetRowsForPicker.find(
      (m) =>
        m.hasConcreteReleaseDate ||
        m.rawScores.actCodeReason !== null ||
        m.rawScores.nonHallucination !== null ||
        m.rawScores.scienceKnowledge !== null ||
        m.rawScores.econLegal !== null ||
        m.rawScores.trickQuestionsOld !== null
    );
    return firstReleased?.sheetRowNumber ?? minHistoryRow;
  }, [sheetRowsForPicker, minHistoryRow]);

  const sheetRowByNumber = useMemo(() => {
    const map = new Map<number, (typeof sheetRowsForPicker)[number]>();
    for (const m of sheetRowsForPicker) {
      if (typeof m.sheetRowNumber === 'number') {
        map.set(m.sheetRowNumber, m);
      }
    }
    return map;
  }, [sheetRowsForPicker]);

  const integrityColByRow = useMemo(() => {
    const map = new Map<number, number | null>();
    const rawRows = loadedData.rawRows;
    for (const m of sheetRowsForPicker) {
      if (typeof m.sheetRowNumber === 'number') {
        const rawCell = rawRows?.[m.sheetRowNumber - 1]?.[integrityColIdx];
        map.set(m.sheetRowNumber, parseIntegrityCellNumber(rawCell));
      }
    }
    return map;
  }, [sheetRowsForPicker, loadedData.rawRows, integrityColIdx]);

  // Pre-select changed and missing prices so new 0-5€ / 0-8€ etc. entries are ready to write to Col T/U
  useEffect(() => {
    if (!effectiveDiffReport) {
      setSelectedPriceIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of effectiveDiffReport.diffs) {
      const hasChange = item.deStatus === 'changed' || item.usStatus === 'changed';
      const hasMissing = item.deStatus === 'missing' || item.usStatus === 'missing';
      if (hasChange || hasMissing) {
        next[item.modelId] = true;
      }
    }
    setSelectedPriceIds(next);
  }, [effectiveDiffReport]);

  useEffect(() => {
    if (isOpen) {
      setWriteError(null);
      setWriteSuccess(null);
      setPendingWrite(null);
      setAaManualOverrides({});
      setActiveRowDraft(null);
    }
  }, [isOpen]);

  const actionablePriceDiffs = useMemo(() => {
    if (!effectiveDiffReport) return [];
    return effectiveDiffReport.diffs.filter(
      (d) => d.deStatus !== 'unchanged' || d.usStatus !== 'unchanged'
    );
  }, [effectiveDiffReport]);

  // --- Artificial Analysis (6-column) rows, manual target resolution & selection ---
  const aaRows = useMemo((): AaDiffItem[] => {
    if (!effectiveAaDiffReport) return [];
    return effectiveAaDiffReport.diffs.filter(
      (d) => d.status !== 'unchanged' && d.status !== 'ignored'
    );
  }, [effectiveAaDiffReport]);

  const aaIgnored = useMemo(
    () =>
      (effectiveAaDiffReport?.diffs ?? [])
        .filter((d) => d.status === 'ignored')
        .map((d) => ({ id: d.aaId, name: d.aaName })),
    [effectiveAaDiffReport]
  );

  const aaMapped = useMemo(() => {
    const mappings = effectiveAaDiffReport?.manualMappings ?? {};
    const byId = new Map((effectiveAaDiffReport?.diffs ?? []).map((d) => [d.aaId, d.aaName]));
    return Object.entries(mappings).map(([id, m]) => ({
      id,
      sourceName: byId.get(id) || id,
      sheetRowNumber: m.sheetRowNumber,
      matchedDisplayName: m.matchedDisplayName || sheetRowByNumber.get(m.sheetRowNumber)?.displayName,
    }));
  }, [effectiveAaDiffReport, sheetRowByNumber]);

  const resolveAaTarget = useCallback(
    (item: AaDiffItem, overrides: Record<string, number> = aaManualOverrides): ResolvedAaTarget => {
      const overrideRow = overrides[item.aaId];
      if (typeof overrideRow === 'number' && overrideRow >= minHistoryRow) {
        const sheetModel = sheetRowByNumber.get(overrideRow);
        const raw = sheetModel?.rawScores;
        const sheetScores: Record<AaMetricKey, number | null> = {
          iq: typeof raw?.actCodeReason === 'number' ? raw.actCodeReason : null,
          nonHallucination: typeof raw?.nonHallucination === 'number' ? raw.nonHallucination : null,
          accuracy: typeof raw?.scienceKnowledge === 'number' ? raw.scienceKnowledge : null,
          mmmuPro: typeof raw?.visionPlot === 'number' ? raw.visionPlot : null,
          mlcr: typeof raw?.medReasoning === 'number' ? raw.medReasoning : null,
          excelAgent: typeof raw?.excelAgent === 'number' ? raw.excelAgent : null,
        };
        const metricDiffs: AaMetricDiffItem[] = AA_METRIC_KEYS.map((metric) => {
          const liveScore = item.liveScores[metric];
          const currentScore = sheetScores[metric];
          const maskCell = loadedData.boldMask?.[overrideRow - 1]?.[aaColByMetric[metric]];
          const currentIsBold = typeof maskCell === 'boolean' ? maskCell : null;
          let status: AaMetricDiffStatus;
          if (liveScore === null) {
            status = 'unavailable';
          } else if (currentScore === null) {
            status = 'missing';
          } else if (currentIsBold === false) {
            status = 'overwrite_estimate';
          } else if (Math.abs(currentScore - liveScore) < 0.05) {
            status = 'unchanged';
          } else if (
            Math.abs(currentScore - Math.round(currentScore)) < 1e-6 &&
            Math.abs(currentScore - liveScore) <= 0.55
          ) {
            status = 'unchanged';
          } else {
            status = 'changed';
          }
          return { metric, liveScore, currentScore, currentIsBold, status };
        });
        return {
          sheetRowNumber: overrideRow,
          matchedDisplayName: sheetModel?.displayName || `Row ${overrideRow}`,
          metricDiffs,
        };
      }
      return {
        sheetRowNumber: item.sheetRowNumber,
        matchedDisplayName: item.matchedDisplayName,
        metricDiffs: item.metricDiffs,
      };
    },
    [aaManualOverrides, minHistoryRow, sheetRowByNumber, loadedData.boldMask, aaColByMetric]
  );

  // Pre-select actionable AA metric cells whenever effectiveAaDiffReport updates
  useEffect(() => {
    if (!effectiveAaDiffReport) {
      setSelectedAaCells({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of aaRows) {
      if (typeof item.sheetRowNumber === 'number' && item.sheetRowNumber >= minHistoryRow) {
        for (const md of item.metricDiffs) {
          if (
            md.liveScore !== null &&
            (md.status === 'missing' || md.status === 'overwrite_estimate' || md.status === 'changed')
          ) {
            next[`${item.aaId}:${md.metric}`] = true;
          }
        }
      }
    }
    setSelectedAaCells(next);
  }, [effectiveAaDiffReport, aaRows, minHistoryRow]);

  const handleToggleAaMetricCell = useCallback((aaId: string, metric: AaMetricKey) => {
    const key = `${aaId}:${metric}`;
    setSelectedAaCells((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleToggleAaRowAllMetrics = useCallback(
    (aaId: string, metrics: AaMetricKey[], checked: boolean) => {
      setSelectedAaCells((prev) => {
        const next = { ...prev };
        for (const m of metrics) {
          next[`${aaId}:${m}`] = checked;
        }
        return next;
      });
    },
    []
  );

  const handleToggleAaSectionAll = useCallback(
    (checked: boolean) => {
      setSelectedAaCells((prev) => {
        const next = { ...prev };
        for (const item of aaRows) {
          const target = resolveAaTarget(item);
          if (typeof target.sheetRowNumber === 'number' && target.sheetRowNumber >= minHistoryRow) {
            for (const md of target.metricDiffs) {
              if (
                md.liveScore !== null &&
                (md.status === 'missing' ||
                  md.status === 'overwrite_estimate' ||
                  md.status === 'changed')
              ) {
                next[`${item.aaId}:${md.metric}`] = checked;
              }
            }
          }
        }
        return next;
      });
    },
    [aaRows, resolveAaTarget, minHistoryRow]
  );

  const handleAssignAaManualRow = useCallback(
    (aaId: string, rowValue: string) => {
      if (rowValue === IGNORE_OPTION_VALUE) {
        setAaManualOverrides((prev) => {
          const next = { ...prev };
          delete next[aaId];
          return next;
        });
        setSelectedAaCells((prev) => {
          const next = { ...prev };
          for (const m of AA_METRIC_KEYS) delete next[`${aaId}:${m}`];
          return next;
        });
        if (onIgnoreAaModel) void onIgnoreAaModel(aaId);
        return;
      }

      const parsed = Number(rowValue);

      if (!rowValue || !Number.isFinite(parsed) || parsed < minHistoryRow) {
        setAaManualOverrides((prev) => {
          const next = { ...prev };
          delete next[aaId];
          return next;
        });
        setSelectedAaCells((prev) => {
          const next = { ...prev };
          for (const m of AA_METRIC_KEYS) delete next[`${aaId}:${m}`];
          return next;
        });
        return;
      }

      const nextOverrides = { ...aaManualOverrides, [aaId]: parsed };
      setAaManualOverrides(nextOverrides);
      const item = aaRows.find((r) => r.aaId === aaId);
      if (item) {
        const target = resolveAaTarget(item, nextOverrides);
        setSelectedAaCells((prev) => {
          const next = { ...prev };
          for (const md of target.metricDiffs) {
            const actionable =
              md.liveScore !== null &&
              (md.status === 'missing' ||
                md.status === 'overwrite_estimate' ||
                md.status === 'changed');
            next[`${aaId}:${md.metric}`] = actionable;
          }
          return next;
        });
      }

      const sheetModel = sheetRowByNumber.get(parsed);
      if (onPersistAaMapping) {
        void onPersistAaMapping(aaId, {
          sheetRowNumber: parsed,
          ...(sheetModel ? { matchedModelId: sheetModel.id, matchedDisplayName: sheetModel.displayName } : {}),
        });
      }
    },
    [aaManualOverrides, aaRows, minHistoryRow, onIgnoreAaModel, onPersistAaMapping, resolveAaTarget, sheetRowByNumber]
  );

  // --- View-model adapters for the 4 single-column benchmark monitors ---
  const gdpxRows = useMemo((): Array<BenchmarkDiffRowViewModel<GdpxDiffItem>> => {
    if (!effectiveGdpxDiffReport) return [];
    return effectiveGdpxDiffReport.diffs
      .filter((d) => d.status !== 'unchanged' && d.status !== 'ignored')
      .map((d) => ({
        id: d.gdpxId,
        name: d.gdpxName,
        rank: d.rank,
        status: d.status,
        liveScore: d.liveScore,
        scoreDecimals: d.scoreDecimals,
        raw: d,
      }));
  }, [effectiveGdpxDiffReport]);

  const gdpxIgnored = useMemo(
    () =>
      (effectiveGdpxDiffReport?.diffs ?? [])
        .filter((d) => d.status === 'ignored')
        .map((d) => ({ id: d.gdpxId, name: d.gdpxName })),
    [effectiveGdpxDiffReport]
  );

  const gdpxMapped = useMemo(() => {
    const mappings = effectiveGdpxDiffReport?.manualMappings ?? {};
    const byId = new Map((effectiveGdpxDiffReport?.diffs ?? []).map((d) => [d.gdpxId, d.gdpxName]));
    return Object.entries(mappings).map(([id, m]) => ({
      id,
      sourceName: byId.get(id) || id,
      sheetRowNumber: m.sheetRowNumber,
      matchedDisplayName: m.matchedDisplayName || sheetRowByNumber.get(m.sheetRowNumber)?.displayName,
    }));
  }, [effectiveGdpxDiffReport, sheetRowByNumber]);

  const valsRows = useMemo((): Array<BenchmarkDiffRowViewModel<ValsDiffItem>> => {
    if (!effectiveValsDiffReport) return [];
    return effectiveValsDiffReport.diffs
      .filter((d) => d.status !== 'unchanged' && d.status !== 'ignored')
      .map((d) => ({
        id: d.valsId,
        name: d.valsName,
        rank: d.rank,
        status: d.status,
        liveScore: d.liveScore,
        scoreDecimals: d.scoreDecimals,
        raw: d,
      }));
  }, [effectiveValsDiffReport]);

  const valsIgnored = useMemo(
    () =>
      (effectiveValsDiffReport?.diffs ?? [])
        .filter((d) => d.status === 'ignored')
        .map((d) => ({ id: d.valsId, name: d.valsName })),
    [effectiveValsDiffReport]
  );

  const valsMapped = useMemo(() => {
    const mappings = effectiveValsDiffReport?.manualMappings ?? {};
    const byId = new Map((effectiveValsDiffReport?.diffs ?? []).map((d) => [d.valsId, d.valsName]));
    return Object.entries(mappings).map(([id, m]) => ({
      id,
      sourceName: byId.get(id) || id,
      sheetRowNumber: m.sheetRowNumber,
      matchedDisplayName: m.matchedDisplayName || sheetRowByNumber.get(m.sheetRowNumber)?.displayName,
    }));
  }, [effectiveValsDiffReport, sheetRowByNumber]);

  const simpleBenchRows = useMemo((): Array<BenchmarkDiffRowViewModel<SimpleBenchDiffItem>> => {
    if (!effectiveSimpleBenchDiffReport) return [];
    return effectiveSimpleBenchDiffReport.diffs
      .filter((d) => d.status !== 'unchanged' && d.status !== 'ignored')
      .map((d) => ({
        id: d.simpleBenchId,
        name: d.simpleBenchName,
        rank: d.rank,
        status: d.status,
        liveScore: d.liveScore,
        scoreDecimals: d.scoreDecimals,
        raw: d,
      }));
  }, [effectiveSimpleBenchDiffReport]);

  const simpleBenchIgnored = useMemo(
    () =>
      (effectiveSimpleBenchDiffReport?.diffs ?? [])
        .filter((d) => d.status === 'ignored')
        .map((d) => ({ id: d.simpleBenchId, name: d.simpleBenchName })),
    [effectiveSimpleBenchDiffReport]
  );

  const simpleBenchMapped = useMemo(() => {
    const mappings = effectiveSimpleBenchDiffReport?.manualMappings ?? {};
    const byId = new Map(
      (effectiveSimpleBenchDiffReport?.diffs ?? []).map((d) => [d.simpleBenchId, d.simpleBenchName])
    );
    return Object.entries(mappings).map(([id, m]) => ({
      id,
      sourceName: byId.get(id) || id,
      sheetRowNumber: m.sheetRowNumber,
      matchedDisplayName: m.matchedDisplayName || sheetRowByNumber.get(m.sheetRowNumber)?.displayName,
    }));
  }, [effectiveSimpleBenchDiffReport, sheetRowByNumber]);

  const integrityRows = useMemo((): Array<BenchmarkDiffRowViewModel<IntegrityDiffItem>> => {
    if (!effectiveIntegrityDiffReport) return [];
    return effectiveIntegrityDiffReport.diffs
      .filter((d) => d.status !== 'unchanged' && d.status !== 'ignored')
      .map((d) => ({
        id: d.integrityId,
        name: d.integrityName,
        rank: d.rank,
        isSiteNew: d.isSiteNew,
        status: d.status,
        liveScore: d.liveScore,
        scoreDecimals: d.scoreDecimals,
        raw: d,
      }));
  }, [effectiveIntegrityDiffReport]);

  const integrityIgnored = useMemo(
    () =>
      (effectiveIntegrityDiffReport?.diffs ?? [])
        .filter((d) => d.status === 'ignored')
        .map((d) => ({ id: d.integrityId, name: d.integrityName })),
    [effectiveIntegrityDiffReport]
  );

  const integrityMapped = useMemo(() => {
    const mappings = effectiveIntegrityDiffReport?.manualMappings ?? {};
    const byId = new Map(
      (effectiveIntegrityDiffReport?.diffs ?? []).map((d) => [d.integrityId, d.integrityName])
    );
    return Object.entries(mappings).map(([id, m]) => ({
      id,
      sourceName: byId.get(id) || id,
      sheetRowNumber: m.sheetRowNumber,
      matchedDisplayName: m.matchedDisplayName || sheetRowByNumber.get(m.sheetRowNumber)?.displayName,
    }));
  }, [effectiveIntegrityDiffReport, sheetRowByNumber]);

  // --- Selection & manual override hooks ---
  const resolveGdpxTarget = useCallback(
    (
      item: GdpxDiffItem,
      overrides: Record<string, number>
    ): ResolvedBenchmarkTarget => {
      const overrideRow = overrides[item.gdpxId];
      if (typeof overrideRow === 'number' && overrideRow >= minHistoryRow) {
        const sheetModel = sheetRowByNumber.get(overrideRow);
        const maskCell = loadedData.boldMask?.[overrideRow - 1]?.[gdpxColIdx];
        return {
          sheetRowNumber: overrideRow,
          matchedDisplayName: sheetModel?.displayName || `Row ${overrideRow}`,
          currentScore:
            sheetModel && typeof sheetModel.rawScores.trickQuestions === 'number'
              ? sheetModel.rawScores.trickQuestions
              : null,
          currentIsBold: typeof maskCell === 'boolean' ? maskCell : null,
        };
      }
      return {
        sheetRowNumber: item.sheetRowNumber,
        matchedDisplayName: item.matchedDisplayName,
        currentScore: item.currentColJ,
        currentIsBold: item.currentColJIsBold,
      };
    },
    [sheetRowByNumber, loadedData.boldMask, gdpxColIdx, minHistoryRow]
  );

  const resolveValsTarget = useCallback(
    (
      item: ValsDiffItem,
      overrides: Record<string, number>
    ): ResolvedBenchmarkTarget => {
      const overrideRow = overrides[item.valsId];
      if (overrideRow === INSERT_NEW_ROW_OPTION_VALUE) {
        return {
          sheetRowNumber: null,
          isNewRowInsert: true,
          matchedDisplayName: item.valsName,
          currentScore: null,
          currentIsBold: null,
        };
      }
      if (typeof overrideRow === 'number' && overrideRow >= minHistoryRow) {
        const sheetModel = sheetRowByNumber.get(overrideRow);
        const maskCell = loadedData.boldMask?.[overrideRow - 1]?.[valsColIdx];
        return {
          sheetRowNumber: overrideRow,
          isNewRowInsert: false,
          matchedDisplayName: sheetModel?.displayName || `Row ${overrideRow}`,
          currentScore:
            sheetModel && typeof sheetModel.rawScores.econLegal === 'number'
              ? sheetModel.rawScores.econLegal
              : null,
          currentIsBold: typeof maskCell === 'boolean' ? maskCell : null,
        };
      }
      return {
        sheetRowNumber: item.sheetRowNumber,
        isNewRowInsert: false,
        matchedDisplayName: item.matchedDisplayName,
        currentScore: item.currentColK,
        currentIsBold: item.currentColKIsBold,
      };
    },
    [sheetRowByNumber, loadedData.boldMask, valsColIdx, minHistoryRow]
  );

  const resolveSimpleBenchTarget = useCallback(
    (
      item: SimpleBenchDiffItem,
      overrides: Record<string, number>
    ): ResolvedBenchmarkTarget => {
      const overrideRow = overrides[item.simpleBenchId];
      if (overrideRow === INSERT_NEW_ROW_OPTION_VALUE) {
        return {
          sheetRowNumber: null,
          isNewRowInsert: true,
          matchedDisplayName: item.simpleBenchName,
          currentScore: null,
          currentIsBold: null,
        };
      }
      if (typeof overrideRow === 'number' && overrideRow >= minHistoryRow) {
        const sheetModel = sheetRowByNumber.get(overrideRow);
        const rawVal = sheetModel?.rawScores.trickQuestionsOld;
        const currentVal = typeof rawVal === 'number' && Number.isFinite(rawVal) ? rawVal : null;
        const maskCell = loadedData.boldMask?.[overrideRow - 1]?.[simpleBenchColIdx];
        return {
          sheetRowNumber: overrideRow,
          isNewRowInsert: false,
          matchedDisplayName: sheetModel?.displayName || `Row ${overrideRow}`,
          currentScore: currentVal,
          currentIsBold: typeof maskCell === 'boolean' ? maskCell : null,
        };
      }
      return {
        sheetRowNumber: item.sheetRowNumber,
        isNewRowInsert: false,
        matchedDisplayName: item.matchedDisplayName,
        currentScore: item.currentColY,
        currentIsBold: item.currentColYIsBold,
      };
    },
    [sheetRowByNumber, loadedData.boldMask, simpleBenchColIdx, minHistoryRow]
  );

  const resolveIntegrityTarget = useCallback(
    (
      item: IntegrityDiffItem,
      overrides: Record<string, number>
    ): ResolvedBenchmarkTarget => {
      const overrideRow = overrides[item.integrityId];
      if (typeof overrideRow === 'number' && overrideRow >= minHistoryRow) {
        const sheetModel = sheetRowByNumber.get(overrideRow);
        const maskCell = loadedData.boldMask?.[overrideRow - 1]?.[integrityColIdx];
        return {
          sheetRowNumber: overrideRow,
          matchedDisplayName: sheetModel?.displayName || `Row ${overrideRow}`,
          currentScore: integrityColByRow.get(overrideRow) ?? null,
          currentIsBold: typeof maskCell === 'boolean' ? maskCell : null,
        };
      }
      return {
        sheetRowNumber: item.sheetRowNumber,
        matchedDisplayName: item.matchedDisplayName,
        currentScore: item.currentColAN,
        currentIsBold: item.currentColANIsBold,
      };
    },
    [sheetRowByNumber, integrityColByRow, loadedData.boldMask, integrityColIdx, minHistoryRow]
  );

  const getSheetRowInfo = useCallback(
    (rowNumber: number) => {
      const m = sheetRowByNumber.get(rowNumber);
      return m ? { id: m.id, displayName: m.displayName } : undefined;
    },
    [sheetRowByNumber]
  );

  // Selection states
  const gdpxSel = useBenchmarkSelectionState(
    isOpen,
    gdpxRows,
    Boolean(effectiveGdpxDiffReport),
    useCallback((r, ov) => resolveGdpxTarget(r.raw, ov), [resolveGdpxTarget]),
    onIgnoreGdpxModel,
    onPersistGdpxMapping,
    getSheetRowInfo,
    minHistoryRow
  );

  const valsSel = useBenchmarkSelectionState(
    isOpen,
    valsRows,
    Boolean(effectiveValsDiffReport),
    useCallback((r, ov) => resolveValsTarget(r.raw, ov), [resolveValsTarget]),
    onIgnoreValsModel,
    onPersistValsMapping,
    getSheetRowInfo,
    minHistoryRow
  );

  const sbSel = useBenchmarkSelectionState(
    isOpen,
    simpleBenchRows,
    Boolean(effectiveSimpleBenchDiffReport),
    useCallback((r, ov) => resolveSimpleBenchTarget(r.raw, ov), [resolveSimpleBenchTarget]),
    onIgnoreSimpleBenchModel,
    onPersistSimpleBenchMapping,
    getSheetRowInfo,
    minHistoryRow
  );

  const intSel = useBenchmarkSelectionState(
    isOpen,
    integrityRows,
    Boolean(effectiveIntegrityDiffReport),
    useCallback((r, ov) => resolveIntegrityTarget(r.raw, ov), [resolveIntegrityTarget]),
    onIgnoreIntegrityModel,
    onPersistIntegrityMapping,
    getSheetRowInfo,
    minHistoryRow
  );

  // --- Actionable selected item lists ---
  const selectedPriceCount = useMemo(
    () => actionablePriceDiffs.filter((d) => selectedPriceIds[d.modelId]).length,
    [actionablePriceDiffs, selectedPriceIds]
  );

  const selectedGdpxItems = useMemo(
    () =>
      gdpxRows
        .map((r) => r.raw)
        .filter((item) => {
          if (!gdpxSel.selectedIds[item.gdpxId]) return false;
          const target = resolveGdpxTarget(item, gdpxSel.manualRowOverrides);
          return typeof target.sheetRowNumber === 'number' && target.sheetRowNumber >= minHistoryRow;
        }),
    [gdpxRows, gdpxSel.selectedIds, gdpxSel.manualRowOverrides, resolveGdpxTarget, minHistoryRow]
  );

  const selectedValsItems = useMemo(
    () =>
      valsRows
        .map((r) => r.raw)
        .filter((item) => {
          if (!valsSel.selectedIds[item.valsId]) return false;
          const target = resolveValsTarget(item, valsSel.manualRowOverrides);
          return (
            target.isNewRowInsert ||
            (typeof target.sheetRowNumber === 'number' && target.sheetRowNumber >= minHistoryRow)
          );
        }),
    [valsRows, valsSel.selectedIds, valsSel.manualRowOverrides, resolveValsTarget, minHistoryRow]
  );

  const selectedSimpleBenchItems = useMemo(
    () =>
      simpleBenchRows
        .map((r) => r.raw)
        .filter((item) => {
          if (!sbSel.selectedIds[item.simpleBenchId]) return false;
          const target = resolveSimpleBenchTarget(item, sbSel.manualRowOverrides);
          return (
            target.isNewRowInsert ||
            (typeof target.sheetRowNumber === 'number' && target.sheetRowNumber >= minHistoryRow)
          );
        }),
    [simpleBenchRows, sbSel.selectedIds, sbSel.manualRowOverrides, resolveSimpleBenchTarget, minHistoryRow]
  );

  const selectedIntegrityItems = useMemo(
    () =>
      integrityRows
        .map((r) => r.raw)
        .filter((item) => {
          if (!intSel.selectedIds[item.integrityId]) return false;
          const target = resolveIntegrityTarget(item, intSel.manualRowOverrides);
          return typeof target.sheetRowNumber === 'number' && target.sheetRowNumber >= minHistoryRow;
        }),
    [integrityRows, intSel.selectedIds, intSel.manualRowOverrides, resolveIntegrityTarget, minHistoryRow]
  );

  const selectedAaCellEntries = useMemo(() => {
    const entries: Array<{
      item: AaDiffItem;
      target: ResolvedAaTarget;
      mDiff: AaMetricDiffItem;
    }> = [];
    for (const item of aaRows) {
      const target = resolveAaTarget(item);
      if (typeof target.sheetRowNumber !== 'number' || target.sheetRowNumber < minHistoryRow) {
        continue;
      }
      for (const mDiff of target.metricDiffs) {
        if (
          mDiff.liveScore !== null &&
          (mDiff.status === 'missing' ||
            mDiff.status === 'overwrite_estimate' ||
            mDiff.status === 'changed') &&
          selectedAaCells[`${item.aaId}:${mDiff.metric}`]
        ) {
          entries.push({ item, target, mDiff });
        }
      }
    }
    return entries;
  }, [aaRows, resolveAaTarget, minHistoryRow, selectedAaCells]);

  const totalSelectedCount =
    selectedPriceCount +
    selectedAaCellEntries.length +
    selectedGdpxItems.length +
    selectedValsItems.length +
    selectedSimpleBenchItems.length +
    selectedIntegrityItems.length;

  const hasAnyActionable =
    actionablePriceDiffs.length > 0 ||
    aaRows.length > 0 ||
    gdpxRows.length > 0 ||
    valsRows.length > 0 ||
    simpleBenchRows.length > 0 ||
    integrityRows.length > 0;

  const isAnyChecking =
    isChecking ||
    isCheckingAa ||
    isCheckingGdpx ||
    isCheckingVals ||
    isCheckingSimpleBench ||
    isCheckingIntegrity;

  const displayedLabs = useMemo(
    () => mergePricingPlansWithDefaults(report?.labs),
    [report]
  );
  const displayedSources = report?.sources ?? [];
  const displayedTimestamp = report?.checkedAt || DEFAULT_PRICING_SNAPSHOT_DATE;
  const isUsingLiveReport = Boolean(report?.labs && report.labs.length > 0);

  if (!isOpen) return null;

  const handleRunAllChecks = async () => {
    if (!accessToken) return;
    await Promise.allSettled([
      isSheetsConnected ? onRunCheck() : Promise.resolve(),
      onRunAaCheck(),
      onRunGdpxCheck(),
      onRunValsCheck(),
      onRunSimpleBenchCheck(),
      onRunIntegrityCheck(),
    ]);
  };

  // --- Picker option sorters ---
  const buildPickerOptions = (
    rows: typeof sheetRowsForPicker,
    formatRow: (m: (typeof sheetRowsForPicker)[number]) => string
  ): BenchmarkPickerOption[] =>
    rows
      .filter((m) => typeof m.sheetRowNumber === 'number')
      .map((m) => ({
        id: m.id,
        sheetRowNumber: m.sheetRowNumber as number,
        displayName: m.displayName,
        labelSuffix: formatRow(m),
      }));

  const getAaPickerOptions = (item: AaDiffItem) => {
    const creatorLow = (item.creator || '').toLowerCase();
    const firstWord = (item.aaName || '').toLowerCase().split(/[\s-]+/)[0] || '';
    const sorted = [...sheetRowsForPicker].sort((a, b) => {
      const aCo =
        creatorLow &&
        ((a.companyName || '').toLowerCase().includes(creatorLow) ||
          creatorLow.includes((a.companyName || '').toLowerCase()))
          ? 0
          : 1;
      const bCo =
        creatorLow &&
        ((b.companyName || '').toLowerCase().includes(creatorLow) ||
          creatorLow.includes((b.companyName || '').toLowerCase()))
          ? 0
          : 1;
      if (aCo !== bCo) return aCo - bCo;
      const aMatch = firstWord && a.displayName.toLowerCase().includes(firstWord) ? 0 : 1;
      const bMatch = firstWord && b.displayName.toLowerCase().includes(firstWord) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      const aEmpty = a.rawScores.actCodeReason === null ? 0 : 1;
      const bEmpty = b.rawScores.actCodeReason === null ? 0 : 1;
      if (aEmpty !== bEmpty) return aEmpty - bEmpty;
      return (a.sheetRowNumber ?? 0) - (b.sheetRowNumber ?? 0);
    });
    return buildPickerOptions(sorted, (m) => {
      const iq = m.rawScores.actCodeReason;
      return iq !== null
        ? `IQ ${formatExactScore(iq, lang)}`
        : lang === 'de'
        ? 'IQ leer'
        : 'IQ empty';
    });
  };

  const getGdpxPickerOptions = (row: BenchmarkDiffRowViewModel<GdpxDiffItem>) => {
    const labLow = (row.raw.lab || '').toLowerCase();
    const sorted = [...sheetRowsForPicker].sort((a, b) => {
      const aEmpty = a.rawScores.trickQuestions === null ? 0 : 1;
      const bEmpty = b.rawScores.trickQuestions === null ? 0 : 1;
      const aCo =
        (a.companyName || '').toLowerCase().includes(labLow) ||
        labLow.includes((a.companyName || '').toLowerCase())
          ? 0
          : 1;
      const bCo =
        (b.companyName || '').toLowerCase().includes(labLow) ||
        labLow.includes((b.companyName || '').toLowerCase())
          ? 0
          : 1;
      if (aCo !== bCo) return aCo - bCo;
      if (aEmpty !== bEmpty) return aEmpty - bEmpty;
      return (a.sheetRowNumber ?? 0) - (b.sheetRowNumber ?? 0);
    });
    return buildPickerOptions(sorted, (m) => {
      const maskVal =
        typeof m.sheetRowNumber === 'number'
          ? loadedData.boldMask?.[m.sheetRowNumber - 1]?.[gdpxColIdx]
          : undefined;
      const estimateTag =
        m.rawScores.trickQuestions !== null && maskVal === false
          ? lang === 'de'
            ? ', Schätzwert'
            : ', Estimate'
          : '';
      return m.rawScores.trickQuestions !== null
        ? `${formatExactScore(m.rawScores.trickQuestions, lang)}${estimateTag}`
        : lang === 'de'
        ? 'leer'
        : 'empty';
    });
  };

  const getValsPickerOptions = (row: BenchmarkDiffRowViewModel<ValsDiffItem>) => {
    const coLow = (row.raw.company || '').toLowerCase();
    const firstWord = (row.raw.valsName || '').toLowerCase().split(/[\s-]+/)[0] || '';
    const sorted = [...sheetRowsForPicker].sort((a, b) => {
      const aCo =
        coLow &&
        ((a.companyName || '').toLowerCase().includes(coLow) ||
          coLow.includes((a.companyName || '').toLowerCase()))
          ? 0
          : 1;
      const bCo =
        coLow &&
        ((b.companyName || '').toLowerCase().includes(coLow) ||
          coLow.includes((b.companyName || '').toLowerCase()))
          ? 0
          : 1;
      if (aCo !== bCo) return aCo - bCo;
      const aMatch = firstWord && a.displayName.toLowerCase().includes(firstWord) ? 0 : 1;
      const bMatch = firstWord && b.displayName.toLowerCase().includes(firstWord) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      const aEmpty = a.rawScores.econLegal === null ? 0 : 1;
      const bEmpty = b.rawScores.econLegal === null ? 0 : 1;
      if (aEmpty !== bEmpty) return aEmpty - bEmpty;
      return (a.sheetRowNumber ?? 0) - (b.sheetRowNumber ?? 0);
    });
    return buildPickerOptions(sorted, (m) => {
      const maskVal =
        typeof m.sheetRowNumber === 'number'
          ? loadedData.boldMask?.[m.sheetRowNumber - 1]?.[valsColIdx]
          : undefined;
      const estimateTag =
        m.rawScores.econLegal !== null && maskVal === false
          ? lang === 'de'
            ? ', Schätzwert'
            : ', Estimate'
          : '';
      return m.rawScores.econLegal !== null
        ? `${formatExactScore(m.rawScores.econLegal, lang)}${estimateTag}`
        : lang === 'de'
        ? 'leer'
        : 'empty';
    });
  };

  const getSimpleBenchPickerOptions = (row: BenchmarkDiffRowViewModel<SimpleBenchDiffItem>) => {
    const orgLow = (row.raw.organization || '').toLowerCase();
    const firstWord = (row.raw.simpleBenchName || '').toLowerCase().split(/[\s-]+/)[0] || '';
    const sorted = [...sheetRowsForPicker].sort((a, b) => {
      const aCo =
        orgLow &&
        ((a.companyName || '').toLowerCase().includes(orgLow) ||
          orgLow.includes((a.companyName || '').toLowerCase()))
          ? 0
          : 1;
      const bCo =
        orgLow &&
        ((b.companyName || '').toLowerCase().includes(orgLow) ||
          orgLow.includes((b.companyName || '').toLowerCase()))
          ? 0
          : 1;
      if (aCo !== bCo) return aCo - bCo;
      const aMatch = firstWord && a.displayName.toLowerCase().includes(firstWord) ? 0 : 1;
      const bMatch = firstWord && b.displayName.toLowerCase().includes(firstWord) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      const aEmpty = a.rawScores.trickQuestionsOld === null ? 0 : 1;
      const bEmpty = b.rawScores.trickQuestionsOld === null ? 0 : 1;
      if (aEmpty !== bEmpty) return aEmpty - bEmpty;
      return (a.sheetRowNumber ?? 0) - (b.sheetRowNumber ?? 0);
    });
    return buildPickerOptions(sorted, (m) => {
      const maskVal =
        typeof m.sheetRowNumber === 'number'
          ? loadedData.boldMask?.[m.sheetRowNumber - 1]?.[simpleBenchColIdx]
          : undefined;
      const estimateTag =
        m.rawScores.trickQuestionsOld !== null && maskVal === false
          ? lang === 'de'
            ? ', Schätzwert'
            : ', Estimate'
          : '';
      return m.rawScores.trickQuestionsOld !== null
        ? `${formatExactScore(m.rawScores.trickQuestionsOld, lang)}${estimateTag}`
        : lang === 'de'
        ? 'leer'
        : 'empty';
    });
  };

  const getIntegrityPickerOptions = (row: BenchmarkDiffRowViewModel<IntegrityDiffItem>) => {
    const firstWord = (row.raw.integrityName || '').toLowerCase().split(/[\s-]+/)[0] || '';
    const sorted = [...sheetRowsForPicker].sort((a, b) => {
      const aRow = a.sheetRowNumber ?? 0;
      const bRow = b.sheetRowNumber ?? 0;
      const aAn = integrityColByRow.get(aRow) ?? null;
      const bAn = integrityColByRow.get(bRow) ?? null;
      const aMatch = firstWord && a.displayName.toLowerCase().includes(firstWord) ? 0 : 1;
      const bMatch = firstWord && b.displayName.toLowerCase().includes(firstWord) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      const aEmpty = aAn === null ? 0 : 1;
      const bEmpty = bAn === null ? 0 : 1;
      if (aEmpty !== bEmpty) return aEmpty - bEmpty;
      return aRow - bRow;
    });
    return buildPickerOptions(sorted, (m) => {
      const rowNum = m.sheetRowNumber ?? 0;
      const rowVal = integrityColByRow.get(rowNum) ?? null;
      const maskVal = rowNum > 0 ? loadedData.boldMask?.[rowNum - 1]?.[integrityColIdx] : undefined;
      const estimateTag =
        rowVal !== null && maskVal === false
          ? lang === 'de'
            ? ', Schätzwert'
            : ', Estimate'
          : '';
      return rowVal !== null
        ? `${formatExactScore(rowVal, lang)}${estimateTag}`
        : lang === 'de'
        ? 'leer'
        : 'empty';
    });
  };

  const resolveCompanyFlagAndName = (rawCompany: string) => {
    const needle = (rawCompany || '').trim().toLowerCase();
    if (needle) {
      const match = loadedData.allModels.find(
        (m) =>
          m.companyName.toLowerCase() === needle ||
          m.companyName.toLowerCase().includes(needle) ||
          needle.includes(m.companyName.toLowerCase())
      );
      if (match) {
        return {
          companyName: match.companyName,
          flag: match.flag || getCompanyMeta(rawCompany).flag,
        };
      }
    }
    const meta = getCompanyMeta(rawCompany || 'Unknown');
    return { companyName: rawCompany || meta.name, flag: meta.flag };
  };

  const handlePrepareSheetUpdates = () => {
    setWriteError(null);
    setWriteSuccess(null);

    const changes: PendingSheetCellChange[] = [];

    if (effectiveDiffReport) {
      for (const item of actionablePriceDiffs) {
        if (!selectedPriceIds[item.modelId] || item.sheetRowNumber < minHistoryRow) continue;

        if ((item.deStatus === 'changed' || item.deStatus === 'missing') && item.liveDe) {
          changes.push({
            cellRef: `${colDeLetter}${item.sheetRowNumber}`,
            label: `${item.displayName} (${item.lab} · DE)`,
            before: item.currentDe || (lang === 'de' ? '(leer)' : '(empty)'),
            after: item.liveDe,
            range: `${quoteSheetTitle(sheetTitle)}!${colDeLetter}${item.sheetRowNumber}`,
            value: item.liveDe,
            kind: 'price',
          });
        }

        if (
          colUsIdx !== null &&
          colUsLetter &&
          (item.usStatus === 'changed' || item.usStatus === 'missing') &&
          item.liveUs
        ) {
          changes.push({
            cellRef: `${colUsLetter}${item.sheetRowNumber}`,
            label: `${item.displayName} (${item.lab} · US)`,
            before: item.currentUs || (lang === 'de' ? '(leer)' : '(empty)'),
            after: item.liveUs,
            range: `${quoteSheetTitle(sheetTitle)}!${colUsLetter}${item.sheetRowNumber}`,
            value: item.liveUs,
            kind: 'price',
          });
        }
      }
    }

    const pushBenchmarkExistingChange = (params: {
      kind: PendingSheetCellChange['kind'];
      sourceId: string;
      sourceName: string;
      prefix: string;
      colIdx: number;
      colLetter: string;
      liveScore: number;
      defaultDecimals: number;
      scoreDecimals?: number;
      target: ResolvedBenchmarkTarget;
      itemMatchedModelId: string | null;
      isManualAssignment: boolean;
      applyBold?: boolean;
    }) => {
      if (!params.target.sheetRowNumber || params.target.sheetRowNumber < minHistoryRow) return;
      const sheetModel = sheetRowByNumber.get(params.target.sheetRowNumber);
      const scoreDec = params.scoreDecimals ?? params.defaultDecimals;
      changes.push({
        cellRef: `${params.colLetter}${params.target.sheetRowNumber}`,
        label: `${params.prefix}: ${params.sourceName} → ${
          params.target.matchedDisplayName || params.sourceName
        }`,
        before:
          params.target.currentScore !== null
            ? formatExactScore(params.target.currentScore, lang)
            : lang === 'de'
            ? '(leer)'
            : '(empty)',
        beforeIsBold: params.target.currentIsBold,
        after: formatExactScore(params.liveScore, lang, scoreDec),
        ...(params.applyBold ? { afterIsBold: true, applyBold: true } : {}),
        range: `${quoteSheetTitle(sheetTitle)}!${params.colLetter}${params.target.sheetRowNumber}`,
        value: params.liveScore,
        kind: params.kind,
        sourceId: params.sourceId,
        sheetRowNumber: params.target.sheetRowNumber,
        col0Based: params.colIdx,
        numberFormatPattern: decimalsToPattern(params.liveScore, scoreDec),
        matchedModelId: sheetModel?.id ?? params.itemMatchedModelId ?? undefined,
        matchedDisplayName: sheetModel?.displayName ?? params.target.matchedDisplayName ?? undefined,
        isManualAssignment: params.isManualAssignment,
      });
    };

    const pushBenchmarkNewRowInsert = (params: {
      kind: 'vals' | 'simpleBench';
      sourceId: string;
      sourceName: string;
      companyRaw: string;
      releaseDate: string;
      prefix: string;
      colIdx: number;
      colLetter: string;
      liveScore: number;
      scoreDecimals?: number;
      defaultDecimals: number;
    }) => {
      const scoreDec = params.scoreDecimals ?? params.defaultDecimals;
      const numberFormatPattern = decimalsToPattern(params.liveScore, scoreDec);
      const companyMeta = resolveCompanyFlagAndName(params.companyRaw);
      changes.push({
        cellRef: `${params.colLetter}${firstReleasedHistoryRow}-NEW`,
        label: `${params.prefix}: ${params.sourceName} (${companyMeta.companyName})`,
        before: lang === 'de' ? '(neues Modell)' : '(new model)',
        beforeIsBold: false,
        after: formatExactScore(params.liveScore, lang, scoreDec),
        afterIsBold: true,
        range: `${quoteSheetTitle(sheetTitle)}!${params.colLetter}${firstReleasedHistoryRow}`,
        value: params.liveScore,
        kind: params.kind,
        sourceId: params.sourceId,
        col0Based: params.colIdx,
        applyBold: true,
        numberFormatPattern,
        isNewRowInsert: true,
        newRowSpec: {
          insertAtRow1Based: firstReleasedHistoryRow,
          canonicalName: params.sourceName,
          companyName: companyMeta.companyName,
          releaseDate: params.releaseDate,
          targetCol0Based: params.colIdx,
          targetValue: params.liveScore,
          numberFormatPattern,
        },
      });
    };

    if (effectiveAaDiffReport) {
      for (const { item, target, mDiff } of selectedAaCellEntries) {
        const colIdx = aaColByMetric[mDiff.metric];
        const colLetter = columnIndexToA1(colIdx);
        const metricLabel = AA_METRIC_LABELS[mDiff.metric].short;
        pushBenchmarkExistingChange({
          kind: 'aa',
          sourceId: item.aaId,
          sourceName: `${item.aaName} (${metricLabel})`,
          prefix: 'AA',
          colIdx,
          colLetter,
          liveScore: mDiff.liveScore as number,
          defaultDecimals: 1,
          scoreDecimals: 1,
          target: {
            sheetRowNumber: target.sheetRowNumber,
            matchedDisplayName: target.matchedDisplayName,
            currentScore: mDiff.currentScore,
            currentIsBold: mDiff.currentIsBold,
          },
          itemMatchedModelId: item.matchedModelId,
          isManualAssignment: typeof aaManualOverrides[item.aaId] === 'number',
          applyBold: true,
        });
      }
    }

    if (effectiveGdpxDiffReport) {
      for (const item of selectedGdpxItems) {
        const target = resolveGdpxTarget(item, gdpxSel.manualRowOverrides);
        pushBenchmarkExistingChange({
          kind: 'gdpx',
          sourceId: item.gdpxId,
          sourceName: item.gdpxName,
          prefix: 'GDPx',
          colIdx: gdpxColIdx,
          colLetter: gdpxColLetter,
          liveScore: item.liveScore,
          defaultDecimals: 1,
          scoreDecimals: item.scoreDecimals,
          target,
          itemMatchedModelId: item.matchedModelId,
          isManualAssignment: typeof gdpxSel.manualRowOverrides[item.gdpxId] === 'number',
          applyBold: true,
        });
      }
    }

    if (effectiveValsDiffReport) {
      for (const item of selectedValsItems) {
        const target = resolveValsTarget(item, valsSel.manualRowOverrides);
        if (target.isNewRowInsert) {
          pushBenchmarkNewRowInsert({
            kind: 'vals',
            sourceId: item.valsId,
            sourceName: item.valsName,
            companyRaw: item.company,
            releaseDate: new Date().toISOString().slice(0, 10),
            prefix: 'Vals v2.2',
            colIdx: valsColIdx,
            colLetter: valsColLetter,
            liveScore: item.liveScore,
            scoreDecimals: item.scoreDecimals,
            defaultDecimals: 2,
          });
        } else {
          pushBenchmarkExistingChange({
            kind: 'vals',
            sourceId: item.valsId,
            sourceName: item.valsName,
            prefix: 'Vals v2.2',
            colIdx: valsColIdx,
            colLetter: valsColLetter,
            liveScore: item.liveScore,
            defaultDecimals: 2,
            scoreDecimals: item.scoreDecimals,
            target,
            itemMatchedModelId: item.matchedModelId,
            isManualAssignment: typeof valsSel.manualRowOverrides[item.valsId] === 'number',
            applyBold: true,
          });
        }
      }
    }

    if (effectiveSimpleBenchDiffReport) {
      for (const item of selectedSimpleBenchItems) {
        const target = resolveSimpleBenchTarget(item, sbSel.manualRowOverrides);
        if (target.isNewRowInsert) {
          const releaseDate =
            item.dateAdded && /^\d{4}-\d{2}-\d{2}$/.test(item.dateAdded)
              ? item.dateAdded
              : new Date().toISOString().slice(0, 10);
          pushBenchmarkNewRowInsert({
            kind: 'simpleBench',
            sourceId: item.simpleBenchId,
            sourceName: item.simpleBenchName,
            companyRaw: item.organization,
            releaseDate,
            prefix: 'SimpleBench',
            colIdx: simpleBenchColIdx,
            colLetter: simpleBenchColLetter,
            liveScore: item.liveScore,
            scoreDecimals: item.scoreDecimals,
            defaultDecimals: 1,
          });
        } else {
          pushBenchmarkExistingChange({
            kind: 'simpleBench',
            sourceId: item.simpleBenchId,
            sourceName: item.simpleBenchName,
            prefix: 'SimpleBench',
            colIdx: simpleBenchColIdx,
            colLetter: simpleBenchColLetter,
            liveScore: item.liveScore,
            defaultDecimals: 1,
            scoreDecimals: item.scoreDecimals,
            target,
            itemMatchedModelId: item.matchedModelId,
            isManualAssignment: typeof sbSel.manualRowOverrides[item.simpleBenchId] === 'number',
            applyBold: true,
          });
        }
      }
    }

    if (effectiveIntegrityDiffReport) {
      for (const item of selectedIntegrityItems) {
        const target = resolveIntegrityTarget(item, intSel.manualRowOverrides);
        pushBenchmarkExistingChange({
          kind: 'integrity',
          sourceId: item.integrityId,
          sourceName: item.integrityName,
          prefix: 'Integrity',
          colIdx: integrityColIdx,
          colLetter: integrityColLetter,
          liveScore: item.liveScore,
          defaultDecimals: 1,
          scoreDecimals: item.scoreDecimals,
          target,
          itemMatchedModelId: item.matchedModelId,
          isManualAssignment: typeof intSel.manualRowOverrides[item.integrityId] === 'number',
          applyBold: true,
        });
      }
    }

    if (changes.length === 0) {
      setWriteError(
        lang === 'de'
          ? 'Keine gültigen Änderungen ausgewählt. Bei neuen Modellen bitte zuerst ein Zielmodell zuordnen oder „Als neues Modell ergänzen“ wählen.'
          : 'No valid updates selected. For unmatched models, please assign a target model or choose "Add as new model".'
      );
      return;
    }

    setPendingWrite(changes);
  };

  const handleConfirmSheetWrite = async () => {
    if (!pendingWrite || !accessToken) return;
    setIsWriting(true);
    setWriteError(null);
    setWriteSuccess(null);

    try {
      const targetSheetId = loadedData.activeSheetId ?? MAIN_SHEET_GID;
      const existingUpdates = pendingWrite.filter((c) => !c.isNewRowInsert);
      const newRowInserts = pendingWrite.filter((c) => c.isNewRowInsert && c.newRowSpec);

      let totalUpdatedCells = 0;
      let insertedRowsCount = 0;

      // 1. Update existing rows FIRST before row insertions shift row indices
      if (existingUpdates.length > 0) {
        const updates: CellUpdateSpec[] = existingUpdates.map((c) => ({
          range: c.range,
          value: c.value,
        }));
        const res = await batchUpdateSheetCells(activeSpreadsheetId, updates, accessToken);
        totalUpdatedCells += res.totalUpdatedCells;

        const formatSpecs: CellBoldSpec[] = existingUpdates
          .filter(
            (c) =>
              (c.applyBold || c.numberFormatPattern) &&
              typeof c.sheetRowNumber === 'number' &&
              typeof c.col0Based === 'number'
          )
          .map((c) => ({
            row1Based: c.sheetRowNumber as number,
            col0Based: c.col0Based as number,
            ...(c.applyBold ? { bold: true } : {}),
            ...(c.numberFormatPattern ? { numberFormatPattern: c.numberFormatPattern } : {}),
          }));

        if (formatSpecs.length > 0) {
          await applyCellsBoldFormatting(
            activeSpreadsheetId,
            targetSheetId,
            formatSpecs,
            accessToken
          );
        }
      }

      // 2. Insert new model rows sequentially at firstReleasedHistoryRow using dynamic column layout
      const colNameLabelIdx = layout?.colNameLabel ?? 1;
      const colCreatorYearIdx = layout?.colCreatorYear ?? 2;
      const colModelNameIdx = layout?.colModelName ?? 18;
      const colReleaseIdx = layout?.colReleaseDate ?? 25;
      const colCreatorIdx = layout?.colModelCreator ?? 26;

      const colNameLabelLetter = columnIndexToA1(colNameLabelIdx);
      const colCreatorYearLetter = columnIndexToA1(colCreatorYearIdx);
      const colModelNameLetter = columnIndexToA1(colModelNameIdx);
      const colReleaseLetter = columnIndexToA1(colReleaseIdx);
      const colCreatorLetter = columnIndexToA1(colCreatorIdx);

      // Inspect existing Sheet formulas in adjacent released rows so we clone the user's own
      // composite score formulas (OLD, NEW, Worst Case, or custom formulas) verbatim via PASTE_FORMULA
      // without ever modifying or generating formula logic.
      const templateFormulaOffsets = new Map<number, number>();
      if (newRowInserts.length > 0) {
        try {
          const maxInspectCol = Math.max(
            colCreatorIdx,
            integrityColIdx,
            layout?.colWorstCaseScore ?? 13,
            layout?.colFlag ?? 37,
            45
          );
          const templateRows = await fetchMultiRowFormulas(
            activeSpreadsheetId,
            sheetTitle,
            firstReleasedHistoryRow,
            firstReleasedHistoryRow + 3,
            accessToken,
            columnIndexToA1(maxInspectCol)
          );
          for (let rowOffset = 0; rowOffset < templateRows.length; rowOffset++) {
            const trow = templateRows[rowOffset] || [];
            for (let colIdx = 0; colIdx < trow.length; colIdx++) {
              if (!templateFormulaOffsets.has(colIdx) && String(trow[colIdx] || '').startsWith('=')) {
                templateFormulaOffsets.set(colIdx, rowOffset);
              }
            }
          }
        } catch {
          // If reading template formulas fails, proceed safely without copying formulas
        }
      }

      const benchmarkCols = [
        layout?.colActCodeReason ?? 3,
        layout?.colNonHallucination ?? 4,
        layout?.colScienceKnowledge ?? 5,
        layout?.colVisionPlot ?? 6,
        layout?.colMedReasoning ?? 7,
        layout?.colExcelAgent ?? 8,
        gdpxColIdx,
        valsColIdx,
        simpleBenchColIdx,
        integrityColIdx,
      ];

      for (const item of newRowInserts) {
        const spec = item.newRowSpec!;
        const rowNum = spec.insertAtRow1Based;
        const companyMeta = resolveCompanyFlagAndName(spec.companyName);
        const colBValue = `${companyMeta.flag} ${spec.canonicalName}✦NEW`;
        const colCValue = formatCreatorColC(companyMeta.companyName, spec.releaseDate);
        const targetColLetter = columnIndexToA1(spec.targetCol0Based);
        const quotedTitle = quoteSheetTitle(sheetTitle);

        const sparseUpdates: CellUpdateSpec[] = [
          { range: `${quotedTitle}!${colNameLabelLetter}${rowNum}`, value: colBValue },
          { range: `${quotedTitle}!${colCreatorYearLetter}${rowNum}`, value: colCValue },
          { range: `${quotedTitle}!${colModelNameLetter}${rowNum}`, value: spec.canonicalName },
          { range: `${quotedTitle}!${colReleaseLetter}${rowNum}`, value: spec.releaseDate },
          { range: `${quotedTitle}!${colCreatorLetter}${rowNum}`, value: companyMeta.companyName },
          { range: `${quotedTitle}!${targetColLetter}${rowNum}`, value: spec.targetValue },
        ];

        const explicitlyWrittenCols = new Set<number>([
          colNameLabelIdx,
          colCreatorYearIdx,
          colModelNameIdx,
          colReleaseIdx,
          colCreatorIdx,
          spec.targetCol0Based,
        ]);

        const formulaCopySpecs: FormulaCopySpec[] = [];
        for (const [colIdx, rowOffset] of templateFormulaOffsets.entries()) {
          if (!explicitlyWrittenCols.has(colIdx)) {
            formulaCopySpecs.push({
              sourceRow1BasedAfterInsert: rowNum + 1 + rowOffset,
              col0Based: colIdx,
            });
          }
        }

        const boldSpecs: CellBoldSpec[] = benchmarkCols.map((colIdx) => ({
          row1Based: rowNum,
          col0Based: colIdx,
          bold: colIdx === spec.targetCol0Based,
          ...(colIdx === spec.targetCol0Based && spec.numberFormatPattern
            ? { numberFormatPattern: spec.numberFormatPattern }
            : {}),
        }));

        const insertRes = await insertRowAndWriteSparseCells(
          activeSpreadsheetId,
          targetSheetId,
          rowNum,
          sparseUpdates,
          boldSpecs,
          accessToken,
          formulaCopySpecs
        );
        totalUpdatedCells += insertRes.totalUpdatedCells;
        insertedRowsCount += 1;
      }

      const aaMappings: Record<string, ManualRowMapping> = {};
      const gdpxMappings: Record<string, ManualRowMapping> = {};
      const valsMappings: Record<string, ManualRowMapping> = {};
      const simpleBenchMappings: Record<string, ManualRowMapping> = {};
      const integrityMappings: Record<string, ManualRowMapping> = {};
      for (const c of existingUpdates) {
        if (!c.isManualAssignment || !c.sourceId || !c.sheetRowNumber) continue;
        const mapping: ManualRowMapping = {
          sheetRowNumber: c.sheetRowNumber,
          ...(c.matchedModelId ? { matchedModelId: c.matchedModelId } : {}),
          ...(c.matchedDisplayName ? { matchedDisplayName: c.matchedDisplayName } : {}),
        };
        if (c.kind === 'aa') aaMappings[c.sourceId] = mapping;
        else if (c.kind === 'gdpx') gdpxMappings[c.sourceId] = mapping;
        else if (c.kind === 'vals') valsMappings[c.sourceId] = mapping;
        else if (c.kind === 'simpleBench') simpleBenchMappings[c.sourceId] = mapping;
        else if (c.kind === 'integrity') integrityMappings[c.sourceId] = mapping;
      }

      if (
        onSaveManualMappings &&
        (Object.keys(aaMappings).length > 0 ||
          Object.keys(gdpxMappings).length > 0 ||
          Object.keys(valsMappings).length > 0 ||
          Object.keys(simpleBenchMappings).length > 0 ||
          Object.keys(integrityMappings).length > 0)
      ) {
        await onSaveManualMappings({
          aa: Object.keys(aaMappings).length > 0 ? aaMappings : undefined,
          gdpx: Object.keys(gdpxMappings).length > 0 ? gdpxMappings : undefined,
          vals: Object.keys(valsMappings).length > 0 ? valsMappings : undefined,
          simpleBench:
            Object.keys(simpleBenchMappings).length > 0 ? simpleBenchMappings : undefined,
          integrity: Object.keys(integrityMappings).length > 0 ? integrityMappings : undefined,
        });
      }

      setWriteSuccess(
        lang === 'de'
          ? `${totalUpdatedCells} Wert(e)${
              insertedRowsCount > 0 ? ` und ${insertedRowsCount} neues Modell` : ''
            } erfolgreich im Google Sheet aktualisiert.`
          : `Successfully updated ${totalUpdatedCells} value(s)${
              insertedRowsCount > 0 ? ` and ${insertedRowsCount} new model(s)` : ''
            } in Google Sheets.`
      );
      setPendingWrite(null);
      setAaManualOverrides({});
      gdpxSel.clearOverrides();
      valsSel.clearOverrides();
      sbSel.clearOverrides();
      intSel.clearOverrides();
      await onRefreshFromSheets(activeSpreadsheetId);
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : 'Failed to update Google Sheet.');
      setPendingWrite(null);
    } finally {
      setIsWriting(false);
    }
  };

  // --- Full-Row New Model Research & Insert (all used Sheet columns) ---
  const handleResearchNewModel = async (req: Omit<ModelResearchRequest, 'existingCompanies'>) => {
    const key = `${req.sourceMonitor}:${req.sourceId}`;
    setResearchingRowId(key);
    setWriteError(null);
    setWriteSuccess(null);
    try {
      const seen = new Set<string>();
      const existingCompanies: Array<{ name: string; flag: string; domain?: string }> = [];
      for (const m of loadedData.allModels) {
        const cleanName = (m.companyName || '').trim();
        if (!cleanName) continue;
        const low = cleanName.toLowerCase();
        if (seen.has(low)) continue;
        seen.add(low);
        existingCompanies.push({
          name: cleanName,
          flag: m.flag || '',
          domain: m.companyDomain || undefined,
        });
      }
      const draft = await requestNewModelRowDraft({
        ...req,
        existingCompanies,
      });
      setActiveRowDraft(draft);
    } catch (err) {
      setWriteError(
        err instanceof Error
          ? err.message
          : lang === 'de'
          ? 'Modell-Recherche fehlgeschlagen.'
          : 'Model research failed.'
      );
    } finally {
      setResearchingRowId(null);
    }
  };

  const handleConfirmWriteFullRow = async (draft: NewModelRowDraft) => {
    if (!accessToken) {
      setWriteError(
        lang === 'de'
          ? 'Bitte zuerst mit Google anmelden, um eine Zeile ins Sheet zu schreiben.'
          : 'Please sign in with Google first to write a row to Google Sheets.'
      );
      return;
    }

    setIsWritingFullRow(true);
    setWriteError(null);
    setWriteSuccess(null);

    try {
      const targetSheetId = loadedData.activeSheetId ?? MAIN_SHEET_GID;
      const rowNum = firstReleasedHistoryRow;
      const quotedTitle = quoteSheetTitle(sheetTitle);

      const colNameLabelIdx = layout?.colNameLabel ?? 1;
      const colCreatorYearIdx = layout?.colCreatorYear ?? 2;
      const colStorylineIdx = layout?.colStoryline ?? 14;
      const colChatLinkIdx = layout?.colChatLink ?? 15;
      const colApiLinkIdx = layout?.colApiLink ?? 16;
      const colModelNameIdx = layout?.colModelName ?? 18;
      const colReleaseIdx = layout?.colReleaseDate ?? 25;
      const colCreatorIdx = layout?.colModelCreator ?? 26;

      // Clone existing Sheet formulas (Col A Logo, Col L/M/N composite scores, etc.) verbatim
      const templateFormulaOffsets = new Map<number, number>();
      try {
        const maxInspectCol = Math.max(
          colCreatorIdx,
          integrityColIdx,
          layout?.colWorstCaseScore ?? 13,
          layout?.colFlag ?? 37,
          45
        );
        const templateRows = await fetchMultiRowFormulas(
          activeSpreadsheetId,
          sheetTitle,
          rowNum,
          rowNum + 3,
          accessToken,
          columnIndexToA1(maxInspectCol)
        );
        for (let rowOffset = 0; rowOffset < templateRows.length; rowOffset++) {
          const trow = templateRows[rowOffset] || [];
          for (let colIdx = 0; colIdx < trow.length; colIdx++) {
            if (!templateFormulaOffsets.has(colIdx) && String(trow[colIdx] || '').startsWith('=')) {
              templateFormulaOffsets.set(colIdx, rowOffset);
            }
          }
        }
      } catch {
        // Proceed safely without cloning formulas if inspection fails
      }

      const colBValue = `${draft.countryFlag ? `${draft.countryFlag} ` : ''}${
        draft.displayNameColB || draft.canonicalName
      }${draft.hasFreeApi ? ' 🌐' : ''}✦NEW${draft.isPaidOnly ? ' 💲' : ''}`.trim();
      const colCValue = formatCreatorColC(draft.companyName, draft.releaseDate);

      const sparseUpdates: CellUpdateSpec[] = [];
      const explicitlyWrittenCols = new Set<number>();
      const pushCell = (colIdx: number, value: string | number) => {
        sparseUpdates.push({
          range: `${quotedTitle}!${columnIndexToA1(colIdx)}${rowNum}`,
          value,
        });
        explicitlyWrittenCols.add(colIdx);
      };

      pushCell(colNameLabelIdx, colBValue);
      pushCell(colCreatorYearIdx, colCValue);
      pushCell(colModelNameIdx, draft.canonicalName.trim());
      if (draft.releaseDate.trim()) pushCell(colReleaseIdx, draft.releaseDate.trim());
      if (draft.companyName.trim()) pushCell(colCreatorIdx, draft.companyName.trim());
      if (draft.storyline.trim()) pushCell(colStorylineIdx, draft.storyline.trim());

      const chatLinkVal = draft.chatLink.trim() || (draft.isPaidOnly ? 'paid' : '');
      if (chatLinkVal) pushCell(colChatLinkIdx, chatLinkVal);
      if (draft.apiLink.trim()) pushCell(colApiLinkIdx, draft.apiLink.trim());
      if (draft.priceDeMonthly.trim()) pushCell(colDeIdx, draft.priceDeMonthly.trim());
      if (colUsIdx !== null && draft.priceUsMonthly.trim()) {
        pushCell(colUsIdx, draft.priceUsMonthly.trim());
      }

      const benchmarkMappings: Array<{
        key: keyof NewModelRowDraft['benchmarks'];
        colIdx: number;
        defaultDecimals: number;
      }> = [
        { key: 'iq', colIdx: aaColByMetric.iq, defaultDecimals: 1 },
        { key: 'nonHallucination', colIdx: aaColByMetric.nonHallucination, defaultDecimals: 1 },
        { key: 'accuracy', colIdx: aaColByMetric.accuracy, defaultDecimals: 1 },
        { key: 'mmmuPro', colIdx: aaColByMetric.mmmuPro, defaultDecimals: 1 },
        { key: 'mlcr', colIdx: aaColByMetric.mlcr, defaultDecimals: 1 },
        { key: 'excelAgent', colIdx: aaColByMetric.excelAgent, defaultDecimals: 1 },
        { key: 'gdpx', colIdx: gdpxColIdx, defaultDecimals: 1 },
        { key: 'vals', colIdx: valsColIdx, defaultDecimals: 2 },
        { key: 'simpleBench', colIdx: simpleBenchColIdx, defaultDecimals: 1 },
        { key: 'integrity', colIdx: integrityColIdx, defaultDecimals: 1 },
      ];

      const boldSpecs: CellBoldSpec[] = [];
      for (const bm of benchmarkMappings) {
        const cell = draft.benchmarks[bm.key];
        if (cell.value !== null && Number.isFinite(cell.value)) {
          pushCell(bm.colIdx, cell.value);
          boldSpecs.push({
            row1Based: rowNum,
            col0Based: bm.colIdx,
            bold: Boolean(cell.isOfficial),
            numberFormatPattern: decimalsToPattern(cell.value, bm.defaultDecimals),
          });
        } else {
          boldSpecs.push({
            row1Based: rowNum,
            col0Based: bm.colIdx,
            bold: false,
          });
        }
      }

      const formulaCopySpecs: FormulaCopySpec[] = [];
      for (const [colIdx, rowOffset] of templateFormulaOffsets.entries()) {
        if (!explicitlyWrittenCols.has(colIdx)) {
          formulaCopySpecs.push({
            sourceRow1BasedAfterInsert: rowNum + 1 + rowOffset,
            col0Based: colIdx,
          });
        }
      }

      const res = await insertRowAndWriteSparseCells(
        activeSpreadsheetId,
        targetSheetId,
        rowNum,
        sparseUpdates,
        boldSpecs,
        accessToken,
        formulaCopySpecs
      );

      setActiveRowDraft(null);
      setWriteSuccess(
        lang === 'de'
          ? `Komplette Zeile für „${draft.canonicalName}“ in Zeile ${rowNum} angelegt (${res.totalUpdatedCells} Zellen + Formeln geklont).`
          : `Created complete row for "${draft.canonicalName}" at row ${rowNum} (${res.totalUpdatedCells} cells + cloned formulas).`
      );
      await onRefreshFromSheets(activeSpreadsheetId);
    } catch (err) {
      setWriteError(
        err instanceof Error
          ? err.message
          : lang === 'de'
          ? 'Konnte neue Modellzeile nicht ins Google Sheet schreiben.'
          : 'Failed to write new model row to Google Sheets.'
      );
    } finally {
      setIsWritingFullRow(false);
    }
  };

  const totalBadgeAlerts =
    (effectiveDiffReport?.changedCount ?? 0) +
    (effectiveAaDiffReport?.actionableCount ?? 0) +
    (effectiveGdpxDiffReport?.actionableCount ?? 0) +
    (effectiveValsDiffReport?.actionableCount ?? 0) +
    (effectiveSimpleBenchDiffReport?.actionableCount ?? 0) +
    (effectiveIntegrityDiffReport?.actionableCount ?? 0);

  const errorBanners = [
    checkError,
    aaCheckError,
    gdpxCheckError,
    valsCheckError,
    simpleBenchCheckError,
    integrityCheckError,
    writeError,
  ].filter((msg): msg is string => Boolean(msg));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-5">
      <div className="relative w-full max-w-[1360px] max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                totalBadgeAlerts > 0
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {lang === 'de'
                  ? 'Tarife, Preis-, AA (6)-, GDPx-, Vals-, SimpleBench- & Integrity-Prüfer'
                  : 'Plans, Price, AA (6), GDPx, Vals, SimpleBench & Integrity Checker'}
              </h2>
              <p className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span>
                  {isUsingLiveReport
                    ? `${lang === 'de' ? 'Preise' : 'Plans'}: ${formatMonitorTimestamp(displayedTimestamp, lang)}`
                    : `${lang === 'de' ? 'Tarife' : 'Snapshot'}: ${formatMonitorTimestamp(displayedTimestamp, lang)}`}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {apiAvailable && (
              <>
                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dailyAutoEnabled}
                    onChange={(e) => onToggleDailyAuto(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Auto (24h)</span>
                </label>

                <button
                  type="button"
                  onClick={() => void handleRunAllChecks()}
                  disabled={isAnyChecking || !accessToken}
                  title={
                    !accessToken
                      ? lang === 'de'
                        ? 'Bitte zuerst mit Google anmelden'
                        : 'Sign in with Google first'
                      : undefined
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnyChecking ? 'animate-spin' : ''}`} />
                  <span>
                    {isAnyChecking
                      ? lang === 'de'
                        ? 'Prüfe…'
                        : 'Checking…'
                      : lang === 'de'
                      ? 'Live prüfen'
                      : 'Check Live'}
                  </span>
                </button>

                {!accessToken && (
                  <button
                    type="button"
                    onClick={() => void onSignIn()}
                    disabled={isSigningIn}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-55 shrink-0"
                  >
                    <svg className="w-3.5 h-3.5 block shrink-0" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>
                      {isSigningIn
                        ? lang === 'de'
                          ? 'Verbinde…'
                          : 'Signing in…'
                        : lang === 'de'
                        ? 'Mit Google anmelden'
                        : 'Sign in with Google'}
                    </span>
                  </button>
                )}
              </>
            )}

            {(accessToken || authUser) && onSignOut && (
              <button
                type="button"
                onClick={() => void onSignOut()}
                title={lang === 'de' ? 'Von Google abmelden' : 'Sign out of Google'}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={lang === 'de' ? 'Von Google abmelden' : 'Sign out of Google'}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorBanners.map((msg, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{msg}</span>
            </div>
          ))}

          {writeSuccess && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{writeSuccess}</span>
            </div>
          )}

          <PlansOverviewGrid
            lang={lang}
            displayedLabs={displayedLabs}
            displayedSources={displayedSources}
          />

          {!apiAvailable && (
            <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>
                {lang === 'de'
                  ? 'Statische Vorschau ohne Server-Backend: Live-Prüfungen & Google-Sheet-Diffs stehen nur mit dem Full-Stack-Server zur Verfügung.'
                  : 'Static preview without backend server: live checks and Google Sheet diffs require the full-stack server.'}
              </span>
              {onRetryConnection && (
                <button
                  type="button"
                  onClick={() => void onRetryConnection()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{lang === 'de' ? 'Server prüfen' : 'Retry Server'}</span>
                </button>
              )}
            </div>
          )}

          {apiAvailable && isSheetsConnected && isChecking && !effectiveDiffReport && (
            <div className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 flex items-center gap-2.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {lang === 'de' ? 'Prüfe Live-Preise…' : 'Checking live pricing…'}
              </span>
            </div>
          )}

          {effectiveDiffReport && (
            <PricingDiffSection
              lang={lang}
              report={effectiveDiffReport}
              actionableDiffs={actionablePriceDiffs}
              selectedPriceIds={selectedPriceIds}
              onTogglePriceItem={(modelId) =>
                setSelectedPriceIds((prev) => ({ ...prev, [modelId]: !prev[modelId] }))
              }
            />
          )}

          {apiAvailable && (
            <>
              {/* Artificial Analysis 6-Column Section (Columns D–I) */}
              <ArtificialAnalysisDiffSection
                lang={lang}
                isChecking={isCheckingAa}
                isSheetsConnected={isSheetsConnected}
                rawReport={aaReport}
                effectiveReport={effectiveAaDiffReport}
                actionableRows={aaRows}
                ignoredRows={aaIgnored}
                mappedRows={aaMapped}
                selectedCells={selectedAaCells}
                manualRowOverrides={aaManualOverrides}
                showIgnored={aaShowIgnored}
                minHistoryRow={minHistoryRow}
                researchingRowId={researchingRowId}
                onToggleShowIgnored={() => setAaShowIgnored((prev) => !prev)}
                onToggleMetricCell={handleToggleAaMetricCell}
                onToggleRowAllMetrics={handleToggleAaRowAllMetrics}
                onToggleSectionAll={handleToggleAaSectionAll}
                onAssignManualRow={handleAssignAaManualRow}
                onRestoreModel={onRestoreAaModel}
                onRemoveManualMapping={onRemoveAaMapping}
                onResearchNewModel={(item) =>
                  void handleResearchNewModel({
                    sourceMonitor: 'aa',
                    sourceId: item.aaId,
                    modelName: item.aaName,
                    creatorHint: item.creator || undefined,
                    isOpenWeightsHint: item.isOpenWeights,
                    knownScores: {
                      iq: item.liveScores.iq,
                      nonHallucination: item.liveScores.nonHallucination,
                      accuracy: item.liveScores.accuracy,
                      mmmuPro: item.liveScores.mmmuPro,
                      mlcr: item.liveScores.mlcr,
                      excelAgent: item.liveScores.excelAgent,
                    },
                  })
                }
                resolveTarget={(item) => resolveAaTarget(item)}
                getPickerOptionsForRow={getAaPickerOptions}
              />

              {/* GDPx Section */}
              <BenchmarkDiffSection<GdpxDiffItem>
                lang={lang}
                accent="indigo"
                icon={<Trophy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                title={lang === 'de' ? 'GDPx-Prüfer' : 'GDPx Checker'}
                sourceUrl="https://gdpx.semianalysis.com/"
                sourceDomainLabel="gdpx.semianalysis.com"
                headerCountText={
                  gdpxReport
                    ? `${gdpxReport.totalSourceModels} LLMs${
                        gdpxReport.sourceUpdatedAt ? ` · ${gdpxReport.sourceUpdatedAt}` : ''
                      }`
                    : undefined
                }
                modelColumnHeader={lang === 'de' ? 'GDPx-Modell' : 'GDPx Model'}
                scoreColumnHeader={lang === 'de' ? 'Vergleich' : 'Comparison'}
                checkingText={
                  lang === 'de'
                    ? 'Prüfe gdpx.semianalysis.com…'
                    : 'Checking gdpx.semianalysis.com…'
                }
                bannerPrefixActionable={
                  effectiveGdpxDiffReport
                    ? lang === 'de'
                      ? `GDPx: ${effectiveGdpxDiffReport.actionableCount} Änderung(en):`
                      : `GDPx: ${effectiveGdpxDiffReport.actionableCount} update(s):`
                    : ''
                }
                bannerPrefixOk="GDPx OK:"
                unmatchedPillLabel={lang === 'de' ? 'Neu' : 'New'}
                unmatchedBadgeLabel={lang === 'de' ? 'Neues LLM' : 'New LLM'}
                missingBadgeLabel={lang === 'de' ? 'Fehlt' : 'Missing'}
                estimateBadgeLabel={lang === 'de' ? 'Schätzwert' : 'Estimate'}
                changedBadgeLabel={lang === 'de' ? 'Geändert' : 'Changed'}
                unchangedOkLabel="OK"
                supportsBoldState={true}
                showSelectAllToggle={false}
                showRankInRow={false}
                minHistoryRow={minHistoryRow}
                assignPlaceholder={lang === 'de' ? '— Zuordnen —' : '— Assign —'}
                isChecking={isCheckingGdpx}
                isSheetsConnected={isSheetsConnected}
                rawReport={gdpxReport}
                effectiveReport={effectiveGdpxDiffReport}
                actionableRows={gdpxRows}
                ignoredRows={gdpxIgnored}
                mappedRows={gdpxMapped}
                selectedIds={gdpxSel.selectedIds}
                manualRowOverrides={gdpxSel.manualRowOverrides}
                showIgnored={gdpxSel.showIgnored}
                onToggleShowIgnored={gdpxSel.toggleShowIgnored}
                onToggleItem={gdpxSel.toggleItem}
                onToggleAll={gdpxSel.toggleAll}
                onAssignManualRow={(id, val) => gdpxSel.assignManualRow(id, val, false)}
                onRestoreModel={onRestoreGdpxModel}
                onRemoveManualMapping={onRemoveGdpxMapping}
                resolveTarget={(row) => resolveGdpxTarget(row.raw, gdpxSel.manualRowOverrides)}
                getPickerOptionsForRow={getGdpxPickerOptions}
                defaultLiveDecimals={1}
                researchingRowId={researchingRowId}
                researchKeyPrefix="gdpx"
                onResearchNewModel={(row) =>
                  void handleResearchNewModel({
                    sourceMonitor: 'gdpx',
                    sourceId: row.id,
                    modelName: row.name,
                    creatorHint: row.raw.lab || undefined,
                    knownScores: { gdpx: row.liveScore },
                  })
                }
              />

              {/* Vals Index Section */}
              <BenchmarkDiffSection<ValsDiffItem>
                lang={lang}
                accent="cyan"
                icon={<Briefcase className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400 shrink-0" />}
                title={
                  lang === 'de'
                    ? `Vals Index ${valsReport?.versionLabel || 'v2.2'}-Prüfer`
                    : `Vals Index ${valsReport?.versionLabel || 'v2.2'} Checker`
                }
                sourceUrl="https://www.vals.ai/benchmarks/vals_index"
                sourceDomainLabel="vals.ai/benchmarks/vals_index"
                headerCountText={
                  valsReport
                    ? `${valsReport.totalSourceModels} Einträge${
                        valsReport.sourceUpdatedAt ? ` · ${valsReport.sourceUpdatedAt}` : ''
                      }`
                    : undefined
                }
                modelColumnHeader={lang === 'de' ? 'Vals-Modell' : 'Vals Model'}
                scoreColumnHeader={lang === 'de' ? 'Vergleich' : 'Comparison'}
                checkingText={
                  lang === 'de'
                    ? 'Prüfe vals.ai (Vals Index v2.2)…'
                    : 'Checking vals.ai (Vals Index v2.2)…'
                }
                bannerPrefixActionable={
                  effectiveValsDiffReport
                    ? lang === 'de'
                      ? `Vals ${effectiveValsDiffReport.versionLabel}: ${effectiveValsDiffReport.actionableCount} Änderung(en):`
                      : `Vals ${effectiveValsDiffReport.versionLabel}: ${effectiveValsDiffReport.actionableCount} update(s):`
                    : ''
                }
                bannerPrefixOk={`Vals ${effectiveValsDiffReport?.versionLabel || 'v2.2'} OK:`}
                unmatchedPillLabel={lang === 'de' ? 'Neu' : 'New'}
                unmatchedBadgeLabel={lang === 'de' ? 'Neu / Ergänzen' : 'New / Insert'}
                missingBadgeLabel={lang === 'de' ? 'Fehlt' : 'Missing'}
                estimateBadgeLabel={lang === 'de' ? 'Schätzwert' : 'Estimate'}
                changedBadgeLabel={lang === 'de' ? 'Geändert' : 'Changed'}
                unchangedOkLabel="OK"
                supportsBoldState={true}
                supportsInsertNewRow={true}
                showSelectAllToggle={true}
                showRankInRow={true}
                minHistoryRow={minHistoryRow}
                assignPlaceholder={
                  lang === 'de' ? '— Zuordnen / ergänzen —' : '— Assign / Add —'
                }
                isChecking={isCheckingVals}
                isSheetsConnected={isSheetsConnected}
                rawReport={valsReport}
                effectiveReport={effectiveValsDiffReport}
                actionableRows={valsRows}
                ignoredRows={valsIgnored}
                mappedRows={valsMapped}
                selectedIds={valsSel.selectedIds}
                manualRowOverrides={valsSel.manualRowOverrides}
                showIgnored={valsSel.showIgnored}
                onToggleShowIgnored={valsSel.toggleShowIgnored}
                onToggleItem={valsSel.toggleItem}
                onToggleAll={valsSel.toggleAll}
                onAssignManualRow={(id, val) => valsSel.assignManualRow(id, val, true)}
                onRestoreModel={onRestoreValsModel}
                onRemoveManualMapping={onRemoveValsMapping}
                resolveTarget={(row) => resolveValsTarget(row.raw, valsSel.manualRowOverrides)}
                getPickerOptionsForRow={getValsPickerOptions}
                defaultLiveDecimals={2}
                researchingRowId={researchingRowId}
                researchKeyPrefix="vals"
                onResearchNewModel={(row) =>
                  void handleResearchNewModel({
                    sourceMonitor: 'vals',
                    sourceId: row.id,
                    modelName: row.name,
                    creatorHint: row.raw.company || undefined,
                    knownScores: { vals: row.liveScore },
                  })
                }
              />

              {/* SimpleBench Section */}
              <BenchmarkDiffSection<SimpleBenchDiffItem>
                lang={lang}
                accent="amber"
                icon={<HelpCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />}
                title={lang === 'de' ? 'SimpleBench-Prüfer' : 'SimpleBench Checker'}
                sourceUrl="https://simple-bench.com/"
                sourceDomainLabel="simple-bench.com"
                headerCountText={
                  simpleBenchReport
                    ? `${simpleBenchReport.totalSourceModels} LLMs${
                        simpleBenchReport.sourceUpdatedAt
                          ? ` · ${simpleBenchReport.sourceUpdatedAt}`
                          : ''
                      }`
                    : undefined
                }
                modelColumnHeader={lang === 'de' ? 'SimpleBench-Modell' : 'SimpleBench Model'}
                scoreColumnHeader={lang === 'de' ? 'Vergleich' : 'Comparison'}
                checkingText={
                  lang === 'de'
                    ? 'Prüfe simple-bench.com…'
                    : 'Checking simple-bench.com…'
                }
                bannerPrefixActionable={
                  effectiveSimpleBenchDiffReport
                    ? lang === 'de'
                      ? `SimpleBench: ${effectiveSimpleBenchDiffReport.actionableCount} Änderung(en):`
                      : `SimpleBench: ${effectiveSimpleBenchDiffReport.actionableCount} update(s):`
                    : ''
                }
                bannerPrefixOk="SimpleBench OK:"
                unmatchedPillLabel={lang === 'de' ? 'Neu' : 'New'}
                unmatchedBadgeLabel={lang === 'de' ? 'Neu / Ergänzen' : 'New / Insert'}
                missingBadgeLabel={lang === 'de' ? 'Fehlt' : 'Missing'}
                estimateBadgeLabel={lang === 'de' ? 'Schätzwert' : 'Estimate'}
                changedBadgeLabel={lang === 'de' ? 'Geändert' : 'Changed'}
                unchangedOkLabel="OK"
                supportsBoldState={true}
                supportsInsertNewRow={true}
                showSelectAllToggle={true}
                showRankInRow={true}
                minHistoryRow={minHistoryRow}
                assignPlaceholder={
                  lang === 'de' ? '— Zuordnen / ergänzen —' : '— Assign / Add —'
                }
                isChecking={isCheckingSimpleBench}
                isSheetsConnected={isSheetsConnected}
                rawReport={simpleBenchReport}
                effectiveReport={effectiveSimpleBenchDiffReport}
                actionableRows={simpleBenchRows}
                ignoredRows={simpleBenchIgnored}
                mappedRows={simpleBenchMapped}
                selectedIds={sbSel.selectedIds}
                manualRowOverrides={sbSel.manualRowOverrides}
                showIgnored={sbSel.showIgnored}
                onToggleShowIgnored={sbSel.toggleShowIgnored}
                onToggleItem={sbSel.toggleItem}
                onToggleAll={sbSel.toggleAll}
                onAssignManualRow={(id, val) => sbSel.assignManualRow(id, val, true)}
                onRestoreModel={onRestoreSimpleBenchModel}
                onRemoveManualMapping={onRemoveSimpleBenchMapping}
                resolveTarget={(row) => resolveSimpleBenchTarget(row.raw, sbSel.manualRowOverrides)}
                getPickerOptionsForRow={getSimpleBenchPickerOptions}
                defaultLiveDecimals={1}
                researchingRowId={researchingRowId}
                researchKeyPrefix="simpleBench"
                onResearchNewModel={(row) =>
                  void handleResearchNewModel({
                    sourceMonitor: 'simpleBench',
                    sourceId: row.id,
                    modelName: row.name,
                    creatorHint: row.raw.organization || undefined,
                    releaseDateHint: row.raw.dateAdded || undefined,
                    knownScores: { simpleBench: row.liveScore },
                  })
                }
              />

              {/* Integrity-Bench Section */}
              <BenchmarkDiffSection<IntegrityDiffItem>
                lang={lang}
                accent="teal"
                icon={<Scale className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                title={lang === 'de' ? 'Integrity-Prüfer' : 'Integrity Checker'}
                sourceUrl="https://integrity-bench.com/"
                sourceDomainLabel="integrity-bench.com"
                headerCountText={
                  integrityReport
                    ? `${integrityReport.totalSourceModels} LLMs${
                        integrityReport.sourceUpdatedAt
                          ? ` · ${formatMonitorTimestamp(integrityReport.sourceUpdatedAt, lang)}`
                          : ''
                      }`
                    : undefined
                }
                modelColumnHeader={lang === 'de' ? 'Integrity-Modell' : 'Integrity Model'}
                scoreColumnHeader={lang === 'de' ? 'Vergleich' : 'Comparison'}
                checkingText={
                  lang === 'de'
                    ? 'Prüfe integrity-bench.com ("Table")…'
                    : 'Checking integrity-bench.com ("Table")…'
                }
                bannerPrefixActionable={
                  effectiveIntegrityDiffReport
                    ? lang === 'de'
                      ? `Integrity: ${effectiveIntegrityDiffReport.actionableCount} Änderung(en):`
                      : `Integrity: ${effectiveIntegrityDiffReport.actionableCount} update(s):`
                    : ''
                }
                bannerPrefixOk="Integrity OK:"
                unmatchedPillLabel={lang === 'de' ? 'Offen' : 'Unmatched'}
                unmatchedBadgeLabel={lang === 'de' ? 'Offen' : 'Unmatched'}
                missingBadgeLabel={lang === 'de' ? 'Fehlt' : 'Missing'}
                estimateBadgeLabel={lang === 'de' ? 'Schätzwert' : 'Estimate'}
                changedBadgeLabel={lang === 'de' ? 'Geändert' : 'Changed'}
                unchangedOkLabel="OK"
                supportsBoldState={true}
                showSelectAllToggle={true}
                showRankInRow={true}
                minHistoryRow={minHistoryRow}
                assignPlaceholder={lang === 'de' ? '— Zuordnen —' : '— Assign —'}
                isChecking={isCheckingIntegrity}
                isSheetsConnected={isSheetsConnected}
                rawReport={integrityReport}
                effectiveReport={effectiveIntegrityDiffReport}
                actionableRows={integrityRows}
                ignoredRows={integrityIgnored}
                mappedRows={integrityMapped}
                selectedIds={intSel.selectedIds}
                manualRowOverrides={intSel.manualRowOverrides}
                showIgnored={intSel.showIgnored}
                onToggleShowIgnored={intSel.toggleShowIgnored}
                onToggleItem={intSel.toggleItem}
                onToggleAll={intSel.toggleAll}
                onAssignManualRow={(id, val) => intSel.assignManualRow(id, val, false)}
                onRestoreModel={onRestoreIntegrityModel}
                onRemoveManualMapping={onRemoveIntegrityMapping}
                resolveTarget={(row) => resolveIntegrityTarget(row.raw, intSel.manualRowOverrides)}
                getPickerOptionsForRow={getIntegrityPickerOptions}
                defaultLiveDecimals={1}
                researchingRowId={researchingRowId}
                researchKeyPrefix="integrity"
                onResearchNewModel={(row) =>
                  void handleResearchNewModel({
                    sourceMonitor: 'integrity',
                    sourceId: row.id,
                    modelName: row.name,
                    knownScores: { integrity: row.liveScore },
                  })
                }
              />
            </>
          )}

          {/* Unified Sheet Update Action Bar */}
          {apiAvailable && isSheetsConnected && hasAnyActionable && accessToken && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs text-slate-700 dark:text-slate-300">
                {lang === 'de'
                  ? 'Ausgewählte Änderungen direkt ins Google Sheet übernehmen.'
                  : 'Apply selected updates directly to Google Sheets.'}
              </span>

              <button
                type="button"
                disabled={totalSelectedCount === 0}
                onClick={handlePrepareSheetUpdates}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {lang === 'de'
                    ? `${totalSelectedCount} ausgewählte Änderung(en) prüfen & ins Sheet schreiben`
                    : `Review & Write ${totalSelectedCount} Selected Update(s) to Sheet`}
                </span>
              </button>
            </div>
          )}
        </div>

        {pendingWrite && (
          <SheetWriteConfirmDialog
            lang={lang}
            pendingWrite={pendingWrite}
            isWriting={isWriting}
            onCancel={() => setPendingWrite(null)}
            onConfirm={handleConfirmSheetWrite}
          />
        )}

        {activeRowDraft && (
          <NewModelRowDraftDialog
            lang={lang}
            draft={activeRowDraft}
            insertRowNumber={firstReleasedHistoryRow}
            isWriting={isWritingFullRow}
            onCancel={() => {
              if (!isWritingFullRow) setActiveRowDraft(null);
            }}
            onConfirmWrite={handleConfirmWriteFullRow}
          />
        )}
      </div>
    </div>
  );
};
