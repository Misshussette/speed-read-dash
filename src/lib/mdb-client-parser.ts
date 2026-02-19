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

/** Flexible column matching — same logic as edge function */
function findColumn(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const c of candidates) {
    const key = Object.keys(row).find(
      (k) => k.toLowerCase().replace(/[_\s]/g, '') === c.toLowerCase().replace(/[_\s]/g, '')
    );
    if (key !== undefined && row[key] !== null && row[key] !== undefined) return row[key];
  }
  return null;
}

function toStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function toNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/**
 * Parse MDB file client-side (browser) and extract filtered laps.
 * Uses flexible column matching to handle varying MDB schemas.
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
  console.log(`[MDB Client] RaceHistoryLap: ${allRows.length} rows, filtering for ${raceIdSet.size} races`);

  if (allRows.length > 0) {
    console.log(`[MDB Client] Sample columns:`, Object.keys(allRows[0]));
  }

  const result = new Map<string, ParsedMdbLap[]>();
  const bestTimes = new Map<string, number>();
  let matchedCount = 0;

  for (const row of allRows) {
    const r = row as Record<string, unknown>;
    const raceId = toStr(findColumn(r, ['RaceID', 'Race_ID', 'raceid']));
    if (!raceIdSet.has(raceId)) continue;

    const driverId = toStr(findColumn(r, ['DriverID', 'Driver_ID', 'driverid']));
    if (driverSet && !driverSet.has(driverId.toLowerCase())) continue;

    const rawLapTime = toNum(findColumn(r, ['LapTime', 'Lap_Time', 'laptime']));
    const lapTimeS = rawLapTime !== null ? rawLapTime / 1000 : 0;
    if (lapTimeS <= 0) continue;

    const rawRaceTime = toNum(findColumn(r, ['RaceTime', 'Race_Time', 'racetime']));
    const rawPitTime = toNum(findColumn(r, ['PitStopTime', 'Pit_Stop_Time', 'pitstoptime']));
    const recDateTime = findColumn(r, ['RecDateTime', 'Rec_Date_Time', 'recdatetime']);

    const lap: ParsedMdbLap = {
      lap_number: toNum(findColumn(r, ['Lap', 'LapNumber', 'Lap_Number', 'lapnumber'])) ?? 0,
      lap_time_s: lapTimeS,
      driver: driverId || null,
      lane: toNum(findColumn(r, ['LaneID', 'Lane_ID', 'laneid', 'Lane'])),
      team_number: toStr(findColumn(r, ['TeamID', 'Team_ID', 'teamid'])) || null,
      stint: toNum(findColumn(r, ['SegmentID', 'Segment_ID', 'segmentid'])) ?? 0,
      session_elapsed_s: rawRaceTime != null ? rawRaceTime / 1000 : null,
      pit_time_s: rawPitTime != null && rawPitTime > 0 ? rawPitTime / 1000 : null,
      pit_type: rawPitTime != null && rawPitTime > 0 ? 'pit' : null,
      timestamp: recDateTime instanceof Date
        ? recDateTime.toISOString()
        : (recDateTime ? String(recDateTime) : null),
    };

    if (!result.has(raceId)) result.set(raceId, []);
    result.get(raceId)!.push(lap);
    matchedCount++;

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

  console.log(`[MDB Client] Extracted ${matchedCount} laps for ${result.size} races`);
  onProgress?.(`Extracted ${matchedCount} laps for ${result.size} races`);
  return result;
}
