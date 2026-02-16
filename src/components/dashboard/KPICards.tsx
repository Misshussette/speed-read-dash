import { KPIData } from '@/types/telemetry';
import { formatLapTime } from '@/lib/metrics';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Timer, TrendingUp, Activity, Hash, ParkingSquare, Clock, ArrowDownRight, Flame, HelpCircle } from 'lucide-react';

const KPICards = ({ kpis }: { kpis: KPIData }) => {
  const { t } = useI18n();

  const cards = [
    { label: t('kpi_best_lap'), value: formatLapTime(kpis.bestLap), icon: Timer, accent: true, helpKey: 'help_best_lap' as const },
    { label: t('kpi_avg_pace'), value: formatLapTime(kpis.averagePace), icon: TrendingUp, helpKey: 'help_avg_pace' as const },
    { label: t('kpi_pace_delta'), value: kpis.paceDelta !== null ? `+${kpis.paceDelta.toFixed(3)}s` : '—', icon: ArrowDownRight, helpKey: 'help_pace_delta' as const },
    { label: t('kpi_consistency'), value: kpis.consistency !== null ? `±${kpis.consistency.toFixed(3)}s` : '—', icon: Activity, helpKey: 'help_consistency' as const },
    { label: t('kpi_degradation'), value: kpis.degradation !== null ? `${kpis.degradation > 0 ? '+' : ''}${kpis.degradation.toFixed(3)}s` : '—', icon: Flame, warn: kpis.degradation !== null && kpis.degradation > 0.5, helpKey: 'help_degradation' as const },
    { label: t('kpi_total_laps'), value: kpis.totalLaps.toString(), icon: Hash, helpKey: 'help_total_laps' as const },
    { label: t('kpi_pit_stops'), value: kpis.pitStops.toString(), icon: ParkingSquare, helpKey: 'help_pit_stops' as const },
    { label: t('kpi_total_pit_time'), value: kpis.totalPitTime > 0 ? `${kpis.totalPitTime.toFixed(1)}s` : '—', icon: Clock, helpKey: 'help_total_pit_time' as const },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map(({ label, value, icon: Icon, accent, warn, helpKey }) => (
        <Card key={label} className={`bg-card border-border relative ${accent ? 'border-primary/30' : ''} ${warn ? 'border-destructive/40' : ''}`}>
          <CardContent className="p-4">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="absolute top-2 right-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  aria-label={`Help: ${label}`}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-56 text-xs text-muted-foreground p-3 bg-card border-border">
                {t(helpKey)}
              </PopoverContent>
            </Popover>
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
