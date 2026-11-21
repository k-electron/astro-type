import { describe, expect, it } from 'vitest';
import {
  CURRICULUM_SECTORS,
  FINGER_DISPLAY_NAMES,
  FIRST_STAGE,
} from '../../src/curriculum/curriculum';
import { nextStarLabel } from '../../src/screens/starBarLabels';
import { multiplierAt } from '../shared/multiplier';
import { stageProgress } from '../shared/saves';
import { DEBRIEF_TITLE, HUD_NAME, REPLAY } from '../shared/screens';
import { barsOf } from '../shared/starBars';
import { type Player, renderGame, screen, within } from './harness';

// The Flight Deck as the player reads it: the HUD, the text prompt and its
// progress, the Streak and the Overdrive badges. Everything is
// found by role, label or visible text.

// Six different letters, so each position in the prompt is easy to tell apart.
const TEXT = 'abcdef';

/** The HUD as one string: "Score0 Speed– Accuracy100% Streak3 ...". */
const hudText = () =>
  screen.getByRole('region', { name: HUD_NAME }).textContent ?? '';

/** The HUD's Streak readout shows exactly this number. */
const expectStreak = (streak: number) =>
  expect(hudText()).toMatch(new RegExp(`Streak\\s*${streak}(?!\\d)`));

/** The HUD's Accuracy readout. It follows every keystroke. */
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

/** The "x<n>" tags in the HUD: the Multiplier's, and nothing else is tagged. */
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
    // 4 characters reached, 1 of them marked. The HUD works Accuracy out on every keystroke.
    player.step(30);
    expectAccuracy(75);

    // The right key carries on from there.
    player.press('d');
    expect(progress()).toBe('67%');
    expect(currentCharacters()).toEqual(['e']);
    expectStreak(1);
  });
});

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
    '%s leaves the Streak and Accuracy alone',
    (_name, key) => {
      const player = renderGame({ text: 'abcdefgh' });
      expect(hudTags()).toEqual(['x1']);
      player.type('abc');

      player.press(...key);

      // The next right key carries the Streak on from 3.
      player.press('d');
      expect(progress()).toBe('50%');
      expectStreak(4);
      player.step(30);
      expectAccuracy(100);
    },
  );
});

