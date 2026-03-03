import { Clock, Users, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLive, LiveStint } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';
import DriverClaimButton from './DriverClaimButton';

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

/**
 * Team & Stints panel — always rendered.
 * Shows contextual empty state based on session type.
 */
const StintPanel = () => {
  const { pilots, stints, session } = useLive();
  const { t } = useI18n();
  const isPractice = session.sessionType === 'practice';

  // Group stints by fluxId
  const stintsByFlux = stints.reduce<Record<string, LiveStint[]>>((acc, s) => {
    (acc[s.fluxId] ??= []).push(s);
    return acc;
  }, {});

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          {t('live_stints_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Practice mode message */}
        {isPractice && pilots.length === 0 && stints.length === 0 && (
          <p className="text-muted-foreground text-xs text-center py-4">
            {t('live_stints_practice_disabled')}
          </p>
        )}

        {/* Idle / no data state (non-practice) */}
        {!isPractice && pilots.length === 0 && stints.length === 0 && (
          <p className="text-muted-foreground text-xs text-center py-4">
            {t('live_stints_no_data')}
          </p>
        )}

        {/* Quick claim buttons for each active flux */}
        {pilots.map(p => (
          <div key={p.fluxId} className="flex items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{p.displayName}</span>
              {p.currentStint && (
                <span className="text-xs text-muted-foreground">
                  {t('live_stint_since')} L{p.currentStint.startLap}
                </span>
              )}
            </div>
            <DriverClaimButton fluxId={p.fluxId} compact />
          </div>
        ))}

        {/* Detailed stint history drawer */}
        {stints.length > 0 && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-xs gap-1">
                {t('live_stint_history')}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>{t('live_stint_history')}</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
                <div className="space-y-6">
                  {Object.entries(stintsByFlux).map(([fluxId, fluxStints]) => (
                    <div key={fluxId}>
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        {pilots.find(p => p.fluxId === fluxId)?.displayName ?? fluxId}
                      </h3>
                      <div className="space-y-2">
                        {fluxStints.map((stint) => (
                          <div
                            key={stint.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/50 text-sm"
                          >
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-medium text-foreground truncate">
                                {stint.pilotDisplayName ?? t('live_stint_unclaimed')}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                L{stint.startLap}{stint.endLap != null ? `–L${stint.endLap}` : '+'} · {formatTime(stint.startTimestamp)}
                                {stint.endTimestamp ? ` → ${formatTime(stint.endTimestamp)}` : ''}
                              </span>
                            </div>
                            {!stint.endTimestamp && (
                              <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 shrink-0 text-xs">
                                {t('live_stint_active')}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        )}
      </CardContent>
    </Card>
  );
};

export default StintPanel;
