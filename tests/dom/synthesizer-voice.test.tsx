import { describe, expect, it } from 'vitest';
import { OWNS_RETRO_AUDIO_CORE, RETURNING_PLAYER } from '../shared/saves';
import { voiceName } from '../shared/screens';
import { renderGame, screen } from './harness';
import { OPEN_AUDIO_PANEL } from '../../src/screens/audioLabels';

// A Synthesizer Voice is a paid Cosmetic: the Hangar sells it, and the header's
// audio panel only equips the ones the player owns. The panel still lists all
// four, and shows the ones not owned locked with their Hangar price. (Once, a
// click in the panel equipped any voice for free.)
//
// RETURNING_PLAYER has 1,234 Credits and owns only Cyber Synth, so it could
// afford every other voice: a click that spent Credits would show.

/** The panel's voices, as the player reads them, with the Hangar price of each. */
const VOICES = {
  cyber: { name: voiceName('CYBER_SYNTH'), price: null },
  retro: { name: voiceName('RETRO_8BIT'), price: 300 },
  deep: { name: voiceName('DEEP_SPACE'), price: 450 },
  neo: { name: voiceName('NEO_ACOUSTIC'), price: 600 },
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
// with an "Active" button; the others read "Equip" or their price. (The Laser
// Theme above them has its own "Active" button, so take the last four.)
const hangarVoiceButtons = () =>
  screen
    .getAllByRole('button', { name: /^(Active|Equip|[\d,]+ Cr)$/ })
    .slice(-4);
const equippedVoiceIndex = () =>
  hangarVoiceButtons().findIndex((core) => core.textContent === 'Active');
const credits = (text: string) =>
  screen.getByRole('button', { name: new RegExp(`^${text}\\s*Cr$`) });

describe('the header lists every Synthesizer Voice', () => {
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
    const player = renderGame({ profile: OWNS_RETRO_AUDIO_CORE });
    player.click(OPEN_AUDIO_PANEL);

    expect(showsAPrice('retro')).toBe(false);
    expect(hasPrice('deep', 450)).toBe(true);
    expect(hasPrice('neo', 600)).toBe(true);
  });
});

describe('a Synthesizer Voice the player does not own', () => {
  it.each(UNOWNED_BY_RETURNING_PLAYER)(
    'cannot be equipped from the header: the %s voice stays unequipped and no Credits are spent',
    (which) => {
      const player = renderGame({ profile: RETURNING_PLAYER });
      player.click(OPEN_AUDIO_PANEL);

      player.click(VOICES[which].name);

      expect(credits('1,234')).toBeTruthy();
      player.click(OPEN_AUDIO_PANEL);
      player.openHeader('Hangar');
      expect(equippedVoiceIndex(), 'the equipped voice').toBe(0);
      // The Hangar still sells it.
      // (Trail colours cost the same, so look only at the voices' four.)
      const index = Object.keys(VOICES).indexOf(which);
      expect(hangarVoiceButtons()[index]?.textContent).toBe(
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
    expect(equippedVoiceIndex()).toBe(0);
  });
});

describe('a Synthesizer Voice the player owns', () => {
  it('is equipped from the header at no cost, and the Hangar shows it Active', () => {
    const player = renderGame({ profile: OWNS_RETRO_AUDIO_CORE });
    player.click(OPEN_AUDIO_PANEL);

    player.click(VOICES.retro.name);

    expect(credits('1,234')).toBeTruthy();
    player.click(OPEN_AUDIO_PANEL);
    player.openHeader('Hangar');
    expect(equippedVoiceIndex()).toBe(1);
  });
});

describe('buying a Synthesizer Voice in the Hangar', () => {
  it('lets the player switch to it and back from the header, with the price paid once', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Hangar');

    player.click('300 Cr');
    expect(credits('934')).toBeTruthy();
    expect(equippedVoiceIndex()).toBe(1);
    player.click(/^Back to /);

    player.click(OPEN_AUDIO_PANEL);
    expect(showsAPrice('retro')).toBe(false);
    player.click(VOICES.cyber.name);
    player.click(OPEN_AUDIO_PANEL);
    player.openHeader('Hangar');
    expect(equippedVoiceIndex()).toBe(0);
    player.click(/^Back to /);

    player.click(OPEN_AUDIO_PANEL);
    player.click(VOICES.retro.name);
    expect(credits('934')).toBeTruthy();
    player.click(OPEN_AUDIO_PANEL);
    player.openHeader('Hangar');
    expect(equippedVoiceIndex()).toBe(1);
  });
});
