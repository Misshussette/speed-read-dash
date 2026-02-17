import { useTelemetry } from '@/contexts/TelemetryContext';
import { useI18n } from '@/i18n/I18nContext';
import type { AnalysisScope } from '@/types/telemetry';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Focus, RotateCcw } from 'lucide-react';

const ToggleChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
      active
        ? 'bg-primary/20 text-primary border border-primary/30'
        : 'bg-secondary/30 text-muted-foreground border border-transparent hover:border-border'
    }`}
  >
    {label}
  </button>
);

const ScopePanel = () => {
  const { t } = useI18n();
  const { scope, setScope, resetScope, scopeOptions } = useTelemetry();

  const hasLanes = scopeOptions.lanes.length > 0;
  const hasEntities = scopeOptions.entities.length > 0;
  const hasDrivers = scopeOptions.drivers.length > 0;

  if (!hasEntities && !hasDrivers && !hasLanes) return null;

  const toggleArrayItem = <T extends string | number>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const updateScope = (partial: Partial<AnalysisScope>) => {
    const next = { ...scope, ...partial };
    // Auto-enable when any selection is made
    if (partial.entity_ids?.length || partial.drivers?.length || partial.track_positions?.length) {
      next.enabled = true;
    }
    // Auto-disable when all cleared
    if (next.entity_ids.length === 0 && next.drivers.length === 0 && next.track_positions.length === 0) {
      next.enabled = false;
    }
    setScope(next);
  };

  return (
    <Card className={`bg-card border-border ${scope.enabled ? 'border-primary/30' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Focus className={`h-4 w-4 ${scope.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
            <CardTitle className="text-sm font-semibold text-foreground">{t('scope_title')}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={scope.enabled}
              onCheckedChange={(enabled) => setScope({ ...scope, enabled })}
            />
            <span className="text-[10px] text-muted-foreground">{scope.enabled ? t('scope_enable') : t('scope_disable')}</span>
            {scope.enabled && (
              <Button variant="ghost" size="sm" onClick={resetScope} className="h-6 text-[10px] text-muted-foreground px-2">
                <RotateCcw className="h-3 w-3 mr-1" /> {t('scope_reset')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasEntities && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-1">{t('scope_entity')}</span>
            <div className="flex flex-wrap gap-1">
              <ToggleChip
                label={t('all')}
                active={scope.entity_ids.length === 0}
                onClick={() => updateScope({ entity_ids: [] })}
              />
              {scopeOptions.entities.map(e => (
                <ToggleChip
                  key={e}
                  label={e}
                  active={scope.entity_ids.includes(e)}
                  onClick={() => updateScope({ entity_ids: toggleArrayItem(scope.entity_ids, e) })}
                />
              ))}
            </div>
          </div>
        )}

        {hasDrivers && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-1">{t('scope_driver')}</span>
            <div className="flex flex-wrap gap-1">
              <ToggleChip
                label={t('all')}
                active={scope.drivers.length === 0}
                onClick={() => updateScope({ drivers: [] })}
              />
              {scopeOptions.drivers.map(d => (
                <ToggleChip
                  key={d}
                  label={d}
                  active={scope.drivers.includes(d)}
                  onClick={() => updateScope({ drivers: toggleArrayItem(scope.drivers, d) })}
                />
              ))}
            </div>
          </div>
        )}

        {hasLanes && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-1">{t('scope_lane')}</span>
            <div className="flex flex-wrap gap-1">
              <ToggleChip
                label={t('all')}
                active={scope.track_positions.length === 0}
                onClick={() => updateScope({ track_positions: [] })}
              />
              {scopeOptions.lanes.map(l => (
                <ToggleChip
                  key={l}
                  label={`L${l}`}
                  active={scope.track_positions.includes(l)}
                  onClick={() => updateScope({ track_positions: toggleArrayItem(scope.track_positions, l) })}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScopePanel;
