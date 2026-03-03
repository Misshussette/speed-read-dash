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

// ─── Team names ──────────────────────────────────────────────────────
const TEAM_NAMES = [
  'Scuderia Rosso', 'Blue Arrow Racing', 'Team Eclipse', 'Golden Wheels',
  'Thunder Slot', 'Apex Motorsport', 'Velocity RC', 'Shadow Racing',
  'Phoenix Evo', 'Delta Speed', 'Nitro Kings', 'Storm Riders',
];

// ─── Pace profiles ──────────────────────────────────────────────────
const skillPace: Record<SkillLevel, [number, number]> = {
  excellent: [9.0, 9.4],
  good:      [9.5, 9.9],
  average:   [10.0, 10.5],
  mixed:     [9.0, 10.5], // will be distributed
};

const variabilityDelta: Record<VariabilityLevel, number> = {
  low: 0.05,
  medium: 0.15,
  high: 0.30,
};

// ─── Helpers ─────────────────────────────────────────────────────────
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
  recentLaps: number[];
  totalElapsed: number; // cumulative seconds of laps
  nextLapDue: number;   // timestamp when next lap completes (ms since sim start)
}

export function initTeams(config: DemoConfig): TeamSimState[] {
  const teams: TeamSimState[] = [];
  const varDelta = variabilityDelta[config.variability];

  for (let i = 0; i < config.teamCount; i++) {
    let basePace: number;
    if (config.skill === 'mixed') {
      // Distribute across skill range with some clustering
      const tier = i / config.teamCount;
      basePace = 9.0 + tier * 1.5 + rand(-0.15, 0.15);
    } else {
      const [lo, hi] = skillPace[config.skill];
      basePace = rand(lo, hi);
    }

    const firstLapTime = generateLapTime(basePace, varDelta, 0, false, false);

    teams.push({
      fluxId: `team-${i + 1}`,
      teamName: TEAM_NAMES[i] ?? `Team ${i + 1}`,
      lane: i + 1,
      basePace: clamp(basePace, 9.0, 11.0),
      variability: varDelta,
      laps: 0,
      lastLap: null,
      bestLap: null,
      bestSectors: { s1: null, s2: null, s3: null },
      recentLaps: [],
      totalElapsed: 0,
      nextLapDue: firstLapTime * 1000, // first lap due after its duration
    });
  }

  return teams;
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

  // Micro variation (gaussian-ish via sum of randoms)
  const noise = (Math.random() + Math.random() + Math.random() - 1.5) * variability;
  lap += noise;

  // Occasional mistake (3% chance)
  if (Math.random() < 0.03) {
    lap += rand(0.4, 1.0);
  }

  // Tire degradation after 30 laps
  if (degradation && lapNumber > 30) {
    lap += (lapNumber - 30) * rand(0.01, 0.03);
  }

  // Fatigue after 120 seconds
  if (fatigue && elapsedSeconds != null && elapsedSeconds > 120) {
    lap += rand(0.0, 0.08);
    // Cluster of bad laps around fatigue onset
    if (elapsedSeconds > 120 && elapsedSeconds < 140 && Math.random() < 0.15) {
      lap += rand(0.3, 0.6);
    }
  }

  return clamp(lap, 8.5, 14.0);
}

export function generateSectors(lapTime: number): SectorTimes {
  // S1=30%, S2=35%, S3=35% with small variation
  const s1Ratio = 0.30 + rand(-0.02, 0.02);
  const s2Ratio = 0.35 + rand(-0.02, 0.02);
  const s3Ratio = 1 - s1Ratio - s2Ratio;

  const s1 = lapTime * s1Ratio;
  const s2 = lapTime * s2Ratio;
  const s3 = lapTime * s3Ratio;

  return {
    s1: parseFloat(s1.toFixed(3)),
    s2: parseFloat(s2.toFixed(3)),
    s3: parseFloat(s3.toFixed(3)),
  };
}

export function tickTeam(
  team: TeamSimState,
  config: DemoConfig,
  simElapsedMs: number,
): { updated: TeamSimState; newLap: boolean } {
  if (simElapsedMs < team.nextLapDue) {
    return { updated: team, newLap: false };
  }

  // Generate new lap
  const lapTime = generateLapTime(
    team.basePace,
    team.variability,
    team.laps + 1,
    config.enableDegradation,
    config.enableFatigue,
    team.totalElapsed,
  );

  const newLaps = team.laps + 1;
  const newBestLap = team.bestLap == null ? lapTime : Math.min(team.bestLap, lapTime);
  const newRecent = [...team.recentLaps, lapTime].slice(-20);
  const newElapsed = team.totalElapsed + lapTime;

  // Schedule next lap
  const nextLapTime = generateLapTime(
    team.basePace,
    team.variability,
    newLaps + 1,
    config.enableDegradation,
    config.enableFatigue,
    newElapsed,
  );

  let newBestSectors = { ...team.bestSectors };
  if (config.enableSectors) {
    const sectors = generateSectors(lapTime);
    if (newBestSectors.s1 == null || sectors.s1! < newBestSectors.s1) newBestSectors.s1 = sectors.s1;
    if (newBestSectors.s2 == null || sectors.s2! < newBestSectors.s2) newBestSectors.s2 = sectors.s2;
    if (newBestSectors.s3 == null || sectors.s3! < newBestSectors.s3) newBestSectors.s3 = sectors.s3;
  }

  return {
    updated: {
      ...team,
      laps: newLaps,
      lastLap: lapTime,
      bestLap: newBestLap,
      bestSectors: newBestSectors,
      recentLaps: newRecent,
      totalElapsed: newElapsed,
      nextLapDue: team.nextLapDue + nextLapTime * 1000,
    },
    newLap: true,
  };
}

export function teamToPilot(team: TeamSimState, config: DemoConfig, allTeams: TeamSimState[]): PilotLiveData {
  const sectors = config.enableSectors && team.lastLap != null
    ? generateSectors(team.lastLap)
    : { s1: null, s2: null, s3: null };

  // Calculate variation from recent laps
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
    currentSectors: sectors,
    bestSectors: team.bestSectors,
    gap: null,
    variation,
    pitCount: 0,
    recentLaps: team.recentLaps.slice(-10),
    currentStint: null,
  };
}
