/**
 * Setup-based comparison utilities.
 * Combines garage metadata with telemetry at query time — telemetry stays immutable.
 */
import type { LapRecord } from '@/types/telemetry';
import type { Car, Setup, SessionGarageLink } from '@/types/garage';
import type { StoredSession } from '@/types/telemetry';

export interface EnrichedSession {
  session: StoredSession;
  car: Car | undefined;
  setup: Setup | undefined;
}

/** Enrich sessions with their garage links */
export function enrichSessions(
  sessions: StoredSession[],
  links: SessionGarageLink[],
  cars: Car[],
  setups: Setup[],
): EnrichedSession[] {
  const carMap = new Map(cars.map(c => [c.id, c]));
  const setupMap = new Map(setups.map(s => [s.id, s]));
  const linkMap = new Map(links.map(l => [l.session_id, l]));

  return sessions.map(session => {
    const link = linkMap.get(session.meta.id);
    return {
      session,
      car: link?.car_id ? carMap.get(link.car_id) : undefined,
      setup: link?.setup_id ? setupMap.get(link.setup_id) : undefined,
    };
  });
}

/** Group sessions by car for same-car / different-setup comparison */
export function groupByCarId(enriched: EnrichedSession[]): Map<string, EnrichedSession[]> {
  const groups = new Map<string, EnrichedSession[]>();
  for (const e of enriched) {
    if (!e.car) continue;
    const existing = groups.get(e.car.id) || [];
    existing.push(e);
    groups.set(e.car.id, existing);
  }
  return groups;
}

/** Group sessions by setup for same-setup across sessions comparison */
export function groupBySetupId(enriched: EnrichedSession[]): Map<string, EnrichedSession[]> {
  const groups = new Map<string, EnrichedSession[]>();
  for (const e of enriched) {
    if (!e.setup) continue;
    const existing = groups.get(e.setup.id) || [];
    existing.push(e);
    groups.set(e.setup.id, existing);
  }
  return groups;
}

/** Compute average lap time for a dataset (pit laps excluded by default) */
function avgLapTime(data: LapRecord[], includePitLaps: boolean): number | null {
  const laps = includePitLaps ? data : data.filter(l => !l.pit_type || l.pit_type === '');
  if (laps.length === 0) return null;
  return laps.reduce((sum, l) => sum + l.lap_time_s, 0) / laps.length;
}

/** Compare setups for the same car: returns per-setup average pace */
export function compareSetups(
  enriched: EnrichedSession[],
  carId: string,
  includePitLaps = false,
): { setup: Setup; avgPace: number | null; sessionCount: number; totalLaps: number }[] {
  const forCar = enriched.filter(e => e.car?.id === carId && e.setup);
  const bySetup = new Map<string, { setup: Setup; laps: LapRecord[]; sessionCount: number }>();

  for (const e of forCar) {
    const sid = e.setup!.id;
    const existing = bySetup.get(sid) || { setup: e.setup!, laps: [], sessionCount: 0 };
    existing.laps.push(...e.session.data);
    existing.sessionCount++;
    bySetup.set(sid, existing);
  }

  return Array.from(bySetup.values()).map(({ setup, laps, sessionCount }) => ({
    setup,
    avgPace: avgLapTime(laps, includePitLaps),
    sessionCount,
    totalLaps: laps.length,
  }));
}
