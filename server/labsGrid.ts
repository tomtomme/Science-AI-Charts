import { decodeHtmlEntities as decodeHtmlEntitiesShared } from './utils/html.ts';

const PUBHTML_LABS_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR8QbYqPYx_PnohNVTT-hAU-NkOt9hVh-INeH_SJPwoYJpoRsBUGdmanYRZiz3ll1J0scf5U_vju3nG/pubhtml/sheet?headers=false&gid=355721692';

export interface LabsGridResponse {
  rows: string[][];
  greenMask: boolean[][];
  fetchedAt: string;
}

let cachedGrid: LabsGridResponse | null = null;
let cachedAtMs = 0;
const SHORT_CACHE_MS = 5 * 1000;

function decodeHtmlEntities(input: string): string {
  return decodeHtmlEntitiesShared(input, true);
}

function isGreenColor(colorVal: string): boolean {
  const c = colorVal.trim().toLowerCase();
  let r = 255;
  let g = 255;
  let b = 255;

  const hexMatch6 = c.match(/^#([0-9a-f]{6})$/i);
  const hexMatch3 = c.match(/^#([0-9a-f]{3})$/i);
  if (hexMatch6) {
    const hex = hexMatch6[1];
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (hexMatch3) {
    const hex = hexMatch3[1];
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    const rgbMatch = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!rgbMatch) return false;
    r = Number(rgbMatch[1]);
    g = Number(rgbMatch[2]);
    b = Number(rgbMatch[3]);
  }

  // Light / mint green cells (e.g. #d9ead3 -> rgb(217, 234, 211))
  return g > r + 8 && g > b + 8;
}

export function parsePublishedLabsHtmlGrid(html: string): LabsGridResponse {
  const greenClasses = new Set<string>();
  for (const match of html.matchAll(/\.(s\d+)\s*\{([^}]*)\}/g)) {
    const cls = match[1];
    const css = match[2];
    const bgMatch = css.match(/background-color\s*:\s*([^;}\s]+)/i);
    if (bgMatch && isGreenColor(bgMatch[1])) {
      greenClasses.add(cls);
    }
  }

  const tbodyStart = html.indexOf('<tbody>');
  const tbodyEnd = html.indexOf('</tbody>');
  const tbody = tbodyStart !== -1 && tbodyEnd !== -1 ? html.slice(tbodyStart, tbodyEnd) : html;

  const rows: string[][] = [];
  const greenMask: boolean[][] = [];
  const occupied = new Map<string, { val: string; green: boolean }>();

  let r = 0;
  for (const trMatch of tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const trContent = trMatch[1];
    const rowVals: string[] = [];
    const rowGreens: boolean[] = [];

    let c = 0;
    const fillOccupied = () => {
      while (occupied.has(`${r}:${c}`)) {
        const occ = occupied.get(`${r}:${c}`)!;
        rowVals[c] = occ.val;
        rowGreens[c] = occ.green;
        occupied.delete(`${r}:${c}`);
        c += 1;
      }
    };

    fillOccupied();

    for (const tdMatch of trContent.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)) {
      const attrs = tdMatch[1] || '';
      if (attrs.includes('freezebar-cell')) {
        continue;
      }

      fillOccupied();

      const classMatch = attrs.match(/class="([^"]*)"/i);
      const classTokens = (classMatch?.[1] || '').split(/\s+/).filter(Boolean);
      const inlineBgMatch = attrs.match(/background-color\s*:\s*([^;"']+)/i);

      const isGreen =
        classTokens.some((cls) => greenClasses.has(cls)) ||
        (inlineBgMatch ? isGreenColor(inlineBgMatch[1]) : false);

      const colspan = Math.max(1, Number(attrs.match(/colspan="(\d+)"/i)?.[1] || 1));
      const rowspan = Math.max(1, Number(attrs.match(/rowspan="(\d+)"/i)?.[1] || 1));
      const textVal = decodeHtmlEntities(tdMatch[2] || '');

      for (let rs = 0; rs < rowspan; rs++) {
        for (let cs = 0; cs < colspan; cs++) {
          const rr = r + rs;
          const cc = c + cs;
          const cellVal = rs === 0 && cs === 0 ? textVal : '';
          if (rs === 0) {
            rowVals[cc] = cellVal;
            rowGreens[cc] = isGreen;
          } else {
            occupied.set(`${rr}:${cc}`, { val: cellVal, green: isGreen });
          }
        }
      }

      c += colspan;
    }

    fillOccupied();
    rows.push(rowVals);
    greenMask.push(rowGreens);
    r += 1;
  }

  return {
    rows,
    greenMask,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchLabsGridFromPublishedHtml(forceRefresh = false): Promise<LabsGridResponse> {
  if (!forceRefresh && cachedGrid && Date.now() - cachedAtMs < SHORT_CACHE_MS) {
    return cachedGrid;
  }

  const response = await fetch(`${PUBHTML_LABS_URL}&_t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      Accept: 'text/html, */*',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Labs HTML grid (HTTP ${response.status})`);
  }

  const html = await response.text();
  const parsed = parsePublishedLabsHtmlGrid(html);
  if (parsed.rows.length < 15) {
    throw new Error('Parsed Labs HTML grid returned too few rows.');
  }

  cachedGrid = parsed;
  cachedAtMs = Date.now();
  return parsed;
}

const PUBHTML_MAIN_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR8QbYqPYx_PnohNVTT-hAU-NkOt9hVh-INeH_SJPwoYJpoRsBUGdmanYRZiz3ll1J0scf5U_vju3nG/pubhtml/sheet?headers=false&gid=170267419';

export interface MainO1LinksResponse {
  cellO1Text: string;
  links: Array<{ label: string; url: string }>;
  fetchedAt: string;
}

let cachedO1Links: MainO1LinksResponse | null = null;
let cachedO1AtMs = 0;
const O1_CACHE_MS = 60 * 1000;

function unwrapGoogleRedirectUrl(rawHref: string): string {
  const decoded = decodeHtmlEntities(rawHref);
  try {
    const u = new URL(decoded);
    if ((u.hostname === 'www.google.com' || u.hostname === 'google.com') && u.pathname === '/url') {
      const target = u.searchParams.get('q');
      if (target && /^https?:\/\//i.test(target)) {
        return target;
      }
    }
  } catch {
    // Keep decoded URL if URL constructor fails
  }
  return decoded;
}

export function parseMainO1LinksFromHtml(html: string): MainO1LinksResponse {
  const tbodyStart = html.indexOf('<tbody>');
  const tbodyEnd = html.indexOf('</tbody>');
  const tbody = tbodyStart !== -1 && tbodyEnd !== -1 ? html.slice(tbodyStart, tbodyEnd) : html;

  for (const trMatch of tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const trContent = trMatch[1];
    let col = 0;
    let fallbackCell: { cellO1Text: string; links: Array<{ label: string; url: string }> } | null =
      null;

    for (const tdMatch of trContent.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)) {
      const attrs = tdMatch[1] || '';
      if (attrs.includes('freezebar-cell')) continue;
      const colspan = Math.max(1, Number(attrs.match(/colspan="(\d+)"/i)?.[1] || 1));
      const innerHtml = tdMatch[2] || '';
      const links: Array<{ label: string; url: string }> = [];
      for (const aMatch of innerHtml.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
        const url = unwrapGoogleRedirectUrl(aMatch[1] || '');
        const label = decodeHtmlEntities(aMatch[2] || '');
        if (label && /^https?:\/\//i.test(url)) {
          links.push({ label, url });
        }
      }
      const cellO1Text = decodeHtmlEntities(innerHtml);
      const low = cellO1Text.toLowerCase();
      const isAuthorMatch =
        low.includes('app &') ||
        low.includes('table by') ||
        low.includes('table from') ||
        low.includes('tabelle von') ||
        (low.includes('thomas') && (low.includes('youtube') || low.includes('github') || low.includes('orcid'))) ||
        links.some((l) => /orcid\.org|github\.com|youtube\.com|scholar\.google/i.test(l.url));

      if (isAuthorMatch && (cellO1Text || links.length > 0)) {
        return {
          cellO1Text,
          links,
          fetchedAt: new Date().toISOString(),
        };
      }
      if (col <= 14 && col + colspan > 14 && (cellO1Text || links.length > 0)) {
        fallbackCell = { cellO1Text, links };
      }
      col += colspan;
    }

    if (fallbackCell) {
      return {
        ...fallbackCell,
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  return {
    cellO1Text: '',
    links: [],
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchMainO1LinksFromPublishedHtml(
  forceRefresh = false
): Promise<MainO1LinksResponse> {
  if (!forceRefresh && cachedO1Links && Date.now() - cachedO1AtMs < O1_CACHE_MS) {
    return cachedO1Links;
  }

  const response = await fetch(`${PUBHTML_MAIN_URL}&_t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      Accept: 'text/html, */*',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch main sheet HTML for cell O1 (HTTP ${response.status})`);
  }

  const html = await response.text();
  const parsed = parseMainO1LinksFromHtml(html);
  cachedO1Links = parsed;
  cachedO1AtMs = Date.now();
  return parsed;
}
