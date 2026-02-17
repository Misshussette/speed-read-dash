import { useTelemetry } from '@/contexts/TelemetryContext';
import { useI18n } from '@/i18n/I18nContext';
import { formatLapTime } from '@/lib/metrics';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ArrowDownRight, Activity, Hash, HelpCircle } from 'lucide-react';

const ScopeKPICards = () => {
  const { t } = useI18n();
  const { dualKPIs, scope } = useTelemetry();

  if (!scope.enabled || !dualKPIs) return null;

  const cards = [
    {
      label: t('scope_relative_pace'),
      value: dualKPIs.relativePace !== null
        ? `${dualKPIs.relativePace > 0 ? '+' : ''}${dualKPIs.relativePace.toFixed(3)}s`
        : '—',
      icon: ArrowDownRight,
      good: dualKPIs.relativePace !== null && dualKPIs.relativePace < 0,
      bad: dualKPIs.relativePace !== null && dualKPIs.relativePace > 0.3,
      helpKey: 'help_relative_pace' as const,
    },
    {
      label: t('scope_relative_consistency'),
      value: dualKPIs.relativeConsistency !== null
        ? `${dualKPIs.relativeConsistency > 0 ? '+' : ''}${dualKPIs.relativeConsistency.toFixed(3)}s`
        : '—',
      icon: Activity,
      good: dualKPIs.relativeConsistency !== null && dualKPIs.relativeConsistency < 0,
      bad: dualKPIs.relativeConsistency !== null && dualKPIs.relativeConsistency > 0.2,
      helpKey: 'help_relative_consistency' as const,
    },
    {
      label: t('scope_lap_ratio'),
      value: dualKPIs.lapCountRatio,
      icon: Hash,
      good: false,
      bad: false,
      helpKey: 'help_total_laps' as const,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(({ label, value, icon: Icon, good, bad, helpKey }) => (
        <Card key={label} className={`bg-card border-border relative ${good ? 'border-primary/30' : ''} ${bad ? 'border-destructive/40' : ''}`}>
          <CardContent className="p-4">
            <Popover>
              <PopoverTrigger asChild>
                <button className="absolute top-2 right-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors" aria-label={`Help: ${label}`}>
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-56 text-xs text-muted-foreground p-3 bg-card border-border">
                {t(helpKey)}
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${good ? 'text-primary' : bad ? 'text-destructive' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-[9px] font-mono text-muted-foreground/50 ml-auto">{t('scope_vs_global')}</span>
            </div>
            <p className={`text-lg font-mono font-semibold ${good ? 'text-primary' : bad ? 'text-destructive' : 'text-foreground'}`}>
              {value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ScopeKPICards;
