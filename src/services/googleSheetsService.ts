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

/**
 * Reads raw formulas/values for a specific 1-based row (Columns A..AB) to detect and protect formulas before editing.
 */
export async function fetchRowFormulas(
  spreadsheetId: string,
  sheetTitle: string,
  rowNumber1Based: number,
  accessToken: string,
  endColLetter = 'AB'
): Promise<string[]> {
  const range = `${quoteSheetTitle(sheetTitle)}!A${rowNumber1Based}:${endColLetter}${rowNumber1Based}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=FORMULA`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw await parseApiError(res, `Failed to inspect formulas in row ${rowNumber1Based}`);
  }

  const data = await res.json();
  const row = Array.isArray(data.values) && Array.isArray(data.values[0]) ? data.values[0] : [];
  return row.map((cell: unknown) => (cell === null || cell === undefined ? '' : String(cell)));
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
