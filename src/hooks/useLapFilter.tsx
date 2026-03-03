/**
 * Hook for intelligent lap filtering with backend persistence.
 * Manages filter config + manual overrides per session.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { LapRecord } from '@/types/telemetry';
import {
  applyIntelligentFilter,
  getCleanLaps,
  countExcluded,
  type LapOverride,
  type FilterConfig,
  type LapWithExclusion,
  type ExclusionReason,
  DEFAULT_FILTER_CONFIG,
} from '@/lib/lap-filter';

interface UseLapFilterReturn {
  /** All laps with exclusion metadata */
  enrichedLaps: LapWithExclusion[];
  /** Only clean (non-excluded) laps */
  cleanLaps: LapRecord[];
  /** Number of excluded laps */
  excludedCount: number;
  /** Whether cleaned mode is active */
  cleanedMode: boolean;
  setCleanedMode: (v: boolean) => void;
  /** Current filter config */
  filterConfig: FilterConfig;
  /** Update filter coefficients */
  updateFilterConfig: (config: Partial<FilterConfig>) => Promise<void>;
  /** Add/update a manual override for a lap */
  setLapOverride: (lapId: string, sessionId: string, reason: ExclusionReason, exclude?: boolean, note?: string | null) => Promise<void>;
  /** Remove a manual override (revert to auto) */
  removeLapOverride: (lapId: string) => Promise<void>;
  /** Manual overrides map */
  manualOverrides: Map<string, LapOverride>;
  /** Loading state */
  isLoading: boolean;
}

export function useLapFilter(sessionId: string | null, laps: LapRecord[]): UseLapFilterReturn {
  const { user } = useAuth();
  const [cleanedMode, setCleanedMode] = useState(true);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(DEFAULT_FILTER_CONFIG);
  const [manualOverrides, setManualOverrides] = useState<Map<string, LapOverride>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Load config + overrides when session changes
  useEffect(() => {
    if (!sessionId || !user) {
      setFilterConfig(DEFAULT_FILTER_CONFIG);
      setManualOverrides(new Map());
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const load = async () => {
      // Load filter config
      const { data: configData } = await supabase
        .from('session_filter_config')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!cancelled && configData) {
        setFilterConfig({
          upper_coefficient: configData.upper_coefficient,
          lower_coefficient: configData.lower_coefficient,
          min_lap_time_s: configData.min_lap_time_s,
          max_lap_time_s: configData.max_lap_time_s,
        });
      } else if (!cancelled) {
        setFilterConfig(DEFAULT_FILTER_CONFIG);
      }

      // Load manual overrides
      const { data: overrides } = await supabase
        .from('lap_analysis_overrides')
        .select('*')
        .eq('session_id', sessionId)
        .eq('created_by', user.id);

      if (!cancelled && overrides) {
        const map = new Map<string, LapOverride>();
        for (const o of overrides) {
          map.set(o.lap_id, {
            lap_id: o.lap_id,
            is_excluded: o.is_excluded,
            exclusion_reason: o.exclusion_reason as ExclusionReason,
            custom_note: o.custom_note,
          });
        }
        setManualOverrides(map);
      }

      if (!cancelled) setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [sessionId, user]);

  // Compute filtered laps (memoized)
  const enrichedLaps = useMemo(
    () => applyIntelligentFilter(laps, manualOverrides, filterConfig),
    [laps, manualOverrides, filterConfig]
  );

  const cleanLapsList = useMemo(() => getCleanLaps(enrichedLaps), [enrichedLaps]);
  const excludedCount = useMemo(() => countExcluded(enrichedLaps), [enrichedLaps]);

  // Update filter config
  const updateFilterConfig = useCallback(async (updates: Partial<FilterConfig>) => {
    if (!sessionId || !user) return;
    const newConfig = { ...filterConfig, ...updates };
    setFilterConfig(newConfig);

    await supabase
      .from('session_filter_config')
      .upsert({
        session_id: sessionId,
        user_id: user.id,
        upper_coefficient: newConfig.upper_coefficient,
        lower_coefficient: newConfig.lower_coefficient,
        min_lap_time_s: newConfig.min_lap_time_s,
        max_lap_time_s: newConfig.max_lap_time_s,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id,user_id' });
  }, [sessionId, user, filterConfig]);

  // Set manual override
  const setLapOverride = useCallback(async (
    lapId: string,
    sessId: string,
    reason: ExclusionReason,
    exclude = true,
    note: string | null = null,
  ) => {
    if (!user) return;
    const override: LapOverride = {
      lap_id: lapId,
      is_excluded: exclude,
      exclusion_reason: reason,
      custom_note: note,
    };
    setManualOverrides(prev => new Map(prev).set(lapId, override));

    await supabase
      .from('lap_analysis_overrides')
      .upsert({
        lap_id: lapId,
        session_id: sessId,
        is_excluded: exclude,
        exclusion_reason: reason,
        custom_note: note,
        created_by: user.id,
      }, { onConflict: 'lap_id,created_by' });
  }, [user]);

  // Remove manual override
  const removeLapOverride = useCallback(async (lapId: string) => {
    if (!user) return;
    setManualOverrides(prev => {
      const next = new Map(prev);
      next.delete(lapId);
      return next;
    });

    await supabase
      .from('lap_analysis_overrides')
      .delete()
      .eq('lap_id', lapId)
      .eq('created_by', user.id);
  }, [user]);

  return {
    enrichedLaps,
    cleanLaps: cleanLapsList,
    excludedCount,
    cleanedMode,
    setCleanedMode,
    filterConfig,
    updateFilterConfig,
    setLapOverride,
    removeLapOverride,
    manualOverrides,
    isLoading,
  };
}
