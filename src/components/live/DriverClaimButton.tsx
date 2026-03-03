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

  // Check if THIS flux is currently claimed by this user
  const activeStintHere = stints.find(
    s => s.fluxId === fluxId && !s.endTimestamp && s.stintLabPilotId === user.id
  );
  const isCurrentlyClaimed = !!activeStintHere;

  // Check if user already has an active stint on ANY flux
  const hasActiveStintElsewhere = stints.some(
    s => !s.endTimestamp && s.stintLabPilotId === user.id && s.fluxId !== fluxId
  );

  const isDisabled = isCurrentlyClaimed || hasActiveStintElsewhere;

  if (compact) {
    return (
      <Button
        variant={isCurrentlyClaimed ? 'default' : 'outline'}
        size="sm"
        className={`h-7 text-xs gap-1.5 ${isCurrentlyClaimed ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
        onClick={() => claimDriving(fluxId)}
        disabled={isDisabled}
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
      disabled={isDisabled}
    >
      <UserCheck className="h-4 w-4" />
      {isCurrentlyClaimed ? t('live_claim_active') : t('live_claim_driving')}
    </Button>
  );
};

export default DriverClaimButton;
