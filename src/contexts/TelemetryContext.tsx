import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { LapRecord, Filters, SessionMeta, AnalysisScope } from '@/types/telemetry';
import { DEFAULT_SCOPE, applyScopeFilter, getScopeOptions, computeDualContextKPIs, type DualContextKPIs } from '@/lib/analysis-scope';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TelemetryState {
  // Multi-session
  sessions: SessionMeta[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  uploadFile: (file: File, eventIdOverride?: string) => Promise<void>;
  removeSession: (id: string) => void;

  // Events
  events: { id: string; name: string }[];
  activeEventId: string | null;
  setActiveEventId: (id: string | null) => void;
  createEvent: (name: string) => Promise<string | null>;

  // Current session data
  rawData: LapRecord[];
  hasSectorData: boolean;
  isLoading: boolean;
  errors: string[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  resetFilters: () => void;

  // Analysis scope
  scope: AnalysisScope;
  setScope: (s: AnalysisScope) => void;
  resetScope: () => void;
  scopeOptions: ReturnType<typeof getScopeOptions>;
  scopedData: LapRecord[];
  dualKPIs: DualContextKPIs | null;
}

const defaultFilters: Filters = {
  track: null,
  session_id: null,
  car: null,
  drivers: [],
  stints: [],
  includePitLaps: true,
};

const TelemetryContext = createContext<TelemetryState | null>(null);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeSessionId, setActiveSessionIdInternal] = useState<string | null>(null);
  const [rawData, setRawData] = useState<LapRecord[]>([]);
  const [hasSectorData, setHasSectorData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [scope, setScope] = useState<AnalysisScope>(DEFAULT_SCOPE);

  // Load events when user is authenticated
  useEffect(() => {
    if (!user) { setEvents([]); setActiveEventId(null); return; }
    supabase
      .from('events')
      .select('id, name')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setEvents(data);
          if (data.length > 0 && !activeEventId) setActiveEventId(data[0].id);
        }
      });
  }, [user]);

  // Load sessions when event changes
  useEffect(() => {
    if (!activeEventId) { setSessions([]); return; }
    setIsLoading(true);
    supabase
      .from('sessions')
      .select('*')
      .eq('event_id', activeEventId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          const metas: SessionMeta[] = data.map((s: any) => ({
            id: s.id,
            session_id: s.id,
            date: s.date || '',
            track: s.track || '',
            car_model: s.car_model || '',
            brand: s.brand || '',
            filename: s.filename || '',
            laps: s.total_laps,
            importedAt: new Date(s.created_at).getTime(),
          }));
          setSessions(metas);
          if (metas.length > 0) setActiveSessionIdInternal(metas[0].id);
          else setActiveSessionIdInternal(null);
        }
        setIsLoading(false);
      });
  }, [activeEventId]);

  // Load laps when session changes
  useEffect(() => {
    if (!activeSessionId) { setRawData([]); setHasSectorData(false); return; }
    setIsLoading(true);

    const loadLaps = async () => {
      // Fetch all laps in batches to overcome 1000 row limit
      let allLaps: any[] = [];
      let offset = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('laps')
          .select('*')
          .eq('session_id', activeSessionId)
          .order('sort_key', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error || !data) { hasMore = false; break; }
        allLaps = allLaps.concat(data);
        hasMore = data.length === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      // Get session meta for track/car info
      const sessionMeta = sessions.find(s => s.id === activeSessionId);

      const mapped: LapRecord[] = allLaps.map((row: any) => ({
        session_id: activeSessionId,
        date: sessionMeta?.date || '',
        track: sessionMeta?.track || '',
        car_model: sessionMeta?.car_model || '',
        brand: sessionMeta?.brand || '',
        driver: row.driver || '',
        stint: row.stint,
        lap_number: row.lap_number,
        lap_time_s: row.lap_time_s,
        S1_s: row.s1_s,
        S2_s: row.s2_s,
        S3_s: row.s3_s,
        pit_type: row.pit_type || '',
        pit_time_s: row.pit_time_s,
        timestamp: row.timestamp || '',
        lane: row.lane,
        driving_station: row.driving_station,
        team_number: row.team_number,
        stint_elapsed_s: row.stint_elapsed_s,
        session_elapsed_s: row.session_elapsed_s,
        lap_status: row.lap_status as any,
        validation_flags: row.validation_flags || [],
        _sort_key: row.sort_key,
      }));

      setRawData(mapped);
      setHasSectorData(mapped.some(l => l.S1_s !== null));
      setIsLoading(false);
    };

    loadLaps();
  }, [activeSessionId, sessions]);

  const createEvent = useCallback(async (name: string): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('events')
      .insert({ name, created_by: user.id })
      .select('id, name')
      .single();
    if (error) { toast.error(error.message); return null; }
    if (data) {
      setEvents(prev => [data, ...prev]);
      setActiveEventId(data.id);
      return data.id;
    }
    return null;
  }, [user]);

  const uploadFile = useCallback(async (file: File, eventIdOverride?: string) => {
    const targetEventId = eventIdOverride || activeEventId;
    if (!user || !targetEventId) {
      toast.error('Select an event first.');
      return;
    }
    setIsLoading(true);
    setErrors([]);

    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('race-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          event_id: targetEventId,
          name: file.name.replace(/\.csv$/i, ''),
          filename: file.name,
          status: 'processing',
          created_by: user.id,
        })
        .select('id')
        .single();
      if (sessionError) throw sessionError;

      const { error: fnError } = await supabase.functions.invoke('ingest-race-file', {
        body: {
          session_id: sessionData.id,
          file_path: filePath,
          event_id: targetEventId,
        },
      });
      if (fnError) throw fnError;

      // Refresh sessions list
      const { data: refreshed } = await supabase
        .from('sessions')
        .select('*')
        .eq('event_id', targetEventId)
        .order('created_at', { ascending: false });

      if (refreshed) {
        const metas: SessionMeta[] = refreshed.map((s: any) => ({
          id: s.id,
          session_id: s.id,
          date: s.date || '',
          track: s.track || '',
          car_model: s.car_model || '',
          brand: s.brand || '',
          filename: s.filename || '',
          laps: s.total_laps,
          importedAt: new Date(s.created_at).getTime(),
        }));
        setSessions(metas);
        setActiveSessionIdInternal(sessionData.id);
      }

      setFilters(defaultFilters);
      setScope(DEFAULT_SCOPE);
      toast.success('File processed successfully!');
    } catch (err: any) {
      setErrors([err.message || 'Upload failed']);
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  }, [user, activeEventId]);

  const removeSession = useCallback(async (id: string) => {
    await supabase.from('sessions').delete().eq('id', id);
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionIdInternal(next.length > 0 ? next[0].id : null);
        setFilters(defaultFilters);
        setScope(DEFAULT_SCOPE);
      }
      return next;
    });
  }, [activeSessionId]);

  const setActiveSessionId = useCallback((id: string | null) => {
    setActiveSessionIdInternal(id);
    setFilters(defaultFilters);
    setScope(DEFAULT_SCOPE);
  }, []);

  // Scope
  const scopeOptions = useMemo(() => getScopeOptions(rawData), [rawData]);
  const scopedData = useMemo(() => applyScopeFilter(rawData, scope), [rawData, scope]);
  const dualKPIs = useMemo(() => {
    if (!scope.enabled || rawData.length === 0) return null;
    return computeDualContextKPIs(scopedData, rawData, filters.includePitLaps);
  }, [scopedData, rawData, scope.enabled, filters.includePitLaps]);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);
  const resetScope = useCallback(() => setScope(DEFAULT_SCOPE), []);

  return (
    <TelemetryContext.Provider value={{
      sessions, activeSessionId, setActiveSessionId,
      uploadFile, removeSession,
      events, activeEventId, setActiveEventId, createEvent,
      rawData, hasSectorData, isLoading, errors, filters,
      setFilters, resetFilters,
      scope, setScope, resetScope, scopeOptions, scopedData, dualKPIs,
    }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetry must be used within TelemetryProvider. Check that your component is rendered inside <TelemetryProvider>.');
  return ctx;
}
