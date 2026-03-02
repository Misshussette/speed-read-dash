
-- 1. Migrate existing 'owner' roles to 'organizer'
UPDATE public.club_members SET role = 'organizer' WHERE role = 'owner';

-- 2. Create is_club_organizer function (replaces is_club_owner semantics)
CREATE OR REPLACE FUNCTION public.is_club_organizer(_club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = _club_id AND user_id = auth.uid() AND role = 'organizer'
  );
$$;

-- 3. Update is_club_owner to point to organizer (backward compat for existing RLS)
CREATE OR REPLACE FUNCTION public.is_club_owner(_club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = _club_id AND user_id = auth.uid() AND role = 'organizer'
  );
$$;

-- 4. Update auto_add_club_owner trigger to insert 'organizer'
CREATE OR REPLACE FUNCTION public.auto_add_club_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.club_members (club_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.created_by, 'organizer', NEW.created_by);
  RETURN NEW;
END;
$$;

-- 5. Create helper: is_club_viewer (viewer = read-only, cannot create)
CREATE OR REPLACE FUNCTION public.is_club_viewer(_club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = _club_id AND user_id = auth.uid() AND role = 'viewer'
  );
$$;

-- 6. Create helper: is_club_member_or_above (organizer or member, NOT viewer)
CREATE OR REPLACE FUNCTION public.is_club_contributor(_club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = _club_id AND user_id = auth.uid() AND role IN ('organizer', 'member')
  );
$$;

-- 7. Tighten sessions: members can only UPDATE/DELETE their own sessions in club events
DROP POLICY IF EXISTS "Members can update sessions" ON public.sessions;
CREATE POLICY "Members can update sessions" ON public.sessions
FOR UPDATE USING (
  -- Personal event: owner can update
  (is_event_owner(event_id))
  -- Club event: organizer can update any, member can update own
  OR (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id IS NOT NULL
    AND (is_club_organizer(e.club_id) OR (is_club_contributor(e.club_id) AND created_by = auth.uid()))
  ))
  OR is_platform_admin(auth.uid())
);

-- 8. Tighten sessions INSERT: viewers cannot create
DROP POLICY IF EXISTS "Members can create sessions" ON public.sessions;
CREATE POLICY "Members can create sessions" ON public.sessions
FOR INSERT WITH CHECK (
  is_event_member(event_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id IS NOT NULL AND is_club_viewer(e.club_id)
  )
);

-- 9. Tighten setups: viewers read-only, members can only modify own
DROP POLICY IF EXISTS "Members can update setups" ON public.setups;
CREATE POLICY "Members can update setups" ON public.setups
FOR UPDATE USING (
  (is_event_owner(event_id))
  OR (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id IS NOT NULL
    AND (is_club_organizer(e.club_id) OR (is_club_contributor(e.club_id) AND created_by = auth.uid()))
  ))
  OR is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "Members can delete setups" ON public.setups;
CREATE POLICY "Members can delete setups" ON public.setups
FOR DELETE USING (
  (is_event_owner(event_id))
  OR (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id IS NOT NULL
    AND (is_club_organizer(e.club_id) OR (is_club_contributor(e.club_id) AND created_by = auth.uid()))
  ))
  OR is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "Members can create setups" ON public.setups;
CREATE POLICY "Members can create setups" ON public.setups
FOR INSERT WITH CHECK (
  is_event_member(event_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id AND e.club_id IS NOT NULL AND is_club_viewer(e.club_id)
  )
);

-- 10. Update club_members policies: viewers can join, organizers manage
-- Allow viewer role via invite
DROP POLICY IF EXISTS "Users can join clubs via invite" ON public.club_members;
CREATE POLICY "Users can join clubs via invite" ON public.club_members
FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND role IN ('member', 'viewer')
  AND EXISTS (
    SELECT 1 FROM club_invites ci
    WHERE ci.club_id = club_members.club_id
    AND (ci.expires_at IS NULL OR ci.expires_at > now())
  )
);

-- 11. Organizers (not just owners) can manage members
DROP POLICY IF EXISTS "Owners can add club members" ON public.club_members;
CREATE POLICY "Organizers can add club members" ON public.club_members
FOR INSERT WITH CHECK (
  is_club_organizer(club_id) OR is_platform_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners can update club members" ON public.club_members;
CREATE POLICY "Organizers can update club members" ON public.club_members
FOR UPDATE USING (
  is_club_organizer(club_id) OR is_platform_admin(auth.uid())
);
