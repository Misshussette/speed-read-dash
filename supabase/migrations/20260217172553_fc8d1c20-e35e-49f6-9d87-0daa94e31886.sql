
-- =============================================
-- STEP 1: Platform Roles (separate table for security)
-- =============================================
CREATE TYPE public.platform_role AS ENUM ('platform_admin', 'club_admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role platform_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer functions for role checks
CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id UUID, _role platform_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'platform_admin'
  );
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.is_platform_admin(auth.uid()));

-- Update handle_new_user to also assign default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- =============================================
-- STEP 2: Clubs and Club Members
-- =============================================
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Club helper functions
CREATE OR REPLACE FUNCTION public.is_club_member(_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = _club_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_club_owner(_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = _club_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

-- Auto-add club creator as owner
CREATE OR REPLACE FUNCTION public.auto_add_club_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.club_members (club_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_add_club_owner
  AFTER INSERT ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_club_owner();

-- Club RLS
CREATE POLICY "Members can view clubs" ON public.clubs
  FOR SELECT USING (public.is_club_member(id) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can create clubs" ON public.clubs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update clubs" ON public.clubs
  FOR UPDATE USING (public.is_club_owner(id) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Owners can delete clubs" ON public.clubs
  FOR DELETE USING (public.is_club_owner(id) OR public.is_platform_admin(auth.uid()));

-- Club members RLS
CREATE POLICY "Members can view club members" ON public.club_members
  FOR SELECT USING (public.is_club_member(club_id) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Owners can add club members" ON public.club_members
  FOR INSERT WITH CHECK (public.is_club_owner(club_id) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Owners can update club members" ON public.club_members
  FOR UPDATE USING (public.is_club_owner(club_id) OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Self or owner can remove club members" ON public.club_members
  FOR DELETE USING (user_id = auth.uid() OR public.is_club_owner(club_id) OR public.is_platform_admin(auth.uid()));

-- =============================================
-- STEP 2b: Add club_id to events
-- =============================================
ALTER TABLE public.events ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Update events RLS to include club context
DROP POLICY IF EXISTS "Members can view events" ON public.events;
DROP POLICY IF EXISTS "Users can create events" ON public.events;
DROP POLICY IF EXISTS "Owners can update events" ON public.events;
DROP POLICY IF EXISTS "Owners can delete events" ON public.events;

CREATE POLICY "Members can view events" ON public.events
  FOR SELECT USING (
    public.is_event_member(id)
    OR (club_id IS NOT NULL AND public.is_club_member(club_id))
    OR created_by = auth.uid()
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Users can create events" ON public.events
  FOR INSERT WITH CHECK (
    (club_id IS NULL AND auth.uid() = created_by)
    OR (club_id IS NOT NULL AND public.is_club_member(club_id))
  );

CREATE POLICY "Owners can update events" ON public.events
  FOR UPDATE USING (
    public.is_event_owner(id)
    OR (club_id IS NOT NULL AND public.is_club_owner(club_id))
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Owners can delete events" ON public.events
  FOR DELETE USING (
    public.is_event_owner(id)
    OR (club_id IS NOT NULL AND public.is_club_owner(club_id))
    OR public.is_platform_admin(auth.uid())
  );

-- =============================================
-- STEP 4: Import Job Tracking
-- =============================================
CREATE TABLE public.imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  filename TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  rows_processed INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own imports" ON public.imports
  FOR SELECT USING (created_by = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can create imports" ON public.imports
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "System can update imports" ON public.imports
  FOR UPDATE USING (created_by = auth.uid() OR public.is_platform_admin(auth.uid()));

-- =============================================
-- STEP 5: Subscriptions (Inactive / Future Use)
-- =============================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'inactive',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (
    user_id = auth.uid()
    OR (club_id IS NOT NULL AND public.is_club_member(club_id))
    OR public.is_platform_admin(auth.uid())
  );

CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can update subscriptions" ON public.subscriptions
  FOR UPDATE USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can delete subscriptions" ON public.subscriptions
  FOR DELETE USING (public.is_platform_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_club_members_club_id ON public.club_members(club_id);
CREATE INDEX idx_club_members_user_id ON public.club_members(user_id);
CREATE INDEX idx_events_club_id ON public.events(club_id);
CREATE INDEX idx_imports_session_id ON public.imports(session_id);
CREATE INDEX idx_imports_created_by ON public.imports(created_by);
CREATE INDEX idx_imports_status ON public.imports(status);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_club_id ON public.subscriptions(club_id);
