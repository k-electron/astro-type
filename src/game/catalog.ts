/**
 * What the Hangar sells: Upgrades (levels, each with a price) and Cosmetics
 * (trail colours and Synthesizer Voices, bought once and equipped for free).
 * One entry has everything about an item: its kind, its prices and how it is
 * presented. The Hangar, the header's voice picker and the Action Deck's trail
 * colour all read it, and `buy` looks prices up here, so no caller passes one.
 *
 * Where an item lives in the Save is the Profile's business (`./profile`).
 * Nothing in this module's imports touches React: an icon or a tone is a name
 * that the screen draws.
 */
import type {
  AudioSynthCore,
  ShipUpgrades,
  TrailColorTheme,
} from '../store/schemas';

/** The Upgrades' ids, as `buy` takes them. */
export type UpgradeId = 'shields' | 'reactor' | 'sensors';

/** The Profile fields that hold an Upgrade's level: the numbers among its upgrades. */
export type UpgradeLevelField = {
  [Field in keyof ShipUpgrades]: ShipUpgrades[Field] extends number
    ? Field
    : never;
}[keyof ShipUpgrades];

/** The Hangar's icons for an Upgrade, by name. */
export type UpgradeIcon = 'shield' | 'zap' | 'sparkles';

/** The colour family of an Upgrade's card, by name. */
export type UpgradeTone = 'cyan' | 'amber' | 'emerald';

export interface UpgradeEntry {
  kind: 'upgrade';
  id: UpgradeId;
  /** The Profile field that holds its level. */
  field: UpgradeLevelField;
  name: string;
  description: string;
  icon: UpgradeIcon;
  tone: UpgradeTone;
  /** What each level costs, in order: level 1 first. Its length is the number of levels. */
  prices: readonly number[];
}

export interface TrailEntry {
  kind: 'trail';
  id: TrailColorTheme;
  name: string;
  price: number;
  /** The colour of the laser trail, and of the Action Deck's beam. */
  color: string;
}

export interface CoreEntry {
  kind: 'core';
  id: AudioSynthCore;
  /** As the Hangar names it. */
  name: string;
  /** As the Hangar describes it. */
  description: string;
  /** As the header's voice picker names it. */
  shortName: string;
  /** What it sounds like, as the header's voice picker says. */
  character: string;
  price: number;
}

export type CatalogEntry = UpgradeEntry | TrailEntry | CoreEntry;
export type CatalogKind = CatalogEntry['kind'];
export type CatalogItemId = CatalogEntry['id'];

export const CATALOG: readonly CatalogEntry[] = [
  {
    kind: 'upgrade',
    id: 'shields',
    field: 'deflectorShields',
    name: 'Deflector Shields',
    description:
      'Absorbs typing error keystrokes without breaking your Streak or Multiplier.',
    icon: 'shield',
    tone: 'cyan',
    prices: [250, 650, 1200],
  },
  {
    kind: 'upgrade',
    id: 'reactor',
    field: 'hyperdriveReactor',
    name: 'Overdrive Reactor',
    description:
      'Speeds up how fast the Overdrive meter fills, so Overdrive starts sooner.',
    icon: 'zap',
    tone: 'amber',
    prices: [300, 750, 1400],
  },
  {
    kind: 'upgrade',
    id: 'sensors',
    field: 'precisionSensors',
    name: 'Precision Sensors',
    description:
      'Expands the rhythm highway strike timing window for PERFECT score multipliers.',
    icon: 'sparkles',
    tone: 'emerald',
    prices: [200, 500, 950],
  },
  {
    kind: 'trail',
    id: 'CYAN',
    name: 'Cyan Nebula',
    price: 0,
    color: '#06b6d4',
  },
  {
    kind: 'trail',
    id: 'AMBER',
    name: 'Solar Flare',
    price: 350,
    color: '#f59e0b',
  },
  {
    kind: 'trail',
    id: 'EMERALD',
    name: 'Ion Emerald',
    price: 450,
    color: '#10b981',
  },
  {
    kind: 'trail',
    id: 'VIOLET',
    name: 'Pulsar Violet',
    price: 600,
    color: '#8b5cf6',
  },
  {
    kind: 'trail',
    id: 'SUPERNOVA',
    name: 'Supernova Prism',
    price: 900,
    color: '#f43f5e',
  },
  {
    kind: 'core',
    id: 'CYBER_SYNTH',
    name: 'Cyber Synth (Default)',
    description: 'Harmonic dual-oscillator space synth',
    shortName: 'Cyber Synth',
    character: 'Sine Chime',
    price: 0,
  },
  {
    kind: 'core',
    id: 'RETRO_8BIT',
    name: '8-Bit Retro Arcade',
    description: 'Classic chiptune square wave blasters',
    shortName: 'Retro 8-Bit',
    character: 'Arcade Pulse',
    price: 300,
  },
  {
    kind: 'core',
    id: 'DEEP_SPACE',
    name: 'Deep Space Drone',
    description: 'Smooth sine-wave bass resonant chimes',
    shortName: 'Deep Space',
    character: 'Warm Sub',
    price: 450,
  },
  {
    kind: 'core',
    id: 'NEO_ACOUSTIC',
    name: 'Neo Acoustic Harp',
    description: 'Warm triangular bells and melodic tones',
    shortName: 'Neo Acoustic',
    character: 'Kalimba',
    price: 600,
  },
];

/** The entry for an item. Every id of the types above has one. */
export function catalogEntry(id: CatalogItemId): CatalogEntry {
  const entry = CATALOG.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`No catalog entry for ${id}`);
  return entry;
}

/** Every entry of one kind, in the order the Hangar lists them. */
export function entriesOf<Kind extends CatalogKind>(
  kind: Kind,
): Extract<CatalogEntry, { kind: Kind }>[] {
  return CATALOG.filter(
    (entry): entry is Extract<CatalogEntry, { kind: Kind }> =>
      entry.kind === kind,
  );
}

/** The colour of a trail, for the Action Deck's beam. */
export function trailColor(theme: TrailColorTheme): string {
  const entry = catalogEntry(theme);
  if (entry.kind !== 'trail') throw new Error(`${theme} is not a trail colour`);
  return entry.color;
}
