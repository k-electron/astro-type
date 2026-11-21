/**
 * What the Hangar sells: Upgrades (levels, each with a price) and Cosmetics
 * (six kinds: Trails, Sound Kits, Bursts, Backdrops, Ships and Hulls, each
 * bought once and equipped for free).
 * One entry has everything about an item: its kind, its prices and how it is
 * presented. The Hangar, the header's Sound Kit picker and the Action Deck's trail
 * colour all read it, and `buy` looks prices up here, so no caller passes one.
 *
 * Where an item lives in the Save is the Profile's business (`./profile`).
 * Nothing in this module's imports touches React: an icon or a tone is a name
 * that the screen draws.
 */
import type {
  BackdropId,
  BurstId,
  HullId,
  ShipId,
  ShipUpgrades,
  SoundKit,
  TrailId,
} from './schemas';

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

/** The Trail a new Save equips and owns. */
export const DEFAULT_TRAIL: TrailId = 'CYAN';

/** The Sound Kit, Burst, Backdrop, Ship and Hull a new Save equips and owns. */
export const DEFAULT_SOUND_KIT: SoundKit = 'CYBER_SYNTH';
export const DEFAULT_BURST: BurstId = 'SPARKS';
export const DEFAULT_BACKDROP: BackdropId = 'STARFIELD';
export const DEFAULT_SHIP: ShipId = 'INTERCEPTOR';
export const DEFAULT_HULL: HullId = 'STANDARD';

export interface TrailEntry {
  kind: 'trail';
  id: TrailId;
  name: string;
  /** As the Hangar describes it. */
  description: string;
  price: number;
  /** The colour of the laser trail. */
  color: string;
  /** A trail that changes colour with every hit, round the spectrum from `color`. */
  spectrum?: true;
}

export interface SoundKitEntry {
  kind: 'soundKit';
  id: SoundKit;
  /** As the Hangar names it. */
  name: string;
  /** As the Hangar describes it. */
  description: string;
  /** As the header's Sound Kit picker names it. */
  shortName: string;
  /** What it sounds like, as the header's Sound Kit picker says. */
  character: string;
  price: number;
}

/** The style of the explosion on a hit. */
export interface BurstEntry {
  kind: 'burst';
  id: BurstId;
  name: string;
  description: string;
  price: number;
}

/** The space behind the Flight Deck. */
export interface BackdropEntry {
  kind: 'backdrop';
  id: BackdropId;
  name: string;
  description: string;
  price: number;
}

/** The shape of the small ship at the Strike Line. */
export interface ShipEntry {
  kind: 'ship';
  id: ShipId;
  name: string;
  description: string;
  price: number;
}

/** The border and body of the Drones. */
export interface HullEntry {
  kind: 'hull';
  id: HullId;
  name: string;
  description: string;
  price: number;
}

/** What a Cosmetic of any kind has: bought once, then equipped for free. */
export type CosmeticEntry =
  | TrailEntry
  | SoundKitEntry
  | BurstEntry
  | BackdropEntry
  | ShipEntry
  | HullEntry;
export type CosmeticKind = CosmeticEntry['kind'];

