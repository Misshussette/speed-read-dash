import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface RunScope {
  id: string;
  session_id: string;
  drivers: string[];
}

/**
 * Hook to manage persistent per-user analysis scope for a session.
 * Loads from DB on mount, provides save/update methods.
 */
export function useRunScope(sessionId: string | null) {
  const { user } = useAuth();
  const [scope, setScope] = useState<RunScope | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load scope when session changes
  useEffect(() => {
    if (!user || !sessionId) { setScope(null); return; }

    let cancelled = false;
    setIsLoading(true);

    supabase
      .from('user_run_scopes')
      .select('id, session_id, drivers')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setScope(data ? { id: data.id, session_id: data.session_id, drivers: data.drivers || [] } : null);
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [user, sessionId]);

  /** Save or update the scope for this session */
  const saveScope = useCallback(async (sessionId: string, drivers: string[]) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_run_scopes')
      .upsert(
        { user_id: user.id, session_id: sessionId, drivers, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,session_id' }
      )
      .select('id, session_id, drivers')
      .single();

    if (!error && data) {
      setScope({ id: data.id, session_id: data.session_id, drivers: data.drivers || [] });
    }
    return !error;
  }, [user]);

  /** Remove scope (go back to full dataset) */
  const clearScope = useCallback(async (sessionId: string) => {
    if (!user) return;
    await supabase
      .from('user_run_scopes')
      .delete()
      .eq('user_id', user.id)
      .eq('session_id', sessionId);
    setScope(null);
  }, [user]);

  return { runScope: scope, isLoadingScope: isLoading, saveScope, clearScope };
}
