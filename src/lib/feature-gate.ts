// Feature gating system — checks user beta channel
export type Plan = 'free' | 'pro' | 'team';
export type Feature =
  | 'sector_chart'
  | 'export_csv'
  | 'export_png'
  | 'pit_analysis'
  | 'driver_comparison';

// Features restricted to beta channel
const BETA_ONLY_FEATURES: Feature[] = [];

// Features restricted by plan (Phase 2+)
const FEATURE_MAP: Record<Feature, Plan[]> = {
  sector_chart: ['free', 'pro', 'team'],
  export_csv: ['free', 'pro', 'team'],
  export_png: ['free', 'pro', 'team'],
  pit_analysis: ['free', 'pro', 'team'],
  driver_comparison: ['free', 'pro', 'team'],
};

export function isFeatureEnabled(
  feature: Feature,
  _plan: Plan = 'free',
  isBeta: boolean = false,
): boolean {
  // If feature is beta-only, require beta channel
  if (BETA_ONLY_FEATURES.includes(feature) && !isBeta) {
    return false;
  }
  return true;
}
