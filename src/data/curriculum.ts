import { FingerLaneInfo, FingerZone, Sector, Stage } from '../types/game';

export const FINGER_LANES: FingerLaneInfo[] = [
  { laneIndex: 0, finger: 'LEFT_PINKY', label: 'L.Pinky', hand: 'left', color: '#ec4899', glowColor: 'rgba(236, 72, 153, 0.5)' },
  { laneIndex: 1, finger: 'LEFT_RING', label: 'L.Ring', hand: 'left', color: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.5)' },
  { laneIndex: 2, finger: 'LEFT_MIDDLE', label: 'L.Mid', hand: 'left', color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.5)' },
  { laneIndex: 3, finger: 'LEFT_INDEX', label: 'L.Index', hand: 'left', color: '#06b6d4', glowColor: 'rgba(6, 182, 212, 0.5)' },
  { laneIndex: 4, finger: 'THUMB', label: 'Space', hand: 'thumb', color: '#10b981', glowColor: 'rgba(16, 185, 129, 0.5)' },
  { laneIndex: 5, finger: 'RIGHT_INDEX', label: 'R.Index', hand: 'right', color: '#f59e0b', glowColor: 'rgba(245, 158, 11, 0.5)' },
  { laneIndex: 6, finger: 'RIGHT_MIDDLE', label: 'R.Mid', hand: 'right', color: '#f97316', glowColor: 'rgba(249, 115, 22, 0.5)' },
  { laneIndex: 7, finger: 'RIGHT_RING', label: 'R.Ring', hand: 'right', color: '#f43f5e', glowColor: 'rgba(244, 63, 94, 0.5)' },
  { laneIndex: 8, finger: 'RIGHT_PINKY', label: 'R.Pinky', hand: 'right', color: '#8b5cf6', glowColor: 'rgba(139, 92, 246, 0.5)' },
];

