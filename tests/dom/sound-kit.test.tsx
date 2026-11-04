import { describe, expect, it } from 'vitest';
import {
  OWNS_RETRO_SOUND_KIT,
  RETURNING_PLAYER,
  trailEquipped,
} from '../shared/saves';
import { soundKitName } from '../shared/screens';
import { renderGame, screen, within } from './harness';
import { OPEN_AUDIO_PANEL } from '../../src/screens/audioLabels';
import { EQUIP, EQUIPPED } from '../../src/screens/hangarLabels';

// A Sound Kit is a paid Cosmetic: the Hangar sells it, and the header's
// audio panel only equips the ones the player owns. The panel still lists all
// four, and shows the ones not owned locked with their Hangar price. (Once, a
// click in the panel equipped any Sound Kit for free.)
//
// RETURNING_PLAYER has 1,234 Credits and owns only Cyber Synth, so it could
// afford every other Sound Kit: a click that spent Credits would show.

/** The panel's Sound Kits, as the player reads them, with the Hangar price of each. */
const VOICES = {
  cyber: { name: soundKitName('CYBER_SYNTH'), price: null },
  retro: { name: soundKitName('RETRO_8BIT'), price: 300 },
  deep: { name: soundKitName('DEEP_SPACE'), price: 450 },
  neo: { name: soundKitName('NEO_ACOUSTIC'), price: 600 },
} as const;
const UNOWNED_BY_RETURNING_PLAYER = ['retro', 'deep', 'neo'] as const;

const voice = (which: keyof typeof VOICES) =>
  screen.getByRole('button', { name: VOICES[which].name });
const hasPrice = (which: keyof typeof VOICES, price: number) =>
  new RegExp(`\\b${price}\\b`).test(voice(which).textContent ?? '');
// Every price is three digits or more; "8-Bit" in a voice's name is not one.
const showsAPrice = (which: keyof typeof VOICES) =>
  /\d{3}/.test(voice(which).textContent ?? '');

// The Hangar lists the voices in the panel's order and marks the equipped one
// with an Equipped button; the others read Equip or their price. (The Trails
// above them have Equipped and Equip buttons too, so take the last four.)
const hangarKitButtons = () =>
  screen
    .getAllByRole('button', {
      name: new RegExp(`^(${EQUIPPED}|${EQUIP}|[\\d,]+ Cr)$`),
    })
    .slice(-4);
const equippedKitIndex = () =>
  hangarKitButtons().findIndex((core) => core.textContent === EQUIPPED);
const credits = (text: string) =>
  screen.getByRole('button', { name: new RegExp(`^${text}\\s*Cr$`) });

describe('the header lists every Sound Kit', () => {
  it('shows the ones the player does not own locked, with their Hangar price', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click(OPEN_AUDIO_PANEL);

    expect(voice('cyber')).toBeTruthy();
    expect(showsAPrice('cyber')).toBe(false);
    for (const which of UNOWNED_BY_RETURNING_PLAYER) {
      const { price } = VOICES[which];
      expect(hasPrice(which, price), `${which} shows ${price}`).toBe(true);
    }
  });

  it('shows a voice without a price once it is owned, and keeps the others priced', () => {
    const player = renderGame({ profile: OWNS_RETRO_SOUND_KIT });
    player.click(OPEN_AUDIO_PANEL);

    expect(showsAPrice('retro')).toBe(false);
    expect(hasPrice('deep', 450)).toBe(true);
    expect(hasPrice('neo', 600)).toBe(true);
  });
});

describe('a Sound Kit the player does not own', () => {
  it.each(UNOWNED_BY_RETURNING_PLAYER)(
    'cannot be equipped from the header: the %s voice stays unequipped and no Credits are spent',
    (which) => {
      const player = renderGame({ profile: RETURNING_PLAYER });
      player.click(OPEN_AUDIO_PANEL);

      player.click(VOICES[which].name);

      expect(credits('1,234')).toBeTruthy();
      player.click(OPEN_AUDIO_PANEL);
      player.openHeader('Hangar');
      expect(equippedKitIndex(), 'the equipped voice').toBe(0);
      // The Hangar still sells it.
      // (Trail colours cost the same, so look only at the voices' four.)
      const index = Object.keys(VOICES).indexOf(which);
      expect(hangarKitButtons()[index]?.textContent).toBe(
        `${VOICES[which].price} Cr`,
      );
    },
  );

  it('stays locked after a reload', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click(OPEN_AUDIO_PANEL);
    player.click(VOICES.deep.name);

    player.reload();
    player.click(OPEN_AUDIO_PANEL);

    expect(hasPrice('deep', 450)).toBe(true);
    player.click(OPEN_AUDIO_PANEL);
    player.openHeader('Hangar');
    expect(equippedKitIndex()).toBe(0);
  });
});

