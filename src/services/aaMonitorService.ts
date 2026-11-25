import { ModelRecord, SheetColumnLayout } from '../types';
import {
  AaCheckReport,
  AaMonitorStatusResponse,
  AaSheetModelSnapshot,
  ModelResearchRequest,
  NewModelRowDraft,
} from '../types/aaMonitor';
import {
  createMonitorApiClient,
  parseMonitorJsonResponse,
} from './monitorApiClient';
import { isStaticPreviewError } from './pricingMonitorService';

export const aaMonitorApi = createMonitorApiClient<
  AaMonitorStatusResponse,
  AaCheckReport,
  AaSheetModelSnapshot
>('/api/aa-monitor');

export function extractAaSheetSnapshots(
  allModels: ModelRecord[],
  boldMask?: boolean[][],
  layout?: SheetColumnLayout,
  minHistoryRow = 36
): AaSheetModelSnapshot[] {
  const colIq = layout?.colActCodeReason ?? 3;
  const colNonHallu = layout?.colNonHallucination ?? 4;
  const colAcc = layout?.colScienceKnowledge ?? 5;
  const colMmmu = layout?.colVisionPlot ?? 6;
  const colMlcr = layout?.colMedReasoning ?? 7;
  const colExcel = layout?.colExcelAgent ?? 8;

  const getBold = (rowIdx: number, colIdx: number): boolean | null => {
    const val = boldMask?.[rowIdx]?.[colIdx];
    return typeof val === 'boolean' ? val : null;
  };

  return allModels
    .filter((m) => typeof m.sheetRowNumber === 'number' && m.sheetRowNumber >= minHistoryRow)
    .map((m) => {
      const rowNum = m.sheetRowNumber as number;
      const rowIdx = rowNum - 1;
      const s = m.rawScores;
      const numOrNull = (v: number | null | undefined): number | null =>
        typeof v === 'number' && Number.isFinite(v) ? v : null;

      return {
        id: m.id,
        name: m.name,
        displayName: m.displayName,
        companyName: m.companyName,
        releaseDate: m.releaseDate,
        sheetRowNumber: rowNum,
        scores: {
          iq: numOrNull(s.actCodeReason),
          nonHallucination: numOrNull(s.nonHallucination),
          accuracy: numOrNull(s.scienceKnowledge),
          mmmuPro: numOrNull(s.visionPlot),
          mlcr: numOrNull(s.medReasoning),
          excelAgent: numOrNull(s.excelAgent),
        },
        boldMask: {
          iq: getBold(rowIdx, colIq),
          nonHallucination: getBold(rowIdx, colNonHallu),
          accuracy: getBold(rowIdx, colAcc),
          mmmuPro: getBold(rowIdx, colMmmu),
          mlcr: getBold(rowIdx, colMlcr),
          excelAgent: getBold(rowIdx, colExcel),
        },
      };
    });
}

export async function requestNewModelRowDraft(
  payload: ModelResearchRequest
): Promise<NewModelRowDraft> {
  const res = await fetch('/api/model-research/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseMonitorJsonResponse<{ draft?: NewModelRowDraft; error?: string }>(res);
  if (!data.draft) {
    throw new Error(data.error || `Model research failed (HTTP ${res.status})`);
  }
  return data.draft;
}

export { isStaticPreviewError };
