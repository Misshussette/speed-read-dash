/**
 * Practice Mode Analysis Engine
 * - Rolling window statistics
 * - Best performance & stability windows
 * - Challenge projection
 * - Pollution detection
 * - Human-readable insights
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ChallengeType = 'laps_in_time' | 'target_pace' | 'lap_count';

export interface ChallengeConfig {
  type: ChallengeType;
  /** For laps_in_time: target number of laps */
  targetLaps?: number;
  /** For laps_in_time / target_pace: duration in seconds */
  durationSeconds?: number;
  /** For target_pace: target average in seconds */
  targetPace?: number;
  /** For lap_count: just a goal count */
  lapCountGoal?: number;
}

export type ChallengeStatus = 'on_pace' | 'slightly_behind' | 'far_behind';

export interface ChallengeProjection {
  requiredAverage: number | null;
  currentAverage: number | null;
  projectedLaps: number | null;
  status: ChallengeStatus;
  elapsedSeconds: number;
  remainingSeconds: number;
}

export interface WindowStats {
  startIndex: number;
  endIndex: number;
  average: number;
  stdDev: number;
  laps: number[];
}

export interface RegularityReport {
  rolling8Average: number | null;
  rolling8StdDev: number | null;
  bestPerformanceWindow: WindowStats | null;
  bestStabilityWindow: WindowStats | null;
  firstQuarterStdDev: number | null;
  pollutedLapIndices: number[];
  totalCleanLaps: number;
}

export interface PracticeInsight {
  key: string;
  params?: Record<string, string>;
}

// ─── Pollution Detection ────────────────────────────────────────────

const POLLUTION_MULTIPLIER = 1.6; // laps > median * 1.6 = polluted