describe('a Sound Kit the player owns', () => {
  it('is equipped from the header at no cost, and the Hangar shows it Equipped', () => {
    const player = renderGame({ profile: OWNS_RETRO_SOUND_KIT });
    player.click(OPEN_AUDIO_PANEL);

    player.click(VOICES.retro.name);

    expect(credits('1,234')).toBeTruthy();
    player.click(OPEN_AUDIO_PANEL);
    player.openHeader('Hangar');
    expect(equippedKitIndex()).toBe(1);
  });
});

describe('buying a Sound Kit in the Hangar', () => {
  it('lets the player switch to it and back from the header, with the price paid once', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Hangar');

    player.click('300 Cr');
    expect(credits('934')).toBeTruthy();
    expect(equippedKitIndex()).toBe(1);
    player.click(/^Back to /);

    player.click(OPEN_AUDIO_PANEL);
    expect(showsAPrice('retro')).toBe(false);
    player.click(VOICES.cyber.name);
    player.click(OPEN_AUDIO_PANEL);
    player.openHeader('Hangar');
    expect(equippedKitIndex()).toBe(0);
    player.click(/^Back to /);

    player.click(OPEN_AUDIO_PANEL);
    player.click(VOICES.retro.name);
    expect(credits('934')).toBeTruthy();
    player.click(OPEN_AUDIO_PANEL);
    player.openHeader('Hangar');
    expect(equippedKitIndex()).toBe(1);
  });
});

// The Hangar marks what is equipped, on a Trail and on a Sound Kit alike, with
// a "✓ EQUIPPED" badge on the card and a disabled Equipped button: choosing it
// again would do nothing, so it is not offered. Both words come from
// `src/screens/hangarLabels.ts`. (The badge shows the same word in capitals, so
// its text is the word itself; the check mark is an icon, which only the
// play-check sees.)

/**
 * The Cosmetic card a button belongs to: the nearest ancestor that holds no
 * other button (a card has one button; the grid of cards has many).
 */
const cardOf = (button: HTMLElement): HTMLElement => {
  let card = button;
  while (card.parentElement?.querySelectorAll('button').length === 1) {
    card = card.parentElement;
  }
  return card;
};
/** The corner badges on a card: the word outside any button. */
const badgesIn = (card: HTMLElement) =>
  within(card).queryAllByText(EQUIPPED, { ignore: 'button, script, style' });
const equippedButtons = () =>
  screen.getAllByRole('button', { name: EQUIPPED }) as HTMLButtonElement[];

describe('the Hangar, for a Cosmetic that is already equipped', () => {
  it('shows the badge and a disabled Equipped button on the equipped Trail and the equipped Sound Kit', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Hangar');

    const buttons = equippedButtons();

    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
      expect(badgesIn(cardOf(button))).toHaveLength(1);
    }
  });

  it('offers Equip, and no badge, on an owned Trail that is not equipped', () => {
    const player = renderGame({
      profile: { ...RETURNING_PLAYER, ...trailEquipped('AMBER') },
    });
    player.openHeader('Hangar');

    const equip = screen.getByRole('button', { name: EQUIP });

    expect((equip as HTMLButtonElement).disabled).toBe(false);
    expect(badgesIn(cardOf(equip))).toHaveLength(0);
    // The Trail the player equipped has the badge now: one Trail, one Sound Kit.
    expect(equippedButtons()).toHaveLength(2);
  });

  it('offers Equip, and no badge, on an owned Sound Kit; equipping it moves the badge and Equipped onto it for free', () => {
    const player = renderGame({ profile: OWNS_RETRO_SOUND_KIT });
    player.openHeader('Hangar');
    const equip = screen.getByRole('button', { name: EQUIP });
    expect((equip as HTMLButtonElement).disabled).toBe(false);
    expect(badgesIn(cardOf(equip))).toHaveLength(0);

    player.click(EQUIP);

    expect(equippedKitIndex()).toBe(1);
    const nowEquipped = hangarKitButtons()[1] as HTMLButtonElement;
    expect(nowEquipped.disabled).toBe(true);
    expect(badgesIn(cardOf(nowEquipped))).toHaveLength(1);
    expect(badgesIn(cardOf(hangarKitButtons()[0] as HTMLElement))).toHaveLength(
      0,
    );
    expect(credits('1,234')).toBeTruthy();
  });
});
