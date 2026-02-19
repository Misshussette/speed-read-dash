
-- Add beta_opt_in to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beta_opt_in boolean NOT NULL DEFAULT false;

-- App versions table
CREATE TABLE public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  channel text NOT NULL DEFAULT 'stable' CHECK (channel IN ('stable', 'beta')),
  release_notes_short text,
  released_at timestamp with time zone NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view versions" ON public.app_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage versions" ON public.app_versions FOR ALL TO authenticated USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

-- Issues table
CREATE TABLE public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  version text,
  type text NOT NULL DEFAULT 'bug',
  description text NOT NULL,
  current_page text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),
  admin_comment text,
  release_id uuid REFERENCES public.app_versions(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own issues" ON public.issues FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));
CREATE POLICY "Users can create issues" ON public.issues FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own issues" ON public.issues FOR UPDATE TO authenticated USING (user_id = auth.uid() OR is_platform_admin(auth.uid()));
CREATE POLICY "Admins can delete issues" ON public.issues FOR DELETE TO authenticated USING (is_platform_admin(auth.uid()));

-- Trigger for updated_at on issues
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial version
INSERT INTO public.app_versions (version, channel, release_notes_short, active) VALUES ('0.1.0-beta', 'beta', 'Initial beta release of StintLab.', true);
