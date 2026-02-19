import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, MessageSquareHeart, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';

interface BugReport {
  id: string; user_id: string; created_at: string;
  context: string; expected_behavior: string; actual_behavior: string;
  run_reference: string | null; environment: string | null;
  screenshot_url: string | null; status: string;
}
interface FeedbackEntry {
  id: string; user_id: string; created_at: string; answers_json: Record<string, string>;
}

const statusBadge = (s: string) => {
  switch (s) {
    case 'new': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'reviewing': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'resolved': return 'bg-green-500/10 text-green-400 border-green-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

export default function AdminFeedback() {
  const navigate = useNavigate();
  const { isPlatformAdmin, loading } = useUserRole();
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = async () => {
    setLoadingData(true);
    const [bugRes, fbRes] = await Promise.all([
      supabase.from('beta_bug_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('beta_feedback').select('*').order('created_at', { ascending: false }),
    ]);
    if (bugRes.data) setBugs(bugRes.data as BugReport[]);
    if (fbRes.data) setFeedback(fbRes.data as FeedbackEntry[]);
    setLoadingData(false);
  };

  useEffect(() => { if (isPlatformAdmin) fetchData(); }, [isPlatformAdmin]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!isPlatformAdmin) { navigate('/events'); return null; }

  const updateBugStatus = async (id: string, status: string) => {
    await supabase.from('beta_bug_reports').update({ status }).eq('id', id);
    setBugs(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold text-foreground">Beta Feedback</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loadingData}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingData ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      <Tabs defaultValue="bugs">
        <TabsList>
          <TabsTrigger value="bugs" className="text-xs"><Bug className="h-3 w-3 mr-1" />Bug Reports ({bugs.length})</TabsTrigger>
          <TabsTrigger value="survey" className="text-xs"><MessageSquareHeart className="h-3 w-3 mr-1" />Questionnaires ({feedback.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bugs">
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Context</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bugs.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(b.created_at)}</TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{b.context || '—'}</TableCell>
                      <TableCell>
                        <Select value={b.status} onValueChange={v => updateBugStatus(b.id, v)}>
                          <SelectTrigger className="h-6 text-[10px] w-[100px]">
                            <Badge variant="outline" className={`text-[10px] ${statusBadge(b.status)}`}>{b.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new" className="text-xs">New</SelectItem>
                            <SelectItem value="reviewing" className="text-xs">Reviewing</SelectItem>
                            <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-xs">Details</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle className="text-sm">Bug Report</DialogTitle></DialogHeader>
                            <div className="space-y-3 text-sm">
                              <Detail label="What were you doing?" value={b.context} />
                              <Detail label="Expected" value={b.expected_behavior} />
                              <Detail label="Actual" value={b.actual_behavior} />
                              {b.run_reference && <Detail label="Run / Course" value={b.run_reference} />}
                              {b.environment && <Detail label="Environment" value={b.environment} />}
                              {b.screenshot_url && (
                                <div>
                                  <span className="text-xs text-muted-foreground">Screenshot</span>
                                  <img src={b.screenshot_url} alt="screenshot" className="mt-1 rounded border border-border max-h-[300px]" />
                                </div>
                              )}
                              <Detail label="User ID" value={b.user_id} />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bugs.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">No bug reports yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="survey">
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Answers</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedback.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(f.created_at)}</TableCell>
                      <TableCell className="text-xs font-mono truncate max-w-[120px]">{f.user_id.slice(0, 8)}…</TableCell>
                      <TableCell className="text-xs">{Object.keys(f.answers_json).length} answers</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-xs">Details</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
                            <DialogHeader><DialogTitle className="text-sm">Questionnaire Response</DialogTitle></DialogHeader>
                            <div className="space-y-2 text-sm">
                              {Object.entries(f.answers_json).map(([k, v]) => (
                                <Detail key={k} label={k} value={String(v)} />
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {feedback.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">No questionnaire submissions yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{value || '—'}</p>
    </div>
  );
}
