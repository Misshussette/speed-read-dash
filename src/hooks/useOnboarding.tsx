import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useOnboarding() {
  const { user } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from('user_onboarding')
      .select('completed')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && !(data as any).completed) {
          setShowTour(true);
        } else if (!data) {
          // Legacy user without onboarding record — create one
          supabase.from('user_onboarding').insert({ user_id: user.id }).then(() => {
            setShowTour(true);
          });
        }
        setLoading(false);
      });
  }, [user]);

  const completeTour = useCallback(async () => {
    if (!user) return;
    setShowTour(false);
    await supabase
      .from('user_onboarding')
      .update({ completed: true, completed_at: new Date().toISOString() } as any)
      .eq('user_id', user.id);
  }, [user]);

  const restartTour = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('user_onboarding')
      .update({ completed: false, completed_at: null } as any)
      .eq('user_id', user.id);
    setShowTour(true);
  }, [user]);

  return { showTour, loading, completeTour, restartTour };
}
