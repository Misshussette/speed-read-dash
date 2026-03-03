import { useMemo } from 'react';
import type { LapRecord } from '@/types/telemetry';
import { formatLapTime } from '@/lib/metrics';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target, Trophy } from 'lucide-react';

interface Props {
  /** ALL laps in the run (cleaned or raw depending on mode) — never filtered by driver */
  runData: LapRecord[];
  /** Laps for currently selected/filtered drivers only */
  selectedDriverData: LapRecord[];
}

/** Minimum credible lap time */
const MIN_LAP_S = 5;

function validLaps(data: LapRecord[]) {
  return data.filter(r => r.lap_status === 'valid' && r.pit_type === '' && r.lap_time_s >= MIN_LAP_S);
}

interface DriverRow {
  driver: string;
  bestLap: number;
  gap: number;
  pi: number;
}

const TrackBenchmark = ({ runData, selectedDriverData }: Props) => {
  const { t } = useI18n();

  // ── Run-level benchmark (stable, never changes with driver filter) ──
  const runBenchmark = useMemo(() => {
    const valid = validLaps(runData);
    if (valid.length === 0) return null;

    let bestTime = Infinity;
    let bestDriver = '';
    for (const r of valid) {
      if (r.lap_time_s < bestTime) {
        bestTime = r.lap_time_s;
        bestDriver = r.driver;
      }
    }
    return { bestTime, bestDriver };
  }, [runData]);

  // ── Per-driver rows (only selected drivers) ──
  const driverRows = useMemo((): DriverRow[] => {
    if (!runBenchmark) return [];
    const valid = validLaps(selectedDriverData);
    const byDriver = new Map<string, number>();
    for (const r of valid) {
      const prev = byDriver.get(r.driver);
      if (prev === undefined || r.lap_time_s < prev) {
        byDriver.set(r.driver, r.lap_time_s);
      }
    }
    const rows: DriverRow[] = [];
    for (const [driver, bestLap] of byDriver) {
      rows.push({
        driver,
        bestLap,
        gap: bestLap - runBenchmark.bestTime,
        pi: (runBenchmark.bestTime / bestLap) * 100,
      });
    }
    rows.sort((a, b) => a.bestLap - b.bestLap);
    return rows;
  }, [selectedDriverData, runBenchmark]);

  if (!runBenchmark) return null;

  return (
    <Card className="bg-card border-border border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          {t('bench_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Run absolute best */}
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-primary" />
          <div>
            <p className="text-lg font-mono font-semibold text-primary">
              {formatLapTime(runBenchmark.bestTime)}
            </p>
            <p className="text-xs text-muted-foreground">
              {runBenchmark.bestDriver} — {t('bench_track_best')}
            </p>
          </div>
        </div>

        {/* Per-driver table */}
        {driverRows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 text-xs">{t('filter_label_driver')}</TableHead>
                <TableHead className="h-8 text-xs text-right">{t('bench_user_best')}</TableHead>
                <TableHead className="h-8 text-xs text-right">{t('bench_gap_to_track')}</TableHead>
                <TableHead className="h-8 text-xs text-right">{t('bench_performance_index')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverRows.map(row => (
                <TableRow key={row.driver}>
                  <TableCell className="py-1.5 text-sm font-medium">{row.driver}</TableCell>
                  <TableCell className="py-1.5 text-sm font-mono text-right">{formatLapTime(row.bestLap)}</TableCell>
                  <TableCell className={`py-1.5 text-sm font-mono text-right ${row.gap > 1 ? 'text-destructive' : row.gap === 0 ? 'text-primary' : 'text-foreground'}`}>
                    {row.gap === 0 ? '—' : `+${row.gap.toFixed(3)}s`}
                  </TableCell>
                  <TableCell className={`py-1.5 text-sm font-mono text-right ${row.pi >= 98 ? 'text-primary' : row.pi < 90 ? 'text-destructive' : 'text-foreground'}`}>
                    {row.pi.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackBenchmark;
