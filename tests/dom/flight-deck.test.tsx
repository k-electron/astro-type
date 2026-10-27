import { describe, expect, it } from 'vitest';
import { multiplierAt } from '../shared/multiplier';
import { HUD_NAME } from '../shared/screens';
import { type Player, renderGame, screen, within } from './harness';

// The Flight Deck as the player reads it: the HUD, the text prompt and its
// progress, the Streak, the shield tag and the Overdrive badges. Everything is
// found by role, label or visible text.

// Six different letters, so each position in the prompt is easy to tell apart.
const TEXT = 'abcdef';

/** The HUD as one string: "Score0 Speed0WPM Accuracy100% Streak3 ...". */
const hudText = () =>
  screen.getByRole('region', { name: HUD_NAME }).textContent ?? '';

/** The HUD's Streak readout shows exactly this number. */
const expectStreak = (streak: number) =>
  expect(hudText()).toMatch(new RegExp(`Streak\\s*${streak}(?!\\d)`));

/** The HUD's Accuracy readout. It refreshes on the Run clock's 30-step tick. */
const expectAccuracy = (percent: number) =>
  expect(hudText()).toMatch(new RegExp(`Accuracy\\s*${percent}%`));

/** The "Progress" label on the text prompt, as the player reads it: "50%". */
const progress = () =>
  screen.getByRole('progressbar', { name: 'Progress' }).textContent;

/** The character the text prompt marks as the one to type next. */
const currentCharacters = () =>
  Array.from(
    screen
      .getByLabelText('Text prompt')
      .querySelectorAll('[aria-current="true"]'),
  ).map((element) => element.textContent);

/** The "x<n>" tags in the HUD: the Multiplier's, then the shields' if any. */
const hudTags = () =>
  within(screen.getByRole('region', { name: HUD_NAME }))
    .queryAllByText(/^x\d$/)
    .map((element) => element.textContent);

describe('the HUD and the text prompt', () => {
  it('is a labelled region with the score, speed, accuracy and Streak, and not the text', () => {
    renderGame({ text: TEXT });

    const region = screen.getByRole('region', { name: HUD_NAME });
    for (const label of ['Score', 'Speed', 'Accuracy', 'Streak']) {
      expect(within(region).getByText(label)).toBeTruthy();
    }
    expectAccuracy(100);
    // The text prompt is not part of the HUD.
    expect(region.textContent).not.toContain(TEXT);
  });

  it('has a labelled text prompt, with a progress that grows as the player types', () => {
    const player = renderGame({ text: TEXT });

    expect(screen.getByLabelText('Text prompt').textContent).toContain(TEXT);
    expect(progress()).toBe('0%');

    player.type('abc');
    expect(progress()).toBe('50%');
  });

  it('marks one current character, which moves on as the player types', () => {
    const player = renderGame({ text: TEXT });
    expect(currentCharacters()).toEqual(['a']);

    player.type('a');
    expect(currentCharacters()).toEqual(['b']);

    player.type('bc');
    expect(currentCharacters()).toEqual(['d']);
  });
});

describe('a Miss', () => {
  it('resets the Streak and lowers the Accuracy, and the character stays to be typed', () => {
    const player = renderGame({ text: TEXT });
    player.type('abc');
    expect(progress()).toBe('50%');
    expectStreak(3);
    expectAccuracy(100);

    // "z" is not the next character ("d"), nor anywhere in the text.
    player.press('z');

    expectStreak(0);
    expect(progress()).toBe('50%');
    expect(currentCharacters()).toEqual(['d']);
    // 3 right keys and 1 wrong one. The HUD refreshes this readout on a tick.
    player.step(30);
    expectAccuracy(75);

    // The right key carries on from there.
    player.press('d');
    expect(progress()).toBe('67%');
    expect(currentCharacters()).toEqual(['e']);
    expectStreak(1);
  });
});

/** A player who has bought two levels of Deflector Shields. */
const SHIELDED = { upgrades: { deflectorShields: 2 } };

describe('keys that type no character', () => {
  const IGNORED_KEYS: Array<[string, Parameters<Player['press']>]> = [
    ['Backspace', ['Backspace']],
    ['Enter', ['Enter']],
    ['ArrowLeft', ['ArrowLeft']],
    ['ArrowDown', ['ArrowDown']],
    ['F2', ['F2']],
    // "z" is wrong here, so a shortcut that was judged would be a Miss.
    ['Ctrl+z', ['z', { ctrlKey: true }]],
    ['Meta+z', ['z', { metaKey: true }]],
  ];

  it.each(IGNORED_KEYS)(
    '%s leaves the Streak, Accuracy and shields alone',
    (_name, key) => {
      const player = renderGame({ text: 'abcdefgh', profile: SHIELDED });
      expect(hudTags()).toEqual(['x1', 'x2']);
      player.type('abc');

      player.press(...key);

      // The next right key carries the Streak on from 3.
      player.press('d');
      expect(progress()).toBe('50%');
      expectStreak(4);
      player.step(30);
      expectAccuracy(100);
      expect(hudTags()).toEqual(['x1', 'x2']);
    },
  );
});

