import fs from 'node:fs/promises';
import type { ManualRowMapping } from '../../src/types/integrityMonitor.ts';

export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const SCORE_DIFF_THRESHOLD = 1e-4;

export interface PersistedMonitorCache<TReport> {
  report: TReport | null;
  knownSourceIds: string[];
  ignoredIds: string[];
  manualMappings: Record<string, ManualRowMapping>;
  lastError: string | null;
}

export interface MonitorStatusPayload<TReport> {
  report: TReport | null;
  isDue: boolean;
  isRunning: boolean;
  checkIntervalHours: number;
  lastError: string | null;
}

export interface MonitorPreferencesOptions<TSheet> {
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  unmapIds?: string[];
  models?: TSheet[];
}

export interface MonitorDiffCounts {
  unmatchedCount: number;
  missingCount: number;
  overwriteEstimateCount: number;
  changedCount: number;
  unchangedCount: number;
  ignoredCount: number;
  actionableCount: number;
  summaryDe: string;
  summaryEn: string;
}

export function sanitizeManualMappings(raw: unknown): Record<string, ManualRowMapping> {
  const out: Record<string, ManualRowMapping> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v && typeof v === 'object') {
      const rec = v as Partial<ManualRowMapping>;
      if (
        typeof rec.sheetRowNumber === 'number' &&
        Number.isInteger(rec.sheetRowNumber) &&
        rec.sheetRowNumber >= 2
      ) {
        out[k] = {
          sheetRowNumber: rec.sheetRowNumber,
          ...(typeof rec.matchedModelId === 'string' && rec.matchedModelId
            ? { matchedModelId: rec.matchedModelId }
            : {}),
          ...(typeof rec.matchedDisplayName === 'string' && rec.matchedDisplayName
            ? { matchedDisplayName: rec.matchedDisplayName }
            : {}),
        };
      }
    }
  }
  return out;
}

export function isTimestampDue(checkedAt?: string | null): boolean {
  if (!checkedAt) return true;
  const checkedMs = new Date(checkedAt).getTime();
  if (!Number.isFinite(checkedMs)) return true;
  return Date.now() - checkedMs >= CHECK_INTERVAL_MS;
}

export function formatExactScore(val: number, minDecimals?: number): string {
  const str = String(val);
  if (typeof minDecimals === 'number' && minDecimals > 0) {
    const dot = str.indexOf('.');
    const curDec = dot !== -1 ? str.length - dot - 1 : 0;
    if (curDec < minDecimals) {
      return val.toFixed(minDecimals);
    }
  }
  return str;
}

