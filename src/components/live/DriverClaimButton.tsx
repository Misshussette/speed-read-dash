import { UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLive } from '@/contexts/LiveContext';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n/I18nContext';

interface Props {
  fluxId: string;
  compact?: boolean;
}

const DriverClaimButton = ({ fluxId, compact = false }: Props) => {
  const { claimDriving, stints } = useLive();
  const { user } = useAuth();
  const { t } = useI18n();

  if (!user) return null;

  const activeStint = stints.find(
    s => s.fluxId === fluxId && !s.endTimestamp && s.stintLabPilotId === user.id
  );

  const isCurrentlyClaimed = !!activeStint;

  if (compact) {
    return (
      <Button
        variant={isCurrentlyClaimed ? 'default' : 'outline'}
        size="sm"
        className={`h-7 text-xs gap-1.5 ${isCurrentlyClaimed ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
        onClick={() => claimDriving(fluxId)}
        disabled={isCurrentlyClaimed}
      >
        <UserCheck className="h-3.5 w-3.5" />
        {isCurrentlyClaimed ? t('live_claim_active') : t('live_claim_driving')}
      </Button>
    );
  }

  return (
    <Button
      variant={isCurrentlyClaimed ? 'default' : 'outline'}
      className={`gap-2 ${isCurrentlyClaimed ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
      onClick={() => claimDriving(fluxId)}
      disabled={isCurrentlyClaimed}
    >
      <UserCheck className="h-4 w-4" />
      {isCurrentlyClaimed ? t('live_claim_active') : t('live_claim_driving')}
    </Button>
  );
};

export default DriverClaimButton;
