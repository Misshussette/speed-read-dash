import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gauge, Upload } from 'lucide-react';
import DisplayModeToggle from '@/components/dashboard/DisplayModeToggle';
import { Button } from '@/components/ui/button';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { applyFilters, computeKPIs, getFilterOptions } from '@/lib/metrics';
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
import SessionManager from '@/components/dashboard/SessionManager';
import ScopePanel from '@/components/dashboard/ScopePanel';
import ScopeKPICards from '@/components/dashboard/ScopeKPICards';

type AnalysisMode = 'overview' | 'stints' | 'drivers' | 'car' | 'compare';

const MODES: AnalysisMode[] = ['overview', 'stints', 'drivers', 'car', 'compare'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { rawData, hasSectorData, filters, setFilters, resetFilters, sessions, scope, scopedData, scopeOptions, dualKPIs } = useTelemetry();
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('overview');

  // Use scoped data as the canonical source for analysis when scope is active
  const analysisBase = scope.enabled ? scopedData : rawData;

  const filterOptions = useMemo(() => getFilterOptions(analysisBase), [analysisBase]);
  const filteredData = useMemo(() => applyFilters(analysisBase, filters), [analysisBase, filters]);

  // Mode-specific derived datasets (no duplication, just views)
  const stintData = useMemo(() => filteredData, [filteredData]);
  const driverData = useMemo(() => filteredData, [filteredData]);
  const carData = useMemo(() => filteredData, [filteredData]);

  // KPIs recompute based on the active mode's dataset
  const modeData = useMemo(() => {
    switch (analysisMode) {
      case 'stints': return stintData;
      case 'drivers': return driverData;
      case 'car': return carData;
      default: return filteredData;
    }
  }, [analysisMode, filteredData, stintData, driverData, carData]);

  const kpis = useMemo(() => computeKPIs(modeData, filters.includePitLaps), [modeData, filters.includePitLaps]);

  if (sessions.length === 0) {
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
            <DisplayModeToggle />
            <LanguageSelector />
          </div>
        </div>
      </header>

      <div className="sticky top-[57px] z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <FilterBar options={filterOptions} filters={filters} onChange={setFilters} onReset={resetFilters} scopeOptions={scopeOptions} hasScope={scope.enabled} />
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-8">
        <section className="space-y-4">
          <SectionHeader number={0} title={t('session_manager')} />
          <SessionManager />
          <ScopePanel />
        </section>

        {rawData.length > 0 && (
          <>
            {/* Analysis Mode Tabs */}
            <div className="flex items-center gap-1 border-b border-border">
              {MODES.map(mode => (
                <button
                  key={mode}
                  onClick={() => setAnalysisMode(mode)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                    analysisMode === mode
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(`mode_${mode}`)}
                </button>
              ))}
            </div>

            {/* KPIs always visible */}
            <section className="space-y-4">
              <SectionHeader number={1} title={t('section_session_overview')} />
              <KPICards kpis={kpis} />
              <ScopeKPICards />
            </section>

            {/* Mode-specific content */}
            {analysisMode === 'overview' && (
              <>
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
              </>
            )}

            {analysisMode === 'stints' && (
              <>
                <section className="space-y-4">
                  <SectionHeader number={2} title={t('section_performance_evolution')} />
                  <div id="chart-lap-time">
                    <LapTimeChart data={stintData} />
                  </div>
                </section>
                <section className="space-y-4">
                  <SectionHeader number={3} title={t('section_operations')} />
                  <div id="chart-stint">
                    <StintTimeline data={stintData} includePitLaps={filters.includePitLaps} />
                  </div>
                  <PitAnalysis data={stintData} />
                </section>
              </>
            )}

            {analysisMode === 'drivers' && (
              <>
                <section className="space-y-4">
                  <SectionHeader number={2} title={t('section_driver_car_analysis')} />
                  <AnalysisInsights data={driverData} includePitLaps={filters.includePitLaps} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div id="chart-driver">
                      <DriverComparisonChart data={driverData} includePitLaps={filters.includePitLaps} />
                    </div>
                    {hasSectorData && (
                      <div id="chart-sector">
                        <SectorChart data={driverData} />
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {analysisMode === 'car' && (
              <>
                <section className="space-y-4">
                  <SectionHeader number={2} title={t('section_performance_evolution')} />
                  <div id="chart-lap-time">
                    <LapTimeChart data={carData} />
                  </div>
                </section>
                <section className="space-y-4">
                  <SectionHeader number={3} title={t('section_driver_car_analysis')} />
                  <AnalysisInsights data={carData} includePitLaps={filters.includePitLaps} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div id="chart-driver">
                      <DriverComparisonChart data={carData} includePitLaps={filters.includePitLaps} />
                    </div>
                    {hasSectorData && (
                      <div id="chart-sector">
                        <SectorChart data={carData} />
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {analysisMode === 'compare' && (
              <section className="space-y-4">
                <SectionHeader number={2} title={t('mode_compare')} />
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <p className="text-muted-foreground text-sm">{t('compare_placeholder')}</p>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
