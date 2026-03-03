import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { usePractice } from '@/contexts/PracticeContext';
import { useI18n } from '@/i18n/I18nContext';
import { useState } from 'react';

const PracticeRegularityCard = () => {
  const { regularity, insights, isPracticeMode } = usePractice();
  const { t } = useI18n();
  const [detailOpen, setDetailOpen] = useState(false);

  if (!isPracticeMode || !regularity) return null;

  const stabLevel = regularity.rolling8StdDev != null
    ? regularity.rolling8StdDev < 0.08
      ? 'excellent'
      : regularity.rolling8StdDev < 0.15
        ? 'good'
        : regularity.rolling8StdDev < 0.25
          ? 'moderate'
          : 'poor'
    : null;

  const stabColor: Record<string, string> = {
    excellent: 'text-emerald-400 border-emerald-400/30',
    good: 'text-emerald-400 border-emerald-400/30',
    moderate: 'text-amber-400 border-amber-400/30',
    poor: 'text-destructive border-destructive/30',
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          {t('practice_regularity_title')}
          {stabLevel && (
            <Badge variant="outline" className={`text-xs ml-auto ${stabColor[stabLevel]}`}>
              {t(`practice_regularity_${stabLevel}`)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t('practice_rolling_avg')}</p>
            <p className="font-mono text-sm text-foreground font-medium">
              {regularity.rolling8Average?.toFixed(3) ?? '—'}s
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t('practice_rolling_dev')}</p>
            <p className="font-mono text-sm text-foreground font-medium">
              ±{regularity.rolling8StdDev?.toFixed(3) ?? '—'}s
            </p>
          </div>
        </div>

        {/* Clean laps count */}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t('practice_clean_laps')}</span>
          <span className="text-foreground">{regularity.totalCleanLaps}</span>
        </div>

        {regularity.pollutedLapIndices.length > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('practice_polluted_laps')}</span>
            <span className="text-amber-400">{regularity.pollutedLapIndices.length}</span>
          </div>
        )}

        {/* Insights - always visible */}
        {insights.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border">
            {insights.map((insight, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                {t(insight.key, insight.params)}
              </p>
            ))}
          </div>
        )}

        {/* Detailed breakdown - collapsible */}
        <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-xs gap-1">
              {t('practice_details')}
              {detailOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {regularity.bestPerformanceWindow && (
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-xs font-medium text-foreground">{t('practice_best_perf_window')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('practice_window_range', {
                    start: String(regularity.bestPerformanceWindow.startIndex + 1),
                    end: String(regularity.bestPerformanceWindow.endIndex + 1),
                  })}
                </p>
                <p className="text-xs font-mono text-foreground">
                  {regularity.bestPerformanceWindow.average.toFixed(3)}s avg
                </p>
              </div>
            )}
            {regularity.bestStabilityWindow && (
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-xs font-medium text-foreground">{t('practice_best_stab_window')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('practice_window_range', {
                    start: String(regularity.bestStabilityWindow.startIndex + 1),
                    end: String(regularity.bestStabilityWindow.endIndex + 1),
                  })}
                </p>
                <p className="text-xs font-mono text-foreground">
                  ±{regularity.bestStabilityWindow.stdDev.toFixed(3)}s
                </p>
              </div>
            )}
            {regularity.firstQuarterStdDev != null && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('practice_q1_stability')}</span>
                <span className="font-mono text-foreground">±{regularity.firstQuarterStdDev.toFixed(3)}s</span>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default PracticeRegularityCard;
