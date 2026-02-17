import Papa from 'papaparse';
import { LapRecord, REQUIRED_COLUMNS, LAP_TIME_ALIASES, COLUMN_ALIASES, PCLAP_SIGNATURE, DataMode } from '@/types/telemetry';
import { validateLaps, assignSortKeys } from '@/lib/lap-validator';

export interface ParseResult {
  data: LapRecord[];
  errors: string[];
  hasSectorData: boolean;
  dataMode: DataMode;
}

/** Normalize headers using alias mapping */
function normalizeHeaders(fields: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of fields) {
    const trimmed = f.trim();
    const canonical = COLUMN_ALIASES[trimmed] || trimmed;
    map.set(trimmed, canonical);
  }
  return map;
}

function getVal(row: Record<string, string>, canonical: string, aliasMap: Map<string, string>): string {
  // Try direct canonical name first
  if (row[canonical] !== undefined) return row[canonical];
  // Try finding the original key that maps to this canonical name
  for (const [original, mapped] of aliasMap) {
    if (mapped === canonical && row[original] !== undefined) return row[original];
  }
  return '';
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const tryParse = (delimiter: string, fallback?: string) => {
      Papa.parse<Record<string, string>>(file, {
        delimiter,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const fields = results.meta.fields || [];
          if (fields.length <= 1 && fallback) {
            tryParse(fallback);
            return;
          }
          resolve(processResults(results));
        },
        error: (err) => {
          if (fallback) {
            tryParse(fallback);
          } else {
            resolve({ data: [], errors: [err.message], hasSectorData: false, dataMode: 'generic' });
          }
        }
      });
    };
    // Try semicolon first, then comma
    tryParse(';', ',');
  });
}

function processResults(results: Papa.ParseResult<Record<string, string>>): ParseResult {
  const errors: string[] = [];
  const fields = results.meta.fields || [];
  const aliasMap = normalizeHeaders(fields);
  const canonicalFields = new Set(aliasMap.values());

  // Detect PCLap mode: all signature columns present in raw fields
  const isPclap = PCLAP_SIGNATURE.every(col => fields.includes(col));
  const dataMode: DataMode = isPclap ? 'pclap' : 'generic';

  // Check required columns (after alias resolution)
  const missingCols = REQUIRED_COLUMNS.filter(c => !canonicalFields.has(c));
  if (missingCols.length > 0) {
    errors.push(`Missing columns: ${missingCols.join(', ')}`);
    return { data: [], errors, hasSectorData: false, dataMode };
  }

  // Check lap time column
  const hasLapTime = LAP_TIME_ALIASES.some(a => canonicalFields.has('lap_time_s') || fields.includes(a));
  if (!hasLapTime) {
    errors.push(`Missing lap time column. Expected one of: ${LAP_TIME_ALIASES.join(', ')}`);
    return { data: [], errors, hasSectorData: false, dataMode };
  }

  const hasSectorData = canonicalFields.has('S1_s') && canonicalFields.has('S2_s') && canonicalFields.has('S3_s');

  const data: LapRecord[] = results.data.map((row: Record<string, string>, idx: number) => ({
    session_id: getVal(row, 'session_id', aliasMap).trim() || '',
    date: getVal(row, 'date', aliasMap).trim() || '',
    track: getVal(row, 'track', aliasMap).trim() || '',
    car_model: getVal(row, 'car_model', aliasMap).trim() || '',
    brand: getVal(row, 'brand', aliasMap).trim() || '',
    driver: getVal(row, 'driver', aliasMap).trim() || '',
    stint: parseInt(getVal(row, 'stint', aliasMap)) || 0,
    lap_number: parseInt(getVal(row, 'lap_number', aliasMap)) || 0,
    lap_time_s: parseFloat(getVal(row, 'lap_time_s', aliasMap)) || 0,
    S1_s: hasSectorData ? parseFloat(getVal(row, 'S1_s', aliasMap)) || null : null,
    S2_s: hasSectorData ? parseFloat(getVal(row, 'S2_s', aliasMap)) || null : null,
    S3_s: hasSectorData ? parseFloat(getVal(row, 'S3_s', aliasMap)) || null : null,
    pit_type: getVal(row, 'pit_type', aliasMap).trim() || '',
    pit_time_s: getVal(row, 'pit_time_s', aliasMap) ? parseFloat(getVal(row, 'pit_time_s', aliasMap)) || null : null,
    timestamp: getVal(row, 'timestamp', aliasMap).trim() || '',
    lane: getVal(row, 'lane', aliasMap) ? parseInt(getVal(row, 'lane', aliasMap)) || null : null,
    driving_station: getVal(row, 'driving_station', aliasMap) ? parseInt(getVal(row, 'driving_station', aliasMap)) || null : null,
    team_number: getVal(row, 'team_number', aliasMap).trim() || null,
    stint_elapsed_s: getVal(row, 'stint_elapsed_s', aliasMap) ? parseFloat(getVal(row, 'stint_elapsed_s', aliasMap)) || null : null,
    session_elapsed_s: getVal(row, 'session_elapsed_s', aliasMap) ? parseFloat(getVal(row, 'session_elapsed_s', aliasMap)) || null : null,
    // Validation fields — populated by validateLaps()
    lap_status: 'valid',
    validation_flags: [],
    _sort_key: idx,
  }));

  // Never discard rows — filter only truly empty records (no time data at all)
  const nonEmpty = data.filter(r => r.lap_time_s !== 0 || r.session_elapsed_s !== null);

  if (nonEmpty.length === 0) {
    errors.push('No valid lap records found in file.');
    return { data: [], errors, hasSectorData: false, dataMode };
  }

  // Sort by time reference, then validate
  const sorted = assignSortKeys(nonEmpty);
  const validated = validateLaps(sorted);

  return { data: validated, errors, hasSectorData, dataMode };
}
