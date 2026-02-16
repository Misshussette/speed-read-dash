import { useMemo } from 'react';
import { LapRecord } from '@/types/telemetry';
import { formatLapTime } from '@/lib/metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

const COLORS = [
  'hsl(185, 70%, 50%)', 'hsl(340, 65%, 60%)', 'hsl(45, 85%, 60%)',
  'hsl(140, 55%, 50%)', 'hsl(270, 55%, 60%)', 'hsl(20, 75%, 55%)',
];

const LapTimeChart = ({ data }: { data: LapRecord[] }) => {
  const drivers = useMemo(() => [...new Set(data.map(r => r.driver))], [data]);

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

  const bestLap = useMemo(() => {
    const clean = data.filter(r => r.pit_type === '');
    if (clean.length === 0) return null;
    return clean.reduce((best, r) => r.lap_time_s < best.lap_time_s ? r : best, clean[0]);
  }, [data]);

  if (data.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">Lap Time Over Laps</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
            <XAxis dataKey="lap" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <YAxis
              tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
              tickFormatter={(v: number) => formatLapTime(v)}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ background: 'hsl(222, 25%, 11%)', border: '1px solid hsl(222, 20%, 18%)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(210, 20%, 92%)' }}
              formatter={(value: number) => [formatLapTime(value), '']}
              labelFormatter={(l) => `Lap ${l}`}
            />
            {drivers.map((d, i) => (
              <Line
                key={d}
                dataKey={d}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
                name={d}
              />
            ))}
            {bestLap && (
              <ReferenceDot
                x={bestLap.lap_number}
                y={bestLap.lap_time_s}
                r={6}
                fill="hsl(185, 70%, 50%)"
                stroke="hsl(185, 70%, 70%)"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default LapTimeChart;
