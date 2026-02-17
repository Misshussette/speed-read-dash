import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type PlatformRole = 'platform_admin' | 'club_admin' | 'user';

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<PlatformRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRoles([]); setLoading(false); return; }

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setRoles(data.map(r => r.role as PlatformRole));
        setLoading(false);
      });
  }, [user]);

  return {
    roles,
    loading,
    isPlatformAdmin: roles.includes('platform_admin'),
    isClubAdmin: roles.includes('club_admin'),
    isUser: roles.includes('user'),
  };
}
