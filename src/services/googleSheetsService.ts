import type { AuthorSocialLink } from '../types';

export const DEFAULT_SPREADSHEET_ID = '1Meep9uT4Q2qRWaBM1Bwu4ZnYNB0J51ib-hP1OsOOCuI';
export const MAIN_SHEET_GID = 170267419;
export const LABS_SHEET_GID = 355721692;

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  index: number;
  rowCount: number;
  columnCount: number;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  locale?: string;
  timeZone?: string;
  sheets: SheetTabInfo[];
}

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export class GoogleSheetsApiError extends Error {
  status: number;
  isAuthError: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GoogleSheetsApiError';
    this.status = status;
    this.isAuthError = status === 401 || status === 403;
  }
}

/**
 * Escapes a Google Sheet tab title for A1 range notation (e.g. "Tab's" -> "'Tab''s'").
 */
export function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

/**
 * Converts a 0-based column index into A1 column letters (0 -> A, 25 -> Z, 26 -> AA).
 */
export function columnIndexToA1(colIdx: number): string {
  let n = colIdx + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

async function parseApiError(res: Response, context: string): Promise<GoogleSheetsApiError> {
  let msg = `${context} (HTTP ${res.status})`;
  try {
    const body = await res.json();
    if (body?.error?.message) {
      msg = `${context}: ${body.error.message}`;
    }
  } catch {
    // ignore JSON parse errors
  }
  return new GoogleSheetsApiError(msg, res.status);
}

/**
 * Fetches spreadsheet metadata (title + sheet tab list) without hardcoding sheet names.
 */
export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=spreadsheetId,properties(title,locale,timeZone),sheets(properties(sheetId,title,index,gridProperties(rowCount,columnCount)))`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw await parseApiError(res, 'Failed to read spreadsheet metadata');
  }

  const data = await res.json();
  const sheets: SheetTabInfo[] = Array.isArray(data.sheets)
    ? data.sheets.map((s: any) => ({
        sheetId: Number(s?.properties?.sheetId ?? 0),
        title: String(s?.properties?.title ?? ''),
        index: Number(s?.properties?.index ?? 0),
        rowCount: Number(s?.properties?.gridProperties?.rowCount ?? 1000),
        columnCount: Number(s?.properties?.gridProperties?.columnCount ?? 40),
      }))
    : [];

  return {
    spreadsheetId: String(data.spreadsheetId || spreadsheetId),
    title: String(data.properties?.title || 'Google Sheet'),
    locale: data.properties?.locale,
    timeZone: data.properties?.timeZone,
    sheets,
  };
}

/**
 * Resolves a sheet tab dynamically by gid (sheetId), falling back to the first tab if needed.
 */
export function resolveSheetTab(
  metadata: SpreadsheetMetadata,
  targetGid?: number
): SheetTabInfo {
  if (typeof targetGid === 'number') {
    const matched = metadata.sheets.find((s) => s.sheetId === targetGid);
    if (matched) return matched;
  }
  if (metadata.sheets.length > 0) {
    return metadata.sheets[0];
  }
  throw new Error('Spreadsheet contains no tabs.');
}

/**
 * Reads all rows from a specific tab via Google Sheets API v4.
 */
export async function fetchSheetValues(
  spreadsheetId: string,
  sheetTitle: string,
  accessToken: string,
  valueRenderOption: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA' = 'FORMATTED_VALUE'
): Promise<string[][]> {
  const range = quoteSheetTitle(sheetTitle);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=${valueRenderOption}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw await parseApiError(res, `Failed to read values from "${sheetTitle}"`);
  }

  const data = await res.json();
  if (!Array.isArray(data.values)) return [];
  return data.values.map((row: unknown) =>
    Array.isArray(row) ? row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))) : []
  );
}

export interface SheetGridWithFormatting {
  rows: string[][];
  greenMask: boolean[][];
  boldMask: boolean[][];
  cellO1Links?: AuthorSocialLink[];
}

function extractCellRichLinks(cell: any): AuthorSocialLink[] {
  const formatted = typeof cell?.formattedValue === 'string' ? cell.formattedValue : '';
  const runs: any[] = Array.isArray(cell?.textFormatRuns) ? cell.textFormatRuns : [];
  const links: AuthorSocialLink[] = [];

  if (formatted && runs.length > 0) {
    for (let i = 0; i < runs.length; i++) {
      const uri = runs[i]?.format?.link?.uri;
      if (!uri || typeof uri !== 'string') continue;
      const start = Number(runs[i]?.startIndex ?? 0);
      const end =
        i + 1 < runs.length ? Number(runs[i + 1]?.startIndex ?? formatted.length) : formatted.length;
      const label = formatted
        .slice(start, end)
        .replace(/^[\s,:;·|-]+|[\s,:;·|-]+$/g, '')
        .trim();
      if (label && /^https?:\/\//i.test(uri)) {
        links.push({ label, url: uri });
      }
    }
  }

  if (links.length === 0 && typeof cell?.hyperlink === 'string' && /^https?:\/\//i.test(cell.hyperlink)) {
    const label = formatted.trim() || 'Link';
    links.push({ label, url: cell.hyperlink });
  }

  return links;
}

/**
 * Reads formatted values, cell background colors (e.g. mint green OpenWeights cells),
 * cell bold text formatting, and cell O1 hyperlinks directly from Google Sheets API v4 via includeGridData=true.
 */
export async function fetchSheetGridWithFormatting(
  spreadsheetId: string,
  sheetTitle: string,
  accessToken: string,
  options?: { expandHorizontalMerges?: boolean }
): Promise<SheetGridWithFormatting> {
  const range = encodeURIComponent(quoteSheetTitle(sheetTitle));
  const fields = encodeURIComponent(
    'sheets(merges,data(startRow,startColumn,rowData(values(formattedValue,effectiveValue(numberValue),hyperlink,textFormatRuns(startIndex,format(link(uri))),effectiveFormat(backgroundColor,textFormat(bold),numberFormat(type))))))'
  );
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?ranges=${range}&includeGridData=true&fields=${fields}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw await parseApiError(res, `Failed to read grid formatting from "${sheetTitle}"`);
  }

  const data = await res.json();
  const sheetObj = Array.isArray(data.sheets) ? data.sheets[0] : null;
  const gridData = Array.isArray(sheetObj?.data) ? sheetObj.data[0] : null;
  const rowData = Array.isArray(gridData?.rowData) ? gridData.rowData : [];
  const startRow = Math.max(0, Number(gridData?.startRow ?? 0));
  const startColumn = Math.max(0, Number(gridData?.startColumn ?? 0));

  const rows: string[][] = [];
  const greenMask: boolean[][] = [];
  const boldMask: boolean[][] = [];

  for (let rPad = 0; rPad < startRow; rPad++) {
    rows.push([]);
    greenMask.push([]);
    boldMask.push([]);
  }

  const row0Cells = Array.isArray(rowData[0]?.values) ? rowData[0].values : [];
  const authorCell =
    row0Cells.find((cell: any) => {
      const text = String(cell?.formattedValue || '').toLowerCase();
      if (
        text &&
        (text.includes('app &') ||
          text.includes('table by') ||
          text.includes('table from') ||
          text.includes('tabelle von') ||
          (text.includes('thomas') && (text.includes('youtube') || text.includes('github') || text.includes('orcid'))))
      ) {
        return true;
      }
      const links = extractCellRichLinks(cell);
      return links.some((l) => /orcid\.org|github\.com|youtube\.com|scholar\.google/i.test(l.url));
    }) ?? row0Cells[14];
  const cellO1Links = authorCell ? extractCellRichLinks(authorCell) : [];

  const linkColIndices = new Set<number>();
  const row1Cells = Array.isArray(rowData[1]?.values) ? rowData[1].values : [];
  row1Cells.forEach((cell: any, idx: number) => {
    const h = String(cell?.formattedValue || '').trim().toLowerCase();
    if (h.includes('link to chat') || h.includes('link to api')) {
      linkColIndices.add(startColumn + idx);
    }
  });
  if (linkColIndices.size === 0) {
    linkColIndices.add(15);
    linkColIndices.add(16);
  }

  for (let rowIdx = 0; rowIdx < rowData.length; rowIdx++) {
    const rowItem = rowData[rowIdx];
    const absRow = startRow + rowIdx;
    const cells = Array.isArray(rowItem?.values) ? rowItem.values : [];
    const rowVals: string[] = startColumn > 0 ? new Array(startColumn).fill('') : [];
    const rowGreens: boolean[] = startColumn > 0 ? new Array(startColumn).fill(false) : [];
    const rowBolds: boolean[] = startColumn > 0 ? new Array(startColumn).fill(false) : [];

    for (let colOffset = 0; colOffset < cells.length; colOffset++) {
      const cell = cells[colOffset];
      const absCol = startColumn + colOffset;
      const formattedStr =
        cell?.formattedValue !== undefined && cell?.formattedValue !== null
          ? String(cell.formattedValue)
          : '';
      const rawNumVal = cell?.effectiveValue?.numberValue;
      const fmtType = cell?.effectiveFormat?.numberFormat?.type;
      let cellVal = formattedStr;

      if (
        typeof rawNumVal === 'number' &&
        Number.isFinite(rawNumVal) &&
        (!fmtType || fmtType === 'NUMBER' || fmtType === 'SCIENTIFIC') &&
        !/[%$€£¥/:a-zA-Z]/.test(formattedStr) &&
        !/^\d{4}-\d{2}-\d{2}/.test(formattedStr.trim()) &&
        !/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(formattedStr.trim())
      ) {
        const parsedFmt = parseFloat(formattedStr.trim().replace(',', '.'));
        if (formattedStr.trim() === '' || (Number.isFinite(parsedFmt) && Math.abs(parsedFmt - rawNumVal) <= 1)) {
          cellVal = String(rawNumVal);
        }
      }

      // Preserve rich cell hyperlinks in Link to Chat (Col P) and Link to API (Col Q)
      if (absRow >= 2 && linkColIndices.has(absCol) && !/https?:\/\//i.test(cellVal)) {
        let richUri =
          typeof cell?.hyperlink === 'string' && /^https?:\/\//i.test(cell.hyperlink)
            ? cell.hyperlink.trim()
            : '';
        if (!richUri && Array.isArray(cell?.textFormatRuns)) {
          for (const run of cell.textFormatRuns) {
            const uri = run?.format?.link?.uri;
            if (typeof uri === 'string' && /^https?:\/\//i.test(uri)) {
              richUri = uri.trim();
              break;
            }
          }
        }
        if (richUri) {
          cellVal = cellVal.trim() ? `${cellVal.trim()} ${richUri}` : richUri;
        }
      }

      rowVals.push(cellVal);
      const bg = cell?.effectiveFormat?.backgroundColor;
      let isGreen = false;
      if (bg && typeof bg === 'object') {
        const r = Number(bg.red ?? 0);
        const g = Number(bg.green ?? 0);
        const b = Number(bg.blue ?? 0);
        // Mint / light green background (#d9ead3 -> r≈0.851, g≈0.918, b≈0.827)
        isGreen = g > r + 0.03 && g > b + 0.03;
      }
      rowGreens.push(isGreen);
      rowBolds.push(Boolean(cell?.effectiveFormat?.textFormat?.bold));
    }

    rows.push(rowVals);
    greenMask.push(rowGreens);
    boldMask.push(rowBolds);
  }

  // Optionally propagate single-row horizontal merge values (e.g. merged country headers in the Labs sheet)
  if (options?.expandHorizontalMerges && Array.isArray(sheetObj?.merges)) {
    for (const merge of sheetObj.merges) {
      const rStart = Number(merge?.startRowIndex ?? -1);
      const rEnd = Number(merge?.endRowIndex ?? -1);
      const cStart = Number(merge?.startColumnIndex ?? -1);
      const cEnd = Number(merge?.endColumnIndex ?? -1);
      if (rStart >= 0 && rEnd === rStart + 1 && cStart >= 0 && cEnd > cStart + 1 && rows[rStart]) {
        const val = (rows[rStart][cStart] || '').trim();
        if (!val) continue;
        while (rows[rStart].length < cEnd) {
          rows[rStart].push('');
          greenMask[rStart]?.push(false);
          boldMask[rStart]?.push(false);
        }
        for (let c = cStart + 1; c < cEnd; c++) {
          if (!rows[rStart][c]) {
            rows[rStart][c] = val;
          }
        }
      }
    }
  }

  return { rows, greenMask, boldMask, cellO1Links };
}

/**
 * Reads raw formulas/values for a specific 1-based row (Columns A..AB) to detect and protect formulas before editing.
 */
export async function fetchRowFormulas(
  spreadsheetId: string,
  sheetTitle: string,
  rowNumber1Based: number,
  accessToken: string,
  endColLetter = 'AZ'
): Promise<string[]> {
  const rows = await fetchMultiRowFormulas(
    spreadsheetId,
    sheetTitle,
    rowNumber1Based,
    rowNumber1Based,
    accessToken,
    endColLetter
  );
  return rows[0] || [];
}

/**
 * Reads raw formulas/values across a contiguous range of 1-based rows (Columns A..endColLetter)
 * so new row inserts can clone the user's existing composite formulas cleanly without modifying them.
 */
export async function fetchMultiRowFormulas(
  spreadsheetId: string,
  sheetTitle: string,
  startRow1Based: number,
  endRow1Based: number,
  accessToken: string,
  endColLetter = 'AZ'
): Promise<string[][]> {
  const range = `${quoteSheetTitle(sheetTitle)}!A${startRow1Based}:${endColLetter}${endRow1Based}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=FORMULA`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw await parseApiError(
      res,
      `Failed to inspect formulas in rows ${startRow1Based}:${endRow1Based}`
    );
  }

  const data = await res.json();
  const rows: unknown[] = Array.isArray(data.values) ? data.values : [];
  return rows.map((row) =>
    Array.isArray(row)
      ? row.map((cell: unknown) => (cell === null || cell === undefined ? '' : String(cell)))
      : []
  );
}

export interface CellUpdateSpec {
  range: string; // Full A1 notation including quoted sheet title, e.g. "'Tab'!O42"
  value: string | number;
}

/**
 * Atomically updates one or more specific cells in the Google Sheet using USER_ENTERED parsing.
 */
export async function batchUpdateSheetCells(
  spreadsheetId: string,
  updates: CellUpdateSpec[],
  accessToken: string
): Promise<{ totalUpdatedCells: number }> {
  if (updates.length === 0) {
    return { totalUpdatedCells: 0 };
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values:batchUpdate`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: updates.map((u) => ({
        range: u.range,
        majorDimension: 'ROWS',
        values: [[u.value]],
      })),
    }),
  });

  if (!res.ok) {
    throw await parseApiError(res, 'Failed to write changes to Google Sheet');
  }

  const data = await res.json();
  return {
    totalUpdatedCells: Number(data.totalUpdatedCells ?? updates.length),
  };
}

