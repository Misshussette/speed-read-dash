import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TelemetryProvider } from "@/contexts/TelemetryContext";
import { GarageProvider } from "@/contexts/GarageContext";
import { DisplayModeProvider } from "@/contexts/DisplayModeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { I18nProvider } from "@/i18n/I18nContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import GarageLayout from "@/components/GarageLayout";
import Index from "./pages/Index";
import Events from "./pages/Events";
import Analysis from "./pages/Analysis";
import Comparison from "./pages/Comparison";
import GarageVehicles from "./pages/GarageVehicles";
import GarageSetups from "./pages/GarageSetups";
import GarageControllers from "./pages/GarageControllers";
import Live from "./pages/Live";
import SettingsPage from "./pages/Settings";
import Auth from "./pages/Auth";
import About from "./pages/About";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <ThemeProvider>
            <AuthProvider>
              <DisplayModeProvider>
                <TelemetryProvider>
                  <GarageProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/about" element={<About />} />

                        {/* Protected app routes with sidebar layout */}
                        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                          <Route path="/events" element={<Events />} />
                          <Route path="/analysis" element={<Navigate to="/events" replace />} />
                          <Route path="/analysis/:sessionId" element={<Analysis />} />
                          <Route path="/comparison" element={<Comparison />} />

                          {/* Garage sub-routes */}
                          <Route path="/garage" element={<GarageLayout />}>
                            <Route index element={<Navigate to="/garage/vehicles" replace />} />
                            <Route path="vehicles" element={<GarageVehicles />} />
                            <Route path="setups" element={<GarageSetups />} />
                            <Route path="controllers" element={<GarageControllers />} />
                          </Route>

                          <Route path="/live" element={<Live />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/admin" element={<Admin />} />
                        </Route>

                        {/* Legacy route redirect */}
                        <Route path="/app" element={<Navigate to="/events" replace />} />

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </BrowserRouter>
                  </GarageProvider>
                </TelemetryProvider>
              </DisplayModeProvider>
            </AuthProvider>
          </ThemeProvider>
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
