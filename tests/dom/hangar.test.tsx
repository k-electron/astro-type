import { describe, expect, it } from 'vitest';
import { entriesOf, type CosmeticKind } from '../../src/game/catalog';
import { EQUIP, EQUIPPED } from '../../src/screens/hangarLabels';
import { cosmeticEquipped, RETURNING_PLAYER } from '../shared/saves';
import { COSMETIC_GROUP_HEADINGS } from '../shared/screens';
import { clickCosmetic, cosmeticButtons, renderGame, screen } from './harness';

// The Hangar sells six kinds of Cosmetic in a group each, with the card
// pattern the Trails always had: name, description, and a button that reads the
// price while the item is not owned, Equip when it is, Equipped when it is the
// one in use. (Ticket #135; the Sound Kit's other doors, the audio panel, are
// in sound-kit.test.tsx and audio-panel.test.tsx.)

/**
 * What the Hangar asks for each thing in a group, in Credits, in the order
 * shown. The first item of every group is the free default, which a new
 * player already wears. These prices are the rule, so they are written out.
 */
const PRICES: Record<CosmeticKind, number[]> = {
  trail: [350, 450, 600, 900, 1400, 2200, 3200],
  soundKit: [300, 450, 600, 1800, 2600],
  burst: [600, 1600, 3000],
  backdrop: [800, 2000, 3500],
  ship: [700, 2400, 4500],
  hull: [900, 2400, 3000],
};
const KINDS = Object.keys(PRICES) as CosmeticKind[];
/** The kinds the Hangar started selling in #135. */
const NEWER_KINDS = ['burst', 'backdrop', 'ship', 'hull'] as const;

const label = (price: number) => `${price} Cr`;
const labels = (kind: CosmeticKind) =>
  cosmeticButtons(kind).map((button) => button.textContent);
/** The header's Credits, as the player reads them. */
const credits = (amount: number) =>
  screen.getByRole('button', {
    name: new RegExp(`^${amount.toLocaleString('en-US')}\\s*Cr$`),
  });

describe('the Hangar’s groups of Cosmetics', () => {
  it('shows each kind in its own group, under its own heading', () => {
    renderGame().openHeader('Hangar');

    for (const heading of Object.values(COSMETIC_GROUP_HEADINGS)) {
      expect(
        screen.getByRole('heading', { name: heading, level: 3 }),
        heading,
      ).toBeTruthy();
    }
  });

  it.each(KINDS)(
    'a new player has the free default of the %s equipped and sees the price of every other',
    (kind) => {
      renderGame().openHeader('Hangar');

      expect(labels(kind)).toEqual([EQUIPPED, ...PRICES[kind].map(label)]);
    },
  );

  it.each(KINDS)('names and describes every %s on its card', (kind) => {
    renderGame().openHeader('Hangar');

    for (const entry of entriesOf(kind)) {
      expect(screen.getByText(entry.name), entry.name).toBeTruthy();
      expect(screen.getByText(entry.description), entry.id).toBeTruthy();
    }
  });
});

describe.each(NEWER_KINDS)('buying a %s from its card', (kind) => {
  const [price] = PRICES[kind];

  it('spends the Credits shown in the header and marks it Equipped, the free default now offering Equip', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Hangar');
    expect(credits(1234)).toBeTruthy();

    clickCosmetic(kind, 1);

    expect(credits(1234 - price)).toBeTruthy();
    expect(labels(kind).slice(0, 2)).toEqual([EQUIP, EQUIPPED]);
    expect(cosmeticButtons(kind)[1].disabled).toBe(true);
  });

  it('is still equipped after a reload, and the Credits stay spent', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Hangar');
    clickCosmetic(kind, 1);

    player.reload();
    player.openHeader('Hangar');

    expect(labels(kind).slice(0, 2)).toEqual([EQUIP, EQUIPPED]);
    expect(credits(1234 - price)).toBeTruthy();
  });

  it('cannot be bought one Credit short of its price', () => {
    renderGame({ profile: { totalCredits: price - 1 } }).openHeader('Hangar');
    expect(cosmeticButtons(kind)[1].disabled).toBe(true);
  });

  it('can be bought with exactly the price, which leaves no Credits', () => {
    const player = renderGame({ profile: { totalCredits: price } });
    player.openHeader('Hangar');
    expect(cosmeticButtons(kind)[1].disabled).toBe(false);

    clickCosmetic(kind, 1);

    expect(labels(kind).slice(0, 2)).toEqual([EQUIP, EQUIPPED]);
    expect(credits(0)).toBeTruthy();
  });

  it('is switched back to the free default, and on again, for free', () => {
    const [, item] = entriesOf(kind);
    const player = renderGame({
      profile: { ...RETURNING_PLAYER, ...cosmeticEquipped(kind, item.id) },
    });
    player.openHeader('Hangar');
    expect(labels(kind).slice(0, 2)).toEqual([EQUIP, EQUIPPED]);

    clickCosmetic(kind, 0);
    expect(labels(kind).slice(0, 2)).toEqual([EQUIPPED, EQUIP]);
    clickCosmetic(kind, 1);

    expect(labels(kind).slice(0, 2)).toEqual([EQUIP, EQUIPPED]);
    expect(credits(1234)).toBeTruthy();
  });
});
