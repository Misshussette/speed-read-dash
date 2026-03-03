import { PilotLiveData, SectorTimes } from '@/contexts/LiveContext';

// ─── Config ──────────────────────────────────────────────────────────
export type SkillLevel = 'excellent' | 'good' | 'average' | 'mixed';
export type VariabilityLevel = 'low' | 'medium' | 'high';

export interface DemoConfig {
  sessionType: 'race' | 'qualifying' | 'practice';
  durationMinutes: number;
  teamCount: number;
  skill: SkillLevel;
  variability: VariabilityLevel;
  enableSectors: boolean;
  enableDegradation: boolean;
  enableFatigue: boolean;
}

export const defaultDemoConfig: DemoConfig = {
  sessionType: 'race',
  durationMinutes: 5,
  teamCount: 8,
  skill: 'mixed',
  variability: 'medium',
  enableSectors: true,
  enableDegradation: true,
  enableFatigue: true,
};

const TEAM_NAMES = [
  'Scuderia Rosso', 'Blue Arrow Racing', 'Team Eclipse', 'Golden Wheels',
  'Thunder Slot', 'Apex Motorsport', 'Velocity RC', 'Shadow Racing',
  'Phoenix Evo', 'Delta Speed', 'Nitro Kings', 'Storm Riders',
];

const skillPace: Record<SkillLevel, [number, number]> = {
  excellent: [9.0, 9.4],
  good:      [9.5, 9.9],
  average:   [10.0, 10.5],
  mixed:     [9.0, 10.5],
};

