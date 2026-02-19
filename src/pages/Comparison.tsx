import { useMemo } from 'react';
import { GitCompareArrows, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { useI18n } from '@/i18n/I18nContext';
import { computeKPIs } from '@/lib/metrics';
import KPICards from '@/components/dashboard/KPICards';
import LapTimeChart from '@/components/dashboard/LapTimeChart';
import DriverComparisonChart from '@/components/dashboard/DriverComparisonChart';
import SectorChart from '@/components/dashboard/SectorChart';
import StintTimeline from '@/components/dashboard/StintTimeline';

const Comparison = () => {
  const { t } = useI18n();
  const {
    sessions, comparisonSessions, toggleComparisonSession,
    clearComparisonSessions, comparisonData, isLoadingComparison,
    filters,
  } = useTelemetry();

  const compKpis = useMemo(() => computeKPIs(comparisonData, filters.includePitLaps), [comparisonData, filters.includePitLaps]);
  const hasSectors = comparisonData.some(l => l.S1_s !== null);

  const selectedMetas = sessions.filter(s => comparisonSessions.includes(s.id));

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t('nav_comparison')}</h1>
        {comparisonSessions.length >= 2 && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={clearComparisonSessions}>
            {t('compare_clear')}
          </Button>
        )}
      </div>

      {/* Selected session chips */}
      {selectedMetas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMetas.map(s => (
            <Badge key={s.id} variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1 text-xs">
              {s.filename?.replace(/\.csv$/i, '') || s.track || s.id.slice(0, 8)}
              <button onClick={() => toggleComparisonSession(s.id)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Session selector */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground mb-3">
            {comparisonSessions.length < 2
              ? t('compare_select_min2')
              : t('compare_select_instructions')}
          </p>
          <div className="flex flex-wrap gap-2">
            {sessions.map(s => {
              const selected = comparisonSessions.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleComparisonSession(s.id)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                    selected
                      ? 'bg-primary/20 text-primary border-primary/30 font-medium'
                      : 'bg-secondary/30 text-muted-foreground border-transparent hover:border-border'
                  }`}
                >
                  <GitCompareArrows className={`h-3 w-3 inline mr-1.5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                  {s.filename?.replace(/\.csv$/i, '') || s.track || s.id.slice(0, 8)}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {comparisonSessions.length < 2 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <GitCompareArrows className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t('compare_placeholder')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('compare_go_events')}</p>
          </CardContent>
        </Card>
      ) : isLoadingComparison ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('compare_loading')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <KPICards kpis={compKpis} />
          <LapTimeChart data={comparisonData} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DriverComparisonChart data={comparisonData} includePitLaps={filters.includePitLaps} />
            {hasSectors && <SectorChart data={comparisonData} />}
          </div>
          <StintTimeline data={comparisonData} includePitLaps={filters.includePitLaps} />
        </div>
      )}
    </div>
  );
};

export default Comparison;
