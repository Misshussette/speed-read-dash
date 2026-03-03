import { Radio, Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLive, SessionType, DataMode, Sensitivity } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';
import ConfigLockDialog from './ConfigLockDialog';
import DemoControls from './DemoControls';
import { useState } from 'react';

const LiveHeader = () => {
  const { session, setSessionType, setDataMode, sensitivity, setSensitivity, connectionStatus, isDemoMode } = useLive();
  const { t } = useI18n();
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  const isConnected = connectionStatus === 'connected' || connectionStatus === 'receiving'
    || connectionStatus === 'demo_active' || connectionStatus === 'demo_running';

  const statusColor: Record<string, string> = {
    connected: 'text-emerald-400',
    receiving: 'text-emerald-400 animate-pulse',
    paused: 'text-amber-400',
    disconnected: 'text-destructive',
    demo_active: 'text-emerald-400',
    demo_running: 'text-emerald-400 animate-pulse',
    demo_ended: 'text-destructive',
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Radio className={`h-5 w-5 ${statusColor[connectionStatus] ?? 'text-muted-foreground'}`} />
        <h1 className="text-xl font-bold text-foreground">{t('live_title')}</h1>
        {isConnected && (
          <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
            {isDemoMode ? t('demo_mode_label') : t('live_connected')}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Demo controls */}
        <DemoControls />

        {/* Session Type */}
        <Select
          value={session.sessionType}
          onValueChange={(v) => setSessionType(v as SessionType)}
          disabled={session.configLocked}
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="race">{t('live_session_race')}</SelectItem>
            <SelectItem value="qualifying">{t('live_session_qualifying')}</SelectItem>
            <SelectItem value="practice">{t('live_session_practice')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Data Mode */}
        <Select
          value={session.dataMode}
          onValueChange={(v) => setDataMode(v as DataMode)}
          disabled={session.configLocked}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="analog">{t('live_mode_analog')}</SelectItem>
            <SelectItem value="digital">{t('live_mode_digital')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Sensitivity */}
        <Select value={sensitivity} onValueChange={(v) => setSensitivity(v as Sensitivity)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stable">{t('live_sens_stable')}</SelectItem>
            <SelectItem value="standard">{t('live_sens_standard')}</SelectItem>
            <SelectItem value="sensitive">{t('live_sens_sensitive')}</SelectItem>
            <SelectItem value="very_sensitive">{t('live_sens_very_sensitive')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Config Lock */}
        {session.configLocked ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowUnlockDialog(true)}
          >
            <Lock className="h-4 w-4 text-amber-400" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={t('live_lock_config')}
            disabled
          >
            <Unlock className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      <ConfigLockDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog} />
    </div>
  );
};

export default LiveHeader;
