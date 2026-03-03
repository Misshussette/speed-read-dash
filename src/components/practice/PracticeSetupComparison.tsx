import { GitCompareArrows } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePractice } from '@/contexts/PracticeContext';
import { useI18n } from '@/i18n/I18nContext';
import type { SetupDelta } from '@/lib/practice-analysis';

interface Props {
  deltas: SetupDelta[];
}

const PracticeSetupComparison = ({ deltas }: Props) => {
  const { isPracticeMode } = usePractice();
  const { t } = useI18n();

  if (!isPracticeMode || deltas.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-primary" />
          {t('practice_setup_analysis_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deltas.map((delta, i) => (
          <div key={i} className="space-y-2 rounded-md bg-muted/50 p-3">
            <p className="text-xs font-medium text-foreground">
              {delta.setupA} vs {delta.setupB}
            </p>

            {/* Average delta */}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('practice_avg_delta')}</span>
              <span className={`font-mono ${delta.avgDelta > 0 ? 'text-emerald-400' : delta.avgDelta < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {delta.avgDelta > 0 ? '+' : ''}{delta.avgDelta.toFixed(3)}s
              </span>
            </div>

            {/* Sector deltas */}
            {delta.s1Delta != null && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <p className="text-muted-foreground">S1</p>
                  <p className={`font-mono ${delta.s1Delta > 0.01 ? 'text-emerald-400' : delta.s1Delta < -0.01 ? 'text-destructive' : 'text-foreground'}`}>
                    {delta.s1Delta > 0 ? '+' : ''}{delta.s1Delta.toFixed(3)}s
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">S2</p>
                  <p className={`font-mono ${delta.s2Delta! > 0.01 ? 'text-emerald-400' : delta.s2Delta! < -0.01 ? 'text-destructive' : 'text-foreground'}`}>
                    {delta.s2Delta! > 0 ? '+' : ''}{delta.s2Delta!.toFixed(3)}s
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">S3</p>
                  <p className={`font-mono ${delta.s3Delta! > 0.01 ? 'text-emerald-400' : delta.s3Delta! < -0.01 ? 'text-destructive' : 'text-foreground'}`}>
                    {delta.s3Delta! > 0 ? '+' : ''}{delta.s3Delta!.toFixed(3)}s
                  </p>
                </div>
              </div>
            )}

            {/* Regularity comparison */}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('practice_regularity_comparison')}</span>
              <span className="font-mono text-foreground">
                ±{delta.regularityA.toFixed(3)} vs ±{delta.regularityB.toFixed(3)}
              </span>
            </div>

            {/* Degradation */}
            {delta.degradationA != null && delta.degradationB != null && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('practice_degradation_comparison')}</span>
                <span className="font-mono text-foreground">
                  {delta.degradationA > 0 ? '+' : ''}{delta.degradationA.toFixed(3)} vs {delta.degradationB > 0 ? '+' : ''}{delta.degradationB.toFixed(3)}
                </span>
              </div>
            )}

            {/* Human-readable summary */}
            <div className="pt-1 border-t border-border">
              {delta.avgDelta > 0.05 && (
                <p className="text-xs text-muted-foreground">
                  {t('practice_setup_b_faster', { delta: Math.abs(delta.avgDelta).toFixed(3) })}
                </p>
              )}
              {delta.avgDelta < -0.05 && (
                <p className="text-xs text-muted-foreground">
                  {t('practice_setup_a_faster', { delta: Math.abs(delta.avgDelta).toFixed(3) })}
                </p>
              )}
              {Math.abs(delta.avgDelta) <= 0.05 && (
                <p className="text-xs text-muted-foreground">
                  {t('practice_setup_comparable')}
                </p>
              )}
              {delta.regularityA < delta.regularityB - 0.02 && (
                <p className="text-xs text-muted-foreground">
                  {t('practice_setup_a_more_stable')}
                </p>
              )}
              {delta.regularityB < delta.regularityA - 0.02 && (
                <p className="text-xs text-muted-foreground">
                  {t('practice_setup_b_more_stable')}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PracticeSetupComparison;
