import { Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLive } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';

const ConnectionPanel = () => {
  const { connected, source, latency } = useLive();
  const { t } = useI18n();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {connected
            ? <Wifi className="h-4 w-4 text-emerald-400" />
            : <WifiOff className="h-4 w-4 text-muted-foreground" />}
          {t('live_connection')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('live_status')}</span>
          <span className={connected ? 'text-emerald-400 font-medium' : 'text-destructive font-medium'}>
            {connected ? t('live_connected') : t('live_disconnected')}
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
