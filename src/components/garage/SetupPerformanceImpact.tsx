import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n/I18nContext';
import { useDisplayMode } from '@/contexts/DisplayModeContext';
import { computeSetupPerformance, interpretSetupPI, interpretConsistency } from '@/lib/setup-performance';
import type { LapRecord } from '@/types/telemetry';
import type { TrackBenchmark } from '@/lib/track-benchmark';
import type { Setup } from '@/types/garage';
import { Gauge, Activity, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  setup: Setup;
  laps: LapRecord[];
  benchmark: TrackBenchmark;
}

const statusColors = {
  ok: 'text-green-400',
  warning: 'text-yellow-400',
  critical: 'text-destructive',
};

const SetupPerformanceImpact = ({ setup, laps, benchmark }: Props) => {
  const { t } = useI18n();
  const { isGuided } = useDisplayMode();

  const metrics = useMemo(
    () => computeSetupPerformance(setup.id, laps, benchmark),
    [setup.id, laps, benchmark]
  );

  const piInterp = useMemo(() => interpretSetupPI(metrics.performanceIndex), [metrics.performanceIndex]);
  const csInterp = useMemo(() => interpretConsistency(metrics.consistencyScore), [metrics.consistencyScore]);

  if (metrics.lapCount === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-6 text-center">
          <p className="text-xs text-muted-foreground">{t('setup_perf_no_laps')}</p>
        </CardContent>
      </Card>
    );
  }

  const sectorItems = [
    { label: 'S1', delta: metrics.sectorDeltas.s1 },
    { label: 'S2', delta: metrics.sectorDeltas.s2 },
    { label: 'S3', delta: metrics.sectorDeltas.s3 },
  ].filter(s => s.delta !== null);

  return (
    <Card className="bg-card border-border border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          {t('setup_perf_title')} — {setup.label || setup.id.slice(0, 8)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Gauge className={`h-3.5 w-3.5 ${metrics.performanceIndex !== null && metrics.performanceIndex <= 1.03 ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('setup_perf_index')}</span>
            </div>
            <p className={`text-lg font-mono font-semibold ${metrics.performanceIndex !== null && metrics.performanceIndex <= 1.03 ? 'text-primary' : metrics.performanceIndex !== null && metrics.performanceIndex > 1.06 ? 'text-destructive' : 'text-foreground'}`}>
              {metrics.performanceIndex !== null ? metrics.performanceIndex.toFixed(4) : '—'}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Activity className={`h-3.5 w-3.5 ${metrics.consistencyScore !== null && metrics.consistencyScore <= 0.025 ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('setup_perf_consistency')}</span>
            </div>
            <p className={`text-lg font-mono font-semibold ${metrics.consistencyScore !== null && metrics.consistencyScore <= 0.025 ? 'text-primary' : metrics.consistencyScore !== null && metrics.consistencyScore > 0.05 ? 'text-destructive' : 'text-foreground'}`}>
              {metrics.consistencyScore !== null ? metrics.consistencyScore.toFixed(4) : '—'}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('setup_perf_laps')}</span>
            </div>
            <p className="text-lg font-mono font-semibold text-foreground">{metrics.lapCount}</p>
          </div>
        </div>

        {/* Sector gains/losses */}
        {sectorItems.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('setup_perf_sector_impact')}</span>
            <div className="grid grid-cols-3 gap-2">
              {sectorItems.map(({ label, delta }) => {
                const isWeak = label === metrics.weakestSector;
                const isStrong = label === metrics.strongestSector;
                return (
                  <div key={label} className={`rounded-md border px-3 py-2 text-center ${isWeak ? 'border-destructive/40 bg-destructive/5' : isStrong ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                    <span className="text-[10px] text-muted-foreground block">{label}</span>
                    <div className="flex items-center justify-center gap-1">
                      {delta! > 0 ? <TrendingDown className="h-3 w-3 text-destructive" /> : <TrendingUp className="h-3 w-3 text-green-400" />}
                      <span className={`text-sm font-mono font-semibold ${delta! > 0.2 ? 'text-destructive' : delta! <= 0.05 ? 'text-green-400' : 'text-foreground'}`}>
                        {delta! > 0 ? '+' : ''}{delta!.toFixed(3)}s
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Guided interpretation */}
        {isGuided && (
          <div className="pt-3 border-t border-border space-y-1.5">
            <p className={`text-xs ${statusColors[piInterp.status]}`}>{t(piInterp.key)}</p>
            <p className={`text-xs ${statusColors[csInterp.status]}`}>{t(csInterp.key)}</p>
            {metrics.weakestSector && (
              <p className="text-xs text-muted-foreground">
                {t('setup_perf_weak_sector').replace('{sector}', metrics.weakestSector)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SetupPerformanceImpact;
