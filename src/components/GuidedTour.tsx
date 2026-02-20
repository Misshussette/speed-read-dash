import { useState } from 'react';
import { Flag, Users2, BarChart3, GitCompareArrows, Wrench, MessageSquareHeart, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nContext';

interface GuidedTourProps {
  onComplete: () => void;
}

const STEPS = [
  { icon: Flag, key: 'import' },
  { icon: Users2, key: 'drivers' },
  { icon: BarChart3, key: 'analyze' },
  { icon: GitCompareArrows, key: 'compare' },
  { icon: Wrench, key: 'garage' },
  { icon: MessageSquareHeart, key: 'feedback' },
] as const;

export default function GuidedTour({ onComplete }: GuidedTourProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onComplete}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-5 py-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t(`tour_step_${current.key}_title`)}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {t(`tour_step_${current.key}_desc`)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            {t('tour_prev')}
          </Button>
          <span className="text-xs text-muted-foreground">
            {step + 1} / {STEPS.length}
          </span>
          {isLast ? (
            <Button size="sm" onClick={onComplete} className="text-xs">
              {t('tour_finish')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setStep(step + 1)} className="text-xs">
              {t('tour_next')}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
