
-- Table to store per-user analysis scope for each session/run
CREATE TABLE public.user_run_scopes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  drivers text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_id)
);

-- Enable RLS
ALTER TABLE public.user_run_scopes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own scopes
CREATE POLICY "Users can view own scopes"
  ON public.user_run_scopes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own scopes
CREATE POLICY "Users can create own scopes"
  ON public.user_run_scopes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own scopes
CREATE POLICY "Users can update own scopes"
  ON public.user_run_scopes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own scopes
CREATE POLICY "Users can delete own scopes"
  ON public.user_run_scopes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_run_scopes_updated_at
  BEFORE UPDATE ON public.user_run_scopes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
