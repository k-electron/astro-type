import { describe, expect, it } from 'vitest';
import {
  FLAT_TEXT,
  type Game,
  hitFlat,
  newGame,
  startFlatRun,
  startFreeFlight,
  typeText,
  typeTextWithMissMarks,
} from '../../tests/shared/testHelpers';

/**
 * Clean words (#137). A word is the run of characters between spaces, with its
 * punctuation. It finishes on the space after it, or on the Stage's last
 * character. It is clean when none of its characters, the finishing space
 * included, carries a Miss mark. The hit that finishes a clean word pays a
 * bonus of 50 x the characters in the word (the space not counted) x the
 * Multiplier, x2 in Overdrive: the same Multiplier and Overdrive as that hit's
 * own points, and the bonus is not part of them.
 *
 * Each test plays a Free Flight through the `Game` and reads the hit moments
 * and the Run. The texts have no "x": it is the wrong key a Miss presses.
 */

type Moment = Parameters<Parameters<Game['onMoment']>[0]>[0];
type Hit = Extract<Moment, { type: 'hit' }>;

/**
 * Types `text` in a new Free Flight, with one wrong key before each character
 * whose index is in `missAt`, and returns the game and every hit it made.
 * `length` stops short of the whole text, so the Run is still going.
 */
function play(
  text: string,
  { missAt = [] as number[], length = text.length } = {},
) {
  const game = newGame();
  startFreeFlight(game, text);
  const hits: Hit[] = [];
  game.onMoment((moment) => {
    if (moment.type === 'hit') hits.push(moment);
  });
  typeTextWithMissMarks(game, text.slice(0, length), missAt);
  return { game, hits };
}

/** The bonus a hit paid, or 0 when it finished no clean word. */
const bonusOf = (hit: Hit) => hit.cleanWord?.bonus ?? 0;

describe('a word finished cleanly', () => {
  it('pays 50 a character on the hit that finishes it, on top of that hit’s own points', () => {
    const { game, hits } = play('ab cd', { length: 3 });

    // "ab" is two characters: a bonus of 100, paid by the space.
    expect(hits.map(bonusOf)).toEqual([0, 0, 100]);
    expect(hits[2].cleanWord).toEqual({ word: 'ab', bonus: 100 });
    expect(hits[2].points).toBe(100);
    expect(game.getState().run.score).toBe(3 * 100 + 100);
  });

  it('finishes the last word on its last character, with no space after it', () => {
    const { game, hits } = play('ab cd');

    expect(hits.map(bonusOf)).toEqual([0, 0, 100, 0, 100]);
    expect(hits[4].cleanWord).toEqual({ word: 'cd', bonus: 100 });
    // The Run is cleared, and the Debrief carries the whole score.
    expect(game.getState().debrief?.score).toBe(5 * 100 + 100 + 100);
  });

  it('is one word when the text is a single letter: its only character finishes it', () => {
    const { hits } = play('a');

    expect(hits.map((hit) => hit.cleanWord)).toEqual([
      { word: 'a', bonus: 50 },
    ]);
  });

  it('counts punctuation as part of the word: "home." is one word of five characters', () => {
    const { hits } = play('home. now', { length: 6 });

    expect(hits.map(bonusOf)).toEqual([0, 0, 0, 0, 0, 250]);
    expect(hits[5].cleanWord?.word).toBe('home.');
  });

  it('holds no word in a run of spaces: the first space finishes the word and the next ones nothing', () => {
    const { game, hits } = play('ab   cd', { length: 5 });

    expect(hits.map(bonusOf)).toEqual([0, 0, 100, 0, 0]);
    expect(hits[3].cleanWord).toBeNull();
    expect(hits[4].cleanWord).toBeNull();
    expect(game.getState().run.cleanWords).toBe(1);
  });

  it('pays the Multiplier on the bonus, as on the points: a 20-letter word finished at x3', () => {
    const text = `${'f'.repeat(20)} ff`;
    const { hits } = play(text, { length: 21 });

    // The 21st hit is at Streak 21, x3.
    expect(hits[20]).toMatchObject({ points: 300, multiplier: 3 });
    expect(hits[20].cleanWord).toEqual({
      word: 'f'.repeat(20),
      bonus: 50 * 20 * 3,
    });
  });

  it('doubles the bonus in Overdrive, as it doubles the points', () => {
    // Overdrive starts on the 29th hit, so the 41st (the space) is in it, at x4.
    const text = `${'f'.repeat(40)} ff`;
    const { hits } = play(text, { length: 41 });

    expect(hits[40]).toMatchObject({ points: 100 * 4 * 2, overdrive: true });
    expect(hits[40].cleanWord).toEqual({
      word: 'f'.repeat(40),
      bonus: 50 * 40 * 4 * 2,
    });
  });

  it('does not double the bonus of the hit that starts Overdrive, as it does not double its points', () => {
    // The 29th hit is the space: it finishes a 28-letter word and lights Overdrive.
    const text = `${'f'.repeat(28)} ff`;
    const { game, hits } = play(text, { length: 29 });

    expect(game.getState().run.overdriveActive).toBe(true);
    expect(hits[28]).toMatchObject({ points: 100 * 3, overdrive: false });
    expect(hits[28].cleanWord).toEqual({
      word: 'f'.repeat(28),
      bonus: 50 * 28 * 3,
    });
  });
});

