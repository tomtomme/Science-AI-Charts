import React from 'react';
import { BookOpen, MapPin, Moon, Sliders, Sun } from 'lucide-react';
import { CsvHeaderMetadata } from '../utils/csvParser';
import { AutoThemeResult, GeoCoords, ThemePreference } from '../hooks/useAutoTheme';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { Tooltip } from './Tooltip';

interface AppHeaderProps {
  lang: Language;
  headerMeta?: CsvHeaderMetadata;
  onResetToDefaults: (e?: React.MouseEvent) => void;
  showWeighting: boolean;
  onToggleWeighting: () => void;
  isCustomWeighted: boolean;
  onOpenGlossary: () => void;
  onSelectLanguage: (lang: Language) => void;
  themePref: ThemePreference;
  effectiveTheme: 'light' | 'dark';
  autoThemeInfo: AutoThemeResult;
  geoCoords: GeoCoords | null;
  isLocating: boolean;
  locationStatus: string | null;
  onSelectTheme: (mode: ThemePreference) => void;
  onRequestGeoLocation: (e?: React.MouseEvent) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  lang,
  headerMeta,
  onResetToDefaults,
  showWeighting,
  onToggleWeighting,
  isCustomWeighted,
  onOpenGlossary,
  onSelectLanguage,
  themePref,
  effectiveTheme,
  autoThemeInfo,
  geoCoords,
  isLocating,
  locationStatus,
  onSelectTheme,
  onRequestGeoLocation,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <header className="relative z-40 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-2.5">
      <div className="w-full max-w-[1720px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Title directly from CSV: links to site & resets on click; subtitle popup on hover */}
        <div className="min-w-0 flex-1">
          <Tooltip
            content={
              <div className="space-y-2 text-xs sm:text-sm text-slate-100 font-normal leading-relaxed">
                <p className="leading-relaxed text-slate-200">
                  {lang === 'de'
                    ? headerMeta?.subtitleDe || t.subtitle
                    : headerMeta?.subtitle || t.subtitle}
                </p>
                <div className="pt-1.5 border-t border-slate-700/60 flex items-center text-xs font-mono">
                  <button
                    type="button"
                    onClick={onResetToDefaults}
                    className="text-left text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer focus:outline-hidden"
                  >
                    {lang === 'de'
                      ? 'Titel klicken: Alle Filter & Ansichten auf Standard zurücksetzen'
                      : 'Click title: Reset all filters & views to defaults'}
                  </button>
                </div>
              </div>
            }
            position="bottom"
            align="left"
            width="w-[90vw] sm:w-[580px] md:w-[720px] lg:w-[840px] xl:w-[920px]"
            popupClassName="p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-2xl rounded-xl bg-slate-900/98 dark:bg-slate-950/98 border border-slate-700/90"
            className="inline-block max-w-full"
          >
            <a
              href="https://tomtomme.github.io/Science-AI-Charts/"
              onClick={onResetToDefaults}
              className="group cursor-pointer inline-block max-w-full text-left focus:outline-hidden"
            >
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {lang === 'de'
                  ? headerMeta?.titleDe || t.title
                  : headerMeta?.combinedTitle || t.title}
              </h1>
            </a>
          </Tooltip>
        </div>

