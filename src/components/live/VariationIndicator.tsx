import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nContext';

interface VariationIndicatorProps {
  variation: number | null;
  className?: string;
}

const getLevel = (v: number | null): 'green' | 'yellow' | 'red' | 'none' => {
  if (v == null) return 'none';
  if (v <= 0.2) return 'green';
  if (v <= 0.5) return 'yellow';
  return 'red';
};

const levelColors: Record<string, string> = {
  green: 'text-emerald-400',
  yellow: 'text-yellow-400',
  red: 'text-destructive',
  none: 'text-muted-foreground',
};

const dotColors: Record<string, string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-yellow-400',
  red: 'bg-destructive',
  none: 'bg-muted-foreground',
};

const VariationIndicator = ({ variation, className }: VariationIndicatorProps) => {
  const { t } = useI18n();
  const level = getLevel(variation);

  if (variation == null) return null;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('h-2 w-2 rounded-full', dotColors[level])} />
      <span className={cn('font-mono text-xs tabular-nums', levelColors[level])}>
        ±{variation.toFixed(2)}s
      </span>
    </div>
  );
};

export default VariationIndicator;
