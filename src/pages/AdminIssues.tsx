import { useState, useEffect } from 'react';
import { Bug, MessageSquare, RefreshCw, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IssueRow {
  id: string; user_id: string; version: string | null; type: string;
  description: string; current_page: string | null; status: string;
  admin_comment: string | null; release_id: string | null; created_at: string;
}

interface VersionRow { id: string; version: string; channel: string; release_notes_short: string | null; released_at: string; active: boolean; }

const statusIcon = (s: string) => {
  switch (s) {
    case 'open': return <Clock className="h-3 w-3 text-yellow-400" />;
    case 'in_progress': return <Bug className="h-3 w-3 text-blue-400" />;
    case 'resolved': return <CheckCircle2 className="h-3 w-3 text-green-400" />;
    case 'closed': case 'wont_fix': return <XCircle className="h-3 w-3 text-muted-foreground" />;
    default: return null;
  }
};

const AdminIssues = () => {
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [newChannel, setNewChannel] = useState<'stable' | 'beta'>('beta');
  const [newNotes, setNewNotes] = useState('');
  const [selectedIssuesForRelease, setSelectedIssuesForRelease] = useState<string[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    const [issuesRes, versionsRes] = await Promise.all([
      supabase.from('issues').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('app_versions').select('*').order('released_at', { ascending: false }),
    ]);
    if (issuesRes.data) setIssues(issuesRes.data as any);
    if (versionsRes.data) setVersions(versionsRes.data as any);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('issues').update({ status } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const saveComment = async (id: string) => {
    const { error } = await supabase.from('issues').update({ admin_comment: commentText } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setIssues(prev => prev.map(i => i.id === id ? { ...i, admin_comment: commentText } : i));
    setCommentingId(null);
    toast.success('Comment saved');
  };

  const createRelease = async () => {
    if (!newVersion.trim()) return;
    const { data, error } = await supabase.from('app_versions').insert({
      version: newVersion.trim(), channel: newChannel, release_notes_short: newNotes.trim() || null, active: true,
    } as any).select().single();
    if (error) { toast.error(error.message); return; }
    // Link selected issues to release
    if (data && selectedIssuesForRelease.length > 0) {
      for (const issueId of selectedIssuesForRelease) {
        await supabase.from('issues').update({ release_id: (data as any).id, status: 'resolved' } as any).eq('id', issueId);
      }
    }
    toast.success(`Release ${newVersion} created`);
    setNewVersion(''); setNewNotes(''); setSelectedIssuesForRelease([]);
    fetchAll();
  };

  const toggleIssueForRelease = (id: string) => {
    setSelectedIssuesForRelease(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      {/* Issues table */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Bug className="h-4 w-4 text-primary" /> Issues ({issues.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-8"></TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Version</TableHead>
                <TableHead className="text-xs">Page</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map(issue => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <input type="checkbox" checked={selectedIssuesForRelease.includes(issue.id)}
                      onChange={() => toggleIssueForRelease(issue.id)} className="rounded" />
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{issue.type}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[300px] truncate">{issue.description}</TableCell>
                  <TableCell className="text-xs font-mono">{issue.version || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{issue.current_page || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {statusIcon(issue.status)}
                      <Select value={issue.status} onValueChange={v => updateStatus(issue.id, v)}>
                        <SelectTrigger className="h-6 text-[10px] w-[90px] border-0 p-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['open', 'in_progress', 'resolved', 'closed', 'wont_fix'].map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(issue.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setCommentingId(issue.id); setCommentText(issue.admin_comment || ''); }}>
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Comment dialog */}
      <Dialog open={!!commentingId} onOpenChange={o => { if (!o) setCommentingId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">Admin Comment</DialogTitle></DialogHeader>
          <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} className="text-sm" />
          <Button size="sm" onClick={() => commentingId && saveComment(commentingId)}>Save</Button>
        </DialogContent>
      </Dialog>

      {/* Release Builder */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Release Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedIssuesForRelease.length > 0 && (
            <p className="text-xs text-muted-foreground">{selectedIssuesForRelease.length} issue(s) selected for release</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Version</Label>
              <Input value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="0.2.0" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Channel</Label>
              <Select value={newChannel} onValueChange={v => setNewChannel(v as any)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable" className="text-xs">Stable</SelectItem>
                  <SelectItem value="beta" className="text-xs">Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Release Notes</Label>
            <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="What's new..." className="text-sm min-h-[60px]" />
          </div>
          <Button size="sm" disabled={!newVersion.trim()} onClick={createRelease}>Create Release</Button>
        </CardContent>
      </Card>

      {/* Versions list */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Versions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Version</TableHead>
                <TableHead className="text-xs">Channel</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
                <TableHead className="text-xs">Released</TableHead>
                <TableHead className="text-xs">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="text-sm font-mono">{v.version}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{v.channel}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[300px] truncate">{v.release_notes_short || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(v.released_at).toLocaleDateString()}</TableCell>
                  <TableCell>{v.active ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminIssues;
