import { LapRecord, KPIData, DriverStats, StintStats, PitEvent, Filters } from '@/types/telemetry';

export function applyFilters(data: LapRecord[], filters: Filters): LapRecord[] {
  return data.filter(r => {
    if (filters.track && r.track !== filters.track) return false;
    if (filters.session_id && r.session_id !== filters.session_id) return false;
    if (filters.car && r.car_model !== filters.car) return false;
    if (filters.drivers.length > 0 && !filters.drivers.includes(r.driver)) return false;
    if (filters.stints.length > 0 && !filters.stints.includes(r.stint)) return false;
    if (filters.lanes && filters.lanes.length > 0 && r.lane !== null && !filters.lanes.includes(r.lane)) return false;
    return true;
  });
}

/**
 * Return laps suitable for performance calculations.
 * Always excludes invalid/suspect laps.
 * When includePitLaps is false (default), pit-related laps are also excluded.
 */
/** Minimum credible lap time in seconds — anything below is transponder noise */
const MIN_CREDIBLE_LAP_TIME_S = 5;

function cleanLaps(data: LapRecord[], includePitLaps = false): LapRecord[] {
  return data.filter(r => {
    // Always exclude non-valid laps from calculations
    if (r.lap_status && r.lap_status !== 'valid') return false;
    // Exclude absurdly short laps (transponder noise, intermediate passages)
    if (r.lap_time_s < MIN_CREDIBLE_LAP_TIME_S) return false;
    if (!includePitLaps && r.pit_type !== '') return false;
    return true;
  });
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map(v => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

export function computeKPIs(data: LapRecord[], includePitLaps = false): KPIData {
  const clean = cleanLaps(data, includePitLaps);
  const times = clean.map(r => r.lap_time_s);
  const pitLaps = data.filter(r => r.pit_type !== '');

  const bestLap = times.length > 0 ? Math.min(...times) : null;
  const averagePace = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
  const paceDelta = bestLap !== null && averagePace !== null ? averagePace - bestLap : null;

  // Degradation: last 10 clean laps avg vs first 10 clean laps avg
  let degradation: number | null = null;
  if (times.length >= 10) {
    const first10 = times.slice(0, 10);
    const last10 = times.slice(-10);
    const avgFirst = first10.reduce((a, b) => a + b, 0) / first10.length;
    const avgLast = last10.reduce((a, b) => a + b, 0) / last10.length;
    degradation = avgLast - avgFirst;
  }

  return {
    bestLap,
    averagePace,
    consistency: times.length > 1 ? stdDev(times) : null,
    paceDelta,
    degradation,
    totalLaps: data.length,
    pitStops: pitLaps.length,
    totalPitTime: pitLaps.reduce((sum, r) => sum + (r.pit_time_s || 0), 0),
  };
}

export interface InsightsData {
  mostConsistentDriver: string | null;
  mostConsistentStdDev: number | null;
  runnerUpDriver: string | null;
  runnerUpStdDev: number | null;
  highestVarianceSector: string | null;
}

export function computeInsights(data: LapRecord[], includePitLaps = false): InsightsData {
  const drivers = [...new Set(data.map(r => r.driver))];
  const ranked: { driver: string; sd: number }[] = [];
  
  for (const driver of drivers) {
    const laps = cleanLaps(data.filter(r => r.driver === driver), includePitLaps);
    const times = laps.map(r => r.lap_time_s);
    if (times.length >= 3) {
      ranked.push({ driver, sd: stdDev(times) });
    }
  }

  ranked.sort((a, b) => a.sd - b.sd);

  const best = ranked[0] ?? null;
  const second = ranked[1] ?? null;

  // Highest variance sector
  let highestVarianceSector: string | null = null;
  const sectorKeys = ['S1_s', 'S2_s', 'S3_s'] as const;
  let maxVariance = -1;
  const cleanData = cleanLaps(data, includePitLaps);
  for (const key of sectorKeys) {
    const vals = cleanData.filter(r => r[key] !== null).map(r => r[key] as number);
    if (vals.length >= 3) {
      const sd = stdDev(vals);
      if (sd > maxVariance) {
        maxVariance = sd;
        highestVarianceSector = key.replace('_s', '').toUpperCase();
      }
    }
  }

  return {
    mostConsistentDriver: best?.driver ?? null,
    mostConsistentStdDev: best?.sd ?? null,
    runnerUpDriver: second?.driver ?? null,
    runnerUpStdDev: second?.sd ?? null,
    highestVarianceSector,
  };
}

export function computeDriverStats(data: LapRecord[], includePitLaps = false): DriverStats[] {
  const drivers = [...new Set(data.map(r => r.driver))];
  return drivers.map(driver => {
    const laps = cleanLaps(data.filter(r => r.driver === driver), includePitLaps);
    const times = laps.map(r => r.lap_time_s);
    return {
      driver,
      bestLap: times.length > 0 ? Math.min(...times) : 0,
      averagePace: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      consistency: times.length > 1 ? stdDev(times) : 0,
    };
  });
}

export function computeStintStats(data: LapRecord[], includePitLaps = false): StintStats[] {
  const stints = [...new Set(data.map(r => r.stint))].sort((a, b) => a - b);
  return stints.map(stint => {
    const laps = data.filter(r => r.stint === stint);
    const clean = cleanLaps(laps, includePitLaps);
    const times = clean.map(r => r.lap_time_s);
    return {
      stint,
      avgPace: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      lapCount: laps.length,
      hasPit: laps.some(r => r.pit_type !== ''),
    };
  });
}

export function extractPitEvents(data: LapRecord[]): PitEvent[] {
  return data
    .filter(r => r.pit_type !== '')
    .map(r => ({
      lap_number: r.lap_number,
      pit_type: r.pit_type,
      pit_time_s: r.pit_time_s,
      timestamp: r.timestamp,
      driver: r.driver,
    }));
}

export function getFilterOptions(data: LapRecord[]) {
  const lanesSet = new Set<number>();
  for (const r of data) {
    if (r.lane !== null && r.lane !== undefined) lanesSet.add(r.lane);
  }
  return {
    tracks: [...new Set(data.map(r => r.track))].filter(Boolean).sort(),
    sessions: [...new Set(data.map(r => r.session_id))].filter(Boolean).sort(),
    cars: [...new Set(data.map(r => r.car_model))].filter(Boolean).sort(),
    drivers: [...new Set(data.map(r => r.driver))].filter(Boolean).sort(),
    stints: [...new Set(data.map(r => r.stint))].sort((a, b) => a - b),
    lanes: [...lanesSet].sort((a, b) => a - b),
  };
}

export function formatLapTime(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
  }
  return secs.toFixed(3);
}
