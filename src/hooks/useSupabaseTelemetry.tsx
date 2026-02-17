import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { LapRecord, SessionMeta, Filters, AnalysisScope, KPIData } from '@/types/telemetry';

export interface SupabaseSession {
  id: string;
  event_id: string;
  name: string;
  track: string | null;
  date: string | null;
  car_model: string | null;
  brand: string | null;
  filename: string | null;
  data_mode: string;
  has_sector_data: boolean;
  total_laps: number;
  status: string;
  created_at: string;
}

/** Upload a CSV file to storage and trigger server-side ingestion */
export function useFileUpload() {
  const { user, session } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(async (file: File, eventId: string) => {
    if (!user || !session) {
      toast.error('You must be logged in to upload files.');
      return null;
    }

    setUploading(true);
    try {
      // 1. Upload to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('race-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Create session record
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          event_id: eventId,
          name: file.name.replace(/\.csv$/i, ''),
          filename: file.name,
          status: 'processing',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      // 3. Trigger ingestion edge function
      const { error: fnError } = await supabase.functions.invoke('ingest-race-file', {
        body: {
          session_id: sessionData.id,
          file_path: filePath,
          event_id: eventId,
        },
      });

      if (fnError) throw fnError;

      toast.success('File uploaded — processing in progress.');
      return sessionData.id;
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  }, [user, session]);

  return { uploadFile, uploading };
}

/** Fetch sessions for a given event */
export function useEventSessions(eventId: string | null) {
  const [sessions, setSessions] = useState<SupabaseSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!eventId) { setSessions([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (!error && data) setSessions(data as SupabaseSession[]);
    setLoading(false);
  }, [eventId]);

  return { sessions, loading, fetchSessions };
}

/** Fetch laps for a session (paginated, filtered) */
export function useSessionLaps() {
  const [laps, setLaps] = useState<LapRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLaps = useCallback(async (
    sessionId: string,
    options?: {
      drivers?: string[];
      stints?: number[];
      limit?: number;
      offset?: number;
    }
  ) => {
    setLoading(true);
    let query = supabase
      .from('laps')
      .select('*')
      .eq('session_id', sessionId)
      .order('sort_key', { ascending: true });

    if (options?.drivers?.length) {
      query = query.in('driver', options.drivers);
    }
    if (options?.stints?.length) {
      query = query.in('stint', options.stints);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 1000) - 1);
    }

    const { data, error } = await query;

    if (!error && data) {
      const mapped: LapRecord[] = data.map((row: any) => ({
        session_id: sessionId,
        date: '',
        track: '',
        car_model: '',
        brand: '',
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
      setLaps(mapped);
    }
    setLoading(false);
    return laps;
  }, []);

  return { laps, loading, fetchLaps };
}

/** Fetch user's events */
export function useEvents() {
  const [events, setEvents] = useState<{ id: string; name: string; description: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('id, name, description, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) setEvents(data);
    setLoading(false);
  }, []);

  const createEvent = useCallback(async (name: string, description?: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from('events')
      .insert({ name, description: description || null, created_by: userData.user.id })
      .select('id, name, description, created_at')
      .single();

    if (!error && data) {
      setEvents(prev => [data, ...prev]);
      return data;
    }
    if (error) toast.error(error.message);
    return null;
  }, []);

  return { events, loading, fetchEvents, createEvent };
}
