import { cn } from '@/lib/utils';
import { SectorTimes, PilotLiveData } from '@/contexts/LiveContext';

export type SectorColor = 'purple' | 'green' | 'red' | 'neutral';
export type SectorKey = 's1' | 's2' | 's3';

interface SectorCellProps {
  value: number | null;
  color?: SectorColor;
  className?: string;
}

const colorMap: Record<SectorColor, string> = {
  purple: 'text-purple-400',
  green: 'text-emerald-400',
  red: 'text-destructive',
  neutral: 'text-foreground',
};

const formatSector = (v: number | null): string => {
  if (v == null) return '';
  return v.toFixed(3);
};

/**
 * Resolve sector color:
 * - Purple = best sector across all pilots in the session (overall best)
 * - Green  = matches this pilot's personal best sector
 * - Neutral = normal
 */
export function resolveSectorColor(
  value: number | null,
  sector: SectorKey,
  pilotBestSectors: SectorTimes,
  allPilots: PilotLiveData[],
): SectorColor {
  if (value == null) return 'neutral';

  // Compute session-best for this sector
  let sessionBest: number | null = null;
  for (const p of allPilots) {
    const pb = p.bestSectors[sector];
    if (pb != null && (sessionBest == null || pb < sessionBest)) {
      sessionBest = pb;
    }
  }

  // Purple: matches or beats session best (within 0.001 tolerance)
  if (sessionBest != null && value <= sessionBest + 0.001) {
    return 'purple';
  }

  // Green: matches pilot's personal best (within 0.001 tolerance)
  const personalBest = pilotBestSectors[sector];
  if (personalBest != null && value <= personalBest + 0.001) {
    return 'green';
  }

  return 'neutral';
}

const SectorCell = ({ value, color = 'neutral', className }: SectorCellProps) => {
  if (value == null) return <span className={cn('font-mono text-sm', className)} />;
  return (
    <span className={cn('font-mono text-sm tabular-nums', colorMap[color], className)}>
      {formatSector(value)}
    </span>
  );
};

export default SectorCell;
