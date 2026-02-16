import { LapRecord, KPIData, DriverStats, StintStats, PitEvent, Filters } from '@/types/telemetry';

export function applyFilters(data: LapRecord[], filters: Filters): LapRecord[] {
  return data.filter(r => {
    if (filters.track && r.track !== filters.track) return false;
    if (filters.session_id && r.session_id !== filters.session_id) return false;
    if (filters.drivers.length > 0 && !filters.drivers.includes(r.driver)) return false;
    if (filters.stints.length > 0 && !filters.stints.includes(r.stint)) return false;
    if (!filters.includePitLaps && r.pit_type !== '') return false;
    return true;
  });
}

function cleanLaps(data: LapRecord[]): LapRecord[] {
  return data.filter(r => r.pit_type === '');
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map(v => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

export function computeKPIs(data: LapRecord[]): KPIData {
  const clean = cleanLaps(data);
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

export function computeInsights(data: LapRecord[]): { mostConsistentDriver: string | null; highestVarianceSector: string | null } {
  const drivers = [...new Set(data.map(r => r.driver))];
  let mostConsistentDriver: string | null = null;
  let bestConsistency = Infinity;
  
  for (const driver of drivers) {
    const laps = cleanLaps(data.filter(r => r.driver === driver));
    const times = laps.map(r => r.lap_time_s);
    if (times.length >= 3) {
      const sd = stdDev(times);
      if (sd < bestConsistency) {
        bestConsistency = sd;
        mostConsistentDriver = driver;
      }
    }
  }

  // Highest variance sector
  let highestVarianceSector: string | null = null;
  const sectorKeys = ['S1_s', 'S2_s', 'S3_s'] as const;
  let maxVariance = -1;
  for (const key of sectorKeys) {
    const vals = data.filter(r => r.pit_type === '' && r[key] !== null).map(r => r[key] as number);
    if (vals.length >= 3) {
      const sd = stdDev(vals);
      if (sd > maxVariance) {
        maxVariance = sd;
        highestVarianceSector = key.replace('_s', '').toUpperCase();
      }
    }
  }

  return { mostConsistentDriver, highestVarianceSector };
}

export function computeDriverStats(data: LapRecord[]): DriverStats[] {
  const drivers = [...new Set(data.map(r => r.driver))];
  return drivers.map(driver => {
    const laps = cleanLaps(data.filter(r => r.driver === driver));
    const times = laps.map(r => r.lap_time_s);
    return {
      driver,
      bestLap: times.length > 0 ? Math.min(...times) : 0,
      averagePace: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      consistency: times.length > 1 ? stdDev(times) : 0,
    };
  });
}

export function computeStintStats(data: LapRecord[]): StintStats[] {
  const stints = [...new Set(data.map(r => r.stint))].sort((a, b) => a - b);
  return stints.map(stint => {
    const laps = data.filter(r => r.stint === stint);
    const clean = cleanLaps(laps);
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
  return {
    tracks: [...new Set(data.map(r => r.track))].filter(Boolean).sort(),
    sessions: [...new Set(data.map(r => r.session_id))].filter(Boolean).sort(),
    drivers: [...new Set(data.map(r => r.driver))].filter(Boolean).sort(),
    stints: [...new Set(data.map(r => r.stint))].sort((a, b) => a - b),
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
