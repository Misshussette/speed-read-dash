import { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePractice } from '@/contexts/PracticeContext';
import { useI18n } from '@/i18n/I18nContext';
import PracticeChallengeCard from './PracticeChallengeCard';
import PracticeRegularityCard from './PracticeRegularityCard';
import PracticeSetupSelector from './PracticeSetupSelector';

const PracticePanel = () => {
  const { isPracticeMode, challengeActive, setChallengeConfig } = usePractice();
  const { t } = useI18n();
  const [challengeEnabled, setChallengeEnabled] = useState(false);

  if (!isPracticeMode) return null;

  const handleToggle = (enabled: boolean) => {
    setChallengeEnabled(enabled);
    if (!enabled) setChallengeConfig(null);
  };

  return (
    <div className="space-y-4">
      {/* Practice mode header */}
      <Card className="p-3 bg-card border-border">
        <div className="flex items-center gap-2 mb-1">
          <Crosshair className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{t('practice_mode_title')}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('practice_mode_desc')}
        </p>
      </Card>

      {/* Challenge toggle */}
      <Card className="p-3 bg-card border-border space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="challenge-toggle" className="text-sm font-medium text-foreground cursor-pointer">
            {t('practice_enable_challenge')}
          </Label>
          <Switch
            id="challenge-toggle"
            checked={challengeEnabled || challengeActive}
            onCheckedChange={handleToggle}
          />
        </div>
        {(challengeEnabled || challengeActive) && <PracticeChallengeCard />}
      </Card>

      <PracticeRegularityCard />
      <PracticeSetupSelector />
    </div>
  );
};

export default PracticePanel;
