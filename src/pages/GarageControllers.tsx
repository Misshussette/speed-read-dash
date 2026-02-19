import { useState } from 'react';
import { Plus, Trash2, Settings2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGarage } from '@/contexts/GarageContext';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from 'sonner';
import type { Controller } from '@/types/garage';

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

const GarageControllers = () => {
  const { t } = useI18n();
  const { controllers, addController, updateController, removeController } = useGarage();
  const [showNewCtrl, setShowNewCtrl] = useState(false);
  const [editingCtrl, setEditingCtrl] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
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
    </div>
  );
};

export default GarageControllers;