describe('a word with a Miss mark', () => {
  // "ab cd ef": a Miss mark at each index, then which of the words pay.
  const text = 'ab cd ef';
  it.each([
    ['on its first character', 0],
    ['on its last character', 1],
    ['on the space that finishes it', 2],
  ])(
    'pays no bonus when it has one %s, and the next clean word still pays',
    (_where, index) => {
      const { game, hits } = play(text, { missAt: [index] });

      expect(hits[2].cleanWord, 'the first word').toBeNull();
      // "cd" and "ef" are clean: 100 each, at x1 because the Miss broke the Streak.
      expect(hits[5].cleanWord).toEqual({ word: 'cd', bonus: 100 });
      expect(hits[7].cleanWord).toEqual({ word: 'ef', bonus: 100 });
      // Eight hits at x1, and the two clean words' 100 each.
      expect(game.getState().debrief?.score).toBe(8 * 100 + 2 * 100);
    },
  );

  it('is still finished like any other hit: the space after it scores its 100 and no more', () => {
    const { hits } = play(text, { missAt: [2] });

    expect(hits[2]).toMatchObject({ key: ' ', points: 100, cleanWord: null });
  });

  it('is not cleaned by typing the rest of it right, nor spoiled by a Miss on the next word', () => {
    const { hits } = play(text, { missAt: [0, 3] });

    expect(hits[2].cleanWord).toBeNull();
    expect(hits[5].cleanWord).toBeNull();
    expect(hits[7].cleanWord).toEqual({ word: 'ef', bonus: 100 });
  });

  it('is the same with many wrong keys on one character as with one: one Miss mark', () => {
    const game = newGame();
    startFreeFlight(game, text);
    typeTextWithMissMarks(game, 'ab ', [0], { wrongKeys: 4 });
    const before = game.getState().run.score;
    typeText(game, 'cd ');

    // "cd" is clean and pays 100 after its three hits at x1.
    expect(game.getState().run.score - before).toBe(3 * 100 + 100);
  });

  it('pays no bonus for a last word with a Miss mark on its last character', () => {
    const { hits } = play('ab cd', { missAt: [4] });

    expect(hits[2].cleanWord).toEqual({ word: 'ab', bonus: 100 });
    expect(hits[4].cleanWord).toBeNull();
  });
});

describe('the hit that finishes a clean word', () => {
  it('carries the word, the bonus and the clean words the Run has finished, this one included', () => {
    const { game, hits } = play('ab cd ef', { missAt: [3] });

    // "ab" clean, "cd" marked, "ef" clean.
    expect(hits[2]).toMatchObject({
      cleanWord: { word: 'ab', bonus: 100 },
      cleanWords: 1,
    });
    expect(hits[5]).toMatchObject({ cleanWord: null, cleanWords: 1 });
    expect(hits[7]).toMatchObject({
      cleanWord: { word: 'ef', bonus: 50 * 2 * 1 },
      cleanWords: 2,
    });
    expect(game.getState().run.cleanWords).toBe(2);
  });

  it('is counted for a new Run from nothing', () => {
    const { game } = play('ab cd', { length: 3 });
    expect(game.getState().run.cleanWords).toBe(1);

    startFreeFlight(game, 'ab');
    expect(game.getState().run.cleanWords).toBe(0);
  });
});

describe('every hit', () => {
  it('says the Streak and Multiplier it made, which are the values after it', () => {
    const game = startFlatRun();
    const hits: Hit[] = [];
    game.onMoment((moment) => {
      if (moment.type === 'hit') hits.push(moment);
    });

    hitFlat(game, 31);

    expect(hits.map((hit) => hit.streak)).toEqual(
      Array.from({ length: 31 }, (_, index) => index + 1),
    );
    expect(hits[8]).toMatchObject({ streak: 9, multiplier: 1 });
    expect(hits[9]).toMatchObject({ streak: 10, multiplier: 2 });
    expect(hits[19]).toMatchObject({ streak: 20, multiplier: 3 });
    expect(hits[29]).toMatchObject({ streak: 30, multiplier: 4 });
    expect(hits.every((hit) => hit.cleanWord === null)).toBe(true);
  });

  it('is a milestone at Streak 10, 20 and 30, then every 25 after that', () => {
    const game = startFlatRun();
    const milestones: number[] = [];
    game.onMoment((moment) => {
      if (moment.type === 'hit' && moment.milestone) {
        milestones.push(moment.streak);
      }
    });

    hitFlat(game, FLAT_TEXT.length - 1);

    expect(milestones).toEqual([10, 20, 30, 55, 80, 105]);
  });

  it('can be a milestone and finish a clean word at once, and carries both', () => {
    // The 20th key is the space: Streak 20 is x3, and it finishes a 19-letter word.
    const { hits } = play(`${'f'.repeat(19)} ff`, { length: 20 });

    expect(hits[19]).toMatchObject({
      streak: 20,
      multiplier: 3,
      milestone: true,
      cleanWord: { word: 'f'.repeat(19), bonus: 50 * 19 * 3 },
    });
  });

  it('reaches the milestones again when a Miss has broken the Streak', () => {
    const game = startFlatRun();
    const milestones: number[] = [];
    game.onMoment((moment) => {
      if (moment.type === 'hit' && moment.milestone) {
        milestones.push(moment.streak);
      }
    });

    hitFlat(game, 15);
    typeTextWithMissMarks(game, 'f'.repeat(11), [0]);

    expect(milestones).toEqual([10, 10]);
  });
});
