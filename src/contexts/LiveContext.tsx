import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────────────
export type SessionType = 'race' | 'qualifying' | 'practice';
export type DataMode = 'analog' | 'digital';
export type LiveDisplayMode = 'split_live' | 'relay_average';
export type Sensitivity = 'stable' | 'standard' | 'sensitive' | 'very_sensitive';
export type ConnectionStatus = 'connected' | 'receiving' | 'paused' | 'disconnected';

export interface SectorTimes {
  s1: number | null;
  s2: number | null;
  s3: number | null;
}

/** Technical data stream identity — what comes from the race system */
export interface FluxEntry {
  fluxId: string;           // CarNumber (digital), DriverName/TeamName/fallback (analog)
  lane?: number;            // Mandatory in analog mode, contextual only
  teamName?: string;
  driverName?: string;      // Raw name from race system (unreliable)
}

/** Stint segment — who drove what laps */
export interface LiveStint {
  id: string;
  liveSessionId: string;
  fluxId: string;
  stintLabPilotId: string | null;
  pilotDisplayName: string | null;
  startTimestamp: string;
  endTimestamp: string | null;
  startLap: number;
  endLap: number | null;
}

/** Per-pilot live data (resolved from FluxID + stints) */
export interface PilotLiveData {
  id: string;               // fluxId
  fluxId: string;
  displayName: string;      // Resolved: stint pilot name > driverName > teamName > fluxId
  lane?: number;
  laps: number;
  lastLap: number | null;
  bestLap: number | null;
  currentSectors: SectorTimes;
  bestSectors: SectorTimes;
  laneBestSectors?: Record<number, SectorTimes>;
  gap: number | null;
  variation: number | null;
  pitCount: number;
  recentLaps: number[];
  currentStint: LiveStint | null;
}

export interface LiveSessionConfig {
  id: string | null;
  sessionType: SessionType;
  dataMode: DataMode;
  configLocked: boolean;
}

export interface LiveState {
  session: LiveSessionConfig;
  displayMode: LiveDisplayMode;
  sensitivity: Sensitivity;
  connectionStatus: ConnectionStatus;
  source: string | null;
  latency: number | null;
  pilots: PilotLiveData[];
  stints: LiveStint[];
  hasSectorData: boolean;
}

interface LiveContextValue extends LiveState {
  setSessionType: (t: SessionType) => void;
  setDataMode: (m: DataMode) => void;
  setDisplayMode: (m: LiveDisplayMode) => void;
  setSensitivity: (s: Sensitivity) => void;
  lockConfig: () => void;
  unlockConfig: () => void;
  claimDriving: (fluxId: string) => Promise<void>;
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
  const { user } = useAuth();

  // Session config
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionType, setSessionTypeState] = useState<SessionType>('race');
  const [dataMode, setDataModeState] = useState<DataMode>('analog');
  const [configLocked, setConfigLocked] = useState(false);
  const [displayMode, setDisplayMode] = useState<LiveDisplayMode>('split_live');
  const [sensitivity, setSensitivity] = useState<Sensitivity>('standard');

  // Connection
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [source, setSource] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  // Data
  const [pilots, setPilots] = useState<PilotLiveData[]>([]);
  const [stints, setStints] = useState<LiveStint[]>([]);
  const [hasSectorData, setHasSectorData] = useState(false);

  // Setters that respect config lock
  const setSessionType = useCallback((t: SessionType) => {
    if (!configLocked) setSessionTypeState(t);
  }, [configLocked]);

  const setDataMode = useCallback((m: DataMode) => {
    if (!configLocked) setDataModeState(m);
  }, [configLocked]);

  const lockConfig = useCallback(() => setConfigLocked(true), []);
  const unlockConfig = useCallback(() => setConfigLocked(false), []);

  // Driver Claim
  const claimDriving = useCallback(async (fluxId: string) => {
    if (!user || !sessionId) return;

    // Close previous stint for this fluxId
    const activeStint = stints.find(s => s.fluxId === fluxId && !s.endTimestamp);
    if (activeStint) {
      const currentPilot = pilots.find(p => p.fluxId === fluxId);
      await supabase
        .from('live_stints')
        .update({
          end_timestamp: new Date().toISOString(),
          end_lap: currentPilot?.laps ?? null,
        })
        .eq('id', activeStint.id);
    }

    // Create new stint
    const currentPilot = pilots.find(p => p.fluxId === fluxId);
    const { data } = await supabase
      .from('live_stints')
      .insert({
        live_session_id: sessionId,
        flux_id: fluxId,
        stintlab_pilot_id: user.id,
        pilot_display_name: user.user_metadata?.display_name || user.email || 'Unknown',
        start_lap: (currentPilot?.laps ?? 0) + 1,
      })
      .select()
      .single();

    if (data) {
      setStints(prev => [
        ...prev.map(s =>
          s.fluxId === fluxId && !s.endTimestamp
            ? { ...s, endTimestamp: new Date().toISOString(), endLap: currentPilot?.laps ?? null }
            : s
        ),
        {
          id: data.id,
          liveSessionId: data.live_session_id,
          fluxId: data.flux_id,
          stintLabPilotId: data.stintlab_pilot_id,
          pilotDisplayName: data.pilot_display_name,
          startTimestamp: data.start_timestamp,
          endTimestamp: data.end_timestamp,
          startLap: data.start_lap,
          endLap: data.end_lap,
        },
      ]);
    }
  }, [user, sessionId, stints, pilots]);

  // Subscribe to realtime stint changes
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`live_stints_${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_stints', filter: `live_session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const d = payload.new as any;
            setStints(prev => [...prev, {
              id: d.id,
              liveSessionId: d.live_session_id,
              fluxId: d.flux_id,
              stintLabPilotId: d.stintlab_pilot_id,
              pilotDisplayName: d.pilot_display_name,
              startTimestamp: d.start_timestamp,
              endTimestamp: d.end_timestamp,
              startLap: d.start_lap,
              endLap: d.end_lap,
            }]);
          } else if (payload.eventType === 'UPDATE') {
            const d = payload.new as any;
            setStints(prev => prev.map(s => s.id === d.id ? {
              ...s,
              endTimestamp: d.end_timestamp,
              endLap: d.end_lap,
              stintLabPilotId: d.stintlab_pilot_id,
              pilotDisplayName: d.pilot_display_name,
            } : s));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const value = useMemo<LiveContextValue>(() => ({
    session: { id: sessionId, sessionType, dataMode, configLocked },
    displayMode,
    sensitivity,
    connectionStatus,
    source,
    latency,
    pilots,
    stints,
    hasSectorData,
    setSessionType,
    setDataMode,
    setDisplayMode,
    setSensitivity,
    lockConfig,
    unlockConfig,
    claimDriving,
    isSinglePilot: pilots.length <= 1,
    isAnalog: dataMode === 'analog',
    sensitivityCoefficient: sensitivityMap[sensitivity],
  }), [sessionId, sessionType, dataMode, configLocked, displayMode, sensitivity,
    connectionStatus, source, latency, pilots, stints, hasSectorData,
    setSessionType, setDataMode, lockConfig, unlockConfig, claimDriving]);

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
};

export const useLive = (): LiveContextValue => {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used within LiveProvider');
  return ctx;
};
