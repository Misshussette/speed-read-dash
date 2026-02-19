import { useNavigate } from 'react-router-dom';
import { Gauge, ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nContext';
import LanguageSelector from '@/components/LanguageSelector';
import heroImg from '@/assets/hero-racing.jpg';
import telemetryImg from '@/assets/section-telemetry.jpg';
import setupImg from '@/assets/section-setup.jpg';
import splittimeImg from '@/assets/section-splittime.jpg';

const Index = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const sections = [
    {
      img: telemetryImg,
      question: t('land_q1'),
      detail: t('land_q1_detail'),
      reverse: false,
    },
    {
      img: setupImg,
      question: t('land_q2'),
      detail: t('land_q2_detail'),
      reverse: true,
    },
    {
      img: telemetryImg,
      question: t('land_q3'),
      detail: t('land_q3_detail'),
      reverse: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      {/* Full-width hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <img
          src={heroImg}
          alt="Slot car racing track"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Gauge className="h-10 w-10 text-primary" />
            <span className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Stint<span className="text-primary">Lab</span>
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight mb-6">
            {t('land_hero_statement')}
          </h1>

          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-xl mx-auto">
            {t('land_hero_sub')}
          </p>

          <Button size="lg" onClick={() => navigate('/auth?tab=signup')} className="text-base px-8 py-6">
            {t('land_cta_signup')} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="mt-4 text-sm text-white/50">
            <button onClick={() => navigate('/auth')} className="underline hover:text-white/80 transition-colors">
              {t('land_cta_signin')}
            </button>
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="w-5 h-8 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-white/50 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Problem statement sections — alternating image/text */}
      {sections.map(({ img, question, detail, reverse }, i) => (
        <section key={i} className="relative">
          <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} min-h-[60vh]`}>
            {/* Image half */}
            <div className="md:w-1/2 relative overflow-hidden">
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover min-h-[300px] md:min-h-full"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* Text half */}
            <div className="md:w-1/2 flex items-center bg-background">
              <div className="px-8 md:px-16 py-16 max-w-lg">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-snug mb-4">
                  {question}
                </h2>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                  {detail}
                </p>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Split-Time Hardware Card */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Image placeholder */}
            <img
              src={splittimeImg}
              alt="Split-time hardware system"
              className="w-full h-48 md:h-64 object-cover"
              loading="lazy"
            />

            <div className="p-8 md:p-10 space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  {t('land_splittime_title')}
                </h2>
                <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {t('land_splittime_badge')}
                </span>
              </div>

              <div className="text-muted-foreground text-base leading-relaxed space-y-4 whitespace-pre-line">
                <p>{t('land_splittime_body')}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground/70">
                  {t('land_splittime_availability')}
                </p>
                <span className="text-xs text-muted-foreground/50 italic">
                  {t('land_splittime_link')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Discipline Compatibility Card */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Replaceable image slot */}
            <div className="w-full h-48 md:h-64 bg-muted flex items-center justify-center">
              <span className="text-muted-foreground/40 text-sm tracking-wide uppercase select-none">
                {t('land_compat_photo_placeholder')}
              </span>
            </div>

            <div className="p-8 md:p-10 space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  {t('land_compat_title')}
                </h2>
                <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {t('land_compat_badge')}
                </span>
              </div>

              <p className="text-muted-foreground text-base leading-relaxed">
                {t('land_compat_body')}
              </p>

              <p className="text-muted-foreground/80 text-sm leading-relaxed italic">
                {t('land_compat_collab')}
              </p>

              <div className="pt-2 border-t border-border">
                <a
                  href="mailto:contact@stintlab.com?subject=Proposition de format de données"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {t('land_compat_cta')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center bg-background">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          {t('land_final_cta')}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {t('land_workspace_note')}
        </p>
        <Button size="lg" onClick={() => navigate('/auth?tab=signup')} className="px-8 py-6 text-base">
          {t('land_cta_signup')} <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
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
