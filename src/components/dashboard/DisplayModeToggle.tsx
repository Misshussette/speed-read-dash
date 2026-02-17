import { useDisplayMode } from '@/contexts/DisplayModeContext';
import { useI18n } from '@/i18n/I18nContext';
import { Switch } from '@/components/ui/switch';
import { GraduationCap, Wrench } from 'lucide-react';

const DisplayModeToggle = () => {
  const { displayMode, setDisplayMode } = useDisplayMode();
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <Wrench className={`h-3.5 w-3.5 ${displayMode === 'expert' ? 'text-primary' : 'text-muted-foreground/50'}`} />
      <Switch
        checked={displayMode === 'guided'}
        onCheckedChange={(checked) => setDisplayMode(checked ? 'guided' : 'expert')}
        aria-label={t('display_mode_toggle')}
      />
      <GraduationCap className={`h-3.5 w-3.5 ${displayMode === 'guided' ? 'text-primary' : 'text-muted-foreground/50'}`} />
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {displayMode === 'guided' ? t('mode_guided') : t('mode_expert')}
      </span>
    </div>
  );
};

export default DisplayModeToggle;
