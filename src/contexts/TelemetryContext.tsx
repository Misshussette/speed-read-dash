import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { LapRecord, Filters, SessionMeta, StoredSession } from '@/types/telemetry';
import type { ParseResult } from '@/lib/csv-parser';
import { parseCSV } from '@/lib/csv-parser';
import { getAllSessions, saveSession, deleteSession as deleteSessionFromDB } from '@/lib/session-store';

interface TelemetryState {
  // Multi-session
  sessions: SessionMeta[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  addCSV: (file: File) => Promise<void>;
  removeSession: (id: string) => void;

  // Current session data
  rawData: LapRecord[];
  hasSectorData: boolean;
  isLoading: boolean;
  errors: string[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  resetFilters: () => void;
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
  const [storedSessions, setStoredSessions] = useState<StoredSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [initialized, setInitialized] = useState(false);

  // Load all sessions from IndexedDB on mount
  useEffect(() => {
    getAllSessions().then(sessions => {
      setStoredSessions(sessions);
      // Auto-select the most recent session
      if (sessions.length > 0) {
        const sorted = [...sessions].sort((a, b) => b.meta.importedAt - a.meta.importedAt);
        setActiveSessionId(sorted[0].meta.id);
      }
      setInitialized(true);
    });
  }, []);

  // Migrate from old localStorage format
  useEffect(() => {
    if (!initialized) return;
    try {
      const stored = localStorage.getItem('stintlab_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.data && parsed.data.length > 0) {
          const data = parsed.data as LapRecord[];
          const first = data[0];
          const id = crypto.randomUUID();
          const session: StoredSession = {
            meta: {
              id,
              session_id: first.session_id,
              date: first.date,
              track: first.track,
              car_model: first.car_model,
              brand: first.brand,
              filename: 'migrated.csv',
              laps: data.length,
              importedAt: Date.now(),
            },
            data,
            hasSectorData: parsed.hasSectorData || false,
            dataMode: 'generic',
          };
          saveSession(session).then(() => {
            setStoredSessions(prev => [session, ...prev]);
            setActiveSessionId(id);
            localStorage.removeItem('stintlab_data');
          });
        }
      }
    } catch {}
  }, [initialized]);

  const activeSession = storedSessions.find(s => s.meta.id === activeSessionId);
  const rawData = activeSession?.data || [];
  const hasSectorData = activeSession?.hasSectorData || false;
  const sessions = storedSessions.map(s => s.meta).sort((a, b) => b.importedAt - a.importedAt);

  const addCSV = useCallback(async (file: File) => {
    setIsLoading(true);
    setErrors([]);
    const result: ParseResult = await parseCSV(file);
    if (result.errors.length > 0) {
      setErrors(result.errors);
      setIsLoading(false);
      return;
    }
    if (result.data.length === 0) {
      setErrors(['No valid lap records found.']);
      setIsLoading(false);
      return;
    }
    const first = result.data[0];
    const id = crypto.randomUUID();
    const session: StoredSession = {
      meta: {
        id,
        session_id: first.session_id,
        date: first.date,
        track: first.track,
        car_model: first.car_model,
        brand: first.brand,
        filename: file.name,
        laps: result.data.length,
        importedAt: Date.now(),
      },
      data: result.data,
      hasSectorData: result.hasSectorData,
      dataMode: result.dataMode,
    };
    await saveSession(session);
    setStoredSessions(prev => [session, ...prev]);
    setActiveSessionId(id);
    setFilters(defaultFilters);
    setIsLoading(false);
  }, []);

  const removeSession = useCallback((id: string) => {
    deleteSessionFromDB(id);
    setStoredSessions(prev => {
      const next = prev.filter(s => s.meta.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(next.length > 0 ? next[0].meta.id : null);
        setFilters(defaultFilters);
      }
      return next;
    });
  }, [activeSessionId]);

  const handleSetActiveSessionId = useCallback((id: string | null) => {
    setActiveSessionId(id);
    setFilters(defaultFilters);
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  return (
    <TelemetryContext.Provider value={{
      sessions, activeSessionId, setActiveSessionId: handleSetActiveSessionId,
      addCSV, removeSession,
      rawData, hasSectorData, isLoading, errors, filters,
      setFilters, resetFilters,
    }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetry must be used within TelemetryProvider');
  return ctx;
}
