import { useMemo } from 'react';
import { LapRecord } from '@/types/telemetry';
import { computeInsights } from '@/lib/metrics';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Trophy, AlertTriangle, HelpCircle } from 'lucide-react';

const AnalysisInsights = ({ data, includePitLaps = false }: { data: LapRecord[]; includePitLaps?: boolean }) => {
  const { t } = useI18n();
  const insights = useMemo(() => computeInsights(data, includePitLaps), [data, includePitLaps]);

  if (!insights.mostConsistentDriver && !insights.highestVarianceSector) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {insights.mostConsistentDriver && (
        <Card className="bg-card border-border border-primary/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Trophy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground">{t('insight_most_consistent')}</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/40 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-xs">
                    {t('insight_consistency_tooltip')}
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm font-semibold text-foreground">{insights.mostConsistentDriver}</p>
              {insights.mostConsistentStdDev !== null && (
                <p className="text-xs font-mono text-primary">
                  Écart moyen entre ses tours : {insights.mostConsistentStdDev.toFixed(3)}s
                </p>
              )}
              {insights.runnerUpDriver && insights.runnerUpStdDev !== null && (
                <p className="text-[11px] text-muted-foreground">
                  {t('insight_runner_up')}: {insights.runnerUpDriver} — {insights.runnerUpStdDev.toFixed(3)}s
                </p>
              )}
              <p className="text-[10px] text-muted-foreground/60 italic">{t('insight_among_selected')}</p>
            </div>
          </CardContent>
        </Card>
      )}
      {insights.highestVarianceSector && (
        <Card className="bg-card border-border border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('insight_highest_variance')}</p>
              <p className="text-sm font-semibold text-foreground">{insights.highestVarianceSector}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalysisInsights;
