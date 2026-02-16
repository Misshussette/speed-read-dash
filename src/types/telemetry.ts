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
}

export interface Filters {
  track: string | null;
  session_id: string | null;
  drivers: string[];
  stints: number[];
  includePitLaps: boolean;
}

export interface KPIData {
  bestLap: number | null;
  averagePace: number | null;
  consistency: number | null;
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

export const REQUIRED_COLUMNS = [
  'session_id', 'date', 'track', 'car_model', 'brand', 'driver',
  'stint', 'lap_number', 'lap_time_s', 'pit_type', 'pit_time_s', 'timestamp'
];

export const OPTIONAL_COLUMNS = ['S1_s', 'S2_s', 'S3_s'];
