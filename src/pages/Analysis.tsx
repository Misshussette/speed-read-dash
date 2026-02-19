import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { useDisplayMode } from '@/contexts/DisplayModeContext';
import { useGarage } from '@/contexts/GarageContext';
import { useRunScope } from '@/hooks/useRunScope';
import { applyFilters, computeKPIs, getFilterOptions } from '@/lib/metrics';
import { useI18n } from '@/i18n/I18nContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import FilterBar from '@/components/dashboard/FilterBar';
import KPICards from '@/components/dashboard/KPICards';
import LapTimeChart from '@/components/dashboard/LapTimeChart';
import SectorChart from '@/components/dashboard/SectorChart';
import DriverComparisonChart from '@/components/dashboard/DriverComparisonChart';
import StintTimeline from '@/components/dashboard/StintTimeline';
import PitAnalysis from '@/components/dashboard/PitAnalysis';
import AnalysisInsights from '@/components/dashboard/AnalysisInsights';
import ScopePanel from '@/components/dashboard/ScopePanel';
import ScopeKPICards from '@/components/dashboard/ScopeKPICards';
import TrackBenchmark from '@/components/dashboard/TrackBenchmark';
import MobileFieldView from '@/components/dashboard/MobileFieldView';
import DriverScopeDialog from '@/components/dashboard/DriverScopeDialog';

