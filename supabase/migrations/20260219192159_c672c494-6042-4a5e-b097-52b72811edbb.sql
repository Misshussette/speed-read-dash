
-- Fix is_event_member to also check club membership via event's club_id
CREATE OR REPLACE FUNCTION public.is_event_member(_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_id = _event_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = _event_id
      AND e.club_id IS NOT NULL
      AND public.is_club_member(e.club_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = _event_id AND e.created_by = auth.uid()
  )
  OR public.is_platform_admin(auth.uid());
END;
$$;
