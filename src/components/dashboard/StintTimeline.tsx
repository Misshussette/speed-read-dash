import { useMemo } from 'react';
import { LapRecord } from '@/types/telemetry';
import { computeStintStats, formatLapTime } from '@/lib/metrics';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

const StintTimeline = ({ data, includePitLaps = false }: { data: LapRecord[]; includePitLaps?: boolean }) => {
  const { t } = useI18n();
  const stintData = useMemo(() => computeStintStats(data, includePitLaps), [data, includePitLaps]);
  const pitStints = useMemo(() => stintData.filter(s => s.hasPit), [stintData]);

  if (stintData.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">{t('chart_stint_timeline')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={stintData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 18%)" />
            <XAxis dataKey="stint" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} label={{ value: 'Stint', position: 'insideBottom', offset: -2, fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} tickFormatter={(v: number) => formatLapTime(v)} />
            <Tooltip
              contentStyle={{ background: 'hsl(222, 25%, 11%)', border: '1px solid hsl(222, 20%, 18%)', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [formatLapTime(value), t('avg_pace_label')]}
              labelFormatter={(l) => `Stint ${l}`}
            />
            <Line dataKey="avgPace" stroke="hsl(185, 70%, 50%)" strokeWidth={2} dot={{ r: 4, fill: 'hsl(185, 70%, 50%)' }} />
            {pitStints.map(s => (
              <ReferenceDot key={s.stint} x={s.stint} y={s.avgPace} r={8} fill="hsl(340, 65%, 60%)" stroke="hsl(340, 65%, 70%)" strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {pitStints.length > 0 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-full bg-[hsl(340,65%,60%)]" /> {t('pit_in_stint')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StintTimeline;
