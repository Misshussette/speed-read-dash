/**
 * Setup Performance Engine.
 * Computes normalized performance metrics for setups using track benchmark data.
 * All comparisons use benchmark-normalized values, never raw lap times.
 */
import type { LapRecord } from '@/types/telemetry';
import type { TrackBenchmark } from '@/lib/track-benchmark';

export interface SetupPerformanceMetrics {
  setupId: string;
  lapCount: number;
  /** AVG(lap_time / track_best_lap) — 1.0 = track pace */
  performanceIndex: number | null;
  /** STDDEV(normalized_lap) — lower = more consistent */
  consistencyScore: number | null;
  /** Sector deltas vs track best (positive = slower than best) */
  sectorDeltas: {
    s1: number | null;
    s2: number | null;
    s3: number | null;
  };
  /** Which sector has the biggest loss */
  weakestSector: string | null;
  /** Which sector has the smallest loss (or gain) */
  strongestSector: string | null;
}

/**
 * Normalize a single lap time against the track best.
 * Returns ratio where 1.0 = matching track best.
 */
export function normalizeLap(lapTime: number, trackBest: number): number {
  return lapTime / trackBest;
}

/**
 * Compute setup performance metrics from laps linked to a specific setup,
 * normalized against the track benchmark.
 */
export function computeSetupPerformance(
  setupId: string,
  laps: LapRecord[],
  benchmark: TrackBenchmark
): SetupPerformanceMetrics {
  const validLaps = laps.filter(r => r.lap_status === 'valid' && r.pit_type === '');

  if (validLaps.length === 0 || benchmark.trackBestLap === null) {
    return {
      setupId,
      lapCount: 0,
      performanceIndex: null,
      consistencyScore: null,
      sectorDeltas: { s1: null, s2: null, s3: null },
      weakestSector: null,
      strongestSector: null,
    };
  }

  // Normalized lap times
  const normalized = validLaps.map(r => normalizeLap(r.lap_time_s, benchmark.trackBestLap!));

  // Performance index = average of normalized laps
  const performanceIndex = normalized.reduce((a, b) => a + b, 0) / normalized.length;

  // Consistency = standard deviation of normalized laps
  const mean = performanceIndex;
  const variance = normalized.reduce((sum, v) => sum + (v - mean) ** 2, 0) / normalized.length;
  const consistencyScore = Math.sqrt(variance);

  // Sector deltas
  const sectorDeltas = { s1: null as number | null, s2: null as number | null, s3: null as number | null };
  const sectorGaps: { sector: string; delta: number }[] = [];

  if (benchmark.hasSectorData) {
    const s1Vals = validLaps.filter(r => r.S1_s !== null).map(r => r.S1_s!);
    const s2Vals = validLaps.filter(r => r.S2_s !== null).map(r => r.S2_s!);
    const s3Vals = validLaps.filter(r => r.S3_s !== null).map(r => r.S3_s!);

    if (s1Vals.length > 0 && benchmark.bestS1 !== null) {
      const avg = s1Vals.reduce((a, b) => a + b, 0) / s1Vals.length;
      sectorDeltas.s1 = avg - benchmark.bestS1;
      sectorGaps.push({ sector: 'S1', delta: sectorDeltas.s1 });
    }
    if (s2Vals.length > 0 && benchmark.bestS2 !== null) {
      const avg = s2Vals.reduce((a, b) => a + b, 0) / s2Vals.length;
      sectorDeltas.s2 = avg - benchmark.bestS2;
      sectorGaps.push({ sector: 'S2', delta: sectorDeltas.s2 });
    }
    if (s3Vals.length > 0 && benchmark.bestS3 !== null) {
      const avg = s3Vals.reduce((a, b) => a + b, 0) / s3Vals.length;
      sectorDeltas.s3 = avg - benchmark.bestS3;
      sectorGaps.push({ sector: 'S3', delta: sectorDeltas.s3 });
    }
  }

  let weakestSector: string | null = null;
  let strongestSector: string | null = null;
  if (sectorGaps.length > 0) {
    sectorGaps.sort((a, b) => b.delta - a.delta);
    weakestSector = sectorGaps[0].sector;
    strongestSector = sectorGaps[sectorGaps.length - 1].sector;
  }

  return {
    setupId,
    lapCount: validLaps.length,
    performanceIndex,
    consistencyScore,
    sectorDeltas,
    weakestSector,
    strongestSector,
  };
}

/**
 * Interpret performance index into guided label keys.
 */
export function interpretSetupPI(pi: number | null): { key: string; status: 'ok' | 'warning' | 'critical' } {
  if (pi === null) return { key: 'setup_perf_no_data', status: 'ok' };
  if (pi <= 1.01) return { key: 'setup_perf_excellent', status: 'ok' };
  if (pi <= 1.03) return { key: 'setup_perf_good', status: 'ok' };
  if (pi <= 1.06) return { key: 'setup_perf_moderate', status: 'warning' };
  if (pi <= 1.10) return { key: 'setup_perf_developing', status: 'warning' };
  return { key: 'setup_perf_significant_gap', status: 'critical' };
}

/**
 * Interpret consistency score into guided label keys.
 */
export function interpretConsistency(cs: number | null): { key: string; status: 'ok' | 'warning' | 'critical' } {
  if (cs === null) return { key: 'setup_cons_no_data', status: 'ok' };
  if (cs <= 0.01) return { key: 'setup_cons_excellent', status: 'ok' };
  if (cs <= 0.025) return { key: 'setup_cons_good', status: 'ok' };
  if (cs <= 0.05) return { key: 'setup_cons_moderate', status: 'warning' };
  return { key: 'setup_cons_poor', status: 'critical' };
}
