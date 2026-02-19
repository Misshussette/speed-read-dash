import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { LapRecord, Filters, SessionMeta, AnalysisScope } from '@/types/telemetry';
import { DEFAULT_SCOPE, applyScopeFilter, getScopeOptions, computeDualContextKPIs, type DualContextKPIs } from '@/lib/analysis-scope';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClubMeta { id: string; name: string; role: string; }

export interface MdbScanResult {
  import_id: string;
  file_path: string;
  catalog: any[];
}

interface TelemetryState {
  // Multi-session
  sessions: SessionMeta[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  uploadFile: (file: File, eventIdOverride?: string) => Promise<void>;
  uploadMdbFile: (file: File, eventIdOverride?: string) => Promise<MdbScanResult | null>;
  importMdbRaces: (importId: string, filePath: string, selectedRaceIds: string[], eventIdOverride?: string, raceCatalog?: any[], file?: File, importFilters?: { drivers?: string[]; bestLapsOnly?: boolean }) => Promise<void>;
  removeSession: (id: string) => void;
  updateSessionMeta: (id: string, updates: Partial<Pick<SessionMeta, 'display_name' | 'tags' | 'notes' | 'event_type' | 'track'>>) => Promise<void>;
  moveSessionsToEvent: (sessionIds: string[], targetEventId: string) => Promise<void>;

  // Clubs
  clubs: ClubMeta[];
  activeClubId: string | null;
  setActiveClubId: (id: string | null) => void;
  createClub: (name: string) => Promise<string | null>;

  // Events
  events: { id: string; name: string; club_id: string | null }[];
  activeEventId: string | null;
  setActiveEventId: (id: string | null) => void;
  createEvent: (name: string, clubId?: string | null) => Promise<string | null>;
  updateEvent: (eventId: string, updates: { club_id?: string | null; name?: string }) => Promise<void>;

  // Comparison
  comparisonSessions: string[];
  toggleComparisonSession: (id: string) => void;
  clearComparisonSessions: () => void;
  comparisonData: LapRecord[];
  isLoadingComparison: boolean;

  // Current session data
  rawData: LapRecord[];
  hasSectorData: boolean;
  isLoading: boolean;
  loadingProgress: { loaded: number; total: number | null } | null;
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

  // Clubs
  const [clubs, setClubs] = useState<ClubMeta[]>([]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);

  // Events
  const [events, setEvents] = useState<{ id: string; name: string; club_id: string | null }[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeSessionId, setActiveSessionIdInternal] = useState<string | null>(null);

  // Data
  const [rawData, setRawData] = useState<LapRecord[]>([]);
  const [hasSectorData, setHasSectorData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number | null } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [scope, setScope] = useState<AnalysisScope>(DEFAULT_SCOPE);
  const [comparisonSessions, setComparisonSessions] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<LapRecord[]>([]);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);

