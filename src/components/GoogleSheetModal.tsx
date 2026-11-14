import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Plus,
  Pencil,
  FileText,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  ExternalLink,
  Search,
  FolderOpen,
  Save,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { LoadedDatasets } from '../services/dataService';
import {
  DEFAULT_SPREADSHEET_ID,
  DriveSpreadsheetFile,
  CellUpdateSpec,
  batchUpdateSheetCells,
  columnIndexToA1,
  fetchRowFormulas,
  insertColumnAndWriteCells,
  insertModelRowInSheet,
  listUserSpreadsheets,
  quoteSheetTitle,
} from '../services/googleSheetsService';
import {
  US_PRICE_HEADER_ROW1,
  US_PRICE_HEADER_ROW2,
  lookupResearchedUsPrice,
} from '../data/usPricingData';
import { SheetColumnLayout } from '../types';
import { Language } from '../utils/i18n';

type ModalTab = 'edit_model' | 'add_model' | 'edit_notes';

interface PendingWriteConfirmation {
  kind: 'update_cells' | 'insert_row' | 'insert_column_and_cells';
  title: string;
  description: string;
  sheetTitle: string;
  spreadsheetTitle: string;
  changes: Array<{
    cellRef: string;
    label: string;
    before: string;
    after: string;
    hadFormula?: boolean;
  }>;
  updates?: CellUpdateSpec[];
  insertRowData?: {
    insertAtRow: number;
    values: (string | number)[];
  };
  insertColumnData?: {
    insertColIndex: number;
    updates: CellUpdateSpec[];
  };
}

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  loadedData: LoadedDatasets;
  accessToken: string | null;
  authUser: User | null;
  isSigningIn: boolean;
  onSignIn: () => Promise<void>;
  onRefreshFromSheets: (spreadsheetIdOverride?: string) => Promise<void>;
  activeSpreadsheetId: string;
  onChangeSpreadsheetId: (newId: string) => void;
  initialModelId?: string | null;
}

interface EditableFieldConfig {
  colIndex: number;
  key: string;
  labelEn: string;
  labelDe: string;
  group: 'identity' | 'benchmarks' | 'scores' | 'meta';
  placeholder?: string;
}