export function detectPollutedLaps(laps: number[]): number[] {
  if (laps.length < 4) return [];
  const sorted = [...laps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = median * POLLUTION_MULTIPLIER;
  return laps.reduce<number[]>((acc, l, i) => {
    if (l > threshold) acc.push(i);
    return acc;
  }, []);
}

export function cleanLaps(laps: number[], polluted: number[]): number[] {
  const set = new Set(polluted);
  return laps.filter((_, i) => !set.has(i));
}

// ─── Statistics ─────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ─── Rolling Window ─────────────────────────────────────────────────

const WINDOW_SIZE = 8;

export function rollingWindowStats(laps: number[]): { average: number | null; stdDev: number | null } {
  if (laps.length < WINDOW_SIZE) {
    if (laps.length >= 3) return { average: mean(laps.slice(-laps.length)), stdDev: stdDev(laps.slice(-laps.length)) };
    return { average: null, stdDev: null };
  }
  const window = laps.slice(-WINDOW_SIZE);
  return { average: mean(window), stdDev: stdDev(window) };
}

// ─── Best Windows ───────────────────────────────────────────────────

function findBestWindow(
  laps: number[],
  windowSize: number,
  compareFn: (a: WindowStats, b: WindowStats) => boolean,
): WindowStats | null {
  if (laps.length < windowSize) return null;
  let best: WindowStats | null = null;

  for (let i = 0; i <= laps.length - windowSize; i++) {
    const window = laps.slice(i, i + windowSize);
    const avg = mean(window);
    const sd = stdDev(window);
    const candidate: WindowStats = {
      startIndex: i,
      endIndex: i + windowSize - 1,
      average: avg,
      stdDev: sd,
      laps: window,
    };
    if (!best || compareFn(candidate, best)) {
      best = candidate;
    }
  }
  return best;
}

export function findBestPerformanceWindow(laps: number[], windowSize = WINDOW_SIZE): WindowStats | null {
  return findBestWindow(laps, windowSize, (a, b) => a.average < b.average);
}

export function findBestStabilityWindow(laps: number[], windowSize = WINDOW_SIZE): WindowStats | null {
  return findBestWindow(laps, windowSize, (a, b) => a.stdDev < b.stdDev);
}

// ─── Full Regularity Report ─────────────────────────────────────────

export function computeRegularity(allLaps: number[]): RegularityReport {
  const polluted = detectPollutedLaps(allLaps);
  const clean = cleanLaps(allLaps, polluted);

  const rolling = rollingWindowStats(clean);
  const bestPerf = findBestPerformanceWindow(clean);
  const bestStab = findBestStabilityWindow(clean);

  // First quarter stability
  const quarterLen = Math.max(4, Math.floor(clean.length / 4));
  const firstQuarter = clean.slice(0, quarterLen);
  const firstQuarterStd = firstQuarter.length >= 3 ? stdDev(firstQuarter) : null;

  return {
    rolling8Average: rolling.average,
    rolling8StdDev: rolling.stdDev,
    bestPerformanceWindow: bestPerf,
    bestStabilityWindow: bestStab,
    firstQuarterStdDev: firstQuarterStd,
    pollutedLapIndices: polluted,
    totalCleanLaps: clean.length,
  };
}

// ─── Challenge Projection ───────────────────────────────────────────

export function computeChallengeProjection(
  config: ChallengeConfig,
  cleanLapTimes: number[],
  elapsedSeconds: number,
): ChallengeProjection {
  const totalDuration = config.durationSeconds ?? 0;
  const remaining = Math.max(0, totalDuration - elapsedSeconds);

  // Current rolling average (last 8 clean laps)
  const recentWindow = cleanLapTimes.slice(-WINDOW_SIZE);
  const currentAvg = recentWindow.length >= 1 ? mean(recentWindow) : null;

  if (config.type === 'laps_in_time') {
    const targetLaps = config.targetLaps ?? 0;
    const requiredAvg = totalDuration > 0 && targetLaps > 0 ? totalDuration / targetLaps : null;
    const projectedLaps = currentAvg && currentAvg > 0
      ? Math.floor(totalDuration / currentAvg)
      : null;

    let status: ChallengeStatus = 'on_pace';
    if (projectedLaps != null && targetLaps > 0) {
      const ratio = projectedLaps / targetLaps;
      if (ratio < 0.92) status = 'far_behind';
      else if (ratio < 0.98) status = 'slightly_behind';
    }

    return { requiredAverage: requiredAvg, currentAverage: currentAvg, projectedLaps, status, elapsedSeconds, remainingSeconds: remaining };
  }

  if (config.type === 'target_pace') {
    const target = config.targetPace ?? 0;
    let status: ChallengeStatus = 'on_pace';
    if (currentAvg != null && target > 0) {
      const gap = currentAvg - target;
      if (gap > 0.3) status = 'far_behind';
      else if (gap > 0.1) status = 'slightly_behind';
    }
    return { requiredAverage: target, currentAverage: currentAvg, projectedLaps: null, status, elapsedSeconds, remainingSeconds: remaining };
  }

  // lap_count
  const goal = config.lapCountGoal ?? 0;
  const currentLaps = cleanLapTimes.length;
  let status: ChallengeStatus = 'on_pace';
  if (totalDuration > 0 && currentAvg) {
    const projected = Math.floor(totalDuration / currentAvg);
    if (projected < goal * 0.92) status = 'far_behind';
    else if (projected < goal * 0.98) status = 'slightly_behind';
  }
  return { requiredAverage: null, currentAverage: currentAvg, projectedLaps: currentLaps, status, elapsedSeconds, remainingSeconds: remaining };
}

// ─── Human Insights ─────────────────────────────────────────────────

export function generatePracticeInsights(report: RegularityReport, totalLaps: number): PracticeInsight[] {
  const insights: PracticeInsight[] = [];

  if (totalLaps < 4) return [{ key: 'practice_insight_warmup' }];

  // First quarter analysis
  if (report.firstQuarterStdDev != null) {
    if (report.firstQuarterStdDev < 0.08) {
      insights.push({ key: 'practice_insight_q1_stable' });
    } else if (report.firstQuarterStdDev > 0.2) {
      insights.push({ key: 'practice_insight_q1_unstable' });
    }
  }

  // Best performance vs best stability
  if (report.bestPerformanceWindow && report.bestStabilityWindow) {
    if (report.bestPerformanceWindow.startIndex === report.bestStabilityWindow.startIndex) {
      insights.push({
        key: 'practice_insight_peak_stable',
        params: {
          start: String(report.bestPerformanceWindow.startIndex + 1),
          end: String(report.bestPerformanceWindow.endIndex + 1),
        },
      });
    } else {
      const perfAvg = report.bestPerformanceWindow.average.toFixed(3);
      const stabStd = report.bestStabilityWindow.stdDev.toFixed(3);
      insights.push({
        key: 'practice_insight_peak_vs_stable',
        params: {
          perfStart: String(report.bestPerformanceWindow.startIndex + 1),
          perfEnd: String(report.bestPerformanceWindow.endIndex + 1),
          perfAvg,
          stabStart: String(report.bestStabilityWindow.startIndex + 1),
          stabEnd: String(report.bestStabilityWindow.endIndex + 1),
          stabStd,
        },
      });
    }
  }

  // Pollution
  if (report.pollutedLapIndices.length > 0) {
    insights.push({
      key: 'practice_insight_pollution',
      params: { count: String(report.pollutedLapIndices.length) },
    });
  }

  // Rolling trend
  if (report.rolling8Average != null && report.rolling8StdDev != null) {
    if (report.rolling8StdDev < 0.06) {
      insights.push({ key: 'practice_insight_current_very_stable' });
    } else if (report.rolling8StdDev > 0.2) {
      insights.push({ key: 'practice_insight_current_inconsistent' });
    }
  }

  if (insights.length === 0) {
    insights.push({ key: 'practice_insight_solid' });
  }

  return insights;
}

// ─── Setup Comparison ───────────────────────────────────────────────

export interface SetupRunData {
  setupId: string;
  setupLabel: string;
  lapTimes: number[];
  sectors?: { s1: number[]; s2: number[]; s3: number[] };
}

export interface SetupDelta {
  setupA: string;
  setupB: string;
  avgDelta: number;       // positive = B faster
  s1Delta: number | null;
  s2Delta: number | null;
  s3Delta: number | null;
  regularityA: number;
  regularityB: number;
  degradationA: number | null;
  degradationB: number | null;
}

export function compareSetupRuns(a: SetupRunData, b: SetupRunData): SetupDelta | null {
  const cleanA = cleanLaps(a.lapTimes, detectPollutedLaps(a.lapTimes));
  const cleanB = cleanLaps(b.lapTimes, detectPollutedLaps(b.lapTimes));

  if (cleanA.length < 4 || cleanB.length < 4) return null;

  const avgA = mean(cleanA);
  const avgB = mean(cleanB);
  const stdA = stdDev(cleanA);
  const stdB = stdDev(cleanB);

  // Sector deltas
  let s1Delta: number | null = null;
  let s2Delta: number | null = null;
  let s3Delta: number | null = null;
  if (a.sectors && b.sectors && a.sectors.s1.length >= 4 && b.sectors.s1.length >= 4) {
    s1Delta = mean(a.sectors.s1) - mean(b.sectors.s1);
    s2Delta = mean(a.sectors.s2) - mean(b.sectors.s2);
    s3Delta = mean(a.sectors.s3) - mean(b.sectors.s3);
  }

  // Degradation (last 10 vs first 10)
  const degradation = (laps: number[]): number | null => {
    if (laps.length < 20) return null;
    const first10 = mean(laps.slice(0, 10));
    const last10 = mean(laps.slice(-10));
    return last10 - first10;
  };

  return {
    setupA: a.setupLabel,
    setupB: b.setupLabel,
    avgDelta: avgA - avgB,
    s1Delta,
    s2Delta,
    s3Delta,
    regularityA: stdA,
    regularityB: stdB,
    degradationA: degradation(cleanA),
    degradationB: degradation(cleanB),
  };
}
