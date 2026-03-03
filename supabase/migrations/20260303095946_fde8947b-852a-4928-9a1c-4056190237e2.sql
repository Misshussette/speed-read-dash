
-- Exclusion reasons enum
CREATE TYPE public.exclusion_reason AS ENUM (
  'statistical_outlier',
  'pit_stop',
  'incident',
  'mechanical',
  'track_call',
  'custom_note'
);

-- Per-lap manual overrides (Option B — non-destructive)
CREATE TABLE public.lap_analysis_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lap_id UUID NOT NULL REFERENCES public.laps(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  is_excluded BOOLEAN NOT NULL DEFAULT true,
  exclusion_reason exclusion_reason NOT NULL DEFAULT 'statistical_outlier',
  custom_note TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lap_id, created_by)
);

-- Per-session filter configuration
CREATE TABLE public.session_filter_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  upper_coefficient DOUBLE PRECISION NOT NULL DEFAULT 1.8,
  lower_coefficient DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  min_lap_time_s DOUBLE PRECISION,
  max_lap_time_s DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

-- RLS for lap_analysis_overrides
ALTER TABLE public.lap_analysis_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own overrides"
  ON public.lap_analysis_overrides FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert own overrides"
  ON public.lap_analysis_overrides FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own overrides"
  ON public.lap_analysis_overrides FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own overrides"
  ON public.lap_analysis_overrides FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- RLS for session_filter_config
ALTER TABLE public.session_filter_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own config"
  ON public.session_filter_config FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own config"
  ON public.session_filter_config FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own config"
  ON public.session_filter_config FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own config"
  ON public.session_filter_config FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
