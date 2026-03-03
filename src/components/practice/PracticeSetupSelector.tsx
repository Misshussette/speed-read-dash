import { Wrench, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePractice } from '@/contexts/PracticeContext';
import { useGarage } from '@/contexts/GarageContext';
import { useI18n } from '@/i18n/I18nContext';

const PracticeSetupSelector = () => {
  const { linkedSetupId, setLinkedSetupId, isPracticeMode } = usePractice();
  const { setups: garageSetups, cars } = useGarage();
  const { t } = useI18n();

  const setups = garageSetups.map(s => {
    const car = cars.find(c => c.id === s.car_id);
    return {
      id: s.id,
      label: s.label ?? t('practice_unnamed_setup'),
      carLabel: car ? `${car.brand} ${car.model}` : '',
    };
  });

  if (!isPracticeMode) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          {t('practice_setup_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {setups.length > 0 ? (
          <>
            <Select
              value={linkedSetupId ?? 'none'}
              onValueChange={(v) => setLinkedSetupId(v === 'none' ? null : v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t('practice_no_setup')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('practice_no_setup')}</SelectItem>
                {setups.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}{s.carLabel ? ` — ${s.carLabel}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {linkedSetupId && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs gap-1"
                onClick={() => setLinkedSetupId(null)}
              >
                <RefreshCw className="h-3 w-3" />
                {t('practice_change_setup')}
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">{t('practice_no_setups_hint')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PracticeSetupSelector;
