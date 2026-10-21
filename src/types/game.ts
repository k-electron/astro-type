/**
 * AstroType Core Data Contracts & State Types
 */

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'STAGE_SELECT' | 'HANGAR' | 'ANALYTICS' | 'CUSTOM_PRACTICE';

export type FingerZone = 
  | 'LEFT_PINKY' 
  | 'LEFT_RING' 
  | 'LEFT_MIDDLE' 
  | 'LEFT_INDEX' 
  | 'THUMB' 
  | 'RIGHT_INDEX' 
  | 'RIGHT_MIDDLE' 
  | 'RIGHT_RING' 
  | 'RIGHT_PINKY';

export interface FingerLaneInfo {
  laneIndex: number;
  finger: FingerZone;
  label: string;
  hand: 'left' | 'right' | 'thumb';
  color: string;
  glowColor: string;
}

export type BeatTheme = 'NEON_SYNTHWAVE' | 'CYBER_PULSE' | 'COSMIC_LOFI';

export interface FallingNote {
  id: string;
  char: string;
  displayChar: string; // e.g. "␣" for space
  lane: number; // 0 to 8
  finger: FingerZone;
  targetTimeMs: number; // absolute timestamp or stage progress time
  yPercent: number; // 0 to 100 on canvas
  status: 'PENDING' | 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS' | 'PROCESSED';
  hitTimestamp?: number;
  isTargetLocked?: boolean;
}

export interface StarRatingThresholds {
  oneStarAccuracy: number; // e.g. 75
  twoStarWpm: number;      // e.g. 25
  twoStarAccuracy: number; // e.g. 90
  threeStarWpm: number;    // e.g. 40
  threeStarAccuracy: number; // e.g. 95
  threeStarMinStreak: number; // e.g. 25
}

export interface Stage {
  id: string; // e.g. "s1-l1"
  sectorId: string; // e.g. "sector-1"
  stageNumber: number; // 1 to 4
  title: string;
  subtitle: string;
  description: string;
  targetKeys: string[];
  sampleText: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  targetWpm: number;
  starThresholds: StarRatingThresholds;
  timeLimitSeconds?: number;
  focusFingers?: string; // e.g. "Left Index (F) & Right Index (J)"
  techniqueTip?: string; // e.g. "Rest index fingers on F and J bumps. Keep palms level."
  drillPatternType?: 'ANCHOR_CALIBRATION' | 'FINGER_EXPANSION' | 'ANCHOR_REACH_RETURN' | 'HAND_ALTERNATION' | 'VOWEL_REACH' | 'CADENCE_FLOW' | 'SHIFT_DISCIPLINE';
}

export interface Sector {
  id: string;
  name: string;
  codenick: string; // e.g. "Sector 01: Orion Belt"
  curriculumCategory: string; // e.g. "Home Row Foundations"
  description: string;
  requiredStarsToUnlock: number; // Star-gate sector unlock milestone
  stages: Stage[];
  accentColor: string;
  themeSymbol: string;
}

export interface StageProgress {
  stageId: string;
  completed: boolean;
  starsEarned: number; // 0 to 3
  highScore: number;
  bestWpm: number;
  bestAccuracy: number;
  bestStreak: number;
  timesPlayed: number;
  lastPlayedAt?: number;
}

export interface KeyAnalytics {
  hits: number;
  misses: number;
}

export type TrailColorTheme = 'CYAN' | 'AMBER' | 'EMERALD' | 'VIOLET' | 'SUPERNOVA';
export type AudioSynthCore = 'CYBER_SYNTH' | 'RETRO_8BIT' | 'DEEP_SPACE' | 'NEO_ACOUSTIC';

export interface ShipUpgrades {
  deflectorShields: number; // 0 to 3 (absorbs mistakes without breaking combo)
  hyperdriveReactor: number; // 0 to 3 (fills hyperspace meter faster)
  precisionSensors: number; // 0 to 3 (widens PERFECT timing window)
  equippedTrailTheme: TrailColorTheme;
  equippedAudioCore: AudioSynthCore;
  unlockedThemes: TrailColorTheme[];
  unlockedAudioCores: AudioSynthCore[];
}

export interface PlayerProfile {
  totalCredits: number;
  totalStars: number;
  totalKeystrokes: number;
  totalErrors: number;
  totalWordsTyped: number;
  totalPracticeSeconds: number;
  highestWpmAllTime: number;
  stagesProgress: Record<string, StageProgress>;
  keyAnalytics: Record<string, KeyAnalytics>;
  upgrades: ShipUpgrades;
  soundEnabled: boolean;
  soundVolume: number; // 0 to 1
  ambientMusicVolume: number; // 0 to 1
  highwaySpeed: 'SLOW' | 'NORMAL' | 'FAST' | 'HYPER';
  keyboardVisible: boolean;
  handsVisible: boolean;
  musicEnabled: boolean;
  musicVolume: number; // 0 to 1
  beatTheme: BeatTheme;
  globalMuted?: boolean;
}

export interface LivePerformance {
  score: number;
  currentStreak: number;
  maxStreak: number;
  multiplier: number; // 1, 2, 3, 4
  hyperspaceActive: boolean;
  hyperspaceEnergy: number; // 0 to 100
  shieldsRemaining: number;
  correctKeystrokes: number;
  incorrectKeystrokes: number;
  totalKeystrokes: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  currentCharIndex: number;
  timeElapsedSeconds: number;
  timingFeedback: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS' | null;
  timingFeedbackKey: number; // counter to re-trigger animations
  cadenceConsistency?: number; // 0 to 100% rhythm regularity between keystrokes
  lastHitDrone?: {
    id?: string;
    char: string;
    yPercent: number;
    lane: number;
  } | null;
}
