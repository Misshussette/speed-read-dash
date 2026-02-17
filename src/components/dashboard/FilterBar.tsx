import { Filters } from '@/types/telemetry';
import { useI18n } from '@/i18n/I18nContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RotateCcw, Focus } from 'lucide-react';

interface FilterBarProps {
  options: { tracks: string[]; sessions: string[]; cars: string[]; drivers: string[]; stints: number[] };
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
  scopeOptions?: { entities: string[]; drivers: string[]; lanes: number[] };
  hasScope?: boolean;
}

interface LabeledSelectProps {
  label: string;
  value: string;
  allLabel: string;
  options: string[];
  onValueChange: (v: string) => void;
}

const LabeledSelect = ({ label, value, allLabel, options, onValueChange }: LabeledSelectProps) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-medium uppercase tracking-wider text-foreground px-1">{label}</span>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[160px] h-8 text-xs bg-secondary/50 border-border hover:bg-secondary/80 transition-colors">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border z-50">
        <SelectItem value="__all__">{allLabel}</SelectItem>
        {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

const FilterBar = ({ options, filters, onChange, onReset, scopeOptions, hasScope }: FilterBarProps) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <LabeledSelect
        label={t('filter_label_track')}
        value={filters.track || '__all__'}
        allLabel={t('all_tracks')}
        options={options.tracks}
        onValueChange={(v) => onChange({ ...filters, track: v === '__all__' ? null : v })}
      />

      <LabeledSelect
        label={t('filter_label_session')}
        value={filters.session_id || '__all__'}
        allLabel={t('all_sessions')}
        options={options.sessions}
        onValueChange={(v) => onChange({ ...filters, session_id: v === '__all__' ? null : v })}
      />

      <LabeledSelect
        label={t('filter_label_car')}
        value={filters.car || '__all__'}
        allLabel={t('all_cars')}
        options={options.cars}
        onValueChange={(v) => onChange({ ...filters, car: v === '__all__' ? null : v })}
      />

      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-1">{t('filter_label_driver')}</span>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onChange({ ...filters, drivers: [] })}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
              filters.drivers.length === 0
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-secondary/30 text-muted-foreground border border-transparent hover:border-border'
            }`}
          >
            {t('all')}
          </button>
          {options.drivers.map(d => {
            const active = filters.drivers.length === 0 || filters.drivers.includes(d);
            return (
              <button
                key={d}
                onClick={() => {
                  if (filters.drivers.length === 0) {
                    onChange({ ...filters, drivers: [d] });
                  } else if (filters.drivers.includes(d)) {
                    const next = filters.drivers.filter(x => x !== d);
                    onChange({ ...filters, drivers: next });
                  } else {
                    onChange({ ...filters, drivers: [...filters.drivers, d] });
                  }
                }}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
                  active
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-secondary/30 text-muted-foreground border border-transparent hover:border-border'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-1">{t('filter_label_stint')}</span>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onChange({ ...filters, stints: [] })}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
              filters.stints.length === 0
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-secondary/30 text-muted-foreground border border-transparent hover:border-border'
            }`}
          >
            {t('all')}
          </button>
          {options.stints.map(s => {
            const active = filters.stints.length === 0 || filters.stints.includes(s);
            return (
              <button
                key={s}
                onClick={() => {
                  if (filters.stints.length === 0) {
                    onChange({ ...filters, stints: [s] });
                  } else if (filters.stints.includes(s)) {
                    const next = filters.stints.filter(x => x !== s);
                    onChange({ ...filters, stints: next });
                  } else {
                    onChange({ ...filters, stints: [...filters.stints, s] });
                  }
                }}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
                  active
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-secondary/30 text-muted-foreground border border-transparent hover:border-border'
                }`}
              >
                S{s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 ml-auto">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-1">{t('pit_laps')}</span>
        <div className="flex items-center gap-1.5 h-8">
          <Switch checked={filters.includePitLaps} onCheckedChange={(v) => onChange({ ...filters, includePitLaps: v })} />
          <span className="text-xs text-muted-foreground">{filters.includePitLaps ? t('filter_on') : t('filter_off')}</span>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-xs text-muted-foreground">
        <RotateCcw className="h-3 w-3 mr-1" /> {t('reset')}
      </Button>

      {hasScope && (
        <div className="flex items-center gap-1.5 ml-1">
          <Focus className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-primary">{t('scope_active')}</span>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
