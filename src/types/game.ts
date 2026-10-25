/**
 * AstroType Core Data Contracts & State Types
 */

// The Save and its parts are defined once, by the schema.
export type {
  AudioSynthCore,
  BeatTheme,
  KeyAnalytics,
  PlayerProfile,
  ShipUpgrades,
  StageProgress,
  TrailColorTheme,
} from '../store/schemas';

/** The screens, named as in GLOSSARY.md. The machine decides which one shows. */
export type Screen =
  | 'academy-home'
  | 'flight-deck'
  | 'pause-menu'
  | 'galaxy-map'
  | 'hangar'
  | 'analytics'
  | 'free-flight'
  | 'debrief';

/** Where the Run is: none yet since load, or running, paused, cleared or abandoned. */
export type RunPhase = 'none' | 'running' | 'paused' | 'cleared' | 'abandoned';

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
  twoStarWpm: number; // e.g. 25
  twoStarAccuracy: number; // e.g. 90
  threeStarWpm: number; // e.g. 40
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
  drillPatternType?:
    | 'ANCHOR_CALIBRATION'
    | 'FINGER_EXPANSION'
    | 'ANCHOR_REACH_RETURN'
    | 'HAND_ALTERNATION'
    | 'VOWEL_REACH'
    | 'CADENCE_FLOW'
    | 'SHIFT_DISCIPLINE';
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
