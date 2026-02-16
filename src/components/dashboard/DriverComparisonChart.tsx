import { useMemo } from 'react';
import { LapRecord } from '@/types/telemetry';
import { computeDriverStats, formatLapTime } from '@/lib/metrics';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DriverComparisonChart = ({ data, includePitLaps = false }: { data: LapRecord[]; includePitLaps?: boolean }) => {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    return computeDriverStats(data, includePitLaps).map(d => ({
      driver: d.driver,
      Best: +d.bestLap.toFixed(3),
      Average: +d.averagePace.toFixed(3),
      'Std Dev': +d.consistency.toFixed(3),
    }));
  }, [data, includePitLaps]);

  if (chartData.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">{t('chart_driver_comparison')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
            <XAxis dataKey="driver" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} tickFormatter={(v: number) => formatLapTime(v)} />
            <Tooltip
              contentStyle={{ background: 'hsl(222, 25%, 11%)', border: '1px solid hsl(222, 20%, 18%)', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [formatLapTime(value), '']}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Best" fill="hsl(185, 70%, 50%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Average" fill="hsl(140, 55%, 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DriverComparisonChart;
