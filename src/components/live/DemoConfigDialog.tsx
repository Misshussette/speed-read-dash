import { useState } from 'react';
import { Gamepad2, Clock, Users, Gauge, BarChart3, Flame, Brain } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/i18n/I18nContext';
import { DemoConfig, defaultDemoConfig, SkillLevel, VariabilityLevel } from '@/lib/demo-simulation';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (config: DemoConfig) => void;
}

const DemoConfigDialog = ({ open, onOpenChange, onStart }: Props) => {
  const { t } = useI18n();
  const [config, setConfig] = useState<DemoConfig>({ ...defaultDemoConfig });

  const update = <K extends keyof DemoConfig>(key: K, value: DemoConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            {t('demo_config_title')}
          </DialogTitle>
          <DialogDescription>{t('demo_config_desc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Race Type */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <Label className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              {t('demo_race_type')}
            </Label>
            <Select value={config.sessionType} onValueChange={(v) => update('sessionType', v as any)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="race">{t('live_session_race')}</SelectItem>
                <SelectItem value="qualifying">{t('live_session_qualifying')}</SelectItem>
                <SelectItem value="practice">{t('live_session_practice')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <Label className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t('demo_duration')}
            </Label>
            <Select value={String(config.durationMinutes)} onValueChange={(v) => update('durationMinutes', parseInt(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 min</SelectItem>
                <SelectItem value="5">5 min</SelectItem>
                <SelectItem value="10">10 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Teams */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <Label className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              {t('demo_teams')}
            </Label>
            <Select value={String(config.teamCount)} onValueChange={(v) => update('teamCount', parseInt(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <SelectItem key={n} value={String(n)}>{n} {t('demo_teams_label')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skill */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <Label className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              {t('demo_skill')}
            </Label>
            <Select value={config.skill} onValueChange={(v) => update('skill', v as SkillLevel)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">{t('demo_skill_mixed')}</SelectItem>
                <SelectItem value="excellent">{t('demo_skill_excellent')}</SelectItem>
                <SelectItem value="good">{t('demo_skill_good')}</SelectItem>
                <SelectItem value="average">{t('demo_skill_average')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Variability */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <Label className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              {t('demo_variability')}
            </Label>
            <Select value={config.variability} onValueChange={(v) => update('variability', v as VariabilityLevel)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('demo_var_low')}</SelectItem>
                <SelectItem value="medium">{t('demo_var_medium')}</SelectItem>
                <SelectItem value="high">{t('demo_var_high')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                {t('demo_sectors')}
              </Label>
              <Switch checked={config.enableSectors} onCheckedChange={(v) => update('enableSectors', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <Flame className="h-4 w-4 text-muted-foreground" />
                {t('demo_degradation')}
              </Label>
              <Switch checked={config.enableDegradation} onCheckedChange={(v) => update('enableDegradation', v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-muted-foreground" />
                {t('demo_fatigue')}
              </Label>
              <Switch checked={config.enableFatigue} onCheckedChange={(v) => update('enableFatigue', v)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={() => { onStart(config); onOpenChange(false); }} className="gap-2">
            <Gamepad2 className="h-4 w-4" />
            {t('demo_start')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DemoConfigDialog;
