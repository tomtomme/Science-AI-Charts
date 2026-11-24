import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Language } from '../../utils/i18n';
import { roundCurrencyString } from '../../utils/priceFormat';
import { PendingSheetCellChange } from './monitorTypes';

interface SheetWriteConfirmDialogProps {
  lang: Language;
  pendingWrite: PendingSheetCellChange[];
  isWriting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export const SheetWriteConfirmDialog: React.FC<SheetWriteConfirmDialogProps> = ({
  lang,
  pendingWrite,
  isWriting,
  onCancel,
  onConfirm,
}) => (
  <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
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
              ? 'Alle ausgewählten Änderungen werden direkt ins Google Sheet übernommen.'
              : 'All selected updates will be applied directly to Google Sheets.'}
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
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div
                className={`px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 break-words ${
                  c.beforeIsBold ? 'font-bold' : 'font-normal'
                }`}
              >
                − {c.kind === 'price' ? roundCurrencyString(c.before) : c.before}
                {c.beforeIsBold === false && !c.isNewRowInsert
                  ? lang === 'de'
                    ? ' (Schätzwert)'
                    : ' (Estimate)'
                  : ''}
              </div>
              <div
                className={`px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 break-words ${
                  c.afterIsBold ? 'font-bold' : 'font-normal'
                }`}
              >
                + {c.kind === 'price' ? roundCurrencyString(c.after) : c.after}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2.5">
        <button
          type="button"
          disabled={isWriting}
          onClick={onCancel}
          className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          {lang === 'de' ? 'Abbrechen' : 'Cancel'}
        </button>
        <button
          type="button"
          disabled={isWriting}
          onClick={() => void onConfirm()}
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
);
