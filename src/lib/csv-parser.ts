import Papa from 'papaparse';
import { LapRecord, REQUIRED_COLUMNS } from '@/types/telemetry';

export interface ParseResult {
  data: LapRecord[];
  errors: string[];
  hasSectorData: boolean;
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      delimiter: ';',
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        
        if (!results.meta.fields || results.meta.fields.length === 0) {
          // Try comma delimiter as fallback
          Papa.parse<Record<string, string>>(file, {
            delimiter: ',',
            header: true,
            skipEmptyLines: true,
            complete: (r2) => {
              resolve(processResults(r2, errors));
            }
          });
          return;
        }

        const missingCols = REQUIRED_COLUMNS.filter(
          c => !results.meta.fields!.includes(c)
        );
        
        if (missingCols.length > 0) {
          // Maybe wrong delimiter, try comma
          Papa.parse<Record<string, string>>(file, {
            delimiter: ',',
            header: true,
            skipEmptyLines: true,
            complete: (r2) => {
              const missing2 = REQUIRED_COLUMNS.filter(
                c => !r2.meta.fields!.includes(c)
              );
              if (missing2.length < missingCols.length) {
                resolve(processResults(r2, errors));
              } else {
                errors.push(`Missing columns: ${missingCols.join(', ')}`);
                resolve({ data: [], errors, hasSectorData: false });
              }
            }
          });
          return;
        }

        resolve(processResults(results, errors));
      },
      error: (err) => {
        resolve({ data: [], errors: [err.message], hasSectorData: false });
      }
    });
  });
}

function processResults(results: Papa.ParseResult<Record<string, string>>, errors: string[]): ParseResult {
  const fields = results.meta.fields || [];
  const missingCols = REQUIRED_COLUMNS.filter(c => !fields.includes(c));
  if (missingCols.length > 0) {
    errors.push(`Missing columns: ${missingCols.join(', ')}`);
    return { data: [], errors, hasSectorData: false };
  }

  const hasSectorData = fields.includes('S1_s') && fields.includes('S2_s') && fields.includes('S3_s');

  const data: LapRecord[] = results.data.map((row: Record<string, string>) => ({
    session_id: row.session_id?.trim() || '',
    date: row.date?.trim() || '',
    track: row.track?.trim() || '',
    car_model: row.car_model?.trim() || '',
    brand: row.brand?.trim() || '',
    driver: row.driver?.trim() || '',
    stint: parseInt(row.stint) || 0,
    lap_number: parseInt(row.lap_number) || 0,
    lap_time_s: parseFloat(row.lap_time_s) || 0,
    S1_s: hasSectorData && row.S1_s ? parseFloat(row.S1_s) || null : null,
    S2_s: hasSectorData && row.S2_s ? parseFloat(row.S2_s) || null : null,
    S3_s: hasSectorData && row.S3_s ? parseFloat(row.S3_s) || null : null,
    pit_type: row.pit_type?.trim() || '',
    pit_time_s: row.pit_time_s ? parseFloat(row.pit_time_s) || null : null,
    timestamp: row.timestamp?.trim() || '',
  })).filter(r => r.lap_time_s > 0);

  if (data.length === 0) {
    errors.push('No valid lap records found in file.');
  }

  return { data, errors, hasSectorData };
}
