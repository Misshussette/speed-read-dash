import { cn } from '@/lib/utils';

export type SectorColor = 'purple' | 'green' | 'red' | 'neutral';

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

const SectorCell = ({ value, color = 'neutral', className }: SectorCellProps) => {
  if (value == null) return <span className={cn('font-mono text-sm', className)} />;
  return (
    <span className={cn('font-mono text-sm tabular-nums', colorMap[color], className)}>
      {formatSector(value)}
    </span>
  );
};

export default SectorCell;