export type CatalogEntry = UpgradeEntry | CosmeticEntry;
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
    field: 'overdriveReactor',
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
    description: 'Widens the Perfect window at the Strike Line.',
    icon: 'sparkles',
    tone: 'emerald',
    prices: [200, 500, 950],
  },
  {
    kind: 'trail',
    id: 'CYAN',
    name: 'Cyan Nebula',
    description: 'Cool cyan lasers. The default trail.',
    price: 0,
    color: '#06b6d4',
  },
  {
    kind: 'trail',
    id: 'AMBER',
    name: 'Solar Flare',
    description: 'Hot amber lasers.',
    price: 350,
    color: '#f59e0b',
  },
  {
    kind: 'trail',
    id: 'EMERALD',
    name: 'Ion Emerald',
    description: 'Bright emerald lasers.',
    price: 450,
    color: '#10b981',
  },
  {
    kind: 'trail',
    id: 'VIOLET',
    name: 'Pulsar Violet',
    description: 'Deep violet lasers.',
    price: 600,
    color: '#8b5cf6',
  },
  {
    kind: 'trail',
    id: 'SUPERNOVA',
    name: 'Supernova Prism',
    description: 'Rose-red lasers, like a star going nova.',
    price: 900,
    color: '#f43f5e',
  },
  {
    kind: 'trail',
    id: 'TEAL',
    name: 'Aurora Teal',
    description: 'Pale teal lasers, the green of a polar sky.',
    price: 1400,
    color: '#2dd4bf',
  },
  {
    kind: 'trail',
    id: 'GOLD',
    name: 'Solar Gold',
    description: 'Rich gold lasers.',
    price: 2200,
    color: '#facc15',
  },
  {
    kind: 'trail',
    id: 'SPECTRUM',
    name: 'Quasar Spectrum',
    description:
      'Lasers that step through the colours of the spectrum, one hit at a time.',
    price: 3200,
    color: '#e879f9',
    spectrum: true,
  },
  {
    kind: 'soundKit',
    id: 'CYBER_SYNTH',
    name: 'Cyber Synth (Default)',
    description: 'Harmonic dual-oscillator space synth',
    price: 0,
    shortName: 'Cyber Synth',
    character: 'Sine Chime',
  },
  {
    kind: 'soundKit',
    id: 'RETRO_8BIT',
    name: '8-Bit Retro Arcade',
    description: 'Classic chiptune square wave blasters',
    price: 300,
    shortName: 'Retro 8-Bit',
    character: 'Arcade Pulse',
  },
  {
    kind: 'soundKit',
    id: 'DEEP_SPACE',
    name: 'Deep Space Beats',
    description: 'Smooth sine-wave bass resonant chimes',
    price: 450,
    shortName: 'Deep Space',
    character: 'Warm Sub',
  },
  {
    kind: 'soundKit',
    id: 'NEO_ACOUSTIC',
    name: 'Neo Acoustic Harp',
    description: 'Warm triangular bells and melodic tones',
    price: 600,
    shortName: 'Neo Acoustic',
    character: 'Kalimba',
  },
  {
    kind: 'soundKit',
    id: 'ORBITAL_CHOIR',
    name: 'Orbital Choir',
    description: 'Soft layered voices that swell with each hit',
    price: 1800,
    shortName: 'Orbital Choir',
    character: 'Vocal Pad',
  },
  {
    kind: 'soundKit',
    id: 'PULSE_DRUMS',
    name: 'Pulse Drums',
    description: 'Punchy electronic drums that keep the beat',
    price: 2600,
    shortName: 'Pulse Drums',
    character: 'Drum Hit',
  },
  {
    kind: 'burst',
    id: 'SPARKS',
    name: 'Sparks',
    description: 'Bright sparks fly out of a hit. The default burst.',
    price: 0,
  },
  {
    kind: 'burst',
    id: 'STARFLOWER',
    name: 'Starflower',
    description: 'A hit blooms into a ring of petals.',
    price: 600,
  },
  {
    kind: 'burst',
    id: 'PIXEL_SHARDS',
    name: 'Pixel Shards',
    description: 'A hit breaks into square pixel shards.',
    price: 1600,
  },
  {
    kind: 'burst',
    id: 'SHOCKWAVE',
    name: 'Shockwave Rings',
    description: 'A hit sends out expanding rings.',
    price: 3000,
  },
  {
    kind: 'backdrop',
    id: 'STARFIELD',
    name: 'Starfield',
    description: 'Drifting stars. The default backdrop.',
    price: 0,
  },
  {
    kind: 'backdrop',
    id: 'NEBULA',
    name: 'Nebula',
    description: 'Soft clouds of colour among the stars.',
    price: 800,
  },
  {
    kind: 'backdrop',
    id: 'AURORA',
    name: 'Aurora',
    description: 'Slow ribbons of light across the sky.',
    price: 2000,
  },
  {
    kind: 'backdrop',
    id: 'DEEP_VOID',
    name: 'Deep Void',
    description: 'Almost nothing: dark space and a few far stars.',
    price: 3500,
  },
  {
    kind: 'ship',
    id: 'INTERCEPTOR',
    name: 'Interceptor',
    description: 'The standard starfighter. The default ship.',
    price: 0,
  },
  {
    kind: 'ship',
    id: 'DART',
    name: 'Dart',
    description: 'A slim, swept-back dart.',
    price: 700,
  },
  {
    kind: 'ship',
    id: 'MANTA',
    name: 'Manta',
    description: 'A wide, gliding manta.',
    price: 2400,
  },
  {
    kind: 'ship',
    id: 'CORVETTE',
    name: 'Corvette',
    description: 'A heavy twin-hulled corvette.',
    price: 4500,
  },
  {
    kind: 'hull',
    id: 'STANDARD',
    name: 'Standard',
    description: 'The usual Drone hull. The default hull.',
    price: 0,
  },
  {
    kind: 'hull',
    id: 'HEX',
    name: 'Hex',
    description: 'Hexagonal Drone bodies.',
    price: 900,
  },
  {
    kind: 'hull',
    id: 'PLATED',
    name: 'Plated',
    description: 'Armoured plates on every Drone.',
    price: 2400,
  },
  {
    kind: 'hull',
    id: 'CRYSTAL',
    name: 'Crystal',
    description: 'Faceted crystal Drones.',
    price: 3000,
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

/**
 * The colour of the lasers for the `hit`th hit of a Run: a Trail's colour, or,
 * for a spectrum Trail, one step further round the colour wheel each hit.
 */
export function laserColor(id: TrailId, hit: number): string {
  const entry = catalogEntry(id);
  if (entry.kind !== 'trail') throw new Error(`${id} is not a Trail`);
  if (!entry.spectrum) return entry.color;
  const hue = (300 + 50 * hit) % 360;
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** The colour of a Trail, for the lasers the Action Deck fires on each hit. */
export function trailColor(id: TrailId): string {
  const entry = catalogEntry(id);
  if (entry.kind !== 'trail') throw new Error(`${id} is not a Trail`);
  return entry.color;
}

/**
 * The most levels any Upgrade has: the length of its price list. Every
 * Upgrade has as many levels as the first (the catalog's test checks), and
 * the Save accepts no level above it.
 */
export const MAX_UPGRADE_LEVEL = entriesOf('upgrade')[0].prices.length;
