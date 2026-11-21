import React, { useMemo, useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Clock,
  ShieldCheck,
  ArrowRight,
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
  insertRowAndWriteSparseCells,
  MAIN_SHEET_GID,
  quoteSheetTitle,
} from '../services/googleSheetsService';
import { getCompanyMeta } from '../data/companies';
import {
  MonitoredLab,
  PricingCheckReport,
  PricingDiffItem,
} from '../types/pricingMonitor';
import {
  GdpxCheckReport,
  GdpxDiffItem,
  GdpxDiffStatus,
} from '../types/gdpxMonitor';
import {
  IntegrityCheckReport,
  IntegrityDiffItem,
  IntegrityDiffStatus,
  ManualRowMapping,
} from '../types/integrityMonitor';
import {
  INTEGRITY_COL_INDEX,
  parseIntegrityCellNumber,
} from '../services/integrityMonitorService';
import {
  ValsCheckReport,
  ValsDiffItem,
  ValsDiffStatus,
} from '../types/valsMonitor';
import { VALS_COL_INDEX } from '../services/valsMonitorService';
import {
  SimpleBenchCheckReport,
  SimpleBenchDiffItem,
  SimpleBenchDiffStatus,
} from '../types/simpleBenchMonitor';
import { DEFAULT_SIMPLEBENCH_COL_INDEX } from '../services/simpleBenchMonitorService';
import {
  DEFAULT_LAB_PLANS,
  DEFAULT_PRICING_SNAPSHOT_DATE,
} from '../data/pricingPlansFallback';
import { Language } from '../utils/i18n';
import { roundCurrencyString, roundCurrencyTokensInText } from '../utils/priceFormat';

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
  onIgnoreValsModel?: (valsId: string) => Promise<void>;
  onRestoreValsModel?: (valsId: string) => Promise<void>;
  onIgnoreSimpleBenchModel?: (simpleBenchId: string) => Promise<void>;
  onRestoreSimpleBenchModel?: (simpleBenchId: string) => Promise<void>;
  onIgnoreIntegrityModel?: (integrityId: string) => Promise<void>;
  onRestoreIntegrityModel?: (integrityId: string) => Promise<void>;
  onSaveManualMappings?: (mappings: {
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

const LAB_ORDER: MonitoredLab[] = ['OpenAI', 'Anthropic', 'Google', 'Meta'];

const LAB_ACCENT: Record<MonitoredLab, string> = {
  OpenAI: 'border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/60 dark:bg-emerald-950/20',
  Anthropic: 'border-amber-200 dark:border-amber-900/70 bg-amber-50/60 dark:bg-amber-950/20',
  Google: 'border-blue-200 dark:border-blue-900/70 bg-blue-50/60 dark:bg-blue-950/20',
  Meta: 'border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/60 dark:bg-indigo-950/20',
};

const LAB_BADGE: Record<MonitoredLab, string> = {
  OpenAI: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300',
  Anthropic: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300',
  Google: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300',
  Meta: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300',
};

const GDPX_COL_INDEX = 9; // Column J (SemiAnalysis GDPx v1)
const GDPX_COL_LETTER = columnIndexToA1(GDPX_COL_INDEX); // "J"
const VALS_COL_LETTER = columnIndexToA1(VALS_COL_INDEX); // "K"
const INTEGRITY_COL_LETTER = columnIndexToA1(INTEGRITY_COL_INDEX); // "AN"
const IGNORE_OPTION_VALUE = '__IGNORE__';
const INSERT_NEW_ROW_OPTION_VALUE = -1;

interface PendingSheetCellChange {
  cellRef: string;
  label: string;
  before: string;
  beforeIsBold?: boolean | null;
  after: string;
  afterIsBold?: boolean;
  range: string;
  value: string | number;
  kind: 'price' | 'gdpx' | 'integrity' | 'vals' | 'simpleBench';
  sourceId?: string;
  sheetRowNumber?: number;
  col0Based?: number;
  applyBold?: boolean;
  matchedModelId?: string;
  matchedDisplayName?: string;
  isManualAssignment?: boolean;
  isNewRowInsert?: boolean;
  newRowSpec?: {
    insertAtRow1Based: number;
    canonicalName: string;
    companyName: string;
    releaseDate: string;
    targetCol0Based: number;
    targetValue: string | number;
  };
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
  onIgnoreValsModel,
  onRestoreValsModel,
  onIgnoreSimpleBenchModel,
  onRestoreSimpleBenchModel,
  onIgnoreIntegrityModel,
  onRestoreIntegrityModel,
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
  const [selectedGdpxIds, setSelectedGdpxIds] = useState<Record<string, boolean>>({});
  const [manualGdpxRowOverrides, setManualGdpxRowOverrides] = useState<Record<string, number>>({});
  const [selectedValsIds, setSelectedValsIds] = useState<Record<string, boolean>>({});
  const [manualValsRowOverrides, setManualValsRowOverrides] = useState<Record<string, number>>({});
  const [selectedSimpleBenchIds, setSelectedSimpleBenchIds] = useState<Record<string, boolean>>({});
  const [manualSimpleBenchRowOverrides, setManualSimpleBenchRowOverrides] = useState<
    Record<string, number>
  >({});
  const [selectedIntegrityIds, setSelectedIntegrityIds] = useState<Record<string, boolean>>({});
  const [manualIntegrityRowOverrides, setManualIntegrityRowOverrides] = useState<
    Record<string, number>
  >({});
  const [showIgnoredGdpx, setShowIgnoredGdpx] = useState(false);
  const [showIgnoredVals, setShowIgnoredVals] = useState(false);
  const [showIgnoredSimpleBench, setShowIgnoredSimpleBench] = useState(false);
  const [showIgnoredIntegrity, setShowIgnoredIntegrity] = useState(false);
  const [pendingWrite, setPendingWrite] = useState<PendingSheetCellChange[] | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeSuccess, setWriteSuccess] = useState<string | null>(null);

  const layout = loadedData.columnLayout;
  const colDeIdx = layout?.colDePrice ?? 19;
  const colUsIdx = layout?.colUsPrice ?? null;
  const simpleBenchColIdx = layout?.colTrickOld ?? DEFAULT_SIMPLEBENCH_COL_INDEX;
  const colDeLetter = columnIndexToA1(colDeIdx);
  const colUsLetter = colUsIdx !== null ? columnIndexToA1(colUsIdx) : null;
  const simpleBenchColLetter = columnIndexToA1(simpleBenchColIdx);
  const sheetTitle = loadedData.activeSheetTitle || 'Sheet1';

  const effectiveDiffReport =
    apiAvailable && isSheetsConnected && isDiffValid && report ? report : null;

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
      .filter((m) => typeof m.sheetRowNumber === 'number' && m.sheetRowNumber >= 36)
      .sort((a, b) => (a.sheetRowNumber ?? 9999) - (b.sheetRowNumber ?? 9999));
  }, [loadedData.allModels]);

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
    return firstReleased?.sheetRowNumber ?? loadedData.historyStartRow ?? 36;
  }, [sheetRowsForPicker, loadedData.historyStartRow]);

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
        const rawCell = rawRows?.[m.sheetRowNumber - 1]?.[INTEGRITY_COL_INDEX];
        map.set(m.sheetRowNumber, parseIntegrityCellNumber(rawCell));
      }
    }
    return map;
  }, [sheetRowsForPicker, loadedData.rawRows]);

  // Pre-select changed prices
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
        next[item.modelId] = hasChange;
      }
    }
    setSelectedPriceIds(next);
  }, [effectiveDiffReport]);

  // Pre-select actionable GDPx rows
  useEffect(() => {
    if (!effectiveGdpxDiffReport) {
      setSelectedGdpxIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of effectiveGdpxDiffReport.diffs) {
      if (
        item.status === 'missing' ||
        item.status === 'overwrite_estimate' ||
        item.status === 'changed'
      ) {
        next[item.gdpxId] = true;
      }
    }
    setSelectedGdpxIds(next);
  }, [effectiveGdpxDiffReport]);

  // Pre-select actionable Vals Index v2.2 rows
  useEffect(() => {
    if (!effectiveValsDiffReport) {
      setSelectedValsIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of effectiveValsDiffReport.diffs) {
      if (
        item.status === 'missing' ||
        item.status === 'overwrite_estimate' ||
        item.status === 'changed'
      ) {
        next[item.valsId] = true;
      }
    }
    setSelectedValsIds(next);
  }, [effectiveValsDiffReport]);

  // Pre-select actionable SimpleBench rows
  useEffect(() => {
    if (!effectiveSimpleBenchDiffReport) {
      setSelectedSimpleBenchIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of effectiveSimpleBenchDiffReport.diffs) {
      if (
        item.status === 'missing' ||
        item.status === 'overwrite_estimate' ||
        item.status === 'changed'
      ) {
        next[item.simpleBenchId] = true;
      }
    }
    setSelectedSimpleBenchIds(next);
  }, [effectiveSimpleBenchDiffReport]);

  // Pre-select actionable Integrity-Bench rows
  useEffect(() => {
    if (!effectiveIntegrityDiffReport) {
      setSelectedIntegrityIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of effectiveIntegrityDiffReport.diffs) {
      if (
        item.status === 'missing' ||
        item.status === 'overwrite_estimate' ||
        item.status === 'changed'
      ) {
        next[item.integrityId] = true;
      }
    }
    setSelectedIntegrityIds(next);
  }, [effectiveIntegrityDiffReport]);

  useEffect(() => {
    if (isOpen) {
      setWriteError(null);
      setWriteSuccess(null);
      setPendingWrite(null);
      setManualGdpxRowOverrides({});
      setManualValsRowOverrides({});
      setManualSimpleBenchRowOverrides({});
      setManualIntegrityRowOverrides({});
      setShowIgnoredGdpx(false);
      setShowIgnoredVals(false);
      setShowIgnoredSimpleBench(false);
      setShowIgnoredIntegrity(false);
    }
  }, [isOpen]);

  const actionablePriceDiffs = useMemo(() => {
    if (!effectiveDiffReport) return [];
    return effectiveDiffReport.diffs.filter(
      (d) => d.deStatus !== 'unchanged' || d.usStatus !== 'unchanged'
    );
  }, [effectiveDiffReport]);

  const actionableGdpxDiffs = useMemo(() => {
    if (!effectiveGdpxDiffReport) return [];
    return effectiveGdpxDiffReport.diffs.filter(
      (d) => d.status !== 'unchanged' && d.status !== 'ignored'
    );
  }, [effectiveGdpxDiffReport]);

  const ignoredGdpxDiffs = useMemo(() => {
    if (!effectiveGdpxDiffReport) return [];
    return effectiveGdpxDiffReport.diffs.filter((d) => d.status === 'ignored');
  }, [effectiveGdpxDiffReport]);

  const actionableValsDiffs = useMemo(() => {
    if (!effectiveValsDiffReport) return [];
    return effectiveValsDiffReport.diffs.filter(
      (d) => d.status !== 'unchanged' && d.status !== 'ignored'
    );
  }, [effectiveValsDiffReport]);

  const ignoredValsDiffs = useMemo(() => {
    if (!effectiveValsDiffReport) return [];
    return effectiveValsDiffReport.diffs.filter((d) => d.status === 'ignored');
  }, [effectiveValsDiffReport]);

  const actionableSimpleBenchDiffs = useMemo(() => {
    if (!effectiveSimpleBenchDiffReport) return [];
    return effectiveSimpleBenchDiffReport.diffs.filter(
      (d) => d.status !== 'unchanged' && d.status !== 'ignored'
    );
  }, [effectiveSimpleBenchDiffReport]);

  const ignoredSimpleBenchDiffs = useMemo(() => {
    if (!effectiveSimpleBenchDiffReport) return [];
    return effectiveSimpleBenchDiffReport.diffs.filter((d) => d.status === 'ignored');
  }, [effectiveSimpleBenchDiffReport]);

  const actionableIntegrityDiffs = useMemo(() => {
    if (!effectiveIntegrityDiffReport) return [];
    return effectiveIntegrityDiffReport.diffs.filter(
      (d) => d.status !== 'unchanged' && d.status !== 'ignored'
    );
  }, [effectiveIntegrityDiffReport]);

  const ignoredIntegrityDiffs = useMemo(() => {
    if (!effectiveIntegrityDiffReport) return [];
    return effectiveIntegrityDiffReport.diffs.filter((d) => d.status === 'ignored');
  }, [effectiveIntegrityDiffReport]);

  const resolveEffectiveGdpxTarget = (item: GdpxDiffItem) => {
    const overrideRow = manualGdpxRowOverrides[item.gdpxId];
    if (typeof overrideRow === 'number' && overrideRow >= 36) {
      const sheetModel = sheetRowByNumber.get(overrideRow);
      return {
        sheetRowNumber: overrideRow,
        matchedDisplayName: sheetModel?.displayName || `Row ${overrideRow}`,
        currentColJ:
          sheetModel && typeof sheetModel.rawScores.trickQuestions === 'number'
            ? sheetModel.rawScores.trickQuestions
            : null,
      };
    }
    return {
      sheetRowNumber: item.sheetRowNumber,
      matchedDisplayName: item.matchedDisplayName,
      currentColJ: item.currentColJ,
    };
  };

  const resolveEffectiveValsTarget = (item: ValsDiffItem) => {
    const overrideRow = manualValsRowOverrides[item.valsId];
    if (overrideRow === INSERT_NEW_ROW_OPTION_VALUE) {
      return {
        sheetRowNumber: null as number | null,
        isNewRowInsert: true,
        matchedDisplayName: item.valsName,
        currentColK: null as number | null,
        currentColKIsBold: null as boolean | null,
      };
    }
    if (typeof overrideRow === 'number' && overrideRow >= 36) {
      const sheetModel = sheetRowByNumber.get(overrideRow);
      const maskCell = loadedData.boldMask?.[overrideRow - 1]?.[VALS_COL_INDEX];
      return {
        sheetRowNumber: overrideRow,
        isNewRowInsert: false,
        matchedDisplayName: sheetModel?.displayName || `Row ${overrideRow}`,
        currentColK:
          sheetModel && typeof sheetModel.rawScores.econLegal === 'number'
            ? sheetModel.rawScores.econLegal
            : null,
        currentColKIsBold: typeof maskCell === 'boolean' ? maskCell : null,
      };
    }
    return {
      sheetRowNumber: item.sheetRowNumber,
      isNewRowInsert: false,
      matchedDisplayName: item.matchedDisplayName,
      currentColK: item.currentColK,
      currentColKIsBold: item.currentColKIsBold,
    };
  };

  const resolveEffectiveSimpleBenchTarget = (item: SimpleBenchDiffItem) => {
    const overrideRow = manualSimpleBenchRowOverrides[item.simpleBenchId];
    if (overrideRow === INSERT_NEW_ROW_OPTION_VALUE) {
      return {
        sheetRowNumber: null as number | null,
        isNewRowInsert: true,
        matchedDisplayName: item.simpleBenchName,
        currentColY: null as number | null,
        currentColYIsBold: null as boolean | null,
      };
    }
    if (typeof overrideRow === 'number' && overrideRow >= 36) {
      const sheetModel = sheetRowByNumber.get(overrideRow);
      const rawVal = sheetModel?.rawScores.trickQuestionsOld;
      const roundedVal =
        typeof rawVal === 'number' && Number.isFinite(rawVal)
          ? Math.round(rawVal * 10) / 10
          : null;
      const maskCell = loadedData.boldMask?.[overrideRow - 1]?.[simpleBenchColIdx];
      return {
        sheetRowNumber: overrideRow,
        isNewRowInsert: false,
        matchedDisplayName: sheetModel?.displayName || `Row ${overrideRow}`,
        currentColY: roundedVal,
        currentColYIsBold: typeof maskCell === 'boolean' ? maskCell : null,
      };
    }
    return {
      sheetRowNumber: item.sheetRowNumber,
      isNewRowInsert: false,
      matchedDisplayName: item.matchedDisplayName,
      currentColY: item.currentColY,
      currentColYIsBold: item.currentColYIsBold,
    };
  };

  const resolveEffectiveIntegrityTarget = (item: IntegrityDiffItem) => {
    const overrideRow = manualIntegrityRowOverrides[item.integrityId];
    if (typeof overrideRow === 'number' && overrideRow >= 36) {
      const sheetModel = sheetRowByNumber.get(overrideRow);
      return {
        sheetRowNumber: overrideRow,
        matchedDisplayName: sheetModel?.displayName || `Row ${overrideRow}`,
        currentColAN: integrityColByRow.get(overrideRow) ?? null,
      };
    }
    return {
      sheetRowNumber: item.sheetRowNumber,
      matchedDisplayName: item.matchedDisplayName,
      currentColAN: item.currentColAN,
    };
  };

  const selectedPriceCount = useMemo(() => {
    return actionablePriceDiffs.filter((d) => selectedPriceIds[d.modelId]).length;
  }, [actionablePriceDiffs, selectedPriceIds]);

  const selectedGdpxItems = useMemo(() => {
    return actionableGdpxDiffs.filter((item) => {
      if (!selectedGdpxIds[item.gdpxId]) return false;
      const target = resolveEffectiveGdpxTarget(item);
      return typeof target.sheetRowNumber === 'number' && target.sheetRowNumber >= 36;
    });
  }, [actionableGdpxDiffs, selectedGdpxIds, manualGdpxRowOverrides, sheetRowByNumber]);

  const selectedValsItems = useMemo(() => {
    return actionableValsDiffs.filter((item) => {
      if (!selectedValsIds[item.valsId]) return false;
      const target = resolveEffectiveValsTarget(item);
      return (
        target.isNewRowInsert ||
        (typeof target.sheetRowNumber === 'number' && target.sheetRowNumber >= 36)
      );
    });
  }, [
    actionableValsDiffs,
    selectedValsIds,
    manualValsRowOverrides,
    sheetRowByNumber,
    loadedData.boldMask,
  ]);

  const selectedSimpleBenchItems = useMemo(() => {
    return actionableSimpleBenchDiffs.filter((item) => {
      if (!selectedSimpleBenchIds[item.simpleBenchId]) return false;
      const target = resolveEffectiveSimpleBenchTarget(item);
      return (
        target.isNewRowInsert ||
        (typeof target.sheetRowNumber === 'number' && target.sheetRowNumber >= 36)
      );
    });
  }, [
    actionableSimpleBenchDiffs,
    selectedSimpleBenchIds,
    manualSimpleBenchRowOverrides,
    sheetRowByNumber,
    loadedData.boldMask,
    simpleBenchColIdx,
  ]);

  const selectedIntegrityItems = useMemo(() => {
    return actionableIntegrityDiffs.filter((item) => {
      if (!selectedIntegrityIds[item.integrityId]) return false;
      const target = resolveEffectiveIntegrityTarget(item);
      return typeof target.sheetRowNumber === 'number' && target.sheetRowNumber >= 36;
    });
  }, [
    actionableIntegrityDiffs,
    selectedIntegrityIds,
    manualIntegrityRowOverrides,
    sheetRowByNumber,
    integrityColByRow,
  ]);

  const totalSelectedCount =
    selectedPriceCount +
    selectedGdpxItems.length +
    selectedValsItems.length +
    selectedSimpleBenchItems.length +
    selectedIntegrityItems.length;
  const hasAnyActionable =
    actionablePriceDiffs.length > 0 ||
    actionableGdpxDiffs.length > 0 ||
    actionableValsDiffs.length > 0 ||
    actionableSimpleBenchDiffs.length > 0 ||
    actionableIntegrityDiffs.length > 0;
  const isAnyChecking =
    isChecking ||
    isCheckingGdpx ||
    isCheckingVals ||
    isCheckingSimpleBench ||
    isCheckingIntegrity;

  const displayedLabs = useMemo(() => {
    return report?.labs && report.labs.length > 0 ? report.labs : DEFAULT_LAB_PLANS;
  }, [report]);

  const displayedSources = report?.sources ?? [];
  const displayedTimestamp = report?.checkedAt || DEFAULT_PRICING_SNAPSHOT_DATE;
  const isUsingLiveReport = Boolean(report?.labs && report.labs.length > 0);

  if (!isOpen) return null;

  const formatTimestamp = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatGdpxScore = (val: number | null | undefined) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
    const rounded = Math.round(val * 100) / 100;
    return lang === 'de' ? String(rounded).replace('.', ',') : String(rounded);
  };

  const formatValsScore = (val: number | null | undefined, decimals = 0) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
    if (decimals > 0) {
      const fixed = val.toFixed(decimals);
      return lang === 'de' ? fixed.replace('.', ',') : fixed;
    }
    return String(Math.round(val));
  };

  const formatSimpleBenchScore = (val: number | null | undefined) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
    const rounded = Math.round(val * 10) / 10;
    const formatted = rounded.toFixed(1);
    return lang === 'de' ? formatted.replace('.', ',') : formatted;
  };

  const formatIntegrityScore = (val: number | null | undefined) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
    const rounded = Math.round(val * 10) / 10;
    const formatted = rounded.toFixed(1);
    return lang === 'de' ? formatted.replace('.', ',') : formatted;
  };

  const handleRunAllChecks = async () => {
    await Promise.allSettled([
      isSheetsConnected ? onRunCheck() : Promise.resolve(),
      onRunGdpxCheck(),
      onRunValsCheck(),
      onRunSimpleBenchCheck(),
      onRunIntegrityCheck(),
    ]);
  };

  const handleTogglePriceItem = (modelId: string) => {
    setSelectedPriceIds((prev) => ({ ...prev, [modelId]: !prev[modelId] }));
  };

  const handleToggleGdpxItem = (gdpxId: string) => {
    setSelectedGdpxIds((prev) => ({ ...prev, [gdpxId]: !prev[gdpxId] }));
  };

  const handleToggleValsItem = (valsId: string) => {
    setSelectedValsIds((prev) => ({ ...prev, [valsId]: !prev[valsId] }));
  };

  const handleToggleAllVals = (checked: boolean) => {
    if (!checked) {
      setSelectedValsIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of actionableValsDiffs) {
      const target = resolveEffectiveValsTarget(item);
      if (target.isNewRowInsert || (target.sheetRowNumber && target.sheetRowNumber >= 36)) {
        next[item.valsId] = true;
      }
    }
    setSelectedValsIds(next);
  };

  const handleToggleSimpleBenchItem = (simpleBenchId: string) => {
    setSelectedSimpleBenchIds((prev) => ({
      ...prev,
      [simpleBenchId]: !prev[simpleBenchId],
    }));
  };

  const handleToggleAllSimpleBench = (checked: boolean) => {
    if (!checked) {
      setSelectedSimpleBenchIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of actionableSimpleBenchDiffs) {
      const target = resolveEffectiveSimpleBenchTarget(item);
      if (target.isNewRowInsert || (target.sheetRowNumber && target.sheetRowNumber >= 36)) {
        next[item.simpleBenchId] = true;
      }
    }
    setSelectedSimpleBenchIds(next);
  };

  const handleToggleIntegrityItem = (integrityId: string) => {
    setSelectedIntegrityIds((prev) => ({ ...prev, [integrityId]: !prev[integrityId] }));
  };

  const handleToggleAllIntegrity = (checked: boolean) => {
    if (!checked) {
      setSelectedIntegrityIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of actionableIntegrityDiffs) {
      const target = resolveEffectiveIntegrityTarget(item);
      if (target.sheetRowNumber && target.sheetRowNumber >= 36) {
        next[item.integrityId] = true;
      }
    }
    setSelectedIntegrityIds(next);
  };

  const handleAssignManualGdpxRow = (gdpxId: string, rowNumStr: string) => {
    if (rowNumStr === IGNORE_OPTION_VALUE) {
      setManualGdpxRowOverrides((prev) => {
        const next = { ...prev };
        delete next[gdpxId];
        return next;
      });
      setSelectedGdpxIds((prev) => ({ ...prev, [gdpxId]: false }));
      void onIgnoreGdpxModel?.(gdpxId);
      return;
    }

    const rowNum = Number(rowNumStr);
    if (!Number.isFinite(rowNum) || rowNum < 36) {
      setManualGdpxRowOverrides((prev) => {
        const next = { ...prev };
        delete next[gdpxId];
        return next;
      });
      setSelectedGdpxIds((prev) => ({ ...prev, [gdpxId]: false }));
      return;
    }
    setManualGdpxRowOverrides((prev) => ({ ...prev, [gdpxId]: rowNum }));
    setSelectedGdpxIds((prev) => ({ ...prev, [gdpxId]: true }));
  };

  const handleAssignManualValsRow = (valsId: string, rowNumStr: string) => {
    if (rowNumStr === IGNORE_OPTION_VALUE) {
      setManualValsRowOverrides((prev) => {
        const next = { ...prev };
        delete next[valsId];
        return next;
      });
      setSelectedValsIds((prev) => ({ ...prev, [valsId]: false }));
      void onIgnoreValsModel?.(valsId);
      return;
    }

    const rowNum = Number(rowNumStr);
    if (rowNum === INSERT_NEW_ROW_OPTION_VALUE) {
      setManualValsRowOverrides((prev) => ({ ...prev, [valsId]: INSERT_NEW_ROW_OPTION_VALUE }));
      setSelectedValsIds((prev) => ({ ...prev, [valsId]: true }));
      return;
    }

    if (!Number.isFinite(rowNum) || rowNum < 36) {
      setManualValsRowOverrides((prev) => {
        const next = { ...prev };
        delete next[valsId];
        return next;
      });
      setSelectedValsIds((prev) => ({ ...prev, [valsId]: false }));
      return;
    }
    setManualValsRowOverrides((prev) => ({ ...prev, [valsId]: rowNum }));
    setSelectedValsIds((prev) => ({ ...prev, [valsId]: true }));
  };

  const handleAssignManualSimpleBenchRow = (simpleBenchId: string, rowNumStr: string) => {
    if (rowNumStr === IGNORE_OPTION_VALUE) {
      setManualSimpleBenchRowOverrides((prev) => {
        const next = { ...prev };
        delete next[simpleBenchId];
        return next;
      });
      setSelectedSimpleBenchIds((prev) => ({ ...prev, [simpleBenchId]: false }));
      void onIgnoreSimpleBenchModel?.(simpleBenchId);
      return;
    }

    const rowNum = Number(rowNumStr);
    if (rowNum === INSERT_NEW_ROW_OPTION_VALUE) {
      setManualSimpleBenchRowOverrides((prev) => ({
        ...prev,
        [simpleBenchId]: INSERT_NEW_ROW_OPTION_VALUE,
      }));
      setSelectedSimpleBenchIds((prev) => ({ ...prev, [simpleBenchId]: true }));
      return;
    }

    if (!Number.isFinite(rowNum) || rowNum < 36) {
      setManualSimpleBenchRowOverrides((prev) => {
        const next = { ...prev };
        delete next[simpleBenchId];
        return next;
      });
      setSelectedSimpleBenchIds((prev) => ({ ...prev, [simpleBenchId]: false }));
      return;
    }
    setManualSimpleBenchRowOverrides((prev) => ({ ...prev, [simpleBenchId]: rowNum }));
    setSelectedSimpleBenchIds((prev) => ({ ...prev, [simpleBenchId]: true }));
  };

  const handleAssignManualIntegrityRow = (integrityId: string, rowNumStr: string) => {
    if (rowNumStr === IGNORE_OPTION_VALUE) {
      setManualIntegrityRowOverrides((prev) => {
        const next = { ...prev };
        delete next[integrityId];
        return next;
      });
      setSelectedIntegrityIds((prev) => ({ ...prev, [integrityId]: false }));
      void onIgnoreIntegrityModel?.(integrityId);
      return;
    }

    const rowNum = Number(rowNumStr);
    if (!Number.isFinite(rowNum) || rowNum < 36) {
      setManualIntegrityRowOverrides((prev) => {
        const next = { ...prev };
        delete next[integrityId];
        return next;
      });
      setSelectedIntegrityIds((prev) => ({ ...prev, [integrityId]: false }));
      return;
    }
    setManualIntegrityRowOverrides((prev) => ({ ...prev, [integrityId]: rowNum }));
    setSelectedIntegrityIds((prev) => ({ ...prev, [integrityId]: true }));
  };

  const sortedPickerOptionsFor = (lab: string) => {
    const labLow = (lab || '').toLowerCase();
    return [...sheetRowsForPicker].sort((a, b) => {
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
  };

  const sortedValsPickerOptionsFor = (company: string, modelName: string) => {
    const coLow = (company || '').toLowerCase();
    const firstWord = (modelName || '').toLowerCase().split(/[\s-]+/)[0] || '';
    return [...sheetRowsForPicker].sort((a, b) => {
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
  };

  const sortedSimpleBenchPickerOptionsFor = (organization: string, modelName: string) => {
    const orgLow = (organization || '').toLowerCase();
    const firstWord = (modelName || '').toLowerCase().split(/[\s-]+/)[0] || '';
    return [...sheetRowsForPicker].sort((a, b) => {
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
  };

  const sortedIntegrityPickerOptionsFor = (modelName: string) => {
    const firstWord = (modelName || '').toLowerCase().split(/[\s-]+/)[0] || '';
    return [...sheetRowsForPicker].sort((a, b) => {
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

  const formatCreatorColC = (companyName: string, isoDate: string): string => {
    const deMonths = [
      'Jan',
      'Feb',
      'Mär',
      'Apr',
      'Mai',
      'Jun',
      'Jul',
      'Aug',
      'Sept',
      'Okt',
      'Nov',
      'Dez',
    ];
    const m = /^(\d{4})-(\d{2})/.exec(isoDate);
    if (!m) return companyName;
    const monIdx = Math.max(0, Math.min(11, parseInt(m[2], 10) - 1));
    const yy = m[1].slice(2);
    return `${companyName} ${deMonths[monIdx]} ${yy}`;
  };

  const handlePrepareSheetUpdates = () => {
    setWriteError(null);
    setWriteSuccess(null);

    const changes: PendingSheetCellChange[] = [];

    if (effectiveDiffReport) {
      for (const item of actionablePriceDiffs) {
        if (!selectedPriceIds[item.modelId]) continue;
        // Strict guard: never write to Rows 1-35
        if (item.sheetRowNumber < 36) continue;

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

    if (effectiveGdpxDiffReport) {
      for (const item of selectedGdpxItems) {
        const target = resolveEffectiveGdpxTarget(item);
        if (!target.sheetRowNumber || target.sheetRowNumber < 36) continue;
        const sheetModel = sheetRowByNumber.get(target.sheetRowNumber);
        const isManualAssignment = typeof manualGdpxRowOverrides[item.gdpxId] === 'number';

        const numericScore = Math.round(item.liveScore * 10) / 10;
        changes.push({
          cellRef: `${GDPX_COL_LETTER}${target.sheetRowNumber}`,
          label: `GDPx: ${item.gdpxName} → ${target.matchedDisplayName || `Zeile ${target.sheetRowNumber}`}`,
          before:
            target.currentColJ !== null
              ? formatGdpxScore(target.currentColJ)
              : lang === 'de'
              ? '(leer)'
              : '(empty)',
          after: formatGdpxScore(numericScore),
          range: `${quoteSheetTitle(sheetTitle)}!${GDPX_COL_LETTER}${target.sheetRowNumber}`,
          value: numericScore,
          kind: 'gdpx',
          sourceId: item.gdpxId,
          sheetRowNumber: target.sheetRowNumber,
          matchedModelId: sheetModel?.id ?? item.matchedModelId ?? undefined,
          matchedDisplayName: sheetModel?.displayName ?? target.matchedDisplayName ?? undefined,
          isManualAssignment,
        });
      }
    }

    if (effectiveValsDiffReport) {
      for (const item of selectedValsItems) {
        const target = resolveEffectiveValsTarget(item);
        const numericScore = item.writeScore;
        if (target.isNewRowInsert) {
          const companyMeta = resolveCompanyFlagAndName(item.company);
          const todayIso = new Date().toISOString().slice(0, 10);
          changes.push({
            cellRef: `${VALS_COL_LETTER}${firstReleasedHistoryRow} (NEU)`,
            label: `Vals v2.2 NEU: ${item.valsName} (${companyMeta.companyName}) → neue Zeile ${firstReleasedHistoryRow}`,
            before: lang === 'de' ? '(neue Zeile in Tabelle)' : '(new row in table)',
            beforeIsBold: false,
            after: `${formatValsScore(numericScore)} (${formatValsScore(item.liveScore, 2)}%)`,
            afterIsBold: true,
            range: `${quoteSheetTitle(sheetTitle)}!${VALS_COL_LETTER}${firstReleasedHistoryRow}`,
            value: numericScore,
            kind: 'vals',
            sourceId: item.valsId,
            col0Based: VALS_COL_INDEX,
            applyBold: true,
            isNewRowInsert: true,
            newRowSpec: {
              insertAtRow1Based: firstReleasedHistoryRow,
              canonicalName: item.valsName,
              companyName: companyMeta.companyName,
              releaseDate: todayIso,
              targetCol0Based: VALS_COL_INDEX,
              targetValue: numericScore,
            },
          });
          continue;
        }

        if (!target.sheetRowNumber || target.sheetRowNumber < 36) continue;
        const sheetModel = sheetRowByNumber.get(target.sheetRowNumber);
        const isManualAssignment = typeof manualValsRowOverrides[item.valsId] === 'number';
        changes.push({
          cellRef: `${VALS_COL_LETTER}${target.sheetRowNumber}`,
          label: `Vals v2.2: ${item.valsName} → ${target.matchedDisplayName || `Zeile ${target.sheetRowNumber}`}`,
          before:
            target.currentColK !== null
              ? formatValsScore(target.currentColK)
              : lang === 'de'
              ? '(leer)'
              : '(empty)',
          beforeIsBold: target.currentColKIsBold,
          after: `${formatValsScore(numericScore)} (${formatValsScore(item.liveScore, 2)}%)`,
          afterIsBold: true,
          range: `${quoteSheetTitle(sheetTitle)}!${VALS_COL_LETTER}${target.sheetRowNumber}`,
          value: numericScore,
          kind: 'vals',
          sourceId: item.valsId,
          sheetRowNumber: target.sheetRowNumber,
          col0Based: VALS_COL_INDEX,
          applyBold: true,
          matchedModelId: sheetModel?.id ?? item.matchedModelId ?? undefined,
          matchedDisplayName: sheetModel?.displayName ?? target.matchedDisplayName ?? undefined,
          isManualAssignment,
        });
      }
    }

    if (effectiveSimpleBenchDiffReport) {
      for (const item of selectedSimpleBenchItems) {
        const target = resolveEffectiveSimpleBenchTarget(item);
        const numericScore = Math.round(item.liveScore * 10) / 10;
        if (target.isNewRowInsert) {
          const companyMeta = resolveCompanyFlagAndName(item.organization);
          const releaseDate =
            item.dateAdded && /^\d{4}-\d{2}-\d{2}$/.test(item.dateAdded)
              ? item.dateAdded
              : new Date().toISOString().slice(0, 10);
          changes.push({
            cellRef: `${simpleBenchColLetter}${firstReleasedHistoryRow} (NEU)`,
            label: `SimpleBench NEU: ${item.simpleBenchName} (${companyMeta.companyName}) → neue Zeile ${firstReleasedHistoryRow}`,
            before: lang === 'de' ? '(neue Zeile in Tabelle)' : '(new row in table)',
            beforeIsBold: false,
            after: formatSimpleBenchScore(numericScore),
            afterIsBold: true,
            range: `${quoteSheetTitle(sheetTitle)}!${simpleBenchColLetter}${firstReleasedHistoryRow}`,
            value: numericScore,
            kind: 'simpleBench',
            sourceId: item.simpleBenchId,
            col0Based: simpleBenchColIdx,
            applyBold: true,
            isNewRowInsert: true,
            newRowSpec: {
              insertAtRow1Based: firstReleasedHistoryRow,
              canonicalName: item.simpleBenchName,
              companyName: companyMeta.companyName,
              releaseDate,
              targetCol0Based: simpleBenchColIdx,
              targetValue: numericScore,
            },
          });
          continue;
        }

        if (!target.sheetRowNumber || target.sheetRowNumber < 36) continue;
        const sheetModel = sheetRowByNumber.get(target.sheetRowNumber);
        const isManualAssignment =
          typeof manualSimpleBenchRowOverrides[item.simpleBenchId] === 'number';
        changes.push({
          cellRef: `${simpleBenchColLetter}${target.sheetRowNumber}`,
          label: `SimpleBench: ${item.simpleBenchName} → ${target.matchedDisplayName || `Zeile ${target.sheetRowNumber}`}`,
          before:
            target.currentColY !== null
              ? formatSimpleBenchScore(target.currentColY)
              : lang === 'de'
              ? '(leer)'
              : '(empty)',
          beforeIsBold: target.currentColYIsBold,
          after: formatSimpleBenchScore(numericScore),
          afterIsBold: true,
          range: `${quoteSheetTitle(sheetTitle)}!${simpleBenchColLetter}${target.sheetRowNumber}`,
          value: numericScore,
          kind: 'simpleBench',
          sourceId: item.simpleBenchId,
          sheetRowNumber: target.sheetRowNumber,
          col0Based: simpleBenchColIdx,
          applyBold: true,
          matchedModelId: sheetModel?.id ?? item.matchedModelId ?? undefined,
          matchedDisplayName: sheetModel?.displayName ?? target.matchedDisplayName ?? undefined,
          isManualAssignment,
        });
      }
    }

    if (effectiveIntegrityDiffReport) {
      for (const item of selectedIntegrityItems) {
        const target = resolveEffectiveIntegrityTarget(item);
        if (!target.sheetRowNumber || target.sheetRowNumber < 36) continue;
        const sheetModel = sheetRowByNumber.get(target.sheetRowNumber);
        const isManualAssignment =
          typeof manualIntegrityRowOverrides[item.integrityId] === 'number';

        const numericScore = Math.round(item.liveScore * 10) / 10;
        changes.push({
          cellRef: `${INTEGRITY_COL_LETTER}${target.sheetRowNumber}`,
          label: `Integrity: ${item.integrityName} → ${target.matchedDisplayName || `Zeile ${target.sheetRowNumber}`}`,
          before:
            target.currentColAN !== null
              ? formatIntegrityScore(target.currentColAN)
              : lang === 'de'
              ? '(leer)'
              : '(empty)',
          after: formatIntegrityScore(numericScore),
          range: `${quoteSheetTitle(sheetTitle)}!${INTEGRITY_COL_LETTER}${target.sheetRowNumber}`,
          value: numericScore,
          kind: 'integrity',
          sourceId: item.integrityId,
          sheetRowNumber: target.sheetRowNumber,
          matchedModelId: sheetModel?.id ?? item.matchedModelId ?? undefined,
          matchedDisplayName: sheetModel?.displayName ?? target.matchedDisplayName ?? undefined,
          isManualAssignment,
        });
      }
    }

    if (changes.length === 0) {
      setWriteError(
        lang === 'de'
          ? 'Keine gültigen Änderungen ausgewählt. Bei neuen LLMs bitte zuerst eine Sheet-Zeile zuordnen oder „Neue Zeile in Tabelle ergänzen“ wählen.'
          : 'No valid updates selected. For unmatched LLMs, please assign a Sheet row or choose "Insert new row".'
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

        const boldSpecs: CellBoldSpec[] = existingUpdates
          .filter(
            (c) =>
              c.applyBold &&
              typeof c.sheetRowNumber === 'number' &&
              typeof c.col0Based === 'number'
          )
          .map((c) => ({
            row1Based: c.sheetRowNumber as number,
            col0Based: c.col0Based as number,
            bold: true,
          }));

        if (boldSpecs.length > 0) {
          await applyCellsBoldFormatting(activeSpreadsheetId, targetSheetId, boldSpecs, accessToken);
        }
      }

      // 2. Insert new model rows sequentially at firstReleasedHistoryRow
      const colReleaseIdx = layout?.colReleaseDate ?? 25;
      const colCreatorIdx = layout?.colModelCreator ?? 26;
      const colReleaseLetter = columnIndexToA1(colReleaseIdx);
      const colCreatorLetter = columnIndexToA1(colCreatorIdx);

      for (const item of newRowInserts) {
        const spec = item.newRowSpec!;
        const rowNum = spec.insertAtRow1Based;
        const companyMeta = resolveCompanyFlagAndName(spec.companyName);
        const colBValue = `${companyMeta.flag} ${spec.canonicalName}✦NEW`;
        const colCValue = formatCreatorColC(companyMeta.companyName, spec.releaseDate);
        const targetColLetter = columnIndexToA1(spec.targetCol0Based);
        const quotedTitle = quoteSheetTitle(sheetTitle);

        const sparseUpdates: CellUpdateSpec[] = [
          { range: `${quotedTitle}!B${rowNum}`, value: colBValue },
          { range: `${quotedTitle}!C${rowNum}`, value: colCValue },
          { range: `${quotedTitle}!S${rowNum}`, value: spec.canonicalName },
          { range: `${quotedTitle}!${colReleaseLetter}${rowNum}`, value: spec.releaseDate },
          { range: `${quotedTitle}!${colCreatorLetter}${rowNum}`, value: companyMeta.companyName },
          { range: `${quotedTitle}!${targetColLetter}${rowNum}`, value: spec.targetValue },
        ];

        // Ensure official score cell is bold while all other benchmark slots remain non-bold
        const benchmarkCols = [3, 4, 5, 6, 7, 8, 9, 10, simpleBenchColIdx];
        const boldSpecs: CellBoldSpec[] = benchmarkCols.map((colIdx) => ({
          row1Based: rowNum,
          col0Based: colIdx,
          bold: colIdx === spec.targetCol0Based,
        }));

        const insertRes = await insertRowAndWriteSparseCells(
          activeSpreadsheetId,
          targetSheetId,
          rowNum,
          sparseUpdates,
          boldSpecs,
          accessToken
        );
        totalUpdatedCells += insertRes.totalUpdatedCells;
        insertedRowsCount += 1;
      }

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
        if (c.kind === 'gdpx') {
          gdpxMappings[c.sourceId] = mapping;
        } else if (c.kind === 'vals') {
          valsMappings[c.sourceId] = mapping;
        } else if (c.kind === 'simpleBench') {
          simpleBenchMappings[c.sourceId] = mapping;
        } else if (c.kind === 'integrity') {
          integrityMappings[c.sourceId] = mapping;
        }
      }

      if (
        onSaveManualMappings &&
        (Object.keys(gdpxMappings).length > 0 ||
          Object.keys(valsMappings).length > 0 ||
          Object.keys(simpleBenchMappings).length > 0 ||
          Object.keys(integrityMappings).length > 0)
      ) {
        await onSaveManualMappings({
          gdpx: Object.keys(gdpxMappings).length > 0 ? gdpxMappings : undefined,
          vals: Object.keys(valsMappings).length > 0 ? valsMappings : undefined,
          simpleBench:
            Object.keys(simpleBenchMappings).length > 0 ? simpleBenchMappings : undefined,
          integrity: Object.keys(integrityMappings).length > 0 ? integrityMappings : undefined,
        });
      }

      setWriteSuccess(
        lang === 'de'
          ? `${totalUpdatedCells} Zelle(n)${
              insertedRowsCount > 0 ? ` und ${insertedRowsCount} neue Zeile(n)` : ''
            } ab Zeile 36 erfolgreich im Google Sheet aktualisiert (offizielle Werte fett).`
          : `Successfully updated ${totalUpdatedCells} cell(s)${
              insertedRowsCount > 0 ? ` and ${insertedRowsCount} new row(s)` : ''
            } (Row 36+, official scores bold) in Google Sheets.`
      );
      setPendingWrite(null);
      setManualGdpxRowOverrides({});
      setManualValsRowOverrides({});
      setManualSimpleBenchRowOverrides({});
      setManualIntegrityRowOverrides({});
      await onRefreshFromSheets(activeSpreadsheetId);
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : 'Failed to update Google Sheet.');
      setPendingWrite(null);
    } finally {
      setIsWriting(false);
    }
  };

  const renderPriceStatusLabel = (status: PricingDiffItem['deStatus']) => {
    if (status === 'changed') {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
          {lang === 'de' ? 'Geändert' : 'Changed'}
        </span>
      );
    }
    if (status === 'missing') {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
          {lang === 'de' ? 'Fehlt' : 'Missing'}
        </span>
      );
    }
    return null;
  };

  const renderGdpxStatusBadge = (status: GdpxDiffStatus) => {
    switch (status) {
      case 'new_unmatched':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
            {lang === 'de' ? 'Neues LLM' : 'New LLM'}
          </span>
        );
      case 'missing':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
            {lang === 'de' ? 'Fehlt in J' : 'Missing J'}
          </span>
        );
      case 'overwrite_estimate':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
            {lang === 'de' ? 'Schätzwert → Offiziell' : 'Estimate → Official'}
          </span>
        );
      case 'changed':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
            {lang === 'de' ? 'Geändert' : 'Changed'}
          </span>
        );
      default:
        return null;
    }
  };

  const renderIntegrityStatusBadge = (status: IntegrityDiffStatus) => {
    switch (status) {
      case 'new_unmatched':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
            {lang === 'de' ? 'Ohne Zeile' : 'Unmatched'}
          </span>
        );
      case 'missing':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
            {lang === 'de' ? `Fehlt in ${INTEGRITY_COL_LETTER}` : `Missing ${INTEGRITY_COL_LETTER}`}
          </span>
        );
      case 'overwrite_estimate':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
            {lang === 'de' ? 'Schätzwert → Offiziell' : 'Estimate → Official'}
          </span>
        );
      case 'changed':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
            {lang === 'de' ? 'Geändert' : 'Changed'}
          </span>
        );
      default:
        return null;
    }
  };

  const renderValsStatusBadge = (status: ValsDiffStatus) => {
    switch (status) {
      case 'new_unmatched':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
            {lang === 'de' ? 'Neu / Ergänzen' : 'New / Insert'}
          </span>
        );
      case 'missing':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
            {lang === 'de' ? `Fehlt in ${VALS_COL_LETTER}` : `Missing ${VALS_COL_LETTER}`}
          </span>
        );
      case 'overwrite_estimate':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
            {lang === 'de' ? 'Schätzwert → Offiziell (fett)' : 'Estimate → Official (bold)'}
          </span>
        );
      case 'changed':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
            {lang === 'de' ? 'Geändert' : 'Changed'}
          </span>
        );
      default:
        return null;
    }
  };

  const renderSimpleBenchStatusBadge = (status: SimpleBenchDiffStatus) => {
    switch (status) {
      case 'new_unmatched':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
            {lang === 'de' ? 'Neu / Ergänzen' : 'New / Insert'}
          </span>
        );
      case 'missing':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
            {lang === 'de' ? `Fehlt in ${simpleBenchColLetter}` : `Missing ${simpleBenchColLetter}`}
          </span>
        );
      case 'overwrite_estimate':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
            {lang === 'de' ? 'Schätzwert → Offiziell (fett)' : 'Estimate → Official (bold)'}
          </span>
        );
      case 'changed':
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
            {lang === 'de' ? 'Geändert' : 'Changed'}
          </span>
        );
      default:
        return null;
    }
  };

  const totalBadgeAlerts =
    (effectiveDiffReport?.changedCount ?? 0) +
    (effectiveGdpxDiffReport?.actionableCount ?? 0) +
    (effectiveValsDiffReport?.actionableCount ?? 0) +
    (effectiveSimpleBenchDiffReport?.actionableCount ?? 0) +
    (effectiveIntegrityDiffReport?.actionableCount ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-5">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
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
                  ? 'Tarife, Preis-, GDPx-, Vals-, SimpleBench- & Integrity-Prüfer'
                  : 'Plans, Price, GDPx, Vals, SimpleBench & Integrity Checker'}
              </h2>
              <p className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Clock className="w-3 h-3 shrink-0" />
                <span>
                  {isUsingLiveReport
                    ? `${lang === 'de' ? 'Preise' : 'Plans'}: ${formatTimestamp(displayedTimestamp)}`
                    : `${lang === 'de' ? 'Tarife' : 'Snapshot'}: ${formatTimestamp(displayedTimestamp)}`}
                  {gdpxReport
                    ? ` · GDPx: ${gdpxReport.totalSourceModels}`
                    : ''}
                  {valsReport
                    ? ` · Vals ${valsReport.versionLabel}: ${valsReport.totalSourceModels}`
                    : ''}
                  {simpleBenchReport
                    ? ` · SimpleBench: ${simpleBenchReport.totalSourceModels}`
                    : ''}
                  {integrityReport
                    ? ` · Integrity: ${integrityReport.totalSourceModels}`
                    : ''}
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
                  disabled={isAnyChecking}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
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
              </>
            )}

            {accessToken && onSignOut && (
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
          {checkError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{checkError}</span>
            </div>
          )}

          {gdpxCheckError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{gdpxCheckError}</span>
            </div>
          )}

          {valsCheckError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{valsCheckError}</span>
            </div>
          )}

          {simpleBenchCheckError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{simpleBenchCheckError}</span>
            </div>
          )}

          {integrityCheckError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{integrityCheckError}</span>
            </div>
          )}

          {writeError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{writeError}</span>
            </div>
          )}

          {writeSuccess && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{writeSuccess}</span>
            </div>
          )}

          {/* Top Section: Current Consumer Plans (DE / US) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {lang === 'de' ? 'Aktuelle Tarife (DE / US)' : 'Current Plans (DE / US)'}
              </h3>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {lang === 'de'
                  ? 'Browser-/Webchat-Tarife pro Monat (ohne reine CLI-Abos)'
                  : 'Monthly consumer browser & chat plans (CLI-only tiers excluded)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {LAB_ORDER.map((lab) => {
                const labPlans = displayedLabs.filter((p) => p.lab === lab);
                const labUrl =
                  labPlans.find((p) => p.sourceUrl)?.sourceUrl ||
                  displayedSources.find((s) => s.title.startsWith(`${lab}:`))?.uri;
                return (
                  <div
                    key={lab}
                    className={`p-2.5 rounded-xl border ${LAB_ACCENT[lab]} space-y-2`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${LAB_BADGE[lab]}`}>
                        {lab}
                      </span>
                      {labUrl && (
                        <a
                          href={labUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                          title={labUrl}
                        >
                          <span>{lang === 'de' ? 'Quellen' : 'Source'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    {labPlans.length === 0 ? (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {lang === 'de' ? 'Keine Daten.' : 'No data.'}
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-200/70 dark:divide-slate-800/70 rounded-lg bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 px-2">
                        {labPlans.map((plan, idx) => (
                          <div
                            key={`${lab}-${plan.planName}-${idx}`}
                            className="py-1.5 space-y-0.5 text-xs"
                          >
                            <div className="flex items-baseline justify-between gap-1.5">
                              {plan.sourceUrl ? (
                                <a
                                  href={plan.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
                                  title={plan.sourceUrl}
                                >
                                  {plan.planName.replace(/^(ChatGPT|Claude|Google AI)\s+/i, '')}
                                </a>
                              ) : (
                                <span className="font-semibold text-slate-900 dark:text-white truncate">
                                  {plan.planName.replace(/^(ChatGPT|Claude|Google AI)\s+/i, '')}
                                </span>
                              )}
                              <span className="font-mono tabular-nums text-xs shrink-0 text-slate-700 dark:text-slate-200">
                                <strong>{plan.deMonthly ? roundCurrencyString(plan.deMonthly) : '—'}</strong>
                                <span className="text-slate-500 dark:text-slate-400 mx-1">/</span>
                                <span>{plan.usMonthly ? roundCurrencyString(plan.usMonthly) : '—'}</span>
                              </span>
                            </div>
                            {plan.billingNotes && (
                              <p
                                className="text-xs text-slate-600 dark:text-slate-400 leading-tight truncate"
                                title={roundCurrencyTokensInText(plan.billingNotes)}
                              >
                                {roundCurrencyTokensInText(plan.billingNotes)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Static preview banner */}
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

          {/* Single Unified Google Sign-In Bar */}
          {apiAvailable && !isSheetsConnected && (
            <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 min-w-0">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  {lang === 'de'
                    ? `Einmal mit Google anmelden für Live-Diffs & direkte Übernahme (Preise T/U, GDPx ${GDPX_COL_LETTER}, Vals ${VALS_COL_LETTER}, SimpleBench ${simpleBenchColLetter} & Integrity ${INTEGRITY_COL_LETTER}, ab Zeile 36).`
                    : `Sign in once with Google to diff prices (T/U), GDPx (${GDPX_COL_LETTER}), Vals (${VALS_COL_LETTER}), SimpleBench (${simpleBenchColLetter}) & Integrity (${INTEGRITY_COL_LETTER}) and apply updates (Row 36+).`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void onSignIn()}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-55 shrink-0"
              >
                <svg className="w-3.5 h-3.5 block shrink-0" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <path fill="none" d="M0 0h48v48H0z" />
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
            </div>
          )}

          {/* Connected: Pricing Diff Section */}
          {apiAvailable && isSheetsConnected && isChecking && !effectiveDiffReport && (
            <div className="px-3.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 flex items-center gap-2.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {lang === 'de'
                  ? `Prüfe Live-Preise gegen Spalten ${colDeLetter} / ${colUsLetter || 'US'}…`
                  : `Checking live pricing against Columns ${colDeLetter} / ${colUsLetter || 'US'}…`}
              </span>
            </div>
          )}

          {effectiveDiffReport && (
            <div className="space-y-2">
              <div
                className={`px-3.5 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                  effectiveDiffReport.changedCount > 0
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
                    : actionablePriceDiffs.length > 0
                    ? 'border-blue-300 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/25'
                    : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/25'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {effectiveDiffReport.changedCount > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  <span className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                    <strong className="font-bold text-slate-900 dark:text-white">
                      {effectiveDiffReport.changedCount > 0
                        ? lang === 'de'
                          ? `Preise: ${effectiveDiffReport.changedCount} Diff(s):`
                          : `Plans: ${effectiveDiffReport.changedCount} Diff(s):`
                        : actionablePriceDiffs.length > 0
                        ? lang === 'de'
                          ? `Preise: ${actionablePriceDiffs.length} fehlend:`
                          : `Plans: ${actionablePriceDiffs.length} missing:`
                        : lang === 'de'
                        ? 'Preise OK:'
                        : 'Plans OK:'}
                    </strong>{' '}
                    {roundCurrencyTokensInText(
                      lang === 'de' ? effectiveDiffReport.summaryDe : effectiveDiffReport.summaryEn
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs shrink-0">
                  {effectiveDiffReport.changedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                      {effectiveDiffReport.changedCount} {lang === 'de' ? 'geändert' : 'changed'}
                    </span>
                  )}
                  {effectiveDiffReport.missingCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                      {effectiveDiffReport.missingCount} {lang === 'de' ? 'fehlt' : 'missing'}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold">
                    {effectiveDiffReport.unchangedCount} OK
                  </span>
                </div>
              </div>

              {actionablePriceDiffs.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-400">
                          <th className="py-1.5 px-2.5 w-7"></th>
                          <th className="py-1.5 px-3">{lang === 'de' ? 'Modell' : 'Model'}</th>
                          <th className="py-1.5 px-3">{lang === 'de' ? 'Lab · Tarif' : 'Lab · Plan'}</th>
                          <th className="py-1.5 px-3">DE ({colDeLetter})</th>
                          <th className="py-1.5 px-3">US ({colUsLetter || 'EN'})</th>
                          <th className="py-1.5 px-3">{lang === 'de' ? 'Notiz' : 'Note'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                        {actionablePriceDiffs.map((item) => {
                          const isChanged = item.deStatus === 'changed' || item.usStatus === 'changed';
                          return (
                            <tr
                              key={item.modelId}
                              className={
                                isChanged
                                  ? 'bg-amber-50/45 dark:bg-amber-950/15'
                                  : 'bg-white dark:bg-slate-900'
                              }
                            >
                              <td className="py-1.5 px-2.5 align-middle">
                                <input
                                  type="checkbox"
                                  checked={Boolean(selectedPriceIds[item.modelId])}
                                  onChange={() => handleTogglePriceItem(item.modelId)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-1.5 px-3 align-middle whitespace-nowrap">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {item.displayName}
                                </span>
                                <span className="ml-1.5 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                                  #{item.sheetRowNumber}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 align-middle whitespace-nowrap">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${LAB_BADGE[item.lab]}`}>
                                  {item.lab}
                                </span>
                                {item.matchedPlanName && (
                                  <span className="ml-1.5 text-xs text-slate-700 dark:text-slate-300">
                                    {item.matchedPlanName.replace(/^(ChatGPT|Claude|Google AI)\s+/i, '')}
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-3 align-middle font-mono tabular-nums whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  {item.deStatus === 'unchanged' ? (
                                    <span className="text-slate-700 dark:text-slate-200">{item.currentDe ? roundCurrencyString(item.currentDe) : '—'}</span>
                                  ) : (
                                    <>
                                      <span className="text-slate-600 dark:text-slate-400 line-through">{item.currentDe ? roundCurrencyString(item.currentDe) : '—'}</span>
                                      <ArrowRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                      <span className="font-bold text-slate-900 dark:text-white">{item.liveDe ? roundCurrencyString(item.liveDe) : '—'}</span>
                                      {renderPriceStatusLabel(item.deStatus)}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-1.5 px-3 align-middle font-mono tabular-nums whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  {item.usStatus === 'unchanged' ? (
                                    <span className="text-slate-700 dark:text-slate-200">{item.currentUs ? roundCurrencyString(item.currentUs) : '—'}</span>
                                  ) : (
                                    <>
                                      <span className="text-slate-600 dark:text-slate-400 line-through">{item.currentUs ? roundCurrencyString(item.currentUs) : '—'}</span>
                                      <ArrowRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                      <span className="font-bold text-slate-900 dark:text-white">{item.liveUs ? roundCurrencyString(item.liveUs) : '—'}</span>
                                      {renderPriceStatusLabel(item.usStatus)}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="py-1.5 px-3 align-middle max-w-[200px]">
                                <span
                                  className="block truncate text-xs text-slate-600 dark:text-slate-400"
                                  title={item.reason ? roundCurrencyTokensInText(item.reason) : ''}
                                >
                                  {item.reason ? roundCurrencyTokensInText(item.reason) : 'OK'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compact GDPx Section: Strictly Diff-Only (No full 21-row leaderboard!) */}
          {apiAvailable && (
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {lang === 'de'
                      ? `GDPx-Prüfer (Spalte ${GDPX_COL_LETTER} · ab Z. 36)`
                      : `GDPx Checker (Column ${GDPX_COL_LETTER} · Row 36+)`}
                  </h3>
                  <a
                    href="https://gdpx.semianalysis.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <span>gdpx.semianalysis.com</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                {gdpxReport && (
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    {gdpxReport.totalSourceModels} LLMs
                    {gdpxReport.sourceUpdatedAt ? ` · ${gdpxReport.sourceUpdatedAt}` : ''}
                  </span>
                )}
              </div>

              {isCheckingGdpx && !effectiveGdpxDiffReport && (
                <div className="px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/30 flex items-center gap-2.5 text-xs">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {lang === 'de'
                      ? `Prüfe gdpx.semianalysis.com auf Neuzugänge für Spalte ${GDPX_COL_LETTER}…`
                      : `Checking gdpx.semianalysis.com for new entries in Column ${GDPX_COL_LETTER}…`}
                  </span>
                </div>
              )}

              {!isSheetsConnected && gdpxReport && (
                <div className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                  <span>{lang === 'de' ? gdpxReport.summaryDe : gdpxReport.summaryEn}</span>
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400 shrink-0">
                    {gdpxReport.totalSourceModels} LLMs
                  </span>
                </div>
              )}

              {effectiveGdpxDiffReport && (
                <>
                  <div
                    className={`px-3.5 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                      effectiveGdpxDiffReport.actionableCount > 0
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
                        : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/25'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {effectiveGdpxDiffReport.actionableCount > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      <span className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                        <strong className="font-bold text-slate-900 dark:text-white">
                          {effectiveGdpxDiffReport.actionableCount > 0
                            ? lang === 'de'
                              ? `GDPx: ${effectiveGdpxDiffReport.actionableCount} Änderung(en):`
                              : `GDPx: ${effectiveGdpxDiffReport.actionableCount} update(s):`
                            : lang === 'de'
                            ? 'GDPx OK:'
                            : 'GDPx OK:'}
                        </strong>{' '}
                        {lang === 'de'
                          ? effectiveGdpxDiffReport.summaryDe
                          : effectiveGdpxDiffReport.summaryEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs shrink-0">
                      {effectiveGdpxDiffReport.unmatchedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-bold">
                          {effectiveGdpxDiffReport.unmatchedCount} {lang === 'de' ? 'Neu' : 'New'}
                        </span>
                      )}
                      {effectiveGdpxDiffReport.missingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                          {effectiveGdpxDiffReport.missingCount} {lang === 'de' ? 'Fehlt' : 'Missing'}
                        </span>
                      )}
                      {(effectiveGdpxDiffReport.overwriteEstimateCount ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                          {effectiveGdpxDiffReport.overwriteEstimateCount}{' '}
                          {lang === 'de' ? 'Schätzwert' : 'Estimate'}
                        </span>
                      )}
                      {effectiveGdpxDiffReport.changedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                          {effectiveGdpxDiffReport.changedCount}{' '}
                          {lang === 'de' ? 'Geändert' : 'Changed'}
                        </span>
                      )}
                      {ignoredGdpxDiffs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowIgnoredGdpx((prev) => !prev)}
                          className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300/80 dark:hover:bg-slate-700 cursor-pointer"
                          title={
                            lang === 'de'
                              ? 'Ignorierte Modelle anzeigen / wiederherstellen'
                              : 'Show / restore ignored models'
                          }
                        >
                          {ignoredGdpxDiffs.length} {lang === 'de' ? 'ignoriert' : 'ignored'}
                        </button>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold">
                        {effectiveGdpxDiffReport.unchangedCount} OK
                      </span>
                    </div>
                  </div>

                  {showIgnoredGdpx && ignoredGdpxDiffs.length > 0 && (
                    <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-slate-600 dark:text-slate-400 mr-1">
                        {lang === 'de' ? 'Ignoriert:' : 'Ignored:'}
                      </span>
                      {ignoredGdpxDiffs.map((d) => (
                        <button
                          key={d.gdpxId}
                          type="button"
                          onClick={() => void onRestoreGdpxModel?.(d.gdpxId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                          title={lang === 'de' ? 'Wieder aktivieren' : 'Restore'}
                        >
                          <span>{d.gdpxName}</span>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Diff-Only GDPx Rows */}
                  {actionableGdpxDiffs.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
                              <th className="py-1.5 px-2.5 w-7"></th>
                              <th className="py-1.5 px-3">{lang === 'de' ? 'GDPx-Modell' : 'GDPx Model'}</th>
                              <th className="py-1.5 px-3">{lang === 'de' ? 'Sheet-Zeile' : 'Sheet Row'}</th>
                              <th className="py-1.5 px-3">Spalte {GDPX_COL_LETTER}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                            {actionableGdpxDiffs.map((item) => {
                              const target = resolveEffectiveGdpxTarget(item);
                              const canSelect = Boolean(
                                target.sheetRowNumber && target.sheetRowNumber >= 36
                              );
                              return (
                                <tr
                                  key={item.gdpxId}
                                  className={
                                    item.status === 'new_unmatched'
                                      ? 'bg-purple-50/35 dark:bg-purple-950/15'
                                      : 'bg-amber-50/35 dark:bg-amber-950/15'
                                  }
                                >
                                  <td className="py-1.5 px-2.5 align-middle">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selectedGdpxIds[item.gdpxId])}
                                      disabled={!canSelect}
                                      onChange={() => handleToggleGdpxItem(item.gdpxId)}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    />
                                  </td>
                                  <td className="py-1.5 px-3 align-middle whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-900 dark:text-white">
                                        {item.gdpxName}
                                      </span>
                                      <span className="text-xs text-slate-600 dark:text-slate-400">
                                        ({item.lab})
                                      </span>
                                      {renderGdpxStatusBadge(item.status)}
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-3 align-middle">
                                    {item.status === 'new_unmatched' ? (
                                      <select
                                        value={manualGdpxRowOverrides[item.gdpxId] ?? ''}
                                        onChange={(e) =>
                                          handleAssignManualGdpxRow(item.gdpxId, e.target.value)
                                        }
                                        className="w-full max-w-[240px] px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                                      >
                                        <option value="">
                                          {lang === 'de'
                                            ? '— Zeile zuordnen (ab Z. 36) —'
                                            : '— Assign Row (36+) —'}
                                        </option>
                                        <option value={IGNORE_OPTION_VALUE}>
                                          {lang === 'de'
                                            ? '🚫 Ignorieren (nicht mehr nachfragen)'
                                            : "🚫 Ignore (don't ask again)"}
                                        </option>
                                        {sortedPickerOptionsFor(item.lab).map((m) => (
                                          <option key={m.id} value={m.sheetRowNumber}>
                                            #{m.sheetRowNumber} · {m.displayName} (
                                            {m.rawScores.trickQuestions !== null
                                              ? `J=${formatGdpxScore(m.rawScores.trickQuestions)}`
                                              : 'J leer'}
                                            )
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className="text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400 mr-1">
                                          #{target.sheetRowNumber}
                                        </span>
                                        {target.matchedDisplayName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-3 align-middle font-mono tabular-nums whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="text-slate-600 dark:text-slate-400 line-through">
                                        {target.currentColJ !== null
                                          ? formatGdpxScore(target.currentColJ)
                                          : '—'}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                        {formatGdpxScore(item.liveScore)}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Compact Vals Index v2.2 Section (Column K · Row 36+) */}
          {apiAvailable && (
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400 shrink-0" />
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {lang === 'de'
                      ? `Vals Index ${valsReport?.versionLabel || 'v2.2'}-Prüfer (Spalte ${VALS_COL_LETTER} · ab Z. 36)`
                      : `Vals Index ${valsReport?.versionLabel || 'v2.2'} Checker (Column ${VALS_COL_LETTER} · Row 36+)`}
                  </h3>
                  <a
                    href="https://www.vals.ai/benchmarks/vals_index"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-cyan-700 dark:text-cyan-400 hover:underline"
                  >
                    <span>vals.ai/benchmarks/vals_index</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  {actionableValsDiffs.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => handleToggleAllVals(true)}
                        className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {lang === 'de' ? 'Alle' : 'All'}
                      </button>
                      <span className="text-slate-500 dark:text-slate-600">·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAllVals(false)}
                        className="text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                      >
                        {lang === 'de' ? 'Keine' : 'None'}
                      </button>
                    </div>
                  )}
                  {valsReport && (
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {valsReport.totalSourceModels} Einträge
                      {valsReport.sourceUpdatedAt ? ` · ${valsReport.sourceUpdatedAt}` : ''}
                    </span>
                  )}
                </div>
              </div>

              {isCheckingVals && !effectiveValsDiffReport && (
                <div className="px-3.5 py-2.5 rounded-xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50/70 dark:bg-cyan-950/30 flex items-center gap-2.5 text-xs">
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400 animate-spin shrink-0" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {lang === 'de'
                      ? `Prüfe vals.ai (Vals Index v2.2) gegen Spalte ${VALS_COL_LETTER} (offiziell = fett, Schätzwerte = nicht-fett)…`
                      : `Checking vals.ai (Vals Index v2.2) against Column ${VALS_COL_LETTER}…`}
                  </span>
                </div>
              )}

              {!isSheetsConnected && valsReport && (
                <div className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2">
                  <span>{lang === 'de' ? valsReport.summaryDe : valsReport.summaryEn}</span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 shrink-0">
                    {valsReport.totalSourceModels} LLMs
                  </span>
                </div>
              )}

              {effectiveValsDiffReport && (
                <>
                  <div
                    className={`px-3.5 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                      effectiveValsDiffReport.actionableCount > 0
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
                        : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/25'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {effectiveValsDiffReport.actionableCount > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      <span className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                        <strong className="font-bold text-slate-900 dark:text-white">
                          {effectiveValsDiffReport.actionableCount > 0
                            ? lang === 'de'
                              ? `Vals ${effectiveValsDiffReport.versionLabel}: ${effectiveValsDiffReport.actionableCount} Änderung(en):`
                              : `Vals ${effectiveValsDiffReport.versionLabel}: ${effectiveValsDiffReport.actionableCount} update(s):`
                            : `Vals ${effectiveValsDiffReport.versionLabel} OK:`}
                        </strong>{' '}
                        {lang === 'de'
                          ? effectiveValsDiffReport.summaryDe
                          : effectiveValsDiffReport.summaryEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs shrink-0 flex-wrap">
                      {effectiveValsDiffReport.unmatchedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-bold">
                          {effectiveValsDiffReport.unmatchedCount} {lang === 'de' ? 'Neu' : 'New'}
                        </span>
                      )}
                      {effectiveValsDiffReport.missingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                          {effectiveValsDiffReport.missingCount} {lang === 'de' ? 'Fehlt' : 'Missing'}
                        </span>
                      )}
                      {effectiveValsDiffReport.overwriteEstimateCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                          {effectiveValsDiffReport.overwriteEstimateCount}{' '}
                          {lang === 'de' ? 'Schätzwert' : 'Estimate'}
                        </span>
                      )}
                      {effectiveValsDiffReport.changedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                          {effectiveValsDiffReport.changedCount}{' '}
                          {lang === 'de' ? 'Geändert' : 'Changed'}
                        </span>
                      )}
                      {ignoredValsDiffs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowIgnoredVals((prev) => !prev)}
                          className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300/80 dark:hover:bg-slate-700 cursor-pointer"
                          title={
                            lang === 'de'
                              ? 'Ignorierte Modelle anzeigen / wiederherstellen'
                              : 'Show / restore ignored models'
                          }
                        >
                          {ignoredValsDiffs.length} {lang === 'de' ? 'ignoriert' : 'ignored'}
                        </button>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold">
                        {effectiveValsDiffReport.unchangedCount} OK (fett)
                      </span>
                    </div>
                  </div>

                  {showIgnoredVals && ignoredValsDiffs.length > 0 && (
                    <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-slate-700 dark:text-slate-300 mr-1">
                        {lang === 'de' ? 'Ignoriert:' : 'Ignored:'}
                      </span>
                      {ignoredValsDiffs.map((d) => (
                        <button
                          key={d.valsId}
                          type="button"
                          onClick={() => void onRestoreValsModel?.(d.valsId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-cyan-500 hover:text-cyan-700 dark:hover:text-cyan-300 cursor-pointer"
                          title={lang === 'de' ? 'Wieder aktivieren' : 'Restore'}
                        >
                          <span>{d.valsName}</span>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}

                  {actionableValsDiffs.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
                              <th className="py-1.5 px-2.5 w-7"></th>
                              <th className="py-1.5 px-3">{lang === 'de' ? 'Vals-Modell' : 'Vals Model'}</th>
                              <th className="py-1.5 px-3">{lang === 'de' ? 'Sheet-Zeile' : 'Sheet Row'}</th>
                              <th className="py-1.5 px-3">
                                {lang === 'de'
                                  ? `Spalte ${VALS_COL_LETTER} (offiziell = fett)`
                                  : `Column ${VALS_COL_LETTER} (official = bold)`}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                            {actionableValsDiffs.map((item) => {
                              const target = resolveEffectiveValsTarget(item);
                              const canSelect = Boolean(
                                target.isNewRowInsert ||
                                  (target.sheetRowNumber && target.sheetRowNumber >= 36)
                              );
                              return (
                                <tr
                                  key={item.valsId}
                                  className={
                                    item.status === 'new_unmatched'
                                      ? 'bg-purple-50/35 dark:bg-purple-950/15'
                                      : 'bg-amber-50/35 dark:bg-amber-950/15'
                                  }
                                >
                                  <td className="py-1.5 px-2.5 align-middle">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selectedValsIds[item.valsId])}
                                      disabled={!canSelect}
                                      onChange={() => handleToggleValsItem(item.valsId)}
                                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    />
                                  </td>
                                  <td className="py-1.5 px-3 align-middle whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                                        #{item.rank}
                                      </span>
                                      <span className="font-semibold text-slate-900 dark:text-white">
                                        {item.valsName}
                                      </span>
                                      {item.company && (
                                        <span className="text-xs text-slate-700 dark:text-slate-300">
                                          ({item.company})
                                        </span>
                                      )}
                                      {renderValsStatusBadge(item.status)}
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-3 align-middle">
                                    {item.status === 'new_unmatched' ? (
                                      <select
                                        value={manualValsRowOverrides[item.valsId] ?? ''}
                                        onChange={(e) =>
                                          handleAssignManualValsRow(item.valsId, e.target.value)
                                        }
                                        className="w-full max-w-[270px] px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                                      >
                                        <option value="">
                                          {lang === 'de'
                                            ? '— Zeile zuordnen / ergänzen —'
                                            : '— Assign / Insert Row —'}
                                        </option>
                                        <option value={INSERT_NEW_ROW_OPTION_VALUE}>
                                          {lang === 'de'
                                            ? `➕ Neue Zeile in Tabelle ergänzen (Z. ${firstReleasedHistoryRow})`
                                            : `➕ Insert new row in table (Row ${firstReleasedHistoryRow})`}
                                        </option>
                                        <option value={IGNORE_OPTION_VALUE}>
                                          {lang === 'de'
                                            ? '🚫 Ignorieren (nicht mehr nachfragen)'
                                            : "🚫 Ignore (don't ask again)"}
                                        </option>
                                        {sortedValsPickerOptionsFor(item.company, item.valsName).map(
                                          (m) => {
                                            const maskVal =
                                              typeof m.sheetRowNumber === 'number'
                                                ? loadedData.boldMask?.[m.sheetRowNumber - 1]?.[
                                                    VALS_COL_INDEX
                                                  ]
                                                : undefined;
                                            const boldTag =
                                              m.rawScores.econLegal !== null
                                                ? maskVal === false
                                                  ? ', nicht-fett'
                                                  : maskVal === true
                                                  ? ', fett'
                                                  : ''
                                                : '';
                                            return (
                                              <option key={m.id} value={m.sheetRowNumber}>
                                                #{m.sheetRowNumber} · {m.displayName} (
                                                {m.rawScores.econLegal !== null
                                                  ? `${VALS_COL_LETTER}=${formatValsScore(m.rawScores.econLegal)}${boldTag}`
                                                  : `${VALS_COL_LETTER} leer`}
                                                )
                                              </option>
                                            );
                                          }
                                        )}
                                      </select>
                                    ) : (
                                      <span className="text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300 mr-1">
                                          #{target.sheetRowNumber}
                                        </span>
                                        {target.matchedDisplayName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-3 align-middle font-mono tabular-nums whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1.5">
                                      {target.currentColK !== null ? (
                                        <span
                                          className={
                                            target.currentColKIsBold
                                              ? 'font-bold text-slate-800 dark:text-slate-200 line-through'
                                              : 'font-normal text-slate-700 dark:text-slate-300'
                                          }
                                          title={
                                            target.currentColKIsBold === false
                                              ? lang === 'de'
                                                ? 'Bestehender Schätzwert (nicht-fett)'
                                                : 'Existing estimate (non-bold)'
                                              : lang === 'de'
                                              ? 'Offizieller Wert (fett)'
                                              : 'Official value (bold)'
                                          }
                                        >
                                          {formatValsScore(target.currentColK)}
                                          {target.currentColKIsBold === false && (
                                            <span className="ml-1 text-slate-600 dark:text-slate-400">
                                              (nicht-fett)
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-slate-600 dark:text-slate-400">—</span>
                                      )}
                                      <ArrowRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                        {formatValsScore(item.writeScore)}
                                      </span>
                                      <span className="text-slate-600 dark:text-slate-400">
                                        ({formatValsScore(item.liveScore, 1)}%)
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Compact SimpleBench Section (Column Y · Row 36+) */}
          {apiAvailable && (
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {lang === 'de'
                      ? `SimpleBench-Prüfer (Spalte ${simpleBenchColLetter} · ab Z. 36)`
                      : `SimpleBench Checker (Column ${simpleBenchColLetter} · Row 36+)`}
                  </h3>
                  <a
                    href="https://simple-bench.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    <span>simple-bench.com</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  {actionableSimpleBenchDiffs.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => handleToggleAllSimpleBench(true)}
                        className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {lang === 'de' ? 'Alle' : 'All'}
                      </button>
                      <span className="text-slate-500 dark:text-slate-600">·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAllSimpleBench(false)}
                        className="text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                      >
                        {lang === 'de' ? 'Keine' : 'None'}
                      </button>
                    </div>
                  )}
                  {simpleBenchReport && (
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {simpleBenchReport.totalSourceModels} LLMs
                      {simpleBenchReport.sourceUpdatedAt
                        ? ` · ${simpleBenchReport.sourceUpdatedAt}`
                        : ''}
                    </span>
                  )}
                </div>
              </div>

              {isCheckingSimpleBench && !effectiveSimpleBenchDiffReport && (
                <div className="px-3.5 py-2.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 flex items-center gap-2.5 text-xs">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 animate-spin shrink-0" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {lang === 'de'
                      ? `Prüfe simple-bench.com gegen Spalte ${simpleBenchColLetter} (offiziell = fett, Schätzwerte = nicht-fett)…`
                      : `Checking simple-bench.com against Column ${simpleBenchColLetter}…`}
                  </span>
                </div>
              )}

              {!isSheetsConnected && simpleBenchReport && (
                <div className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2">
                  <span>
                    {lang === 'de' ? simpleBenchReport.summaryDe : simpleBenchReport.summaryEn}
                  </span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 shrink-0">
                    {simpleBenchReport.totalSourceModels} LLMs
                  </span>
                </div>
              )}

              {effectiveSimpleBenchDiffReport && (
                <>
                  <div
                    className={`px-3.5 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                      effectiveSimpleBenchDiffReport.actionableCount > 0
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
                        : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/25'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {effectiveSimpleBenchDiffReport.actionableCount > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      <span className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                        <strong className="font-bold text-slate-900 dark:text-white">
                          {effectiveSimpleBenchDiffReport.actionableCount > 0
                            ? lang === 'de'
                              ? `SimpleBench: ${effectiveSimpleBenchDiffReport.actionableCount} Änderung(en):`
                              : `SimpleBench: ${effectiveSimpleBenchDiffReport.actionableCount} update(s):`
                            : 'SimpleBench OK:'}
                        </strong>{' '}
                        {lang === 'de'
                          ? effectiveSimpleBenchDiffReport.summaryDe
                          : effectiveSimpleBenchDiffReport.summaryEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs shrink-0 flex-wrap">
                      {effectiveSimpleBenchDiffReport.unmatchedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-bold">
                          {effectiveSimpleBenchDiffReport.unmatchedCount}{' '}
                          {lang === 'de' ? 'Neu' : 'New'}
                        </span>
                      )}
                      {effectiveSimpleBenchDiffReport.missingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                          {effectiveSimpleBenchDiffReport.missingCount}{' '}
                          {lang === 'de' ? 'Fehlt' : 'Missing'}
                        </span>
                      )}
                      {effectiveSimpleBenchDiffReport.overwriteEstimateCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                          {effectiveSimpleBenchDiffReport.overwriteEstimateCount}{' '}
                          {lang === 'de' ? 'Schätzwert' : 'Estimate'}
                        </span>
                      )}
                      {effectiveSimpleBenchDiffReport.changedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                          {effectiveSimpleBenchDiffReport.changedCount}{' '}
                          {lang === 'de' ? 'Geändert' : 'Changed'}
                        </span>
                      )}
                      {ignoredSimpleBenchDiffs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowIgnoredSimpleBench((prev) => !prev)}
                          className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300/80 dark:hover:bg-slate-700 cursor-pointer"
                          title={
                            lang === 'de'
                              ? 'Ignorierte Modelle anzeigen / wiederherstellen'
                              : 'Show / restore ignored models'
                          }
                        >
                          {ignoredSimpleBenchDiffs.length} {lang === 'de' ? 'ignoriert' : 'ignored'}
                        </button>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold">
                        {effectiveSimpleBenchDiffReport.unchangedCount} OK (fett)
                      </span>
                    </div>
                  </div>

                  {showIgnoredSimpleBench && ignoredSimpleBenchDiffs.length > 0 && (
                    <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-slate-700 dark:text-slate-300 mr-1">
                        {lang === 'de' ? 'Ignoriert:' : 'Ignored:'}
                      </span>
                      {ignoredSimpleBenchDiffs.map((d) => (
                        <button
                          key={d.simpleBenchId}
                          type="button"
                          onClick={() => void onRestoreSimpleBenchModel?.(d.simpleBenchId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer"
                          title={lang === 'de' ? 'Wieder aktivieren' : 'Restore'}
                        >
                          <span>{d.simpleBenchName}</span>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}

                  {actionableSimpleBenchDiffs.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300">
                              <th className="py-1.5 px-2.5 w-7"></th>
                              <th className="py-1.5 px-3">
                                {lang === 'de' ? 'SimpleBench-Modell' : 'SimpleBench Model'}
                              </th>
                              <th className="py-1.5 px-3">{lang === 'de' ? 'Sheet-Zeile' : 'Sheet Row'}</th>
                              <th className="py-1.5 px-3">
                                {lang === 'de'
                                  ? `Spalte ${simpleBenchColLetter} (offiziell = fett)`
                                  : `Column ${simpleBenchColLetter} (official = bold)`}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                            {actionableSimpleBenchDiffs.map((item) => {
                              const target = resolveEffectiveSimpleBenchTarget(item);
                              const canSelect = Boolean(
                                target.isNewRowInsert ||
                                  (target.sheetRowNumber && target.sheetRowNumber >= 36)
                              );
                              return (
                                <tr
                                  key={item.simpleBenchId}
                                  className={
                                    item.status === 'new_unmatched'
                                      ? 'bg-purple-50/35 dark:bg-purple-950/15'
                                      : 'bg-amber-50/35 dark:bg-amber-950/15'
                                  }
                                >
                                  <td className="py-1.5 px-2.5 align-middle">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selectedSimpleBenchIds[item.simpleBenchId])}
                                      disabled={!canSelect}
                                      onChange={() =>
                                        handleToggleSimpleBenchItem(item.simpleBenchId)
                                      }
                                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    />
                                  </td>
                                  <td className="py-1.5 px-3 align-middle whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                                        #{item.rank}
                                      </span>
                                      <span className="font-semibold text-slate-900 dark:text-white">
                                        {item.simpleBenchName}
                                      </span>
                                      {item.organization && (
                                        <span className="text-xs text-slate-700 dark:text-slate-300">
                                          ({item.organization})
                                        </span>
                                      )}
                                      {renderSimpleBenchStatusBadge(item.status)}
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-3 align-middle">
                                    {item.status === 'new_unmatched' ? (
                                      <select
                                        value={
                                          manualSimpleBenchRowOverrides[item.simpleBenchId] ?? ''
                                        }
                                        onChange={(e) =>
                                          handleAssignManualSimpleBenchRow(
                                            item.simpleBenchId,
                                            e.target.value
                                          )
                                        }
                                        className="w-full max-w-[270px] px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                                      >
                                        <option value="">
                                          {lang === 'de'
                                            ? '— Zeile zuordnen / ergänzen —'
                                            : '— Assign / Insert Row —'}
                                        </option>
                                        <option value={INSERT_NEW_ROW_OPTION_VALUE}>
                                          {lang === 'de'
                                            ? `➕ Neue Zeile in Tabelle ergänzen (Z. ${firstReleasedHistoryRow})`
                                            : `➕ Insert new row in table (Row ${firstReleasedHistoryRow})`}
                                        </option>
                                        <option value={IGNORE_OPTION_VALUE}>
                                          {lang === 'de'
                                            ? '🚫 Ignorieren (nicht mehr nachfragen)'
                                            : "🚫 Ignore (don't ask again)"}
                                        </option>
                                        {sortedSimpleBenchPickerOptionsFor(
                                          item.organization,
                                          item.simpleBenchName
                                        ).map((m) => {
                                          const maskVal =
                                            typeof m.sheetRowNumber === 'number'
                                              ? loadedData.boldMask?.[m.sheetRowNumber - 1]?.[
                                                  simpleBenchColIdx
                                                ]
                                              : undefined;
                                          const boldTag =
                                            m.rawScores.trickQuestionsOld !== null
                                              ? maskVal === false
                                                ? ', nicht-fett'
                                                : maskVal === true
                                                ? ', fett'
                                                : ''
                                              : '';
                                          return (
                                            <option key={m.id} value={m.sheetRowNumber}>
                                              #{m.sheetRowNumber} · {m.displayName} (
                                              {m.rawScores.trickQuestionsOld !== null
                                                ? `${simpleBenchColLetter}=${formatSimpleBenchScore(m.rawScores.trickQuestionsOld)}${boldTag}`
                                                : `${simpleBenchColLetter} leer`}
                                              )
                                            </option>
                                          );
                                        })}
                                      </select>
                                    ) : (
                                      <span className="text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300 mr-1">
                                          #{target.sheetRowNumber}
                                        </span>
                                        {target.matchedDisplayName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-3 align-middle font-mono tabular-nums whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1.5">
                                      {target.currentColY !== null ? (
                                        <span
                                          className={
                                            target.currentColYIsBold
                                              ? 'font-bold text-slate-800 dark:text-slate-200 line-through'
                                              : 'font-normal text-slate-700 dark:text-slate-300'
                                          }
                                          title={
                                            target.currentColYIsBold === false
                                              ? lang === 'de'
                                                ? 'Bestehender Schätzwert (nicht-fett)'
                                                : 'Existing estimate (non-bold)'
                                              : lang === 'de'
                                              ? 'Offizieller Wert (fett)'
                                              : 'Official value (bold)'
                                          }
                                        >
                                          {formatSimpleBenchScore(target.currentColY)}
                                          {target.currentColYIsBold === false && (
                                            <span className="ml-1 text-slate-600 dark:text-slate-400">
                                              (nicht-fett)
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-slate-600 dark:text-slate-400">—</span>
                                      )}
                                      <ArrowRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                        {formatSimpleBenchScore(item.liveScore)}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Compact Integrity-Bench Section: Strictly Diff-Only (No full 43-row table!) */}
          {apiAvailable && (
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {lang === 'de'
                      ? `Integrity-Prüfer (Spalte ${INTEGRITY_COL_LETTER} · ab Z. 36)`
                      : `Integrity Checker (Column ${INTEGRITY_COL_LETTER} · Row 36+)`}
                  </h3>
                  <a
                    href="https://integrity-bench.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    <span>integrity-bench.com</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  {actionableIntegrityDiffs.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => handleToggleAllIntegrity(true)}
                        className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {lang === 'de' ? 'Alle' : 'All'}
                      </button>
                      <span className="text-slate-400 dark:text-slate-700">·</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAllIntegrity(false)}
                        className="text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                      >
                        {lang === 'de' ? 'Keine' : 'None'}
                      </button>
                    </div>
                  )}
                  {integrityReport && (
                    <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      {integrityReport.totalSourceModels} LLMs
                      {integrityReport.sourceUpdatedAt
                        ? ` · ${formatTimestamp(integrityReport.sourceUpdatedAt)}`
                        : ''}
                    </span>
                  )}
                </div>
              </div>

              {isCheckingIntegrity && !effectiveIntegrityDiffReport && (
                <div className="px-3.5 py-2.5 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/70 dark:bg-teal-950/30 flex items-center gap-2.5 text-xs">
                  <RefreshCw className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-spin shrink-0" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {lang === 'de'
                      ? `Prüfe integrity-bench.com ("Table") für Spalte ${INTEGRITY_COL_LETTER}…`
                      : `Checking integrity-bench.com ("Table") for Column ${INTEGRITY_COL_LETTER}…`}
                  </span>
                </div>
              )}

              {!isSheetsConnected && integrityReport && (
                <div className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                  <span>{lang === 'de' ? integrityReport.summaryDe : integrityReport.summaryEn}</span>
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400 shrink-0">
                    {integrityReport.totalSourceModels} LLMs
                  </span>
                </div>
              )}

              {effectiveIntegrityDiffReport && (
                <>
                  <div
                    className={`px-3.5 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                      effectiveIntegrityDiffReport.actionableCount > 0
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30'
                        : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/25'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {effectiveIntegrityDiffReport.actionableCount > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      <span className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                        <strong className="font-bold text-slate-900 dark:text-white">
                          {effectiveIntegrityDiffReport.actionableCount > 0
                            ? lang === 'de'
                              ? `Integrity: ${effectiveIntegrityDiffReport.actionableCount} Änderung(en):`
                              : `Integrity: ${effectiveIntegrityDiffReport.actionableCount} update(s):`
                            : 'Integrity OK:'}
                        </strong>{' '}
                        {lang === 'de'
                          ? effectiveIntegrityDiffReport.summaryDe
                          : effectiveIntegrityDiffReport.summaryEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono tabular-nums text-xs shrink-0">
                      {effectiveIntegrityDiffReport.unmatchedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-bold">
                          {effectiveIntegrityDiffReport.unmatchedCount}{' '}
                          {lang === 'de' ? 'Ohne Zeile' : 'Unmatched'}
                        </span>
                      )}
                      {effectiveIntegrityDiffReport.missingCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                          {effectiveIntegrityDiffReport.missingCount}{' '}
                          {lang === 'de' ? 'Fehlt' : 'Missing'}
                        </span>
                      )}
                      {(effectiveIntegrityDiffReport.overwriteEstimateCount ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                          {effectiveIntegrityDiffReport.overwriteEstimateCount}{' '}
                          {lang === 'de' ? 'Schätzwert' : 'Estimate'}
                        </span>
                      )}
                      {effectiveIntegrityDiffReport.changedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                          {effectiveIntegrityDiffReport.changedCount}{' '}
                          {lang === 'de' ? 'Geändert' : 'Changed'}
                        </span>
                      )}
                      {ignoredIntegrityDiffs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowIgnoredIntegrity((prev) => !prev)}
                          className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300/80 dark:hover:bg-slate-700 cursor-pointer"
                          title={
                            lang === 'de'
                              ? 'Ignorierte Modelle anzeigen / wiederherstellen'
                              : 'Show / restore ignored models'
                          }
                        >
                          {ignoredIntegrityDiffs.length}{' '}
                          {lang === 'de' ? 'ignoriert' : 'ignored'}
                        </button>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold">
                        {effectiveIntegrityDiffReport.unchangedCount} OK
                      </span>
                    </div>
                  </div>

                  {showIgnoredIntegrity && ignoredIntegrityDiffs.length > 0 && (
                    <div className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-slate-600 dark:text-slate-400 mr-1">
                        {lang === 'de' ? 'Ignoriert:' : 'Ignored:'}
                      </span>
                      {ignoredIntegrityDiffs.map((d) => (
                        <button
                          key={d.integrityId}
                          type="button"
                          onClick={() => void onRestoreIntegrityModel?.(d.integrityId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-teal-400 hover:text-teal-600 dark:hover:text-teal-400 cursor-pointer"
                          title={lang === 'de' ? 'Wieder aktivieren' : 'Restore'}
                        >
                          <span>{d.integrityName}</span>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Diff-Only Integrity Rows */}
                  {actionableIntegrityDiffs.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-400">
                              <th className="py-1.5 px-2.5 w-7"></th>
                              <th className="py-1.5 px-3">
                                {lang === 'de' ? 'Integrity-Modell' : 'Integrity Model'}
                              </th>
                              <th className="py-1.5 px-3">
                                {lang === 'de' ? 'Sheet-Zeile' : 'Sheet Row'}
                              </th>
                              <th className="py-1.5 px-3">Spalte {INTEGRITY_COL_LETTER}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                            {actionableIntegrityDiffs.map((item) => {
                              const target = resolveEffectiveIntegrityTarget(item);
                              const canSelect = Boolean(
                                target.sheetRowNumber && target.sheetRowNumber >= 36
                              );
                              return (
                                <tr
                                  key={item.integrityId}
                                  className={
                                    item.status === 'new_unmatched'
                                      ? 'bg-purple-50/35 dark:bg-purple-950/15'
                                      : 'bg-amber-50/35 dark:bg-amber-950/15'
                                  }
                                >
                                  <td className="py-1.5 px-2.5 align-middle">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selectedIntegrityIds[item.integrityId])}
                                      disabled={!canSelect}
                                      onChange={() => handleToggleIntegrityItem(item.integrityId)}
                                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    />
                                  </td>
                                  <td className="py-1.5 px-3 align-middle whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                                        #{item.rank}
                                      </span>
                                      <span className="font-semibold text-slate-900 dark:text-white">
                                        {item.integrityName}
                                      </span>
                                      {item.isSiteNew && (
                                        <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                                          NEW
                                        </span>
                                      )}
                                      {renderIntegrityStatusBadge(item.status)}
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-3 align-middle">
                                    {item.status === 'new_unmatched' ? (
                                      <select
                                        value={manualIntegrityRowOverrides[item.integrityId] ?? ''}
                                        onChange={(e) =>
                                          handleAssignManualIntegrityRow(
                                            item.integrityId,
                                            e.target.value
                                          )
                                        }
                                        className="w-full max-w-[240px] px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                                      >
                                        <option value="">
                                          {lang === 'de'
                                            ? '— Zeile zuordnen (ab Z. 36) —'
                                            : '— Assign Row (36+) —'}
                                        </option>
                                        <option value={IGNORE_OPTION_VALUE}>
                                          {lang === 'de'
                                            ? '🚫 Ignorieren (nicht mehr nachfragen)'
                                            : "🚫 Ignore (don't ask again)"}
                                        </option>
                                        {sortedIntegrityPickerOptionsFor(item.integrityName).map(
                                          (m) => {
                                            const rowVal =
                                              integrityColByRow.get(m.sheetRowNumber ?? 0) ?? null;
                                            return (
                                              <option key={m.id} value={m.sheetRowNumber}>
                                                #{m.sheetRowNumber} · {m.displayName} (
                                                {rowVal !== null
                                                  ? `${INTEGRITY_COL_LETTER}=${formatIntegrityScore(rowVal)}`
                                                  : `${INTEGRITY_COL_LETTER} leer`}
                                                )
                                              </option>
                                            );
                                          }
                                        )}
                                      </select>
                                    ) : (
                                      <span className="text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400 mr-1">
                                          #{target.sheetRowNumber}
                                        </span>
                                        {target.matchedDisplayName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-3 align-middle font-mono tabular-nums whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="text-slate-600 dark:text-slate-400 line-through">
                                        {target.currentColAN !== null
                                          ? formatIntegrityScore(target.currentColAN)
                                          : '—'}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                        {formatIntegrityScore(item.liveScore)}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Unified Sheet Update Action Bar */}
          {apiAvailable && isSheetsConnected && hasAnyActionable && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs text-slate-700 dark:text-slate-300">
                {lang === 'de'
                  ? `Schreibt ausschließlich ab Zeile 36 in Spalten ${colDeLetter}/${colUsLetter || 'US'}, ${GDPX_COL_LETTER}, ${VALS_COL_LETTER} (fett), ${simpleBenchColLetter} (fett) bzw. ${INTEGRITY_COL_LETTER} (+ neue Zeilen).`
                  : `Writes strictly from Row 36+ to Columns ${colDeLetter}/${colUsLetter || 'US'}, ${GDPX_COL_LETTER}, ${VALS_COL_LETTER} (bold), ${simpleBenchColLetter} (bold) & ${INTEGRITY_COL_LETTER} (+ new rows).`}
              </span>

              {accessToken ? (
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
              ) : (
                <button
                  type="button"
                  onClick={() => void onSignIn()}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>
                    {isSigningIn
                      ? lang === 'de'
                        ? 'Verbinde…'
                        : 'Connecting…'
                      : authUser
                      ? lang === 'de'
                        ? 'Google Sheets neu verbinden um zu schreiben'
                        : 'Reconnect Google Sheets to Apply'
                      : lang === 'de'
                      ? 'Mit Google anmelden um Änderungen ins Sheet zu übernehmen'
                      : 'Sign in with Google to Apply Changes'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Explicit Unified Sheet Write Confirmation Dialog */}
        {pendingWrite && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'de'
                      ? `${pendingWrite.length} Änderung(en) in Google Sheets schreiben?`
                      : `Write ${pendingWrite.length} change(s) to Google Sheets?`}
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                    {lang === 'de'
                      ? `Alle Updates erfolgen ab Zeile 36 (Preise, GDPx ${GDPX_COL_LETTER}, Vals ${VALS_COL_LETTER} fett, SimpleBench ${simpleBenchColLetter} fett & Integrity ${INTEGRITY_COL_LETTER}). Neue Zeilen werden sauber ergänzt.`
                      : `All updates target History rows (Row 36+). Official Vals (${VALS_COL_LETTER}) & SimpleBench (${simpleBenchColLetter}) values will be formatted bold.`}
                  </p>
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-2">
                {pendingWrite.map((c, idx) => (
                  <div
                    key={`${c.cellRef}-${idx}`}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{c.label}</span>
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shrink-0">
                        {c.cellRef}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      <div
                        className={`px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 break-words ${
                          c.beforeIsBold ? 'font-bold' : 'font-normal'
                        }`}
                      >
                        − {c.kind === 'price' ? roundCurrencyString(c.before) : c.before}
                        {c.beforeIsBold === false && !c.isNewRowInsert ? ' (nicht-fett)' : ''}
                      </div>
                      <div
                        className={`px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 break-words ${
                          c.afterIsBold ? 'font-bold' : 'font-normal'
                        }`}
                      >
                        + {c.kind === 'price' ? roundCurrencyString(c.after) : c.after}
                        {c.afterIsBold ? ' (fett)' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isWriting}
                  onClick={() => setPendingWrite(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {lang === 'de' ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isWriting}
                  onClick={() => void handleConfirmSheetWrite()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {isWriting
                      ? lang === 'de'
                        ? 'Schreibe…'
                        : 'Writing…'
                      : lang === 'de'
                      ? 'Bestätigen & schreiben'
                      : 'Confirm & Write'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