describe('the shield tag', () => {
  it('goes down by one when a wrong key is spent on a shield, and the Streak goes on', () => {
    const player = renderGame({ text: TEXT, profile: SHIELDED });
    player.type('abc');

    player.press('z');
    player.press('d');

    expect(progress()).toBe('67%');
    expect(hudTags()).toEqual(['x1', 'x1']);
    expectStreak(4);
  });

  it('goes down by one, not all of them, when a wrong key is held', () => {
    const player = renderGame({ text: TEXT, profile: SHIELDED });
    player.type('abc');

    player.press('z');
    for (let repeat = 0; repeat < 4; repeat++) {
      player.press('z', { repeat: true });
    }
    player.press('d');

    expect(progress()).toBe('67%');
    expect(hudTags()).toEqual(['x1', 'x1']);
    expectStreak(4);
  });
});

describe('a held key', () => {
  it('scores one hit and no Misses when it is the right key', () => {
    const player = renderGame({ text: TEXT });

    player.press('a');
    for (let repeat = 0; repeat < 5; repeat++) {
      player.press('a', { repeat: true });
    }

    // The next key. A hold that had piled up Misses would have reset the Streak.
    player.press('b');
    expect(progress()).toBe('33%');
    expectStreak(2);
    player.step(30);
    expectAccuracy(100);
  });

  it('scores no free hits on a repeated letter', () => {
    const player = renderGame({ text: 'aaaaab' });

    player.press('a');
    for (let repeat = 0; repeat < 5; repeat++) {
      player.press('a', { repeat: true });
    }

    // Only the first keydown typed a character.
    player.press('a');
    expect(progress()).toBe('33%');
    expectStreak(2);
  });
});

// Twenty rounds of different letters, so the Run is never finished here, and
// "z" is never the next letter.
const LONG_TEXT = 'abcdefghij'.repeat(20);
const WRONG_KEY = 'z';

const OVERDRIVE_BADGE = /^overdrive\s*x\d+$/i;

/** Every Overdrive badge on the Flight Deck: the HUD's and the deck header's. */
const overdriveBadges = () =>
  screen.queryAllByText(OVERDRIVE_BADGE).map((badge) => badge.textContent);

/** A Run in progress on LONG_TEXT, played a key at a time. */
function followRun(player: Player) {
  let typed = 0;
  let streak = 0;
  return {
    get streak() {
      return streak;
    },
    hit() {
      player.type(LONG_TEXT.charAt(typed++));
      streak += 1;
    },
    /** The Run has no shields, so the Streak is lost. */
    miss() {
      player.press(WRONG_KEY);
      streak = 0;
    },
    /** Hit on until an Overdrive badge shows, or `limit` hits. */
    hitUntilOverdrive(limit: number) {
      for (let tries = 0; tries < limit; tries++) {
        this.hit();
        if (overdriveBadges().length > 0) return;
      }
      throw new Error(`No Overdrive after ${limit} hits (Streak ${streak})`);
    },
  };
}

describe('the Multiplier', () => {
  /** Outside Overdrive: the HUD shows "x<n>" and the deck header has no badge. */
  const expectPlain = (multiplier: number) => {
    expect(hudTags()).toEqual([`x${multiplier}`]);
    expect(overdriveBadges()).toEqual([]);
  };

  it('is x1, then x2 at Streak 10 and x3 at Streak 20, with no Overdrive badge', () => {
    const player = renderGame({ text: LONG_TEXT });
    const run = followRun(player);

    expectPlain(1);
    while (run.streak < 9) run.hit();
    expectPlain(1);

    run.hit(); // Streak 10
    expectPlain(2);

    while (run.streak < 20) run.hit();
    expectPlain(3);
  });
});

describe('Overdrive', () => {
  /** Both badges read "OVERDRIVE x<n>", n being the Multiplier doubled. */
  const expectOverdrive = (streak: number) => {
    const label = `OVERDRIVE x${multiplierAt(streak) * 2}`;
    expect(overdriveBadges(), `badges at Streak ${streak}`).toEqual([
      label,
      label,
    ]);
    // The HUD's badge replaces its plain Multiplier tag.
    expect(hudTags()).toEqual([]);
  };

  it('shows the Multiplier doubled on both badges, at every Multiplier step and through a Miss', () => {
    const player = renderGame({ text: LONG_TEXT });
    const run = followRun(player);

    // Fill the meter with a long Streak, then follow Overdrive up to x4.
    run.hitUntilOverdrive(60);
    expectOverdrive(run.streak);
    while (run.streak < 30) {
      run.hit();
      expectOverdrive(run.streak); // x3 doubled, then x4 doubled at 30
    }

    // A Miss ends Overdrive and the Streak, so the Multiplier is x1 again.
    run.miss();
    expect(hudTags()).toEqual(['x1']);
    expect(overdriveBadges()).toEqual([]);

    // The meter is still most of the way full, so Overdrive comes back while
    // the Streak is short of x2, and then carries through every step.
    run.hitUntilOverdrive(20);
    expect(run.streak, 'Overdrive came back before Streak 10').toBeLessThan(10);
    expectOverdrive(run.streak);
    while (run.streak < 31) {
      run.hit();
      expectOverdrive(run.streak); // x1, x2 at 10, x3 at 20, x4 at 30
    }
  });
});
