import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { LapRecord, Filters } from '@/types/telemetry';
import type { ParseResult } from '@/lib/csv-parser';
import { parseCSV } from '@/lib/csv-parser';

interface TelemetryState {
  rawData: LapRecord[];
  hasSectorData: boolean;
  isLoading: boolean;
  errors: string[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  resetFilters: () => void;
  uploadCSV: (file: File) => Promise<void>;
  clearData: () => void;
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

const STORAGE_KEY = 'stintlab_data';

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [rawData, setRawData] = useState<LapRecord[]>([]);
  const [hasSectorData, setHasSectorData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRawData(parsed.data || []);
        setHasSectorData(parsed.hasSectorData || false);
      }
    } catch {}
  }, []);

  // Save to localStorage on data change
  useEffect(() => {
    if (rawData.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: rawData, hasSectorData }));
      } catch {}
    }
  }, [rawData, hasSectorData]);

  const uploadCSV = useCallback(async (file: File) => {
    setIsLoading(true);
    setErrors([]);
    const result: ParseResult = await parseCSV(file);
    setRawData(result.data);
    setHasSectorData(result.hasSectorData);
    setErrors(result.errors);
    setFilters(defaultFilters);
    setIsLoading(false);
  }, []);

  const clearData = useCallback(() => {
    setRawData([]);
    setHasSectorData(false);
    setErrors([]);
    setFilters(defaultFilters);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  return (
    <TelemetryContext.Provider value={{
      rawData, hasSectorData, isLoading, errors, filters,
      setFilters, resetFilters, uploadCSV, clearData,
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