const variabilityDelta: Record<VariabilityLevel, number> = {
  low: 0.05,
  medium: 0.15,
  high: 0.30,
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Team State ──────────────────────────────────────────────────────
export interface TeamSimState {
  fluxId: string;
  teamName: string;
  lane: number;
  basePace: number;
  variability: number;
  laps: number;
  lastLap: number | null;
  bestLap: number | null;
  bestSectors: SectorTimes;
  /** The sectors of the LAST completed lap (stable, for display) */
  lastLapSectors: SectorTimes;
  recentLaps: number[];
  totalElapsed: number;
  /** Absolute ms (since sim start) when current lap started */
  lapStartMs: number;
  /** Predicted duration of current lap in ms */
  currentLapDurationMs: number;
  /** Pre-computed sectors for the CURRENT in-progress lap */
  pendingSectors: SectorTimes;
  /** 
   * Current sector phase: 
   * 0 = no sector crossed yet (lap just started)
   * 1 = S1 crossed  
   * 2 = S1+S2 crossed
   * 3 = all crossed (lap complete)
   */
  sectorPhase: number;
  /** Sector crossing thresholds as fraction of lap [0.30, 0.65, 1.0] */
  sectorThresholds: [number, number, number];
}

export function initTeams(config: DemoConfig): TeamSimState[] {
  const teams: TeamSimState[] = [];
  const varDelta = variabilityDelta[config.variability];

  for (let i = 0; i < config.teamCount; i++) {
    let basePace: number;
    if (config.skill === 'mixed') {
      const tier = i / config.teamCount;
      basePace = 9.0 + tier * 1.5 + rand(-0.15, 0.15);
    } else {
      const [lo, hi] = skillPace[config.skill];
      basePace = rand(lo, hi);
    }

    basePace = clamp(basePace, 9.0, 11.0);
    const firstLapTime = generateLapTime(basePace, varDelta, 0, false, false);
    const sectors = generateSectors(firstLapTime);
    const thresholds = computeThresholds(sectors, firstLapTime);

    teams.push({
      fluxId: `team-${i + 1}`,
      teamName: TEAM_NAMES[i] ?? `Team ${i + 1}`,
      lane: i + 1,
      basePace,
      variability: varDelta,
      laps: 0,
      lastLap: null,
      bestLap: null,
      bestSectors: { s1: null, s2: null, s3: null },
      lastLapSectors: { s1: null, s2: null, s3: null },
      recentLaps: [],
      totalElapsed: 0,
      lapStartMs: 0,
      currentLapDurationMs: firstLapTime * 1000,
      pendingSectors: sectors,
      sectorPhase: 0,
      sectorThresholds: thresholds,
    });
  }

  return teams;
}

function computeThresholds(sectors: SectorTimes, lapTime: number): [number, number, number] {
  const s1 = sectors.s1 ?? lapTime * 0.30;
  const s2 = sectors.s2 ?? lapTime * 0.35;
  // Thresholds as fraction of lap duration
  return [
    s1 / lapTime,
    (s1 + s2) / lapTime,
    1.0,
  ];
}

export function generateLapTime(
  basePace: number,
  variability: number,
  lapNumber: number,
  degradation: boolean,
  fatigue: boolean,
  elapsedSeconds?: number,
): number {
  let lap = basePace;
  const noise = (Math.random() + Math.random() + Math.random() - 1.5) * variability;
  lap += noise;
  if (Math.random() < 0.03) lap += rand(0.4, 1.0);
  if (degradation && lapNumber > 30) lap += (lapNumber - 30) * rand(0.01, 0.03);
  if (fatigue && elapsedSeconds != null && elapsedSeconds > 120) {
    lap += rand(0.0, 0.08);
    if (elapsedSeconds > 120 && elapsedSeconds < 140 && Math.random() < 0.15) {
      lap += rand(0.3, 0.6);
    }
  }
  return clamp(lap, 8.5, 14.0);
}

export function generateSectors(lapTime: number): SectorTimes {
  const s1Ratio = 0.30 + rand(-0.02, 0.02);
  const s2Ratio = 0.35 + rand(-0.02, 0.02);
  const s3Ratio = 1 - s1Ratio - s2Ratio;
  return {
    s1: parseFloat((lapTime * s1Ratio).toFixed(3)),
    s2: parseFloat((lapTime * s2Ratio).toFixed(3)),
    s3: parseFloat((lapTime * s3Ratio).toFixed(3)),
  };
}

/**
 * Tick a team forward. Returns updated state and whether a new lap completed.
 * Also updates sectorPhase progressively within the current lap.
 */
export function tickTeam(
  team: TeamSimState,
  config: DemoConfig,
  simElapsedMs: number,
): { updated: TeamSimState; changed: boolean } {
  const lapElapsedMs = simElapsedMs - team.lapStartMs;
  const lapProgress = lapElapsedMs / team.currentLapDurationMs;

  // ── Lap not yet complete: check sector progression ──
  if (lapProgress < 1.0) {
    let newPhase = team.sectorPhase;
    if (config.enableSectors) {
      if (newPhase < 1 && lapProgress >= team.sectorThresholds[0]) newPhase = 1;
      if (newPhase < 2 && lapProgress >= team.sectorThresholds[1]) newPhase = 2;
    }
    if (newPhase !== team.sectorPhase) {
      return {
        updated: { ...team, sectorPhase: newPhase },
        changed: true,
      };
    }
    return { updated: team, changed: false };
  }

  // ── Lap complete ──
  const lapTime = team.currentLapDurationMs / 1000;
  const completedSectors = team.pendingSectors;

  const newLaps = team.laps + 1;
  const newBestLap = team.bestLap == null ? lapTime : Math.min(team.bestLap, lapTime);
  const newRecent = [...team.recentLaps, lapTime].slice(-20);
  const newElapsed = team.totalElapsed + lapTime;

  // Update best sectors
  let newBestSectors = { ...team.bestSectors };
  if (config.enableSectors) {
    if (newBestSectors.s1 == null || completedSectors.s1! < newBestSectors.s1) newBestSectors.s1 = completedSectors.s1;
    if (newBestSectors.s2 == null || completedSectors.s2! < newBestSectors.s2) newBestSectors.s2 = completedSectors.s2;
    if (newBestSectors.s3 == null || completedSectors.s3! < newBestSectors.s3) newBestSectors.s3 = completedSectors.s3;
  }

  // Prepare NEXT lap
  const nextLapTime = generateLapTime(
    team.basePace, team.variability, newLaps + 1,
    config.enableDegradation, config.enableFatigue, newElapsed,
  );
  const nextSectors = generateSectors(nextLapTime);
  const nextThresholds = computeThresholds(nextSectors, nextLapTime);
  const nextLapStartMs = team.lapStartMs + team.currentLapDurationMs;

  return {
    updated: {
      ...team,
      laps: newLaps,
      lastLap: lapTime,
      bestLap: newBestLap,
      bestSectors: newBestSectors,
      lastLapSectors: completedSectors,
      recentLaps: newRecent,
      totalElapsed: newElapsed,
      lapStartMs: nextLapStartMs,
      currentLapDurationMs: nextLapTime * 1000,
      pendingSectors: nextSectors,
      sectorPhase: 0, // reset for new lap
      sectorThresholds: nextThresholds,
    },
    changed: true,
  };
}

/**
 * Convert team state to PilotLiveData for display.
 * Shows currentSectors progressively based on sectorPhase.
 */
export function teamToPilot(team: TeamSimState, config: DemoConfig): PilotLiveData {
  // Current sectors = what's visible RIGHT NOW based on phase
  let currentSectors: SectorTimes;
  if (!config.enableSectors) {
    currentSectors = { s1: null, s2: null, s3: null };
  } else {
    currentSectors = {
      s1: team.sectorPhase >= 1 ? team.pendingSectors.s1 : null,
      s2: team.sectorPhase >= 2 ? team.pendingSectors.s2 : null,
      // S3 only shows briefly when lap completes (phase resets to 0 on new lap)
      // So we show last completed S3 from lastLapSectors when phase is 0 and we have data
      s3: team.sectorPhase >= 3 ? team.pendingSectors.s3 : null,
    };

    // When a new lap just started (phase=0) and S1 hasn't appeared yet,
    // briefly keep the completed lap's S3 visible
    if (team.sectorPhase === 0 && team.lastLapSectors.s3 != null) {
      currentSectors = { ...team.lastLapSectors };
    }
  }

  // Variation from recent laps
  let variation: number | null = null;
  if (team.recentLaps.length >= 3) {
    const recent = team.recentLaps.slice(-8);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length;
    variation = parseFloat(Math.sqrt(variance).toFixed(3));
  }

  return {
    id: team.fluxId,
    fluxId: team.fluxId,
    displayName: team.teamName,
    lane: team.lane,
    laps: team.laps,
    lastLap: team.lastLap,
    bestLap: team.bestLap,
    currentSectors,
    bestSectors: team.bestSectors,
    gap: null,
    variation,
    pitCount: 0,
    recentLaps: team.recentLaps.slice(-10),
    currentStint: null,
  };
}
