import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Wrench, Pencil, Copy, ChevronDown, ChevronRight, Gauge, Ruler, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGarage } from '@/contexts/GarageContext';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { computeTrackBenchmark } from '@/lib/track-benchmark';
import type { LapRecord } from '@/types/telemetry';
import type { TrackBenchmark } from '@/lib/track-benchmark';
import SetupPerformanceImpact from '@/components/garage/SetupPerformanceImpact';
import SectionedParameterEditor from '@/components/garage/SectionedParameterEditor';
import SetupMediaUpload from '@/components/garage/SetupMediaUpload';
import TechnicalSheet from '@/components/garage/TechnicalSheet';

function TagInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <Input
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ',') && value.trim()) {
          e.preventDefault();
          onAdd(value.trim());
          setValue('');
        }
      }}
      onBlur={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}
      placeholder="+ tag"
      className="h-6 w-24 text-xs px-2"
    />
  );
}

const GarageSetups = () => {
  const { t } = useI18n();
  const { cars, setups, getSetupsForCar, addSetup, updateSetup, removeSetup, duplicateSetup, sessionLinks } = useGarage();

  const [showNewSetup, setShowNewSetup] = useState<string | null>(null);
  const [newSetupLabel, setNewSetupLabel] = useState('');
  const [expandedSetup, setExpandedSetup] = useState<string | null>(null);
  const [editingSetup, setEditingSetup] = useState<string | null>(null);
  const [setupDetailTab, setSetupDetailTab] = useState<string>('details');
  const [sessionCache, setSessionCache] = useState<Record<string, { laps: LapRecord[]; benchmark: TrackBenchmark }>>({});

  const setupSessionMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const link of sessionLinks) {
      if (link.setup_id) {
        if (!map[link.setup_id]) map[link.setup_id] = [];
        map[link.setup_id].push(link.session_id);
      }
    }
    return map;
  }, [sessionLinks]);

  useEffect(() => {
    if (!expandedSetup) return;
    const sessionIds = setupSessionMap[expandedSetup] || [];
    const missing = sessionIds.filter(id => !sessionCache[id]);
    if (missing.length === 0) return;

    const load = async () => {
      for (const sid of missing) {
        const { data } = await supabase
          .from('laps').select('*').eq('session_id', sid).order('sort_key', { ascending: true });
        if (data && data.length > 0) {
          const laps: LapRecord[] = data.map(row => ({
            session_id: row.session_id, date: '', track: '', car_model: '', brand: '',
            driver: row.driver || '', stint: row.stint, lap_number: row.lap_number,
            lap_time_s: row.lap_time_s, S1_s: row.s1_s, S2_s: row.s2_s, S3_s: row.s3_s,
            pit_type: row.pit_type || '', pit_time_s: row.pit_time_s,
            timestamp: row.timestamp || '', lane: row.lane, driving_station: row.driving_station,
            team_number: row.team_number, stint_elapsed_s: row.stint_elapsed_s,
            session_elapsed_s: row.session_elapsed_s,
            lap_status: row.lap_status as LapRecord['lap_status'],
            validation_flags: row.validation_flags || [], _sort_key: row.sort_key,
          }));
          const benchmark = computeTrackBenchmark(laps);
          setSessionCache(prev => ({ ...prev, [sid]: { laps, benchmark } }));
        }
      }
    };
    load();
  }, [expandedSetup, setupSessionMap, sessionCache]);

  const getSetupData = (setupId: string) => {
    const sessionIds = setupSessionMap[setupId] || [];
    const allLaps: LapRecord[] = [];
    for (const sid of sessionIds) { if (sessionCache[sid]) allLaps.push(...sessionCache[sid].laps); }
    const benchmark = allLaps.length > 0 ? computeTrackBenchmark(allLaps) : { trackBestLap: null, bestS1: null, bestS2: null, bestS3: null, theoreticalBest: null, hasSectorData: false };
    return { laps: allLaps, benchmark };
  };

  const handleAddSetup = async (carId: string) => {
    if (!newSetupLabel.trim()) return;
    await addSetup({ car_id: carId, label: newSetupLabel.trim(), notes: null, tags: [], parameters: {}, custom_fields: {}, images: [] });
    setNewSetupLabel('');
    setShowNewSetup(null);
    toast.success(t('garage_setup_added'));
  };

  const handleDuplicateSetup = async (id: string) => {
    await duplicateSetup(id);
    toast.success(t('garage_setup_duplicated'));
  };

  if (cars.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <Wrench className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">{t('garage_no_cars_for_setups')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t('garage_hint_setup')}</p>
      {cars.map(car => {
        const carSetups = getSetupsForCar(car.id);
        return (
          <Card key={car.id} className="bg-card border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">{car.brand} {car.model}</CardTitle>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowNewSetup(showNewSetup === car.id ? null : car.id)}>
                <Plus className="h-3 w-3 mr-1" /> {t('garage_add_setup')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {showNewSetup === car.id && (
                <div className="flex items-center gap-2 mb-2">
                  <Input placeholder={t('garage_setup_label')} value={newSetupLabel} onChange={e => setNewSetupLabel(e.target.value)}
                    className="text-sm h-8" onKeyDown={e => e.key === 'Enter' && handleAddSetup(car.id)} />
                  <Button size="sm" className="h-8 text-xs" onClick={() => handleAddSetup(car.id)} disabled={!newSetupLabel.trim()}>
                    {t('event_create')}
                  </Button>
                </div>
              )}

              {carSetups.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">{t('garage_no_setups')}</p>
              ) : (
                /* Compact table view */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-8"></TableHead>
                      <TableHead className="text-xs">{t('garage_setup_label')}</TableHead>
                      <TableHead className="text-xs">{t('garage_tags')}</TableHead>
                      <TableHead className="text-xs text-right">{t('setup_perf_laps')}</TableHead>
                      <TableHead className="text-xs text-right w-28">{t('events_actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carSetups.map(setup => {
                      const isExpanded = expandedSetup === setup.id;
                      const isEditing = editingSetup === setup.id;
                      const linkedSessions = setupSessionMap[setup.id] || [];

                      return (
                        <TableRow key={setup.id} className="group">
                          <TableCell className="p-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpandedSetup(isExpanded ? null : setup.id)}>
                              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{setup.label || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{setup.tags.length > 0 ? setup.tags.join(', ') : '—'}</TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {linkedSessions.length > 0 && (
                              <span className="flex items-center justify-end gap-1">
                                <Gauge className="h-3 w-3 text-primary" /> {linkedSessions.length}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="p-1">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingSetup(isEditing ? null : setup.id); setExpandedSetup(setup.id); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDuplicateSetup(setup.id)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeSetup(setup.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {/* Expanded setup detail */}
              {expandedSetup && carSetups.find(s => s.id === expandedSetup) && (() => {
                const setup = carSetups.find(s => s.id === expandedSetup)!;
                const isEditing = editingSetup === setup.id;
                const linkedSessions = setupSessionMap[setup.id] || [];

                return (
                  <div className="border border-border rounded-md p-3 mt-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input value={setup.label || ''} onChange={e => updateSetup({ ...setup, label: e.target.value })}
                          placeholder={t('garage_setup_label')} className="text-sm h-8" />
                        <Textarea value={setup.notes || ''} onChange={e => updateSetup({ ...setup, notes: e.target.value })}
                          placeholder={t('garage_notes')} className="text-sm min-h-[60px]" />
                        {/* Tag editor */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t('garage_tags')}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {setup.tags.map((tag, i) => (
                              <span key={i} className="inline-flex items-center gap-0.5 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                                {tag}
                                <button type="button" className="hover:text-destructive" onClick={() => updateSetup({ ...setup, tags: setup.tags.filter((_, j) => j !== i) })}>
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                            <TagInput onAdd={(tag) => {
                              if (tag && !setup.tags.includes(tag)) updateSetup({ ...setup, tags: [...setup.tags, tag] });
                            }} />
                          </div>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{t('garage_parameters')}</p>
                        <SectionedParameterEditor
                          parameters={setup.parameters}
                          customFields={setup.custom_fields}
                          onChange={(params, custom) => updateSetup({ ...setup, parameters: params, custom_fields: custom })}
                        />
                        <SetupMediaUpload
                          images={setup.images || []}
                          onImagesChange={imgs => updateSetup({ ...setup, images: imgs })}
                          setupId={setup.id}
                        />
                        <div className="flex justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setEditingSetup(null)}>{t('garage_done')}</Button>
                        </div>
                      </div>
                    ) : (
                      <Tabs value={setupDetailTab} onValueChange={setSetupDetailTab} className="mt-1">
                        <TabsList className="h-7 bg-muted/50">
                          <TabsTrigger value="details" className="text-xs h-6 px-2">{t('garage_tab_details')}</TabsTrigger>
                          <TabsTrigger value="parameters" className="text-xs h-6 px-2">{t('garage_parameters')}</TabsTrigger>
                          <TabsTrigger value="techsheet" className="text-xs h-6 px-2"><Ruler className="h-3 w-3 mr-1" />{t('garage_techsheet')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="mt-2 space-y-3">
                          {setup.notes && <p className="text-xs text-muted-foreground">{setup.notes}</p>}
                          {(setup.images || []).length > 0 && (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
                              {(setup.images || []).map((url, i) => (
                                <div key={i} className="aspect-square rounded-md overflow-hidden border border-border bg-muted">
                                  <img src={url} alt={`Setup ${i + 1}`} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                          {linkedSessions.length > 0 && (
                            <SetupPerformanceImpact setup={setup} laps={getSetupData(setup.id).laps} benchmark={getSetupData(setup.id).benchmark} />
                          )}
                        </TabsContent>

                        <TabsContent value="parameters" className="mt-2 space-y-2">
                          {/* Inline editable parameter table */}
                          {Object.keys(setup.parameters).length > 0 && (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">{t('garage_param_name')}</TableHead>
                                  <TableHead className="text-xs">{t('garage_param_value')}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.entries(setup.parameters).filter(([, v]) => v !== '').map(([k, v]) => (
                                  <TableRow key={k}>
                                    <TableCell className="text-xs font-medium text-muted-foreground py-1">{k}</TableCell>
                                    <TableCell className="py-1">
                                      <Input
                                        value={String(v)}
                                        onChange={e => updateSetup({ ...setup, parameters: { ...setup.parameters, [k]: e.target.value } })}
                                        className="h-7 text-xs border-transparent hover:border-border focus:border-primary"
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                          {Object.keys(setup.custom_fields).length > 0 && (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">{t('garage_custom_fields')}</TableHead>
                                  <TableHead className="text-xs">{t('garage_param_value')}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.entries(setup.custom_fields).map(([k, v]) => (
                                  <TableRow key={k}>
                                    <TableCell className="text-xs font-medium text-muted-foreground py-1">{k}</TableCell>
                                    <TableCell className="py-1">
                                      <Input
                                        value={v}
                                        onChange={e => updateSetup({ ...setup, custom_fields: { ...setup.custom_fields, [k]: e.target.value } })}
                                        className="h-7 text-xs border-transparent hover:border-border focus:border-primary"
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                          {Object.keys(setup.parameters).length === 0 && Object.keys(setup.custom_fields).length === 0 && (
                            <p className="text-xs text-muted-foreground py-4 text-center">{t('garage_no_params')}</p>
                          )}
                        </TabsContent>

                        <TabsContent value="techsheet" className="mt-2">
                          <TechnicalSheet setup={setup} carLabel={`${car.brand} ${car.model}`} />
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default GarageSetups;