describe('a wrong key', () => {
  it('resets the Streak, and the HUD tags only the Multiplier', () => {
    const player = renderGame({ text: TEXT });
    expect(hudTags()).toEqual(['x1']);
    player.type('abc');
    expectStreak(3);

    player.press('z');

    expectStreak(0);
    expect(hudTags()).toEqual(['x1']);
    player.press('d');
    expect(progress()).toBe('67%');
    expectStreak(1);
  });

  it('is one Miss when it is held: the Streak starts again from the next right key', () => {
    const player = renderGame({ text: TEXT });
    player.type('abc');

    player.press('z');
    for (let repeat = 0; repeat < 4; repeat++) {
      player.press('z', { repeat: true });
    }
    player.press('d');

    expect(progress()).toBe('67%');
    expectStreak(1);
    player.step(30);
    expectAccuracy(75);
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
    /** A wrong key always loses the Streak. */
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

describe('the text prompt names the reach for the character to type next', () => {
  // The finger of the key each character is typed on (the US layout: the
  // oracle), and which hand's Shift to hold, if any.
  const REACHES = [
    { character: '!', finger: 'LEFT_PINKY', shift: 'right' },
    { character: '?', finger: 'RIGHT_PINKY', shift: 'left' },
    { character: '(', finger: 'RIGHT_RING', shift: 'left' },
    { character: '{', finger: 'RIGHT_PINKY', shift: 'left' },
    { character: '"', finger: 'RIGHT_PINKY', shift: 'left' },
    { character: ':', finger: 'RIGHT_PINKY', shift: 'left' },
    { character: 'B', finger: 'LEFT_INDEX', shift: 'right' },
    { character: 'P', finger: 'RIGHT_PINKY', shift: 'left' },
    { character: '1', finger: 'LEFT_PINKY', shift: null },
    { character: 'b', finger: 'LEFT_INDEX', shift: null },
  ] as const;

  it.each(REACHES)(
    'for "$character": the $finger finger, and Shift on the $shift',
    ({ character, finger, shift }) => {
      renderGame({ text: `${character}a` });
      const prompt = within(screen.getByLabelText('Text prompt'));

      expect(prompt.getByText(FINGER_DISPLAY_NAMES[finger])).toBeTruthy();
      if (shift === null) {
        expect(prompt.queryByText(/shift/i)).toBeNull();
      } else {
        // The Shift copy is not exported yet, so it is matched loosely.
        expect(prompt.getByText(/shift/i).textContent?.toLowerCase()).toContain(
          shift,
        );
      }
    },
  );
});

describe('the Run header names the next Star bar', () => {
  /** The text prompt's header and the rest of the prompt, as the player reads them. */
  const promptText = () =>
    screen.getByLabelText('Text prompt').textContent ?? '';

  /** The "Next ★..." label each Star bar of a Stage would give, by Star. */
  const nextLabels = (stage: typeof FIRST_STAGE) =>
    barsOf(stage).map(nextStarLabel);

  const [, SECOND_STAGE] = CURRICULUM_SECTORS[0].stages;

  it.each([
    { saved: 0, next: 1 },
    { saved: 1, next: 2 },
    { saved: 2, next: 3 },
  ])(
    'asks for the $next-Star bar of a Stage whose best result is $saved Stars, and no other',
    ({ saved, next }) => {
      const player = renderGame({
        profile: {
          stagesProgress: {
            [FIRST_STAGE.id]: stageProgress(FIRST_STAGE.id, saved),
          },
        },
      });
      player.startStage(FIRST_STAGE.id);

      const labels = nextLabels(FIRST_STAGE);
      expect(promptText()).toContain(labels[next - 1]);
      for (const [index, label] of labels.entries()) {
        if (index !== next - 1) expect(promptText()).not.toContain(label);
      }
    },
  );

  it('shows no Star bar for a Stage that already has 3 Stars', () => {
    const player = renderGame({
      profile: {
        stagesProgress: {
          [FIRST_STAGE.id]: stageProgress(FIRST_STAGE.id, 3),
        },
      },
    });
    player.startStage(FIRST_STAGE.id);

    for (const label of nextLabels(FIRST_STAGE)) {
      expect(promptText()).not.toContain(label);
    }
  });

  it("goes by the Stage's own Stars, not another Stage's", () => {
    const player = renderGame({
      profile: {
        stagesProgress: {
          [SECOND_STAGE.id]: stageProgress(SECOND_STAGE.id, 2),
        },
      },
    });
    player.startStage(FIRST_STAGE.id);

    expect(promptText()).toContain(nextLabels(FIRST_STAGE)[0]);
  });

  it('moves on to the next bar when a clear has just earned the Star before it', () => {
    const player = renderGame();
    player.startStage(FIRST_STAGE.id);
    // 3.6 WPM is under every WPM bar: the clean clear earns 1 Star.
    player.typePrompt({ stepsPerKey: 200 });
    expect(screen.getByText(DEBRIEF_TITLE)).toBeTruthy();

    player.click(REPLAY);

    expect(promptText()).toContain(nextLabels(FIRST_STAGE)[1]);
    expect(promptText()).not.toContain(nextLabels(FIRST_STAGE)[0]);
  });

  it('shows no Star bar in a Free Flight, not even for a player with no Stars', () => {
    renderGame({ text: TEXT });

    // The 1-Star bar is the same on every Stage, and is what a fresh Save
    // would be shown on a Sector Stage.
    for (const label of nextLabels(FIRST_STAGE)) {
      expect(promptText()).not.toContain(label);
    }
  });
});
