import { useState, useRef } from 'react';
import { Plus, Trash2, Car, Pencil, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGarage } from '@/contexts/GarageContext';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from 'sonner';
import type { Car as CarType } from '@/types/garage';

function VehicleForm({ car, onSave, onCancel }: { car?: CarType; onSave: (data: { brand: string; model: string; notes: string; image: string | null }) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [brand, setBrand] = useState(car?.brand || '');
  const [model, setModel] = useState(car?.model || '');
  const [notes, setNotes] = useState(car?.notes || '');
  const [image, setImage] = useState<string | null>(car?.image || null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-4 space-y-3">
        {/* Image */}
        <div className="flex items-center gap-3">
          {image ? (
            <div className="relative w-16 h-16 rounded-md overflow-hidden border border-border bg-muted shrink-0">
              <img src={image} alt="Vehicle" className="w-full h-full object-cover" />
              <button type="button" className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5" onClick={() => setImage(null)}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-md border border-dashed border-border bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-colors shrink-0">
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <div className="flex items-center gap-2 flex-1">
            <Input placeholder={t('garage_model')} value={model} onChange={e => setModel(e.target.value)} className="text-sm h-9" />
            <Input placeholder={t('garage_brand')} value={brand} onChange={e => setBrand(e.target.value)} className="text-sm h-9" />
          </div>
        </div>
        <Textarea placeholder={t('garage_notes')} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[60px]" />
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>{t('garage_cancel')}</Button>
          <Button size="sm" onClick={() => onSave({ brand: brand.trim(), model: model.trim(), notes: notes.trim(), image })} disabled={!brand.trim() || !model.trim()}>
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

  const handleSaveCar = async (data: { brand: string; model: string; notes: string; image: string | null }, existingId?: string) => {
    if (existingId) {
      const car = cars.find(c => c.id === existingId);
      if (car) await updateCar({ ...car, brand: data.brand, model: data.model, notes: data.notes || null, image: data.image });
      setEditingCar(null);
      toast.success(t('garage_car_updated'));
    } else {
      await addCar({ brand: data.brand, model: data.model, scale: null, motor: null, weight: null, notes: data.notes || null, image: data.image });
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
                  <div className="flex items-center gap-3">
                    {car.image ? (
                      <div className="w-10 h-10 rounded-md overflow-hidden border border-border bg-muted shrink-0">
                        <img src={car.image} alt={car.model} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-md border border-border bg-muted/50 flex items-center justify-center shrink-0">
                        <Car className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-sm font-semibold">{car.brand} {car.model}</CardTitle>
                      {car.notes && <p className="text-xs text-muted-foreground mt-0.5">{car.notes}</p>}
                    </div>
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