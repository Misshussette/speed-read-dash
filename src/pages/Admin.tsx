import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, FileUp, Shield, RefreshCw, Bug, MessageSquareHeart, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import AdminIssues from '@/pages/AdminIssues';
import { toast } from 'sonner';

interface UserRow { id: string; user_id: string; display_name: string | null; created_at: string; }
interface EventRow { id: string; name: string; created_by: string; club_id: string | null; created_at: string; }
interface ImportRow { id: string; filename: string | null; status: string; rows_processed: number; error_message: string | null; created_at: string; completed_at: string | null; created_by: string; }
interface RoleRow { id: string; user_id: string; role: string; }

const statusColor = (s: string) => {
  switch (s) {
    case 'complete': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'processing': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const Admin = () => {
  const navigate = useNavigate();
  const { isPlatformAdmin, loading: roleLoading } = useUserRole();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [profilesRes, eventsRes, importsRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('events').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('imports').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('user_roles').select('*'),
    ]);
    if (profilesRes.data) setUsers(profilesRes.data as UserRow[]);
    if (eventsRes.data) setEvents(eventsRes.data as EventRow[]);
    if (importsRes.data) setImports(importsRes.data as ImportRow[]);
    if (rolesRes.data) setRoles(rolesRes.data as RoleRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isPlatformAdmin) fetchAll();
  }, [isPlatformAdmin]);

  const getUserRole = (userId: string) => {
    const r = roles.find(r => r.user_id === userId);
    return r?.role || 'user';
  };

  const getUserName = (userId: string) => {
    const u = users.find(u => u.user_id === userId);
    return u?.display_name || userId.slice(0, 8) + '...';
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Shield className="h-12 w-12 text-destructive" />
        <p className="text-foreground font-semibold text-lg">Access Denied</p>
        <p className="text-muted-foreground text-sm">This page is restricted to platform administrators.</p>
        <Button variant="outline" onClick={() => navigate('/events')}>Back to Events</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Admin</h1>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">Platform</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/feedback')}>
            <MessageSquareHeart className="h-4 w-4 mr-1" /> Beta Feedback
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6 flex items-center gap-4">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 flex items-center gap-4">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{events.length}</p>
              <p className="text-xs text-muted-foreground">Events</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 flex items-center gap-4">
            <FileUp className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{imports.length}</p>
              <p className="text-xs text-muted-foreground">Imports</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="imports">Imports</TabsTrigger>
          <TabsTrigger value="beta" className="flex items-center gap-1"><FlaskConical className="h-3 w-3" /> Beta</TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-1"><Bug className="h-3 w-3" /> Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Users</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="text-sm">{u.display_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{getUserRole(u.user_id)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Events</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Creator</TableHead>
                    <TableHead className="text-xs">Club</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm font-medium">{e.name}</TableCell>
                      <TableCell className="text-xs">{getUserName(e.created_by)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.club_id ? 'Yes' : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imports">
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Imports</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">File</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Rows</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map(imp => (
                    <TableRow key={imp.id}>
                      <TableCell className="text-sm truncate max-w-[200px]">{imp.filename || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusColor(imp.status)}`}>
                          {imp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{imp.rows_processed}</TableCell>
                      <TableCell className="text-xs">{getUserName(imp.created_by)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(imp.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-destructive truncate max-w-[200px]">
                        {imp.error_message || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beta">
          <BetaUsersTab users={users} />
        </TabsContent>

        <TabsContent value="issues">
          <AdminIssues />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ── Beta Users Sub-Tab ── */
function BetaUsersTab({ users }: { users: UserRow[] }) {
  const [betaStatus, setBetaStatus] = useState<Record<string, boolean>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('profiles').select('user_id, beta_opt_in').then(({ data }) => {
      if (data) {
        const map: Record<string, boolean> = {};
        (data as any[]).forEach(p => { map[p.user_id] = !!p.beta_opt_in; });
        setBetaStatus(map);
      }
    });
  }, []);

  const toggleBeta = async (userId: string, name: string) => {
    const current = !!betaStatus[userId];
    setLoadingId(userId);
    const { error } = await supabase.from('profiles').update({ beta_opt_in: !current } as any).eq('user_id', userId);
    setLoadingId(null);
    if (error) { toast.error(error.message); return; }
    setBetaStatus(prev => ({ ...prev, [userId]: !current }));
    toast.success(!current ? `Beta enabled for ${name}` : `Beta disabled for ${name}`);
  };

  const betaUsers = users.filter(u => betaStatus[u.user_id]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Beta Users
          <Badge variant="outline" className="text-xs">{betaUsers.length} active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Joined</TableHead>
              <TableHead className="text-xs text-right">Beta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="text-sm">{u.display_name || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Switch
                    checked={!!betaStatus[u.user_id]}
                    onCheckedChange={() => toggleBeta(u.user_id, u.display_name || u.user_id.slice(0, 8))}
                    disabled={loadingId === u.user_id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default Admin;
