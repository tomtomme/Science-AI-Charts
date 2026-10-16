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
  const rTop10 = findRow('top 10') !== -1 ? findRow('top 10') : 1;
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
    const getCombined = (offset: number) => {
      const r = rTop10 + offset;
      return spec.cols.map((c) => getCell(r, c)).filter(Boolean).join(' / ');
    };
    return {
      id: spec.id,
      group: 'top10',
      country: spec.country,
      countryFlag: flagMap[spec.country] || '🌐',
      creator: spec.name,
      famousFor: getCombined(2),
      engineName: getCombined(3),
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
  for (let c = 1; c <= 25; c++) {
    const countryHeader = getCell(rContenders, c);
    if (countryHeader) curCountryContender = countryHeader;
    const creator = getCell(rContenders + 1, c);
    if (!creator) continue;
    contenders.push({
      id: `contender-${c}`,
      group: 'contender',
      country: curCountryContender,
      countryFlag: flagMap[curCountryContender] || '🌐',
      creator: creator,
      engineName: getCell(rContenders + 2, c),
      famousFor: getCell(rContenders + 9, c),
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
  for (let c = 1; c <= 8; c++) {
    const countryHeader = getCell(rTweakers, c);
    if (countryHeader) curCountryTweaker = countryHeader;
    const creator = getCell(rTweakers + 1, c);
    if (!creator) continue;
    tweakers.push({
      id: `tweaker-${c}`,
      group: 'tweakers',
      country: curCountryTweaker,
      countryFlag: flagMap[curCountryTweaker] || '🌐',
      creator: creator,
      engineName: getCell(rTweakers + 2, c),
      basedOn: getCell(rTweakers + 3, c),
      famousFor: getCell(rTweakers + 3, c) ? `Based on ${getCell(rTweakers + 3, c)}` : '',
      parameterSizes: {
        small: getCell(rTweakers + 4, c),
        medium: getCell(rTweakers + 5, c),
        large: getCell(rTweakers + 6, c),
        massive: getCell(rTweakers + 7, c),
        colossal: getCell(rTweakers + 8, c),
      },
      specialties: getCell(rTweakers + 3, c) ? `Based on ${getCell(rTweakers + 3, c)}` : '',
    });
  }

  // Add the 5 additional tweakers from notes
  const moreTweakers = [
    { name: 'Abacus AI', based: 'Alibaba (Qwen)', note: 'The Smaug series re-spins Qwen.' },
    { name: 'Arcee AI', based: 'Meta / Mistral / Alibaba', note: 'Evolutionary model merging for domain-adapted Llama, Mistral, and Qwen re-spins (SuperNova, Virtuoso).' },
    { name: 'Cognitive Computations', based: 'Meta / Mistral / Alibaba', note: 'Dolphin family for uncensored post-trained re-spins of Llama, Mistral, and Qwen.' },
    { name: 'Nous Research', based: 'Meta / Alibaba', note: 'Hermes Agent family of fine-tuned Llama and Qwen re-spins.' },
    { name: 'Fireworks AI', based: 'Moonshot (Kimi)', note: 'Kimi K3 efficiency re-spin named Ember.' },
  ];
  moreTweakers.forEach((mt, idx) => {
    tweakers.push({
      id: `tweaker-more-${idx + 1}`,
      group: 'tweakers',
      country: 'America (US)',
      countryFlag: '🇺🇸',
      creator: mt.name,
      engineName: mt.name,
      basedOn: mt.based,
      famousFor: mt.note,
      parameterSizes: {},
      specialties: mt.note,
    });
  });

  // 4. Small Model Labs (Default row 39)
  const rSmall = findRow('small model') !== -1 ? findRow('small model') : 39;
  const smallLabs: LabEntry[] = [];
  let curCountrySmall = 'America (US)';
  for (let c = 1; c <= 14; c++) {
    const countryHeader = getCell(rSmall, c);
    if (countryHeader && !countryHeader.includes('Small LLMs')) curCountrySmall = countryHeader.trim();
    const creator = getCell(rSmall + 1, c);
    if (!creator) continue;
    smallLabs.push({
      id: `small-${c}`,
      group: 'small',
      country: curCountrySmall,
      countryFlag: flagMap[curCountrySmall] || '🌐',
      creator: creator,
      engineName: getCell(rSmall + 2, c),
      famousFor: getCell(rSmall + 9, c),
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

  // 5. Harness Only Labs (Default row 51)
  const rHarness = findRow('harness only') !== -1 ? findRow('harness only') : 51;
  const harnessLabs: LabEntry[] = [];
  let curCountryHarness = 'America (US)';
  for (let c = 1; c <= 17; c++) {
    const countryHeader = getCell(rHarness, c);
    if (countryHeader) curCountryHarness = countryHeader.trim();
    const creator = getCell(rHarness + 1, c);
    if (!creator) continue;
    harnessLabs.push({
      id: `harness-${c}`,
      group: 'harness',
      country: curCountryHarness,
      countryFlag: flagMap[curCountryHarness] || '🌐',
      creator: creator,
      famousFor: getCell(rHarness + 4, c),
      engineName: getCell(rHarness + 2, c),
      harness: getCell(rHarness + 2, c),
      form: getCell(rHarness + 3, c),
      note: getCell(rHarness + 4, c),
      parameterSizes: {},
      specialties: getCell(rHarness + 4, c) ? `${getCell(rHarness + 3, c)} (${getCell(rHarness + 4, c)})` : getCell(rHarness + 3, c),
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
