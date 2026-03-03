import { useState } from 'react';
import { Gamepad2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLive } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';
import DemoConfigDialog from './DemoConfigDialog';
import { useDemoSimulation } from '@/hooks/useDemoSimulation';

const formatCountdown = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const DemoControls = () => {
  const { isDemoMode } = useLive();
  const { t } = useI18n();
  const { startDemo, stopDemo, isRunning, demoEnded, timeRemaining } = useDemoSimulation();
  const [showConfig, setShowConfig] = useState(false);

  if (isRunning) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 font-mono text-sm px-3 py-1">
          {formatCountdown(timeRemaining)}
        </Badge>
        <Button
          variant="destructive"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={stopDemo}
        >
          <Square className="h-3.5 w-3.5" />
          {t('demo_stop')}
        </Button>
      </div>
    );
  }

  if (demoEnded) {
    return (
      <Badge variant="outline" className="text-muted-foreground border-border font-mono text-xs">
        {t('demo_ended')}
      </Badge>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => setShowConfig(true)}
      >
        <Gamepad2 className="h-3.5 w-3.5" />
        {t('demo_start_button')}
      </Button>
      <DemoConfigDialog
        open={showConfig}
        onOpenChange={setShowConfig}
        onStart={startDemo}
      />
    </>
  );
};

export default DemoControls;
