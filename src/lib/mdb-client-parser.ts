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

export interface MdbScanCatalogEntry {
  race_id: string;
  name: string;
  date: string;
  track: string;
  track_length: number | null;
  duration: string;
  lap_count: number;
  best_lap: number | null;
  seg_number: number | null;
  has_sectors: boolean;
  comment: string;
  drivers: { name: string; lane: number | null; bestLap: number | null }[];
}

/**
 * Scan MDB file client-side to build a race catalog.
 * This replaces the scan-mdb edge function to avoid memory limits.
 */
export function scanMdbFile(file: File, onProgress?: (msg: string) => void): Promise<MdbScanCatalogEntry[]> {
  return new Promise(async (resolve, reject) => {
    try {
      onProgress?.('Reading MDB file...');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(arrayBuffer));
      console.log(`[MDB Client] File size: ${buffer.length} bytes`);

      onProgress?.('Parsing MDB structure...');
      const reader = new MDBReader(buffer);

      const tableNames = reader.getTableNames();
      const userTables = tableNames.filter(
        (t: string) => !t.startsWith('MSys') && !t.startsWith('pbcat') && t !== 'Numbering'
      );
      console.log('[MDB Client] Tables found:', userTables);

      // Find RaceHistory table
      const raceHistoryName = userTables.find(
        (t: string) => t.toLowerCase().replace(/[_\s]/g, '') === 'racehistory'
      );
      if (!raceHistoryName) throw new Error('RaceHistory table not found');

      const raceHistoryRows = reader.getTable(raceHistoryName).getData();
      console.log(`[MDB Client] RaceHistory: ${raceHistoryRows.length} rows`);

      // Find RaceHistoryClas
      const clasName = userTables.find(
        (t: string) => t.toLowerCase().replace(/[_\s]/g, '') === 'racehistoryclas'
      );
      const clasRows = clasName ? reader.getTable(clasName).getData() : [];

      // Find RaceHistorySum
      const sumName = userTables.find(
        (t: string) => t.toLowerCase().replace(/[_\s]/g, '') === 'racehistorysum'
      );
      const sumRows = sumName ? reader.getTable(sumName).getData() : [];

      onProgress?.('Building race catalog...');

      // Auto-detect time unit from sample values
      const scanSampleTimes: number[] = [];
      for (const row of clasRows) {
        const r = row as Record<string, unknown>;
        const avg = toNum(findColumn(r, ['AverageLap', 'Average_Lap', 'averagelap']));
        if (avg !== null && avg > 0) scanSampleTimes.push(avg);
      }
      for (const row of sumRows) {
        const r = row as Record<string, unknown>;
        const lt = toNum(findColumn(r, ['LapTimeMin', 'Lap_Time_Min', 'laptimemin']));
        if (lt !== null && lt > 0) scanSampleTimes.push(lt);
      }
      scanSampleTimes.sort((a, b) => a - b);
      const scanMedian = scanSampleTimes.length > 0 ? scanSampleTimes[Math.floor(scanSampleTimes.length / 2)] : 0;
      const scanDivisor = scanMedian >= 200 ? 1000 : 1;
      console.log(`[MDB Client] Scan time unit: median=${scanMedian}, divisor=${scanDivisor}`);

      // Aggregate lap counts from RaceHistoryClas
      const lapCountByRace: Record<string, number> = {};
      const driversByRace: Record<string, { name: string; lane: number | null; bestLap: number | null }[]> = {};
      for (const row of clasRows) {
        const r = row as Record<string, unknown>;
        const raceId = toStr(findColumn(r, ['RaceID', 'Race_ID', 'raceid']));
        if (!raceId) continue;
        const totalLaps = toNum(findColumn(r, ['TotalLaps', 'Total_Laps', 'totallaps'])) || 0;
        lapCountByRace[raceId] = (lapCountByRace[raceId] || 0) + totalLaps;
        if (!driversByRace[raceId]) driversByRace[raceId] = [];
        const driverId = toStr(findColumn(r, ['DriverID', 'Driver_ID', 'driverid']));
        const avgLap = toNum(findColumn(r, ['AverageLap', 'Average_Lap', 'averagelap']));
        driversByRace[raceId].push({
          name: driverId || 'Unknown',
          lane: null,
          bestLap: avgLap !== null ? avgLap / scanDivisor : null,
        });
      }

      // Aggregate best lap from RaceHistorySum
      const bestLapByRace: Record<string, number> = {};
      for (const row of sumRows) {
        const r = row as Record<string, unknown>;
        const raceId = toStr(findColumn(r, ['RaceID', 'Race_ID', 'raceid']));
        if (!raceId) continue;
        const lapTimeMin = toNum(findColumn(r, ['LapTimeMin', 'Lap_Time_Min', 'laptimemin']));
        if (lapTimeMin !== null && lapTimeMin > 0) {
          const lapTimeSec = lapTimeMin / scanDivisor;
          if (!bestLapByRace[raceId] || lapTimeSec < bestLapByRace[raceId]) {
            bestLapByRace[raceId] = lapTimeSec;
          }
        }
      }

      // Build catalog
      const catalog: MdbScanCatalogEntry[] = raceHistoryRows.map((row) => {
        const r = row as Record<string, unknown>;
        const raceId = toStr(findColumn(r, ['RaceID', 'Race_ID', 'raceid', 'ID']));
        const rawDate = findColumn(r, ['RaceDate', 'Race_Date', 'racedate', 'Date', 'date']);
        const segNumber = toNum(findColumn(r, ['SegNumber', 'Seg_Number', 'segnumber']));

        return {
          race_id: raceId,
          name: toStr(findColumn(r, ['RaceName', 'Race_Name', 'racename', 'Name'])) || `Race ${raceId}`,
          date: rawDate instanceof Date ? rawDate.toISOString() : toStr(rawDate),
          track: toStr(findColumn(r, ['TrackID', 'Track_ID', 'trackid', 'TrackName', 'Track'])),
          track_length: toNum(findColumn(r, ['TrackLength', 'Track_Length', 'tracklength', 'TrackLenght'])),
          duration: toStr(findColumn(r, ['TimeRace', 'Time_Race', 'timerace', 'RaceDuration'])),
          lap_count: lapCountByRace[raceId] || 0,
          best_lap: bestLapByRace[raceId] || null,
          seg_number: segNumber,
          has_sectors: segNumber !== null && segNumber > 0,
          comment: toStr(findColumn(r, ['Comment', 'Comments', 'Notes', 'comment'])),
          drivers: driversByRace[raceId] || [],
        };
      });

      // Sort by date descending
      catalog.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      console.log(`[MDB Client] Catalog built: ${catalog.length} races`);
      onProgress?.(`Found ${catalog.length} races`);
      resolve(catalog);
    } catch (err) {
      reject(err);
    }
  });
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
  console.log(`[MDB Client] Race IDs to match:`, Array.from(raceIdSet));

  // Auto-detect time unit: sample positive LapTime values and check median
  // If median < 200, values are in seconds; if >= 200, in milliseconds
  const sampleTimes: number[] = [];
  for (const row of allRows) {
    if (sampleTimes.length >= 200) break;
    const r = row as Record<string, unknown>;
    const raw = toNum(findColumn(r, ['LapTime', 'Lap_Time', 'laptime']));
    if (raw !== null && raw > 0) sampleTimes.push(raw);
  }
  sampleTimes.sort((a, b) => a - b);
  const medianTime = sampleTimes.length > 0 ? sampleTimes[Math.floor(sampleTimes.length / 2)] : 0;
  const timeIsMilliseconds = medianTime >= 200;
  const timeDivisor = timeIsMilliseconds ? 1000 : 1;
  console.log(`[MDB Client] Time unit auto-detect: median raw=${medianTime}, divisor=${timeDivisor} (${timeIsMilliseconds ? 'ms' : 's'})`);

  if (allRows.length > 0) {
    const sampleRow = allRows[0] as Record<string, unknown>;
    console.log(`[MDB Client] Sample columns:`, Object.keys(sampleRow));
    const sampleRaceId = findColumn(sampleRow, ['RaceID', 'Race_ID', 'raceid']);
    console.log(`[MDB Client] Sample RaceID value: ${JSON.stringify(sampleRaceId)} (type: ${typeof sampleRaceId})`);
  }

  const result = new Map<string, ParsedMdbLap[]>();
  const bestTimes = new Map<string, number>();
  let matchedCount = 0;
  let skippedNoRace = 0;
  let skippedNoTime = 0;

  for (const row of allRows) {
    const r = row as Record<string, unknown>;
    const raceId = toStr(findColumn(r, ['RaceID', 'Race_ID', 'raceid']));
    if (!raceIdSet.has(raceId)) { skippedNoRace++; continue; }

    const driverId = toStr(findColumn(r, ['DriverID', 'Driver_ID', 'driverid']));
    if (driverSet && !driverSet.has(driverId.toLowerCase())) continue;

    const rawLapTime = toNum(findColumn(r, ['LapTime', 'Lap_Time', 'laptime']));
    const lapTimeS = rawLapTime !== null ? rawLapTime / timeDivisor : 0;
    if (lapTimeS <= 0) { skippedNoTime++; continue; }

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
      session_elapsed_s: rawRaceTime != null ? rawRaceTime / timeDivisor : null,
      pit_time_s: rawPitTime != null && rawPitTime > 0 ? rawPitTime / timeDivisor : null,
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

  console.log(`[MDB Client] Extracted ${matchedCount} laps for ${result.size} races (skipped: ${skippedNoRace} no race match, ${skippedNoTime} no time)`);
  onProgress?.(`Extracted ${matchedCount} laps for ${result.size} races`);
  return result;
}
