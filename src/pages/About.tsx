import { Link } from 'react-router-dom';
import { Gauge, BarChart3, Download, Filter, Zap, Shield, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nContext';
import LanguageSelector from '@/components/LanguageSelector';

const About = () => {
  const { t } = useI18n();

  const features = [
    { icon: BarChart3, title: t('about_feat_charts_title'), desc: t('about_feat_charts_desc') },
    { icon: Filter, title: t('about_feat_filters_title'), desc: t('about_feat_filters_desc') },
    { icon: Download, title: t('about_feat_export_title'), desc: t('about_feat_export_desc') },
    { icon: Zap, title: t('about_feat_instant_title'), desc: t('about_feat_instant_desc') },
    { icon: Shield, title: t('about_feat_privacy_title'), desc: t('about_feat_privacy_desc') },
  ];

  return (
    <div className="min-h-screen bg-background dark">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-8 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <Gauge className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">
            Stint<span className="text-primary">Lab</span>
          </h1>
        </div>
        <p className="text-muted-foreground mb-12 text-lg">{t('about_subtitle')}</p>

        <h2 className="text-xl font-semibold text-foreground mb-6">{t('about_features')}</h2>
        <div className="grid gap-4 mb-16">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="bg-card/50 border-border/50">
              <CardContent className="flex items-start gap-4 pt-6">
                <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-medium text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-4">{t('about_roadmap')}</h2>
        <ul className="space-y-2 text-sm text-muted-foreground mb-12">
          <li>• {t('about_roadmap_accounts')}</li>
          <li>• {t('about_roadmap_teams')}</li>
          <li>• {t('about_roadmap_filters')}</li>
          <li>• {t('about_roadmap_strategy')}</li>
        </ul>
      </div>
    </div>
  );
};

export default About;
