import { useState } from 'react';
import { Plus, Trash2, Car, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGarage } from '@/contexts/GarageContext';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from 'sonner';
import type { Car as CarType } from '@/types/garage';

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

const GarageVehicles = () => {
  const { t } = useI18n();
  const { cars, addCar, updateCar, removeCar, getSetupsForCar } = useGarage();
  const [showNewCar, setShowNewCar] = useState(false);
  const [editingCar, setEditingCar] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
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
    </div>
  );
};

export default GarageVehicles;
