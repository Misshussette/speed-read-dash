import { Radio, Lock, Unlock, Flag, Cpu, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLive, SessionType, DataMode, Sensitivity } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';
import ConfigLockDialog from './ConfigLockDialog';
import DemoControls from './DemoControls';
import { useState } from 'react';

const sessionDescKeys: Record<SessionType, string> = {
  practice: 'live_desc_practice',
  qualifying: 'live_desc_qualifying',
  race: 'live_desc_race',
};

const dataModeDescKeys: Record<DataMode, string> = {
  analog: 'live_desc_analog',
  digital: 'live_desc_digital',
};

const sensitivityDescKeys: Record<Sensitivity, string> = {
  stable: 'live_desc_sens_conservative',
  standard: 'live_desc_sens_balanced',
  sensitive: 'live_desc_sens_sensitive',
  very_sensitive: 'live_desc_sens_sensitive',
};

const sensitivityLabelKeys: Record<Sensitivity, string> = {
  stable: 'live_sens_conservative',
  standard: 'live_sens_balanced',
  sensitive: 'live_sens_sensitive',
  very_sensitive: 'live_sens_very_sensitive',
};

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
    <div className="space-y-4">
      {/* Top bar: title + status + demo + lock */}
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

        <div className="flex items-center gap-2">
          <DemoControls />
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
      </div>

      {/* 3 config blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* BLOCK A — Session Type */}
        <Card className="p-3 bg-card border-border space-y-2">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{t('live_block_session_type')}</span>
          </div>
          <Select
            value={session.sessionType}
            onValueChange={(v) => setSessionType(v as SessionType)}
            disabled={session.configLocked}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="practice">{t('live_session_practice')}</SelectItem>
              <SelectItem value="qualifying">{t('live_session_qualifying')}</SelectItem>
              <SelectItem value="race">{t('live_session_race')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t(sessionDescKeys[session.sessionType])}
          </p>
        </Card>

        {/* BLOCK B — Race Format */}
        <Card className="p-3 bg-card border-border space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{t('live_block_race_format')}</span>
          </div>
          <Select
            value={session.dataMode}
            onValueChange={(v) => setDataMode(v as DataMode)}
            disabled={session.configLocked}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="analog">{t('live_mode_analog')}</SelectItem>
              <SelectItem value="digital">{t('live_format_digital')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t(dataModeDescKeys[session.dataMode])}
          </p>
        </Card>

        {/* BLOCK C — Performance Alerts */}
        <Card className="p-3 bg-card border-border space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{t('live_block_perf_alerts')}</span>
          </div>
          <Select value={sensitivity} onValueChange={(v) => setSensitivity(v as Sensitivity)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stable">{t('live_sens_conservative')}</SelectItem>
              <SelectItem value="standard">{t('live_sens_balanced')}</SelectItem>
              <SelectItem value="sensitive">{t('live_sens_sensitive')}</SelectItem>
              <SelectItem value="very_sensitive">{t('live_sens_very_sensitive')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t(sensitivityDescKeys[sensitivity])}
          </p>
        </Card>
      </div>

      <ConfigLockDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog} />
    </div>
  );
};

export default LiveHeader;
