import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLive } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';

const formatLapTime = (v: number): string => {
  const mins = Math.floor(v / 60);
  const secs = v % 60;
  if (mins > 0) return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
  return secs.toFixed(3);
};

/**
 * Lap Timeline — always rendered in sidebar.
 * Shows a chronological list of recent lap events for all pilots.
 * Empty state when no laps exist.
 */
const LapTimeline = () => {
  const { pilots } = useLive();
  const { t } = useI18n();

  // Build a merged timeline of recent laps from all pilots
  const timelineEntries: { pilotName: string; lapNum: number; time: number; isBest: boolean }[] = [];

  for (const p of pilots) {
    const startLap = Math.max(1, p.laps - p.recentLaps.length + 1);
    p.recentLaps.forEach((lap, i) => {
      timelineEntries.push({
        pilotName: p.displayName,
        lapNum: startLap + i,
        time: lap,
        isBest: p.bestLap != null && Math.abs(lap - p.bestLap) < 0.001,
      });
    });
  }

  // Sort by lap number desc (most recent first)
  timelineEntries.sort((a, b) => b.lapNum - a.lapNum);

  // Limit to last 20 entries
  const visible = timelineEntries.slice(0, 20);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {t('live_lap_timeline')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-muted-foreground text-xs py-6 text-center">
            {t('live_no_laps_yet')}
          </p>
        ) : (
          <div className="space-y-1 max-h-[280px] overflow-y-auto">
            {visible.map((entry, i) => (
              <div key={`${entry.pilotName}-${entry.lapNum}-${i}`} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground font-mono text-xs shrink-0">
                    L{entry.lapNum}
                  </span>
                  {pilots.length > 1 && (
                    <span className="text-xs text-muted-foreground truncate">{entry.pilotName}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-xs text-foreground">{formatLapTime(entry.time)}</span>
                  {entry.isBest && (
                    <Badge variant="outline" className="text-purple-400 border-purple-400/30 text-[10px] px-1 py-0 leading-tight">
                      PB
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LapTimeline;
