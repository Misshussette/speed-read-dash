import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/i18n/I18nContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import DisplayModeToggle from '@/components/dashboard/DisplayModeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import { LogOut, User, Globe, Eye, FlaskConical, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SettingsPage = () => {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const { restartTour } = useOnboarding();
  const [betaOptIn, setBetaOptIn] = useState(false);
  const [loadingBeta, setLoadingBeta] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('beta_opt_in').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setBetaOptIn(!!(data as any).beta_opt_in); });
  }, [user]);

  const toggleBeta = async (checked: boolean) => {
    if (!user) return;
    setLoadingBeta(true);
    const { error } = await supabase.from('profiles').update({ beta_opt_in: checked } as any).eq('user_id', user.id);
    setLoadingBeta(false);
    if (error) { toast.error(error.message); return; }
    setBetaOptIn(checked);
    toast.success(checked ? t('settings_beta_enabled') : t('settings_beta_disabled'));
  };

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
            <FlaskConical className="h-4 w-4 text-primary" />
            {t('settings_beta')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">{t('settings_beta_label')}</p>
              <p className="text-xs text-muted-foreground">{t('settings_beta_desc')}</p>
            </div>
            <Switch checked={betaOptIn} onCheckedChange={toggleBeta} disabled={loadingBeta} />
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

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            {t('settings_help')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">{t('settings_restart_tour')}</p>
              <p className="text-xs text-muted-foreground">{t('settings_restart_tour_desc')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={restartTour}>
              {t('settings_restart_tour_btn')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
