import { Radio, Timer, Trophy, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/I18nContext';

const Live = () => {
  const { t } = useI18n();

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="h-5 w-5 text-destructive animate-pulse" />
          <h1 className="text-xl font-bold text-foreground">{t('live_title')}</h1>
        </div>
        <Badge variant="outline" className="flex items-center gap-1.5 text-muted-foreground">
          <WifiOff className="h-3 w-3" />
          {t('live_disconnected')}
        </Badge>
      </div>

      {/* Grid layout optimized for real-time */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Current Lap */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              {t('live_current_lap')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-mono font-bold text-foreground tracking-tight">--:--.---</span>
              <span className="text-lg text-muted-foreground font-mono">L--</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">S1</p>
                <p className="text-lg font-mono text-muted-foreground">--.---</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">S2</p>
                <p className="text-lg font-mono text-muted-foreground">--.---</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">S3</p>
                <p className="text-lg font-mono text-muted-foreground">--.---</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4 text-muted-foreground" />
              {t('live_connection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('live_status')}</span>
              <span className="text-destructive font-medium">{t('live_disconnected')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('live_source')}</span>
              <span className="text-muted-foreground">—</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('live_latency')}</span>
              <span className="text-muted-foreground">— ms</span>
            </div>
            <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
              {t('live_hint')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Standings / Lap History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              {t('live_standings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground py-8 text-center">{t('live_no_data')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              {t('live_lap_history')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground py-8 text-center">{t('live_no_data')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Live;