export async function fetchTextWithTimeout(
  url: string,
  userAgent: string,
  accept: string,
  timeoutMs = 15000
): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      Accept: accept,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} while fetching ${url}`);
  }
  return res.text();
}

export function computeReleaseDateTiebreaker(releaseDate?: string | null, baseYear = 2025): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate || '')) return 0;
  const ts = Date.parse(releaseDate || '');
  if (!Number.isFinite(ts)) return 0;
  const baseTs = Date.parse(`${baseYear}-01-01`);
  return Math.max(0, Math.min(10, Math.floor((ts - baseTs) / 31536000000)));
}

export function matchCompanyName(
  sourceCompany: string,
  sheetCompany: string,
  options?: { moonshotKey?: string; includeMetaLlama?: boolean }
): boolean {
  const a = (sourceCompany || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = (sheetCompany || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  if ((a === 'zai' || a === 'zhipu') && b === 'zai') return true;
  if (a === 'xai' && (b.includes('xai') || b.includes('spacex'))) return true;
  const moonshotKey = options?.moonshotKey ?? 'moonshot';
  if ((a === moonshotKey || a === 'moonshotai') && b.includes('kimi')) return true;
  if (options?.includeMetaLlama && a === 'meta' && b.includes('llama')) return true;
  return false;
}

function normalizeStoredModelName(val: string | undefined | null): string {
  return (val || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeLegacyModelId(id: string | undefined | null): string {
  return (id || '').replace(/^model-\d+-/, 'model-');
}

export function reserveManualMappings<
  TSrc extends { id: string },
  TSheet extends { id: string; sheetRowNumber: number; displayName?: string; name?: string },
>(
  sourceModels: TSrc[],
  sheetModels: TSheet[],
  ignoredSet: Set<string>,
  manualMappings: Record<string, ManualRowMapping>
): {
  usedSheetRows: Set<number>;
  resolvedMatches: Map<string, TSheet>;
  healedMappings: Record<string, ManualRowMapping>;
} {
  const usedSheetRows = new Set<number>();
  const resolvedMatches = new Map<string, TSheet>();
  const healedMappings: Record<string, ManualRowMapping> = { ...manualMappings };

  for (const src of sourceModels) {
    if (ignoredSet.has(src.id)) continue;
    const mapping = manualMappings[src.id];
    if (!mapping) continue;

    const storedDisplayNorm = normalizeStoredModelName(mapping.matchedDisplayName);
    let found: TSheet | undefined;

    // 1. Check exact ID match (including migrated legacy model-<row>-<slug> IDs) when displayName agrees
    if (mapping.matchedModelId) {
      const storedLegacyNorm = normalizeLegacyModelId(mapping.matchedModelId);
      const byId = sheetModels.find(
        (c) =>
          !usedSheetRows.has(c.sheetRowNumber) &&
          (c.id === mapping.matchedModelId ||
            normalizeLegacyModelId(c.id) === storedLegacyNorm)
      );
      if (byId) {
        const byIdDisplayNorm = normalizeStoredModelName(byId.displayName);
        if (!storedDisplayNorm || byIdDisplayNorm === storedDisplayNorm) {
          found = byId;
        }
      }
    }

    // 2. If ID shifted (because row numbers are baked into model-<row>-<name> IDs), match by saved displayName
    if (!found && storedDisplayNorm) {
      const nameMatches = sheetModels.filter((c) => {
        if (usedSheetRows.has(c.sheetRowNumber)) return false;
        return (
          normalizeStoredModelName(c.displayName) === storedDisplayNorm ||
          normalizeStoredModelName(c.name) === storedDisplayNorm
        );
      });
      if (nameMatches.length > 0) {
        nameMatches.sort(
          (a, b) =>
            Math.abs(a.sheetRowNumber - mapping.sheetRowNumber) -
            Math.abs(b.sheetRowNumber - mapping.sheetRowNumber)
        );
        found = nameMatches[0];
      }
    }

    // 3. Fall back to row number ONLY when no matchedDisplayName was recorded
    if (!found && !storedDisplayNorm) {
      found = sheetModels.find(
        (c) => !usedSheetRows.has(c.sheetRowNumber) && c.sheetRowNumber === mapping.sheetRowNumber
      );
    }

    if (found) {
      usedSheetRows.add(found.sheetRowNumber);
      resolvedMatches.set(src.id, found);
      healedMappings[src.id] = {
        sheetRowNumber: found.sheetRowNumber,
        matchedModelId: found.id,
        ...(found.displayName ? { matchedDisplayName: found.displayName } : {}),
      };
    }
  }

  return { usedSheetRows, resolvedMatches, healedMappings };
}

export function countDiffStatuses<TDiff extends { status: string }>(diffs: TDiff[]) {
  const unmatchedCount = diffs.filter((d) => d.status === 'new_unmatched').length;
  const missingCount = diffs.filter((d) => d.status === 'missing').length;
  const overwriteEstimateCount = diffs.filter((d) => d.status === 'overwrite_estimate').length;
  const changedCount = diffs.filter((d) => d.status === 'changed').length;
  const unchangedCount = diffs.filter((d) => d.status === 'unchanged').length;
  const ignoredCount = diffs.filter((d) => d.status === 'ignored').length;
  const actionableCount =
    unmatchedCount + missingCount + overwriteEstimateCount + changedCount;

  return {
    unmatchedCount,
    missingCount,
    overwriteEstimateCount,
    changedCount,
    unchangedCount,
    ignoredCount,
    actionableCount,
  };
}

export interface MonitorRuntimeConfig<
  TSource extends { id: string },
  TSheet,
  TDiff extends { status: string },
  TReport extends {
    checkedAt: string;
    sourceUpdatedAt: string | null;
    totalSourceModels: number;
    models: TSource[];
    diffs: TDiff[];
  },
  TLiveResult extends {
    updatedAt: string | null;
    models: TSource[];
    newlyDiscoveredIds: string[];
  },
> {
  label: string;
  cacheFilePath: string;
  sourceUrl: string;
  initialBaselineIds?: Iterable<string>;
  checkFailureFallbackMessage: string;
  fetchLiveLeaderboard: (previousKnownIds: string[]) => Promise<TLiveResult>;
  buildDiffs: (
    sourceModels: TSource[],
    sheetModels: TSheet[],
    preferences: { ignoredIds: string[]; manualMappings: Record<string, ManualRowMapping> }
  ) => TDiff[];
  summarizeCounts: (
    live: TLiveResult,
    diffs: TDiff[],
    hasSheetModels: boolean,
    report?: TReport
  ) => MonitorDiffCounts;
  createReport: (params: {
    checkedAt: string;
    nextCheckDueAt: string;
    live: TLiveResult;
    baselineKnownCount: number;
    trigger: 'manual' | 'daily_auto';
    diffs: TDiff[];
    counts: MonitorDiffCounts;
  }) => TReport;
  getDiffSourceId: (diff: TDiff) => string;
  markDiffIgnored: (diff: TDiff) => TDiff;
}

export function createMonitorRuntime<
  TSource extends { id: string },
  TSheet extends { id: string; sheetRowNumber: number; displayName?: string; name?: string },
  TDiff extends { status: string },
  TReport extends {
    checkedAt: string;
    sourceUpdatedAt: string | null;
    totalSourceModels: number;
    models: TSource[];
    diffs: TDiff[];
    manualMappings?: Record<string, ManualRowMapping>;
  },
  TLiveResult extends {
    updatedAt: string | null;
    models: TSource[];
    newlyDiscoveredIds: string[];
  } = {
    updatedAt: string | null;
    models: TSource[];
    newlyDiscoveredIds: string[];
  },
>(config: MonitorRuntimeConfig<TSource, TSheet, TDiff, TReport, TLiveResult>) {
  let inMemoryCache: PersistedMonitorCache<TReport> | null = null;
  let inFlightCheck: Promise<TReport> | null = null;
  const baselineArray = config.initialBaselineIds ? Array.from(config.initialBaselineIds) : null;

  async function readCache(): Promise<PersistedMonitorCache<TReport>> {
    if (inMemoryCache) {
      return inMemoryCache;
    }

    try {
      const raw = await fs.readFile(config.cacheFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedMonitorCache<TReport>>;
      if (parsed && typeof parsed === 'object') {
        const sanitizedMappings = sanitizeManualMappings(parsed.manualMappings);
        const loadedReport = parsed.report
          ? ({ ...parsed.report, manualMappings: sanitizedMappings } as TReport)
          : null;
        inMemoryCache = {
          report: loadedReport,
          knownSourceIds: Array.isArray(parsed.knownSourceIds)
            ? parsed.knownSourceIds.map(String)
            : [],
          ignoredIds: Array.isArray(parsed.ignoredIds) ? parsed.ignoredIds.map(String) : [],
          manualMappings: sanitizedMappings,
          lastError: parsed.lastError ?? null,
        };
        return inMemoryCache;
      }
    } catch {
      // Cache file may not exist yet
    }

    inMemoryCache = {
      report: null,
      knownSourceIds: [],
      ignoredIds: [],
      manualMappings: {},
      lastError: null,
    };
    return inMemoryCache;
  }

  async function writeCache(cache: PersistedMonitorCache<TReport>): Promise<void> {
    inMemoryCache = cache;
    try {
      await fs.writeFile(config.cacheFilePath, JSON.stringify(cache, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`Could not persist ${config.label} monitor cache to temp dir:`, err);
    }
  }

  function isReportDue(report: TReport | null): boolean {
    return isTimestampDue(report?.checkedAt);
  }

  async function getStatus(): Promise<MonitorStatusPayload<TReport>> {
    const cache = await readCache();
    return {
      report: cache.report,
      isDue: isReportDue(cache.report),
      isRunning: inFlightCheck !== null,
      checkIntervalHours: 24,
      lastError: cache.lastError,
    };
  }

  async function runCheck(options?: {
    models?: TSheet[];
    trigger?: 'manual' | 'daily_auto';
  }): Promise<TReport> {
    if (inFlightCheck) {
      return inFlightCheck;
    }

    const trigger = options?.trigger || 'manual';
    const sheetModels = Array.isArray(options?.models) ? options.models : [];

    const task = (async () => {
      const cache = await readCache();

      try {
        const effectivePreviousIds =
          baselineArray && cache.knownSourceIds.length === 0
            ? baselineArray
            : cache.knownSourceIds;
        const live = await config.fetchLiveLeaderboard(effectivePreviousIds);
        const activeMappings =
          sheetModels.length > 0
            ? reserveManualMappings(
                live.models,
                sheetModels,
                new Set(cache.ignoredIds),
                cache.manualMappings
              ).healedMappings
            : cache.manualMappings;

        const diffs =
          sheetModels.length > 0
            ? config.buildDiffs(live.models, sheetModels, {
                ignoredIds: cache.ignoredIds,
                manualMappings: activeMappings,
              })
            : [];

        const counts = config.summarizeCounts(live, diffs, sheetModels.length > 0);
        const now = new Date();
        const nextDue = new Date(now.getTime() + CHECK_INTERVAL_MS);
        const mergedKnownIds = Array.from(
          new Set([...effectivePreviousIds, ...live.models.map((m) => m.id)])
        );

        const report = {
          ...config.createReport({
            checkedAt: now.toISOString(),
            nextCheckDueAt: nextDue.toISOString(),
            live,
            baselineKnownCount: effectivePreviousIds.length,
            trigger,
            diffs,
            counts,
          }),
          manualMappings: activeMappings,
        } as TReport;

        await writeCache({
          report,
          knownSourceIds: mergedKnownIds,
          ignoredIds: cache.ignoredIds,
          manualMappings: activeMappings,
          lastError: null,
        });

        return report;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : config.checkFailureFallbackMessage;
        await writeCache({
          report: cache.report,
          knownSourceIds: cache.knownSourceIds,
          ignoredIds: cache.ignoredIds,
          manualMappings: cache.manualMappings,
          lastError: message,
        });
        throw err;
      }
    })();

    inFlightCheck = task;
    try {
      return await task;
    } finally {
      inFlightCheck = null;
    }
  }

  async function updatePreferences(
    options: MonitorPreferencesOptions<TSheet>
  ): Promise<TReport | null> {
    const cache = await readCache();
    const nextIgnored = new Set(cache.ignoredIds);
    const nextMappings: Record<string, ManualRowMapping> = { ...cache.manualMappings };

    if (Array.isArray(options.ignoreIds)) {
      for (const id of options.ignoreIds) {
        const clean = String(id || '').trim();
        if (clean) {
          nextIgnored.add(clean);
          delete nextMappings[clean];
        }
      }
    }

    if (Array.isArray(options.unignoreIds)) {
      for (const id of options.unignoreIds) {
        nextIgnored.delete(String(id || '').trim());
      }
    }

    if (options.manualMappings && typeof options.manualMappings === 'object') {
      const cleanNew = sanitizeManualMappings(options.manualMappings);
      for (const [id, mapping] of Object.entries(cleanNew)) {
        nextMappings[id] = mapping;
        nextIgnored.delete(id);
      }
    }

    if (Array.isArray(options.unmapIds)) {
      for (const id of options.unmapIds) {
        const clean = String(id || '').trim();
        if (clean) {
          delete nextMappings[clean];
        }
      }
    }

    const ignoredIds = Array.from(nextIgnored);
    const sheetModels = Array.isArray(options.models) ? options.models : [];

    const effectiveMappings =
      sheetModels.length > 0 && cache.report?.models?.length
        ? reserveManualMappings(
            cache.report.models,
            sheetModels,
            nextIgnored,
            nextMappings
          ).healedMappings
        : nextMappings;

    let updatedReport = cache.report;
    if (updatedReport && updatedReport.models.length > 0) {
      const nextDiffs =
        sheetModels.length > 0
          ? config.buildDiffs(updatedReport.models, sheetModels, {
              ignoredIds,
              manualMappings: effectiveMappings,
            })
          : updatedReport.diffs.map((d) =>
              nextIgnored.has(config.getDiffSourceId(d)) ? config.markDiffIgnored(d) : d
            );

      const syntheticLive = {
        updatedAt: updatedReport.sourceUpdatedAt,
        models: updatedReport.models,
        newlyDiscoveredIds: [],
      } as unknown as TLiveResult;

      const counts = config.summarizeCounts(
        syntheticLive,
        nextDiffs,
        sheetModels.length > 0 || updatedReport.diffs.length > 0,
        updatedReport
      );

      updatedReport = {
        ...updatedReport,
        diffs: nextDiffs,
        manualMappings: effectiveMappings,
        ...counts,
      };
    }

    await writeCache({
      report: updatedReport,
      knownSourceIds: cache.knownSourceIds,
      ignoredIds,
      manualMappings: effectiveMappings,
      lastError: cache.lastError,
    });

    return updatedReport;
  }

  return {
    isReportDue,
    getStatus,
    runCheck,
    updatePreferences,
  };
}
