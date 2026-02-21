
-- User-level run overrides for personal customization without mutating shared data
CREATE TABLE public.run_user_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  custom_name TEXT,
  hidden BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(run_id, user_id)
);

ALTER TABLE public.run_user_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own overrides"
  ON public.run_user_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own overrides"
  ON public.run_user_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own overrides"
  ON public.run_user_overrides FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own overrides"
  ON public.run_user_overrides FOR DELETE
  USING (auth.uid() = user_id);
