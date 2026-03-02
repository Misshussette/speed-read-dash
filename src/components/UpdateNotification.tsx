import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { APP_VERSION } from '@/lib/app-version';

const SEEN_VERSION_KEY = 'stintlab-seen-version';

const UpdateNotification = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const seenVersion = localStorage.getItem(SEEN_VERSION_KEY);
    if (seenVersion === APP_VERSION) return;

    supabase
      .from('app_versions')
      .select('version, release_notes_short')
      .eq('active', true)
      .order('released_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.version && data.version !== seenVersion) {
          setVersion(data.version);
          setNotes(data.release_notes_short || null);
          setVisible(true);
        }
      });
  }, [user]);

  const dismiss = () => {
    setVisible(false);
    if (version) localStorage.setItem(SEEN_VERSION_KEY, version);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-sm bg-card border border-border rounded-lg shadow-lg p-4 space-y-2 animate-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">v{version}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={dismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {notes && <p className="text-xs text-muted-foreground">{notes}</p>}
    </div>
  );
};

export default UpdateNotification;
