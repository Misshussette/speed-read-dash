import { useState } from 'react';
import { Plus, Trash2, Car, Wrench, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGarage } from '@/contexts/GarageContext';
import { useI18n } from '@/i18n/I18nContext';
import { PARAMETER_TEMPLATES } from '@/types/garage';
import { toast } from 'sonner';

const Garage = () => {
  const { t } = useI18n();
  const { cars, setups, addCar, removeCar, addSetup, removeSetup, getSetupsForCar } = useGarage();
  const [showNewCar, setShowNewCar] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [showNewSetup, setShowNewSetup] = useState<string | null>(null);
  const [newSetupLabel, setNewSetupLabel] = useState('');

  const handleAddCar = async () => {
    if (!newBrand.trim() || !newModel.trim()) return;
    await addCar({ brand: newBrand.trim(), model: newModel.trim(), scale: null, motor: null, weight: null, notes: null });
    setNewBrand('');
    setNewModel('');
    setShowNewCar(false);
    toast.success(t('garage_car_added'));
  };

  const handleAddSetup = async (carId: string) => {
    if (!newSetupLabel.trim()) return;
    await addSetup({ car_id: carId, label: newSetupLabel.trim(), notes: null, tags: [], parameters: {}, custom_fields: {} });
    setNewSetupLabel('');
    setShowNewSetup(null);
    toast.success(t('garage_setup_added'));
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t('nav_garage')}</h1>
      </div>

      <Tabs defaultValue="vehicles">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="vehicles">
            <Car className="h-3.5 w-3.5 mr-1.5" />{t('garage_vehicles')}
          </TabsTrigger>
          <TabsTrigger value="controllers">
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />{t('garage_controllers')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="space-y-4 mt-4">
          <div className="flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowNewCar(!showNewCar)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> {t('garage_add_car')}
            </Button>
          </div>

          {showNewCar && (
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Input placeholder={t('garage_brand')} value={newBrand} onChange={(e) => setNewBrand(e.target.value)} className="text-sm h-9" />
                  <Input placeholder={t('garage_model')} value={newModel} onChange={(e) => setNewModel(e.target.value)} className="text-sm h-9" />
                  <Button size="sm" onClick={handleAddCar} disabled={!newBrand.trim() || !newModel.trim()}>
                    {t('event_create')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {cars.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Car className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t('garage_no_cars')}</p>
              </CardContent>
            </Card>
          ) : (
            cars.map(car => {
              const carSetups = getSetupsForCar(car.id);
              return (
                <Card key={car.id} className="bg-card border-border">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      {car.brand} {car.model}
                      {car.scale && <span className="text-xs text-muted-foreground ml-2">({car.scale})</span>}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewSetup(showNewSetup === car.id ? null : car.id)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeCar(car.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {showNewSetup === car.id && (
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          placeholder={t('garage_setup_label')}
                          value={newSetupLabel}
                          onChange={(e) => setNewSetupLabel(e.target.value)}
                          className="text-sm h-8"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSetup(car.id)}
                        />
                        <Button size="sm" className="h-8 text-xs" onClick={() => handleAddSetup(car.id)} disabled={!newSetupLabel.trim()}>
                          {t('event_create')}
                        </Button>
                      </div>
                    )}
                    {carSetups.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">{t('garage_no_setups')}</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">{t('garage_setup_label')}</TableHead>
                            <TableHead className="text-xs">{t('garage_tags')}</TableHead>
                            <TableHead className="w-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {carSetups.map(setup => (
                            <TableRow key={setup.id}>
                              <TableCell className="text-sm font-medium">{setup.label || '—'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{setup.tags.join(', ') || '—'}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeSetup(setup.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="controllers" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">{t('garage_param_templates')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t('garage_param_name')}</TableHead>
                    <TableHead className="text-xs">{t('garage_param_category')}</TableHead>
                    <TableHead className="text-xs">{t('garage_param_type')}</TableHead>
                    <TableHead className="text-xs">{t('garage_param_unit')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PARAMETER_TEMPLATES.map(p => (
                    <TableRow key={p.key}>
                      <TableCell className="text-sm">{p.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground capitalize">{p.category}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.unit || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Garage;
