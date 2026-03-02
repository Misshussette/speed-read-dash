import { useState, useRef } from 'react';
import { Plus, Trash2, Car, Pencil, ImagePlus, X, Wrench, ChevronRight, Gauge, Timer, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGarage } from '@/contexts/GarageContext';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { Car as CarType } from '@/types/garage';

/* ── Inline Vehicle Form (modal-like card) ── */
function VehicleForm({ car, onSave, onCancel }: {
  car?: CarType;
  onSave: (data: { brand: string; model: string; notes: string; image: string | null }) => void;
  onCancel: () => void;
}) {
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
    <div className="garage-card p-5 space-y-4">
      {/* Image upload */}
      <div className="flex gap-4 items-start">
        {image ? (
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
            <img src={image} alt="Vehicle" className="w-full h-full object-cover" />
            <button type="button" className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors" onClick={() => setImage(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shrink-0 gap-1">
            <ImagePlus className="h-6 w-6" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Photo</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <Input placeholder={t('garage_brand')} value={brand} onChange={e => setBrand(e.target.value)} className="text-sm h-10" />
            <Input placeholder={t('garage_model')} value={model} onChange={e => setModel(e.target.value)} className="text-sm h-10" />
          </div>
          <Textarea placeholder={t('garage_notes')} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[56px] resize-none" />
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end border-t border-border pt-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>{t('garage_cancel')}</Button>
        <Button size="sm" onClick={() => onSave({ brand: brand.trim(), model: model.trim(), notes: notes.trim(), image })} disabled={!brand.trim() || !model.trim()}>
          {car ? t('garage_save') : t('event_create')}
        </Button>
      </div>
    </div>
  );
}

/* ── Vehicle Paddock Card ── */
function VehicleCard({ car, setupCount, onEdit, onDelete }: {
  car: CarType;
  setupCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  // Mock performance data — will be replaced with real aggregates
  const mockBestLap = '4.832';
  const mockConsistency = '97.2%';
  const mockRuns = Math.max(1, setupCount * 2);

  return (
    <div className="garage-card group flex flex-col">
      {/* Hero image area */}
      <div className="relative h-40 bg-muted/50 overflow-hidden">
        {car.image ? (
          <img src={car.image} alt={`${car.brand} ${car.model}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />

        {/* Vehicle name overlay */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-base font-bold text-foreground tracking-tight leading-tight">{car.brand} {car.model}</h3>
          {car.notes && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{car.notes}</p>
          )}
        </div>

        {/* Edit / Delete floating actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit}
            className="h-7 w-7 rounded-md bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete}
            className="h-7 w-7 rounded-md bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <div className="px-3 py-2.5 text-center">
          <div className="garage-stat">{mockBestLap}s</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 flex items-center justify-center gap-1">
            <Timer className="h-2.5 w-2.5" /> Best
          </div>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="garage-stat">{mockConsistency}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 flex items-center justify-center gap-1">
            <TrendingUp className="h-2.5 w-2.5" /> Consist.
          </div>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="garage-stat">{mockRuns}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 flex items-center justify-center gap-1">
            <Gauge className="h-2.5 w-2.5" /> Runs
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 flex items-center gap-2 mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs gap-1.5"
          onClick={() => navigate('/garage/setups')}
        >
          <Wrench className="h-3 w-3" />
          {setupCount} {t('garage_setups')}
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs gap-1.5"
          onClick={() => navigate('/garage/setups')}
        >
          {t('nav_garage')}
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/* ── Main Page ── */
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
    <div className="garage-bg min-h-[60vh] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
            {cars.length} {cars.length === 1 ? 'vehicle' : 'vehicles'} registered
          </p>
        </div>
        <Button
          onClick={() => { setShowNewCar(!showNewCar); setEditingCar(null); }}
          className="gap-2 font-semibold"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          {t('garage_add_car')}
        </Button>
      </div>

      {/* New car form */}
      {showNewCar && (
        <VehicleForm onSave={data => handleSaveCar(data)} onCancel={() => setShowNewCar(false)} />
      )}

      {/* Edit form (shown inline above grid) */}
      {editingCar && (
        <VehicleForm
          car={cars.find(c => c.id === editingCar)}
          onSave={data => handleSaveCar(data, editingCar)}
          onCancel={() => setEditingCar(null)}
        />
      )}

      {/* Empty state */}
      {cars.length === 0 && !showNewCar ? (
        <div className="garage-card flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Car className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t('garage_no_cars')}</p>
          <Button onClick={() => setShowNewCar(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('garage_add_car')}
          </Button>
        </div>
      ) : (
        /* Vehicle card grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cars.map(car => (
            editingCar === car.id ? null : (
              <VehicleCard
                key={car.id}
                car={car}
                setupCount={getSetupsForCar(car.id).length}
                onEdit={() => setEditingCar(car.id)}
                onDelete={() => removeCar(car.id)}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default GarageVehicles;
