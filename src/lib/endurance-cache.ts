/**
 * Pre-aggregated caches and time-window metrics for large endurance datasets.
 * Designed for >100k laps without full recomputation on view change.
 */
import type { LapRecord, LapStatus } from '@/types/telemetry';

// ── Per-stint / per-driver cache ──────────────────────────────

export interface StintCache {
  stint: number;
  driver: string;
  lapCount: number;
  validLapCount: number;
  bestLap: number | null;
  averagePace: number | null;
  totalTime: number;
  startElapsed: number | null;
  endElapsed: number | null;
}

export interface DriverCache {
  driver: string;
  lapCount: number;
  validLapCount: number;
  bestLap: number | null;
  averagePace: number | null;
  stints: number[];
}

export interface SessionCache {
  stints: Map<string, StintCache>; // key: `${driver}__${stint}`
  drivers: Map<string, DriverCache>;
  totalLaps: number;
  totalValidLaps: number;
  globalBest: number | null;
}

function stintCacheKey(driver: string, stint: number): string {
  return `${driver}__${stint}`;
}

/** Build aggregated caches from validated laps (single pass) */
export function buildSessionCache(laps: LapRecord[]): SessionCache {
  const stints = new Map<string, StintCache>();
  const drivers = new Map<string, DriverCache>();
  let totalLaps = 0;
  let totalValidLaps = 0;
  let globalBest: number | null = null;

  for (const lap of laps) {
    totalLaps++;
    const isValid = lap.lap_status === 'valid';
    if (isValid) totalValidLaps++;

    // ── Stint cache ──
    const sk = stintCacheKey(lap.driver, lap.stint);
    let sc = stints.get(sk);
    if (!sc) {
      sc = {
        stint: lap.stint,
        driver: lap.driver,
        lapCount: 0,
        validLapCount: 0,
        bestLap: null,
        averagePace: null,
        totalTime: 0,
        startElapsed: lap.session_elapsed_s,
        endElapsed: lap.session_elapsed_s,
      };
      stints.set(sk, sc);
    }
    sc.lapCount++;
    if (isValid && lap.lap_time_s > 0) {
      sc.validLapCount++;
      sc.totalTime += lap.lap_time_s;
      if (sc.bestLap === null || lap.lap_time_s < sc.bestLap) sc.bestLap = lap.lap_time_s;
      sc.averagePace = sc.totalTime / sc.validLapCount;
    }
    if (lap.session_elapsed_s !== null) {
      if (sc.startElapsed === null || lap.session_elapsed_s < sc.startElapsed) sc.startElapsed = lap.session_elapsed_s;
      if (sc.endElapsed === null || lap.session_elapsed_s > sc.endElapsed) sc.endElapsed = lap.session_elapsed_s;
    }

    // ── Driver cache ──
    let dc = drivers.get(lap.driver);
    if (!dc) {
      dc = {
        driver: lap.driver,
        lapCount: 0,
        validLapCount: 0,
        bestLap: null,
        averagePace: null,
        stints: [],
      };
      drivers.set(lap.driver, dc);
    }
    dc.lapCount++;
    if (isValid && lap.lap_time_s > 0) {
      dc.validLapCount++;
      if (dc.bestLap === null || lap.lap_time_s < dc.bestLap) dc.bestLap = lap.lap_time_s;
    }
    if (!dc.stints.includes(lap.stint)) dc.stints.push(lap.stint);

    // Global best
    if (isValid && lap.lap_time_s > 0) {
      if (globalBest === null || lap.lap_time_s < globalBest) globalBest = lap.lap_time_s;
    }
  }

  // Finalize driver averages
  for (const dc of drivers.values()) {
    if (dc.validLapCount > 0) {
      let sum = 0;
      for (const lap of laps) {
        if (lap.driver === dc.driver && lap.lap_status === 'valid' && lap.lap_time_s > 0) {
          sum += lap.lap_time_s;
        }
      }
      dc.averagePace = sum / dc.validLapCount;
    }
  }

  return { stints, drivers, totalLaps, totalValidLaps, globalBest };
}

// ── Time-window rolling metrics ──────────────────────────────

export interface RollingPacePoint {
  elapsed: number;
  pace: number;
  lapCount: number;
}

/**
 * Compute rolling pace using a time-based window (e.g., 300s = 5 minutes).
 * Only uses valid laps. Returns sampled points for charting.
 */
export function computeRollingPace(
  laps: LapRecord[],
  windowSeconds: number = 300,
  maxPoints: number = 500
): RollingPacePoint[] {
  const valid = laps.filter(l => l.lap_status === 'valid' && l.lap_time_s > 0 && l.session_elapsed_s !== null)
    .sort((a, b) => a._sort_key - b._sort_key);

  if (valid.length === 0) return [];

  const points: RollingPacePoint[] = [];
  let windowStart = 0;

  for (let i = 0; i < valid.length; i++) {
    const currentElapsed = valid[i].session_elapsed_s!;

    // Advance window start
    while (windowStart < i && (currentElapsed - valid[windowStart].session_elapsed_s!) > windowSeconds) {
      windowStart++;
    }

    // Compute average in window
    let sum = 0;
    let count = 0;
    for (let j = windowStart; j <= i; j++) {
      sum += valid[j].lap_time_s;
      count++;
    }

    if (count > 0) {
      points.push({
        elapsed: currentElapsed,
        pace: sum / count,
        lapCount: count,
      });
    }
  }

  // Downsample if too many points
  if (points.length > maxPoints) {
    const step = points.length / maxPoints;
    const sampled: RollingPacePoint[] = [];
    for (let i = 0; i < maxPoints; i++) {
      sampled.push(points[Math.floor(i * step)]);
    }
    sampled.push(points[points.length - 1]);
    return sampled;
  }

  return points;
}

/** Filter laps to only valid ones (for KPIs/charts that should exclude suspect/invalid) */
export function validLapsOnly(laps: LapRecord[]): LapRecord[] {
  return laps.filter(l => l.lap_status === 'valid');
}
