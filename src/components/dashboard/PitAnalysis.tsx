import { useMemo } from 'react';
import { LapRecord } from '@/types/telemetry';
import { extractPitEvents, formatLapTime } from '@/lib/metrics';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PitAnalysis = ({ data }: { data: LapRecord[] }) => {
  const { t } = useI18n();
  const pitEvents = useMemo(() => extractPitEvents(data), [data]);

  const summary = useMemo(() => {
    const types = [...new Set(pitEvents.map(p => p.pit_type))];
    return types.map(type => {
      const events = pitEvents.filter(p => p.pit_type === type);
      const times = events.map(p => p.pit_time_s).filter(Boolean) as number[];
      return {
        type,
        count: events.length,
        avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null,
      };
    });
  }, [pitEvents]);

  if (pitEvents.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map(s => (
          <Card key={s.type} className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{s.type}</p>
              <p className="text-lg font-mono font-semibold text-foreground">{s.count}×</p>
              {s.avgTime && <p className="text-xs text-muted-foreground">Avg: {s.avgTime.toFixed(1)}s</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">{t('chart_pit_events')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t('pit_col_lap')}</TableHead>
                <TableHead className="text-xs">{t('pit_col_driver')}</TableHead>
                <TableHead className="text-xs">{t('pit_col_type')}</TableHead>
                <TableHead className="text-xs">{t('pit_col_pit_time')}</TableHead>
                <TableHead className="text-xs">{t('pit_col_timestamp')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pitEvents.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-sm">{p.lap_number}</TableCell>
                  <TableCell className="text-sm">{p.driver}</TableCell>
                  <TableCell className="text-sm">{p.pit_type}</TableCell>
                  <TableCell className="font-mono text-sm">{p.pit_time_s ? `${p.pit_time_s.toFixed(1)}s` : '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PitAnalysis;
