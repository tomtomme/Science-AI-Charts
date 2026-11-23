import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DIRECT_EXPORT_CSV_URL, RAW_CSV_URL } from '../src/data/rawCsvFallback.ts';
import type { LabPlanInfo } from '../src/types/pricingMonitor.ts';
import { fetchLabsGridFromPublishedHtml } from './labsGrid.ts';
import { getPricingMonitorStatus } from './pricingMonitor.ts';

const CACHE_FILE_PATH = path.join(os.tmpdir(), 'science-iq-weekly-fallback-snapshots-v1.json');
const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const DAILY_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface WeeklyFallbackSnapshot {
  updatedAt: string;
  mainCsv: string | null;
  labRows: string[][] | null;
  labGreenMask: boolean[][] | null;
  pricingSnapshot: {
    checkedAt: string;
    labs: LabPlanInfo[];
  } | null;
}

let inMemorySnapshot: WeeklyFallbackSnapshot | null = null;
let inFlightRefresh: Promise<WeeklyFallbackSnapshot | null> | null = null;
let maintenanceTimer: NodeJS.Timeout | null = null;

async function readCachedSnapshot(): Promise<WeeklyFallbackSnapshot | null> {
  if (inMemorySnapshot) return inMemorySnapshot;
  try {
    const raw = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as WeeklyFallbackSnapshot;
    if (parsed && typeof parsed.updatedAt === 'string') {
      inMemorySnapshot = parsed;
      return parsed;
    }
  } catch {
    // Cache file may not exist yet
  }
  return null;
}

async function writeCachedSnapshot(snapshot: WeeklyFallbackSnapshot): Promise<void> {
  inMemorySnapshot = snapshot;
  try {
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(snapshot), 'utf-8');
  } catch (err) {
    console.warn('Could not persist weekly fallback snapshot:', err);
  }
}

function isSnapshotFresh(snapshot: WeeklyFallbackSnapshot | null): boolean {
  if (!snapshot?.updatedAt || !snapshot.mainCsv) return false;
  const ts = new Date(snapshot.updatedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < WEEKLY_INTERVAL_MS;
}

async function fetchLiveMainCsv(): Promise<string | null> {
  const cb = `_t=${Date.now()}`;
  const urls = [`${DIRECT_EXPORT_CSV_URL}&${cb}`, `${RAW_CSV_URL}&${cb}`];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'text/csv, text/plain, */*',
          'User-Agent': 'Science-AI-Charts-WeeklySnapshot/1.0',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.includes('<HTML>') && !text.includes('<!DOCTYPE') && text.length >= 200) {
        return text;
      }
    } catch {
      // try next URL
    }
  }
  return null;
}

export async function refreshWeeklyFallbackSnapshot(
  force = false
): Promise<WeeklyFallbackSnapshot | null> {
  const existing = await readCachedSnapshot();
  if (!force && isSnapshotFresh(existing)) {
    return existing;
  }

  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    try {
      const [mainCsvRes, labGridRes, pricingStatusRes] = await Promise.allSettled([
        fetchLiveMainCsv(),
        fetchLabsGridFromPublishedHtml(true),
        getPricingMonitorStatus(),
      ]);

      const mainCsv =
        mainCsvRes.status === 'fulfilled' && mainCsvRes.value
          ? mainCsvRes.value
          : existing?.mainCsv ?? null;

      const labRows =
        labGridRes.status === 'fulfilled' && labGridRes.value?.rows?.length
          ? labGridRes.value.rows
          : existing?.labRows ?? null;

      const labGreenMask =
        labGridRes.status === 'fulfilled' && labGridRes.value?.greenMask?.length
          ? labGridRes.value.greenMask
          : existing?.labGreenMask ?? null;

      const pricingReport =
        pricingStatusRes.status === 'fulfilled' ? pricingStatusRes.value?.report : null;
      const pricingSnapshot =
        pricingReport?.labs?.length
          ? {
              checkedAt: pricingReport.checkedAt,
              labs: pricingReport.labs,
            }
          : existing?.pricingSnapshot ?? null;

      if (!mainCsv && !labRows && !pricingSnapshot) {
        return existing;
      }

      const next: WeeklyFallbackSnapshot = {
        updatedAt: new Date().toISOString(),
        mainCsv,
        labRows,
        labGreenMask,
        pricingSnapshot,
      };
      await writeCachedSnapshot(next);
      return next;
    } catch (err) {
      console.warn('Weekly fallback snapshot refresh failed:', err instanceof Error ? err.message : err);
      return existing;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

export async function getWeeklyFallbackSnapshot(
  forceRefresh = false
): Promise<WeeklyFallbackSnapshot | null> {
  const cached = await readCachedSnapshot();
  if (!forceRefresh && isSnapshotFresh(cached)) {
    return cached;
  }
  if (forceRefresh || !cached) {
    return refreshWeeklyFallbackSnapshot(forceRefresh);
  }
  // Return existing stale cache immediately and refresh asynchronously in background
  void refreshWeeklyFallbackSnapshot(false);
  return cached;
}

export function startWeeklySnapshotMaintenance(): void {
  if (maintenanceTimer) return;
  const initialDelay = setTimeout(() => {
    void refreshWeeklyFallbackSnapshot(false);
  }, 10_000);
  initialDelay.unref();

  maintenanceTimer = setInterval(() => {
    void refreshWeeklyFallbackSnapshot(false);
  }, DAILY_CHECK_INTERVAL_MS);
  maintenanceTimer.unref();
}
