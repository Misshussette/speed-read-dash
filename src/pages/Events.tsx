import { useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MdbRaceSelector, { type RaceCatalogEntry, type MdbImportOptions } from '@/components/MdbRaceSelector';
import { Upload, Trash2, FolderOpen, Plus, Building2, FileText, BarChart3, GitCompareArrows, Search, Pencil, Check, X, ChevronDown, Tag, Share2, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { useGarage } from '@/contexts/GarageContext';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from 'sonner';
import type { SessionMeta } from '@/types/telemetry';

type GroupBy = 'none' | 'track' | 'date' | 'event_type';

const Events = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const {
    sessions, uploadFile, uploadMdbFile, importMdbRaces, removeSession, isLoading, updateSessionMeta, moveSessionsToEvent,
    clubs, activeClubId, setActiveClubId,
    events, activeEventId, setActiveEventId, createEvent, updateEvent,
    comparisonSessions, toggleComparisonSession, clearComparisonSessions,
  } = useTelemetry();
  const { configurations } = useGarage();

  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());

  const [newEventName, setNewEventName] = useState('');
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);

  // MDB state
  const [mdbCatalog, setMdbCatalog] = useState<RaceCatalogEntry[]>([]);
  const [mdbImportId, setMdbImportId] = useState<string | null>(null);
  const [mdbFilePath, setMdbFilePath] = useState<string | null>(null);
  const [showMdbSelector, setShowMdbSelector] = useState(false);
  const [isMdbImporting, setIsMdbImporting] = useState(false);
  const [mdbFile, setMdbFile] = useState<File | null>(null);

  const onFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isMdb = file.name.toLowerCase().endsWith('.mdb');
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    if (!isCsv && !isMdb) {
      toast.error(t('upload_error_format'));
      e.target.value = '';
      return;
    }

    if (isMdb) {
      // MDB: two-phase import — keep File reference for client-side parsing
      setMdbFile(file);
      const result = await uploadMdbFile(file);
      if (result) {
        setMdbCatalog(result.catalog);
        setMdbImportId(result.import_id);
        setMdbFilePath(result.file_path);
        setShowMdbSelector(true);
        toast.success(t('mdb_scan_complete'));
      }
    } else {
      await uploadFile(file);
    }

    e.target.value = '';
  }, [uploadFile, uploadMdbFile, t]);

  const handleMdbImport = useCallback(async (options: MdbImportOptions) => {
    if (!mdbImportId || !mdbFilePath) return;
    setIsMdbImporting(true);
    try {
      await importMdbRaces(mdbImportId, mdbFilePath, options.raceIds, undefined, mdbCatalog, mdbFile ?? undefined, {
        drivers: options.drivers,
        bestLapsOnly: options.bestLapsOnly,
      });
    } finally {
      setIsMdbImporting(false);
      setShowMdbSelector(false);
      setMdbCatalog([]);
      setMdbImportId(null);
      setMdbFilePath(null);
      setMdbFile(null);
    }
  }, [mdbImportId, mdbFilePath, mdbFile, importMdbRaces, mdbCatalog, t]);

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) return;
    await createEvent(newEventName.trim(), activeClubId);
    setNewEventName('');
    setShowNewEvent(false);
    toast.success(t('event_created'));
  };

  const openSession = (sessionId: string) => navigate(`/analysis/${sessionId}`);

  const startRename = (s: SessionMeta) => {
    setRenamingId(s.id);
    setRenameValue(s.display_name || s.filename?.replace(/\.csv$/i, '') || '');
  };

  const confirmRename = async () => {
    if (!renamingId || !renameValue.trim()) return;
    await updateSessionMeta(renamingId, { display_name: renameValue.trim() });
    setRenamingId(null);
    toast.success(t('session_renamed'));
  };

  const getDisplayName = (s: SessionMeta) => s.display_name || s.filename?.replace(/\.csv$/i, '') || '—';

  // Search + filter (client-side)
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(s => {
      const name = getDisplayName(s).toLowerCase();
      const track = (s.track || '').toLowerCase();
      const tags = (s.tags || []).join(' ').toLowerCase();
      const eventType = (s.event_type || '').toLowerCase();
      // Check configuration names
      const configMatch = configurations.some(c =>
        c.name.toLowerCase().includes(q)
      );
      return name.includes(q) || track.includes(q) || tags.includes(q) || eventType.includes(q) || configMatch;
    });
  }, [sessions, searchQuery, configurations]);

  // Grouping
  const groupedSessions = useMemo(() => {
    if (groupBy === 'none') return [{ key: '', sessions: filteredSessions }];
    const groups: Record<string, SessionMeta[]> = {};
    for (const s of filteredSessions) {
      let key = '';
      if (groupBy === 'track') key = s.track || t('session_no_track');
      else if (groupBy === 'date') key = s.date || t('session_no_date');
      else if (groupBy === 'event_type') key = s.event_type || t('session_no_type');
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return Object.entries(groups).map(([key, sessions]) => ({ key, sessions }));
  }, [filteredSessions, groupBy, t]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t('nav_runs')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {clubs.length > 0 && (
            <div className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={activeClubId || 'personal'} onValueChange={(v) => setActiveClubId(v === 'personal' ? null : v)}>
                <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal" className="text-xs">Personal</SelectItem>
                  {clubs.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-1">
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
            {events.length > 0 ? (
              <Select value={activeEventId || ''} onValueChange={setActiveEventId}>
                <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue placeholder={t('event_select')} /></SelectTrigger>
                <SelectContent>
                  {events.map(ev => (
                    <SelectItem key={ev.id} value={ev.id} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        {ev.name}
                        {ev.club_id && <Share2 className="h-2.5 w-2.5 text-primary" />}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNewEvent(!showNewEvent)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Share event with club */}
          {activeEventId && clubs.length > 0 && (() => {
            const activeEvent = events.find(e => e.id === activeEventId);
            if (!activeEvent) return null;
            return (
              <div className="flex items-center gap-1">
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                <Select
                  value={activeEvent.club_id || 'none'}
                  onValueChange={(v) => updateEvent(activeEventId, { club_id: v === 'none' ? null : v })}
                >
                  <SelectTrigger className="h-8 text-xs w-[150px]">
                    <SelectValue placeholder={t('event_share_club')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">{t('event_not_shared')}</SelectItem>
                    {clubs.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })()}
        </div>
      </div>

      {showNewEvent && (
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Input placeholder={t('event_name_placeholder')} value={newEventName} onChange={(e) => setNewEventName(e.target.value)}
                className="text-sm h-9" onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()} />
              <Button size="sm" onClick={handleCreateEvent} disabled={!newEventName.trim()}>{t('event_create')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compare Bar */}
      {comparisonSessions.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {t('compare_selected').replace('{count}', String(comparisonSessions.length))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 text-xs" disabled={comparisonSessions.length < 2} onClick={() => navigate('/comparison')}>
                {t('events_open_comparison')}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearComparisonSessions}>{t('compare_clear')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Move Bar */}
      {selectedRunIds.size > 0 && (
        <Card className="bg-accent/10 border-accent/30">
          <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-accent-foreground" />
              <span className="text-sm font-medium text-foreground">
                {t('runs_selected').replace('{count}', String(selectedRunIds.size))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select onValueChange={async (targetEventId) => {
                if (targetEventId === activeEventId) return;
                await moveSessionsToEvent(Array.from(selectedRunIds), targetEventId);
                setSelectedRunIds(new Set());
                toast.success(t('runs_moved'));
              }}>
                <SelectTrigger className="h-7 text-xs w-[180px]">
                  <SelectValue placeholder={t('runs_move_to_event')} />
                </SelectTrigger>
                <SelectContent>
                  {events.filter(e => e.id !== activeEventId).map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedRunIds(new Set())}>{t('compare_clear')}</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Upload */}
      <Card className="bg-card border-border border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => document.getElementById('events-csv-input')?.click()}>
        <CardContent className="py-8 flex flex-col items-center gap-2">
          <input id="events-csv-input" type="file" accept=".csv,.mdb" className="hidden" onChange={onFileSelect} />
          <Upload className={`h-8 w-8 ${isLoading ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          <p className="text-sm text-foreground font-medium">{isLoading ? t('upload_parsing') : t('upload_drop')}</p>
          <p className="text-xs text-muted-foreground">{t('upload_browse')}</p>
        </CardContent>
      </Card>

      {/* Session list */}
      {!activeEventId ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t('event_no_event')}</p>
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t('session_empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search + Group controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('session_search_placeholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={groupBy} onValueChange={v => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder={t('session_group_by')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">{t('session_group_none')}</SelectItem>
                <SelectItem value="track" className="text-xs">{t('filter_label_track')}</SelectItem>
                <SelectItem value="date" className="text-xs">{t('session_col_date')}</SelectItem>
                <SelectItem value="event_type" className="text-xs">{t('session_event_type')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {groupedSessions.map(group => (
            <Card key={group.key || '__all'} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  {group.key ? group.key : t('runs_title')} ({group.sessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          checked={group.sessions.length > 0 && group.sessions.every(s => selectedRunIds.has(s.id))}
                          onCheckedChange={(checked) => {
                            setSelectedRunIds(prev => {
                              const next = new Set(prev);
                              group.sessions.forEach(s => checked ? next.add(s.id) : next.delete(s.id));
                              return next;
                            });
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-xs">{t('session_col_name')}</TableHead>
                      <TableHead className="text-xs">{t('filter_label_track')}</TableHead>
                      <TableHead className="text-xs">{t('filter_label_car')}</TableHead>
                      <TableHead className="text-xs">{t('session_col_date')}</TableHead>
                      <TableHead className="text-xs text-right">{t('kpi_total_laps')}</TableHead>
                      <TableHead className="text-xs text-right">{t('events_actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.sessions.map(s => {
                      const isComparing = comparisonSessions.includes(s.id);
                      const isRenaming = renamingId === s.id;
                      const isSelected = selectedRunIds.has(s.id);
                      return (
                        <TableRow key={s.id} className="group">
                          <TableCell className="w-8">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                setSelectedRunIds(prev => {
                                  const next = new Set(prev);
                                  checked ? next.add(s.id) : next.delete(s.id);
                                  return next;
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-sm font-medium text-foreground">
                            <div className="flex items-center gap-1.5">
                              {isRenaming ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={renameValue}
                                    onChange={e => setRenameValue(e.target.value)}
                                    className="h-6 text-sm w-40"
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null); }}
                                  />
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={confirmRename}><Check className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setRenamingId(null)}><X className="h-3 w-3" /></Button>
                                </div>
                              ) : (
                                <>
                                  <span>{getDisplayName(s)}</span>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); startRename(s); }}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {(s.tags || []).length > 0 && (
                                <div className="flex gap-1 ml-1">
                                  {s.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            {s.display_name && s.filename && (
                              <span className="text-[10px] text-muted-foreground">{s.filename}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{s.track || '—'}</TableCell>
                          <TableCell className="text-xs">{s.car_model || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.date || '—'}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{s.laps}</TableCell>
                          <TableCell className="px-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => openSession(s.id)}>
                                <BarChart3 className="h-3 w-3 mr-1" />{t('runs_open')}
                              </Button>
                              <Button variant={isComparing ? 'default' : 'outline'} size="sm" className="h-6 text-xs px-2"
                                onClick={(e) => { e.stopPropagation(); toggleComparisonSession(s.id); }}>
                                <GitCompareArrows className="h-3 w-3 mr-1" />{isComparing ? t('compare_remove') : t('compare_add')}
                              </Button>
                              <SessionMetaDialog session={s} onUpdate={updateSessionMeta} />
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); removeSession(s.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* MDB Race Selector Dialog */}
      <MdbRaceSelector
        open={showMdbSelector}
        onOpenChange={setShowMdbSelector}
        catalog={mdbCatalog}
        isImporting={isMdbImporting}
        onImport={handleMdbImport}
      />
    </div>
  );
};

/* ── Session Metadata Edit Dialog ── */
function SessionMetaDialog({ session, onUpdate }: {
  session: SessionMeta;
  onUpdate: (id: string, updates: Partial<Pick<SessionMeta, 'display_name' | 'tags' | 'notes' | 'event_type' | 'track'>>) => Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [track, setTrack] = useState(session.track || '');
  const [eventType, setEventType] = useState(session.event_type || '');
  const [notes, setNotes] = useState(session.notes || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(session.tags || []);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setTrack(session.track || '');
      setEventType(session.event_type || '');
      setNotes(session.notes || '');
      setTags(session.tags || []);
    }
  };

  const addTag = () => {
    if (!tagInput.trim() || tags.includes(tagInput.trim())) return;
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const handleSave = async () => {
    await onUpdate(session.id, { track: track.trim() || session.track, event_type: eventType.trim() || null, notes: notes.trim() || null, tags });
    setOpen(false);
    toast.success(t('session_meta_saved'));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => e.stopPropagation()}>
          <Tag className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-sm">{t('session_edit_meta')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('session_source_name')}</label>
            <p className="text-xs text-foreground bg-muted/50 rounded px-2 py-1.5 mt-1">{session.filename || '—'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('filter_label_track')}</label>
            <Input value={track} onChange={e => setTrack(e.target.value)} className="text-sm h-8 mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('session_event_type')}</label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder={t('session_select_type')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="practice">Practice</SelectItem>
                <SelectItem value="qualifying">Qualifying</SelectItem>
                <SelectItem value="race">Race</SelectItem>
                <SelectItem value="endurance">Endurance</SelectItem>
                <SelectItem value="test">Test</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('garage_tags')}</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)}><X className="h-2.5 w-2.5" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <Input placeholder={t('session_add_tag')} value={tagInput} onChange={e => setTagInput(e.target.value)}
                className="text-sm h-7 flex-1" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addTag} disabled={!tagInput.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t('garage_notes')}</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[60px] mt-1" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{t('garage_cancel')}</Button>
            <Button size="sm" onClick={handleSave}>{t('garage_save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Events;
