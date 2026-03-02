import { useState } from 'react';
import { Plus, X, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useI18n } from '@/i18n/I18nContext';
import { SLOT_CAR_TEMPLATE, SETUP_SECTIONS, type ParameterDefinition, type SetupSection } from '@/types/garage';

interface Props {
  parameters: Record<string, string | number>;
  customFields: Record<string, string>;
  onChange: (params: Record<string, string | number>, custom: Record<string, string>) => void;
}

const SECTION_LABELS: Record<SetupSection, string> = {
  chassis: 'garage_section_chassis',
  drivetrain: 'garage_section_drivetrain',
  motor: 'garage_section_motor',
  running_gear: 'garage_section_running_gear',
  guide: 'garage_section_guide',
  electrical: 'garage_section_electrical',
  body: 'garage_section_body',
  geometry: 'garage_section_geometry',
  track_conditions: 'garage_section_track_conditions',
};

export default function SectionedParameterEditor({ parameters, customFields, onChange }: Props) {
  const { t } = useI18n();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newSection, setNewSection] = useState('');

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  };

  // Group template fields by section
  const templateBySection = new Map<string, ParameterDefinition[]>();
  for (const p of SLOT_CAR_TEMPLATE) {
    const list = templateBySection.get(p.category) || [];
    list.push(p);
    templateBySection.set(p.category, list);
  }

  // Group custom fields by their stored section (prefix "section:" or "custom")
  const customBySection = new Map<string, { key: string; value: string }[]>();
  for (const [k, v] of Object.entries(customFields)) {
    const [sec, ...rest] = k.split(':');
    const actualKey = rest.length > 0 ? rest.join(':') : k;
    const section = rest.length > 0 ? sec : 'custom';
    const list = customBySection.get(section) || [];
    list.push({ key: actualKey, value: v });
    customBySection.set(section, list);
  }

  const handleParamChange = (key: string, value: string | number) => {
    onChange({ ...parameters, [key]: value }, customFields);
  };

  const handleParamRemove = (key: string) => {
    const next = { ...parameters };
    delete next[key];
    onChange(next, customFields);
  };

  const handleCustomRemove = (fullKey: string) => {
    const next = { ...customFields };
    delete next[fullKey];
    onChange(parameters, next);
  };

  const handleAddCustom = () => {
    if (!newKey.trim()) return;
    const prefix = newSection && newSection !== 'custom' ? `${newSection}:` : '';
    onChange(parameters, { ...customFields, [`${prefix}${newKey.trim()}`]: newValue.trim() });
    setNewKey('');
    setNewValue('');
  };

  const applyTemplate = () => {
    const newParams = { ...parameters };
    for (const p of SLOT_CAR_TEMPLATE) {
      if (!(p.key in newParams)) {
        newParams[p.key] = '';
      }
    }
    onChange(newParams, customFields);
    // Open all sections
    setOpenSections(new Set(SETUP_SECTIONS as readonly string[]));
  };

  const filledCount = Object.values(parameters).filter(v => v !== '' && v !== undefined).length +
    Object.keys(customFields).length;

  const renderField = (def: ParameterDefinition) => {
    const value = parameters[def.key];
    const hasValue = value !== undefined;

    if (!hasValue) return null;

    return (
      <div key={def.key} className="flex items-center gap-2 text-sm">
        <span className="font-medium text-muted-foreground min-w-[130px] text-xs">{def.label}</span>
        {def.type === 'select' ? (
          <Select value={String(value) || '__none__'} onValueChange={v => handleParamChange(def.key, v === '__none__' ? '' : v)}>
            <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {def.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={def.type === 'number' ? 'number' : 'text'}
            value={String(value)}
            onChange={e => handleParamChange(def.key, def.type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value)}
            placeholder={def.unit ? `(${def.unit})` : ''}
            className="text-xs h-7 flex-1"
            min={def.min ?? undefined}
            max={def.max ?? undefined}
          />
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleParamRemove(def.key)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Template button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{filledCount} {t('garage_parameters').toLowerCase()}</span>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={applyTemplate}>
          <Sparkles className="h-3 w-3" /> {t('garage_apply_template')}
        </Button>
      </div>

      {/* Sections */}
      {SETUP_SECTIONS.map(section => {
        const templateFields = templateBySection.get(section) || [];
        const activeFields = templateFields.filter(f => f.key in parameters);
        const customEntries = customBySection.get(section) || [];
        const totalInSection = activeFields.length + customEntries.length;
        const isOpen = openSections.has(section);

        if (totalInSection === 0 && !isOpen) {
          // Show collapsed empty section with count
          return (
            <div key={section} className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground py-1"
              onClick={() => toggleSection(section)}>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium">{t(SECTION_LABELS[section])}</span>
              <span className="text-[10px]">(0)</span>
            </div>
          );
        }

        return (
          <Collapsible key={section} open={isOpen} onOpenChange={() => toggleSection(section)}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium w-full hover:text-foreground py-1">
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>{t(SECTION_LABELS[section])}</span>
              {totalInSection > 0 && <span className="text-[10px] text-muted-foreground">({totalInSection})</span>}
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-5 space-y-1 pt-1">
              {activeFields.map(renderField)}
              {customEntries.map(({ key, value }) => {
                const fullKey = `${section}:${key}`;
                return (
                  <div key={fullKey} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-muted-foreground min-w-[130px] text-xs">{key}</span>
                    <Input value={value} onChange={e => {
                      const next = { ...customFields, [fullKey]: e.target.value };
                      onChange(parameters, next);
                    }} className="text-xs h-7 flex-1" />
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleCustomRemove(fullKey)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              {/* Add field from template that's not yet added */}
              {templateFields.filter(f => !(f.key in parameters)).length > 0 && (
                <Select onValueChange={key => handleParamChange(key, '')}>
                  <SelectTrigger className="h-7 text-xs w-full mt-1">
                    <SelectValue placeholder={`+ ${t('garage_add_field')}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {templateFields.filter(f => !(f.key in parameters)).map(f => (
                      <SelectItem key={f.key} value={f.key}>{f.label}{f.unit ? ` (${f.unit})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Custom fields outside sections */}
      {(customBySection.get('custom') || []).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{t('garage_custom_fields')}</p>
          {(customBySection.get('custom') || []).map(({ key, value }) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="font-medium text-muted-foreground min-w-[130px] text-xs">{key}</span>
              <Input value={value} onChange={e => {
                onChange(parameters, { ...customFields, [key]: e.target.value });
              }} className="text-xs h-7 flex-1" />
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleCustomRemove(key)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add custom field */}
      <div className="flex items-center gap-2 pt-1">
        <Select value={newSection} onValueChange={setNewSection}>
          <SelectTrigger className="h-7 text-xs w-28">
            <SelectValue placeholder={t('garage_param_category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">{t('garage_custom_fields')}</SelectItem>
            {SETUP_SECTIONS.map(s => (
              <SelectItem key={s} value={s}>{t(SECTION_LABELS[s])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder={t('garage_param_key')} value={newKey} onChange={e => setNewKey(e.target.value)} className="text-xs h-7 w-28" />
        <Input placeholder={t('garage_param_value')} value={newValue} onChange={e => setNewValue(e.target.value)} className="text-xs h-7 flex-1"
          onKeyDown={e => e.key === 'Enter' && handleAddCustom()} />
        <Button variant="outline" size="sm" className="h-7" onClick={handleAddCustom} disabled={!newKey.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
