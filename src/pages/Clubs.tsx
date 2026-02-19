import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, Copy, Trash2, LogIn, Crown, UserCog, User } from 'lucide-react';
import { toast } from 'sonner';

interface Club {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface ClubMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  display_name?: string;
}

interface ClubInvite {
  id: string;
  invite_code: string;
  created_by: string;
  expires_at: string | null;
  created_at: string;
}

const roleIcon = (role: string) => {
  if (role === 'owner') return <Crown className="h-4 w-4 text-primary" />;
  if (role === 'organizer') return <UserCog className="h-4 w-4 text-accent-foreground" />;
  return <User className="h-4 w-4 text-muted-foreground" />;
};

const Clubs = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [invites, setInvites] = useState<ClubInvite[]>([]);
  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchClubs = async () => {
    if (!user) return;
    // Get clubs where user is a member
    const { data: memberRows } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', user.id);

    if (!memberRows?.length) { setClubs([]); setLoading(false); return; }

    const clubIds = memberRows.map(m => m.club_id);
    const { data } = await supabase
      .from('clubs')
      .select('*')
      .in('id', clubIds)
      .order('created_at', { ascending: false });

    setClubs(data || []);
    setLoading(false);
  };

  const fetchMembers = async (clubId: string) => {
    const { data: memberData } = await supabase
      .from('club_members')
      .select('*')
      .eq('club_id', clubId)
      .order('role');

    if (memberData) {
      // Fetch display names
      const userIds = memberData.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
      setMembers(memberData.map(m => ({ ...m, display_name: nameMap.get(m.user_id) || m.user_id.slice(0, 8) })));
    }
  };

  const fetchInvites = async (clubId: string) => {
    const { data } = await supabase
      .from('club_invites')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
    setInvites(data || []);
  };

  useEffect(() => { fetchClubs(); }, [user]);

  useEffect(() => {
    if (selectedClub) {
      fetchMembers(selectedClub.id);
      fetchInvites(selectedClub.id);
    }
  }, [selectedClub]);

  const handleCreateClub = async () => {
    if (!user || !newClubName.trim()) return;
    const { data, error } = await supabase
      .from('clubs')
      .insert({ name: newClubName.trim(), description: newClubDesc.trim() || null, created_by: user.id })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    toast.success(t('club_created'));
    setNewClubName('');
    setNewClubDesc('');
    setCreateOpen(false);
    await fetchClubs();
    setSelectedClub(data);
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleCreateInvite = async () => {
    if (!user || !selectedClub) return;
    const code = generateInviteCode();
    const { error } = await supabase
      .from('club_invites')
      .insert({ club_id: selectedClub.id, invite_code: code, created_by: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success(t('club_invite_created'));
    fetchInvites(selectedClub.id);
  };

  const handleDeleteInvite = async (id: string) => {
    await supabase.from('club_invites').delete().eq('id', id);
    if (selectedClub) fetchInvites(selectedClub.id);
  };

  const handleJoinClub = async () => {
    if (!user || !joinCode.trim()) return;
    const code = joinCode.trim().toUpperCase();

    const { data: invite } = await supabase
      .from('club_invites')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();

    if (!invite) { toast.error(t('club_invalid_code')); return; }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      toast.error(t('club_code_expired'));
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('club_members')
      .select('id')
      .eq('club_id', invite.club_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) { toast.info(t('club_already_member')); setJoinOpen(false); return; }

    const { error } = await supabase
      .from('club_members')
      .insert({ club_id: invite.club_id, user_id: user.id, role: 'member', invited_by: invite.created_by });

    if (error) { toast.error(error.message); return; }
    toast.success(t('club_joined'));
    setJoinCode('');
    setJoinOpen(false);
    await fetchClubs();
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from('club_members')
      .update({ role: newRole })
      .eq('id', memberId);
    if (error) { toast.error(error.message); return; }
    toast.success(t('club_role_updated'));
    if (selectedClub) fetchMembers(selectedClub.id);
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase.from('club_members').delete().eq('id', memberId);
    if (error) { toast.error(error.message); return; }
    if (selectedClub) fetchMembers(selectedClub.id);
  };

  const isOwnerOfSelected = selectedClub?.created_by === user?.id;
  const myRoleInSelected = members.find(m => m.user_id === user?.id)?.role;
  const canManage = myRoleInSelected === 'owner' || myRoleInSelected === 'organizer';

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t('club_code_copied'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('club_title')}</h1>
        <div className="flex gap-2">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <LogIn className="h-4 w-4 mr-2" />{t('club_join')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('club_join_title')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder={t('club_enter_code')}
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  className="uppercase tracking-widest text-center text-lg font-mono"
                  maxLength={12}
                />
                <Button onClick={handleJoinClub} className="w-full" disabled={joinCode.length < 4}>
                  {t('club_join')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />{t('club_create')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('club_create_title')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder={t('club_name_placeholder')}
                  value={newClubName}
                  onChange={e => setNewClubName(e.target.value)}
                />
                <Input
                  placeholder={t('club_desc_placeholder')}
                  value={newClubDesc}
                  onChange={e => setNewClubDesc(e.target.value)}
                />
                <Button onClick={handleCreateClub} className="w-full" disabled={!newClubName.trim()}>
                  {t('club_create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {clubs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{t('club_empty')}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Club list */}
        <div className="space-y-3">
          {clubs.map(club => (
            <Card
              key={club.id}
              className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedClub?.id === club.id ? 'border-primary' : ''}`}
              onClick={() => setSelectedClub(club)}
            >
              <CardHeader className="py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {club.name}
                </CardTitle>
                {club.description && (
                  <CardDescription className="text-xs">{club.description}</CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Club detail */}
        {selectedClub && (
          <div className="lg:col-span-2 space-y-6">
            {/* Members */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('club_members')} ({members.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      {roleIcon(member.role)}
                      <span className="text-sm">{member.display_name}</span>
                      <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                    </div>
                    {isOwnerOfSelected && member.user_id !== user?.id && (
                      <div className="flex gap-1">
                        {member.role === 'member' && (
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateRole(member.id, 'organizer')}>
                            → {t('club_role_organizer')}
                          </Button>
                        )}
                        {member.role === 'organizer' && (
                          <Button variant="ghost" size="sm" onClick={() => handleUpdateRole(member.id, 'member')}>
                            → {t('club_role_member')}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveMember(member.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Invites — only for owner */}
            {isOwnerOfSelected && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{t('club_invites')}</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleCreateInvite}>
                    <Plus className="h-4 w-4 mr-1" />{t('club_generate_code')}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {invites.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('club_no_invites')}</p>
                  )}
                  {invites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <code className="font-mono text-sm tracking-widest bg-muted px-3 py-1 rounded">{inv.invite_code}</code>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => copyCode(inv.invite_code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteInvite(inv.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clubs;
