import { LabPlanInfo, MonitoredLab } from '../types/pricingMonitor';
import {
  matchMonitoredLabKey,
  mergePricingPlansWithDefaults,
} from '../data/pricingPlansFallback';
import { roundCurrencyString } from './priceFormat';

export interface ComputedStarterPlanRange {
  lab: MonitoredLab;
  planName: string;
  deRange: string;
  usRange: string;
  sourceUrl?: string;
}

function extractMaxPriceNumber(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const rounded = roundCurrencyString(raw);
  if (!rounded || /\bus\s*only\b/i.test(rounded)) return null;
  const nums =
    rounded
      .match(/\d+/g)
      ?.map((n) => parseInt(n, 10))
      .filter((n) => Number.isFinite(n)) || [];
  if (nums.length === 0) return null;
  const maxVal = Math.max(...nums);
  return maxVal > 0 ? maxVal : null;
}

export function findStarterPlanForLab(
  monitoredLab: MonitoredLab,
  plans: LabPlanInfo[]
): LabPlanInfo | undefined {
  const labPlans = plans.filter((p) => p.lab === monitoredLab);
  if (monitoredLab === 'OpenAI') {
    return labPlans.find((p) => /\bgo\b/i.test(p.planName));
  }
  if (monitoredLab === 'Google') {
    return labPlans.find((p) => /\bplus\b/i.test(p.planName));
  }
  if (monitoredLab === 'Anthropic') {
    return labPlans.find((p) => /\bpro\b/i.test(p.planName));
  }
  if (monitoredLab === 'xAI') {
    return labPlans.find((p) => /\bplus\b/i.test(p.planName));
  }
  if (monitoredLab === 'Moonshot') {
    return labPlans.find((p) => /\bplus\b/i.test(p.planName));
  }
  return undefined;
}

export function resolveStarterLabForFreeModel(
  companyName: string,
  displayName: string,
  isPaid: boolean,
  extraName?: string
): MonitoredLab | null {
  if (isPaid) return null;

  const monitoredLab =
    matchMonitoredLabKey(companyName) ||
    matchMonitoredLabKey(displayName) ||
    (extraName ? matchMonitoredLabKey(extraName) : null);
  if (!monitoredLab) return null;

  const haystack = `${displayName} ${extraName || ''}`.toLowerCase();
  if (monitoredLab === 'OpenAI' && /\bluna\b/i.test(haystack)) return monitoredLab;
  if (monitoredLab === 'Google' && /\bhydrogen\b/i.test(haystack)) return monitoredLab;
  if (monitoredLab === 'Anthropic' && /\bsonnet\b/i.test(haystack)) return monitoredLab;
  if (monitoredLab === 'xAI' && /\bgrok\s*4(\.\d+)?\b/i.test(haystack)) return monitoredLab;
  if (monitoredLab === 'Moonshot' && /\bkimi\s*k3(\.\d+)?\b/i.test(haystack)) return monitoredLab;

  return null;
}

export function isStarterSubscriptionFreeModel(
  companyName: string,
  displayName: string,
  isPaid: boolean,
  extraName?: string
): boolean {
  return resolveStarterLabForFreeModel(companyName, displayName, isPaid, extraName) !== null;
}

export function computeStarterPlanRange(
  companyName: string,
  displayName: string,
  isPaid: boolean,
  livePlans?: LabPlanInfo[] | null,
  extraName?: string
): ComputedStarterPlanRange | null {
  const lab = resolveStarterLabForFreeModel(companyName, displayName, isPaid, extraName);
  if (!lab) return null;

  const mergedPlans = mergePricingPlansWithDefaults(livePlans);
  const starterPlan = findStarterPlanForLab(lab, mergedPlans);
  if (!starterPlan) return null;

  const deMax = extractMaxPriceNumber(starterPlan.deMonthly);
  const usMax = extractMaxPriceNumber(starterPlan.usMonthly);
  const deRange = deMax !== null ? `0-${deMax}€` : '';
  const usRange = usMax !== null ? `$0-${usMax}` : '';
  if (!deRange && !usRange) return null;

  return {
    lab,
    planName: starterPlan.planName,
    deRange,
    usRange,
    sourceUrl: starterPlan.sourceUrl,
  };
}
