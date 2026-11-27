import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { NewModelRowDraft } from '../../types/aaMonitor';
import { Language } from '../../utils/i18n';
import { formatCreatorColC } from './monitorTypes';

interface NewModelRowDraftDialogProps {
  lang: Language;
  draft: NewModelRowDraft;
  insertRowNumber: number;
  isWriting: boolean;
  onCancel: () => void;
  onConfirmWrite: (editedDraft: NewModelRowDraft) => Promise<void>;
}

const BENCHMARK_FIELDS: Array<{
  key: keyof NewModelRowDraft['benchmarks'];
  colLabel: string;
  labelDe: string;
  labelEn: string;
}> = [
  { key: 'iq', colLabel: 'D', labelDe: 'IQ (AA v5)', labelEn: 'IQ (AA v5)' },
  {
    key: 'nonHallucination',
    colLabel: 'E',
    labelDe: 'Non-Hallu (v1.1)',
    labelEn: 'Non-Hallu (v1.1)',
  },
  { key: 'accuracy', colLabel: 'F', labelDe: 'Accuracy (v1.1)', labelEn: 'Accuracy (v1.1)' },
  { key: 'mmmuPro', colLabel: 'G', labelDe: 'MMMU-Pro', labelEn: 'MMMU-Pro' },
  { key: 'mlcr', colLabel: 'H', labelDe: 'MLCR-AA', labelEn: 'MLCR-AA' },
  { key: 'excelAgent', colLabel: 'I', labelDe: 'ExcelAgent', labelEn: 'ExcelAgent' },
  { key: 'gdpx', colLabel: 'J', labelDe: 'GDPx', labelEn: 'GDPx' },
  { key: 'vals', colLabel: 'K', labelDe: 'Vals Index v2.2', labelEn: 'Vals Index v2.2' },
  { key: 'simpleBench', colLabel: 'Y', labelDe: 'SimpleBench', labelEn: 'SimpleBench' },
  { key: 'integrity', colLabel: 'AN', labelDe: 'Integrity-Bench', labelEn: 'Integrity-Bench' },
];

