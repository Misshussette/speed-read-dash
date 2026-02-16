import { useMemo } from 'react';
import { LapRecord } from '@/types/telemetry';
import { computeInsights } from '@/lib/metrics';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, AlertTriangle } from 'lucide-react';

const AnalysisInsights = ({ data }: { data: LapRecord[] }) => {
  const insights = useMemo(() => computeInsights(data), [data]);

  if (!insights.mostConsistentDriver && !insights.highestVarianceSector) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {insights.mostConsistentDriver && (
        <Card className="bg-card border-border border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Most Consistent Driver</p>
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
              <p className="text-xs text-muted-foreground">Highest Variance Sector</p>
              <p className="text-sm font-semibold text-foreground">{insights.highestVarianceSector}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalysisInsights;
