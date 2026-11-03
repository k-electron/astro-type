/** The titles of Analytics' two confirms: the name each one's dialog carries. */
export const WIPE_STARS_TITLE = 'Wipe Curriculum Achievements?';
export const FACTORY_RESET_TITLE = 'Full Starship Factory Reset?';

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** What the Wipe Stars confirm says: the Stars and cleared Stages it takes, and what stays. */
export const wipeStarsMessage = (stars: number, clearedStages: number) =>
  `This wipes your ${count(stars, 'Star', 'Stars')} and resets ${count(clearedStages, 'cleared Stage', 'cleared Stages')}, so you can play the Sectors from the start. Your Credits, Upgrades and Cosmetics stay.`;

/** What the Factory Reset confirm says. */
export const FACTORY_RESET_MESSAGE =
  'This will irreversibly wipe ALL starship progress: Stars, Credits, Upgrades, per-key Analytics, Trails and Sound Kits.';
