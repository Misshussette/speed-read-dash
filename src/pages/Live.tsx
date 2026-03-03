import { LiveProvider, useLive } from '@/contexts/LiveContext';
import LiveHeader from '@/components/live/LiveHeader';
import LiveSinglePilot from '@/components/live/LiveSinglePilot';
import LiveMultiPilot from '@/components/live/LiveMultiPilot';
import ConnectionPanel from '@/components/live/ConnectionPanel';
import StintPanel from '@/components/live/StintPanel';

const LiveContent = () => {
  const { isSinglePilot } = useLive();

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-4">
      <LiveHeader />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          {isSinglePilot ? <LiveSinglePilot /> : <LiveMultiPilot />}
        </div>
        <div className="space-y-4">
          <ConnectionPanel />
          <StintPanel />
        </div>
      </div>
    </div>
  );
};

const Live = () => (
  <LiveProvider>
    <LiveContent />
  </LiveProvider>
);

export default Live;
