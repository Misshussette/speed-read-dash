import { CalendarDays, BarChart3, GitCompareArrows, Wrench, Settings, Gauge, Shield } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useI18n } from '@/i18n/I18nContext';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const AppSidebar = () => {
  const { t } = useI18n();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { isPlatformAdmin } = useUserRole();

  const items = [
    { title: t('nav_events'), url: '/events', icon: CalendarDays },
    { title: t('nav_analysis'), url: '/analysis', icon: BarChart3 },
    { title: t('nav_comparison'), url: '/comparison', icon: GitCompareArrows },
    { title: t('nav_garage'), url: '/garage', icon: Wrench },
    { title: t('nav_settings'), url: '/settings', icon: Settings },
  ];

  if (isPlatformAdmin) {
    items.push({ title: 'Admin', url: '/admin', icon: Shield });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <NavLink to="/" className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-sidebar-primary" />
          {!collapsed && (
            <span className="font-bold text-sidebar-foreground">
              Stint<span className="text-sidebar-primary">Lab</span>
            </span>
          )}
        </NavLink>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
