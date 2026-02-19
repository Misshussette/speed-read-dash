
-- Club invites table for invite code system
CREATE TABLE public.club_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.club_invites ENABLE ROW LEVEL SECURITY;

-- Club owners/organizers can view invites
CREATE POLICY "Club owners can view invites"
  ON public.club_invites FOR SELECT
  USING (is_club_owner(club_id) OR is_platform_admin(auth.uid()));

-- Club owners can create invites
CREATE POLICY "Club owners can create invites"
  ON public.club_invites FOR INSERT
  WITH CHECK (is_club_owner(club_id) AND auth.uid() = created_by);

-- Club owners can delete invites
CREATE POLICY "Club owners can delete invites"
  ON public.club_invites FOR DELETE
  USING (is_club_owner(club_id) OR is_platform_admin(auth.uid()));

-- Anyone authenticated can read an invite by code (for joining)
CREATE POLICY "Authenticated users can lookup invites by code"
  ON public.club_invites FOR SELECT
  TO authenticated
  USING (true);

-- Index for fast code lookups
CREATE INDEX idx_club_invites_code ON public.club_invites(invite_code);
