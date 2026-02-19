/**
 * Track Benchmark computation engine.
 * Computes reference metrics from ALL session data (unfiltered).
 * These are session-level constants — computed once and cached.
 */
import type { LapRecord } from '@/types/telemetry';

export interface TrackBenchmark {
  trackBestLap: number | null;
  bestS1: number | null;
  bestS2: number | null;
  bestS3: number | null;
  theoreticalBest: number | null;
  hasSectorData: boolean;
}

export interface UserGapMetrics {
  userBestLap: number | null;
  userAvgLap: number | null;
  gapToTrack: number | null;
  gapToTheoretical: number | null;
  performanceIndex: number | null; // trackBestLap / userAvgLap as %
  weakestSector: string | null;    // sector with largest gap
}

/**
 * Compute track benchmark from ALL session data (never filtered).
 * Only valid laps are considered.
 */
export function computeTrackBenchmark(data: LapRecord[]): TrackBenchmark {
  const validLaps = data.filter(r => r.lap_status === 'valid' && r.pit_type === '');

  if (validLaps.length === 0) {
    return { trackBestLap: null, bestS1: null, bestS2: null, bestS3: null, theoreticalBest: null, hasSectorData: false };
  }

  const trackBestLap = Math.min(...validLaps.map(r => r.lap_time_s));

  const s1Values = validLaps.filter(r => r.S1_s !== null).map(r => r.S1_s!);
  const s2Values = validLaps.filter(r => r.S2_s !== null).map(r => r.S2_s!);
  const s3Values = validLaps.filter(r => r.S3_s !== null).map(r => r.S3_s!);

  const hasSectorData = s1Values.length > 0 && s2Values.length > 0 && s3Values.length > 0;

  const bestS1 = s1Values.length > 0 ? Math.min(...s1Values) : null;
  const bestS2 = s2Values.length > 0 ? Math.min(...s2Values) : null;
  const bestS3 = s3Values.length > 0 ? Math.min(...s3Values) : null;

  const theoreticalBest = hasSectorData ? bestS1! + bestS2! + bestS3! : null;

  return { trackBestLap, bestS1, bestS2, bestS3, theoreticalBest, hasSectorData };
}

/**
 * Compute user gap metrics from scoped/filtered data against the track benchmark.
 */
export function computeUserGapMetrics(
  userData: LapRecord[],
  benchmark: TrackBenchmark
): UserGapMetrics {
  const validLaps = userData.filter(r => r.lap_status === 'valid' && r.pit_type === '');

  if (validLaps.length === 0 || benchmark.trackBestLap === null) {
    return { userBestLap: null, userAvgLap: null, gapToTrack: null, gapToTheoretical: null, performanceIndex: null, weakestSector: null };
  }

  const times = validLaps.map(r => r.lap_time_s);
  const userBestLap = Math.min(...times);
  const userAvgLap = times.reduce((a, b) => a + b, 0) / times.length;

  const gapToTrack = userBestLap - benchmark.trackBestLap;
  const gapToTheoretical = benchmark.theoreticalBest !== null
    ? userAvgLap - benchmark.theoreticalBest
    : null;
  const performanceIndex = (benchmark.trackBestLap / userAvgLap) * 100;

  // Find weakest sector
  let weakestSector: string | null = null;
  if (benchmark.hasSectorData) {
    const userS1 = validLaps.filter(r => r.S1_s !== null).map(r => r.S1_s!);
    const userS2 = validLaps.filter(r => r.S2_s !== null).map(r => r.S2_s!);
    const userS3 = validLaps.filter(r => r.S3_s !== null).map(r => r.S3_s!);

    const gaps: { sector: string; gap: number }[] = [];
    if (userS1.length > 0 && benchmark.bestS1 !== null) {
      const avgS1 = userS1.reduce((a, b) => a + b, 0) / userS1.length;
      gaps.push({ sector: 'S1', gap: avgS1 - benchmark.bestS1 });
    }
    if (userS2.length > 0 && benchmark.bestS2 !== null) {
      const avgS2 = userS2.reduce((a, b) => a + b, 0) / userS2.length;
      gaps.push({ sector: 'S2', gap: avgS2 - benchmark.bestS2 });
    }
    if (userS3.length > 0 && benchmark.bestS3 !== null) {
      const avgS3 = userS3.reduce((a, b) => a + b, 0) / userS3.length;
      gaps.push({ sector: 'S3', gap: avgS3 - benchmark.bestS3 });
    }

    if (gaps.length > 0) {
      gaps.sort((a, b) => b.gap - a.gap);
      weakestSector = gaps[0].sector;
    }
  }

  return { userBestLap, userAvgLap, gapToTrack, gapToTheoretical, performanceIndex, weakestSector };
}

/**
 * Interpret performance index into guided labels.
 * Uses statistical distribution ranges, not fixed values.
 */
export function interpretPerformanceIndex(pi: number | null): { key: string; status: 'ok' | 'warning' | 'critical' } {
  if (pi === null) return { key: 'bench_interp_no_data', status: 'ok' };
  if (pi >= 98) return { key: 'bench_interp_excellent', status: 'ok' };
  if (pi >= 95) return { key: 'bench_interp_good', status: 'ok' };
  if (pi >= 90) return { key: 'bench_interp_moderate', status: 'warning' };
  if (pi >= 85) return { key: 'bench_interp_developing', status: 'warning' };
  return { key: 'bench_interp_significant_gap', status: 'critical' };
}

export function interpretWeakestSector(sector: string | null, gap: number | null): string {
  if (!sector || gap === null) return 'bench_interp_no_sector';
  return 'bench_interp_weak_sector';
}
