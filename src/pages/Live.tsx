import { LiveProvider, useLive } from '@/contexts/LiveContext';
import { PracticeProvider } from '@/contexts/PracticeContext';
import LiveHeader from '@/components/live/LiveHeader';
import CurrentLapCard from '@/components/live/CurrentLapCard';
import LapTimeline from '@/components/live/LapTimeline';
import ConnectionPanel from '@/components/live/ConnectionPanel';
import StintPanel from '@/components/live/StintPanel';
import PracticePanel from '@/components/practice/PracticePanel';

const LiveContent = () => {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-4">
      <LiveHeader />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main area: Current Lap + Ranking */}
        <div className="lg:col-span-3 space-y-4">
          <CurrentLapCard />
        </div>

        {/* Sidebar: always present, content adapts */}
        <div className="space-y-4">
          <ConnectionPanel />
          <LapTimeline />
          <PracticePanel />
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
