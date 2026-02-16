import { Filters } from '@/types/telemetry';
import { useI18n } from '@/i18n/I18nContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface FilterBarProps {
  options: { tracks: string[]; sessions: string[]; drivers: string[]; stints: number[] };
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
}

const FilterBar = ({ options, filters, onChange, onReset }: FilterBarProps) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={filters.track || '__all__'} onValueChange={(v) => onChange({ ...filters, track: v === '__all__' ? null : v })}>
        <SelectTrigger className="w-[160px] h-8 text-xs bg-secondary/50 border-border">
          <SelectValue placeholder={t('all_tracks')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('all_tracks')}</SelectItem>
          {options.tracks.map(tr => <SelectItem key={tr} value={tr}>{tr}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.session_id || '__all__'} onValueChange={(v) => onChange({ ...filters, session_id: v === '__all__' ? null : v })}>
        <SelectTrigger className="w-[160px] h-8 text-xs bg-secondary/50 border-border">
          <SelectValue placeholder={t('all_sessions')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{t('all_sessions')}</SelectItem>
          {options.sessions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap gap-1">
        {options.drivers.map(d => {
          const active = filters.drivers.length === 0 || filters.drivers.includes(d);
          return (
            <button
              key={d}
              onClick={() => {
                if (filters.drivers.length === 0) {
                  onChange({ ...filters, drivers: [d] });
                } else if (filters.drivers.includes(d)) {
                  onChange({ ...filters, drivers: filters.drivers.filter(x => x !== d) });
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

      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-xs text-muted-foreground">{t('pit_laps')}</span>
        <Switch checked={filters.includePitLaps} onCheckedChange={(v) => onChange({ ...filters, includePitLaps: v })} />
      </div>

      <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-xs text-muted-foreground">
        <RotateCcw className="h-3 w-3 mr-1" /> {t('reset')}
      </Button>
    </div>
  );
};

export default FilterBar;
