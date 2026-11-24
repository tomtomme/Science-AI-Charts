import { ManualRowMapping } from '../types/integrityMonitor';
import { StaticPreviewApiError } from './pricingMonitorService';

export async function parseMonitorJsonResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new StaticPreviewApiError();
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
  }
  return data as T;
}

export interface BenchmarkPreferencesPayload<TSnapshot> {
  replaceAll?: boolean;
  ignoredIds?: string[];
  ignoreIds?: string[];
  unignoreIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
  unmapIds?: string[];
  models?: TSnapshot[];
}

export interface BenchmarkCheckPreferences {
  replaceAll?: boolean;
  ignoredIds?: string[];
  manualMappings?: Record<string, ManualRowMapping>;
}

export interface BenchmarkMonitorApiClient<TStatus, TReport, TSnapshot> {
  fetchStatus: () => Promise<TStatus>;
  triggerCheck: (
    models?: TSnapshot[],
    trigger?: 'manual' | 'daily_auto',
    preferences?: BenchmarkCheckPreferences
  ) => Promise<TReport>;
  updatePreferences: (
    options: BenchmarkPreferencesPayload<TSnapshot>
  ) => Promise<TReport | null>;
}

export function createMonitorApiClient<TStatus, TReport, TSnapshot>(
  basePath: string
): BenchmarkMonitorApiClient<TStatus, TReport, TSnapshot> {
  return {
    async fetchStatus(): Promise<TStatus> {
      const res = await fetch(`${basePath}/status`);
      return parseMonitorJsonResponse<TStatus>(res);
    },

    async triggerCheck(
      models: TSnapshot[] = [],
      trigger: 'manual' | 'daily_auto' = 'manual',
      preferences?: BenchmarkCheckPreferences
    ): Promise<TReport> {
      const res = await fetch(`${basePath}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          models,
          trigger,
          ...(preferences?.replaceAll
            ? {
                replaceAll: true,
                ignoredIds: preferences.ignoredIds ?? [],
                manualMappings: preferences.manualMappings ?? {},
              }
            : {}),
        }),
      });
      const data = await parseMonitorJsonResponse<{ report: TReport }>(res);
      return data.report;
    },

    async updatePreferences(
      options: BenchmarkPreferencesPayload<TSnapshot>
    ): Promise<TReport | null> {
      const res = await fetch(`${basePath}/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      const data = await parseMonitorJsonResponse<{ report: TReport | null }>(res);
      return data.report;
    },
  };
}
