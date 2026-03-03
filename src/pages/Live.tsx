import { LiveProvider, useLive } from '@/contexts/LiveContext';
import { PracticeProvider } from '@/contexts/PracticeContext';
import LiveHeader from '@/components/live/LiveHeader';
import LiveSinglePilot from '@/components/live/LiveSinglePilot';
import LiveMultiPilot from '@/components/live/LiveMultiPilot';
import ConnectionPanel from '@/components/live/ConnectionPanel';
import StintPanel from '@/components/live/StintPanel';
import PracticePanel from '@/components/practice/PracticePanel';

const LiveContent = () => {
  const { isSinglePilot, session } = useLive();
  const isPractice = session.sessionType === 'practice';

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-4">
      <LiveHeader />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          {isSinglePilot ? <LiveSinglePilot /> : <LiveMultiPilot />}
        </div>
        <div className="space-y-4">
          <ConnectionPanel />
          {isPractice && <PracticePanel />}
          <StintPanel />
        </div>
      </div>
    </div>
  );
};

const Live = () => (
  <LiveProvider>
    <PracticeProvider>
      <LiveContent />
    </PracticeProvider>
  </LiveProvider>
);

export default Live;
