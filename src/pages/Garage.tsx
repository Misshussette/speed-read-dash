import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Car, Settings2, Wrench, Pencil, Copy, ChevronDown, ChevronRight, X, Gauge, Layers, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGarage } from '@/contexts/GarageContext';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { computeTrackBenchmark } from '@/lib/track-benchmark';
import type { LapRecord } from '@/types/telemetry';
import type { TrackBenchmark } from '@/lib/track-benchmark';
import type { Car as CarType, Setup, Controller, Configuration } from '@/types/garage';
import SetupPerformanceImpact from '@/components/garage/SetupPerformanceImpact';
import SectionedParameterEditor from '@/components/garage/SectionedParameterEditor';
import SetupMediaUpload from '@/components/garage/SetupMediaUpload';
import TechnicalSheet from '@/components/garage/TechnicalSheet';

/* ── Vehicle Edit Dialog (inline) ── */
function VehicleForm({ car, onSave, onCancel }: { car?: CarType; onSave: (data: { brand: string; model: string; notes: string }) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [brand, setBrand] = useState(car?.brand || '');
  const [model, setModel] = useState(car?.model || '');
  const [notes, setNotes] = useState(car?.notes || '');

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Input placeholder={t('garage_brand')} value={brand} onChange={e => setBrand(e.target.value)} className="text-sm h-9" />
          <Input placeholder={t('garage_model')} value={model} onChange={e => setModel(e.target.value)} className="text-sm h-9" />
        </div>
        <Textarea placeholder={t('garage_notes')} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[60px]" />
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>{t('garage_cancel')}</Button>
          <Button size="sm" onClick={() => onSave({ brand: brand.trim(), model: model.trim(), notes: notes.trim() })} disabled={!brand.trim() || !model.trim()}>
            {car ? t('garage_save') : t('event_create')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── (ParameterEditor removed — replaced by SectionedParameterEditor) ── */

/* ── Controller Form ── */
function ControllerForm({ controller, onSave, onCancel }: {
  controller?: Controller;
  onSave: (data: { name: string; type: string; notes: string; custom_parameters: Record<string, string> }) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(controller?.name || '');
  const [type, setType] = useState(controller?.type || '');
  const [notes, setNotes] = useState(controller?.notes || '');
  const [params, setParams] = useState<Record<string, string>>(controller?.custom_parameters || {});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAddParam = () => {
    if (!newKey.trim()) return;
    setParams(prev => ({ ...prev, [newKey.trim()]: newValue.trim() }));
    setNewKey('');
    setNewValue('');
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Input placeholder={t('garage_ctrl_name')} value={name} onChange={e => setName(e.target.value)} className="text-sm h-9" />
          <Input placeholder={t('garage_ctrl_type')} value={type} onChange={e => setType(e.target.value)} className="text-sm h-9" />
        </div>
        <Textarea placeholder={t('garage_notes')} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[60px]" />
        {/* Custom parameters */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{t('garage_ctrl_params')}</p>
          {Object.entries(params).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-sm">
              <span className="font-medium text-muted-foreground min-w-[100px]">{k}</span>
              <span className="flex-1">{v}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                const next = { ...params }; delete next[k]; setParams(next);
              }}><X className="h-3 w-3" /></Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input placeholder={t('garage_param_key')} value={newKey} onChange={e => setNewKey(e.target.value)} className="text-sm h-8 w-32" />
            <Input placeholder={t('garage_param_value')} value={newValue} onChange={e => setNewValue(e.target.value)} className="text-sm h-8 flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAddParam()} />
            <Button variant="outline" size="sm" className="h-8" onClick={handleAddParam} disabled={!newKey.trim()}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>{t('garage_cancel')}</Button>
          <Button size="sm" onClick={() => onSave({ name: name.trim(), type: type.trim(), notes: notes.trim(), custom_parameters: params })} disabled={!name.trim()}>
            {controller ? t('garage_save') : t('event_create')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════ MAIN ════════════════════════════════════════ */

const Garage = () => {
  const { t } = useI18n();
  const {
    cars, setups, controllers, configurations, sessionLinks,
    addCar, updateCar, removeCar,
    addSetup, updateSetup, removeSetup, duplicateSetup,
    addController, updateController, removeController,
    addConfiguration, updateConfiguration, removeConfiguration,
    getSetupsForCar,
  } = useGarage();

  // ── Vehicle state ──
  const [showNewCar, setShowNewCar] = useState(false);
  const [editingCar, setEditingCar] = useState<string | null>(null);

  // ── Setup state ──
  const [showNewSetup, setShowNewSetup] = useState<string | null>(null);
  const [newSetupLabel, setNewSetupLabel] = useState('');
  const [expandedSetup, setExpandedSetup] = useState<string | null>(null);
  const [editingSetup, setEditingSetup] = useState<string | null>(null);
  const [setupDetailTab, setSetupDetailTab] = useState<string>('details');

  // ── Controller state ──
  const [showNewCtrl, setShowNewCtrl] = useState(false);
  const [editingCtrl, setEditingCtrl] = useState<string | null>(null);

  // ── Configuration state ──
  const [showNewConfig, setShowNewConfig] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<{ name: string; vehicle_id: string; setup_id: string; controller_id: string; notes: string }>({
    name: '', vehicle_id: '', setup_id: '', controller_id: '', notes: '',
  });

  // ── Setup performance data cache ──
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

  // ── Handlers ──
  const handleSaveCar = async (data: { brand: string; model: string; notes: string }, existingId?: string) => {
    if (existingId) {
      const car = cars.find(c => c.id === existingId);
      if (car) await updateCar({ ...car, brand: data.brand, model: data.model, notes: data.notes || null });
      setEditingCar(null);
      toast.success(t('garage_car_updated'));
    } else {
      await addCar({ brand: data.brand, model: data.model, scale: null, motor: null, weight: null, notes: data.notes || null });
      setShowNewCar(false);
      toast.success(t('garage_car_added'));
    }
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

  const handleSaveCtrl = async (data: { name: string; type: string; notes: string; custom_parameters: Record<string, string> }, existingId?: string) => {
    if (existingId) {
      const ctrl = controllers.find(c => c.id === existingId);
      if (ctrl) await updateController({ ...ctrl, ...data, notes: data.notes || null });
      setEditingCtrl(null);
      toast.success(t('garage_ctrl_updated'));
    } else {
      await addController({ ...data, notes: data.notes || null });
      setShowNewCtrl(false);
      toast.success(t('garage_ctrl_added'));
    }
  };

  // ── Configuration handlers ──
  const resetConfigForm = () => setConfigForm({ name: '', vehicle_id: '', setup_id: '', controller_id: '', notes: '' });

  const handleSaveConfig = async (existingId?: string) => {
    if (!configForm.name.trim() || !configForm.vehicle_id) return;
    if (existingId) {
      const existing = configurations.find(c => c.id === existingId);
      if (existing) await updateConfiguration({
        ...existing,
        name: configForm.name.trim(),
        vehicle_id: configForm.vehicle_id,
        setup_id: configForm.setup_id || null,
        controller_id: configForm.controller_id || null,
        notes: configForm.notes.trim() || null,
      });
      setEditingConfig(null);
      toast.success(t('garage_config_updated'));
    } else {
      await addConfiguration({
        name: configForm.name.trim(),
        vehicle_id: configForm.vehicle_id,
        setup_id: configForm.setup_id || null,
        controller_id: configForm.controller_id || null,
        notes: configForm.notes.trim() || null,
      });
      setShowNewConfig(false);
      toast.success(t('garage_config_added'));
    }
    resetConfigForm();
  };

  const startEditConfig = (config: Configuration) => {
    setEditingConfig(config.id);
    setConfigForm({
      name: config.name,
      vehicle_id: config.vehicle_id,
      setup_id: config.setup_id || '',
      controller_id: config.controller_id || '',
      notes: config.notes || '',
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">{t('nav_garage')}</h1>

      <Tabs defaultValue="vehicles">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="vehicles"><Car className="h-3.5 w-3.5 mr-1.5" />{t('garage_vehicles')}</TabsTrigger>
          <TabsTrigger value="setups"><Wrench className="h-3.5 w-3.5 mr-1.5" />{t('garage_setups')}</TabsTrigger>
          <TabsTrigger value="controllers"><Settings2 className="h-3.5 w-3.5 mr-1.5" />{t('garage_controllers')}</TabsTrigger>
          <TabsTrigger value="configurations"><Layers className="h-3.5 w-3.5 mr-1.5" />{t('garage_configurations')}</TabsTrigger>
        </TabsList>

        {/* ═══════ VEHICLES ═══════ */}
        <TabsContent value="vehicles" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{t('garage_hint_vehicle')}</p>
            <Button variant="outline" size="sm" onClick={() => { setShowNewCar(!showNewCar); setEditingCar(null); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> {t('garage_add_car')}
            </Button>
          </div>

          {showNewCar && (
            <VehicleForm onSave={data => handleSaveCar(data)} onCancel={() => setShowNewCar(false)} />
          )}

          {cars.length === 0 && !showNewCar ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Car className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t('garage_no_cars')}</p>
              </CardContent>
            </Card>
          ) : (
            cars.map(car => (
              <Card key={car.id} className="bg-card border-border">
                {editingCar === car.id ? (
                  <VehicleForm car={car} onSave={data => handleSaveCar(data, car.id)} onCancel={() => setEditingCar(null)} />
                ) : (
                  <>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">{car.brand} {car.model}</CardTitle>
                        {car.notes && <p className="text-xs text-muted-foreground mt-1">{car.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingCar(car.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeCar(car.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {getSetupsForCar(car.id).length} {t('garage_setups').toLowerCase()}
                      </p>
                    </CardContent>
                  </>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* ═══════ SETUPS ═══════ */}
        <TabsContent value="setups" className="space-y-4 mt-4">
          <p className="text-xs text-muted-foreground">{t('garage_hint_setup')}</p>
          {cars.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Wrench className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t('garage_no_cars_for_setups')}</p>
              </CardContent>
            </Card>
          ) : (
            cars.map(car => {
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
                      carSetups.map(setup => {
                        const isExpanded = expandedSetup === setup.id;
                        const isEditing = editingSetup === setup.id;
                        const linkedSessions = setupSessionMap[setup.id] || [];

                        return (
                          <div key={setup.id} className="border border-border rounded-md">
                            <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
                              onClick={() => setExpandedSetup(isExpanded ? null : setup.id)}>
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span className="text-sm font-medium flex-1">{setup.label || '—'}</span>
                              {setup.tags.length > 0 && <span className="text-xs text-muted-foreground">{setup.tags.join(', ')}</span>}
                              {linkedSessions.length > 0 && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Gauge className="h-3 w-3 text-primary" /> {linkedSessions.length}
                                </span>
                              )}
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); setEditingSetup(isEditing ? null : setup.id); setExpandedSetup(setup.id); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); handleDuplicateSetup(setup.id); }}>
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); removeSetup(setup.id); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>

                            {isExpanded && (
                              <div className="px-3 pb-3 border-t border-border pt-2">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <Input value={setup.label || ''} onChange={e => updateSetup({ ...setup, label: e.target.value })}
                                      placeholder={t('garage_setup_label')} className="text-sm h-8" />
                                    <Textarea value={setup.notes || ''} onChange={e => updateSetup({ ...setup, notes: e.target.value })}
                                      placeholder={t('garage_notes')} className="text-sm min-h-[60px]" />
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
                                      {/* Media gallery */}
                                      {(setup.images || []).length > 0 && (
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
                                          {(setup.images || []).map((url, i) => (
                                            <div key={i} className="aspect-square rounded-md overflow-hidden border border-border bg-muted">
                                              <img src={url} alt={`Setup ${i + 1}`} className="w-full h-full object-cover" />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {/* Performance Impact */}
                                      {linkedSessions.length > 0 && (
                                        <SetupPerformanceImpact setup={setup} laps={getSetupData(setup.id).laps} benchmark={getSetupData(setup.id).benchmark} />
                                      )}
                                    </TabsContent>

                                    <TabsContent value="parameters" className="mt-2 space-y-2">
                                      {Object.keys(setup.parameters).length > 0 && (
                                        <div className="space-y-1">
                                          {Object.entries(setup.parameters).filter(([, v]) => v !== '').map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-2 text-xs">
                                              <span className="font-medium text-muted-foreground">{k}:</span>
                                              <span>{String(v)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {Object.keys(setup.custom_fields).length > 0 && (
                                        <div className="space-y-1">
                                          {Object.entries(setup.custom_fields).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-2 text-xs">
                                              <span className="font-medium text-muted-foreground">{k}:</span>
                                              <span>{v}</span>
                                            </div>
                                          ))}
                                        </div>
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
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ═══════ CONTROLLERS ═══════ */}
        <TabsContent value="controllers" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{t('garage_hint_controller')}</p>
            <Button variant="outline" size="sm" onClick={() => { setShowNewCtrl(!showNewCtrl); setEditingCtrl(null); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> {t('garage_add_ctrl')}
            </Button>
          </div>

          {showNewCtrl && (
            <ControllerForm onSave={data => handleSaveCtrl(data)} onCancel={() => setShowNewCtrl(false)} />
          )}

          {controllers.length === 0 && !showNewCtrl ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Settings2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t('garage_no_controllers')}</p>
              </CardContent>
            </Card>
          ) : (
            controllers.map(ctrl => (
              <Card key={ctrl.id} className="bg-card border-border">
                {editingCtrl === ctrl.id ? (
                  <ControllerForm controller={ctrl} onSave={data => handleSaveCtrl(data, ctrl.id)} onCancel={() => setEditingCtrl(null)} />
                ) : (
                  <>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">{ctrl.name}</CardTitle>
                        {ctrl.type && <p className="text-xs text-muted-foreground">{ctrl.type}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingCtrl(ctrl.id)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeController(ctrl.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {ctrl.notes && <p className="text-xs text-muted-foreground">{ctrl.notes}</p>}
                      {Object.entries(ctrl.custom_parameters).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-muted-foreground">{k}:</span>
                          <span>{v}</span>
                        </div>
                      ))}
                    </CardContent>
                  </>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* ═══════ CONFIGURATIONS ═══════ */}
        <TabsContent value="configurations" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{t('garage_hint_config')}</p>
            <Button variant="outline" size="sm" onClick={() => { setShowNewConfig(!showNewConfig); setEditingConfig(null); resetConfigForm(); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> {t('garage_add_config')}
            </Button>
          </div>

          {(showNewConfig || editingConfig) && (
            <Card className="bg-card border-border">
              <CardContent className="pt-4 space-y-3">
                <Input placeholder={t('garage_config_name')} value={configForm.name} onChange={e => setConfigForm(prev => ({ ...prev, name: e.target.value }))} className="text-sm h-9" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('garage_vehicles')}</label>
                    <Select value={configForm.vehicle_id} onValueChange={v => setConfigForm(prev => ({ ...prev, vehicle_id: v, setup_id: '' }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('garage_select_vehicle')} /></SelectTrigger>
                      <SelectContent>
                        {cars.map(c => <SelectItem key={c.id} value={c.id}>{c.brand} {c.model}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('garage_setups')}</label>
                    <Select value={configForm.setup_id} onValueChange={v => setConfigForm(prev => ({ ...prev, setup_id: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('garage_select_setup')} /></SelectTrigger>
                      <SelectContent>
                        {(configForm.vehicle_id ? getSetupsForCar(configForm.vehicle_id) : setups).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.label || '—'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('garage_controllers')}</label>
                    <Select value={configForm.controller_id} onValueChange={v => setConfigForm(prev => ({ ...prev, controller_id: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('garage_select_ctrl')} /></SelectTrigger>
                      <SelectContent>
                        {controllers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea placeholder={t('garage_notes')} value={configForm.notes} onChange={e => setConfigForm(prev => ({ ...prev, notes: e.target.value }))} className="text-sm min-h-[60px]" />
                <div className="flex items-center gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setShowNewConfig(false); setEditingConfig(null); resetConfigForm(); }}>{t('garage_cancel')}</Button>
                  <Button size="sm" onClick={() => handleSaveConfig(editingConfig || undefined)} disabled={!configForm.name.trim() || !configForm.vehicle_id}>
                    {editingConfig ? t('garage_save') : t('event_create')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {configurations.length === 0 && !showNewConfig ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Layers className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t('garage_no_configs')}</p>
              </CardContent>
            </Card>
          ) : (
            configurations.filter(() => !showNewConfig || true).map(config => {
              if (editingConfig === config.id) return null; // form shown above
              const vehicle = cars.find(c => c.id === config.vehicle_id);
              const setup = setups.find(s => s.id === config.setup_id);
              const ctrl = controllers.find(c => c.id === config.controller_id);
              return (
                <Card key={config.id} className="bg-card border-border">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{config.name}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {vehicle && <span className="text-xs text-muted-foreground"><Car className="h-3 w-3 inline mr-0.5" />{vehicle.brand} {vehicle.model}</span>}
                        {setup && <span className="text-xs text-muted-foreground"><Wrench className="h-3 w-3 inline mr-0.5" />{setup.label || '—'}</span>}
                        {ctrl && <span className="text-xs text-muted-foreground"><Settings2 className="h-3 w-3 inline mr-0.5" />{ctrl.name}</span>}
                      </div>
                      {config.notes && <p className="text-xs text-muted-foreground mt-1">{config.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditConfig(config)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeConfiguration(config.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Garage;
