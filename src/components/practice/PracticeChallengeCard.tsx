import { useState } from 'react';
import { Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePractice } from '@/contexts/PracticeContext';
import { useI18n } from '@/i18n/I18nContext';
import type { ChallengeConfig, ChallengeType } from '@/lib/practice-analysis';

const formatTime = (s: number): string => {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
};

const PracticeChallengeCard = () => {
  const { challengeConfig, setChallengeConfig, challengeProjection, challengeActive } = usePractice();
  const { t } = useI18n();
  const [setupOpen, setSetupOpen] = useState(false);

  // Config form state
  const [type, setType] = useState<ChallengeType>('laps_in_time');
  const [targetLaps, setTargetLaps] = useState('50');
  const [durationMin, setDurationMin] = useState('5');
  const [targetPace, setTargetPace] = useState('6.00');
  const [lapGoal, setLapGoal] = useState('30');

  const handleActivate = () => {
    const durSec = parseFloat(durationMin) * 60;
    if (type === 'laps_in_time') {
      setChallengeConfig({ type, targetLaps: parseInt(targetLaps), durationSeconds: durSec });
    } else if (type === 'target_pace') {
      setChallengeConfig({ type, targetPace: parseFloat(targetPace), durationSeconds: durSec });
    } else {
      setChallengeConfig({ type, lapCountGoal: parseInt(lapGoal), durationSeconds: durSec });
    }
  };

  const statusColor: Record<string, string> = {
    on_pace: 'text-emerald-400',
    slightly_behind: 'text-amber-400',
    far_behind: 'text-destructive',
  };

  const statusBg: Record<string, string> = {
    on_pace: 'border-emerald-400/30',
    slightly_behind: 'border-amber-400/30',
    far_behind: 'border-destructive/30',
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          {t('practice_challenge_title')}
          {challengeActive && (
            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 text-xs ml-auto">
              {t('practice_challenge_active')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Active challenge display */}
        {challengeActive && challengeProjection && (
          <div className={`rounded-md border p-3 space-y-2 ${statusBg[challengeProjection.status]}`}>
            {challengeConfig?.type === 'laps_in_time' && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t('practice_challenge_target')}</span>
                  <span className="text-foreground font-medium">
                    {challengeConfig.targetLaps} {t('practice_laps_in')} {formatTime(challengeConfig.durationSeconds ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t('practice_required_avg')}</span>
                  <span className="font-mono text-foreground">
                    {challengeProjection.requiredAverage?.toFixed(3) ?? '—'}s
                  </span>
                </div>
              </>
            )}
            {challengeConfig?.type === 'target_pace' && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('practice_target_pace')}</span>
                <span className="font-mono text-foreground">
                  {challengeConfig.targetPace?.toFixed(3)}s
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('practice_current_avg')}</span>
              <span className="font-mono text-foreground">
                {challengeProjection.currentAverage?.toFixed(3) ?? '—'}s
              </span>
            </div>
            {challengeProjection.projectedLaps != null && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('practice_projected_laps')}</span>
                <span className="font-mono text-foreground">{challengeProjection.projectedLaps}</span>
              </div>
            )}
            <div className="flex justify-between text-xs items-center">
              <span className="text-muted-foreground">{t('practice_status')}</span>
              <span className={`font-medium ${statusColor[challengeProjection.status]}`}>
                {t(`practice_status_${challengeProjection.status}`)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('practice_remaining')}</span>
              <span className="font-mono text-foreground">
                {formatTime(challengeProjection.remainingSeconds)}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground mt-1"
              onClick={() => setChallengeConfig(null)}
            >
              {t('practice_challenge_stop')}
            </Button>
          </div>
        )}

        {/* Setup form */}
        {!challengeActive && (
          <Collapsible open={setupOpen} onOpenChange={setSetupOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-xs gap-1">
                {t('practice_challenge_setup')}
                {setupOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <Select value={type} onValueChange={(v) => setType(v as ChallengeType)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laps_in_time">{t('practice_type_laps_in_time')}</SelectItem>
                  <SelectItem value="target_pace">{t('practice_type_target_pace')}</SelectItem>
                  <SelectItem value="lap_count">{t('practice_type_lap_count')}</SelectItem>
                </SelectContent>
              </Select>

              {type === 'laps_in_time' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{t('practice_target_laps_label')}</label>
                    <Input className="h-8 text-xs" type="number" value={targetLaps} onChange={e => setTargetLaps(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('practice_duration_label')}</label>
                    <Input className="h-8 text-xs" type="number" value={durationMin} onChange={e => setDurationMin(e.target.value)} />
                  </div>
                </div>
              )}

              {type === 'target_pace' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{t('practice_target_pace_label')}</label>
                    <Input className="h-8 text-xs" type="number" step="0.01" value={targetPace} onChange={e => setTargetPace(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('practice_duration_label')}</label>
                    <Input className="h-8 text-xs" type="number" value={durationMin} onChange={e => setDurationMin(e.target.value)} />
                  </div>
                </div>
              )}

              {type === 'lap_count' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{t('practice_lap_goal_label')}</label>
                    <Input className="h-8 text-xs" type="number" value={lapGoal} onChange={e => setLapGoal(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t('practice_duration_label')}</label>
                    <Input className="h-8 text-xs" type="number" value={durationMin} onChange={e => setDurationMin(e.target.value)} />
                  </div>
                </div>
              )}

              <Button size="sm" className="w-full text-xs" onClick={handleActivate}>
                {t('practice_challenge_activate')}
              </Button>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};

export default PracticeChallengeCard;
