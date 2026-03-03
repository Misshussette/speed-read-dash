/**
 * Intelligent lap filtering — non-destructive, median-based statistical exclusion.
 * Never modifies raw data. Works with overlay overrides.
 */
import type { LapRecord } from '@/types/telemetry';

// ── Types ────────────────────────────────────────────────────

export type ExclusionReason =
  | 'statistical_outlier'
  | 'pit_stop'
  | 'incident'
  | 'mechanical'
  | 'track_call'
  | 'custom_note';

export interface LapOverride {
  lap_id: string;
  is_excluded: boolean;
  exclusion_reason: ExclusionReason;
  custom_note?: string | null;
}

export interface FilterConfig {
  upper_coefficient: number; // default 1.8
  lower_coefficient: number; // default 0.5
  min_lap_time_s: number | null;
  max_lap_time_s: number | null;
}

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  upper_coefficient: 1.8,
  lower_coefficient: 0.5,
  min_lap_time_s: null,
  max_lap_time_s: null,
};

export interface LapWithExclusion extends LapRecord {
  /** Whether this lap is excluded from cleaned analysis */
  _excluded: boolean;
  /** Reason for exclusion, if any */
  _exclusion_reason: ExclusionReason | null;
  /** Whether this exclusion was set manually (true) or auto (false) */
  _manual_override: boolean;
}

// ── Median calculation ───────────────────────────────────────

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Core filtering engine ────────────────────────────────────

/**
 * Apply intelligent filtering to a lap dataset.
 * 
 * Strategy (single-pass, no recursion):
 * 1. Separate manually overridden laps from the rest
 * 2. From non-overridden laps, compute median on valid lap times
 * 3. Flag statistical outliers based on config coefficients
 * 4. Merge manual overrides (always take precedence)
 * 
 * This avoids infinite recalculation loops by computing median
 * only from non-manually-excluded laps in a single pass.
 */
export function applyIntelligentFilter(
  laps: LapRecord[],
  manualOverrides: Map<string, LapOverride>,
  config: FilterConfig = DEFAULT_FILTER_CONFIG,
): LapWithExclusion[] {
  // Build lookup for laps with manual overrides
  const manuallyExcludedIds = new Set<string>();
  const manuallyIncludedIds = new Set<string>();
  
  for (const [lapId, override] of manualOverrides) {
    if (override.is_excluded) {
      manuallyExcludedIds.add(lapId);
    } else {
      manuallyIncludedIds.add(lapId);
    }
  }

  // Collect valid lap times for median (exclude manually excluded laps and invalid laps)
  const timesForMedian: number[] = [];
  for (const lap of laps) {
    const lapId = (lap as any).id || `${lap.session_id}_${lap.lap_number}_${lap.driver}`;
    if (manuallyExcludedIds.has(lapId)) continue;
    if (lap.lap_status !== 'valid') continue;
    if (lap.lap_time_s <= 0) continue;
    timesForMedian.push(lap.lap_time_s);
  }

  const median = computeMedian(timesForMedian);

  // Compute thresholds
  const upperThreshold = config.max_lap_time_s ?? (median * config.upper_coefficient);
  const lowerThreshold = config.min_lap_time_s ?? (median * config.lower_coefficient);

  // Apply filtering
  return laps.map((lap): LapWithExclusion => {
    const lapId = (lap as any).id || `${lap.session_id}_${lap.lap_number}_${lap.driver}`;
    const manualOverride = manualOverrides.get(lapId);

    // Manual override always wins
    if (manualOverride) {
      return {
        ...lap,
        _excluded: manualOverride.is_excluded,
        _exclusion_reason: manualOverride.is_excluded ? manualOverride.exclusion_reason : null,
        _manual_override: true,
      };
    }

    // Auto-detect: invalid laps are excluded
    if (lap.lap_status !== 'valid') {
      return {
        ...lap,
        _excluded: true,
        _exclusion_reason: 'statistical_outlier',
        _manual_override: false,
      };
    }

    // Auto-detect: statistical outlier
    if (lap.lap_time_s > 0 && median > 0) {
      if (lap.lap_time_s > upperThreshold || lap.lap_time_s < lowerThreshold) {
        return {
          ...lap,
          _excluded: true,
          _exclusion_reason: 'statistical_outlier',
          _manual_override: false,
        };
      }
    }

    return {
      ...lap,
      _excluded: false,
      _exclusion_reason: null,
      _manual_override: false,
    };
  });
}

// ── Helpers ──────────────────────────────────────────────────

/** Count excluded laps */
export function countExcluded(laps: LapWithExclusion[]): number {
  return laps.filter(l => l._excluded).length;
}

/** Get only clean (non-excluded) laps, cast back to LapRecord for downstream compatibility */
export function getCleanLaps(laps: LapWithExclusion[]): LapRecord[] {
  return laps.filter(l => !l._excluded);
}

/** Get exclusion summary */
export function getExclusionSummary(laps: LapWithExclusion[]): Record<ExclusionReason, number> {
  const summary: Record<ExclusionReason, number> = {
    statistical_outlier: 0,
    pit_stop: 0,
    incident: 0,
    mechanical: 0,
    track_call: 0,
    custom_note: 0,
  };
  for (const lap of laps) {
    if (lap._excluded && lap._exclusion_reason) {
      summary[lap._exclusion_reason]++;
    }
  }
  return summary;
}

/** Compute median lap time from valid, non-excluded laps */
export function getSessionMedian(laps: LapWithExclusion[]): number {
  const times = laps
    .filter(l => !l._excluded && l.lap_time_s > 0)
    .map(l => l.lap_time_s);
  return computeMedian(times);
}
