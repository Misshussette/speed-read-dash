import { Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLive } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';
import SectorCell from './SectorCell';
import VariationIndicator from './VariationIndicator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formatLapTime = (v: number | null): string => {
  if (v == null) return '';
  const mins = Math.floor(v / 60);
  const secs = v % 60;
  if (mins > 0) return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
  return secs.toFixed(3);
};

const LiveSinglePilot = () => {
  const { pilots, displayMode, setDisplayMode, hasSectorData } = useLive();
  const { t } = useI18n();

  const pilot = pilots[0] ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Current Lap */}
      <Card className="bg-card border-border lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              {t('live_current_lap')}
            </CardTitle>
            <Tabs value={displayMode} onValueChange={(v) => setDisplayMode(v as any)}>
              <TabsList className="h-7">
                <TabsTrigger value="split_live" className="text-xs px-2 h-6">
                  {t('live_split_live')}
                </TabsTrigger>
                <TabsTrigger value="relay_average" className="text-xs px-2 h-6">
                  {t('live_relay_average')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {pilot ? (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-mono font-bold text-foreground tracking-tight">
                  {formatLapTime(pilot.lastLap)}
                </span>
                <span className="text-lg text-muted-foreground font-mono">
                  L{pilot.laps}
                </span>
              </div>

              {hasSectorData && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">S1</p>
                    <SectorCell value={pilot.currentSectors.s1} className="text-lg" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">S2</p>
                    <SectorCell value={pilot.currentSectors.s2} className="text-lg" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">S3</p>
                    <SectorCell value={pilot.currentSectors.s3} className="text-lg" />
                  </div>
                </div>
              )}

              {/* Last Lap */}
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('live_last_lap')}</span>
                <span className="font-mono text-sm text-foreground">
                  {formatLapTime(pilot.lastLap)}
                </span>
              </div>

              {/* Best Lap */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{t('live_best_lap')}</span>
                <span className="font-mono text-sm text-purple-400">
                  {formatLapTime(pilot.bestLap)}
                </span>
              </div>

              {/* Variation */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{t('live_variation')}</span>
                <VariationIndicator variation={pilot.variation} />
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">{t('live_no_data')}</p>
          )}
        </CardContent>
      </Card>

      {/* Lap history placeholder */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            {t('live_lap_history')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pilot && pilot.recentLaps.length > 0 ? (
            <div className="space-y-1">
              {pilot.recentLaps.map((lap, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-mono text-xs">L{pilot.laps - pilot.recentLaps.length + i + 1}</span>
                  <span className="font-mono text-xs text-foreground">{formatLapTime(lap)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs py-8 text-center">{t('live_no_data')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveSinglePilot;
