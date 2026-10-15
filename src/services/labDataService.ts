import { LabEntry } from '../types';
import { parseCsvRows } from '../utils/csvParser';
import { DIRECT_EXPORT_LAB_CSV_URL, FALLBACK_LAB_ENTRIES, RAW_LAB_CSV_URL } from '../data/rawLabCsvFallback';

const flagMap: Record<string, string> = {
  'America (US)': '🇺🇸',
  'US': '🇺🇸',
  'USA': '🇺🇸',
  'China': '🇨🇳',
  'Canada': '🇨🇦',
  'French': '🇫🇷',
  'France': '🇫🇷',
  'Israel': '🇮🇱',
  'Singapore': '🇸🇬',
  'South Korea': '🇰🇷',
  'UAE': '🇦🇪',
  'Japan': '🇯🇵',
  'Saudi Arabia': '🇸🇦',
  'Spain': '🇪🇸',
  'Germany': '🇩🇪',
  'UK': '🇬🇧',
};

export function parseLabCsv(csvText: string): LabEntry[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 17) {
    return FALLBACK_LAB_ENTRIES;
  }

  const getCell = (r: number, c: number): string => {
    return (rows[r] && rows[r][c]) ? rows[r][c].trim() : '';
  };

  // 1. Top 10 Labs (Rows 2 to 17, 0-indexed: 1 to 16)
  const top10Specs: Array<{ id: string; name: string; cols: number[]; country: string }> = [
    { id: 'anthropic', name: 'Anthropic', cols: [1], country: 'America (US)' },
    { id: 'google', name: 'Google', cols: [2], country: 'America (US)' },
    { id: 'meta', name: 'Meta', cols: [3, 4], country: 'America (US)' },
    { id: 'nvidia', name: 'Nvidia', cols: [5], country: 'America (US)' },
    { id: 'openai', name: 'OpenAI / Microsoft', cols: [6, 7], country: 'America (US)' },
    { id: 'spacexai', name: 'SpaceXAI / xAI', cols: [8], country: 'America (US)' },
    { id: 'alibaba', name: 'Alibaba', cols: [9, 10], country: 'China' },
    { id: 'deepseek', name: 'DeepSeek', cols: [11], country: 'China' },
    { id: 'moonshot', name: 'Moonshot', cols: [12], country: 'China' },
    { id: 'zhipu', name: 'Zhipu AI (Z.ai)', cols: [13, 14], country: 'China' },
  ];

  const top10Entries: LabEntry[] = top10Specs.map((spec) => {
    const getCombined = (r: number) => {
      return spec.cols.map((c) => getCell(r, c)).filter(Boolean).join(' / ');
    };
    return {
      id: spec.id,
      group: 'top10',
      country: spec.country,
      countryFlag: flagMap[spec.country] || '🌐',
      creator: spec.name,
      famousFor: getCombined(3),
      engineName: getCombined(4),
      parameterSizes: {
        small: getCombined(5),
        medium: getCombined(6),
        large: getCombined(7),
        massive: getCombined(8),
        colossal: getCombined(9),
        planetary: getCombined(10),
        singularity: getCombined(11),
        godTier: getCombined(12),
      },
      subscriptionTiers: getCombined(13),
      harnessSdk: getCombined(14),
      dailyAgent: getCombined(15),
      codingAgent: getCombined(16),
    };
  });

  // 2. Contenders (Row 19 to 28, 0-indexed: 18 to 27)
  let currentCountry = 'America (US)';
  const contenders: LabEntry[] = [];
  
  // Contenders header in row index 18
  if (rows.length > 20) {
    for (let c = 1; c <= 25; c++) {
      const countryHeader = getCell(18, c);
      if (countryHeader) currentCountry = countryHeader;
      const creator = getCell(19, c);
      if (!creator) continue;
      const modelFamily = getCell(20, c);
      contenders.push({
        id: `contender-${c}`,
        group: 'contender',
        country: currentCountry,
        countryFlag: flagMap[currentCountry] || '🌐',
        creator: creator,
        engineName: modelFamily,
        famousFor: getCell(27, c),
        parameterSizes: {
          small: getCell(21, c),
          medium: getCell(22, c),
          large: getCell(23, c),
          massive: getCell(24, c),
          colossal: getCell(25, c),
          planetary: getCell(26, c),
        },
        specialties: getCell(27, c),
      });
    }
  }

  return [...top10Entries, ...contenders];
}

export async function fetchLiveLabEntries(): Promise<{
  entries: LabEntry[];
  isLive: boolean;
}> {
  const cacheBuster = `_t=${Date.now()}`;
  const endpoints = [
    `${DIRECT_EXPORT_LAB_CSV_URL}&${cacheBuster}`,
    `${RAW_LAB_CSV_URL}&${cacheBuster}`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/csv, text/plain, */*',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (!text.includes('<HTML>') && !text.includes('<!DOCTYPE') && text.length >= 200) {
          const parsed = parseLabCsv(text);
          if (parsed.length > 0) {
            return { entries: parsed, isLive: true };
          }
        }
      }
    } catch (e) {
      console.warn(`Failed fetching lab data from ${url}:`, e);
    }
  }

  return { entries: FALLBACK_LAB_ENTRIES, isLive: false };
}
