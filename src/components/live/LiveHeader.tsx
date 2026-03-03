import { Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLive, SessionType, DataMode, Sensitivity } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';

const LiveHeader = () => {
  const { sessionType, setSessionType, dataMode, setDataMode, sensitivity, setSensitivity, connected } = useLive();
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Radio className={`h-5 w-5 ${connected ? 'text-emerald-400 animate-pulse' : 'text-destructive'}`} />
        <h1 className="text-xl font-bold text-foreground">{t('live_title')}</h1>
        {connected && (
          <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
            {t('live_connected')}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Session Type */}
        <Select value={sessionType} onValueChange={(v) => setSessionType(v as SessionType)}>
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
        <Select value={dataMode} onValueChange={(v) => setDataMode(v as DataMode)}>
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
      </div>
    </div>
  );
};

export default LiveHeader;
