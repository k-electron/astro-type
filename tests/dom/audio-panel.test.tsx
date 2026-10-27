import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE } from '../../src/game/profile';
import { OWNS_EVERY_AUDIO_CORE, RETURNING_PLAYER } from '../shared/saves';
import { type Player, renderGame, screen } from './harness';

// The header's audio controls: Mute All Audio, and the panel its settings
// button opens (volume for the laser sounds and for the rhythm beats, each
// with its own mute, and the Synthesizer core). A player reads the change on
// screen, and finds it still there after a reload. Which beat theme is chosen
// shows only as the button's colour, so it has no test here.

// RETURNING_PLAYER sets no volumes, so the panel shows the defaults.
const DEFAULT_SOUND = DEFAULT_PROFILE.soundVolume;
const DEFAULT_MUSIC = DEFAULT_PROFILE.musicVolume;

const OPEN_PANEL = 'Open Audio Flight Deck Settings';

// The panel's two volume sliders, in the order it lays them out: the laser
// sounds, then the rhythm beats. They have no names of their own.
const volumes = () => {
  const [sound, music] = screen.getAllByRole('slider') as HTMLInputElement[];
  return { sound: Number(sound.value), music: Number(music.value) };
};
const setVolume = (which: 'sound' | 'music', value: number) => {
  const sliders = screen.getAllByRole('slider');
  fireEvent.change(sliders[which === 'sound' ? 0 : 1], {
    target: { value: String(value) },
  });
};

const reloadAndOpenPanel = (player: Player) => {
  player.reload();
  player.click(OPEN_PANEL);
};

describe('Mute All Audio', () => {
  it('mutes from the header, shows Muted in the panel, and Unmute brings the volumes back', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click(OPEN_PANEL);
    expect(volumes()).toEqual({ sound: DEFAULT_SOUND, music: DEFAULT_MUSIC });

    player.click('Mute All Audio');

    expect(
      screen.getByRole('button', { name: 'Unmute All Audio' }),
    ).toBeTruthy();
    expect(screen.getByText('Muted')).toBeTruthy();
    expect(volumes()).toEqual({ sound: 0, music: 0 });

    player.click('Unmute');

    expect(screen.getByRole('button', { name: 'Mute All Audio' })).toBeTruthy();
    expect(screen.queryByText('Muted')).toBeNull();
    expect(volumes()).toEqual({ sound: DEFAULT_SOUND, music: DEFAULT_MUSIC });
  });

  it('stays muted after a reload', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click('Mute All Audio');

    reloadAndOpenPanel(player);

    expect(
      screen.getByRole('button', { name: 'Unmute All Audio' }),
    ).toBeTruthy();
    expect(screen.getByText('Muted')).toBeTruthy();
  });

  it('works from a Galaxy Map that is open over the Flight Deck', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click('Start Mission');
    player.openHeader('Sectors');

    player.click('Mute All Audio');
    expect(
      screen.getByRole('button', { name: 'Unmute All Audio' }),
    ).toBeTruthy();
    player.click(OPEN_PANEL);
    expect(screen.getByText('Muted')).toBeTruthy();
  });
});

describe('the audio panel', () => {
  it('opens and closes with its settings button', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    expect(screen.queryAllByRole('slider')).toHaveLength(0);

    player.click(OPEN_PANEL);
    expect(screen.getAllByRole('slider')).toHaveLength(2);

    player.click(OPEN_PANEL);
    expect(screen.queryAllByRole('slider')).toHaveLength(0);
  });

  it('turns the laser sounds off and on, and a change of volume shows in the slider', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click(OPEN_PANEL);

    player.click('Mute Laser SFX');
    expect(volumes().sound).toBe(0);
    player.click('Enable Laser SFX');
    expect(volumes().sound).toBe(DEFAULT_SOUND);

    setVolume('sound', 0.2);
    expect(volumes().sound).toBe(0.2);
    expect(volumes().music).toBe(DEFAULT_MUSIC);
  });

  it('turns the rhythm beats off and on, and a change of volume shows in the slider', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click(OPEN_PANEL);

    player.click('Mute Rhythm Beats');
    expect(volumes().music).toBe(0);
    player.click('Enable Rhythm Beats');
    expect(volumes().music).toBe(DEFAULT_MUSIC);

    setVolume('music', 0.9);
    expect(volumes().music).toBe(0.9);
    expect(volumes().sound).toBe(DEFAULT_SOUND);
  });

  it('keeps the volumes after a reload', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click(OPEN_PANEL);
    setVolume('sound', 0.2);
    setVolume('music', 0.9);

    reloadAndOpenPanel(player);

    expect(volumes()).toEqual({ sound: 0.2, music: 0.9 });
  });

  it('keeps the laser sounds and the beats turned off after a reload', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click(OPEN_PANEL);
    player.click('Mute Laser SFX');
    player.click('Mute Rhythm Beats');

    reloadAndOpenPanel(player);

    expect(
      screen.getByRole('button', { name: 'Enable Laser SFX' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Enable Rhythm Beats' }),
    ).toBeTruthy();
  });
});

describe('picking a Synthesizer core in the panel', () => {
  // The Hangar lists the cores in the panel's order and marks the equipped one
  // with an "Active" button; the others read "Equip". (The Laser Theme above
  // them has its own "Active" button, so take the last four.)
  const equippedCoreIndex = () => {
    const cores = screen
      .getAllByRole('button', { name: /^(Active|Equip)$/ })
      .slice(-4);
    return cores.findIndex((core) => core.textContent === 'Active');
  };

  it('equips it, as the Hangar shows, and it is still equipped after a reload', () => {
    const player = renderGame({ profile: OWNS_EVERY_AUDIO_CORE });
    player.openHeader('Hangar');
    expect(equippedCoreIndex()).toBe(0);
    player.click(/^Back to /);

    player.click(OPEN_PANEL);
    // The panel's cores are buttons named for the voice and its sound.
    player.click(/Retro 8-Bit/);
    player.click(OPEN_PANEL);
    player.openHeader('Hangar');
    expect(equippedCoreIndex()).toBe(1);

    player.reload();
    player.openHeader('Hangar');
    expect(equippedCoreIndex()).toBe(1);
  });
});
