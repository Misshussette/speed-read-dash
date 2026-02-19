import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Download, Calendar, Users, MapPin, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { useI18n } from '@/i18n/I18nContext';

export interface RaceCatalogEntry {
  race_id: string;
  name: string;
  date: string;
  track: string;
  duration: string;
  lap_count: number;
  best_lap: number | null;
  comment: string;
  drivers: { name: string; lane: number | null; bestLap: number | null }[];
}

export interface MdbImportOptions {
  raceIds: string[];
  drivers?: string[];
  bestLapsOnly?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: RaceCatalogEntry[];
  isImporting: boolean;
  onImport: (options: MdbImportOptions) => void;
}

export default function MdbRaceSelector({ open, onOpenChange, catalog, isImporting, onImport }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [expandedRace, setExpandedRace] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
  const [bestLapsOnly, setBestLapsOnly] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return catalog;
    const q = search.toLowerCase();
    return catalog.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.track.toLowerCase().includes(q) ||
      r.date.includes(q) ||
      r.drivers.some(d => d.name.toLowerCase().includes(q))
    );
  }, [catalog, search]);

  // All unique drivers across selected races (or all if none selected)
  const allDrivers = useMemo(() => {
    const drivers = new Set<string>();
    for (const race of catalog) {
      if (selected.size === 0 || selected.has(race.race_id)) {
        for (const d of race.drivers) {
          if (d.name && d.name !== 'Unknown') drivers.add(d.name);
        }
      }
    }
    return Array.from(drivers).sort();
  }, [catalog, selected]);

  const toggleSelect = (raceId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(raceId)) next.delete(raceId);
      else next.add(raceId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.race_id)));
  };

  const toggleDriver = (driver: string) => {
    setSelectedDrivers(prev => {
      const next = new Set(prev);
      if (next.has(driver)) next.delete(driver);
      else next.add(driver);
      return next;
    });
  };

  const totalLaps = useMemo(() => {
    return filtered.filter(r => selected.has(r.race_id)).reduce((sum, r) => sum + r.lap_count, 0);
  }, [filtered, selected]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'dd/MM/yyyy HH:mm'); }
    catch { return dateStr; }
  };

  const activeFilterCount = (selectedDrivers.size > 0 ? 1 : 0) + (bestLapsOnly ? 1 : 0);

  const handleImport = () => {
    onImport({
      raceIds: Array.from(selected),
      drivers: selectedDrivers.size > 0 ? Array.from(selectedDrivers) : undefined,
      bestLapsOnly,
    });
  };

  return (
    <Dialog open={open} onOpenChange={isImporting ? undefined : onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('mdb_select_races')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('mdb_select_races_desc').replace('{count}', String(catalog.length))}
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder={t('mdb_search_races')} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>

        {/* Select all + summary + filter toggle */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} />
            <span className="text-muted-foreground">{t('mdb_select_all')} ({filtered.length})</span>
          </label>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {selected.size} {t('mdb_races_selected')} · {totalLaps} {t('mobile_laps')}
              </span>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-3 w-3" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <div className="border rounded-md p-3 space-y-3 bg-muted/30">
              {/* Driver filter */}
              {allDrivers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-1.5">
                    <Users className="h-3 w-3 inline mr-1" />
                    Filter by driver
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {allDrivers.map(driver => (
                      <Button
                        key={driver}
                        variant={selectedDrivers.has(driver) ? 'default' : 'outline'}
                        size="sm"
                        className="h-6 text-[11px] px-2"
                        onClick={() => toggleDriver(driver)}
                      >
                        {driver}
                      </Button>
                    ))}
                  </div>
                  {selectedDrivers.size > 0 && (
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] mt-1 text-muted-foreground"
                      onClick={() => setSelectedDrivers(new Set())}>
                      Clear driver filter
                    </Button>
                  )}
                </div>
              )}
              {/* Best laps only */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-foreground cursor-pointer">Best laps only (one per driver per race)</label>
                <Switch checked={bestLapsOnly} onCheckedChange={setBestLapsOnly} />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Race list */}
        <ScrollArea className="flex-1 min-h-0 max-h-[45vh] border rounded-md [&>[data-radix-scroll-area-viewport]]:max-h-[45vh]">
          <div className="divide-y divide-border">
            {filtered.map(race => {
              const isExpanded = expandedRace === race.race_id;
              return (
                <div key={race.race_id} className="px-3 py-2.5 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-2">
                    <Checkbox checked={selected.has(race.race_id)} onCheckedChange={() => toggleSelect(race.race_id)} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{race.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {race.lap_count} {t('mobile_laps')}
                        </Badge>
                        {race.best_lap != null && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                            ⚡ {race.best_lap.toFixed(3)}s
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {race.date && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(race.date)}</span>
                        )}
                        {race.track && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{race.track}</span>
                        )}
                        {race.drivers.length > 0 && (
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{race.drivers.length}</span>
                        )}
                      </div>
                    </div>
                    {race.drivers.length > 0 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                        onClick={() => setExpandedRace(isExpanded ? null : race.race_id)}>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                  {isExpanded && race.drivers.length > 0 && (
                    <div className="ml-7 mt-2 space-y-1">
                      {race.drivers.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{d.name}</span>
                          {d.lane !== null && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">Lane {d.lane}</Badge>
                          )}
                          {d.bestLap !== null && (
                            <span className="font-mono">{d.bestLap.toFixed(3)}s</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">{t('mdb_no_races_found')}</div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>{t('garage_cancel')}</Button>
          <Button onClick={handleImport} disabled={selected.size === 0 || isImporting}>
            {isImporting ? (
              <span className="flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                {t('mdb_importing')}
              </span>
            ) : (
              `${t('mdb_import_selected')} (${selected.size})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
