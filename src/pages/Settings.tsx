import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n/I18nContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DisplayModeToggle from '@/components/dashboard/DisplayModeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import { LogOut, User, Globe, Eye } from 'lucide-react';

const SettingsPage = () => {
  const { t } = useI18n();
  const { user, signOut } = useAuth();

  return (
    <div className="max-w-[800px] mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">{t('nav_settings')}</h1>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            {t('settings_account')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">{t('settings_logged_in')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              {t('settings_logout')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            {t('settings_display')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t('settings_display_mode')}</p>
            <DisplayModeToggle />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            {t('settings_language')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LanguageSelector />
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
