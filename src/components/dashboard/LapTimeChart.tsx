import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { LapRecord } from '@/types/telemetry';
import { formatLapTime } from '@/lib/metrics';
import { lttbDownsample, getTargetPoints } from '@/lib/downsample';
import { useI18n } from '@/i18n/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';
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

/** Build a unique key for a driver-stint series */
const seriesKey = (driver: string, stint: number) => `${driver}__s${stint}`;
const avgKey = (driver: string, stint: number) => `${driver}__s${stint}_avg`;
const pitKey = (driver: string, stint: number) => `${driver}__s${stint}_pit`;

const LapTimeChart = ({ data }: { data: LapRecord[] }) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [zoom, setZoom] = useState<ZoomState | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const drivers = useMemo(() => [...new Set(data.map(r => r.driver))], [data]);

  // Map: driver -> sorted stint ids present in the data
  const driverStintMap = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const r of data) {
      if (!map.has(r.driver)) map.set(r.driver, []);
      const arr = map.get(r.driver)!;
      if (!arr.includes(r.stint)) arr.push(r.stint);
    }
    map.forEach(v => v.sort((a, b) => a - b));
    return map;
  }, [data]);

  const stintRanges = useMemo(() => {
    const stints = [...new Set(data.map(r => r.stint))].sort((a, b) => a - b);
    return stints.map(stint => {
      const laps = data.filter(r => r.stint === stint).map(r => r.lap_number);
      return { stint, min: Math.min(...laps), max: Math.max(...laps) };
    });
  }, [data]);

  // Build chart data: one entry per real lap number, keys per driver-stint
  const fullChartData = useMemo(() => {
    const lapNums = [...new Set(data.map(r => r.lap_number))].sort((a, b) => a - b);
    return lapNums.map(lap => {
      const entry: Record<string, any> = { lap };
      for (const [driver, stints] of driverStintMap) {
        for (const stint of stints) {
          const rec = data.find(r => r.lap_number === lap && r.driver === driver && r.stint === stint);
          const sk = seriesKey(driver, stint);
          entry[sk] = rec ? rec.lap_time_s : null;
          if (rec && rec.pit_type !== '') {
            entry[pitKey(driver, stint)] = true;
          }
        }
      }
      return entry;
    });
  }, [data, driverStintMap]);

  // Rolling average per driver-stint (resets naturally since each stint is separate)
  const fullMergedData = useMemo(() => {
    const window = 5;
    // One buffer per driver-stint series
    const buffers = new Map<string, number[]>();
    for (const [driver, stints] of driverStintMap) {
      for (const stint of stints) {
        buffers.set(seriesKey(driver, stint), []);
      }
    }

    return fullChartData.map(entry => {
      const row: Record<string, any> = { ...entry };
      for (const [driver, stints] of driverStintMap) {
        for (const stint of stints) {
          const sk = seriesKey(driver, stint);
          const ak = avgKey(driver, stint);
          const val = entry[sk];
          const isPit = entry[pitKey(driver, stint)] === true;
          const buf = buffers.get(sk)!;

          if (val == null) {
            row[ak] = null;
          } else if (isPit) {
            // Pit lap: show raw value but exclude from rolling avg
            row[ak] = null;
          } else {
            buf.push(val as number);
            if (buf.length > window) buf.shift();
            row[ak] = buf.length >= 2
              ? buf.reduce((a: number, b: number) => a + b, 0) / buf.length
              : null;
          }
        }
      }
      return row;
    });
  }, [fullChartData, driverStintMap]);

  // Collect pit lap markers
  const pitMarkers = useMemo(() => {
    const markers: { lap: number; time: number; driver: string; colorIdx: number }[] = [];
    for (const entry of fullChartData) {
      let di = 0;
      for (const [driver, stints] of driverStintMap) {
        for (const stint of stints) {
          if (entry[pitKey(driver, stint)] && entry[seriesKey(driver, stint)] != null) {
            markers.push({ lap: entry.lap as number, time: entry[seriesKey(driver, stint)] as number, driver, colorIdx: di });
          }
        }
        di++;
      }
    }
    return markers;
  }, [fullChartData, driverStintMap]);

  // Zoom windowing
  const windowedData = useMemo(() => {
    if (!zoom) return fullMergedData;
    return fullMergedData.slice(zoom.startIndex, zoom.endIndex + 1);
  }, [fullMergedData, zoom]);

  // Downsampling
  const displayData = useMemo(() => {
    const target = getTargetPoints(containerWidth);
    if (windowedData.length <= target) return windowedData;
    // Use first driver's first stint avg for LTTB reference
    const firstDriver = drivers[0];
    const firstStint = driverStintMap.get(firstDriver)?.[0];
    if (firstStint == null) return windowedData;
    const refKey = avgKey(firstDriver, firstStint);
    const rawKey = seriesKey(firstDriver, firstStint);
    return lttbDownsample(
      windowedData,
      target,
      d => d.lap as number,
      d => (d[refKey] as number) ?? (d[rawKey] as number) ?? 0
    );
  }, [windowedData, containerWidth, drivers, driverStintMap]);

  const bestLap = useMemo(() => {
    const clean = data.filter(r => r.pit_type === '');
    if (clean.length === 0) return null;
    return clean.reduce((best, r) => r.lap_time_s < best.lap_time_s ? r : best, clean[0]);
  }, [data]);

  // All driver-stint line descriptors for rendering
  const lineDescriptors = useMemo(() => {
    const lines: { driver: string; stint: number; colorIdx: number; sk: string; ak: string }[] = [];
    let di = 0;
    for (const [driver, stints] of driverStintMap) {
      for (const stint of stints) {
        lines.push({ driver, stint, colorIdx: di, sk: seriesKey(driver, stint), ak: avgKey(driver, stint) });
      }
      di++;
    }
    return lines;
  }, [driverStintMap]);

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
            <XAxis
              dataKey="lap"
              tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
              allowDecimals={false}
              type="number"
              domain={['dataMin', 'dataMax']}
            />
            <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }} tickFormatter={(v: number) => formatLapTime(v)} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: 'hsl(222, 25%, 11%)', border: '1px solid hsl(222, 20%, 18%)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'hsl(210, 20%, 92%)' }}
              formatter={(value: number, name: string) => {
                // Strip internal keys for display: "Driver__s1_avg" -> "Driver (5-lap avg)"
                const isAvg = name.endsWith('_avg');
                const displayName = name.replace(/__s\d+(_avg)?$/, '');
                return [formatLapTime(value), isAvg ? `${displayName} (5-lap avg)` : displayName];
              }}
              labelFormatter={(l) => `Lap ${l}`}
            />
            {/* Raw lines — one per driver-stint, visually secondary */}
            {lineDescriptors.map(({ sk, colorIdx }) => (
              <Line key={sk} dataKey={sk} stroke={COLORS[colorIdx % COLORS.length]} strokeWidth={1} dot={false}
                strokeOpacity={0.3} isAnimationActive={false} connectNulls={false} />
            ))}
            {/* Rolling average — one per driver-stint, primary trace */}
            {lineDescriptors.map(({ ak, colorIdx }) => (
              <Line key={ak} dataKey={ak} stroke={COLORS[colorIdx % COLORS.length]} strokeWidth={2.5} dot={false}
                isAnimationActive={false} connectNulls={false} />
            ))}
            {/* Pit lap markers */}
            {pitMarkers.map((m, idx) => (
              <ReferenceDot key={`pit-${idx}`} x={m.lap} y={m.time} r={4}
                fill="hsl(45, 85%, 60%)" stroke="hsl(45, 85%, 40%)" strokeWidth={1.5}
                shape={(props: any) => {
                  const { cx, cy } = props;
                  return <polygon points={`${cx},${cy-5} ${cx+4},${cy} ${cx},${cy+5} ${cx-4},${cy}`} fill="hsl(45, 85%, 60%)" stroke="hsl(45, 85%, 40%)" strokeWidth={1.5} />;
                }}
              />
            ))}
            {bestLap && !isZoomed && (
              <ReferenceDot x={bestLap.lap_number} y={bestLap.lap_time_s} r={6} fill="hsl(185, 70%, 50%)" stroke="hsl(185, 70%, 70%)" strokeWidth={2} />
            )}
          </LineChart>
        </ResponsiveContainer>
        {totalPoints > 100 && (
          <div className="mt-2">
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={fullMergedData} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                {lineDescriptors.length > 0 && (
                  <Line dataKey={lineDescriptors[0].ak} stroke="hsl(215, 15%, 35%)" strokeWidth={1} dot={false} isAnimationActive={false} />
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
          <span><svg width="10" height="10" viewBox="0 0 10 10" className="inline-block mr-1"><polygon points="5,0 10,5 5,10 0,5" fill="hsl(45, 85%, 60%)" /></svg>pit lap</span>
          {totalPoints > 100 && <span className="ml-auto">{t('chart_drag_zoom')}</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export default LapTimeChart;
