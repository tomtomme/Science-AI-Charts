import React, { useState, useEffect, useCallback } from 'react';
import { Language } from '../utils/i18n';

export type ThemePreference = 'auto' | 'light' | 'dark';

export interface GeoCoords {
  lat: number;
  lng: number;
  updatedAt: number;
}

export interface AutoThemeResult {
  theme: 'light' | 'dark';
  source: 'gps' | 'system' | 'clock';
  sunriseStr?: string;
  sunsetStr?: string;
  detail: string;
}

/**
 * Calculates exact astronomical sunrise and sunset for a given date, latitude and longitude.
 */
export function getSolarDayNight(date: Date, lat: number, lng: number): {
  sunrise: Date;
  sunset: Date;
  isDay: boolean;
} {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const declination = 23.45 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
  const latRad = (lat * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;

  const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
  const clampedCos = Math.max(-1, Math.min(1, cosHourAngle));
  const hourAngle = (Math.acos(clampedCos) * 180) / Math.PI;

  const b = ((2 * Math.PI) / 365) * (dayOfYear - 81);
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const solarNoonUtc = 12 - lng / 15 - eot / 60;

  const sunriseUtcHours = solarNoonUtc - hourAngle / 15;
  const sunsetUtcHours = solarNoonUtc + hourAngle / 15;

  const sunrise = new Date(date);
  sunrise.setUTCHours(Math.floor(sunriseUtcHours), Math.round((sunriseUtcHours % 1) * 60), 0, 0);

  const sunset = new Date(date);
  sunset.setUTCHours(Math.floor(sunsetUtcHours), Math.round((sunsetUtcHours % 1) * 60), 0, 0);

  const nowTime = date.getTime();
  const isDay = nowTime >= sunrise.getTime() && nowTime < sunset.getTime();

  return { sunrise, sunset, isDay };
}

function getStoredGeoCoords(): GeoCoords | null {
  try {
    const raw = localStorage.getItem('science_iq_user_coords');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
        return parsed;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

function getStoredThemePref(): ThemePreference {
  try {
    const stored = localStorage.getItem('science_iq_theme_preference');
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'auto';
}

/**
 * Computes theme automatically with 3-tier intelligence:
 * 1. Exact GPS solar calculation (if coordinates available)
 * 2. Operating system / browser dark mode schedule (prefers-color-scheme)
 * 3. Seasonal clock threshold (adjusted for winter/summer day lengths)
 */
export function computeAutoTheme(coords: GeoCoords | null, lang: 'de' | 'en' = 'de'): AutoThemeResult {
  const now = new Date();

  // 1. If GPS coordinates are available, compute exact astronomical sunrise/sunset
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    const { sunrise, sunset, isDay } = getSolarDayNight(now, coords.lat, coords.lng);
    const sunriseStr = sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sunsetStr = sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      theme: isDay ? 'light' : 'dark',
      source: 'gps',
      sunriseStr,
      sunsetStr,
      detail:
        lang === 'de'
          ? `GPS: Sonnenaufgang ${sunriseStr}, Sonnenuntergang ${sunsetStr} (${isDay ? 'Tag = Hell' : 'Nacht = Dunkel'})`
          : `GPS: Sunrise ${sunriseStr}, Sunset ${sunsetStr} (${isDay ? 'Day = Light' : 'Night = Dark'})`,
    };
  }

  // 2. Check system / OS theme preference (Android scheduled dark mode / Linux theme)
  if (typeof window !== 'undefined' && window.matchMedia) {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isSystemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    if (isSystemDark || isSystemLight) {
      return {
        theme: isSystemDark ? 'dark' : 'light',
        source: 'system',
        detail:
          lang === 'de'
            ? `System / Browser: Orientiert am Betriebssystem (${isSystemDark ? 'Dunkelmodus' : 'Hellmodus'})`
            : `System / Browser: Matched to OS theme (${isSystemDark ? 'Dark Mode' : 'Light Mode'})`,
      };
    }
  }

  // 3. Fallback to seasonal clock hour (Winter: 07:00 - 17:30, Summer: 06:00 - 20:30)
  const month = now.getMonth();
  const isWinterHalf = month >= 9 || month <= 2; // Oct - March
  const dayStart = 7;
  const dayEnd = isWinterHalf ? 17.5 : 20.5;
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const isDay = currentHour >= dayStart && currentHour < dayEnd;
  const hourStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    theme: isDay ? 'light' : 'dark',
    source: 'clock',
    detail:
      lang === 'de'
        ? `Ortszeit: ${hourStr} (${isDay ? 'Tag = Hell' : 'Nacht = Dunkel'}, Richtwert ${dayStart}:00–${Math.floor(dayEnd)}:${dayEnd % 1 ? '30' : '00'})`
        : `Local Time: ${hourStr} (${isDay ? 'Day = Light' : 'Night = Dark'}, approx ${dayStart}:00–${Math.floor(dayEnd)}:${dayEnd % 1 ? '30' : '00'})`,
  };
}

export function useAutoTheme(lang: Language) {
  const [themePref, setThemePref] = useState<ThemePreference>(getStoredThemePref);
  const [geoCoords, setGeoCoords] = useState<GeoCoords | null>(getStoredGeoCoords);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [autoThemeInfo, setAutoThemeInfo] = useState<AutoThemeResult>(() =>
    computeAutoTheme(getStoredGeoCoords(), lang)
  );

  const effectiveTheme: 'light' | 'dark' = themePref === 'auto' ? autoThemeInfo.theme : themePref;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [effectiveTheme]);

  useEffect(() => {
    const update = () => {
      setAutoThemeInfo(computeAutoTheme(geoCoords, lang));
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [geoCoords, lang]);

  const requestGeoLocation = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setLocationStatus(
          lang === 'de'
            ? 'Geolocation wird von diesem Browser nicht unterstützt.'
            : 'Geolocation is not supported by this browser.'
        );
        return;
      }

      setIsLocating(true);
      setLocationStatus(lang === 'de' ? 'Standort wird ermittelt...' : 'Locating...');

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const coords: GeoCoords = {
            lat: Math.round(pos.coords.latitude * 100) / 100,
            lng: Math.round(pos.coords.longitude * 100) / 100,
            updatedAt: Date.now(),
          };
          setGeoCoords(coords);
          try {
            localStorage.setItem('science_iq_user_coords', JSON.stringify(coords));
          } catch {}
          setAutoThemeInfo(computeAutoTheme(coords, lang));
          setLocationStatus(
            lang === 'de'
              ? `Standort aktiv: ${coords.lat}° N, ${coords.lng}° O`
              : `Location active: ${coords.lat}° N, ${coords.lng}° E`
          );
          setTimeout(() => setLocationStatus(null), 4000);
        },
        (err) => {
          setIsLocating(false);
          console.warn('Geolocation prompt error / denied:', err);
          setLocationStatus(null);
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    },
    [lang]
  );

  const handleSelectTheme = useCallback(
    (mode: ThemePreference) => {
      setThemePref(mode);
      try {
        localStorage.setItem('science_iq_theme_preference', mode);
      } catch {}

      if (mode === 'auto' && !geoCoords) {
        requestGeoLocation();
      }
    },
    [geoCoords, requestGeoLocation]
  );

  return {
    themePref,
    geoCoords,
    isLocating,
    locationStatus,
    autoThemeInfo,
    effectiveTheme,
    requestGeoLocation,
    handleSelectTheme,
  };
}
