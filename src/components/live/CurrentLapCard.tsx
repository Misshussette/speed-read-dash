import { useMemo } from 'react';
import { Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLive } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';
import RankingTable from './RankingTable';
import SectorCell, { resolveSectorColor } from './SectorCell';
import VariationIndicator from './VariationIndicator';
import DriverClaimButton from './DriverClaimButton';

const formatLapTime = (v: number | null): string => {
  if (v == null) return '';
  const mins = Math.floor(v / 60);
  const secs = v % 60;
  if (mins > 0) return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
  return secs.toFixed(3);
};

/**
 * Unified current-lap card. Always rendered.
 * Shows single-pilot detail when 0–1 pilots, ranking table when multi.
 * Display mode toggle is always visible (disabled when no stint data).
 */
const CurrentLapCard = () => {
  const { pilots, stints, displayMode, setDisplayMode, hasSectorData, isAnalog, isSinglePilot, session } = useLive();
  const { t } = useI18n();

  const pilot = pilots[0] ?? null;
  const hasStintData = stints.length > 0;

  const sessionBestLap = useMemo(() => {
    let best: number | null = null;
    for (const p of pilots) {
      if (p.bestLap != null && (best == null || p.bestLap < best)) best = p.bestLap;
    }
    return best;
  }, [pilots]);

  const isRecordHolder = pilot != null && sessionBestLap != null && pilot.bestLap != null && Math.abs(pilot.bestLap - sessionBestLap) < 0.001;

  const titleKey = session.sessionType === 'race'
    ? 'live_standings'
    : session.sessionType === 'qualifying'
      ? 'live_qualifying_standings'
      : 'live_practice_standings';

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            {isSinglePilot ? t('live_current_lap') : t(titleKey)}
          </CardTitle>
          {/* Display mode toggle — always visible */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Tabs value={displayMode} onValueChange={(v) => setDisplayMode(v as any)}>
                    <TabsList className="h-7">
                      <TabsTrigger value="split_live" className="text-xs px-2 h-6">
                        {t('live_split_live')}
                      </TabsTrigger>
                      <TabsTrigger
                        value="relay_average"
                        className="text-xs px-2 h-6"
                        disabled={!hasStintData}
                      >
                        {t('live_relay_average')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </TooltipTrigger>
              {!hasStintData && (
                <TooltipContent>
                  <p className="text-xs">{t('live_relay_disabled_hint')}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {/* No data state */}
        {pilots.length === 0 && (
          <p className="text-muted-foreground text-sm py-12 text-center">{t('live_no_laps_yet')}</p>
        )}

        {/* Single pilot detail view */}
        {isSinglePilot && pilot && (
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
                {(['s1', 's2', 's3'] as const).map(s => (
                  <div key={s} className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">{s.toUpperCase()}</p>
                    <SectorCell
                      value={pilot.currentSectors[s]}
                      color={resolveSectorColor(pilot.currentSectors[s], s, pilot.bestSectors, pilots)}
                      className="text-lg"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('live_last_lap')}</span>
                <span className="font-mono text-sm text-foreground">{formatLapTime(pilot.lastLap)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('live_best_lap')}</span>
                <span className={`font-mono text-sm inline-flex items-center gap-1 ${isRecordHolder ? 'text-purple-400' : 'text-foreground'}`}>
                  {isRecordHolder && <Timer className="h-3 w-3" />}
                  {formatLapTime(pilot.bestLap)}
                </span>
              </div>
              {isAnalog && pilot.lane != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('live_col_lane')}</span>
                  <span className="font-mono text-sm text-foreground">{pilot.lane}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('live_variation')}</span>
                <VariationIndicator variation={pilot.variation} />
              </div>
              {pilot.currentStint && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('live_stint_driver')}</span>
                  <span className="text-sm text-foreground font-medium">
                    {pilot.currentStint.pilotDisplayName ?? pilot.displayName}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <DriverClaimButton fluxId={pilot.fluxId} />
            </div>
          </>
        )}

        {/* Multi pilot ranking table */}
        {!isSinglePilot && pilots.length > 0 && (
          <div className="p-0 -mx-6 -mb-2">
            <RankingTable />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CurrentLapCard;
