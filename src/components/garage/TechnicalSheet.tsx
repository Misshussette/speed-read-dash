import { useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nContext';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import type { Setup } from '@/types/garage';

interface Props {
  setup: Setup;
  carLabel: string;
}

/** Geometry values extracted from setup parameters */
interface Geometry {
  wheelbase: number | null;
  front_track: number | null;
  rear_track: number | null;
  front_ground_clearance: number | null;
  rear_ground_clearance: number | null;
  pod_height: number | null;
  front_wheel_diameter_prepared: number | null;
  rear_wheel_diameter_prepared: number | null;
}

function getNum(params: Record<string, string | number>, key: string): number | null {
  const v = params[key];
  if (v === undefined || v === '' || v === null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function extractGeometry(params: Record<string, string | number>): Geometry {
  return {
    wheelbase: getNum(params, 'wheelbase'),
    front_track: getNum(params, 'front_track'),
    rear_track: getNum(params, 'rear_track'),
    front_ground_clearance: getNum(params, 'front_ground_clearance'),
    rear_ground_clearance: getNum(params, 'rear_ground_clearance'),
    pod_height: getNum(params, 'pod_height'),
    front_wheel_diameter_prepared: getNum(params, 'front_wheel_diameter_prepared'),
    rear_wheel_diameter_prepared: getNum(params, 'rear_wheel_diameter_prepared'),
  };
}

function DimLabel({ value, unit, x, y, muted }: { value: number | null; unit: string; x: number; y: number; muted?: boolean }) {
  const text = value !== null ? `${value} ${unit}` : '— mm';
  return (
    <text
      x={x} y={y}
      textAnchor="middle"
      className={muted || value === null ? 'fill-muted-foreground/50' : 'fill-foreground'}
      fontSize={11}
      fontFamily="monospace"
      fontWeight={value !== null ? 600 : 400}
    >
      {text}
    </text>
  );
}

export default function TechnicalSheet({ setup, carLabel }: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const geo = extractGeometry(setup.parameters);

  const handleExport = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, {
        backgroundColor: '#0a0a0a',
        pixelRatio: 3,
      });
      const link = document.createElement('a');
      link.download = `${setup.label || 'setup'}-technical-sheet.png`;
      link.href = dataUrl;
      link.click();
      toast.success(t('garage_techsheet_exported'));
    } catch {
      toast.error('Export failed');
    }
  }, [setup.label, t]);

  // SVG dimensions
  const W = 480;
  const H = 400;
  // Chassis body centered
  const cx = W / 2;
  const cy = H / 2 - 10;

  // Scale: use wheelbase to determine body length, or default
  const wb = geo.wheelbase ?? 100;
  const scale = 1.6; // px per mm
  const bodyL = wb * scale;
  const ft = (geo.front_track ?? 60) * scale;
  const rt = (geo.rear_track ?? 65) * scale;
  const wheelW = 10;
  const fwd = geo.front_wheel_diameter_prepared ? geo.front_wheel_diameter_prepared * scale * 0.6 : 16;
  const rwd = geo.rear_wheel_diameter_prepared ? geo.rear_wheel_diameter_prepared * scale * 0.6 : 20;

  // Body rect
  const bodyW = Math.max(ft, rt) * 0.55;
  const bx = cx - bodyW / 2;
  const by = cy - bodyL / 2;

  // Wheel positions
  const frontY = cy - bodyL / 2;
  const rearY = cy + bodyL / 2;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{t('garage_techsheet')}</p>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExport}>
          <Download className="h-3 w-3" /> {t('garage_techsheet_export')}
        </Button>
      </div>

      <div ref={containerRef} className="bg-background border border-border rounded-lg p-4">
        {/* Title bar */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{carLabel}</p>
            <p className="text-xs text-muted-foreground">{setup.label || '—'}</p>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">{t('garage_techsheet')}</p>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="max-w-[480px] mx-auto">
          {/* ── Chassis body outline ── */}
          <rect
            x={bx} y={by} width={bodyW} height={bodyL}
            rx={8}
            className="fill-muted/30 stroke-primary/60"
            strokeWidth={1.5}
          />

          {/* Center line */}
          <line x1={cx} y1={by - 15} x2={cx} y2={by + bodyL + 15} className="stroke-muted-foreground/20" strokeDasharray="3 3" strokeWidth={0.5} />

          {/* ── Front wheels ── */}
          <rect x={cx - ft / 2 - wheelW / 2} y={frontY - fwd / 2} width={wheelW} height={fwd} rx={2} className="fill-primary/80 stroke-primary" strokeWidth={1} />
          <rect x={cx + ft / 2 - wheelW / 2} y={frontY - fwd / 2} width={wheelW} height={fwd} rx={2} className="fill-primary/80 stroke-primary" strokeWidth={1} />

          {/* ── Rear wheels ── */}
          <rect x={cx - rt / 2 - wheelW / 2} y={rearY - rwd / 2} width={wheelW} height={rwd} rx={2} className="fill-accent/80 stroke-accent" strokeWidth={1} />
          <rect x={cx + rt / 2 - wheelW / 2} y={rearY - rwd / 2} width={wheelW} height={rwd} rx={2} className="fill-accent/80 stroke-accent" strokeWidth={1} />

          {/* ── Front axle line ── */}
          <line x1={cx - ft / 2} y1={frontY} x2={cx + ft / 2} y2={frontY} className="stroke-muted-foreground/40" strokeWidth={0.8} />
          {/* ── Rear axle line ── */}
          <line x1={cx - rt / 2} y1={rearY} x2={cx + rt / 2} y2={rearY} className="stroke-muted-foreground/40" strokeWidth={0.8} />

          {/* ── Guide (front center) ── */}
          <circle cx={cx} cy={frontY + 6} r={3} className="fill-primary stroke-primary/60" strokeWidth={1} />

          {/* ══════ DIMENSION ANNOTATIONS ══════ */}

          {/* Wheelbase — right side vertical */}
          <line x1={cx + bodyW / 2 + 30} y1={frontY} x2={cx + bodyW / 2 + 30} y2={rearY} className="stroke-foreground/50" strokeWidth={0.8} markerStart="url(#arrowUp)" markerEnd="url(#arrowDown)" />
          <line x1={cx + bodyW / 2 + 25} y1={frontY} x2={cx + bodyW / 2 + 35} y2={frontY} className="stroke-foreground/30" strokeWidth={0.5} />
          <line x1={cx + bodyW / 2 + 25} y1={rearY} x2={cx + bodyW / 2 + 35} y2={rearY} className="stroke-foreground/30" strokeWidth={0.5} />
          <DimLabel value={geo.wheelbase} unit="mm" x={cx + bodyW / 2 + 55} y={cy + 4} />

          {/* Front track — top horizontal */}
          <line x1={cx - ft / 2} y1={frontY - fwd / 2 - 20} x2={cx + ft / 2} y2={frontY - fwd / 2 - 20} className="stroke-foreground/50" strokeWidth={0.8} />
          <line x1={cx - ft / 2} y1={frontY - fwd / 2 - 15} x2={cx - ft / 2} y2={frontY - fwd / 2 - 25} className="stroke-foreground/30" strokeWidth={0.5} />
          <line x1={cx + ft / 2} y1={frontY - fwd / 2 - 15} x2={cx + ft / 2} y2={frontY - fwd / 2 - 25} className="stroke-foreground/30" strokeWidth={0.5} />
          <DimLabel value={geo.front_track} unit="mm" x={cx} y={frontY - fwd / 2 - 26} />

          {/* Rear track — bottom horizontal */}
          <line x1={cx - rt / 2} y1={rearY + rwd / 2 + 20} x2={cx + rt / 2} y2={rearY + rwd / 2 + 20} className="stroke-foreground/50" strokeWidth={0.8} />
          <line x1={cx - rt / 2} y1={rearY + rwd / 2 + 15} x2={cx - rt / 2} y2={rearY + rwd / 2 + 25} className="stroke-foreground/30" strokeWidth={0.5} />
          <line x1={cx + rt / 2} y1={rearY + rwd / 2 + 15} x2={cx + rt / 2} y2={rearY + rwd / 2 + 25} className="stroke-foreground/30" strokeWidth={0.5} />
          <DimLabel value={geo.rear_track} unit="mm" x={cx} y={rearY + rwd / 2 + 34} />

          {/* ── Side data panel ── */}
          {/* Left side: clearances & pod */}
          <DimLabel value={geo.front_ground_clearance} unit="mm" x={cx - bodyW / 2 - 45} y={frontY + 4} />
          <text x={cx - bodyW / 2 - 45} y={frontY - 8} textAnchor="middle" fontSize={8} className="fill-muted-foreground/60">{t('garage_geo_fgc')}</text>

          <DimLabel value={geo.rear_ground_clearance} unit="mm" x={cx - bodyW / 2 - 45} y={rearY + 4} />
          <text x={cx - bodyW / 2 - 45} y={rearY - 8} textAnchor="middle" fontSize={8} className="fill-muted-foreground/60">{t('garage_geo_rgc')}</text>

          <DimLabel value={geo.pod_height} unit="mm" x={cx - bodyW / 2 - 45} y={cy + 4} />
          <text x={cx - bodyW / 2 - 45} y={cy - 8} textAnchor="middle" fontSize={8} className="fill-muted-foreground/60">{t('garage_geo_pod')}</text>

          {/* Wheel diameters near wheels */}
          {geo.front_wheel_diameter_prepared !== null && (
            <text x={cx - ft / 2 - wheelW / 2 - 2} y={frontY + 3} textAnchor="end" fontSize={9} className="fill-muted-foreground" fontFamily="monospace">Ø{geo.front_wheel_diameter_prepared}</text>
          )}
          {geo.rear_wheel_diameter_prepared !== null && (
            <text x={cx - rt / 2 - wheelW / 2 - 2} y={rearY + 3} textAnchor="end" fontSize={9} className="fill-muted-foreground" fontFamily="monospace">Ø{geo.rear_wheel_diameter_prepared}</text>
          )}

          {/* Arrow defs */}
          <defs>
            <marker id="arrowUp" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
              <path d="M0,6 L3,0 L6,6" className="fill-none stroke-foreground/50" strokeWidth={1} />
            </marker>
            <marker id="arrowDown" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
              <path d="M0,0 L3,6 L6,0" className="fill-none stroke-foreground/50" strokeWidth={1} />
            </marker>
          </defs>

          {/* FRONT / REAR labels */}
          <text x={cx} y={by - 25} textAnchor="middle" fontSize={9} fontWeight={600} className="fill-muted-foreground/60" letterSpacing={2}>FRONT</text>
          <text x={cx} y={by + bodyL + 55} textAnchor="middle" fontSize={9} fontWeight={600} className="fill-muted-foreground/60" letterSpacing={2}>REAR</text>
        </svg>

        {/* Key metrics summary below diagram */}
        <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-border">
          <MetricCell label={t('garage_geo_wheelbase')} value={geo.wheelbase} unit="mm" />
          <MetricCell label={t('garage_geo_ft')} value={geo.front_track} unit="mm" />
          <MetricCell label={t('garage_geo_rt')} value={geo.rear_track} unit="mm" />
          <MetricCell label={t('garage_geo_pod')} value={geo.pod_height} unit="mm" />
        </div>
      </div>
    </div>
  );
}

function MetricCell({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-mono font-semibold ${value !== null ? 'text-foreground' : 'text-muted-foreground/40'}`}>
        {value !== null ? `${value} ${unit}` : '—'}
      </p>
    </div>
  );
}