        {/* Weighting, Glossary, Language & Theme Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono shrink-0 self-start xl:self-center">
          {/* Global Personalized Benchmark Weighting Toggle (above all tabs) */}
          <button
            type="button"
            onClick={onToggleWeighting}
            aria-expanded={showWeighting}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
              showWeighting
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs ring-2 ring-emerald-500/20'
                : isCustomWeighted
                ? 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-400 dark:border-emerald-700'
                : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
            }`}
          >
            <Sliders
              className={`w-3.5 h-3.5 ${
                showWeighting
                  ? 'text-white'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            />
            <span>
              {lang === 'de'
                ? isCustomWeighted && !showWeighting
                  ? 'Gewichtung (Aktiv)'
                  : 'Gewichtung'
                : isCustomWeighted && !showWeighting
                ? 'Weights (Active)'
                : 'Weights'}
            </span>
            <span
              className={`text-xs ${
                showWeighting
                  ? 'text-emerald-100'
                  : isCustomWeighted
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {showWeighting ? '▲' : '▼'}
            </span>
          </button>

          {/* Interactive Glossary button */}
          <Tooltip
            title={lang === 'de' ? 'Interaktives Glossar' : 'Interactive Glossary'}
            badge={lang === 'de' ? 'Fachbegriffe' : 'Key Concepts'}
            content={
              lang === 'de'
                ? 'Öffnet das Glossar mit anschaulichen Erklärungen für Einsteiger zu wissenschaftlichen Modellen, Regressionen, Konfidenzbändern und KI-Grundlagen.'
                : 'Opens the interactive glossary with intuitive explanations of scientific models, regressions, confidence ribbons, and AI concepts.'
            }
            align="center"
            width="w-72"
          >
            <button
              type="button"
              onClick={onOpenGlossary}
              className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center"
              aria-label={lang === 'de' ? 'Glossar öffnen' : 'Open glossary'}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </button>
          </Tooltip>

          {/* Language Switcher DE / EN */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
            <Tooltip
              content={lang === 'de' ? 'Auf Deutsch umschalten' : 'Switch to German'}
              align="center"
              width="w-40"
            >
              <button
                type="button"
                onClick={() => onSelectLanguage('de')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                  lang === 'de'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                DE
              </button>
            </Tooltip>
            <Tooltip
              content={lang === 'de' ? 'Auf Englisch umschalten' : 'Switch to English'}
              align="center"
              width="w-40"
            >
              <button
                type="button"
                onClick={() => onSelectLanguage('en')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                EN
              </button>
            </Tooltip>
          </div>

          {/* Theme Mode Switcher (Light / Dark / Auto by timezone/GPS) */}
          <div
            className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5"
            role="group"
            aria-label={
              lang === 'de'
                ? 'Designmodus (Hell, Dunkel oder Automatisch)'
                : 'Theme mode (Light, Dark or Automatic)'
            }
          >
            <Tooltip
              title={lang === 'de' ? 'Hellmodus' : 'Light Mode'}
              content={
                lang === 'de'
                  ? 'Hellmodus erzwingen (Auto-Modus überschreiben).'
                  : 'Force Light Mode (Override Auto mode).'
              }
              align="center"
              width="w-48"
            >
              <button
                type="button"
                onClick={() => onSelectTheme('light')}
                className={`p-1 sm:px-1.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  themePref === 'light'
                    ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-2xs'
                    : themePref === 'auto' && effectiveTheme === 'light'
                    ? 'text-amber-500/80 hover:text-amber-500'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                aria-pressed={themePref === 'light'}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            <Tooltip
              title={lang === 'de' ? 'Dunkelmodus' : 'Dark Mode'}
              content={
                lang === 'de'
                  ? 'Dunkelmodus erzwingen (Auto-Modus überschreiben).'
                  : 'Force Dark Mode (Override Auto mode).'
              }
              align="center"
              width="w-48"
            >
              <button
                type="button"
                onClick={() => onSelectTheme('dark')}
                className={`p-1 sm:px-1.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  themePref === 'dark'
                    ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-2xs'
                    : themePref === 'auto' && effectiveTheme === 'dark'
                    ? 'text-blue-400/80 hover:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                aria-pressed={themePref === 'dark'}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            <Tooltip
              title="Auto Mode"
              badge={themePref === 'auto' ? 'Aktiv' : 'Inaktiv'}
              content={
                themePref === 'auto'
                  ? lang === 'de'
                    ? `Auto-Modus aktiv: ${autoThemeInfo.detail}. Zum Deaktivieren auf Sonne oder Mond klicken.`
                    : `Auto mode active: ${autoThemeInfo.detail}. Click Sun or Moon to deactivate.`
                  : lang === 'de'
                  ? `Manuell überschrieben (${themePref === 'dark' ? 'Dunkel' : 'Hell'}). Klicken, um Auto-Modus (Zeitzonen- & GPS-Steuerung) zu aktivieren.`
                  : `Manually overridden (${themePref === 'dark' ? 'Dark' : 'Light'}). Click to activate Auto mode (timezone & GPS control).`
              }
              align="center"
              width="w-60"
            >
              <button
                type="button"
                onClick={() => onSelectTheme('auto')}
                className={`px-1.5 py-0.5 rounded text-xs font-bold font-mono transition-all cursor-pointer ${
                  themePref === 'auto'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                aria-pressed={themePref === 'auto'}
              >
                Auto
              </button>
            </Tooltip>

            <Tooltip
              title={geoCoords ? 'GPS: Aktiv' : 'GPS: Standort'}
              content={
                geoCoords
                  ? lang === 'de'
                    ? `📍 GPS-Standort aktiv (${geoCoords.lat}° N, ${geoCoords.lng}° O). Sonnenaufgang: ${autoThemeInfo.sunriseStr || '-'}, Sonnenuntergang: ${autoThemeInfo.sunsetStr || '-'}. Klicken zum erneuten Abfragen.`
                    : `📍 GPS location active (${geoCoords.lat}° N, ${geoCoords.lng}° E). Sunrise: ${autoThemeInfo.sunriseStr || '-'}, Sunset: ${autoThemeInfo.sunsetStr || '-'}. Click to re-query.`
                  : lang === 'de'
                  ? '📍 Standort abfragen (GPS): Klicken, damit der Browser um Erlaubnis fragt. Berechnet exakte Sonnenauf- & -untergangszeiten für Ihren Standort.'
                  : '📍 Query location (GPS): Click to trigger browser location permission dialog. Calculates exact sunrise & sunset for your location.'
              }
              align="right"
              width="w-64"
            >
              <button
                type="button"
                onClick={onRequestGeoLocation}
                disabled={isLocating}
                className={`p-1 py-0.5 rounded text-xs transition-all cursor-pointer flex items-center justify-center ${
                  geoCoords
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                } ${isLocating ? 'animate-pulse opacity-75' : ''}`}
                aria-label={lang === 'de' ? 'Standort via GPS abfragen' : 'Query location via GPS'}
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>

          {locationStatus && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-mono whitespace-nowrap">
              {locationStatus}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