/**
 * Inserts a new column at a 0-based index (e.g. index 20 = Column U right after Column T)
 * and then populates specific cell updates inside that newly created column.
 */
export async function insertColumnAndWriteCells(
  spreadsheetId: string,
  sheetId: number,
  insertColIndex0Based: number,
  updates: CellUpdateSpec[],
  accessToken: string
): Promise<{ totalUpdatedCells: number }> {
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}:batchUpdate`;

  const insertRes = await fetch(batchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: insertColIndex0Based,
              endIndex: insertColIndex0Based + 1,
            },
            inheritFromBefore: true,
          },
        },
      ],
    }),
  });

  if (!insertRes.ok) {
    throw await parseApiError(
      insertRes,
      `Failed to insert column ${columnIndexToA1(insertColIndex0Based)}`
    );
  }

  return batchUpdateSheetCells(spreadsheetId, updates, accessToken);
}

/**
 * Inserts a new row at a 1-based row position (inside the History section, above Sources & Notes)
 * and writes its cell values cleanly via Google Sheets API v4.
 */
export async function insertModelRowInSheet(
  spreadsheetId: string,
  sheetId: number,
  sheetTitle: string,
  insertAtRow1Based: number,
  rowValues: (string | number)[],
  accessToken: string
): Promise<void> {
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}:batchUpdate`;

  const insertRes = await fetch(batchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: insertAtRow1Based - 1,
              endIndex: insertAtRow1Based,
            },
            inheritFromBefore: true,
          },
        },
      ],
    }),
  });

  if (!insertRes.ok) {
    throw await parseApiError(insertRes, `Failed to insert new row at row ${insertAtRow1Based}`);
  }

  const endColLetter = columnIndexToA1(Math.max(0, rowValues.length - 1));
  const targetRange = `${quoteSheetTitle(sheetTitle)}!A${insertAtRow1Based}:${endColLetter}${insertAtRow1Based}`;
  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(targetRange)}?valueInputOption=USER_ENTERED`;

  const writeRes = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: targetRange,
      majorDimension: 'ROWS',
      values: [rowValues],
    }),
  });

  if (!writeRes.ok) {
    throw await parseApiError(writeRes, `Row ${insertAtRow1Based} was inserted, but writing cell values failed`);
  }
}

export interface CellBoldSpec {
  row1Based: number;
  col0Based: number;
  bold?: boolean;
  numberFormatPattern?: string;
}

/**
 * Sets userEnteredFormat.textFormat.bold and/or userEnteredFormat.numberFormat on explicit cells
 * without disturbing colors or unrelated formatting.
 */
export async function applyCellsBoldFormatting(
  spreadsheetId: string,
  sheetId: number,
  cells: CellBoldSpec[],
  accessToken: string
): Promise<void> {
  if (cells.length === 0) return;

  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}:batchUpdate`;

  const requests = cells
    .map((c) => {
      const userEnteredFormat: Record<string, unknown> = {};
      const fieldPaths: string[] = [];

      if (typeof c.bold === 'boolean') {
        userEnteredFormat.textFormat = { bold: c.bold };
        fieldPaths.push('userEnteredFormat.textFormat.bold');
      }
      if (typeof c.numberFormatPattern === 'string' && c.numberFormatPattern) {
        userEnteredFormat.numberFormat = {
          type: 'NUMBER',
          pattern: c.numberFormatPattern,
        };
        fieldPaths.push('userEnteredFormat.numberFormat');
      }

      if (fieldPaths.length === 0) return null;

      return {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: c.row1Based - 1,
            endRowIndex: c.row1Based,
            startColumnIndex: c.col0Based,
            endColumnIndex: c.col0Based + 1,
          },
          cell: {
            userEnteredFormat,
          },
          fields: fieldPaths.join(','),
        },
      };
    })
    .filter((req): req is NonNullable<typeof req> => req !== null);

  if (requests.length === 0) return;

  const res = await fetch(batchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    throw await parseApiError(res, 'Failed to apply cell formatting in Google Sheet');
  }
}

