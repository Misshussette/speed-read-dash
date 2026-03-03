import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLive, PilotLiveData } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';
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

const RankingTable = () => {
  const { pilots, session, isAnalog, hasSectorData } = useLive();
  const { t } = useI18n();
  const { sessionType } = session;

  const ranked = useMemo(() => {
    const sorted = [...pilots];
    if (sessionType === 'race') {
      sorted.sort((a, b) => {
        if (b.laps !== a.laps) return b.laps - a.laps;
        return (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity);
      });
    } else {
      sorted.sort((a, b) => (a.bestLap ?? Infinity) - (b.bestLap ?? Infinity));
    }
    return sorted;
  }, [pilots, sessionType]);

  const isPractice = sessionType === 'practice';
  const leaderBest = ranked[0]?.bestLap ?? null;

  if (ranked.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {t('live_no_data')}
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="w-10 text-center">P</TableHead>
            <TableHead>{t('live_col_driver')}</TableHead>
            {isAnalog && <TableHead className="w-14 text-center">{t('live_col_lane')}</TableHead>}

            {isPractice ? (
              <>
                <TableHead className="text-right">{t('live_col_best')}</TableHead>
                <TableHead className="text-right">{t('live_col_gap_leader')}</TableHead>
                <TableHead className="text-right">{t('live_col_delta_personal')}</TableHead>
              </>
            ) : (
              <>
                <TableHead className="text-center w-14">{t('live_col_laps')}</TableHead>
                <TableHead className="text-right">{t('live_col_gap')}</TableHead>
                <TableHead className="text-right">{t('live_col_last')}</TableHead>
              </>
            )}

            {hasSectorData && (
              <>
                <TableHead className="text-right">S1</TableHead>
                <TableHead className="text-right">S2</TableHead>
                <TableHead className="text-right">S3</TableHead>
              </>
            )}

            {!isPractice && (
              <>
                <TableHead className="text-center">{t('live_col_variation')}</TableHead>
                <TableHead className="text-center w-12">{t('live_col_pit')}</TableHead>
              </>
            )}

            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((p, idx) => {
            const gapLeader = leaderBest != null && p.bestLap != null ? p.bestLap - leaderBest : null;
            const deltaPersonal = p.lastLap != null && p.bestLap != null ? p.lastLap - p.bestLap : null;
            const gap = idx === 0 ? null : computeGap(ranked[0], p, sessionType);

            return (
              <TableRow key={p.fluxId} className="border-border">
                <TableCell className="text-center font-mono text-xs font-bold">{idx + 1}</TableCell>
                <TableCell className="font-medium text-sm">{p.displayName}</TableCell>
                {isAnalog && (
                  <TableCell className="text-center font-mono text-xs">{p.lane ?? ''}</TableCell>
                )}

                {isPractice ? (
                  <>
                    <TableCell className="text-right font-mono text-xs">{formatLapTime(p.bestLap)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {gapLeader != null && gapLeader > 0 ? `+${gapLeader.toFixed(3)}` : ''}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {deltaPersonal != null && deltaPersonal > 0 ? `+${deltaPersonal.toFixed(3)}` : deltaPersonal != null ? deltaPersonal.toFixed(3) : ''}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-center font-mono text-xs">{p.laps}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {gap != null ? `+${gap.toFixed(3)}` : ''}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatLapTime(p.lastLap)}</TableCell>
                  </>
                )}

                {hasSectorData && (
                  <>
                    <TableCell className="text-right">
                      <SectorCell value={p.currentSectors.s1} color={resolveSectorColor(p.currentSectors.s1, 's1', p.bestSectors, pilots)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <SectorCell value={p.currentSectors.s2} color={resolveSectorColor(p.currentSectors.s2, 's2', p.bestSectors, pilots)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <SectorCell value={p.currentSectors.s3} color={resolveSectorColor(p.currentSectors.s3, 's3', p.bestSectors, pilots)} />
                    </TableCell>
                  </>
                )}

                {!isPractice && (
                  <>
                    <TableCell className="text-center"><VariationIndicator variation={p.variation} /></TableCell>
                    <TableCell className="text-center font-mono text-xs">{p.pitCount > 0 ? p.pitCount : ''}</TableCell>
                  </>
                )}

                <TableCell>
                  <DriverClaimButton fluxId={p.fluxId} compact />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

function computeGap(leader: PilotLiveData, pilot: PilotLiveData, sessionType: string): number | null {
  if (sessionType === 'race') {
    if (leader.laps !== pilot.laps) {
      return leader.laps - pilot.laps;
    }
    if (leader.bestLap != null && pilot.bestLap != null) {
      return pilot.bestLap - leader.bestLap;
    }
    return null;
  }
  if (leader.bestLap != null && pilot.bestLap != null) {
    return pilot.bestLap - leader.bestLap;
  }
  return null;
}

export default RankingTable;
