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
  'Singapur': '🇸🇬',
  'South Korea': '🇰🇷',
  'UAE': '🇦🇪',
  'Japan': '🇯🇵',
  'Saudi Arabia': '🇸🇦',
  'Spain': '🇪🇸',
  'Germany': '🇩🇪',
  'UK': '🇬🇧',
  'India': '🇮🇳',
};

export function normalizeCountry(raw: string): { country: string; flag: string } {
  const trimmed = raw ? raw.trim() : '';
  if (trimmed === 'Singapur' || trimmed === 'Singapore') {
    return { country: 'Singapore', flag: '🇸🇬' };
  }
  if (trimmed === 'French' || trimmed === 'France') {
    return { country: 'France', flag: '🇫🇷' };
  }
  if (trimmed === 'US' || trimmed === 'USA' || trimmed === 'America (US)') {
    return { country: 'America (US)', flag: '🇺🇸' };
  }
  if (trimmed === 'South Korea' || trimmed.startsWith('South Korea')) {
    return { country: 'South Korea', flag: '🇰🇷' };
  }
  return {
    country: trimmed,
    flag: flagMap[trimmed] || '🌐',
  };
}

export function parseLabCsv(csvText: string): LabEntry[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 17) {
    return FALLBACK_LAB_ENTRIES;
  }

  const getCell = (r: number, c: number): string => {
    return (rows[r] && rows[r][c]) ? rows[r][c].trim() : '';
  };

  const findRow = (keyword: string): number => {
    const kw = keyword.toLowerCase();
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] && rows[i][0].toLowerCase().includes(kw)) {
        return i;
      }
    }
    return -1;
  };

  // 1. Top 10 Labs (Default row 1)
  const rTop10 = findRow('top') !== -1 ? findRow('top') : 1;
  const top10Specs: Array<{ id: string; defaultName: string; cols: number[]; country: string }> = [
    { id: 'anthropic', defaultName: 'Anthropic', cols: [1], country: 'America (US)' },
    { id: 'google', defaultName: 'Google', cols: [2], country: 'America (US)' },
    { id: 'meta', defaultName: 'Meta', cols: [3], country: 'America (US)' },
    { id: 'nvidia', defaultName: 'Nvidia', cols: [4], country: 'America (US)' },
    { id: 'openai', defaultName: 'OpenAI', cols: [5], country: 'America (US)' },
    { id: 'spacexai', defaultName: 'SpaceXAI', cols: [6], country: 'America (US)' },
    { id: 'alibaba', defaultName: 'Alibaba', cols: [7, 8], country: 'China' },
    { id: 'deepseek', defaultName: 'DeepSeek', cols: [9], country: 'China' },
    { id: 'moonshot', defaultName: 'Moonshot', cols: [10], country: 'China' },
    { id: 'zhipu', defaultName: 'Z.ai / Zhipu', cols: [11], country: 'China' },
  ];

  // Map of fallback entries by ID and by creator name for open weights metadata
  const fallbackMap = new Map<string, LabEntry>(FALLBACK_LAB_ENTRIES.map((l) => [l.id, l]));
  const fallbackByCreator = new Map<string, LabEntry>(FALLBACK_LAB_ENTRIES.map((l) => [l.creator.toLowerCase().trim(), l]));

  const top10Entries: LabEntry[] = top10Specs.map((spec) => {
    const getCombined = (offset: number) => {
      const r = rTop10 + offset;
      return spec.cols.map((c) => getCell(r, c)).filter(Boolean).join(' / ');
    };
    const dynamicCreator =
      spec.id === 'alibaba'
        ? 'Alibaba'
        : getCell(rTop10 + 1, spec.cols[0]) || spec.defaultName;

    const fb = fallbackMap.get(spec.id);
    const { country, flag } = normalizeCountry(spec.country);

    return {
      id: spec.id,
      group: 'top10',
      country,
      countryFlag: flag,
      creator: dynamicCreator,
      famousFor: getCombined(2),
      engineName: getCombined(3),
      weightsType: fb?.weightsType || 'hybrid',
      openWeights: fb?.openWeights,
      parameterSizes: {
        small: getCombined(4),
        medium: getCombined(5),
        large: getCombined(6),
        massive: getCombined(7),
        colossal: getCombined(8),
        planetary: getCombined(9),
        singularity: getCombined(10),
        godTier: getCombined(11),
      },
      subscriptionTiers: getCombined(12),
      harnessSdk: getCombined(13),
      dailyAgent: getCombined(14),
      codingAgent: getCombined(15),
    };
  });


  // 2. Contenders (Default row 18)
  const rContenders = findRow('contender') !== -1 ? findRow('contender') : 18;
  let curCountryContender = 'America (US)';
  const contenders: LabEntry[] = [];
  const contendersMaxCols = rows[rContenders + 1]?.length || 35;
  for (let c = 1; c < contendersMaxCols; c++) {
    const countryHeader = getCell(rContenders, c);
    if (countryHeader) curCountryContender = countryHeader;
    const creator = getCell(rContenders + 1, c);
    if (!creator) continue;
    const fb = fallbackMap.get(`contender-${c}`) || fallbackByCreator.get(creator.toLowerCase());
    const { country, flag } = normalizeCountry(curCountryContender);
    contenders.push({
      id: `contender-${c}`,
      group: 'contender',
      country,
      countryFlag: flag,
      creator: creator,
      engineName: getCell(rContenders + 2, c),
      famousFor: getCell(rContenders + 9, c),
      weightsType: fb?.weightsType || 'open',
      openWeights: fb?.openWeights,
      parameterSizes: {
        small: getCell(rContenders + 3, c),
        medium: getCell(rContenders + 4, c),
        large: getCell(rContenders + 5, c),
        massive: getCell(rContenders + 6, c),
        colossal: getCell(rContenders + 7, c),
        planetary: getCell(rContenders + 8, c),
      },
      specialties: getCell(rContenders + 9, c),
    });
  }

  // 3. Model Tweakers (Default row 29)
  const rTweakers = findRow('tweaker') !== -1 ? findRow('tweaker') : 29;
  const tweakers: LabEntry[] = [];
  let curCountryTweaker = 'America (US)';
  const tweakersMaxCols = rows[rTweakers + 1]?.length || 30;
  for (let c = 1; c < tweakersMaxCols; c++) {
    const countryHeader = getCell(rTweakers, c);
    if (countryHeader) curCountryTweaker = countryHeader;
    const creator = getCell(rTweakers + 1, c);
    if (!creator) continue;
    const fb = fallbackMap.get(`tweaker-${c}`) || fallbackByCreator.get(creator.toLowerCase());
    const { country, flag } = normalizeCountry(curCountryTweaker);
    tweakers.push({
      id: `tweaker-${c}`,
      group: 'tweakers',
      country,
      countryFlag: flag,
      creator: creator,
      engineName: getCell(rTweakers + 2, c),
      basedOn: getCell(rTweakers + 3, c),
      famousFor: getCell(rTweakers + 3, c) ? `Based on ${getCell(rTweakers + 3, c)}` : '',
      weightsType: fb?.weightsType || 'open',
      openWeights: fb?.openWeights,
      parameterSizes: {
        small: getCell(rTweakers + 4, c),
        medium: getCell(rTweakers + 5, c),
        large: getCell(rTweakers + 6, c),
        massive: getCell(rTweakers + 7, c),
        colossal: getCell(rTweakers + 8, c),
        planetary: getCell(rTweakers + 9, c),
      },
      specialties: getCell(rTweakers + 3, c) ? `Based on ${getCell(rTweakers + 3, c)}` : '',
    });
  }

  // 4. Small Model Labs (Default row 40)
  const rSmall = findRow('small model') !== -1 ? findRow('small model') : 40;
  const smallLabs: LabEntry[] = [];
  let curCountrySmall = 'America (US)';
  const smallMaxCols = rows[rSmall + 1]?.length || 30;
  for (let c = 1; c < smallMaxCols; c++) {
    const countryHeader = getCell(rSmall, c);
    if (countryHeader && !countryHeader.toLowerCase().includes('small llm') && !countryHeader.toLowerCase().includes('small model')) {
      curCountrySmall = countryHeader.trim();
    }
    const creator = getCell(rSmall + 1, c);
    // If col 15 is Samsung Gauss 2 (creator cell blank, but part of Samsung), merge into col 14
    if (c === 15) continue;
    if (!creator) continue;

    const fb = fallbackMap.get(`small-${c}`) || fallbackByCreator.get(creator.toLowerCase());
    const { country, flag } = normalizeCountry(curCountrySmall);

    // If Samsung (col 14), combine Gauss 1 & Gauss 2 (from col 15)
    if (c === 14 && creator.toLowerCase().includes('samsung')) {
      const g2Mini = getCell(rSmall + 4, 15);
      const g2Tiny = getCell(rSmall + 5, 15);
      const g2Medium = getCell(rSmall + 7, 15);

      const combineModels = (m1: string, m2: string) => {
        if (m1 && m2) return `${m1} / ${m2}`;
        return m1 || m2 || '';
      };

      smallLabs.push({
        id: `small-${c}`,
        group: 'small',
        country,
        countryFlag: flag,
        creator: 'Samsung',
        engineName: 'Gauss 1 / Gauss 2',
        famousFor: getCell(rSmall + 9, c) || 'for Galaxy AI',
        weightsType: fb?.weightsType || 'open',
        openWeights: fb?.openWeights,
        parameterSizes: {
          micro: getCell(rSmall + 3, c),
          mini: combineModels(getCell(rSmall + 4, c), g2Mini),
          tiny: combineModels(getCell(rSmall + 5, c), g2Tiny),
          small: getCell(rSmall + 6, c),
          medium: combineModels(getCell(rSmall + 7, c), g2Medium),
          large: getCell(rSmall + 8, c),
        },
        specialties: getCell(rSmall + 9, c) || 'for Galaxy AI',
      });
      continue;
    }

    smallLabs.push({
      id: `small-${c}`,
      group: 'small',
      country,
      countryFlag: flag,
      creator: creator,
      engineName: getCell(rSmall + 2, c),
      famousFor: getCell(rSmall + 9, c),
      weightsType: fb?.weightsType || 'open',
      openWeights: fb?.openWeights,
      parameterSizes: {
        micro: getCell(rSmall + 3, c),
        mini: getCell(rSmall + 4, c),
        tiny: getCell(rSmall + 5, c),
        small: getCell(rSmall + 6, c),
        medium: getCell(rSmall + 7, c),
        large: getCell(rSmall + 8, c),
      },
      specialties: getCell(rSmall + 9, c),
    });
  }

  // 5. Harness Only Labs (Default row 52)
  const rHarness = findRow('harness only') !== -1 ? findRow('harness only') : 52;
  const harnessLabs: LabEntry[] = [];
  let curCountryHarness = 'America (US)';
  const harnessMaxCols = rows[rHarness + 1]?.length || 30;
  for (let c = 1; c < harnessMaxCols; c++) {
    const countryHeader = getCell(rHarness, c);
    if (countryHeader) curCountryHarness = countryHeader.trim();
    const creator = getCell(rHarness + 1, c);
    if (!creator) continue;
    const { country, flag } = normalizeCountry(curCountryHarness);
    harnessLabs.push({
      id: `harness-${c}`,
      group: 'harness',
      country,
      countryFlag: flag,
      creator: creator,
      famousFor: '',
      engineName: getCell(rHarness + 2, c),
      harness: getCell(rHarness + 2, c),
      form: getCell(rHarness + 3, c),
      note: getCell(rHarness + 4, c),
      specialties: '',
      parameterSizes: {},
    });
  }

  const all = [...top10Entries, ...contenders, ...tweakers, ...smallLabs, ...harnessLabs];
  return all.length > 0 ? all : FALLBACK_LAB_ENTRIES;
}

export async function fetchLiveLabEntries(): Promise<{
  entries: LabEntry[];
  isLive: boolean;
}> {
  const cacheBuster = `_t=${Date.now()}`;
  // Prioritize published CSV URL first as it consistently allows cross-origin requests
  const endpoints = [
    `${RAW_LAB_CSV_URL}&${cacheBuster}`,
    `${DIRECT_EXPORT_LAB_CSV_URL}&${cacheBuster}`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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
