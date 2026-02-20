
-- STEP 1: Restrict session deletion to event OWNER only (not all members)
DROP POLICY IF EXISTS "Members can delete sessions" ON public.sessions;
CREATE POLICY "Owners can delete sessions"
  ON public.sessions FOR DELETE
  USING (is_event_owner(event_id) OR is_platform_admin(auth.uid()));

-- Also restrict lap deletion to event owner
DROP POLICY IF EXISTS "Members can delete laps" ON public.laps;
CREATE POLICY "Owners can delete laps"
  ON public.laps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND (is_event_owner(s.event_id) OR is_platform_admin(auth.uid()))
    )
  );

-- STEP 2: Add source_hash to sessions for duplicate import detection
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS source_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_source_hash ON public.sessions (source_hash) WHERE source_hash IS NOT NULL;

-- STEP 3: Create audit_log table for traceability
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- System can insert audit logs (via triggers using security definer)
CREATE POLICY "System can insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, action, resource_type, resource_id, metadata)
    VALUES (
      CASE WHEN TG_TABLE_NAME = 'club_members' THEN NEW.user_id ELSE auth.uid() END,
      TG_ARGV[0],
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('operation', TG_OP)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, action, resource_type, resource_id, metadata)
    VALUES (
      auth.uid(),
      TG_ARGV[0],
      TG_TABLE_NAME,
      OLD.id,
      jsonb_build_object('operation', TG_OP)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach audit triggers
CREATE TRIGGER audit_session_insert AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('run_imported');

CREATE TRIGGER audit_session_delete AFTER DELETE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('run_deleted');

CREATE TRIGGER audit_club_member_insert AFTER INSERT ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('member_joined');

CREATE TRIGGER audit_club_member_delete AFTER DELETE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger('member_left');

CREATE TRIGGER audit_import_update AFTER UPDATE ON public.imports
  FOR EACH ROW WHEN (NEW.status = 'complete' AND OLD.status != 'complete')
  EXECUTE FUNCTION public.audit_log_trigger('data_updated');
