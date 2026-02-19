import { useNavigate } from 'react-router-dom';
import { Gauge, Target, GitCompare, Wrench, Lightbulb, ArrowRight, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/i18n/I18nContext';
import LanguageSelector from '@/components/LanguageSelector';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const steps = [
    { num: '01', title: t('land_step_import'), desc: t('land_step_import_desc') },
    { num: '02', title: t('land_step_analyze'), desc: t('land_step_analyze_desc') },
    { num: '03', title: t('land_step_improve'), desc: t('land_step_improve_desc') },
  ];

  const features = [
    { icon: Target, title: t('land_feat_benchmark'), desc: t('land_feat_benchmark_desc') },
    { icon: GitCompare, title: t('land_feat_compare'), desc: t('land_feat_compare_desc') },
    { icon: Wrench, title: t('land_feat_setup'), desc: t('land_feat_setup_desc') },
    { icon: Lightbulb, title: t('land_feat_insights'), desc: t('land_feat_insights_desc') },
  ];

  return (
    <div className="min-h-screen bg-background dark">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(hsl(185 70% 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(185 70% 50%) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Gauge className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Stint<span className="text-primary">Lab</span>
            </h1>
          </div>

          <p className="text-xl md:text-2xl font-semibold text-foreground max-w-2xl mx-auto mb-4">
            {t('land_headline')}
          </p>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-10 font-light">
            {t('land_subheadline')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate('/auth?tab=signup')}>
              {t('land_cta_signup')} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="text-foreground" onClick={() => navigate('/auth')}>
              <LogIn className="mr-2 h-4 w-4" /> {t('land_cta_signin')}
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-center mb-10">
          {t('land_how_title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ num, title, desc }) => (
            <div key={num} className="text-center space-y-2">
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded">{num}</span>
              <h3 className="font-semibold text-foreground text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-center mb-10">
          {t('land_features_title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="bg-card/50 border-border/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Icon className="h-7 w-7 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Private workspace */}
      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('land_workspace_note')}
        </p>
      </section>

      <footer className="border-t border-border py-8 text-center">
        <p className="text-sm text-muted-foreground">
          StintLab © {new Date().getFullYear()} •{' '}
          <a href="/about" className="text-primary hover:underline">About</a>
        </p>
      </footer>
    </div>
  );
};

export default Index;
