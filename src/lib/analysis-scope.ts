/**
 * Analysis scope engine — virtual filtering layer.
 * Produces a working dataset from canonical laps without duplicating data.
 * Supports dual-context metrics (scoped vs global reference).
 */
import type { LapRecord, AnalysisScope, KPIData } from '@/types/telemetry';
import { computeKPIs } from '@/lib/metrics';

export const DEFAULT_SCOPE: AnalysisScope = {
  entity_ids: [],
  drivers: [],
  track_positions: [],
  enabled: false,
};

/** Apply analysis scope to produce the working dataset (virtual filter) */
export function applyScopeFilter(data: LapRecord[], scope: AnalysisScope): LapRecord[] {
  if (!scope.enabled) return data;

  return data.filter(r => {
    if (scope.drivers.length > 0 && !scope.drivers.includes(r.driver)) return false;
    if (scope.entity_ids.length > 0) {
      const matchCar = scope.entity_ids.includes(r.car_model);
      const matchTeam = r.team_number ? scope.entity_ids.includes(r.team_number) : false;
      if (!matchCar && !matchTeam) return false;
    }
    if (scope.track_positions.length > 0 && r.lane !== null) {
      if (!scope.track_positions.includes(r.lane)) return false;
    }
    return true;
  });
}

/** Extract available scope options from canonical data */
export function getScopeOptions(data: LapRecord[]) {
  const entities = new Set<string>();
  const drivers = new Set<string>();
  const lanes = new Set<number>();

  for (const r of data) {
    if (r.car_model) entities.add(r.car_model);
    if (r.team_number) entities.add(r.team_number);
    if (r.driver) drivers.add(r.driver);
    if (r.lane !== null) lanes.add(r.lane);
  }

  return {
    entities: [...entities].sort(),
    drivers: [...drivers].sort(),
    lanes: [...lanes].sort((a, b) => a - b),
  };
}

export interface DualContextKPIs {
  scoped: KPIData;
  global: KPIData;
  relativePace: number | null;     // scoped avg - global avg
  relativeConsistency: number | null; // scoped std - global std
  lapCountRatio: string;           // "scoped / global"
}

/** Compute dual-context KPIs: scoped dataset vs full race reference */
export function computeDualContextKPIs(
  scopedData: LapRecord[],
  globalData: LapRecord[],
  includePitLaps: boolean
): DualContextKPIs {
  const scoped = computeKPIs(scopedData, includePitLaps);
  const global = computeKPIs(globalData, includePitLaps);

  return {
    scoped,
    global,
    relativePace:
      scoped.averagePace !== null && global.averagePace !== null
        ? scoped.averagePace - global.averagePace
        : null,
    relativeConsistency:
      scoped.consistency !== null && global.consistency !== null
        ? scoped.consistency - global.consistency
        : null,
    lapCountRatio: `${scoped.totalLaps} / ${global.totalLaps}`,
  };
}
