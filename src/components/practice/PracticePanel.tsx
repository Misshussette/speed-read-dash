import { usePractice } from '@/contexts/PracticeContext';
import PracticeChallengeCard from './PracticeChallengeCard';
import PracticeRegularityCard from './PracticeRegularityCard';
import PracticeSetupSelector from './PracticeSetupSelector';

/**
 * Main Practice Mode panel — rendered in the sidebar when session type is "practice".
 * Uses progressive disclosure: challenge and regularity always visible,
 * setup and comparison only when relevant.
 */
const PracticePanel = () => {
  const { isPracticeMode } = usePractice();

  if (!isPracticeMode) return null;

  return (
    <div className="space-y-4">
      <PracticeChallengeCard />
      <PracticeRegularityCard />
      <PracticeSetupSelector />
    </div>
  );
};

export default PracticePanel;
