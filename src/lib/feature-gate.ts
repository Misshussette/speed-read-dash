// Phase 1: all features open. Phase 2+ will check user plan.
export type Plan = 'free' | 'pro' | 'team';
export type Feature = 'sector_chart' | 'export_csv' | 'export_png' | 'pit_analysis' | 'driver_comparison';

const FEATURE_MAP: Record<Feature, Plan[]> = {
  sector_chart: ['free', 'pro', 'team'],
  export_csv: ['free', 'pro', 'team'],
  export_png: ['free', 'pro', 'team'],
  pit_analysis: ['free', 'pro', 'team'],
  driver_comparison: ['free', 'pro', 'team'],
};

export function isFeatureEnabled(_feature: Feature, _plan: Plan = 'free'): boolean {
  // Phase 1: everything open
  return true;
}
