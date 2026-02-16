import { useMemo } from 'react';
import { LapRecord } from '@/types/telemetry';
import { formatLapTime } from '@/lib/metrics';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceArea } from 'recharts';

const COLORS = [
  'hsl(185, 70%, 50%)', 'hsl(340, 65%, 60%)', 'hsl(45, 85%, 60%)',
  'hsl(140, 55%, 50%)', 'hsl(270, 55%, 60%)', 'hsl(20, 75%, 55%)',
];

const STINT_BG_COLORS = [
  'hsla(185, 50%, 40%, 0.06)', 'hsla(340, 50%, 40%, 0.06)', 'hsla(45, 50%, 40%, 0.06)',
  'hsla(140, 50%, 40%, 0.06)', 'hsla(270, 50%, 40%, 0.06)', 'hsla(20, 50%, 40%, 0.06)',
];

const LapTimeChart = ({ data }: { data: LapRecord[] }) => {
  const { t } = useI18n();
  const drivers = useMemo(() => [...new Set(data.map(r => r.driver))], [data]);

  const stintRanges = useMemo(() => {
    const stints = [...new Set(data.map(r => r.stint))].sort((a, b) => a - b);
    return stints.map(stint => {
      const laps = data.filter(r => r.stint === stint).map(r => r.lap_number);
      return { stint, min: Math.min(...laps), max: Math.max(...laps) };
    });
  }, [data]);

  const chartData = useMemo(() => {
    const lapNums = [...new Set(data.map(r => r.lap_number))].sort((a, b) => a - b);
    return lapNums.map(lap => {
      const entry: Record<string, number | string> = { lap };
      drivers.forEach(d => {
        const rec = data.find(r => r.lap_number === lap && r.driver === d && r.pit_type === '');
        if (rec) entry[d] = rec.lap_time_s;
      });
      return entry;
    });
  }, [data, drivers]);

  const rollingData = useMemo(() => {
    const window = 5;
    return chartData.map((entry, idx) => {
      const row: Record<string, number | string> = { lap: entry.lap };
      drivers.forEach(d => {
        const slice = chartData.slice(Math.max(0, idx - window + 1), idx + 1);
        const vals = slice.map(s => s[d]).filter((v): v is number => typeof v === 'number');
        if (vals.length >= 2) {
          row[`${d}_avg`] = vals.reduce((a, b) => a + b, 0) / vals.length;
        }
      });
      return row;
    });
  }, [chartData, drivers]);

  const mergedData = useMemo(() => {
    return chartData.map((entry, i) => ({ ...entry, ...rollingData[i] }));
  }, [chartData, rollingData]);

  const bestLap = useMemo(() => {
    const clean = data.filter(r => r.pit_type === '');
    if (clean.length === 0) return null;
    return clean.reduce((best, r) => r.lap_time_s < best.lap_time_s ? r : best, clean[0]);
  }, [data]);

  if (data.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">{t('chart_performance_evolution')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={mergedData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
            {stintRanges.map((s, i) => (
              <ReferenceArea
                key={s.stint}
                x1={s.min}
                x2={s.max}
                fill={STINT_BG_COLORS[i % STINT_BG_COLORS.length]}
                fillOpacity={1}
                label={{ value: `S${s.stint}`, position: 'insideTopLeft', fill: 'hsl(215, 15%, 45%)', fontSize: 10 }}
              />
            ))}
            <XAxis dataKey="lap" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} tickFormatter={(v: number) => formatLapTime(v)} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: 'hsl(222, 25%, 11%)', border: '1px solid hsl(222, 20%, 18%)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(210, 20%, 92%)' }}
              formatter={(value: number, name: string) => [formatLapTime(value), name.endsWith('_avg') ? `${name.replace('_avg', '')} (5-lap avg)` : name]}
              labelFormatter={(l) => `Lap ${l}`}
            />
            {drivers.map((d, i) => (
              <Line key={d} dataKey={d} stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} dot={false} connectNulls name={d} strokeOpacity={0.5} />
            ))}
            {drivers.map((d, i) => (
              <Line key={`${d}_avg`} dataKey={`${d}_avg`} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} connectNulls name={`${d}_avg`} />
            ))}
            {bestLap && (
              <ReferenceDot x={bestLap.lap_number} y={bestLap.lap_time_s} r={6} fill="hsl(185, 70%, 50%)" stroke="hsl(185, 70%, 70%)" strokeWidth={2} />
            )}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>{t('chart_legend_raw')}</span>
          <span>{t('chart_legend_avg')}</span>
          <span className="inline-block w-3 h-3 rounded bg-muted/20 border border-border" /> {t('chart_legend_stint_zone')}
        </div>
      </CardContent>
    </Card>
  );
};

export default LapTimeChart;