export interface FormulaCopySpec {
  sourceRow1BasedAfterInsert: number;
  col0Based: number;
}

/**
 * Inserts a new row at a 1-based row position, optionally clones existing Sheet formulas
 * (such as the user's NEW / OLD / Worst Case formulas) via PASTE_FORMULA with relative row shifts,
 * writes explicit sparse cells, and applies bold/non-bold text & number formatting.
 */
export async function insertRowAndWriteSparseCells(
  spreadsheetId: string,
  sheetId: number,
  insertAtRow1Based: number,
  cellUpdates: CellUpdateSpec[],
  boldCells: CellBoldSpec[],
  accessToken: string,
  formulaCopySpecs: FormulaCopySpec[] = []
): Promise<{ totalUpdatedCells: number }> {
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}:batchUpdate`;

  const requests: Array<Record<string, unknown>> = [
    {
      insertDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: insertAtRow1Based - 1,
          endIndex: insertAtRow1Based,
        },
        inheritFromBefore: true,
      },
    },
    ...formulaCopySpecs.map((spec) => ({
      copyPaste: {
        source: {
          sheetId,
          startRowIndex: spec.sourceRow1BasedAfterInsert - 1,
          endRowIndex: spec.sourceRow1BasedAfterInsert,
          startColumnIndex: spec.col0Based,
          endColumnIndex: spec.col0Based + 1,
        },
        destination: {
          sheetId,
          startRowIndex: insertAtRow1Based - 1,
          endRowIndex: insertAtRow1Based,
          startColumnIndex: spec.col0Based,
          endColumnIndex: spec.col0Based + 1,
        },
        pasteType: 'PASTE_FORMULA',
        pasteOrientation: 'NORMAL',
      },
    })),
  ];

  const insertRes = await fetch(batchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!insertRes.ok) {
    throw await parseApiError(insertRes, `Failed to insert new row at row ${insertAtRow1Based}`);
  }

  const writeResult = await batchUpdateSheetCells(spreadsheetId, cellUpdates, accessToken);
  if (boldCells.length > 0) {
    await applyCellsBoldFormatting(spreadsheetId, sheetId, boldCells, accessToken);
  }
  return writeResult;
}

/**
 * Lists recent Google Spreadsheets from the user's Google Drive for optional spreadsheet switching.
 */
export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&pageSize=20&fields=${fields}&includeItemsFromAllDrives=true&supportsAllDrives=true`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw await parseApiError(res, 'Failed to list Google Spreadsheets from Drive');
  }

  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}
