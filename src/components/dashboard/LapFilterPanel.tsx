/**
 * Lap filter settings panel — coefficient config + cleaned mode toggle.
 * Minimal, non-intrusive UI integrated into Analysis page.
 */
import { useState } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Filter, Settings2, Info } from 'lucide-react';
import type { FilterConfig } from '@/lib/lap-filter';

interface LapFilterPanelProps {
  cleanedMode: boolean;
  onCleanedModeChange: (v: boolean) => void;
  excludedCount: number;
  totalLaps: number;
  filterConfig: FilterConfig;
  onConfigChange: (config: Partial<FilterConfig>) => void;
}

const LapFilterPanel = ({
  cleanedMode,
  onCleanedModeChange,
  excludedCount,
  totalLaps,
  filterConfig,
  onConfigChange,
}: LapFilterPanelProps) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Cleaned mode toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={cleanedMode}
          onCheckedChange={onCleanedModeChange}
          id="cleaned-mode"
        />
        <Label htmlFor="cleaned-mode" className="text-xs font-medium text-foreground cursor-pointer">
          {t('filter_cleaned_analysis')}
        </Label>
      </div>

      {/* Excluded count badge */}
      {cleanedMode && excludedCount > 0 && (
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Filter className="h-3 w-3" />
          {t('filter_laps_excluded').replace('{count}', excludedCount.toString())}
        </Badge>
      )}

      {/* Settings popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="w-72 bg-card border-border p-4 space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Settings2 className="h-4 w-4" />
            {t('filter_settings_title')}
          </div>

          <div className="space-y-3">
            {/* Upper coefficient */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('filter_upper_coeff')}</Label>
              <Input
                type="number"
                step="0.1"
                min="1.1"
                max="5"
                value={filterConfig.upper_coefficient}
                onChange={(e) => onConfigChange({ upper_coefficient: parseFloat(e.target.value) || 1.8 })}
                className="h-8 text-xs"
              />
            </div>

            {/* Lower coefficient */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('filter_lower_coeff')}</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="0.9"
                value={filterConfig.lower_coefficient}
                onChange={(e) => onConfigChange({ lower_coefficient: parseFloat(e.target.value) || 0.5 })}
                className="h-8 text-xs"
              />
            </div>

            {/* Optional fixed thresholds */}
            <div className="border-t border-border pt-3 space-y-1">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">{t('filter_min_laptime')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </PopoverTrigger>
                  <PopoverContent side="top" className="w-48 text-[10px] text-muted-foreground p-2 bg-card border-border">
                    {t('filter_threshold_help')}
                  </PopoverContent>
                </Popover>
              </div>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="—"
                value={filterConfig.min_lap_time_s ?? ''}
                onChange={(e) => onConfigChange({ min_lap_time_s: e.target.value ? parseFloat(e.target.value) : null })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('filter_max_laptime')}</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="—"
                value={filterConfig.max_lap_time_s ?? ''}
                onChange={(e) => onConfigChange({ max_lap_time_s: e.target.value ? parseFloat(e.target.value) : null })}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default LapFilterPanel;
