import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gauge, ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { applyFilters, computeKPIs, getFilterOptions } from '@/lib/metrics';
import { exportFilteredCSV } from '@/lib/export';
import { useI18n } from '@/i18n/I18nContext';
import LanguageSelector from '@/components/LanguageSelector';
import FilterBar from '@/components/dashboard/FilterBar';
import KPICards from '@/components/dashboard/KPICards';
import LapTimeChart from '@/components/dashboard/LapTimeChart';
import SectorChart from '@/components/dashboard/SectorChart';
import DriverComparisonChart from '@/components/dashboard/DriverComparisonChart';
import StintTimeline from '@/components/dashboard/StintTimeline';
import PitAnalysis from '@/components/dashboard/PitAnalysis';
import AnalysisInsights from '@/components/dashboard/AnalysisInsights';
import SectionHeader from '@/components/dashboard/SectionHeader';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { rawData, hasSectorData, filters, setFilters, resetFilters, clearData } = useTelemetry();

  const filterOptions = useMemo(() => getFilterOptions(rawData), [rawData]);
  const filteredData = useMemo(() => applyFilters(rawData, filters), [rawData, filters]);
  const kpis = useMemo(() => computeKPIs(filteredData, filters.includePitLaps), [filteredData, filters.includePitLaps]);

  if (rawData.length === 0) {
    return (
      <div className="min-h-screen bg-background dark flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t('no_data')}</p>
        <Button onClick={() => navigate('/')}>{t('upload_csv_btn')}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">Stint<span className="text-primary">Lab</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button variant="ghost" size="sm" className="text-foreground" onClick={() => exportFilteredCSV(filteredData)}>
              <Download className="h-4 w-4 mr-1" /> {t('export_csv')}
            </Button>
            <Button variant="ghost" size="sm" className="text-foreground" onClick={() => { clearData(); navigate('/'); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> {t('new_upload')}
            </Button>
          </div>
        </div>
      </header>

      <div className="sticky top-[57px] z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <FilterBar options={filterOptions} filters={filters} onChange={setFilters} onReset={resetFilters} />
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-8">
        <section className="space-y-4">
          <SectionHeader number={1} title={t('section_session_overview')} />
          <KPICards kpis={kpis} />
        </section>

        <section className="space-y-4">
          <SectionHeader number={2} title={t('section_performance_evolution')} />
          <div id="chart-lap-time">
            <LapTimeChart data={filteredData} />
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader number={3} title={t('section_driver_car_analysis')} />
          <AnalysisInsights data={filteredData} includePitLaps={filters.includePitLaps} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div id="chart-driver">
              <DriverComparisonChart data={filteredData} includePitLaps={filters.includePitLaps} />
            </div>
            {hasSectorData && (
              <div id="chart-sector">
                <SectorChart data={filteredData} />
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader number={4} title={t('section_operations')} />
          <div id="chart-stint">
            <StintTimeline data={filteredData} includePitLaps={filters.includePitLaps} />
          </div>
          <PitAnalysis data={filteredData} />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
