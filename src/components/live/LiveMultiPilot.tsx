import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLive } from '@/contexts/LiveContext';
import { useI18n } from '@/i18n/I18nContext';
import RankingTable from './RankingTable';

const LiveMultiPilot = () => {
  const { sessionType } = useLive();
  const { t } = useI18n();

  const titleKey = sessionType === 'race'
    ? 'live_standings'
    : sessionType === 'qualifying'
      ? 'live_qualifying_standings'
      : 'live_practice_standings';

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          {t(titleKey)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <RankingTable />
      </CardContent>
    </Card>
  );
};

export default LiveMultiPilot;