function buildModelFields(layout: SheetColumnLayout): EditableFieldConfig[] {
  const releaseLetter = columnIndexToA1(layout.colReleaseDate);
  const creatorLetter = columnIndexToA1(layout.colModelCreator);
  const deLetter = columnIndexToA1(layout.colDePrice);

  const fields: EditableFieldConfig[] = [
    { colIndex: 18, key: 'colS', labelEn: 'Canonical Model Name (Col S)', labelDe: 'Kanonischer Modellname (Spalte S)', group: 'identity' },
    { colIndex: 1, key: 'colB', labelEn: 'Display Name + Badges (Col B)', labelDe: 'Anzeigename + Badges (Spalte B)', group: 'identity' },
    { colIndex: 2, key: 'colC', labelEn: 'Creator | Release Label (Col C)', labelDe: 'Creator | Release-Text (Spalte C)', group: 'identity' },
    { colIndex: layout.colReleaseDate, key: 'colRelease', labelEn: `Release Date YYYY-MM-DD (Col ${releaseLetter})`, labelDe: `Release-Datum YYYY-MM-DD (Spalte ${releaseLetter})`, group: 'identity', placeholder: '2026-11-01' },
    { colIndex: layout.colModelCreator, key: 'colCreator', labelEn: `Model Creator / Lab (Col ${creatorLetter})`, labelDe: `Modell-Ersteller / Lab (Spalte ${creatorLetter})`, group: 'identity' },

    { colIndex: 3, key: 'colD', labelEn: 'IQ (Col D)', labelDe: 'IQ (Spalte D)', group: 'benchmarks' },
    { colIndex: 4, key: 'colE', labelEn: 'Non-Hallu-Rate (Col E)', labelDe: 'Non-Hallu-Rate (Spalte E)', group: 'benchmarks' },
    { colIndex: 5, key: 'colF', labelEn: 'Science Knowledge (Col F)', labelDe: 'Science Knowledge (Spalte F)', group: 'benchmarks' },
    { colIndex: 6, key: 'colG', labelEn: 'Plot Reading (Col G)', labelDe: 'Plot Reading (Spalte G)', group: 'benchmarks' },
    { colIndex: 7, key: 'colH', labelEn: 'Diagnostics (Col H)', labelDe: 'Diagnostics (Spalte H)', group: 'benchmarks' },
    { colIndex: 8, key: 'colI', labelEn: 'Excel Analyst (Col I)', labelDe: 'Excel Analyst (Spalte I)', group: 'benchmarks' },
    { colIndex: 9, key: 'colJ', labelEn: 'Trick Questions (Col J)', labelDe: 'Trick Questions (Spalte J)', group: 'benchmarks' },
    { colIndex: 10, key: 'colK', labelEn: 'Econ & Legal Work (Col K)', labelDe: 'Econ & Legal Work (Spalte K)', group: 'benchmarks' },

    { colIndex: 11, key: 'colL', labelEn: 'OLD Score (Col L)', labelDe: 'OLD Score (Spalte L)', group: 'scores' },
    { colIndex: 12, key: 'colM', labelEn: 'NEW Score (Col M)', labelDe: 'NEW Score (Spalte M)', group: 'scores' },
    { colIndex: 13, key: 'colN', labelEn: 'Worst Case Score (Col N)', labelDe: 'Worst Case Score (Spalte N)', group: 'scores' },

    { colIndex: layout.colDePrice, key: 'colDePrice', labelEn: `DE Monthly Price / Note (Col ${deLetter})`, labelDe: `DE-Monatspreis / Hinweis (Spalte ${deLetter})`, group: 'meta', placeholder: '20€ or 14-22€' },
  ];

  if (layout.colUsPrice !== null) {
    const usLetter = columnIndexToA1(layout.colUsPrice);
    fields.push({
      colIndex: layout.colUsPrice,
      key: 'colUsPrice',
      labelEn: `US Monthly Price / Note (Col ${usLetter})`,
      labelDe: `US-Monatspreis / Hinweis (Spalte ${usLetter})`,
      group: 'meta',
      placeholder: '$20 or $17-20',
    });
  }

  fields.push(
    { colIndex: 14, key: 'colO', labelEn: 'Storyline Note (Col O)', labelDe: 'Storyline-Notiz (Spalte O)', group: 'meta' },
    { colIndex: 15, key: 'colP', labelEn: 'Chat Link or "paid" (Col P)', labelDe: 'Chat-Link oder "paid" (Spalte P)', group: 'meta' },
    { colIndex: 16, key: 'colQ', labelEn: 'Other / API Link (Col Q)', labelDe: 'Weiterer / API-Link (Spalte Q)', group: 'meta' }
  );

  return fields;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  lang,
  loadedData,
  accessToken,
  authUser,
  isSigningIn,
  onSignIn,
  onRefreshFromSheets,
  activeSpreadsheetId,
  onChangeSpreadsheetId,
  initialModelId,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('edit_model');
  const [modelSearch, setModelSearch] = useState('');
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(null);

  // Live row values & formulas fetched from Google Sheets API
  const [rawFormulas, setRawFormulas] = useState<string[]>([]);
  const [originalFormatted, setOriginalFormatted] = useState<Record<number, string>>({});
  const [editValues, setEditValues] = useState<Record<number, string>>({});
  const [unlockedFormulaCols, setUnlockedFormulaCols] = useState<Record<number, boolean>>({});
  const [isLoadingRow, setIsLoadingRow] = useState(false);

  const columnLayout: SheetColumnLayout = useMemo(
    () =>
      loadedData.columnLayout ?? {
        hasUsPriceCol: false,
        colDePrice: 19,
        colUsPrice: null,
        colIqOld: 20,
        colNonHalluOld: 21,
        colScienceOld: 22,
        colTrickOld: 23,
        colReleaseDate: 24,
        colModelCreator: 25,
        colCompany: 34,
        colDomain: 35,
        colFlag: 36,
      },
    [loadedData.columnLayout]
  );

  const modelFields = useMemo(() => buildModelFields(columnLayout), [columnLayout]);

  // Add New Model form
  const [newRowFields, setNewRowFields] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: '',
    4: '',
    5: '',
    6: '',
    7: '',
    8: '',
    9: '',
    10: '',
    11: '',
    12: '',
    13: '',
    14: '',
    15: '',
    16: '',
    18: '',
    19: '',
    [columnLayout.colReleaseDate]: new Date().toISOString().slice(0, 10),
    [columnLayout.colModelCreator]: '',
  });
  const [insertPosition, setInsertPosition] = useState<'top_history' | 'end_history'>('top_history');

  // Edit Header & Notes
  const [notesForm, setNotesForm] = useState({
    a1: '',
    c1: '',
    cNotes: '',
    oNotes: '',
  });
  const [notesOrig, setNotesOrig] = useState({
    a1: '',
    c1: '',
    cNotes: '',
    oNotes: '',
  });

  // Drive Spreadsheet Browser
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

  // Confirmation & Feedback state
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingWriteConfirmation | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writeSuccess, setWriteSuccess] = useState<string | null>(null);

  const sheetTitle = loadedData.activeSheetTitle || 'Sheet1';
  const spreadsheetTitle = loadedData.spreadsheetTitle || 'Science-IQ Google Sheet';
  const targetNotesRow = loadedData.notesRow || 34;
  const historyStartRow = loadedData.historyStartRow || 36;
  const sourcesNotesRow = loadedData.sourcesNotesRow || (loadedData.rawRows ? loadedData.rawRows.length + 1 : historyStartRow + 1);

  // Models that have a tracked Google Sheet row number
  const editableModels = useMemo(() => {
    const list = (loadedData.allModels || []).filter((m) => typeof m.sheetRowNumber === 'number');
    const q = modelSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.companyName.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        String(m.sheetRowNumber).includes(q)
    );
  }, [loadedData.allModels, modelSearch]);

  // Select initial model when opening modal
  useEffect(() => {
    if (!isOpen) return;
    setWriteError(null);
    setWriteSuccess(null);
    setPendingConfirmation(null);

    if (initialModelId) {
      const found = loadedData.allModels.find((m) => m.id === initialModelId && m.sheetRowNumber);
      if (found?.sheetRowNumber) {
        setSelectedRowNumber(found.sheetRowNumber);
        setActiveTab('edit_model');
        return;
      }
    }

    if (selectedRowNumber === null && editableModels.length > 0 && editableModels[0].sheetRowNumber) {
      setSelectedRowNumber(editableModels[0].sheetRowNumber);
    }
  }, [isOpen, initialModelId, loadedData.allModels, editableModels, selectedRowNumber]);

  // Populate Notes form from rawRows whenever modal opens or data reloads
  useEffect(() => {
    if (!isOpen) return;
    const rows = loadedData.rawRows;
    const a1 = rows?.[0]?.[0] ?? loadedData.headerMeta?.cellA1 ?? '';
    const c1 = rows?.[0]?.[2] ?? loadedData.headerMeta?.cellC1 ?? '';
    const cNotes = rows?.[targetNotesRow - 1]?.[2] ?? loadedData.notesMeta?.section1Content ?? '';
    const oNotes = rows?.[targetNotesRow - 1]?.[14] ?? loadedData.notesMeta?.section2Content ?? '';
    const vals = { a1, c1, cNotes, oNotes };
    setNotesForm(vals);
    setNotesOrig(vals);
  }, [isOpen, loadedData, targetNotesRow]);

  // Fetch live row formulas + values whenever selectedRowNumber changes and Sheets API is connected
  useEffect(() => {
    if (!isOpen || !accessToken || !selectedRowNumber || loadedData.dataSource !== 'sheets_api') {
      return;
    }

    let cancelled = false;
    setIsLoadingRow(true);
    setWriteError(null);
    setUnlockedFormulaCols({});

    const formattedRow = loadedData.rawRows?.[selectedRowNumber - 1] || [];
    const initialFormatted: Record<number, string> = {};
    for (const field of modelFields) {
      initialFormatted[field.colIndex] = formattedRow[field.colIndex] ?? '';
    }
    setOriginalFormatted(initialFormatted);
    setEditValues(initialFormatted);

    const endColLetter = columnIndexToA1(Math.max(27, columnLayout.colModelCreator + 1));
    fetchRowFormulas(activeSpreadsheetId, sheetTitle, selectedRowNumber, accessToken, endColLetter)
      .then((formulas) => {
        if (cancelled) return;
        setRawFormulas(formulas);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('Could not load row formulas:', err);
        setRawFormulas([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRow(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, accessToken, selectedRowNumber, activeSpreadsheetId, sheetTitle, loadedData.dataSource, loadedData.rawRows, modelFields, columnLayout.colModelCreator]);

  if (!isOpen) return null;

  const isSheetsConnected = Boolean(accessToken && loadedData.dataSource === 'sheets_api');

  const handleLoadDriveSpreadsheets = async () => {
    if (!accessToken) return;
    setIsLoadingDrive(true);
    setWriteError(null);
    try {
      const files = await listUserSpreadsheets(accessToken);
      setDriveFiles(files);
      setShowDrivePicker(true);
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : 'Failed to list Google Drive spreadsheets.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Build diff for Edit Model tab and request explicit user confirmation
  const handlePrepareModelUpdate = () => {
    if (!selectedRowNumber) return;
    setWriteError(null);
    setWriteSuccess(null);

    const changes: PendingWriteConfirmation['changes'] = [];
    const updates: CellUpdateSpec[] = [];

    for (const field of modelFields) {
      const beforeVal = originalFormatted[field.colIndex] ?? '';
      const afterVal = editValues[field.colIndex] ?? '';
      const rawFormula = rawFormulas[field.colIndex] ?? '';
      const isFormula = rawFormula.startsWith('=');
      const isUnlocked = Boolean(unlockedFormulaCols[field.colIndex]);

      if (isFormula && !isUnlocked) {
        continue;
      }

      if (afterVal !== beforeVal) {
        const colLetter = columnIndexToA1(field.colIndex);
        const cellRef = `${quoteSheetTitle(sheetTitle)}!${colLetter}${selectedRowNumber}`;
        changes.push({
          cellRef: `${colLetter}${selectedRowNumber}`,
          label: lang === 'de' ? field.labelDe : field.labelEn,
          before: beforeVal || '(empty)',
          after: afterVal || '(empty)',
          hadFormula: isFormula,
        });
        updates.push({
          range: cellRef,
          value: afterVal,
        });
      }
    }

    if (updates.length === 0) {
      setWriteError(
        lang === 'de'
          ? 'Keine Änderungen zum Schreiben erkannt.'
          : 'No modified cells detected to write.'
      );
      return;
    }

    const modelName = editValues[18] || editValues[1] || `Row ${selectedRowNumber}`;
    setPendingConfirmation({
      kind: 'update_cells',
      title:
        lang === 'de'
          ? `${updates.length} Zelle(n) für "${modelName}" in Google Sheets aktualisieren?`
          : `Update ${updates.length} cell(s) for "${modelName}" in Google Sheets?`,
      description:
        lang === 'de'
          ? `Dadurch werden die unten aufgeführten Zellen direkt in Ihrem Google Sheet überschrieben.`
          : `This will directly update the cells listed below in your Google Sheet.`,
      sheetTitle,
      spreadsheetTitle,
      changes,
      updates,
    });
  };

  // Build diff for Add New Model tab and request explicit user confirmation
  const handlePrepareInsertRow = () => {
    setWriteError(null);
    setWriteSuccess(null);

    const modelNameS = (newRowFields[18] || '').trim();
    const modelNameB = (newRowFields[1] || modelNameS).trim();
    if (!modelNameS) {
      setWriteError(
        lang === 'de'
          ? 'Bitte mindestens den kanonischen Modellnamen (Spalte S) eingeben.'
          : 'Please enter at least the canonical model name (Col S).'
      );
      return;
    }

    const insertAtRow =
      insertPosition === 'top_history' ? historyStartRow : Math.max(historyStartRow, sourcesNotesRow);

    const rowWidth = Math.max(27, columnLayout.colModelCreator + 1);
    const rowValues: (string | number)[] = Array(rowWidth).fill('');
    for (const field of modelFields) {
      const val = (newRowFields[field.colIndex] || '').trim();
      if (field.colIndex === 1 && !val) {
        rowValues[1] = modelNameB;
      } else {
        rowValues[field.colIndex] = val;
      }
    }
    rowValues[18] = modelNameS;

    const changes: PendingWriteConfirmation['changes'] = [];
    for (const field of modelFields) {
      const val = String(rowValues[field.colIndex] || '').trim();
      if (val) {
        const colLetter = columnIndexToA1(field.colIndex);
        changes.push({
          cellRef: `${colLetter}${insertAtRow}`,
          label: lang === 'de' ? field.labelDe : field.labelEn,
          before: '(new row)',
          after: val,
        });
      }
    }

    setPendingConfirmation({
      kind: 'insert_row',
      title:
        lang === 'de'
          ? `Neue Modellzeile "${modelNameS}" bei Zeile ${insertAtRow} einfügen?`
          : `Insert new model row "${modelNameS}" at Row ${insertAtRow}?`,
      description:
        lang === 'de'
          ? `Fügt 1 neue Zeile in den History-Bereich der Tabelle ein und trägt die unten stehenden Werte ein.`
          : `Inserts 1 new row into the History table and writes the values listed below.`,
      sheetTitle,
      spreadsheetTitle,
      changes,
      insertRowData: {
        insertAtRow,
        values: rowValues,
      },
    });
  };

  // Build diff for inserting/populating US pricing Column U next to DE pricing Column T
  const handlePrepareUsPricingColumnWrite = () => {
    setWriteError(null);
    setWriteSuccess(null);

    const rows = loadedData.rawRows || [];
    if (rows.length < 3) {
      setWriteError(
        lang === 'de'
          ? 'Tabellendaten nicht geladen. Bitte zuerst über Google Sheets API aktualisieren.'
          : 'Sheet rows are not loaded yet. Please reload from Google Sheets first.'
      );
      return;
    }

    const targetColIndex = columnLayout.colUsPrice !== null ? columnLayout.colUsPrice : 20; // Col U (0-indexed 20)
    const targetColLetter = columnIndexToA1(targetColIndex);
    const needsInsertColumn = !columnLayout.hasUsPriceCol;

    const updates: CellUpdateSpec[] = [];
    const changes: PendingWriteConfirmation['changes'] = [];

    const existingRow1 = (rows[0]?.[targetColIndex] || '').trim();
    const existingRow2 = (rows[1]?.[targetColIndex] || '').trim();

    if (needsInsertColumn || existingRow1 !== US_PRICE_HEADER_ROW1) {
      updates.push({
        range: `${quoteSheetTitle(sheetTitle)}!${targetColLetter}1`,
        value: US_PRICE_HEADER_ROW1,
      });
      changes.push({
        cellRef: `${targetColLetter}1`,
        label: lang === 'de' ? 'Spaltenkopf Zeile 1 (US-Preise)' : 'Column Header Row 1 (US Prices)',
        before: needsInsertColumn ? '(shifted right → new Col U)' : existingRow1 || '(empty)',
        after: US_PRICE_HEADER_ROW1,
      });
    }

    if (needsInsertColumn || existingRow2 !== US_PRICE_HEADER_ROW2) {
      updates.push({
        range: `${quoteSheetTitle(sheetTitle)}!${targetColLetter}2`,
        value: US_PRICE_HEADER_ROW2,
      });
      changes.push({
        cellRef: `${targetColLetter}2`,
        label: lang === 'de' ? 'Spaltenkopf Zeile 2 (Intervall)' : 'Column Header Row 2 (Billing cycle)',
        before: needsInsertColumn ? '(new Col U)' : existingRow2 || '(empty)',
        after: US_PRICE_HEADER_ROW2,
      });
    }

    // Never write into Rows 3-32 (Top 30 VSTACK spill formula) or Rows 33-35 (notes & History header).
    // Strictly scan History rows starting at 1-based Row 36+ (0-based index >= 35).
    const startHistoryIdx = Math.max(35, historyStartRow - 1);
    const stopRowIndex = sourcesNotesRow > startHistoryIdx ? sourcesNotesRow - 1 : rows.length;
    for (let r = startHistoryIdx; r < Math.min(rows.length, stopRowIndex); r++) {
      const row = rows[r];
      if (!row) continue;
      const rawB = (row[1] || '').trim();
      const rawC = (row[2] || '').trim();
      const colS = (row[18] || '').trim();

      if (
        rawB.includes('Sources & Notes') ||
        rawC.includes('Sources & Notes') ||
        rawC === 'min' ||
        rawB === 'min'
      ) {
        break;
      }
      if (!colS && !rawB) continue;

      const matchedUsPrice = lookupResearchedUsPrice(colS, rawB);
      if (!matchedUsPrice) continue;

      const currentCellVal = needsInsertColumn ? '' : (row[targetColIndex] || '').trim();
      if (currentCellVal !== matchedUsPrice) {
        const rowNum = r + 1;
        updates.push({
          range: `${quoteSheetTitle(sheetTitle)}!${targetColLetter}${rowNum}`,
          value: matchedUsPrice,
        });
        changes.push({
          cellRef: `${targetColLetter}${rowNum}`,
          label: `${colS || rawB}`,
          before: currentCellVal || '(empty)',
          after: matchedUsPrice,
        });
      }
    }

    if (updates.length === 0) {
      setWriteSuccess(
        lang === 'de'
          ? `US-Preisspalte (${targetColLetter}) ist bereits vollständig aktuell.`
          : `US pricing column (${targetColLetter}) is already up to date.`
      );
      return;
    }

    if (needsInsertColumn) {
      setPendingConfirmation({
        kind: 'insert_column_and_cells',
        title:
          lang === 'de'
            ? `Neue Spalte ${targetColLetter} (US-Preise) einfügen & ${updates.length} Zellen schreiben?`
            : `Insert new Column ${targetColLetter} (US Prices) & write ${updates.length} cells?`,
        description:
          lang === 'de'
            ? `Fügt Spalte ${targetColLetter} rechts neben Spalte T ein (Zeilen 3–32 mit Top-30 VSTACK-Formel bleiben komplett unberührt) und schreibt die US-Preise nur in die History-Zeilen (ab Zeile ${startHistoryIdx + 1}).`
            : `Inserts Column ${targetColLetter} next to Column T (leaving Rows 3–32 Top-30 VSTACK formula untouched) and writes US prices only into History rows (Row ${startHistoryIdx + 1}+).`,
        sheetTitle,
        spreadsheetTitle,
        changes,
        insertColumnData: {
          insertColIndex: targetColIndex,
          updates,
        },
      });
    } else {
      setPendingConfirmation({
        kind: 'update_cells',
        title:
          lang === 'de'
            ? `${updates.length} US-Preiszelle(n) in History (Spalte ${targetColLetter}, ab Zeile ${startHistoryIdx + 1}) schreiben?`
            : `Update ${updates.length} US pricing cell(s) in History (Col ${targetColLetter}, Row ${startHistoryIdx + 1}+)?`,
        description:
          lang === 'de'
            ? `Schreibt recherchierte US-Monatspreise ausschließlich in den History-Bereich ab Zeile ${startHistoryIdx + 1} (Zeilen 3–32 mit VSTACK-Formel bleiben komplett unberührt).`
            : `Writes researched US monthly pricing strictly into History rows (Row ${startHistoryIdx + 1}+), keeping Rows 3–32 Top-30 VSTACK formula completely untouched.`,
        sheetTitle,
        spreadsheetTitle,
        changes,
        updates,
      });
    }
  };

  // Build diff for Notes & Header tab
  const handlePrepareNotesUpdate = () => {
    setWriteError(null);
    setWriteSuccess(null);

    const targets: Array<{ colIdx: number; rowNum: number; label: string; before: string; after: string }> = [
      { colIdx: 0, rowNum: 1, label: 'Title (A1)', before: notesOrig.a1, after: notesForm.a1 },
      { colIdx: 2, rowNum: 1, label: 'Subtitle (C1)', before: notesOrig.c1, after: notesForm.c1 },
      { colIdx: 2, rowNum: targetNotesRow, label: `How To Read (C${targetNotesRow})`, before: notesOrig.cNotes, after: notesForm.cNotes },
      { colIdx: 14, rowNum: targetNotesRow, label: `What Bots Can/Can't Do (O${targetNotesRow})`, before: notesOrig.oNotes, after: notesForm.oNotes },
    ];

    const changes: PendingWriteConfirmation['changes'] = [];
    const updates: CellUpdateSpec[] = [];

    for (const t of targets) {
      if (t.after !== t.before) {
        const colLetter = columnIndexToA1(t.colIdx);
        changes.push({
          cellRef: `${colLetter}${t.rowNum}`,
          label: t.label,
          before: t.before.length > 140 ? t.before.slice(0, 140) + '…' : t.before || '(empty)',
          after: t.after.length > 140 ? t.after.slice(0, 140) + '…' : t.after || '(empty)',
        });
        updates.push({
          range: `${quoteSheetTitle(sheetTitle)}!${colLetter}${t.rowNum}`,
          value: t.after,
        });
      }
    }

    if (updates.length === 0) {
      setWriteError(lang === 'de' ? 'Keine Änderungen an Kopfzeile oder Notizen.' : 'No changes in header or notes.');
      return;
    }

    setPendingConfirmation({
      kind: 'update_cells',
      title:
        lang === 'de'
          ? `${updates.length} Kopf-/Notizzelle(n) im Google Sheet überschreiben?`
          : `Update ${updates.length} header/notes cell(s) in Google Sheets?`,
      description:
        lang === 'de'
          ? 'Diese Änderung aktualisiert den Titel oder die Erklärtexte direkt im Google Sheet.'
          : 'This will overwrite the title, subtitle, or notes text directly inside your Google Sheet.',
      sheetTitle,
      spreadsheetTitle,
      changes,
      updates,
    });
  };

  // Execute confirmed write call
  const handleConfirmWrite = async () => {
    if (!pendingConfirmation || !accessToken) return;
    setIsWriting(true);
    setWriteError(null);
    setWriteSuccess(null);

    try {
      if (pendingConfirmation.kind === 'update_cells' && pendingConfirmation.updates) {
        const res = await batchUpdateSheetCells(activeSpreadsheetId, pendingConfirmation.updates, accessToken);
        setWriteSuccess(
          lang === 'de'
            ? `${res.totalUpdatedCells} Zelle(n) erfolgreich in Google Sheets gespeichert. Daten werden aktualisiert…`
            : `Successfully updated ${res.totalUpdatedCells} cell(s) in Google Sheets. Refreshing charts…`
        );
      } else if (pendingConfirmation.kind === 'insert_column_and_cells' && pendingConfirmation.insertColumnData) {
        if (typeof loadedData.activeSheetId !== 'number') {
          throw new Error('Active Sheet ID is missing; please refresh from Google Sheets first.');
        }
        const res = await insertColumnAndWriteCells(
          activeSpreadsheetId,
          loadedData.activeSheetId,
          pendingConfirmation.insertColumnData.insertColIndex,
          pendingConfirmation.insertColumnData.updates,
          accessToken
        );
        const colLetter = columnIndexToA1(pendingConfirmation.insertColumnData.insertColIndex);
        setWriteSuccess(
          lang === 'de'
            ? `Spalte ${colLetter} (US-Preise) eingefügt und ${res.totalUpdatedCells} Zelle(n) geschrieben. Daten werden neu geladen…`
            : `Inserted Column ${colLetter} (US Prices) and wrote ${res.totalUpdatedCells} cell(s). Reloading charts…`
        );
      } else if (pendingConfirmation.kind === 'insert_row' && pendingConfirmation.insertRowData) {
        if (typeof loadedData.activeSheetId !== 'number') {
          throw new Error('Active Sheet ID is missing; please refresh from Google Sheets first.');
        }
        await insertModelRowInSheet(
          activeSpreadsheetId,
          loadedData.activeSheetId,
          sheetTitle,
          pendingConfirmation.insertRowData.insertAtRow,
          pendingConfirmation.insertRowData.values,
          accessToken
        );
        setWriteSuccess(
          lang === 'de'
            ? `Neue Modellzeile bei Zeile ${pendingConfirmation.insertRowData.insertAtRow} eingefügt. Daten werden aktualisiert…`
            : `Inserted new model row at Row ${pendingConfirmation.insertRowData.insertAtRow}. Refreshing charts…`
        );
      }

      setPendingConfirmation(null);
      await onRefreshFromSheets(activeSpreadsheetId);
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : 'Write to Google Sheets failed.');
      setPendingConfirmation(null);
    } finally {
      setIsWriting(false);
    }
  };

  const renderFieldGroup = (group: EditableFieldConfig['group'], titleEn: string, titleDe: string) => {
    const fields = modelFields.filter((f) => f.group === group);
    return (
      <div className="space-y-2.5">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1">
          {lang === 'de' ? titleDe : titleEn}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {fields.map((field) => {
            const rawFormula = rawFormulas[field.colIndex] ?? '';
            const isFormula = rawFormula.startsWith('=');
            const isUnlocked = Boolean(unlockedFormulaCols[field.colIndex]);
            const colLetter = columnIndexToA1(field.colIndex);
            const currentVal = editValues[field.colIndex] ?? '';
            const origVal = originalFormatted[field.colIndex] ?? '';
            const isDirty = currentVal !== origVal;

            return (
              <div
                key={field.key}
                className={`p-2 rounded-lg border transition-colors ${
                  isDirty
                    ? 'border-blue-400 dark:border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {lang === 'de' ? field.labelDe : field.labelEn}
                  </label>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {colLetter}{selectedRowNumber}
                  </span>
                </div>

                {isFormula && (
                  <div className="flex items-center justify-between gap-1 mb-1 px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[10px] font-mono">
                    <span className="truncate" title={rawFormula}>
                      {rawFormula}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setUnlockedFormulaCols((prev) => ({
                          ...prev,
                          [field.colIndex]: !prev[field.colIndex],
                        }))
                      }
                      className="inline-flex items-center gap-0.5 underline shrink-0 cursor-pointer"
                      title={
                        isUnlocked
                          ? 'Lock formula protection'
                          : 'Formula protected — click to allow overwriting formula'
                      }
                    >
                      {isUnlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                      <span>{isUnlocked ? 'Unlocked' : 'Formula'}</span>
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  value={currentVal}
                  disabled={isFormula && !isUnlocked}
                  placeholder={field.placeholder || ''}
                  onChange={(e) =>
                    setEditValues((prev) => ({
                      ...prev,
                      [field.colIndex]: e.target.value,
                    }))
                  }
                  className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 disabled:opacity-55 disabled:cursor-not-allowed font-mono"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-5">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {lang === 'de' ? 'Google Sheets Live-Verbindung & Editor' : 'Google Sheets Direct Sync & Editor'}
              </h2>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                {isSheetsConnected
                  ? `${spreadsheetTitle} · Tab: ${sheetTitle}`
                  : lang === 'de'
                  ? 'Nicht über Google Sheets API angemeldet'
                  : 'Not connected via Google Sheets API'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSheetsConnected && (
              <>
                <button
                  type="button"
                  onClick={handleLoadDriveSpreadsheets}
                  disabled={isLoadingDrive}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title={lang === 'de' ? 'Andere Tabelle aus Google Drive wählen' : 'Browse spreadsheets in Google Drive'}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline">{lang === 'de' ? 'Drive-Tabellen' : 'Drive Sheets'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRefreshFromSheets(activeSpreadsheetId)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">{lang === 'de' ? 'Neu laden' : 'Reload'}</span>
                </button>
              </>
            )}
            <a
              href={`https://docs.google.com/spreadsheets/d/${activeSpreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span>{lang === 'de' ? 'Öffnen' : 'Open'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
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

        {/* Optional Drive Spreadsheet Switcher Drawer */}
        {showDrivePicker && isSheetsConnected && (
          <div className="px-4 sm:px-6 py-3 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                {lang === 'de' ? 'Google Spreadsheets in Ihrem Drive:' : 'Google Spreadsheets in your Drive:'}
              </span>
              <div className="flex items-center gap-2">
                {activeSpreadsheetId !== DEFAULT_SPREADSHEET_ID && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeSpreadsheetId(DEFAULT_SPREADSHEET_ID);
                      setShowDrivePicker(false);
                    }}
                    className="text-xs font-mono text-blue-600 dark:text-blue-400 underline cursor-pointer"
                  >
                    {lang === 'de' ? 'Zurück zur Standard-Tabelle' : 'Reset to Science-IQ Sheet'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDrivePicker(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  {lang === 'de' ? 'Schließen' : 'Hide'}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {driveFiles.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    onChangeSpreadsheetId(f.id);
                    setShowDrivePicker(false);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-colors cursor-pointer ${
                    f.id === activeSpreadsheetId
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!accessToken ? (
            <div className="py-10 px-4 max-w-lg mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'de'
                  ? 'Mit Google anmelden für direkten Sheet-Zugriff'
                  : 'Sign in with Google for Direct Sheet Access'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {authUser
                  ? lang === 'de'
                    ? `Angemeldet als ${authUser.email || authUser.displayName}. Für direkte Lese- und Schreibvorgänge über die Google Sheets API wird nach dem Neuladen ein aktueller Sitzungs-Token benötigt.`
                    : `Signed in as ${authUser.email || authUser.displayName}. Please reconnect to grant a fresh in-memory session token for direct Google Sheets API reads and writes.`
                  : lang === 'de'
                  ? 'Melden Sie sich mit Ihrem Google-Konto an, um Daten direkt über die Google Sheets API (statt CSV) zu laden und Änderungen zurück in die Tabelle zu schreiben.'
                  : 'Sign in with your Google account to read data directly from the Google Sheets API (instead of CSV) and write updates directly back to your spreadsheet.'}
              </p>
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={isSigningIn}
                  className="gsi-material-button"
                  style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isSigningIn ? 'Connecting…' : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Feedback Banners */}
              {writeError && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{writeError}</span>
                </div>
              )}
              {writeSuccess && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{writeSuccess}</span>
                </div>
              )}

              {/* US Pricing Column U Setup / Sync Banner */}
              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/80 bg-blue-50/70 dark:bg-blue-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {lang === 'de'
                        ? 'US-Preise in neuer Spalte U (neben DE-Spalte T)'
                        : 'US Pricing Column U (next to DE Column T)'}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                        columnLayout.hasUsPriceCol
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {columnLayout.hasUsPriceCol
                        ? `Col ${columnIndexToA1(columnLayout.colUsPrice!)} detected`
                        : 'Pending Col U'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {columnLayout.hasUsPriceCol
                      ? lang === 'de'
                        ? 'Schreibt recherchierte US-Monatspreise ausschließlich in History-Zeilen ab Zeile 36 (Top-30 VSTACK in Zeilen 3–32 bleibt unberührt).'
                        : 'Writes researched US monthly prices strictly into History rows (Row 36+); Rows 3–32 Top-30 VSTACK formula stays untouched.'
                      : lang === 'de'
                      ? 'Fügt Spalte U neben Spalte T ein (verschiebt IQ_old ff. nach rechts) und schreibt US-Preise nur in History-Zeilen ab Zeile 36.'
                      : 'Inserts Column U next to Column T (shifting columns right) and writes US prices only into History rows (Row 36+).'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrepareUsPricingColumnWrite}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 self-start sm:self-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {columnLayout.hasUsPriceCol
                      ? lang === 'de'
                        ? 'US-Preise abgleichen (Spalte U)'
                        : 'Review & Sync US Prices (Col U)'
                      : lang === 'de'
                      ? 'Spalte U einfügen & US-Preise schreiben'
                      : 'Review & Write Col U US Prices'}
                  </span>
                </button>
              </div>

              {/* Editor Sub-Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('edit_model');
                    setWriteError(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'edit_model'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{lang === 'de' ? 'Modellzeile bearbeiten' : 'Edit Model Row'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('add_model');
                    setWriteError(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'add_model'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'de' ? 'Neues Modell hinzufügen' : 'Add Model Row'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('edit_notes');
                    setWriteError(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'edit_notes'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{lang === 'de' ? 'Titel & Notizen' : 'Header & Notes'}</span>
                </button>
              </div>

              {/* TAB 1: EDIT EXISTING MODEL ROW */}
              {activeTab === 'edit_model' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder={lang === 'de' ? 'Modell oder Zeilen-Nr. filtern…' : 'Filter model or row #…'}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>

                    <select
                      value={selectedRowNumber ?? ''}
                      onChange={(e) => setSelectedRowNumber(Number(e.target.value))}
                      className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
                    >
                      {editableModels.map((m) => (
                        <option key={m.id} value={m.sheetRowNumber}>
                          Row {m.sheetRowNumber} — {m.displayName} ({m.companyName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {isLoadingRow ? (
                    <div className="py-8 text-center text-xs font-mono text-slate-500">
                      {lang === 'de' ? 'Lade Zellwerte & Formeln aus Google Sheets…' : 'Loading row values & formulas from Google Sheets…'}
                    </div>
                  ) : selectedRowNumber ? (
                    <div className="space-y-4">
                      {renderFieldGroup('identity', 'Model Identity & Release', 'Modell-Identität & Release')}
                      {renderFieldGroup('benchmarks', '8 Benchmark Scores (Cols D–K)', '8 Benchmark-Scores (Spalten D–K)')}
                      {renderFieldGroup('scores', 'Composite Final Scores (Cols L–N)', 'Gesamt-Scores (Spalten L–N)')}
                      {renderFieldGroup('meta', 'Pricing, Storyline & Links', 'Preise, Storyline & Links')}

                      <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={handlePrepareModelUpdate}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>
                            {lang === 'de'
                              ? `Änderungen prüfen & in Zeile ${selectedRowNumber} schreiben`
                              : `Review & Write Changes to Row ${selectedRowNumber}`}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 2: ADD NEW MODEL ROW */}
              {activeTab === 'add_model' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-emerald-900 dark:text-emerald-200">
                      <span className="font-bold">
                        {lang === 'de' ? 'Einfügeposition in History-Tabelle:' : 'Insert Position in History Table:'}
                      </span>{' '}
                      <span className="font-mono">
                        {insertPosition === 'top_history'
                          ? `Row ${historyStartRow} (Top of History)`
                          : `Row ${sourcesNotesRow} (End of History, before Sources & Notes)`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInsertPosition('top_history')}
                        className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer border ${
                          insertPosition === 'top_history'
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Top of History (Row {historyStartRow})
                      </button>
                      <button
                        type="button"
                        onClick={() => setInsertPosition('end_history')}
                        className={`px-2.5 py-1 text-xs rounded-md font-mono cursor-pointer border ${
                          insertPosition === 'end_history'
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Bottom of History (Row {sourcesNotesRow})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {modelFields.map((field) => (
                      <div
                        key={`new-${field.key}`}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50"
                      >
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 truncate">
                          {lang === 'de' ? field.labelDe : field.labelEn}
                        </label>
                        <input
                          type="text"
                          value={newRowFields[field.colIndex] ?? ''}
                          placeholder={field.placeholder || ''}
                          onChange={(e) =>
                            setNewRowFields((prev) => ({
                              ...prev,
                              [field.colIndex]: e.target.value,
                            }))
                          }
                          className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 font-mono"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handlePrepareInsertRow}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'de' ? 'Neue Modellzeile prüfen & einfügen' : 'Review & Insert New Model Row'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: HEADER & NOTES */}
              {activeTab === 'edit_notes' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Title (Cell A1)
                      </label>
                      <input
                        type="text"
                        value={notesForm.a1}
                        onChange={(e) => setNotesForm((prev) => ({ ...prev, a1: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Subtitle (Cell C1)
                      </label>
                      <input
                        type="text"
                        value={notesForm.c1}
                        onChange={(e) => setNotesForm((prev) => ({ ...prev, c1: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      How To Read (Cell C{targetNotesRow})
                    </label>
                    <textarea
                      rows={5}
                      value={notesForm.cNotes}
                      onChange={(e) => setNotesForm((prev) => ({ ...prev, cNotes: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      What Bots can & can&apos;t do (Cell O{targetNotesRow})
                    </label>
                    <textarea
                      rows={5}
                      value={notesForm.oNotes}
                      onChange={(e) => setNotesForm((prev) => ({ ...prev, oNotes: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handlePrepareNotesUpdate}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'de' ? 'Kopfzeile & Notizen prüfen & schreiben' : 'Review & Write Header/Notes'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MANDATORY EXPLICIT WRITE CONFIRMATION DIALOG OVERLAY */}
        {pendingConfirmation && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {pendingConfirmation.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {pendingConfirmation.description}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                    {pendingConfirmation.spreadsheetTitle} → {pendingConfirmation.sheetTitle}
                  </p>
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-2">
                {pendingConfirmation.changes.map((c, idx) => (
                  <div
                    key={`${c.cellRef}-${idx}`}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.label}</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {c.cellRef}
                      </span>
                    </div>
                    {c.hadFormula && (
                      <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                        {lang === 'de'
                          ? 'Achtung: Überschreibt eine bestehende Formel in dieser Zelle!'
                          : 'Warning: This will overwrite an existing spreadsheet formula!'}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                      <div className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 break-words">
                        − {c.before}
                      </div>
                      <div className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 break-words">
                        + {c.after}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isWriting}
                  onClick={() => setPendingConfirmation(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {lang === 'de' ? 'Abbrechen' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isWriting}
                  onClick={handleConfirmWrite}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {isWriting
                      ? lang === 'de'
                        ? 'Schreibe…'
                        : 'Writing…'
                      : lang === 'de'
                      ? 'Bestätigen & in Google Sheet schreiben'
                      : 'Confirm & Write to Google Sheet'}
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
