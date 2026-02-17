
-- =============================================
-- StintLab: Full schema migration
-- =============================================

-- 1. Profiles table (user info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 3. Event members
CREATE TABLE public.event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

-- 4. Helper functions (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_event_member(_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_id = _event_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_event_owner(_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = _event_id AND created_by = auth.uid()
  );
$$;

-- 5. RLS for events
CREATE POLICY "Members can view events" ON public.events FOR SELECT TO authenticated
  USING (public.is_event_member(id) OR created_by = auth.uid());
CREATE POLICY "Users can create events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners can update events" ON public.events FOR UPDATE TO authenticated
  USING (public.is_event_owner(id));
CREATE POLICY "Owners can delete events" ON public.events FOR DELETE TO authenticated
  USING (public.is_event_owner(id));

-- Auto-add creator as member
CREATE OR REPLACE FUNCTION public.auto_add_event_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.event_members (event_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_event_created
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_event_owner();

-- 6. RLS for event_members
CREATE POLICY "Members can view event members" ON public.event_members FOR SELECT TO authenticated
  USING (public.is_event_member(event_id));
CREATE POLICY "Owners can add members" ON public.event_members FOR INSERT TO authenticated
  WITH CHECK (public.is_event_owner(event_id) AND user_id != auth.uid());
CREATE POLICY "Owners can update members" ON public.event_members FOR UPDATE TO authenticated
  USING (public.is_event_owner(event_id));
CREATE POLICY "Self or owner can delete members" ON public.event_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_event_owner(event_id));

-- 7. Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  track TEXT,
  date TEXT,
  car_model TEXT,
  brand TEXT,
  filename TEXT,
  data_mode TEXT NOT NULL DEFAULT 'generic',
  has_sector_data BOOLEAN NOT NULL DEFAULT false,
  total_laps INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sessions_event ON public.sessions(event_id);

CREATE POLICY "Members can view sessions" ON public.sessions FOR SELECT TO authenticated
  USING (public.is_event_member(event_id));
CREATE POLICY "Members can create sessions" ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_event_member(event_id));
CREATE POLICY "Members can update sessions" ON public.sessions FOR UPDATE TO authenticated
  USING (public.is_event_member(event_id));
CREATE POLICY "Members can delete sessions" ON public.sessions FOR DELETE TO authenticated
  USING (public.is_event_member(event_id));

-- 8. Laps table
CREATE TABLE public.laps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  lap_number INTEGER NOT NULL,
  lap_time_s DOUBLE PRECISION NOT NULL DEFAULT 0,
  s1_s DOUBLE PRECISION,
  s2_s DOUBLE PRECISION,
  s3_s DOUBLE PRECISION,
  stint INTEGER NOT NULL DEFAULT 0,
  driver TEXT,
  pit_type TEXT,
  pit_time_s DOUBLE PRECISION,
  timestamp TEXT,
  lane INTEGER,
  driving_station INTEGER,
  team_number TEXT,
  stint_elapsed_s DOUBLE PRECISION,
  session_elapsed_s DOUBLE PRECISION,
  lap_status TEXT NOT NULL DEFAULT 'valid',
  validation_flags TEXT[] DEFAULT '{}',
  sort_key DOUBLE PRECISION NOT NULL DEFAULT 0
);

ALTER TABLE public.laps ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_laps_session ON public.laps(session_id);
CREATE INDEX idx_laps_session_elapsed ON public.laps(session_id, session_elapsed_s);

-- RLS via session -> event membership
CREATE OR REPLACE FUNCTION public.is_lap_accessible(_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = _session_id AND public.is_event_member(s.event_id)
  );
$$;

CREATE POLICY "Members can view laps" ON public.laps FOR SELECT TO authenticated
  USING (public.is_lap_accessible(session_id));
CREATE POLICY "System can insert laps" ON public.laps FOR INSERT TO authenticated
  WITH CHECK (public.is_lap_accessible(session_id));
CREATE POLICY "Members can delete laps" ON public.laps FOR DELETE TO authenticated
  USING (public.is_lap_accessible(session_id));

-- 9. Setups table
CREATE TABLE public.setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  label TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  parameters JSONB DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  car_brand TEXT,
  car_model TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view setups" ON public.setups FOR SELECT TO authenticated
  USING (public.is_event_member(event_id));
CREATE POLICY "Members can create setups" ON public.setups FOR INSERT TO authenticated
  WITH CHECK (public.is_event_member(event_id));
CREATE POLICY "Members can update setups" ON public.setups FOR UPDATE TO authenticated
  USING (public.is_event_member(event_id));
CREATE POLICY "Members can delete setups" ON public.setups FOR DELETE TO authenticated
  USING (public.is_event_member(event_id));

-- 10. Storage bucket for race files
INSERT INTO storage.buckets (id, name, public) VALUES ('race-files', 'race-files', false);

CREATE POLICY "Members can upload race files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'race-files');
CREATE POLICY "Members can view own race files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'race-files');
CREATE POLICY "Members can delete own race files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'race-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 11. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
