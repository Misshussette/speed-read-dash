import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import DisplayModeToggle from '@/components/dashboard/DisplayModeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import ThemeToggle from '@/components/ThemeToggle';
import ReportIssueDialog from '@/components/ReportIssueDialog';
import UpdateNotification from '@/components/UpdateNotification';
import { useIsMobile } from '@/hooks/use-mobile';
import { APP_VERSION } from '@/lib/app-version';

const AppLayout = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="mr-2" />
              <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">v{APP_VERSION}</span>
            </div>
            <div className="flex items-center gap-2">
              <ReportIssueDialog />
              <DisplayModeToggle />
              <ThemeToggle />
              {!isMobile && <LanguageSelector />}
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
        <UpdateNotification />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
