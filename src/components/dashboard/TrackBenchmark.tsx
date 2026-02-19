import { useMemo } from 'react';
import type { LapRecord } from '@/types/telemetry';
import { computeTrackBenchmark, computeUserGapMetrics, interpretPerformanceIndex } from '@/lib/track-benchmark';
import { formatLapTime } from '@/lib/metrics';
import { useI18n } from '@/i18n/I18nContext';
import { useDisplayMode } from '@/contexts/DisplayModeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingDown, Zap, BarChart3, Crosshair } from 'lucide-react';

interface Props {
  allData: LapRecord[];     // unfiltered session data — for benchmark
  userData: LapRecord[];    // scoped/filtered data — for user gap
}

const statusColors = {
  ok: 'text-green-400',
  warning: 'text-yellow-400',
  critical: 'text-destructive',
};

const TrackBenchmark = ({ allData, userData }: Props) => {
  const { t } = useI18n();
  const { isGuided } = useDisplayMode();

  const benchmark = useMemo(() => computeTrackBenchmark(allData), [allData]);
  const userGap = useMemo(() => computeUserGapMetrics(userData, benchmark), [userData, benchmark]);
  const piInterp = useMemo(() => interpretPerformanceIndex(userGap.performanceIndex), [userGap.performanceIndex]);

  if (benchmark.trackBestLap === null) return null;

  const metrics = [
    {
      label: t('bench_track_best'),
      value: formatLapTime(benchmark.trackBestLap),
      icon: Target,
      accent: true,
    },
    {
      label: t('bench_user_best'),
      value: formatLapTime(userGap.userBestLap),
      icon: Crosshair,
    },
    {
      label: t('bench_gap_to_track'),
      value: userGap.gapToTrack !== null ? `+${userGap.gapToTrack.toFixed(3)}s` : '—',
      icon: TrendingDown,
      warn: userGap.gapToTrack !== null && userGap.gapToTrack > 1,
    },
    ...(benchmark.hasSectorData ? [{
      label: t('bench_theoretical_best'),
      value: formatLapTime(benchmark.theoreticalBest),
      icon: Zap,
      accent: true,
    }] : []),
    {
      label: t('bench_performance_index'),
      value: userGap.performanceIndex !== null ? `${userGap.performanceIndex.toFixed(1)}%` : '—',
      icon: BarChart3,
      accent: userGap.performanceIndex !== null && userGap.performanceIndex >= 95,
      warn: userGap.performanceIndex !== null && userGap.performanceIndex < 90,
    },
  ];

  return (
    <Card className="bg-card border-border border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          {t('bench_title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {metrics.map(({ label, value, icon: Icon, accent, warn }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${accent ? 'text-primary' : warn ? 'text-destructive' : 'text-muted-foreground'}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
              </div>
              <p className={`text-lg font-mono font-semibold ${accent ? 'text-primary' : warn ? 'text-destructive' : 'text-foreground'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {isGuided && (
          <div className="mt-4 pt-3 border-t border-border space-y-1.5">
            <p className={`text-xs ${statusColors[piInterp.status]}`}>
              {t(piInterp.key)}
            </p>
            {userGap.weakestSector && (
              <p className="text-xs text-muted-foreground">
                {t('bench_interp_weak_sector').replace('{sector}', userGap.weakestSector)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackBenchmark;
