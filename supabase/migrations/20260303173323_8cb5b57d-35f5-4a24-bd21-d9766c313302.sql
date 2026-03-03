
-- Live sessions table
CREATE TABLE public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  session_type text NOT NULL DEFAULT 'race',
  data_mode text NOT NULL DEFAULT 'digital',
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  config_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create live sessions"
  ON public.live_sessions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view own live sessions"
  ON public.live_sessions FOR SELECT
  USING (created_by = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can update own live sessions"
  ON public.live_sessions FOR UPDATE
  USING (created_by = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can delete own live sessions"
  ON public.live_sessions FOR DELETE
  USING (created_by = auth.uid() OR is_platform_admin(auth.uid()));

-- Live stints table
CREATE TABLE public.live_stints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  flux_id text NOT NULL,
  stintlab_pilot_id uuid,
  pilot_display_name text,
  start_timestamp timestamptz NOT NULL DEFAULT now(),
  end_timestamp timestamptz,
  start_lap integer NOT NULL DEFAULT 1,
  end_lap integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_stints ENABLE ROW LEVEL SECURITY;

-- RLS via parent live_session
CREATE OR REPLACE FUNCTION public.is_live_session_owner(_live_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_sessions
    WHERE id = _live_session_id
      AND (created_by = auth.uid() OR is_platform_admin(auth.uid()))
  );
$$;

CREATE POLICY "Users can insert stints"
  ON public.live_stints FOR INSERT
  WITH CHECK (is_live_session_owner(live_session_id));

CREATE POLICY "Users can view stints"
  ON public.live_stints FOR SELECT
  USING (is_live_session_owner(live_session_id));

CREATE POLICY "Users can update stints"
  ON public.live_stints FOR UPDATE
  USING (is_live_session_owner(live_session_id));

CREATE POLICY "Users can delete stints"
  ON public.live_stints FOR DELETE
  USING (is_live_session_owner(live_session_id));

-- Enable realtime for live tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stints;
