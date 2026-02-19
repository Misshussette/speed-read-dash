
-- Allow users to insert themselves as club members (for invite join flow)
CREATE POLICY "Users can join clubs via invite"
  ON public.club_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'member'
    AND EXISTS (
      SELECT 1 FROM public.club_invites ci
      WHERE ci.club_id = club_members.club_id
        AND (ci.expires_at IS NULL OR ci.expires_at > now())
    )
  );