  // Load clubs when user is authenticated
  useEffect(() => {
    if (!user) { setClubs([]); setActiveClubId(null); return; }
    supabase
      .from('club_members')
      .select('club_id, role, clubs(id, name)')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const mapped: ClubMeta[] = data
            .filter((d: any) => d.clubs)
            .map((d: any) => ({ id: d.clubs.id, name: d.clubs.name, role: d.role }));
          setClubs(mapped);
        }
      });
  }, [user]);

  // Load events when user or club changes
  useEffect(() => {
    if (!user) { setEvents([]); setActiveEventId(null); return; }

    const loadEvents = async () => {
      // Load all events the user can see (RLS handles access)
      const { data } = await supabase
        .from('events')
        .select('id, name, club_id')
        .order('created_at', { ascending: false });

      if (data) {
        // If a club is selected, filter to that club's events + personal events
        const filtered = activeClubId
          ? data.filter(e => e.club_id === activeClubId || (!e.club_id))
          : data;
        setEvents(filtered);
        if (filtered.length > 0 && !activeEventId) setActiveEventId(filtered[0].id);
      }
    };
    loadEvents();
  }, [user, activeClubId]);

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
            display_name: s.display_name || null,
            tags: s.tags || [],
            notes: s.notes || null,
            event_type: s.event_type || null,
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
    setLoadingProgress({ loaded: 0, total: null });

    const loadLaps = async () => {
      // Get expected total for progress bar
      const expectedTotal = sessions.find(s => s.id === activeSessionId)?.laps || null;

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
        setLoadingProgress({ loaded: allLaps.length, total: expectedTotal });
      }

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
      setLoadingProgress(null);
    };

    loadLaps();
  }, [activeSessionId, sessions]);

  // Club actions
  const createClub = useCallback(async (name: string): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('clubs')
      .insert({ name, created_by: user.id })
      .select('id, name')
      .single();
    if (error) { toast.error(error.message); return null; }
    if (data) {
      setClubs(prev => [...prev, { id: data.id, name: data.name, role: 'owner' }]);
      setActiveClubId(data.id);
      return data.id;
    }
    return null;
  }, [user]);

  // Event actions
  const createEvent = useCallback(async (name: string, clubId?: string | null): Promise<string | null> => {
    if (!user) return null;
    const insertData: any = { name, created_by: user.id };
    if (clubId) insertData.club_id = clubId;
    const { data, error } = await supabase
      .from('events')
      .insert(insertData)
      .select('id, name, club_id')
      .single();
    if (error) { toast.error(error.message); return null; }
    if (data) {
      setEvents(prev => [data, ...prev]);
      setActiveEventId(data.id);
      return data.id;
    }
    return null;
  }, [user]);

  const updateEvent = useCallback(async (eventId: string, updates: { club_id?: string | null; name?: string }) => {
    const { error } = await supabase.from('events').update(updates).eq('id', eventId);
    if (error) { toast.error(error.message); return; }
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...updates } : e));
    toast.success('Event updated');
  }, []);

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
          display_name: s.display_name || null,
          tags: s.tags || [],
          notes: s.notes || null,
          event_type: s.event_type || null,
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

  const uploadMdbFile = useCallback(async (file: File, eventIdOverride?: string): Promise<MdbScanResult | null> => {
    const targetEventId = eventIdOverride || activeEventId;
    if (!user || !targetEventId) {
      toast.error('Select an event first.');
      return null;
    }
    setIsLoading(true);
    setErrors([]);

    try {
      // Upload file to storage (needed for import record tracking)
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('race-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Scan MDB client-side (avoids edge function memory limits)
      const { scanMdbFile } = await import('@/lib/mdb-client-parser');
      const catalog = await scanMdbFile(file);

      // Create import record
      const { data: importData, error: importErr } = await supabase
        .from('imports')
        .insert({
          event_id: targetEventId,
          file_path: filePath,
          filename: file.name,
          status: 'catalog_ready',
          source_type: 'mdb',
          created_by: user.id,
          started_at: new Date().toISOString(),
          race_catalog: catalog as any,
        })
        .select('id')
        .single();
      if (importErr) throw importErr;

      setIsLoading(false);
      return {
        import_id: importData.id,
        file_path: filePath,
        catalog,
      };
    } catch (err: any) {
      console.error('[MDB Scan] Error:', err);
      setErrors([err.message || 'MDB scan failed']);
      toast.error(err.message || 'MDB scan failed');
      setIsLoading(false);
      return null;
    }
  }, [user, activeEventId]);

  const importMdbRaces = useCallback(async (
    importId: string,
    filePath: string,
    selectedRaceIds: string[],
    eventIdOverride?: string,
    raceCatalog?: any[],
    file?: File,
    importFilters?: { drivers?: string[]; bestLapsOnly?: boolean },
  ) => {
    const targetEventId = eventIdOverride || activeEventId;
    if (!user || !targetEventId) return;
    setIsLoading(true);

    try {
      const results: { session_id: string; name: string; laps_count: number }[] = [];
      let lastSessionId: string | null = null;

      if (file) {
        // Client-side MDB parsing — avoids edge function memory limits
        const { extractMdbLaps } = await import('@/lib/mdb-client-parser');
        const lapsByRace = await extractMdbLaps(file, {
          raceIds: selectedRaceIds,
          drivers: importFilters?.drivers,
          bestLapsOnly: importFilters?.bestLapsOnly,
        });

        for (const raceId of selectedRaceIds) {
          const laps = lapsByRace.get(String(raceId));
          if (!laps || laps.length === 0) continue;

          const catalogEntry = raceCatalog?.find((r: any) => String(r.race_id) === String(raceId));
          const raceMeta = {
            name: catalogEntry?.name || `Race ${raceId}`,
            date: catalogEntry?.date || '',
            track: catalogEntry?.track || '',
            has_sectors: catalogEntry?.has_sectors || false,
            filename: `${catalogEntry?.name || raceId}.mdb`,
          };

          const { data, error: fnError } = await supabase.functions.invoke('insert-mdb-laps', {
            body: { event_id: targetEventId, race_meta: raceMeta, laps },
          });
          if (fnError) throw fnError;
          if (data?.session_id) {
            results.push(data);
            lastSessionId = data.session_id;
          }
        }
      } else {
        // Fallback: server-side import (one race per call)
        for (const raceId of selectedRaceIds) {
          const catalogEntry = raceCatalog?.find((r: any) => String(r.race_id) === String(raceId));
          const raceMeta = catalogEntry ? {
            name: catalogEntry.name,
            date: catalogEntry.date,
            track: catalogEntry.track,
            seg_number: catalogEntry.seg_number ?? 0,
          } : undefined;

          const { data, error: fnError } = await supabase.functions.invoke('import-mdb-races', {
            body: { import_id: importId, event_id: targetEventId, file_path: filePath, race_id: raceId, race_meta: raceMeta },
          });
          if (fnError) throw fnError;
          if (data?.session_id && !data.skipped) {
            results.push(data);
            lastSessionId = data.session_id;
          }
        }
      }

      // Update import status
      await supabase.from('imports').update({
        status: 'complete',
        rows_processed: results.reduce((sum, r) => sum + r.laps_count, 0),
        completed_at: new Date().toISOString(),
      }).eq('id', importId);

      // Refresh sessions
      const { data: refreshed } = await supabase
        .from('sessions')
        .select('*')
        .eq('event_id', targetEventId)
        .order('created_at', { ascending: false });

      if (refreshed) {
        const metas: SessionMeta[] = refreshed.map((s: any) => ({
          id: s.id, session_id: s.id,
          date: s.date || '', track: s.track || '',
          car_model: s.car_model || '', brand: s.brand || '',
          filename: s.filename || '', laps: s.total_laps,
          importedAt: new Date(s.created_at).getTime(),
          display_name: s.display_name || null,
          tags: s.tags || [], notes: s.notes || null,
          event_type: s.event_type || null,
        }));
        setSessions(metas);
        if (lastSessionId) setActiveSessionIdInternal(lastSessionId);
      }

      setFilters(defaultFilters);
      setScope(DEFAULT_SCOPE);
      toast.success(`${results.length} races imported!`);
    } catch (err: any) {
      setErrors([err.message || 'MDB import failed']);
      toast.error(err.message || 'MDB import failed');
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

  const setActiveSessionId = useCallback(async (id: string | null) => {
    if (!id) {
      setActiveSessionIdInternal(null);
      setFilters(defaultFilters);
      setScope(DEFAULT_SCOPE);
      return;
    }
    // If the session is already loaded, just switch
    const alreadyLoaded = sessions.find(s => s.id === id);
    if (alreadyLoaded) {
      setActiveSessionIdInternal(id);
      setFilters(defaultFilters);
      setScope(DEFAULT_SCOPE);
      return;
    }
    // Session not in current list — fetch from DB and set its event
    try {
      const { data: sessionRow } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!sessionRow) return;
      // Switch event so sessions list loads, then set active
      if (sessionRow.event_id && sessionRow.event_id !== activeEventId) {
        setActiveEventId(sessionRow.event_id);
      }
      // Small delay to let event switch trigger session reload, then set active
      setTimeout(() => {
        setActiveSessionIdInternal(id);
        setFilters(defaultFilters);
        setScope(DEFAULT_SCOPE);
      }, 100);
    } catch {
      // Silently fail — Analysis will show "not found" state
    }
  }, [sessions, activeEventId, setActiveEventId]);

  const updateSessionMeta = useCallback(async (id: string, updates: Partial<Pick<SessionMeta, 'display_name' | 'tags' | 'notes' | 'event_type' | 'track'>>) => {
    const { error } = await supabase.from('sessions').update(updates).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } as SessionMeta : s));
  }, []);

  const moveSessionsToEvent = useCallback(async (sessionIds: string[], targetEventId: string) => {
    const { error } = await supabase.from('sessions').update({ event_id: targetEventId }).in('id', sessionIds);
    if (error) { toast.error(error.message); return; }
    // Remove moved sessions from current list (they belong to a different event now)
    setSessions(prev => prev.filter(s => !sessionIds.includes(s.id)));
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

  // Comparison
  const toggleComparisonSession = useCallback((id: string) => {
    setComparisonSessions(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }, []);

  const clearComparisonSessions = useCallback(() => {
    setComparisonSessions([]);
    setComparisonData([]);
  }, []);

  // Load comparison data when comparisonSessions changes
  useEffect(() => {
    if (comparisonSessions.length < 2) {
      setComparisonData([]);
      return;
    }

    let cancelled = false;
    const loadComparisonData = async () => {
      setIsLoadingComparison(true);
      const allLaps: LapRecord[] = [];

      for (const sessionId of comparisonSessions) {
        let offset = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;
        const sessionMeta = sessions.find(s => s.id === sessionId);

        while (hasMore) {
          const { data, error } = await supabase
            .from('laps')
            .select('*')
            .eq('session_id', sessionId)
            .order('sort_key', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

          if (error || !data || cancelled) { hasMore = false; break; }

          const mapped: LapRecord[] = data.map((row: any) => ({
            session_id: sessionId,
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

          allLaps.push(...mapped);
          hasMore = data.length === PAGE_SIZE;
          offset += PAGE_SIZE;
        }
      }

      if (!cancelled) {
        setComparisonData(allLaps);
        setIsLoadingComparison(false);
      }
    };

    loadComparisonData();
    return () => { cancelled = true; };
  }, [comparisonSessions, sessions]);

  return (
    <TelemetryContext.Provider value={{
      sessions, activeSessionId, setActiveSessionId,
      uploadFile, uploadMdbFile, importMdbRaces, removeSession, updateSessionMeta, moveSessionsToEvent,
      clubs, activeClubId, setActiveClubId, createClub,
      events, activeEventId, setActiveEventId, createEvent, updateEvent,
      comparisonSessions, toggleComparisonSession, clearComparisonSessions,
      comparisonData, isLoadingComparison,
      rawData, hasSectorData, isLoading, loadingProgress, errors, filters,
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
