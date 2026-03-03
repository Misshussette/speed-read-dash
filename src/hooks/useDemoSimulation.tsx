import { useState, useEffect, useRef, useCallback } from 'react';
import { useLive } from '@/contexts/LiveContext';
import { DemoConfig, TeamSimState, initTeams, tickTeam, teamToPilot } from '@/lib/demo-simulation';

const TICK_INTERVAL_MS = 100; // 10 ticks/s for smooth sector transitions

export function useDemoSimulation() {
  const {
    setPilots, setHasSectorData, setConnectionStatus, setSource, setDemoMode,
    lockConfig,
  } = useLive();

  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [demoEnded, setDemoEnded] = useState(false);

  const teamsRef = useRef<TeamSimState[]>([]);
  const configRef = useRef<DemoConfig | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const startDemo = useCallback((config: DemoConfig) => {
    const teams = initTeams(config);
    teamsRef.current = teams;
    configRef.current = config;
    startTimeRef.current = Date.now();

    setDemoMode(true);
    setHasSectorData(config.enableSectors);
    setConnectionStatus('demo_active');
    setSource(null);
    lockConfig();

    setPilots(teams.map(t => teamToPilot(t, config)));
    setTimeRemaining(config.durationMinutes * 60);
    setIsRunning(true);
    setDemoEnded(false);

    setTimeout(() => setConnectionStatus('demo_running'), 500);
  }, [setPilots, setHasSectorData, setConnectionStatus, setSource, setDemoMode, lockConfig]);

  const stopDemo = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setDemoEnded(true);
    setConnectionStatus('demo_ended');
  }, [setConnectionStatus]);

  useEffect(() => {
    if (!isRunning || !configRef.current) return;

    const config = configRef.current;
    const durationMs = config.durationMinutes * 60 * 1000;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;

      if (elapsed >= durationMs) {
        stopDemo();
        return;
      }

      const remaining = Math.ceil((durationMs - elapsed) / 1000);
      setTimeRemaining(remaining);

      // Tick each team — now returns `changed` (sector phase or lap complete)
      let anyChanged = false;
      const teams = teamsRef.current;

      for (let i = 0; i < teams.length; i++) {
        const { updated, changed } = tickTeam(teams[i], config, elapsed);
        if (changed) {
          teams[i] = updated;
          anyChanged = true;
        }
      }

      if (anyChanged) {
        teamsRef.current = [...teams];
        setPilots(teams.map(t => teamToPilot(t, config)));
      }
    }, TICK_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, stopDemo, setPilots]);

  return {
    startDemo,
    stopDemo,
    isRunning,
    demoEnded,
    timeRemaining,
  };
}
