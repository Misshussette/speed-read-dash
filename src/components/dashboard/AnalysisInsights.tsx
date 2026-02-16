import { useMemo } from 'react';
import { LapRecord } from '@/types/telemetry';
import { computeInsights } from '@/lib/metrics';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, AlertTriangle } from 'lucide-react';

const AnalysisInsights = ({ data, includePitLaps = false }: { data: LapRecord[]; includePitLaps?: boolean }) => {
  const { t } = useI18n();
  const insights = useMemo(() => computeInsights(data, includePitLaps), [data, includePitLaps]);

  if (!insights.mostConsistentDriver && !insights.highestVarianceSector) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {insights.mostConsistentDriver && (
        <Card className="bg-card border-border border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('insight_most_consistent')}</p>
              <p className="text-sm font-semibold text-foreground">{insights.mostConsistentDriver}</p>
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
