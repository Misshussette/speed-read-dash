import { LapRecord } from '@/types/telemetry';
import { toPng } from 'html-to-image';

export function exportFilteredCSV(data: LapRecord[], filename = 'stintlab-export.csv') {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => (r as unknown as Record<string, unknown>)[h] ?? '').join(';'));
  const csv = [headers.join(';'), ...rows].join('\n');
  downloadBlob(csv, filename, 'text/csv;charset=utf-8;');
}

export async function exportChartPNG(elementId: string, filename = 'chart.png') {
  const el = document.getElementById(elementId);
  if (!el) return;
  const dataUrl = await toPng(el, { backgroundColor: '#111827' });
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
