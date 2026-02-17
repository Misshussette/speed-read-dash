import { useMemo } from 'react';
import { LapRecord, KPIData } from '@/types/telemetry';
import { computeKPIs, computeInsights, formatLapTime } from '@/lib/metrics';
import { interpretAllKPIs, type InterpretationStatus } from '@/lib/interpretation';
import { useI18n } from '@/i18n/I18nContext';
import { useDisplayMode } from '@/contexts/DisplayModeContext';
import { useGarage } from '@/contexts/GarageContext';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { Card, CardContent } from '@/components/ui/card';
import { Timer, TrendingUp, Activity, Flame, Wrench, TrendingDown, AlertTriangle, Trophy } from 'lucide-react';

const statusDot: Record<InterpretationStatus, string> = {
  ok: 'bg-green-400',
  warning: 'bg-yellow-400',
  critical: 'bg-destructive',
};

/** Tiny sparkline using SVG — renders last N lap times as a polyline */
const Sparkline = ({ values, className = '' }: { values: number[]; className?: string }) => {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full h-7 ${className}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

interface MobileFieldViewProps {
  data: LapRecord[];
  kpis: KPIData;
}

const MobileFieldView = ({ data, kpis }: MobileFieldViewProps) => {
  const { t } = useI18n();
  const { isGuided } = useDisplayMode();
  const { activeSessionId } = useTelemetry();
  const { getSessionLink, getCarById, getSetupById } = useGarage();

  const interpretations = useMemo(() => interpretAllKPIs(kpis), [kpis]);
  const insights = useMemo(() => computeInsights(data, false), [data]);

  // Last 20 lap times for sparkline
  const recentLaps = useMemo(() => {
    const clean = data.filter(r => r.lap_status === 'valid' && r.pit_type === '');
    return clean.slice(-20).map(r => r.lap_time_s);
  }, [data]);

  // Current stint data
  const currentStint = useMemo(() => {
    if (data.length === 0) return null;
    const lastStint = Math.max(...data.map(r => r.stint));
    const stintLaps = data.filter(r => r.stint === lastStint && r.lap_status === 'valid' && r.pit_type === '');
    if (stintLaps.length === 0) return null;
    const times = stintLaps.map(r => r.lap_time_s);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const first5 = times.slice(0, Math.min(5, times.length));
    const last5 = times.slice(-Math.min(5, times.length));
    const avgFirst = first5.reduce((a, b) => a + b, 0) / first5.length;
    const avgLast = last5.reduce((a, b) => a + b, 0) / last5.length;
    const trend = avgLast - avgFirst;
    return { stint: lastStint, lapCount: stintLaps.length, avg, trend, times };
  }, [data]);

  // Active setup info
  const setupInfo = useMemo(() => {
    if (!activeSessionId) return null;
    const link = getSessionLink(activeSessionId);
    if (!link?.car_id) return null;
    const car = getCarById(link.car_id);
    const setup = link.setup_id ? getSetupById(link.setup_id) : undefined;
    return { car, setup };
  }, [activeSessionId, getSessionLink, getCarById, getSetupById]);

  const topKpis = [
    { label: t('kpi_best_lap'), value: formatLapTime(kpis.bestLap), icon: Timer, interp: interpretations.bestLap },
    { label: t('kpi_avg_pace'), value: formatLapTime(kpis.averagePace), icon: TrendingUp, interp: interpretations.averagePace },
    { label: t('kpi_consistency'), value: kpis.consistency !== null ? `±${kpis.consistency.toFixed(3)}s` : '—', icon: Activity, interp: interpretations.consistency },
  ];

  return (
    <div className="space-y-3 pb-6">
      {/* Personal Summary — 3 core KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {topKpis.map(({ label, value, icon: Icon, interp }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-lg font-mono font-semibold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              {isGuided && interp.labelKey !== 'interp_no_data' && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDot[interp.status]}`} />
                  <span className="text-[9px] text-muted-foreground">{t(interp.labelKey)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key insight */}
      {(insights.mostConsistentDriver || insights.highestVarianceSector) && (
        <Card className="bg-card border-border">
          <CardContent className="p-3 flex items-center gap-2">
            {insights.mostConsistentDriver ? (
              <>
                <Trophy className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{t('insight_most_consistent')}</p>
                  <p className="text-sm font-semibold text-foreground">{insights.mostConsistentDriver}</p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{t('insight_highest_variance')}</p>
                  <p className="text-sm font-semibold text-foreground">{insights.highestVarianceSector}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sparkline — recent pace trend */}
      {recentLaps.length >= 3 && (
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground mb-1">{t('mobile_pace_trend')}</p>
            <Sparkline values={recentLaps} />
          </CardContent>
        </Card>
      )}

      {/* Current stint snapshot */}
      {currentStint && (
        <Card className={`bg-card border-border ${currentStint.trend > 0.3 ? 'border-destructive/30' : ''}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground">
                {t('mobile_current_stint')} #{currentStint.stint}
              </p>
              <div className="flex items-center gap-1">
                {currentStint.trend > 0 ? (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                ) : (
                  <TrendingUp className="h-3 w-3 text-green-400" />
                )}
                <span className={`text-xs font-mono ${currentStint.trend > 0 ? 'text-destructive' : 'text-green-400'}`}>
                  {currentStint.trend > 0 ? '+' : ''}{currentStint.trend.toFixed(3)}s
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-semibold text-foreground">
                {formatLapTime(currentStint.avg)}
              </span>
              <span className="text-xs text-muted-foreground">
                {currentStint.lapCount} {t('mobile_laps')}
              </span>
            </div>
            {currentStint.times.length >= 3 && (
              <Sparkline values={currentStint.times} className="mt-1" />
            )}
            {isGuided && currentStint.trend > 0.3 && (
              <p className="text-[9px] text-destructive mt-1">{t('mobile_stint_degrading')}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Degradation + Pit summary row */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <Flame className={`h-4 w-4 mx-auto mb-1 ${kpis.degradation !== null && kpis.degradation > 0.5 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <p className="text-sm font-mono font-semibold text-foreground">
              {kpis.degradation !== null ? `${kpis.degradation > 0 ? '+' : ''}${kpis.degradation.toFixed(3)}s` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">{t('kpi_degradation')}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <span className="text-lg font-mono font-semibold text-foreground">{kpis.pitStops}</span>
            <p className="text-[10px] text-muted-foreground">{t('kpi_pit_stops')}</p>
            {kpis.totalPitTime > 0 && (
              <p className="text-[10px] text-muted-foreground">{kpis.totalPitTime.toFixed(1)}s</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active setup overview */}
      {setupInfo?.car && (
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] text-muted-foreground">{t('mobile_active_setup')}</p>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {setupInfo.car.brand} {setupInfo.car.model}
            </p>
            {setupInfo.setup?.label && (
              <p className="text-xs text-muted-foreground">{setupInfo.setup.label}</p>
            )}
            {setupInfo.setup?.tags && setupInfo.setup.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {setupInfo.setup.tags.map(tag => (
                  <span key={tag} className="text-[9px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Total laps */}
      <div className="text-center">
        <span className="text-xs text-muted-foreground">{kpis.totalLaps} {t('mobile_laps')} • {t(`mode_overview`)}</span>
      </div>
    </div>
  );
};

export default MobileFieldView;
