import { useCallback, useMemo, useState } from 'react';
import { Upload, Trash2, Check, Download, Plus, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { useI18n } from '@/i18n/I18nContext';
import { applyFilters } from '@/lib/metrics';
import { exportFilteredCSV } from '@/lib/export';
import { toast } from 'sonner';

const SessionManager = () => {
  const { t } = useI18n();
  const {
    sessions, activeSessionId, setActiveSessionId,
    uploadFile, removeSession, isLoading,
    rawData, filters, scope, scopedData,
    events, activeEventId, setActiveEventId, createEvent,
  } = useTelemetry();

  const [newEventName, setNewEventName] = useState('');
  const [showNewEvent, setShowNewEvent] = useState(false);

  const analysisBase = scope.enabled ? scopedData : rawData;
  const filteredData = useMemo(() => applyFilters(analysisBase, filters), [analysisBase, filters]);

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
    await createEvent(newEventName.trim());
    setNewEventName('');
    setShowNewEvent(false);
    toast.success('Event created!');
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-foreground">{t('session_manager')}</CardTitle>
        <div className="flex items-center gap-2">
          {/* Event selector */}
          <div className="flex items-center gap-1">
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
            {events.length > 0 ? (
              <Select value={activeEventId || ''} onValueChange={setActiveEventId}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Select event" />
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

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => exportFilteredCSV(filteredData)}
            disabled={filteredData.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            {t('export_csv')}
          </Button>
          <input id="session-csv-input" type="file" accept=".csv" className="hidden" onChange={onFileSelect} />
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={isLoading || !activeEventId}
            onClick={() => document.getElementById('session-csv-input')?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            {isLoading ? t('upload_parsing') : t('session_add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* New event form */}
        {showNewEvent && (
          <div className="flex items-center gap-2 mb-3">
            <Input
              placeholder="Event name (e.g. 24h Le Mans 2025)"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="text-xs h-8"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()}
            />
            <Button size="sm" className="text-xs h-8" onClick={handleCreateEvent} disabled={!newEventName.trim()}>
              Create
            </Button>
          </div>
        )}

        {!activeEventId ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Create an event to start uploading sessions.</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t('session_empty')}</p>
        ) : (
          <div className="relative w-full overflow-auto max-h-[280px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-xs">{t('filter_label_track')}</TableHead>
                  <TableHead className="text-xs">{t('filter_label_car')}</TableHead>
                  <TableHead className="text-xs">{t('session_col_date')}</TableHead>
                  <TableHead className="text-xs text-right">{t('kpi_total_laps')}</TableHead>
                  <TableHead className="text-xs">{t('session_col_file')}</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map(s => (
                  <TableRow
                    key={s.id}
                    className={`cursor-pointer ${s.id === activeSessionId ? 'bg-primary/10' : ''}`}
                    onClick={() => setActiveSessionId(s.id)}
                  >
                    <TableCell className="px-2">
                      {s.id === activeSessionId && <Check className="h-4 w-4 text-primary" />}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{s.track || '—'}</TableCell>
                    <TableCell className="text-xs">{s.car_model || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.date || '—'}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{s.laps}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{s.filename}</TableCell>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionManager;
