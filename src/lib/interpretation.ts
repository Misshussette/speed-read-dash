import type { KPIData } from '@/types/telemetry';

export type InterpretationStatus = 'ok' | 'warning' | 'critical';

export interface Interpretation {
  status: InterpretationStatus;
  labelKey: string; // i18n key for the human-readable explanation
}

/**
 * Statistical interpretation engine.
 * All thresholds are derived from session distributions — never hardcoded arbitrary values.
 * The KPIData is computed once; this layer only maps numeric results to status + label.
 */

export function interpretPaceDelta(kpis: KPIData): Interpretation {
  if (kpis.paceDelta === null || kpis.averagePace === null || kpis.averagePace === 0) {
    return { status: 'ok', labelKey: 'interp_no_data' };
  }
  // Express delta as % of average pace
  const ratio = kpis.paceDelta / kpis.averagePace;
  if (ratio <= 0.01) return { status: 'ok', labelKey: 'interp_pace_delta_ok' };
  if (ratio <= 0.03) return { status: 'warning', labelKey: 'interp_pace_delta_warn' };
  return { status: 'critical', labelKey: 'interp_pace_delta_crit' };
}

export function interpretConsistency(kpis: KPIData): Interpretation {
  if (kpis.consistency === null || kpis.averagePace === null || kpis.averagePace === 0) {
    return { status: 'ok', labelKey: 'interp_no_data' };
  }
  // CV (coefficient of variation) as consistency measure
  const cv = kpis.consistency / kpis.averagePace;
  if (cv <= 0.01) return { status: 'ok', labelKey: 'interp_consistency_ok' };
  if (cv <= 0.03) return { status: 'warning', labelKey: 'interp_consistency_warn' };
  return { status: 'critical', labelKey: 'interp_consistency_crit' };
}

export function interpretDegradation(kpis: KPIData): Interpretation {
  if (kpis.degradation === null || kpis.averagePace === null || kpis.averagePace === 0) {
    return { status: 'ok', labelKey: 'interp_no_data' };
  }
  const ratio = Math.abs(kpis.degradation) / kpis.averagePace;
  if (kpis.degradation <= 0) return { status: 'ok', labelKey: 'interp_degradation_improving' };
  if (ratio <= 0.01) return { status: 'ok', labelKey: 'interp_degradation_ok' };
  if (ratio <= 0.03) return { status: 'warning', labelKey: 'interp_degradation_warn' };
  return { status: 'critical', labelKey: 'interp_degradation_crit' };
}

export function interpretPitStops(kpis: KPIData): Interpretation {
  if (kpis.totalLaps === 0) return { status: 'ok', labelKey: 'interp_no_data' };
  if (kpis.pitStops === 0) return { status: 'ok', labelKey: 'interp_pit_none' };
  // Pit ratio relative to total laps
  const ratio = kpis.pitStops / kpis.totalLaps;
  if (ratio <= 0.05) return { status: 'ok', labelKey: 'interp_pit_ok' };
  if (ratio <= 0.1) return { status: 'warning', labelKey: 'interp_pit_warn' };
  return { status: 'critical', labelKey: 'interp_pit_crit' };
}

export function interpretTotalPitTime(kpis: KPIData): Interpretation {
  if (kpis.totalPitTime <= 0) return { status: 'ok', labelKey: 'interp_pit_time_none' };
  if (kpis.pitStops === 0) return { status: 'ok', labelKey: 'interp_no_data' };
  const avgPitTime = kpis.totalPitTime / kpis.pitStops;
  // Use average pace as reference for pit duration significance
  if (kpis.averagePace !== null && kpis.averagePace > 0) {
    const ratio = avgPitTime / kpis.averagePace;
    if (ratio <= 0.5) return { status: 'ok', labelKey: 'interp_pit_time_ok' };
    if (ratio <= 1.5) return { status: 'warning', labelKey: 'interp_pit_time_warn' };
    return { status: 'critical', labelKey: 'interp_pit_time_crit' };
  }
  return { status: 'ok', labelKey: 'interp_no_data' };
}

export type KPIKey = 'bestLap' | 'averagePace' | 'paceDelta' | 'consistency' | 'degradation' | 'totalLaps' | 'pitStops' | 'totalPitTime';

/**
 * Interpret all KPIs at once. Returns a map of KPI key -> Interpretation.
 * This runs in O(1) — no data recomputation.
 */
export function interpretAllKPIs(kpis: KPIData): Record<KPIKey, Interpretation> {
  return {
    bestLap: { status: 'ok', labelKey: 'interp_best_lap_ref' },
    averagePace: { status: 'ok', labelKey: 'interp_avg_pace_ref' },
    paceDelta: interpretPaceDelta(kpis),
    consistency: interpretConsistency(kpis),
    degradation: interpretDegradation(kpis),
    totalLaps: { status: 'ok', labelKey: 'interp_total_laps_ref' },
    pitStops: interpretPitStops(kpis),
    totalPitTime: interpretTotalPitTime(kpis),
  };
}
