import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gauge, ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { applyFilters, computeKPIs, getFilterOptions } from '@/lib/metrics';
import { exportFilteredCSV } from '@/lib/export';
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
  const { rawData, hasSectorData, filters, setFilters, resetFilters, clearData } = useTelemetry();

  const filterOptions = useMemo(() => getFilterOptions(rawData), [rawData]);
  const filteredData = useMemo(() => applyFilters(rawData, filters), [rawData, filters]);
  const kpis = useMemo(() => computeKPIs(filteredData), [filteredData]);

  if (rawData.length === 0) {
    return (
      <div className="min-h-screen bg-background dark flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No data loaded.</p>
        <Button onClick={() => navigate('/')}>Upload a CSV</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">Stint<span className="text-primary">Lab</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => exportFilteredCSV(filteredData)}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { clearData(); navigate('/'); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> New Upload
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="sticky top-[57px] z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <FilterBar options={filterOptions} filters={filters} onChange={setFilters} onReset={resetFilters} />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-8">
        {/* SECTION 1: SESSION OVERVIEW */}
        <section className="space-y-4">
          <SectionHeader number={1} title="Session Overview" />
          <KPICards kpis={kpis} />
        </section>

        {/* SECTION 2: PERFORMANCE EVOLUTION */}
        <section className="space-y-4">
          <SectionHeader number={2} title="Performance Evolution" />
          <div id="chart-lap-time">
            <LapTimeChart data={filteredData} />
          </div>
        </section>

        {/* SECTION 3: DRIVER & CAR ANALYSIS */}
        <section className="space-y-4">
          <SectionHeader number={3} title="Driver & Car Analysis" />
          <AnalysisInsights data={filteredData} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div id="chart-driver">
              <DriverComparisonChart data={filteredData} />
            </div>
            {hasSectorData && (
              <div id="chart-sector">
                <SectorChart data={filteredData} />
              </div>
            )}
          </div>
        </section>

        {/* SECTION 4: OPERATIONS */}
        <section className="space-y-4">
          <SectionHeader number={4} title="Operations" />
          <div id="chart-stint">
            <StintTimeline data={filteredData} />
          </div>
          <PitAnalysis data={filteredData} />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
