import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  type CosmeticKind,
  DEFAULT_BACKDROP,
  DEFAULT_BURST,
  DEFAULT_HULL,
  DEFAULT_SHIP,
  DEFAULT_SOUND_KIT,
  DEFAULT_TRAIL,
  entriesOf,
} from './catalog';

// The Hangar's Cosmetics are priced to last the curriculum (ticket #135): the
// whole Hangar costs about 90 typical Runs, the first thing is affordable
// within a Run or two, and a kind's best-looking items are the dear ones. The
// numbers are the rules, so they are written out here.
const KINDS = {
  trail: DEFAULT_TRAIL,
  soundKit: DEFAULT_SOUND_KIT,
  burst: DEFAULT_BURST,
  backdrop: DEFAULT_BACKDROP,
  ship: DEFAULT_SHIP,
  hull: DEFAULT_HULL,
} as const satisfies Record<CosmeticKind, string>;
const KIND_NAMES = Object.keys(KINDS) as CosmeticKind[];

describe('the catalog of Cosmetics', () => {
  it.each(KIND_NAMES)(
    'has exactly one free %s, the default, and every other costs Credits',
    (kind) => {
      const entries = entriesOf(kind);
      const free = entries.filter((entry) => entry.price === 0);

      expect(free.map((entry) => entry.id)).toEqual([KINDS[kind]]);
      for (const entry of entries) {
        if (entry.id !== KINDS[kind]) {
          expect(entry.price, entry.name).toBeGreaterThan(0);
        }
      }
    },
  );

  it.each(KIND_NAMES)(
    'lists the %s from the free default up, each dearer than the one before',
    (kind) => {
      const prices = entriesOf(kind).map((entry) => entry.price);

      expect(prices[0]).toBe(0);
      for (let index = 1; index < prices.length; index++) {
        expect(prices[index], `item ${index + 1}`).toBeGreaterThan(
          prices[index - 1],
        );
      }
    },
  );

  it('sells only Cosmetics: every item in the catalog belongs to one of the six kinds', () => {
    const ofAKind = KIND_NAMES.flatMap((kind) => entriesOf(kind));

    expect(ofAKind).toHaveLength(CATALOG.length);
  });

  it('costs 35,000 to 45,000 Credits for the whole Hangar, about 90 typical Runs', () => {
    const total = KIND_NAMES.flatMap((kind) => entriesOf(kind)).reduce(
      (sum, entry) => sum + entry.price,
      0,
    );

    expect(total).toBeGreaterThanOrEqual(35_000);
    expect(total).toBeLessThanOrEqual(45_000);
  });

  it('puts the cheapest thing to buy at 300 to 500 Credits, within a Run or two', () => {
    const paid = KIND_NAMES.flatMap((kind) => entriesOf(kind)).filter(
      (entry) => entry.price > 0,
    );

    const cheapest = Math.min(...paid.map((entry) => entry.price));

    expect(cheapest).toBeGreaterThanOrEqual(300);
    expect(cheapest).toBeLessThanOrEqual(500);
  });

  it('gives every item an id of its own across the whole catalog, and a name and description to show', () => {
    const ids = CATALOG.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const kind of KIND_NAMES) {
      for (const entry of entriesOf(kind)) {
        expect(entry.name.trim(), `${entry.id} name`).not.toBe('');
        expect(entry.description.trim(), `${entry.id} description`).not.toBe(
          '',
        );
      }
    }
  });
});
