/**
 * Data validation layer for endurance race support.
 * Flags anomalies without discarding rows.
 * Raw data remains immutable — validation is a derived layer.
 */
import type { LapRecord, LapStatus } from '@/types/telemetry';

interface ValidationResult {
  status: LapStatus;
  flags: string[];
}

/** Statistical bounds: median ± k * MAD (robust to outliers) */
function computeBounds(times: number[], k = 4): { lower: number; upper: number } | null {
  if (times.length < 5) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const deviations = sorted.map(t => Math.abs(t - median));
  deviations.sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)] || 1;
  return { lower: median - k * mad, upper: median + k * mad };
}

/** Validate a single lap record in context */
function validateLap(
  lap: LapRecord,
  index: number,
  bounds: { lower: number; upper: number } | null,
  prevElapsed: number | null
): ValidationResult {
  const flags: string[] = [];

  // Zero or negative lap time
  if (lap.lap_time_s <= 0) {
    flags.push('non_positive_time');
  }

  // Statistical outlier
  if (bounds && lap.lap_time_s > 0) {
    if (lap.lap_time_s < bounds.lower || lap.lap_time_s > bounds.upper) {
      flags.push('statistical_outlier');
    }
  }

  // Negative time delta (session_elapsed going backwards)
  if (prevElapsed !== null && lap.session_elapsed_s !== null) {
    if (lap.session_elapsed_s < prevElapsed) {
      flags.push('negative_time_delta');
    }
  }

  // Determine status
  let status: LapStatus = 'valid';
  if (flags.includes('non_positive_time')) {
    status = 'invalid';
  } else if (flags.length > 0) {
    status = 'suspect';
  }

  return { status, flags };
}

/**
 * Run validation on an array of laps. Mutates lap_status and validation_flags
 * on the records (which should be freshly parsed copies, not originals).
 */
export function validateLaps(laps: LapRecord[]): LapRecord[] {
  // Compute statistical bounds from positive times only
  const positiveTimes = laps.filter(l => l.lap_time_s > 0).map(l => l.lap_time_s);
  const bounds = computeBounds(positiveTimes);

  // Detect duplicate timestamps
  const tsCount = new Map<string, number>();
  for (const lap of laps) {
    if (lap.timestamp) {
      tsCount.set(lap.timestamp, (tsCount.get(lap.timestamp) || 0) + 1);
    }
  }

  let prevElapsed: number | null = null;

  for (let i = 0; i < laps.length; i++) {
    const lap = laps[i];
    const { status, flags } = validateLap(lap, i, bounds, prevElapsed);

    // Check duplicate timestamp
    if (lap.timestamp && (tsCount.get(lap.timestamp) || 0) > 1) {
      flags.push('duplicate_timestamp');
      if (status === 'valid') {
        lap.lap_status = 'suspect';
      }
    }

    lap.lap_status = flags.includes('non_positive_time') ? 'invalid' : (flags.length > 0 ? 'suspect' : 'valid');
    lap.validation_flags = flags;

    if (lap.session_elapsed_s !== null) {
      prevElapsed = lap.session_elapsed_s;
    }
  }

  return laps;
}

/**
 * Sort laps by the most reliable time reference available.
 * Priority: session_elapsed_s > timestamp > record order.
 * Assigns _sort_key to each lap.
 */
export function assignSortKeys(laps: LapRecord[]): LapRecord[] {
  // Assign sort key
  for (let i = 0; i < laps.length; i++) {
    const lap = laps[i];
    if (lap.session_elapsed_s !== null && lap.session_elapsed_s >= 0) {
      lap._sort_key = lap.session_elapsed_s;
    } else if (lap.timestamp) {
      const ts = new Date(lap.timestamp).getTime();
      lap._sort_key = isNaN(ts) ? i : ts;
    } else {
      lap._sort_key = i;
    }
  }

  // Sort by _sort_key ascending
  laps.sort((a, b) => a._sort_key - b._sort_key);
  return laps;
}