export const NewModelRowDraftDialog: React.FC<NewModelRowDraftDialogProps> = ({
  lang,
  draft,
  insertRowNumber,
  isWriting,
  onCancel,
  onConfirmWrite,
}) => {
  const [form, setForm] = useState<NewModelRowDraft>(draft);
  const [benchText, setBenchText] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(draft);
    const initialText: Record<string, string> = {};
    for (const f of BENCHMARK_FIELDS) {
      const val = draft.benchmarks[f.key].value;
      initialText[f.key] = val !== null ? String(val) : '';
    }
    setBenchText(initialText);
  }, [draft]);

  const previewColC = formatCreatorColC(form.companyName, form.releaseDate);

  const handleBenchmarkValueChange = (
    key: keyof NewModelRowDraft['benchmarks'],
    rawText: string
  ) => {
    setBenchText((prev) => ({ ...prev, [key]: rawText }));
    const cleaned = rawText.trim().replace(',', '.');
    const parsed = cleaned === '' ? null : Number(cleaned);
    setForm((prev) => ({
      ...prev,
      benchmarks: {
        ...prev.benchmarks,
        [key]: {
          ...prev.benchmarks[key],
          value: parsed !== null && Number.isFinite(parsed) ? parsed : null,
        },
      },
    }));
  };

  const handleToggleOfficial = (key: keyof NewModelRowDraft['benchmarks']) => {
    setForm((prev) => ({
      ...prev,
      benchmarks: {
        ...prev.benchmarks,
        [key]: {
          ...prev.benchmarks[key],
          isOfficial: !prev.benchmarks[key].isOfficial,
        },
      },
    }));
  };

  const populatedBenchCount = BENCHMARK_FIELDS.filter(
    (f) => form.benchmarks[f.key].value !== null
  ).length;

  const tierLabel =
    form.researchTier === 'gemini_grounded'
      ? lang === 'de'
        ? 'Live-Webdaten (OpenRouter/HF) + Gemini'
        : 'Live Web Data (OpenRouter/HF) + Gemini'
      : form.researchTier === 'gemini_free'
      ? lang === 'de'
        ? 'Live-Benchmarks + Gemini (Free-Tier)'
        : 'Live Benchmarks + Gemini (Free-tier)'
      : lang === 'de'
      ? 'Nur Live-Daten (ohne LLM)'
      : 'Live Data only (no LLM)';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-violet-50/80 dark:bg-violet-950/30 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {lang === 'de'
                  ? `Komplette Zeile für „${form.canonicalName}“ anlegen (Zeile ${insertRowNumber})`
                  : `Create complete Sheet row for "${form.canonicalName}" (Row ${insertRowNumber})`}
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                {tierLabel} · {populatedBenchCount}/10 Benchmarks
                {lang === 'de'
                  ? ' · Formeln (A, B, L, M, N) werden automatisch geklont.'
                  : ' · Formulas (A, B, L, M, N) are cloned automatically.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isWriting}
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {form.researchNote && (
            <div className="px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
              {form.researchNote}
            </div>
          )}

          {/* Live Col B (Formula) / Col C preview */}
          <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mr-2">
                Col B:
              </span>
              <span className="text-slate-600 dark:text-slate-300 italic">
                {lang === 'de'
                  ? 'Formel wird aus Vorlage-Zeile kopiert'
                  : 'Formula cloned from template row'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mr-2">
                Col C:
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{previewColC}</span>
            </div>
          </div>

          {/* Identity & Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'de' ? 'Modellname (Spalte S)' : 'Model Name (Col S)'}
              </span>
              <input
                type="text"
                value={form.canonicalName}
                onChange={(e) => setForm((p) => ({ ...p, canonicalName: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'de' ? 'Hersteller (Spalte AA)' : 'Creator (Col AA)'}
              </span>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'de' ? 'Release (Spalte Z)' : 'Release (Col Z)'}
              </span>
              <input
                type="text"
                value={form.releaseDate}
                onChange={(e) => setForm((p) => ({ ...p, releaseDate: e.target.value }))}
                placeholder="YYYY-MM-DD"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </label>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isPaidOnly}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((p) => ({
                    ...p,
                    isPaidOnly: checked,
                    chatLink: checked && !p.chatLink ? 'paid' : p.chatLink,
                  }));
                }}
                className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-slate-800 dark:text-slate-200">
                💲 {lang === 'de' ? 'Paid-Only Chat (setzt Spalte P auf „paid“)' : 'Paid-only chat (sets Col P to "paid")'}
              </span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isOpenWeights}
                onChange={(e) => setForm((p) => ({ ...p, isOpenWeights: e.target.checked }))}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-slate-800 dark:text-slate-200">Open Weights</span>
            </label>
          </div>

          {/* 10 Benchmark Columns */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white">
                {lang === 'de'
                  ? 'Benchmark-Spalten (Fett = Offiziell, Normal = Schätzwert)'
                  : 'Benchmark Columns (Bold = Official, Regular = Estimate)'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {BENCHMARK_FIELDS.map((field) => {
                const cell = form.benchmarks[field.key];
                const hasVal = cell.value !== null;
                return (
                  <div
                    key={field.key}
                    className={`p-2 rounded-xl border ${
                      hasVal && cell.isOfficial
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        <span className="font-mono text-slate-400 mr-1">{field.colLabel}</span>
                        {lang === 'de' ? field.labelDe : field.labelEn}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={benchText[field.key] ?? ''}
                      onChange={(e) => handleBenchmarkValueChange(field.key, e.target.value)}
                      placeholder="—"
                      className={`w-full px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white ${
                        cell.isOfficial ? 'font-bold' : 'font-normal'
                      }`}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <button
                        type="button"
                        disabled={!hasVal}
                        onClick={() => handleToggleOfficial(field.key)}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer disabled:opacity-40 ${
                          cell.isOfficial
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {cell.isOfficial
                          ? lang === 'de'
                            ? 'Fett (Offiziell)'
                            : 'Bold (Official)'
                          : lang === 'de'
                          ? 'Schätzwert'
                          : 'Estimate'}
                      </button>
                      {cell.source && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[75px]">
                          {cell.source}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Storyline, Links & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="sm:col-span-2 space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'de' ? 'Storyline (Spalte O)' : 'Storyline (Col O)'}
              </span>
              <input
                type="text"
                value={form.storyline}
                onChange={(e) => setForm((p) => ({ ...p, storyline: e.target.value }))}
                placeholder={
                  lang === 'de'
                    ? 'Kurze Ein-Satz-Einordnung auf Englisch…'
                    : 'Short 1-sentence highlight…'
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'de'
                  ? 'Link zu Chat/App oder „paid“ (Spalte P)'
                  : 'Chat/App Link or "paid" (Col P)'}
              </span>
              <input
                type="text"
                value={form.chatLink}
                onChange={(e) => setForm((p) => ({ ...p, chatLink: e.target.value }))}
                placeholder="https://... oder paid"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'de' ? 'Link zu API / Playground (Spalte Q)' : 'API / Playground Link (Col Q)'}
              </span>
              <input
                type="text"
                value={form.apiLink}
                onChange={(e) => setForm((p) => ({ ...p, apiLink: e.target.value }))}
                placeholder="https://..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'de' ? 'Abo-Preis DE/Monat (Spalte T)' : 'Monthly Price DE (Col T)'}
              </span>
              <input
                type="text"
                value={form.priceDeMonthly}
                onChange={(e) => setForm((p) => ({ ...p, priceDeMonthly: e.target.value }))}
                placeholder="z.B. 0-8€ oder 23€ (leer = kostenlos/API)"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'de' ? 'Abo-Preis US/Monat (Spalte U)' : 'Monthly Price US (Col U)'}
              </span>
              <input
                type="text"
                value={form.priceUsMonthly}
                onChange={(e) => setForm((p) => ({ ...p, priceUsMonthly: e.target.value }))}
                placeholder="e.g. $0-8 or $20 (empty = free/API)"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
              />
            </label>
          </div>

          {/* Grounding Sources */}
          {form.sources.length > 0 && (
            <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mr-2">
                {lang === 'de' ? 'Recherche-Quellen:' : 'Research Sources:'}
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.sources.map((src, idx) => (
                  <a
                    key={`${src.uri}-${idx}`}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-blue-700 dark:text-blue-400 hover:underline max-w-[240px] truncate"
                  >
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-2.5 shrink-0">
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
            disabled={isWriting || !form.canonicalName.trim()}
            onClick={() => void onConfirmWrite(form)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isWriting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>
              {isWriting
                ? lang === 'de'
                  ? 'Schreibe komplette Zeile…'
                  : 'Writing complete row…'
                : lang === 'de'
                ? 'Komplette Zeile ins Sheet schreiben'
                : 'Write complete row to Sheet'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
