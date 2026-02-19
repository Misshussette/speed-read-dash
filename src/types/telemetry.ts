export type LapStatus = 'valid' | 'suspect' | 'invalid';

export interface LapRecord {
  session_id: string;
  date: string;
  track: string;
  car_model: string;
  brand: string;
  driver: string;
  stint: number;
  lap_number: number;
  lap_time_s: number;
  S1_s: number | null;
  S2_s: number | null;
  S3_s: number | null;
  pit_type: string;
  pit_time_s: number | null;
  timestamp: string;
  // Extended fields for analog/digital racing
  lane: number | null;
  driving_station: number | null;
  team_number: string | null;
  stint_elapsed_s: number | null;
  session_elapsed_s: number | null;
  // Validation
  lap_status: LapStatus;
  validation_flags: string[];
  // Sort key (derived, not stored in CSV)
  _sort_key: number;
}

export interface SessionMeta {
  id: string;
  session_id: string;
  date: string;
  track: string;
  car_model: string;
  brand: string;
  filename: string;
  laps: number;
  importedAt: number;
  // Editable metadata
  display_name: string | null;
  tags: string[];
  notes: string | null;
  event_type: string | null;
}

export interface StoredSession {
  meta: SessionMeta;
  data: LapRecord[];
  hasSectorData: boolean;
  dataMode: DataMode;
}

export interface Filters {
  track: string | null;
  session_id: string | null;
  car: string | null;
  drivers: string[];
  stints: number[];
  includePitLaps: boolean;
}

export interface AnalysisScope {
  entity_ids: string[];     // car_model / team_number identifiers
  drivers: string[];        // drivers the user wants to focus on
  track_positions: number[]; // lane numbers (PCLap)
  enabled: boolean;         // false = no scope, analyse full dataset
}

export interface KPIData {
  bestLap: number | null;
  averagePace: number | null;
  consistency: number | null;
  paceDelta: number | null;
  degradation: number | null;
  totalLaps: number;
  pitStops: number;
  totalPitTime: number;
}

export interface DriverStats {
  driver: string;
  bestLap: number;
  averagePace: number;
  consistency: number;
}

export interface StintStats {
  stint: number;
  avgPace: number;
  lapCount: number;
  hasPit: boolean;
}

export interface PitEvent {
  lap_number: number;
  pit_type: string;
  pit_time_s: number | null;
  timestamp: string;
  driver: string;
}

// Minimum columns needed to parse a valid session
export const REQUIRED_COLUMNS = [
  'session_id', 'track', 'car_model', 'driver',
  'stint', 'lap_number'
];

// At least one of these must be present for lap time
export const LAP_TIME_ALIASES = ['lap_time_s', 'lap_time_sec', 'laptime', 'lap_time'];

export const OPTIONAL_COLUMNS = ['S1_s', 'S2_s', 'S3_s', 'date', 'brand', 'pit_type', 'pit_time_s', 'timestamp', 'lane', 'driving_station', 'team_number', 'stint_elapsed_s', 'session_elapsed_s'];

// Column alias mapping: alias -> canonical name
export const COLUMN_ALIASES: Record<string, string> = {
  lap_time_sec: 'lap_time_s',
  laptime: 'lap_time_s',
  lap_time: 'lap_time_s',
  circuit: 'track',
  car: 'car_model',
  pilote: 'driver',
  tour: 'lap_number',
  relais: 'stint',
  stint_id: 'stint',
  stint_elapsed_sec: 'stint_elapsed_s',
  session_elapsed_sec: 'session_elapsed_s',
  // PCLapCounter aliases
  RaceID: 'session_id',
  SegmentID: 'stint',
  RaceTime: 'session_elapsed_s',
  LapTime: 'lap_time_s',
  LaneID: 'lane',
  DriverID: 'driver',
  TeamID: 'team_number',
  CarID: 'car_model',
};

// PCLap signature columns — if all present, treat as structured PCLap data
export const PCLAP_SIGNATURE = ['RaceID', 'SegmentID', 'RaceTime', 'LapTime'];

export type DataMode = 'generic' | 'pclap';
