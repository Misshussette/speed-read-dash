import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { LapRecord } from '@/types/telemetry';
import { formatLapTime } from '@/lib/metrics';
import { lttbDownsample, getTargetPoints } from '@/lib/downsample';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceDot, ReferenceArea, Brush
} from 'recharts';

const COLORS = [
  'hsl(185, 70%, 50%)', 'hsl(340, 65%, 60%)', 'hsl(45, 85%, 60%)',
  'hsl(140, 55%, 50%)', 'hsl(270, 55%, 60%)', 'hsl(20, 75%, 55%)',
];

const STINT_BG_COLORS = [
  'hsla(185, 50%, 40%, 0.06)', 'hsla(340, 50%, 40%, 0.06)', 'hsla(45, 50%, 40%, 0.06)',
  'hsla(140, 50%, 40%, 0.06)', 'hsla(270, 50%, 40%, 0.06)', 'hsla(20, 50%, 40%, 0.06)',
];

interface ZoomState {
  startIndex: number;
  endIndex: number;
}

const LapTimeChart = ({ data }: { data: LapRecord[] }) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [zoom, setZoom] = useState<ZoomState | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const drivers = useMemo(() => [...new Set(data.map(r => r.driver))], [data]);

  const stintRanges = useMemo(() => {
    const stints = [...new Set(data.map(r => r.stint))].sort((a, b) => a - b);
    return stints.map(stint => {
      const laps = data.filter(r => r.stint === stint).map(r => r.lap_number);
      return { stint, min: Math.min(...laps), max: Math.max(...laps) };
    });
  }, [data]);

  // Full-resolution chart data (all calculations use this)
  const fullChartData = useMemo(() => {
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

  // Rolling average on full data
  const fullMergedData = useMemo(() => {
    const window = 5;
    return fullChartData.map((entry, idx) => {
      const row: Record<string, number | string> = { ...entry };
      drivers.forEach(d => {
        const slice = fullChartData.slice(Math.max(0, idx - window + 1), idx + 1);
        const vals = slice.map(s => s[d]).filter((v): v is number => typeof v === 'number');
        if (vals.length >= 2) {
          row[`${d}_avg`] = vals.reduce((a, b) => a + b, 0) / vals.length;
        }
      });
      return row;
    });
  }, [fullChartData, drivers]);

  // Apply zoom window
  const windowedData = useMemo(() => {
    if (!zoom) return fullMergedData;
    return fullMergedData.slice(zoom.startIndex, zoom.endIndex + 1);
  }, [fullMergedData, zoom]);

  // Dynamic downsampling based on container width and zoom level
  const displayData = useMemo(() => {
    const target = getTargetPoints(containerWidth);
    if (windowedData.length <= target) return windowedData;

    // Find the primary Y key for LTTB
    const primaryDriver = drivers[0];
    const avgKey = `${primaryDriver}_avg`;

    return lttbDownsample(
      windowedData,
      target,
      d => d.lap as number,
      d => (d[avgKey] as number) ?? (d[primaryDriver] as number) ?? 0
    );
  }, [windowedData, containerWidth, drivers]);

  const bestLap = useMemo(() => {
    const clean = data.filter(r => r.pit_type === '');
    if (clean.length === 0) return null;
    return clean.reduce((best, r) => r.lap_time_s < best.lap_time_s ? r : best, clean[0]);
  }, [data]);

  // Drag-to-zoom handlers
  const handleMouseDown = useCallback((e: any) => {
    if (e?.activeLabel != null) {
      setRefAreaLeft(e.activeLabel);
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: any) => {
    if (isDragging && e?.activeLabel != null) {
      setRefAreaRight(e.activeLabel);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (refAreaLeft != null && refAreaRight != null && refAreaLeft !== refAreaRight) {
      const left = Math.min(refAreaLeft, refAreaRight);
      const right = Math.max(refAreaLeft, refAreaRight);

      const startIdx = fullMergedData.findIndex(d => (d.lap as number) >= left);
      const endIdx = fullMergedData.length - 1 - [...fullMergedData].reverse().findIndex(d => (d.lap as number) <= right);

      if (startIdx >= 0 && endIdx >= startIdx) {
        setZoom({ startIndex: startIdx, endIndex: endIdx });
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsDragging(false);
  }, [refAreaLeft, refAreaRight, fullMergedData]);

  const handleResetZoom = useCallback(() => setZoom(null), []);

  const handleBrushChange = useCallback((brushRange: any) => {
    if (brushRange && brushRange.startIndex !== undefined && brushRange.endIndex !== undefined) {
      setZoom({ startIndex: brushRange.startIndex, endIndex: brushRange.endIndex });
    }
  }, []);

  if (data.length === 0) return null;

  const isZoomed = zoom !== null;
  const totalPoints = fullMergedData.length;
  const visiblePoints = displayData.length;

  return (
    <Card className="bg-card border-border" ref={containerRef}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">{t('chart_performance_evolution')}</CardTitle>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-mono mr-2">
              {visiblePoints}/{totalPoints} pts
            </span>
            {isZoomed && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResetZoom} title={t('chart_zoom_reset')}>
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart
            data={displayData}
            margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
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
            {/* Drag-to-zoom selection area */}
            {refAreaLeft != null && refAreaRight != null && (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                fill="hsl(185, 70%, 50%)"
                fillOpacity={0.15}
                stroke="hsl(185, 70%, 50%)"
                strokeOpacity={0.4}
              />
            )}
            <XAxis dataKey="lap" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} tickFormatter={(v: number) => formatLapTime(v)} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: 'hsl(222, 25%, 11%)', border: '1px solid hsl(222, 20%, 18%)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(210, 20%, 92%)' }}
              formatter={(value: number, name: string) => [formatLapTime(value), name.endsWith('_avg') ? `${name.replace('_avg', '')} (5-lap avg)` : name]}
              labelFormatter={(l) => `Lap ${l}`}
            />
            {/* Raw lines — visually secondary */}
            {drivers.map((d, i) => (
              <Line key={d} dataKey={d} stroke={COLORS[i % COLORS.length]} strokeWidth={1} dot={false} connectNulls name={d} strokeOpacity={0.3} isAnimationActive={false} />
            ))}
            {/* Rolling average — primary trace */}
            {drivers.map((d, i) => (
              <Line key={`${d}_avg`} dataKey={`${d}_avg`} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} connectNulls name={`${d}_avg`} isAnimationActive={false} />
            ))}
            {bestLap && !isZoomed && (
              <ReferenceDot x={bestLap.lap_number} y={bestLap.lap_time_s} r={6} fill="hsl(185, 70%, 50%)" stroke="hsl(185, 70%, 70%)" strokeWidth={2} />
            )}
          </LineChart>
        </ResponsiveContainer>
        {/* Mini-brush for pan navigation */}
        {totalPoints > 100 && (
          <div className="mt-2">
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={fullMergedData} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                {drivers.length > 0 && (
                  <Line dataKey={`${drivers[0]}_avg`} stroke="hsl(215, 15%, 35%)" strokeWidth={1} dot={false} isAnimationActive={false} />
                )}
                <Brush
                  dataKey="lap"
                  height={30}
                  stroke="hsl(185, 70%, 40%)"
                  fill="hsl(222, 25%, 8%)"
                  travellerWidth={8}
                  onChange={handleBrushChange}
                  startIndex={zoom?.startIndex}
                  endIndex={zoom?.endIndex}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>{t('chart_legend_raw')}</span>
          <span>{t('chart_legend_avg')}</span>
          <span className="inline-block w-3 h-3 rounded bg-muted/20 border border-border" /> {t('chart_legend_stint_zone')}
          {totalPoints > 100 && <span className="ml-auto">{t('chart_drag_zoom')}</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export default LapTimeChart;
