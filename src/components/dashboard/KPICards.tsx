import { KPIData } from '@/types/telemetry';
import { formatLapTime } from '@/lib/metrics';
import { Card, CardContent } from '@/components/ui/card';
import { Timer, TrendingUp, Activity, Hash, ParkingSquare, Clock, ArrowDownRight, Flame } from 'lucide-react';

const KPICards = ({ kpis }: { kpis: KPIData }) => {
  const cards = [
    { label: 'Best Lap', value: formatLapTime(kpis.bestLap), icon: Timer, accent: true },
    { label: 'Avg Pace', value: formatLapTime(kpis.averagePace), icon: TrendingUp },
    { label: 'Pace Delta', value: kpis.paceDelta !== null ? `+${kpis.paceDelta.toFixed(3)}s` : '—', icon: ArrowDownRight },
    { label: 'Consistency', value: kpis.consistency !== null ? `±${kpis.consistency.toFixed(3)}s` : '—', icon: Activity },
    { label: 'Degradation', value: kpis.degradation !== null ? `${kpis.degradation > 0 ? '+' : ''}${kpis.degradation.toFixed(3)}s` : '—', icon: Flame, warn: kpis.degradation !== null && kpis.degradation > 0.5 },
    { label: 'Total Laps', value: kpis.totalLaps.toString(), icon: Hash },
    { label: 'Pit Stops', value: kpis.pitStops.toString(), icon: ParkingSquare },
    { label: 'Total Pit Time', value: kpis.totalPitTime > 0 ? `${kpis.totalPitTime.toFixed(1)}s` : '—', icon: Clock },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map(({ label, value, icon: Icon, accent, warn }) => (
        <Card key={label} className={`bg-card border-border ${accent ? 'border-primary/30' : ''} ${warn ? 'border-destructive/40' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${accent ? 'text-primary' : warn ? 'text-destructive' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className={`text-lg font-mono font-semibold ${accent ? 'text-primary' : warn ? 'text-destructive' : 'text-foreground'}`}>
              {value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default KPICards;
