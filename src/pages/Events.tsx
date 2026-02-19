import { useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Trash2, FolderOpen, Plus, Building2, FileText, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from 'sonner';

const Events = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const {
    sessions, uploadFile, removeSession, isLoading,
    clubs, activeClubId, setActiveClubId,
    events, activeEventId, setActiveEventId, createEvent,
  } = useTelemetry();

  const [newEventName, setNewEventName] = useState('');
  const [showNewEvent, setShowNewEvent] = useState(false);

  const onFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error(t('upload_error_csv'));
      return;
    }
    await uploadFile(file);
    e.target.value = '';
  }, [uploadFile, t]);

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) return;
    await createEvent(newEventName.trim(), activeClubId);
    setNewEventName('');
    setShowNewEvent(false);
    toast.success(t('event_created'));
  };

  const openSession = (sessionId: string) => {
    navigate(`/analysis/${sessionId}`);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t('nav_events')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Club selector */}
          {clubs.length > 0 && (
            <div className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={activeClubId || 'personal'} onValueChange={(v) => setActiveClubId(v === 'personal' ? null : v)}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal" className="text-xs">Personal</SelectItem>
                  {clubs.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Event selector */}
          <div className="flex items-center gap-1">
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
            {events.length > 0 ? (
              <Select value={activeEventId || ''} onValueChange={setActiveEventId}>
                <SelectTrigger className="h-8 text-xs w-[160px]">
                  <SelectValue placeholder={t('event_select')} />
                </SelectTrigger>
                <SelectContent>
                  {events.map(ev => (
                    <SelectItem key={ev.id} value={ev.id} className="text-xs">{ev.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowNewEvent(!showNewEvent)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* New event form */}
      {showNewEvent && (
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('event_name_placeholder')}
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="text-sm h-9"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()}
              />
              <Button size="sm" onClick={handleCreateEvent} disabled={!newEventName.trim()}>
                {t('event_create')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload area */}
      <Card className="bg-card border-border border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => document.getElementById('events-csv-input')?.click()}>
        <CardContent className="py-8 flex flex-col items-center gap-2">
          <input id="events-csv-input" type="file" accept=".csv" className="hidden" onChange={onFileSelect} />
          <Upload className={`h-8 w-8 ${isLoading ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
          <p className="text-sm text-foreground font-medium">
            {isLoading ? t('upload_parsing') : t('upload_drop')}
          </p>
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
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {t('sessions_title')} ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('session_col_name')}</TableHead>
                  <TableHead className="text-xs">{t('filter_label_track')}</TableHead>
                  <TableHead className="text-xs">{t('filter_label_car')}</TableHead>
                  <TableHead className="text-xs">{t('session_col_date')}</TableHead>
                  <TableHead className="text-xs text-right">{t('kpi_total_laps')}</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map(s => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openSession(s.id)}
                  >
                    <TableCell className="text-sm font-medium text-foreground">
                      {s.filename?.replace(/\.csv$/i, '') || '—'}
                    </TableCell>
                    <TableCell className="text-xs">{s.track || '—'}</TableCell>
                    <TableCell className="text-xs">{s.car_model || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.date || '—'}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{s.laps}</TableCell>
                    <TableCell className="px-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); removeSession(s.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Events;
