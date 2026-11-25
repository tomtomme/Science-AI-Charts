import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { ModelRecord, ScoreMode } from '../../types';
import { Language } from '../../utils/i18n';
import { matchesSearchQuery } from '../../utils/searchUtils';
import {
  CompareSlot,
  SlotTheme,
  SLOT_THEME,
  getScoreForMode,
  formatNumber,
  isZoomedCompany,
} from '../../utils/compareHelpers';

export interface CompareModelSelectorProps {
  slot: CompareSlot;
  selectedModel: ModelRecord | null;
  otherSlotsByModelId: Map<string, CompareSlot>;
  models: ModelRecord[];
  rankMap: Map<string, number>;
  scoreMode: ScoreMode;
  lang: Language;
  alignRight?: boolean;
  compact?: boolean;
  theme?: SlotTheme;
  onSelect: (modelId: string) => void;
}

export const CompareModelSelector: React.FC<CompareModelSelectorProps> = ({
  slot,
  selectedModel,
  otherSlotsByModelId,
  models,
  rankMap,
  scoreMode,
  lang,
  alignRight = false,
  compact = false,
  theme: propTheme,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'paid'>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 20);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      if (tierFilter === 'free' && m.isPaid && !m.isFreeApi) return false;
      if (tierFilter === 'paid' && !m.isPaid) return false;
      if (!query.trim()) return true;
      const target = `${m.displayName} ${m.name} ${m.companyName} ${m.creatorClean} ${m.creator || ''}`;
      return matchesSearchQuery(query, target);
    });
  }, [models, query, tierFilter]);

  const theme = propTheme ?? SLOT_THEME[slot];

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between gap-1.5 ${
          compact ? 'px-1.5 py-1' : 'px-2 py-1.5'
        } rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 transition-colors cursor-pointer text-left focus:outline-hidden focus-visible:ring-2 ${theme.ring}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className={`w-5 h-5 rounded text-xs font-mono font-bold flex items-center justify-center shrink-0 ${theme.badgeBg}`}
          >
            {slot}
          </span>
          {selectedModel ? (
            <>
              <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shrink-0">
                <img
                  src={selectedModel.faviconUrl}
                  alt=""
                  className={`w-full h-full object-contain ${
                    isZoomedCompany(selectedModel) ? 'scale-135' : 'scale-105'
                  }`}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </span>
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {selectedModel.flag && (
                  <span className="text-xs shrink-0 leading-none">{selectedModel.flag}</span>
                )}
                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {selectedModel.displayName}
                </span>
                {selectedModel.isNew && (
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 shrink-0">
                    NEW
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {lang === 'de' ? 'Chatbot auswählen…' : 'Select chatbot…'}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${alignRight ? 'right-0' : 'left-0'} w-full min-w-[min(320px,88vw)] top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden`}
        >
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/70 dark:bg-slate-950/60">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  lang === 'de'
                    ? 'Modell oder Hersteller suchen…'
                    : 'Search model or company…'
                }
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                  aria-label={lang === 'de' ? 'Suche leeren' : 'Clear search'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-md p-0.5 text-xs font-mono font-semibold">
                {(['all', 'free', 'paid'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTierFilter(tier)}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      tierFilter === tier
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    {tier === 'all'
                      ? lang === 'de'
                        ? 'Alle'
                        : 'All'
                      : tier === 'free'
                      ? lang === 'de'
                        ? 'Gratis / API'
                        : 'Free / API'
                      : lang === 'de'
                      ? 'Bezahlt'
                      : 'Paid'}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                {filteredModels.length} {lang === 'de' ? 'Treffer' : 'models'}
              </span>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
            {filteredModels.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-600 dark:text-slate-400">
                {lang === 'de'
                  ? 'Kein passender Chatbot gefunden.'
                  : 'No matching chatbot found.'}
              </div>
            ) : (
              filteredModels.map((m) => {
                const isSelected = selectedModel?.id === m.id;
                const otherSlot = !isSelected ? otherSlotsByModelId.get(m.id) : undefined;
                const rank = rankMap.get(m.id);
                const activeScore = getScoreForMode(m, scoreMode);
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelect(m.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                      isSelected ? theme.rowSelected : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-8 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 shrink-0 text-right">
                        {rank ? `#${rank}` : '—'}
                      </span>
                      <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shrink-0">
                        <img
                          src={m.faviconUrl}
                          alt=""
                          className={`w-full h-full object-contain ${
                            isZoomedCompany(m) ? 'scale-135' : 'scale-105'
                          }`}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {m.flag && (
                            <span className="text-xs shrink-0 leading-none">{m.flag}</span>
                          )}
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {m.displayName}
                          </span>
                          {m.isNew && (
                            <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0">
                              NEW
                            </span>
                          )}
                          {!m.isAvailable && (
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 shrink-0">
                              (Hist.)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {m.companyName}
                          {m.releaseDate ? ` · ${m.releaseDate}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {otherSlot && (
                        <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                          ↔ {otherSlot}
                        </span>
                      )}
                      {isSelected && <Check className={`w-3.5 h-3.5 ${theme.text}`} />}
                      <span className="w-12 text-right font-mono tabular-nums text-xs font-bold text-slate-800 dark:text-slate-200">
                        {activeScore !== null ? formatNumber(activeScore, 1) : '—'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
