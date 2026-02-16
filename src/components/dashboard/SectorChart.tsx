import { useMemo } from 'react';
import { LapRecord } from '@/types/telemetry';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SectorChart = ({ data }: { data: LapRecord[] }) => {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    const drivers = [...new Set(data.map(r => r.driver))];
    return drivers.map(driver => {
      const laps = data.filter(r => r.driver === driver && r.pit_type === '' && r.S1_s !== null);
      const s1 = laps.reduce((a, r) => a + (r.S1_s || 0), 0) / (laps.length || 1);
      const s2 = laps.reduce((a, r) => a + (r.S2_s || 0), 0) / (laps.length || 1);
      const s3 = laps.reduce((a, r) => a + (r.S3_s || 0), 0) / (laps.length || 1);
      return { driver, S1: +s1.toFixed(3), S2: +s2.toFixed(3), S3: +s3.toFixed(3) };
    });
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">{t('chart_sector_comparison')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
            <XAxis dataKey="driver" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: 'hsl(222, 25%, 11%)', border: '1px solid hsl(222, 20%, 18%)', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="S1" fill="hsl(185, 70%, 50%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="S2" fill="hsl(340, 65%, 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="S3" fill="hsl(45, 85%, 60%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SectorChart;
