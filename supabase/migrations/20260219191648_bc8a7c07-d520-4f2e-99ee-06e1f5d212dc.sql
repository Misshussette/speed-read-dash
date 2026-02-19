
-- Fix events SELECT policy: restrict to authenticated role only (was public)
DROP POLICY IF EXISTS "Members can view events" ON public.events;

CREATE POLICY "Members can view events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    is_event_member(id) 
    OR ((club_id IS NOT NULL) AND is_club_member(club_id))
    OR (created_by = auth.uid())
    OR is_platform_admin(auth.uid())
  );
