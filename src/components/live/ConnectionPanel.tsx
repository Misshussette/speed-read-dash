import { Wifi, WifiOff, Activity, Pause } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLive, ConnectionStatus } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';

const statusConfig: Record<ConnectionStatus, { icon: typeof Wifi; colorClass: string; labelKey: string }> = {
  connected: { icon: Wifi, colorClass: 'text-emerald-400', labelKey: 'live_status_connected' },
  receiving: { icon: Activity, colorClass: 'text-emerald-400', labelKey: 'live_status_receiving' },
  paused: { icon: Pause, colorClass: 'text-amber-400', labelKey: 'live_status_paused' },
  disconnected: { icon: WifiOff, colorClass: 'text-destructive', labelKey: 'live_status_disconnected' },
};

const ConnectionPanel = () => {
  const { connectionStatus, source, latency } = useLive();
  const { t } = useI18n();

  const config = statusConfig[connectionStatus];
  const Icon = config.icon;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.colorClass}`} />
          {t('live_connection')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('live_status')}</span>
          <span className={`${config.colorClass} font-medium`}>
            {t(config.labelKey)}
          </span>
        </div>
        {source && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('live_source')}</span>
            <span className="text-foreground font-mono text-xs">{source}</span>
          </div>
        )}
        {latency != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('live_latency')}</span>
            <span className="text-foreground font-mono text-xs">{latency} ms</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionPanel;
