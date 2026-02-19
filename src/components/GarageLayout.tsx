import { Outlet, useLocation } from 'react-router-dom';
import { Car, Wrench, Settings2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useI18n } from '@/i18n/I18nContext';

const GarageLayout = () => {
  const { t } = useI18n();

  const tabs = [
    { label: t('garage_vehicles'), to: '/garage/vehicles', icon: Car },
    { label: t('garage_setups'), to: '/garage/setups', icon: Wrench },
    { label: t('garage_controllers'), to: '/garage/controllers', icon: Settings2 },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">{t('nav_garage')}</h1>
      <nav className="flex gap-1 border-b border-border pb-px">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-t-md transition-colors border-b-2 border-transparent"
            activeClassName="text-foreground border-primary font-medium"
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
};

export default GarageLayout;
