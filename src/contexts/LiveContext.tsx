import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

export type SessionType = 'race' | 'qualifying' | 'practice';
export type DataMode = 'analog' | 'digital';
export type LiveDisplayMode = 'split_live' | 'relay_average';
export type Sensitivity = 'stable' | 'standard' | 'sensitive' | 'very_sensitive';

export interface SectorTimes {
  s1: number | null;
  s2: number | null;
  s3: number | null;
}

export interface PilotLiveData {
  id: string;
  driver: string;
  lane?: number;
  laps: number;
  lastLap: number | null;
  bestLap: number | null;
  currentSectors: SectorTimes;
  bestSectors: SectorTimes;
  /** Per-lane best sectors for analog mode */
  laneBestSectors?: Record<number, SectorTimes>;
  gap: number | null;
  variation: number | null;
  pitCount: number;
  recentLaps: number[];
}

export interface LiveState {
  sessionType: SessionType;
  dataMode: DataMode;
  displayMode: LiveDisplayMode;
  sensitivity: Sensitivity;
  connected: boolean;
  source: string | null;
  latency: number | null;
  pilots: PilotLiveData[];
  hasSectorData: boolean;
}

interface LiveContextValue extends LiveState {
  setSessionType: (t: SessionType) => void;
  setDataMode: (m: DataMode) => void;
  setDisplayMode: (m: LiveDisplayMode) => void;
  setSensitivity: (s: Sensitivity) => void;
  isSinglePilot: boolean;
  isAnalog: boolean;
  sensitivityCoefficient: number;
}

const sensitivityMap: Record<Sensitivity, number> = {
  stable: 3.0,
  standard: 2.0,
  sensitive: 1.5,
  very_sensitive: 1.0,
};

const LiveContext = createContext<LiveContextValue | null>(null);

export const LiveProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessionType, setSessionType] = useState<SessionType>('race');
  const [dataMode, setDataMode] = useState<DataMode>('analog');
  const [displayMode, setDisplayMode] = useState<LiveDisplayMode>('split_live');
  const [sensitivity, setSensitivity] = useState<Sensitivity>('standard');

  // Placeholder connection state — will be driven by real-time ingestion later
  const [connected] = useState(false);
  const [source] = useState<string | null>(null);
  const [latency] = useState<number | null>(null);
  const [pilots] = useState<PilotLiveData[]>([]);
  const [hasSectorData] = useState(false);

  const value = useMemo<LiveContextValue>(() => ({
    sessionType,
    dataMode,
    displayMode,
    sensitivity,
    connected,
    source,
    latency,
    pilots,
    hasSectorData,
    setSessionType,
    setDataMode,
    setDisplayMode,
    setSensitivity,
    isSinglePilot: pilots.length <= 1,
    isAnalog: dataMode === 'analog',
    sensitivityCoefficient: sensitivityMap[sensitivity],
  }), [sessionType, dataMode, displayMode, sensitivity, connected, source, latency, pilots, hasSectorData]);

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
};

export const useLive = (): LiveContextValue => {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used within LiveProvider');
  return ctx;
};
