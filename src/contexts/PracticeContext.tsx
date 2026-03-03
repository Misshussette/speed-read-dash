import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useLive } from './LiveContext';
import {
  ChallengeConfig,
  ChallengeProjection,
  RegularityReport,
  PracticeInsight,
  computeChallengeProjection,
  computeRegularity,
  generatePracticeInsights,
  detectPollutedLaps,
  cleanLaps,
} from '@/lib/practice-analysis';

interface PracticeContextValue {
  // Challenge
  challengeConfig: ChallengeConfig | null;
  setChallengeConfig: (c: ChallengeConfig | null) => void;
  challengeProjection: ChallengeProjection | null;
  challengeActive: boolean;

  // Regularity
  regularity: RegularityReport | null;
  insights: PracticeInsight[];

  // Setup association
  linkedSetupId: string | null;
  setLinkedSetupId: (id: string | null) => void;

  // State
  isPracticeMode: boolean;
  practiceElapsedSeconds: number;
}

const PracticeContext = createContext<PracticeContextValue | null>(null);

export const PracticeProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, pilots, connectionStatus } = useLive();
  const isPracticeMode = session.sessionType === 'practice';

  const [challengeConfig, setChallengeConfig] = useState<ChallengeConfig | null>(null);
  const [linkedSetupId, setLinkedSetupId] = useState<string | null>(null);
  const [practiceStartTime, setPracticeStartTime] = useState<number | null>(null);
  const [practiceElapsedSeconds, setPracticeElapsedSeconds] = useState(0);

  // Track practice start time
  useEffect(() => {
    const isRunning = connectionStatus === 'receiving' || connectionStatus === 'demo_running' ||
      connectionStatus === 'connected' || connectionStatus === 'demo_active';
    if (isPracticeMode && isRunning && !practiceStartTime) {
      setPracticeStartTime(Date.now());
    }
    if (!isRunning && connectionStatus !== 'paused') {
      setPracticeStartTime(null);
    }
  }, [isPracticeMode, connectionStatus, practiceStartTime]);

  // Elapsed timer
  useEffect(() => {
    if (!practiceStartTime || !isPracticeMode) return;
    const interval = setInterval(() => {
      setPracticeElapsedSeconds(Math.floor((Date.now() - practiceStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [practiceStartTime, isPracticeMode]);

  // Gather all lap times from all pilots (single or multi)
  const allLapTimes = useMemo(() => {
    if (!isPracticeMode) return [];
    // For practice, combine all recent laps from all pilots
    return pilots.flatMap(p => p.recentLaps);
  }, [isPracticeMode, pilots]);

  // Regularity report
  const regularity = useMemo(() => {
    if (!isPracticeMode || allLapTimes.length < 3) return null;
    return computeRegularity(allLapTimes);
  }, [isPracticeMode, allLapTimes]);

  // Insights
  const insights = useMemo(() => {
    if (!regularity) return [];
    return generatePracticeInsights(regularity, allLapTimes.length);
  }, [regularity, allLapTimes.length]);

  // Challenge projection
  const challengeProjection = useMemo(() => {
    if (!challengeConfig || !isPracticeMode) return null;
    const polluted = detectPollutedLaps(allLapTimes);
    const clean = cleanLaps(allLapTimes, polluted);
    return computeChallengeProjection(challengeConfig, clean, practiceElapsedSeconds);
  }, [challengeConfig, isPracticeMode, allLapTimes, practiceElapsedSeconds]);

  const challengeActive = challengeConfig != null && isPracticeMode;

  const value = useMemo<PracticeContextValue>(() => ({
    challengeConfig,
    setChallengeConfig,
    challengeProjection,
    challengeActive,
    regularity,
    insights,
    linkedSetupId,
    setLinkedSetupId,
    isPracticeMode,
    practiceElapsedSeconds,
  }), [challengeConfig, challengeProjection, challengeActive, regularity, insights, linkedSetupId, isPracticeMode, practiceElapsedSeconds]);

  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>;
};

export const usePractice = (): PracticeContextValue => {
  const ctx = useContext(PracticeContext);
  if (!ctx) throw new Error('usePractice must be used within PracticeProvider');
  return ctx;
};
