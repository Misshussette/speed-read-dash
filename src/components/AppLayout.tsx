import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import DisplayModeToggle from '@/components/dashboard/DisplayModeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import { useIsMobile } from '@/hooks/use-mobile';

const AppLayout = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full dark">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4">
            <SidebarTrigger className="mr-2" />
            <div className="flex items-center gap-2">
              <DisplayModeToggle />
              {!isMobile && <LanguageSelector />}
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