export const KEY_FINGER_MAP: Record<string, { lane: number; finger: FingerZone; hand: 'left' | 'right' | 'thumb'; shiftRequired: boolean; recommendedShiftHand: 'left' | 'right' | null }> = {
  // Home Row
  'a': { lane: 0, finger: 'LEFT_PINKY', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  's': { lane: 1, finger: 'LEFT_RING', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'd': { lane: 2, finger: 'LEFT_MIDDLE', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'f': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'g': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'h': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  'j': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  'k': { lane: 6, finger: 'RIGHT_MIDDLE', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  'l': { lane: 7, finger: 'RIGHT_RING', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  ';': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  "'": { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: false, recommendedShiftHand: null },

  // Top Row
  'q': { lane: 0, finger: 'LEFT_PINKY', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'w': { lane: 1, finger: 'LEFT_RING', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'e': { lane: 2, finger: 'LEFT_MIDDLE', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'r': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  't': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'y': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  'u': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  'i': { lane: 6, finger: 'RIGHT_MIDDLE', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  'o': { lane: 7, finger: 'RIGHT_RING', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  'p': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  '[': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  ']': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: false, recommendedShiftHand: null },

  // Bottom Row
  'z': { lane: 0, finger: 'LEFT_PINKY', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'x': { lane: 1, finger: 'LEFT_RING', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'c': { lane: 2, finger: 'LEFT_MIDDLE', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'v': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'b': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  'n': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  'm': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  ',': { lane: 6, finger: 'RIGHT_MIDDLE', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  '.': { lane: 7, finger: 'RIGHT_RING', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  '/': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: false, recommendedShiftHand: null },

  // Numbers Row
  '`': { lane: 0, finger: 'LEFT_PINKY', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  '1': { lane: 0, finger: 'LEFT_PINKY', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  '2': { lane: 1, finger: 'LEFT_RING', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  '3': { lane: 2, finger: 'LEFT_MIDDLE', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  '4': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  '5': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: false, recommendedShiftHand: null },
  '6': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  '7': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  '8': { lane: 6, finger: 'RIGHT_MIDDLE', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  '9': { lane: 7, finger: 'RIGHT_RING', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  '0': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  '-': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: false, recommendedShiftHand: null },
  '=': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: false, recommendedShiftHand: null },

  // Space
  ' ': { lane: 4, finger: 'THUMB', hand: 'thumb', shiftRequired: false, recommendedShiftHand: null },

  // Uppercase Letters
  'A': { lane: 0, finger: 'LEFT_PINKY', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'S': { lane: 1, finger: 'LEFT_RING', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'D': { lane: 2, finger: 'LEFT_MIDDLE', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'F': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'G': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'H': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  'J': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  'K': { lane: 6, finger: 'RIGHT_MIDDLE', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  'L': { lane: 7, finger: 'RIGHT_RING', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  'Q': { lane: 0, finger: 'LEFT_PINKY', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'W': { lane: 1, finger: 'LEFT_RING', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'E': { lane: 2, finger: 'LEFT_MIDDLE', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'R': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'T': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'Y': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  'U': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  'I': { lane: 6, finger: 'RIGHT_MIDDLE', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  'O': { lane: 7, finger: 'RIGHT_RING', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  'P': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  'Z': { lane: 0, finger: 'LEFT_PINKY', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'X': { lane: 1, finger: 'LEFT_RING', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'C': { lane: 2, finger: 'LEFT_MIDDLE', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'V': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'B': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  'N': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  'M': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },

  // Shifted Symbols
  '~': { lane: 0, finger: 'LEFT_PINKY', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  '!': { lane: 0, finger: 'LEFT_PINKY', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  '@': { lane: 1, finger: 'LEFT_RING', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  '#': { lane: 2, finger: 'LEFT_MIDDLE', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  '$': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  '%': { lane: 3, finger: 'LEFT_INDEX', hand: 'left', shiftRequired: true, recommendedShiftHand: 'right' },
  '^': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  '&': { lane: 5, finger: 'RIGHT_INDEX', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  '*': { lane: 6, finger: 'RIGHT_MIDDLE', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  '(': { lane: 7, finger: 'RIGHT_RING', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  ')': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  '_': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  '+': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  '{': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  '}': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  ':': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  '"': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  '<': { lane: 6, finger: 'RIGHT_MIDDLE', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  '>': { lane: 7, finger: 'RIGHT_RING', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
  '?': { lane: 8, finger: 'RIGHT_PINKY', hand: 'right', shiftRequired: true, recommendedShiftHand: 'left' },
};

export function getNoteLaneAndFinger(char: string): { lane: number; finger: FingerZone; hand: 'left' | 'right' | 'thumb'; shiftRequired: boolean; recommendedShiftHand: 'left' | 'right' | null } {
  if (KEY_FINGER_MAP[char]) {
    return KEY_FINGER_MAP[char];
  }
  const lower = char.toLowerCase();
  if (KEY_FINGER_MAP[lower]) {
    const base = KEY_FINGER_MAP[lower];
    return {
      ...base,
      shiftRequired: char !== lower,
      recommendedShiftHand: base.hand === 'left' ? 'right' : 'left'
    };
  }
  // Default fallback to middle lane
  return { lane: 4, finger: 'THUMB', hand: 'thumb', shiftRequired: false, recommendedShiftHand: null };
}

export const CURRICULUM_SECTORS: Sector[] = [
  {
    id: 'sector-1',
    codenick: 'Sector 01',
    name: 'Orion Belt',
    curriculumCategory: 'Home Row Foundations',
    description: 'Master the core anchor keys (ASDF and JKL;) with index reaches to G and H. Establish tactile muscle memory.',
    requiredStarsToUnlock: 0,
    accentColor: '#06b6d4',
    themeSymbol: '◆',
    stages: [
      {
        id: 's1-l1',
        sectorId: 'sector-1',
        stageNumber: 1,
        title: 'Anchor Positioning',
        subtitle: 'Tactile Home Row Alignment',
        description: 'Rest index fingers on F and J bumps. Type home keys with steady, relaxed rhythm.',
        targetKeys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';', ' '],
        sampleText: 'asdf jkl; asdf jkl; fdsa ;lkj dad fad lad ask all fall flash',
        difficulty: 'Beginner',
        targetWpm: 18,
        starThresholds: {
          oneStarAccuracy: 75,
          twoStarWpm: 18,
          twoStarAccuracy: 88,
          threeStarWpm: 26,
          threeStarAccuracy: 95,
          threeStarMinStreak: 18
        }
      },
      {
        id: 's1-l2',
        sectorId: 'sector-1',
        stageNumber: 2,
        title: 'Center Horizon Reaches',
        subtitle: 'Index Extension to G & H',
        description: 'Reach inward with index fingers: Left index strikes G, Right index strikes H, then return home.',
        targetKeys: ['g', 'h', 'a', 's', 'd', 'f', 'j', 'k', 'l', ' '],
        sampleText: 'asdfg hjkl; gaga haha glad half flag dash flash salad shall glass',
        difficulty: 'Beginner',
        targetWpm: 22,
        starThresholds: {
          oneStarAccuracy: 78,
          twoStarWpm: 22,
          twoStarAccuracy: 90,
          threeStarWpm: 30,
          threeStarAccuracy: 96,
          threeStarMinStreak: 22
        }
      },
      {
        id: 's1-l3',
        sectorId: 'sector-1',
        stageNumber: 3,
        title: 'Home Row Word Fleet',
        subtitle: 'Cadence & Real Vocabulary',
        description: 'Combine all 8 home keys into continuous English words without looking down.',
        targetKeys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ' '],
        sampleText: 'dad had a flask all lads ask dad had half a glass as a flash fall',
        difficulty: 'Beginner',
        targetWpm: 25,
        starThresholds: {
          oneStarAccuracy: 80,
          twoStarWpm: 25,
          twoStarAccuracy: 92,
          threeStarWpm: 34,
          threeStarAccuracy: 97,
          threeStarMinStreak: 26
        }
      },
      {
        id: 's1-l4',
        sectorId: 'sector-1',
        stageNumber: 4,
        title: 'Asteroid Belt Sprint',
        subtitle: 'Sustained Home Row Mastery',
        description: 'A continuous speed challenge across the entire home row sector.',
        targetKeys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ' '],
        sampleText: 'all gladiators had flasks a shall lad ask dad as a salad falls gladly flash',
        difficulty: 'Beginner',
        targetWpm: 28,
        starThresholds: {
          oneStarAccuracy: 82,
          twoStarWpm: 28,
          twoStarAccuracy: 94,
          threeStarWpm: 38,
          threeStarAccuracy: 98,
          threeStarMinStreak: 30
        }
      }
    ]
  },
  {
    id: 'sector-2',
    codenick: 'Sector 02',
    name: 'Andromeda Nebula',
    curriculumCategory: 'Top Row & Vowels',
    description: 'Ascend to the upper orbit: strike QWERTY UIOP and master vowel transitions with middle and ring fingers.',
    requiredStarsToUnlock: 6,
    accentColor: '#3b82f6',
    themeSymbol: '▲',
    stages: [
      {
        id: 's2-l1',
        sectorId: 'sector-2',
        stageNumber: 1,
        title: 'Core Vowels Orbit',
        subtitle: 'Middle Finger Reach: E & I',
        description: 'D finger reaches up to E. K finger reaches up to I. Maintain home row baseline.',
        targetKeys: ['e', 'i', 'd', 'k', 'f', 'j', ' '],
        sampleText: 'deed kiki like side life kids file field slide ride hide feed seed',
        difficulty: 'Intermediate',
        targetWpm: 24,
        starThresholds: {
          oneStarAccuracy: 80,
          twoStarWpm: 24,
          twoStarAccuracy: 90,
          threeStarWpm: 34,
          threeStarAccuracy: 96,
          threeStarMinStreak: 24
        }
      },
      {
        id: 's2-l2',
        sectorId: 'sector-2',
        stageNumber: 2,
        title: 'Index Flight Deck',
        subtitle: 'Upward Index Reaches: R, U, T, Y',
        description: 'Left index reaches up to R and T. Right index reaches up to U and Y.',
        targetKeys: ['r', 'u', 't', 'y', 'f', 'j', ' '],
        sampleText: 'true trust your rust yard turn furry duty right fruit trait fury tray',
        difficulty: 'Intermediate',
        targetWpm: 28,
        starThresholds: {
          oneStarAccuracy: 82,
          twoStarWpm: 28,
          twoStarAccuracy: 91,
          threeStarWpm: 38,
          threeStarAccuracy: 96,
          threeStarMinStreak: 26
        }
      },
      {
        id: 's2-l3',
        sectorId: 'sector-2',
        stageNumber: 3,
        title: 'Outer Wing Reaches',
        subtitle: 'Pinky & Ring: Q, W, O, P',
        description: 'Left pinky & ring reach Q and W. Right ring & pinky reach O and P.',
        targetKeys: ['q', 'w', 'o', 'p', 'a', 's', 'l', ';', ' '],
        sampleText: 'quick power quote loop prowl willow plot quiet troop polar equip swoop',
        difficulty: 'Intermediate',
        targetWpm: 30,
        starThresholds: {
          oneStarAccuracy: 82,
          twoStarWpm: 30,
          twoStarAccuracy: 92,
          threeStarWpm: 42,
          threeStarAccuracy: 97,
          threeStarMinStreak: 28
        }
      },
      {
        id: 's2-l4',
        sectorId: 'sector-2',
        stageNumber: 4,
        title: 'Nebula Stream Run',
        subtitle: 'Upper Row High-Velocity Sentences',
        description: 'Fluid integration of all upper orbit letters with high-frequency English trigrams.',
        targetKeys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', ' '],
        sampleText: 'the power to write requires pure quiet thought and steady upright posture',
        difficulty: 'Intermediate',
        targetWpm: 34,
        starThresholds: {
          oneStarAccuracy: 84,
          twoStarWpm: 34,
          twoStarAccuracy: 93,
          threeStarWpm: 46,
          threeStarAccuracy: 97,
          threeStarMinStreak: 32
        }
      }
    ]
  },
  {
    id: 'sector-3',
    codenick: 'Sector 03',
    name: 'Kepler Expanse',
    curriculumCategory: 'Bottom Row & Punctuation',
    description: 'Descend to ZXCVBNM plus comma and period. Train downward finger flexibility and full alphabet fluidity.',
    requiredStarsToUnlock: 14,
    accentColor: '#10b981',
    themeSymbol: '▼',
    stages: [
      {
        id: 's3-l1',
        sectorId: 'sector-3',
        stageNumber: 1,
        title: 'Descent Coordinates',
        subtitle: 'Middle & Index Down: C, M, V, N',
        description: 'D down to C, K down to M. F down to V, J down to N.',
        targetKeys: ['c', 'm', 'v', 'n', ' '],
        sampleText: 'cave move name voice cabin cosmic mission vacuum venom machine common',
        difficulty: 'Intermediate',
        targetWpm: 26,
        starThresholds: {
          oneStarAccuracy: 80,
          twoStarWpm: 26,
          twoStarAccuracy: 90,
          threeStarWpm: 36,
          threeStarAccuracy: 96,
          threeStarMinStreak: 24
        }
      },
      {
        id: 's3-l2',
        sectorId: 'sector-3',
        stageNumber: 2,
        title: 'Deep Trench Reaches',
        subtitle: 'Z, X, B, and Comma & Period',
        description: 'A down to Z, S down to X, F across to B. Right hand strikes comma and period.',
        targetKeys: ['z', 'x', 'b', ',', '.', ' '],
        sampleText: 'brave buzz box zeal orbit, flux, gaze, apex. beacon next, size zoom.',
        difficulty: 'Intermediate',
        targetWpm: 28,
        starThresholds: {
          oneStarAccuracy: 82,
          twoStarWpm: 28,
          twoStarAccuracy: 91,
          threeStarWpm: 40,
          threeStarAccuracy: 96,
          threeStarMinStreak: 26
        }
      },
      {
        id: 's3-l3',
        sectorId: 'sector-3',
        stageNumber: 3,
        title: 'Full Horizon Pangram',
        subtitle: 'All 26 Letters in Harmonic Motion',
        description: 'Classic pangrams that touch every single letter key across top, home, and bottom rows.',
        targetKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ' ', '.'],
        sampleText: 'the quick brown fox jumps over the lazy dog. pack my box with five dozen jugs.',
        difficulty: 'Advanced',
        targetWpm: 32,
        starThresholds: {
          oneStarAccuracy: 84,
          twoStarWpm: 32,
          twoStarAccuracy: 92,
          threeStarWpm: 46,
          threeStarAccuracy: 97,
          threeStarMinStreak: 30
        }
      },
      {
        id: 's3-l4',
        sectorId: 'sector-3',
        stageNumber: 4,
        title: 'Planetary Survey',
        subtitle: 'Sentence Rhythm & Full Alphabet',
        description: 'Real scientific expedition notes across all 26 keys with natural punctuation.',
        targetKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ',', '.', ' '],
        sampleText: 'the rover discovered mineral veins in the canyon. probes transmitted data, while solar sails caught solar wind.',
        difficulty: 'Advanced',
        targetWpm: 36,
        starThresholds: {
          oneStarAccuracy: 85,
          twoStarWpm: 36,
          twoStarAccuracy: 93,
          threeStarWpm: 48,
          threeStarAccuracy: 97,
          threeStarMinStreak: 32
        }
      }
    ]
  },
  {
    id: 'sector-4',
    codenick: 'Sector 04',
    name: 'Cygnus Corridor',
    curriculumCategory: '100 Common Words & Rhythm',
    description: 'Build instinctual muscle memory for the most frequent English words and rhythmic word groups.',
    requiredStarsToUnlock: 24,
    accentColor: '#f59e0b',
    themeSymbol: '⚡',
    stages: [
      {
        id: 's4-l1',
        sectorId: 'sector-4',
        stageNumber: 1,
        title: 'Core Frequent Words',
        subtitle: 'High Frequency Flow 01-25',
        description: 'Type common function words that make up over 30% of all written communication.',
        targetKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ' '],
        sampleText: 'the of and to a in is you that it he was for on are as with his they at be this have from or',
        difficulty: 'Intermediate',
        targetWpm: 35,
        starThresholds: {
          oneStarAccuracy: 85,
          twoStarWpm: 35,
          twoStarAccuracy: 92,
          threeStarWpm: 50,
          threeStarAccuracy: 97,
          threeStarMinStreak: 30
        }
      },
      {
        id: 's4-l2',
        sectorId: 'sector-4',
        stageNumber: 2,
        title: 'Secondary Word Stream',
        subtitle: 'High Frequency Flow 26-50',
        description: 'Next tier of essential vocabulary: pronouns, auxiliary verbs, and temporal adverbs.',
        targetKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ' '],
        sampleText: 'one had by word but not what all were we when your can said there use an each which she do how their if will',
        difficulty: 'Intermediate',
        targetWpm: 38,
        starThresholds: {
          oneStarAccuracy: 86,
          twoStarWpm: 38,
          twoStarAccuracy: 93,
          threeStarWpm: 52,
          threeStarAccuracy: 97,
          threeStarMinStreak: 32
        }
      },
      {
        id: 's4-l3',
        sectorId: 'sector-4',
        stageNumber: 3,
        title: 'Galactic Flight Log',
        subtitle: 'Cadence & Sustained Flow',
        description: 'Maintain rhythm across longer coherent prose without slowing down on transitions.',
        targetKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ',', '.', ' '],
        sampleText: 'all stations reported nominal energy levels before entering the jump gate. our destination is twenty light hours beyond the belt.',
        difficulty: 'Advanced',
        targetWpm: 42,
        starThresholds: {
          oneStarAccuracy: 87,
          twoStarWpm: 42,
          twoStarAccuracy: 94,
          threeStarWpm: 55,
          threeStarAccuracy: 98,
          threeStarMinStreak: 36
        }
      },
      {
        id: 's4-l4',
        sectorId: 'sector-4',
        stageNumber: 4,
        title: 'Cygnus Warp Sprint',
        subtitle: 'Endurance & Velocity Challenge',
        description: 'Test your maximum burst speed through a sustained high-velocity paragraph.',
        targetKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ',', '.', ' '],
        sampleText: 'speed is born of precision and relaxed shoulders. breathe evenly as each word flows smoothly from mind to fingertips.',
        difficulty: 'Advanced',
        targetWpm: 45,
        starThresholds: {
          oneStarAccuracy: 88,
          twoStarWpm: 45,
          twoStarAccuracy: 95,
          threeStarWpm: 60,
          threeStarAccuracy: 98,
          threeStarMinStreak: 40
        }
      }
    ]
  },
  {
    id: 'sector-5',
    codenick: 'Sector 05',
    name: 'Pulsar Core',
    curriculumCategory: 'Astral Numbers (0-9)',
    description: 'Master the top numeric row without looking away from your screen. Crucial for dates, coordinates, and telemetry.',
    requiredStarsToUnlock: 36,
    accentColor: '#f97316',
    themeSymbol: '⬢',
    stages: [
      {
        id: 's5-l1',
        sectorId: 'sector-5',
        stageNumber: 1,
        title: 'Center Telemetry (4, 5, 6, 7)',
        subtitle: 'Index Finger Numerical Reaches',
        description: 'F reaches up to 4 and 5. J reaches up to 6 and 7.',
        targetKeys: ['4', '5', '6', '7', ' '],
        sampleText: '45 67 47 56 456 765 745 654 4455 6677 7546 6457 4756 7645',
        difficulty: 'Advanced',
        targetWpm: 28,
        starThresholds: {
          oneStarAccuracy: 80,
          twoStarWpm: 28,
          twoStarAccuracy: 90,
          threeStarWpm: 40,
          threeStarAccuracy: 96,
          threeStarMinStreak: 25
        }
      },
      {
        id: 's5-l2',
        sectorId: 'sector-5',
        stageNumber: 2,
        title: 'Orbit Scales (2, 3, 8, 9)',
        subtitle: 'Ring & Middle Numbers',
        description: 'S to 2, D to 3, L to 9, K to 8. Anchor index fingers on home keys.',
        targetKeys: ['2', '3', '8', '9', ' '],
        sampleText: '23 89 28 39 2389 9832 2893 3982 2233 8899 3829 9382 8293',
        difficulty: 'Advanced',
        targetWpm: 30,
        starThresholds: {
          oneStarAccuracy: 82,
          twoStarWpm: 30,
          twoStarAccuracy: 91,
          threeStarWpm: 42,
          threeStarAccuracy: 96,
          threeStarMinStreak: 26
        }
      },
      {
        id: 's5-l3',
        sectorId: 'sector-5',
        stageNumber: 3,
        title: 'Outer Limits (1 & 0)',
        subtitle: 'Pinky Numeric Reaches',
        description: 'Left pinky reaches 1, right pinky reaches 0. Keep wrists anchored.',
        targetKeys: ['1', '0', ' '],
        sampleText: '10 100 1010 1100 1001 0110 1000 10101 10010 01010 111000',
        difficulty: 'Advanced',
        targetWpm: 32,
        starThresholds: {
          oneStarAccuracy: 82,
          twoStarWpm: 32,
          twoStarAccuracy: 92,
          threeStarWpm: 45,
          threeStarAccuracy: 97,
          threeStarMinStreak: 28
        }
      },
      {
        id: 's5-l4',
        sectorId: 'sector-5',
        stageNumber: 4,
        title: 'Flight Telemetry Grid',
        subtitle: 'Alphanumeric Codes & Coordinates',
        description: 'Real-world aerospace callsigns, mission dates, and vector coordinates.',
        targetKeys: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ' '],
        sampleText: 'apollo 11 landed in 1969. voyager 1 is 24 billion kilometers away. sector 42 vector 360 bearing 98.',
        difficulty: 'Expert',
        targetWpm: 36,
        starThresholds: {
          oneStarAccuracy: 84,
          twoStarWpm: 36,
          twoStarAccuracy: 92,
          threeStarWpm: 48,
          threeStarAccuracy: 97,
          threeStarMinStreak: 32
        }
      }
    ]
  },
  {
    id: 'sector-6',
    codenick: 'Sector 06',
    name: 'Quantum Void',
    curriculumCategory: 'Symbols & Shift Key Mastery',
    description: 'Opposite-hand Shift key discipline, punctuation, parentheses, brackets, and programming syntax.',
    requiredStarsToUnlock: 48,
    accentColor: '#8b5cf6',
    themeSymbol: '⬡',
    stages: [
      {
        id: 's6-l1',
        sectorId: 'sector-6',
        stageNumber: 1,
        title: 'Capital Protocols',
        subtitle: 'Opposite Hand Shift Rule',
        description: 'Left Shift for right-hand keys (H, J, K, L, U, I, O, P). Right Shift for left-hand keys (A, S, D, F, Q, W, E, R).',
        targetKeys: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', ' '],
        sampleText: 'Houston Discovery Saturn Jupiter Orion Neptune Mars Apollo Polaris Andromeda Earth',
        difficulty: 'Advanced',
        targetWpm: 32,
        starThresholds: {
          oneStarAccuracy: 84,
          twoStarWpm: 32,
          twoStarAccuracy: 92,
          threeStarWpm: 45,
          threeStarAccuracy: 97,
          threeStarMinStreak: 28
        }
      },
      {
        id: 's6-l2',
        sectorId: 'sector-6',
        stageNumber: 2,
        title: 'Punctuation Orbit',
        subtitle: 'Quotes, Exclamations, Questions',
        description: 'Dialogue and expressive punctuation: quotes, exclamation marks, question marks, and colons.',
        targetKeys: ['"', '!', '?', ':', ';', ',', '.', "'", ' '],
        sampleText: '"Signal detected!" whispered Maya: "Could it be alien?" Yes, indeed; verify it immediately!',
        difficulty: 'Expert',
        targetWpm: 34,
        starThresholds: {
          oneStarAccuracy: 85,
          twoStarWpm: 34,
          twoStarAccuracy: 93,
          threeStarWpm: 48,
          threeStarAccuracy: 97,
          threeStarMinStreak: 30
        }
      },
      {
        id: 's6-l3',
        sectorId: 'sector-6',
        stageNumber: 3,
        title: 'Quantum Code Matrix',
        subtitle: 'Brackets, Math & Programmatic Tokens',
        description: 'Master symbols required in software engineering and scientific calculations: {}, [], (), +, =, <>, &.',
        targetKeys: ['{', '}', '[', ']', '(', ')', '+', '=', '<', '>', '&', '%', '$', '#', '@'],
        sampleText: 'const ship = { shields: 100, warp: true, coords: [42, 98] }; if (speed > max && power >= 90) { return true; }',
        difficulty: 'Expert',
        targetWpm: 36,
        starThresholds: {
          oneStarAccuracy: 85,
          twoStarWpm: 36,
          twoStarAccuracy: 93,
          threeStarWpm: 50,
          threeStarAccuracy: 97,
          threeStarMinStreak: 32
        }
      },
      {
        id: 's6-l4',
        sectorId: 'sector-6',
        stageNumber: 4,
        title: 'Full Syntax Gauntlet',
        subtitle: 'Mixed Text, Code, Numbers & Symbols',
        description: 'High complexity test uniting every standard keyboard symbol, numeral, and punctuation mark.',
        targetKeys: ['{', '}', '(', ')', '"', ':', ';', '$', '#', '@', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        sampleText: 'import { Vector3 } from "three"; function launch(id: number = 7) { return `Beacon#${id} launched @ 100%`; }',
        difficulty: 'Expert',
        targetWpm: 38,
        starThresholds: {
          oneStarAccuracy: 86,
          twoStarWpm: 38,
          twoStarAccuracy: 94,
          threeStarWpm: 52,
          threeStarAccuracy: 98,
          threeStarMinStreak: 34
        }
      }
    ]
  },
  {
    id: 'sector-7',
    codenick: 'Sector 07',
    name: 'Event Horizon',
    curriculumCategory: 'Grandmaster Prose & Warp Speed',
    description: 'The pinnacle of advanced touch typing mastery. High velocity endurance across inspiring astronomical prose.',
    requiredStarsToUnlock: 60,
    accentColor: '#ec4899',
    themeSymbol: '★',
    stages: [
      {
        id: 's7-l1',
        sectorId: 'sector-7',
        stageNumber: 1,
        title: 'Pale Blue Dot',
        subtitle: 'Deep Space Astronomical Prose',
        description: 'Transcribe one of the most famous passages in human exploration history with unwavering rhythm.',
        targetKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ',', '.', ' '],
        sampleText: 'Look again at that dot. That is here. That is home. That is us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives.',
        difficulty: 'Expert',
        targetWpm: 45,
        starThresholds: {
          oneStarAccuracy: 88,
          twoStarWpm: 45,
          twoStarAccuracy: 95,
          threeStarWpm: 65,
          threeStarAccuracy: 98,
          threeStarMinStreak: 40
        }
      },
      {
        id: 's7-l2',
        sectorId: 'sector-7',
        stageNumber: 2,
        title: 'Interstellar Directive',
        subtitle: 'Deep Space Mission Briefing',
        description: 'Complex technical and astronomical language under high cognitive and speed load.',
        targetKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ',', '.', ';', ':', ' '],
        sampleText: 'Gravity is the cosmic architect of our universe; it binds stellar clusters, collapses dying stars into neutron remnants, and sculpts the spiral arms of distant galaxies.',
        difficulty: 'Expert',
        targetWpm: 50,
        starThresholds: {
          oneStarAccuracy: 89,
          twoStarWpm: 50,
          twoStarAccuracy: 95,
          threeStarWpm: 70,
          threeStarAccuracy: 98,
          threeStarMinStreak: 45
        }
      },
      {
        id: 's7-l3',
        sectorId: 'sector-7',
        stageNumber: 3,
        title: 'Warp Corridor Flight',
        subtitle: 'Sustained 60+ WPM Mastery',
        description: 'Pure speed trial. Push your cadence into supersonic territory with flawless composure.',
        targetKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', ',', '.', ' '],
        sampleText: 'We choose to go to the moon and do the other things, not because they are easy, but because they are hard, because that goal will serve to organize and measure the best of our energies and skills.',
        difficulty: 'Expert',
        targetWpm: 60,
        starThresholds: {
          oneStarAccuracy: 90,
          twoStarWpm: 60,
          twoStarAccuracy: 96,
          threeStarWpm: 80,
          threeStarAccuracy: 98,
          threeStarMinStreak: 50
        }
      },
      {
        id: 's7-l4',
        sectorId: 'sector-7',
        stageNumber: 4,
        title: 'Cosmic Grandmaster Trial',
        subtitle: 'The Ultimate Touch Typing Test',
        description: 'The final certification of AstroType Academy. Perfect technique, zero looking down, pure flow.',
        targetKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '!', '?', ',', '.', ' '],
        sampleText: 'The cosmos is within us. We are made of star-stuff. We are a way for the cosmos to know itself. 100 billion galaxies, each with 100 billion stars: our journey has only just begun!',
        difficulty: 'Expert',
        targetWpm: 65,
        starThresholds: {
          oneStarAccuracy: 92,
          twoStarWpm: 65,
          twoStarAccuracy: 97,
          threeStarWpm: 85,
          threeStarAccuracy: 99,
          threeStarMinStreak: 60
        }
      }
    ]
  }
];

export function getStageById(stageId: string): Stage | undefined {
  for (const sector of CURRICULUM_SECTORS) {
    const stage = sector.stages.find(s => s.id === stageId);
    if (stage) return stage;
  }
  return undefined;
}

export function getNextStage(currentStageId: string): Stage | undefined {
  let found = false;
  for (const sector of CURRICULUM_SECTORS) {
    for (const stage of sector.stages) {
      if (found) return stage;
      if (stage.id === currentStageId) {
        found = true;
      }
    }
  }
  return undefined;
}
