import { KPIData } from '@/types/telemetry';
import { formatLapTime } from '@/lib/metrics';
import { Card, CardContent } from '@/components/ui/card';
import { Timer, TrendingUp, Activity, Hash, ParkingSquare, Clock } from 'lucide-react';

const KPICards = ({ kpis }: { kpis: KPIData }) => {
  const cards = [
    { label: 'Best Lap', value: formatLapTime(kpis.bestLap), icon: Timer, accent: true },
    { label: 'Avg Pace', value: formatLapTime(kpis.averagePace), icon: TrendingUp },
    { label: 'Consistency', value: kpis.consistency !== null ? `±${kpis.consistency.toFixed(3)}s` : '—', icon: Activity },
    { label: 'Total Laps', value: kpis.totalLaps.toString(), icon: Hash },
    { label: 'Pit Stops', value: kpis.pitStops.toString(), icon: ParkingSquare },
    { label: 'Total Pit Time', value: kpis.totalPitTime > 0 ? `${kpis.totalPitTime.toFixed(1)}s` : '—', icon: Clock },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(({ label, value, icon: Icon, accent }) => (
        <Card key={label} className={`bg-card border-border ${accent ? 'border-primary/30' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className={`text-xl font-mono font-semibold ${accent ? 'text-primary' : 'text-foreground'}`}>
              {value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default KPICards;