const Analysis = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { setDisplayMode } = useDisplayMode();
  const { configurations, cars, setups, controllers, getSessionLink, getCarById, getSetupById, getConfigurationById, linkSessionToGarage } = useGarage();

  const {
    rawData, hasSectorData, filters, setFilters, resetFilters,
    sessions, setActiveSessionId, scope, scopedData, scopeOptions, dualKPIs,
    isLoading,
  } = useTelemetry();

  const { runScope, isLoadingScope, saveScope, clearScope } = useRunScope(sessionId || null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [showDriverScope, setShowDriverScope] = useState(false);

  // Set active session from URL
  useEffect(() => {
    if (sessionId) setActiveSessionId(sessionId);
  }, [sessionId, setActiveSessionId]);

  // Always show driver scope dialog when opening a multi-driver run
  const [hasPrompted, setHasPrompted] = useState(false);
  const availableDrivers = useMemo(() => {
    const drivers = new Set<string>();
    for (const r of rawData) {
      if (r.driver && r.driver !== 'Unknown') drivers.add(r.driver);
    }
    return Array.from(drivers).sort();
  }, [rawData]);

  useEffect(() => {
    if (
      !isLoading && !isLoadingScope && !hasPrompted &&
      rawData.length > 0 && availableDrivers.length > 1 && sessionId
    ) {
      setShowDriverScope(true);
      setHasPrompted(true);
    }
  }, [isLoading, isLoadingScope, rawData.length, availableDrivers.length, hasPrompted, sessionId]);

  // Apply persistent scope to the AnalysisScope system
  const scopeDriverFilter = runScope?.drivers && runScope.drivers.length > 0 ? runScope.drivers : null;
  
  // Use persistent scope to filter data — this is the "user's default data"
  const userScopedData = useMemo(() => {
    if (!scopeDriverFilter) return rawData;
    return rawData.filter(r => scopeDriverFilter.includes(r.driver));
  }, [rawData, scopeDriverFilter]);

  // Determine effective drivers: if user has ephemeral driver filter, expand from rawData
  const hasEphemeralDriverExpansion = useMemo(() => {
    if (!scopeDriverFilter || filters.drivers.length === 0) return false;
    return filters.drivers.some(d => !scopeDriverFilter.includes(d));
  }, [scopeDriverFilter, filters.drivers]);

  // When user temporarily selects drivers outside scope, expand the analysis base from rawData
  const expandedAnalysisData = useMemo(() => {
    if (!hasEphemeralDriverExpansion) return userScopedData;
    // Merge: scoped data + any extra drivers the user picked temporarily
    const extraDrivers = filters.drivers.filter(d => !scopeDriverFilter!.includes(d));
    const extraData = rawData.filter(r => extraDrivers.includes(r.driver));
    return [...userScopedData, ...extraData];
  }, [hasEphemeralDriverExpansion, userScopedData, rawData, filters.drivers, scopeDriverFilter]);

  // Default mobile to guided mode
  useEffect(() => {
    if (isMobile) {
      const stored = localStorage.getItem('stintlab-display-mode');
      if (!stored) setDisplayMode('guided');
    }
  }, [isMobile, setDisplayMode]);

  const sessionMeta = sessions.find(s => s.id === sessionId);
  const garageLink = sessionId ? getSessionLink(sessionId) : undefined;
  const linkedConfig = garageLink?.configuration_id ? getConfigurationById(garageLink.configuration_id) : undefined;
  const linkedCar = linkedConfig ? getCarById(linkedConfig.vehicle_id) : (garageLink?.car_id ? getCarById(garageLink.car_id) : undefined);
  const linkedSetup = linkedConfig?.setup_id ? getSetupById(linkedConfig.setup_id) : (garageLink?.setup_id ? getSetupById(garageLink.setup_id) : undefined);
  const linkedCtrl = linkedConfig?.controller_id ? controllers.find(c => c.id === linkedConfig.controller_id) : undefined;

  // Sync selected config from existing link
  useEffect(() => {
    setSelectedConfigId(garageLink?.configuration_id || '');
  }, [garageLink?.configuration_id]);

  const handleLinkConfig = async () => {
    if (!sessionId || !selectedConfigId) return;
    const config = getConfigurationById(selectedConfigId);
    if (!config) return;
    await linkSessionToGarage(sessionId, config.vehicle_id, config.setup_id, selectedConfigId);
    toast.success(t('analysis_config_linked'));
  };

  const handleDriverScopeConfirm = async (drivers: string[]) => {
    if (!sessionId) return;
    if (drivers.length === 0) {
      // "Analyze all" — clear any existing scope
      await clearScope(sessionId);
      toast.success(t('scope_cleared'));
    } else {
      await saveScope(sessionId, drivers);
      toast.success(t('scope_saved'));
    }
    setShowDriverScope(false);
  };

  // Analysis uses user-scoped data (with potential temporary expansion) as base
  const analysisBase = scope.enabled ? scopedData : expandedAnalysisData;
  const filterOptions = useMemo(() => {
    const opts = getFilterOptions(analysisBase);
    // Always show ALL available drivers so users can temporarily expand
    opts.drivers = availableDrivers;
    return opts;
  }, [analysisBase, availableDrivers]);
  const filteredData = useMemo(() => applyFilters(analysisBase, filters), [analysisBase, filters]);
  const kpis = useMemo(() => computeKPIs(filteredData, filters.includePitLaps), [filteredData, filters.includePitLaps]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!sessionMeta) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-lg font-semibold text-foreground">{t('analysis_not_found')}</p>
        <p className="text-sm text-muted-foreground">{t('analysis_not_found_hint')}</p>
        <Button onClick={() => navigate('/events')}>{t('nav_runs')}</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-4">
      {/* Run header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/events')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {sessionMeta.display_name || sessionMeta.filename?.replace(/\.csv$/i, '') || sessionMeta.track || 'Run'}
          </h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {sessionMeta.track && <span>{sessionMeta.track}</span>}
            {sessionMeta.car_model && <span>• {sessionMeta.car_model}</span>}
            {sessionMeta.date && <span>• {sessionMeta.date}</span>}
            {linkedCar && <span>• 🚗 {linkedCar.brand} {linkedCar.model}</span>}
            {linkedSetup?.label && <span>• ⚙️ {linkedSetup.label}</span>}
            {linkedCtrl && <span>• 🎮 {linkedCtrl.name}</span>}
          </div>
        </div>
        {/* Persistent driver scope indicator */}
        {availableDrivers.length > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant={scopeDriverFilter ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowDriverScope(true)}
            >
              <Users className="h-3.5 w-3.5" />
              {scopeDriverFilter
                ? `${t('scope_edit_drivers')} (${scopeDriverFilter.length})`
                : t('scope_all_drivers_active')}
            </Button>
            {hasEphemeralDriverExpansion && (
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                {t('scope_temp_expanded')}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Equipment — optional, passive */}
      {configurations.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
            <SelectTrigger className="h-8 text-xs w-[220px]">
              <SelectValue placeholder={t('analysis_select_config')} />
            </SelectTrigger>
            <SelectContent>
              {configurations.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs" disabled={!selectedConfigId || selectedConfigId === garageLink?.configuration_id} onClick={handleLinkConfig}>
            {t('analysis_link')}
          </Button>
        </div>
      )}

      {/* Mobile field mode */}
      {isMobile && rawData.length > 0 ? (
        <MobileFieldView data={filteredData} kpis={kpis} />
      ) : (
        <>
          {/* Filter bar */}
          <div className="border-b border-border pb-3">
            <FilterBar options={filterOptions} filters={filters} onChange={setFilters} onReset={resetFilters} scopeOptions={scopeOptions} hasScope={scope.enabled} scopedDrivers={scopeDriverFilter} />
          </div>

          {rawData.length > 0 && (
            <>
              <ScopePanel />

              {/* Analysis tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-card border border-border">
                  <TabsTrigger value="overview">{t('tab_performance')}</TabsTrigger>
                  <TabsTrigger value="stints">{t('tab_stints')}</TabsTrigger>
                  <TabsTrigger value="drivers">{t('tab_drivers')}</TabsTrigger>
                  <TabsTrigger value="track">{t('tab_track_ref')}</TabsTrigger>
                  <TabsTrigger value="insights">{t('tab_insights')}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-4">
                  <KPICards kpis={kpis} />
                  <ScopeKPICards />
                  <TrackBenchmark allData={rawData} userData={filteredData} />
                  <LapTimeChart data={filteredData} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <DriverComparisonChart data={filteredData} includePitLaps={filters.includePitLaps} />
                    {hasSectorData && <SectorChart data={filteredData} />}
                  </div>
                </TabsContent>

                <TabsContent value="stints" className="space-y-6 mt-4">
                  <KPICards kpis={kpis} />
                  <LapTimeChart data={filteredData} />
                  <StintTimeline data={filteredData} includePitLaps={filters.includePitLaps} />
                  <PitAnalysis data={filteredData} />
                </TabsContent>

                <TabsContent value="drivers" className="space-y-6 mt-4">
                  <KPICards kpis={kpis} />
                  <AnalysisInsights data={filteredData} includePitLaps={filters.includePitLaps} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <DriverComparisonChart data={filteredData} includePitLaps={filters.includePitLaps} />
                    {hasSectorData && <SectorChart data={filteredData} />}
                  </div>
                </TabsContent>

                <TabsContent value="track" className="space-y-6 mt-4">
                  <TrackBenchmark allData={rawData} userData={filteredData} />
                  {hasSectorData && <SectorChart data={filteredData} />}
                  <LapTimeChart data={filteredData} />
                </TabsContent>

                <TabsContent value="insights" className="space-y-6 mt-4">
                  <KPICards kpis={kpis} />
                  <AnalysisInsights data={filteredData} includePitLaps={filters.includePitLaps} />
                  <TrackBenchmark allData={rawData} userData={filteredData} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </>
      )}

      {/* Driver scope selection dialog */}
      <DriverScopeDialog
        open={showDriverScope}
        onOpenChange={setShowDriverScope}
        availableDrivers={availableDrivers}
        preselectedDrivers={runScope?.drivers}
        sessionName={sessionMeta.display_name || sessionMeta.filename?.replace(/\.csv$/i, '') || undefined}
        onConfirm={handleDriverScopeConfirm}
      />
    </div>
  );
};

export default Analysis;
