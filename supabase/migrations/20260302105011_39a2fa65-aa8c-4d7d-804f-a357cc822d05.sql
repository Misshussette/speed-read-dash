
-- 1. Add data_origin to sessions
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS data_origin text NOT NULL DEFAULT 'personal_upload';

-- 2. Add is_beta_tester to clubs
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS is_beta_tester boolean NOT NULL DEFAULT false;

-- 3. Create staged_sessions table (import sandbox)
CREATE TABLE public.staged_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  filename text,
  file_path text,
  source_hash text,
  data_origin text NOT NULL DEFAULT 'personal_upload',
  data_mode text NOT NULL DEFAULT 'generic',
  raw_meta jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  validation_errors jsonb DEFAULT '[]'::jsonb,
  validation_warnings jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  promoted_session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL
);

ALTER TABLE public.staged_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own staged sessions"
  ON public.staged_sessions FOR SELECT
  USING (created_by = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can create staged sessions"
  ON public.staged_sessions FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own staged sessions"
  ON public.staged_sessions FOR UPDATE
  USING (created_by = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "Users can delete own staged sessions"
  ON public.staged_sessions FOR DELETE
  USING (created_by = auth.uid() OR is_platform_admin(auth.uid()));

-- 4. Create staged_laps table
CREATE TABLE public.staged_laps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staged_session_id uuid NOT NULL REFERENCES public.staged_sessions(id) ON DELETE CASCADE,
  driver text,
  stint integer NOT NULL DEFAULT 0,
  lap_number integer NOT NULL,
  lap_time_s double precision NOT NULL DEFAULT 0,
  s1_s double precision,
  s2_s double precision,
  s3_s double precision,
  pit_type text,
  pit_time_s double precision,
  timestamp text,
  lane integer,
  driving_station integer,
  team_number text,
  stint_elapsed_s double precision,
  session_elapsed_s double precision,
  sort_key double precision NOT NULL DEFAULT 0,
  lap_status text NOT NULL DEFAULT 'valid',
  validation_flags text[] DEFAULT '{}'::text[]
);

ALTER TABLE public.staged_laps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own staged laps"
  ON public.staged_laps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.staged_sessions ss
    WHERE ss.id = staged_laps.staged_session_id
    AND (ss.created_by = auth.uid() OR is_platform_admin(auth.uid()))
  ));

CREATE POLICY "System can insert staged laps"
  ON public.staged_laps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.staged_sessions ss
    WHERE ss.id = staged_laps.staged_session_id
    AND (ss.created_by = auth.uid() OR is_platform_admin(auth.uid()))
  ));

CREATE POLICY "Users can delete own staged laps"
  ON public.staged_laps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.staged_sessions ss
    WHERE ss.id = staged_laps.staged_session_id
    AND (ss.created_by = auth.uid() OR is_platform_admin(auth.uid()))
  ));

-- 5. Create promote function (atomic promotion from staging to production)
CREATE OR REPLACE FUNCTION public.promote_staged_session(_staged_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _staged staged_sessions%ROWTYPE;
  _session_id uuid;
  _meta jsonb;
BEGIN
  SELECT * INTO _staged FROM public.staged_sessions WHERE id = _staged_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staged session not found'; END IF;
  IF _staged.status != 'validated' THEN RAISE EXCEPTION 'Session must be validated before promotion'; END IF;
  IF _staged.created_by != auth.uid() AND NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  _meta := _staged.raw_meta;

  INSERT INTO public.sessions (
    event_id, created_by, name, filename, source_hash, data_origin,
    data_mode, track, date, car_model, brand, status, has_sector_data, total_laps
  ) VALUES (
    _staged.event_id, _staged.created_by,
    COALESCE(_meta->>'name', _staged.filename, 'Imported Session'),
    _staged.filename, _staged.source_hash, _staged.data_origin,
    _staged.data_mode,
    _meta->>'track', _meta->>'date', _meta->>'car_model', _meta->>'brand',
    'ready',
    COALESCE((_meta->>'has_sector_data')::boolean, false),
    COALESCE((_meta->>'total_laps')::integer, 0)
  )
  RETURNING id INTO _session_id;

  INSERT INTO public.laps (
    session_id, driver, stint, lap_number, lap_time_s,
    s1_s, s2_s, s3_s, pit_type, pit_time_s, timestamp,
    lane, driving_station, team_number, stint_elapsed_s,
    session_elapsed_s, sort_key, lap_status, validation_flags
  )
  SELECT
    _session_id, driver, stint, lap_number, lap_time_s,
    s1_s, s2_s, s3_s, pit_type, pit_time_s, timestamp,
    lane, driving_station, team_number, stint_elapsed_s,
    session_elapsed_s, sort_key, lap_status, validation_flags
  FROM public.staged_laps WHERE staged_session_id = _staged_id;

  UPDATE public.staged_sessions
  SET status = 'promoted', promoted_session_id = _session_id
  WHERE id = _staged_id;

  RETURN _session_id;
END;
$$;

-- 6. Index for performance
CREATE INDEX IF NOT EXISTS idx_staged_laps_session ON public.staged_laps(staged_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_data_origin ON public.sessions(data_origin);
CREATE INDEX IF NOT EXISTS idx_staged_sessions_status ON public.staged_sessions(status);
