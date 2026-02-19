import { Buffer } from 'buffer';
// Ensure Buffer is globally available for mdb-reader
if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}
import MDBReader from 'mdb-reader';

export interface MdbImportFilters {
  raceIds: string[];
  drivers?: string[];
  bestLapsOnly?: boolean;
}

export interface ParsedMdbLap {
  lap_number: number;
  lap_time_s: number;
  driver: string | null;
  lane: number | null;
  team_number: string | null;
  stint: number;
  session_elapsed_s: number | null;
  pit_time_s: number | null;
  pit_type: string | null;
  timestamp: string | null;
}

/**
 * Parse MDB file client-side (browser) and extract filtered laps.
 * This avoids edge function memory limits by processing on the client.
 * Returns a Map of raceId -> ParsedMdbLap[]
 */
export async function extractMdbLaps(
  file: File,
  filters: MdbImportFilters,
  onProgress?: (msg: string) => void,
): Promise<Map<string, ParsedMdbLap[]>> {
  onProgress?.('Reading MDB file...');
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(new Uint8Array(arrayBuffer));

  onProgress?.('Parsing MDB structure...');
  const reader = new MDBReader(buffer);

  const tables = reader.getTableNames();
  const lapTableName = tables.find(
    (t: string) => t.toLowerCase().replace(/[_\s]/g, '') === 'racehistorylap'
  );
  if (!lapTableName) throw new Error('RaceHistoryLap table not found in MDB file');

  const raceIdSet = new Set(filters.raceIds.map(String));
  const driverSet = filters.drivers?.length
    ? new Set(filters.drivers.map(d => d.toLowerCase()))
    : null;

  onProgress?.('Extracting lap data...');
  const lapTable = reader.getTable(lapTableName);
  const allRows = lapTable.getData();

  const result = new Map<string, ParsedMdbLap[]>();
  const bestTimes = new Map<string, number>();

  for (const row of allRows) {
    const raceId = String((row as Record<string, unknown>)['RaceID'] ?? '');
    if (!raceIdSet.has(raceId)) continue;

    const r = row as Record<string, unknown>;
    const driverId = String(r['DriverID'] ?? '');
    if (driverSet && !driverSet.has(driverId.toLowerCase())) continue;

    const rawLapTime = Number(r['LapTime'] ?? 0);
    const lapTimeS = rawLapTime / 1000;
    if (lapTimeS <= 0) continue;

    const rawRaceTime = r['RaceTime'] != null ? Number(r['RaceTime']) : null;
    const rawPitTime = r['PitStopTime'] != null ? Number(r['PitStopTime']) : null;
    const recDateTime = r['RecDateTime'];

    const lap: ParsedMdbLap = {
      lap_number: Number(r['Lap'] ?? 0),
      lap_time_s: lapTimeS,
      driver: driverId || null,
      lane: r['LaneID'] != null ? Number(r['LaneID']) : null,
      team_number: r['TeamID'] != null ? String(r['TeamID']) : null,
      stint: Number(r['SegmentID'] ?? 0),
      session_elapsed_s: rawRaceTime != null ? rawRaceTime / 1000 : null,
      pit_time_s: rawPitTime != null && rawPitTime > 0 ? rawPitTime / 1000 : null,
      pit_type: rawPitTime != null && rawPitTime > 0 ? 'pit' : null,
      timestamp: recDateTime instanceof Date
        ? recDateTime.toISOString()
        : (recDateTime ? String(recDateTime) : null),
    };

    if (!result.has(raceId)) result.set(raceId, []);
    result.get(raceId)!.push(lap);

    if (filters.bestLapsOnly) {
      const key = `${raceId}_${driverId}`;
      const current = bestTimes.get(key) ?? Infinity;
      if (lapTimeS < current) bestTimes.set(key, lapTimeS);
    }
  }

  // Filter to best laps only if requested
  if (filters.bestLapsOnly) {
    for (const [raceId, laps] of result) {
      result.set(raceId, laps.filter(l => {
        const key = `${raceId}_${l.driver}`;
        return l.lap_time_s === bestTimes.get(key);
      }));
    }
  }

  onProgress?.(`Extracted laps for ${result.size} races`);
  return result;
}
