import { describe, expect, it } from 'vitest';
import { stageProgress } from '../../tests/shared/saves';
import { CURRICULUM_SECTORS, getStageById } from '../curriculum/curriculum';
import {
  clearStage,
  clearStageTypingSteps,
  expectedWpm,
  newGame,
  STAGE_ID,
  startedGame,
  startStage,
  typeTextWithMissMarks,
  WRONG_KEY,
} from '../../tests/shared/testHelpers';

/**
 * Stars, Credits and the Profile after clearing a Sector Stage, read from the
 * Debrief. The Star bars (#134), restated here because this is their oracle:
 * 1 Star needs 90% accuracy and no speed; 2 Stars need 95% and the Stage's
 * 2-Star WPM; 3 Stars need 98% and its 3-Star WPM. There is no Streak bar.
 * A Stage's two WPM bars are read from its `starThresholds`, never copied.
 * Every Run types a Stage's text, so WPM is set by the Typing Time (see
 * `clearStage`) and accuracy by the number of characters carrying a Miss mark.
 * Stars compare the exact accuracy and the exact WPM to the Star bars; only
 * the screens round them down.
 */

const CHARACTERS = 77;
/** The exact WPM of a `clearStage` Run of `seconds`, however many Miss marks it has. */
const stageWpm = (seconds: number, missesFirst = 0) =>
  expectedWpm(CHARACTERS, clearStageTypingSteps({ seconds, missesFirst }));

function debriefOf(game: ReturnType<typeof startedGame>) {
  const debrief = game.getState().debrief;
  if (!debrief) throw new Error('expected a Debrief after clearing the Stage');
  return debrief;
}

// ---------------------------------------------------------------------------
// Runs built from the bars: a speed and a number of Miss marks for a Stage
// ---------------------------------------------------------------------------

const stages = CURRICULUM_SECTORS.flatMap((sector) => sector.stages);
type SectorStage = (typeof stages)[number];

const lengthOf = (stage: SectorStage) => Array.from(stage.sampleText).length;

/**
 * Typing a text a key every `stepsPerKey` steps is `720 / stepsPerKey` WPM,
 * whatever the text: (n - 1) / 5 words over (n - 1) * k / 3600 minutes.
 * These pick a pace on either side of a bar, one step apart, and never land
 * exactly on it (a pace of exactly the bar leaves the answer to float rounding).
 */
const justOver = (barWpm: number) => Math.ceil(720 / barWpm) - 1;
const justUnder = (barWpm: number) => Math.floor(720 / barWpm) + 1;
/** A pace far too slow for any bar: 3.6 WPM. */
const CRAWL = 200;
/** A pace of 48 WPM, over the WPM bars of the Stages these tests fly it on (each test guards that). */
const FAST = 15;

/** The accuracy of a Run of `characters` with `marks` of them carrying a Miss mark. */
const accuracyOf = (characters: number, marks: number) =>
  ((characters - marks) * 100) / characters;

/** The most Miss marks a Run of the Stage can carry and still reach `bar`% accuracy. */
const mostMarksKeeping = (stage: SectorStage, bar: number) =>
  Math.floor((lengthOf(stage) * (100 - bar)) / 100);

/**
 * Fly a Sector Stage on a fresh Profile: type its text a key every
 * `stepsPerKey` steps, with one wrong key before each character in `missAt`
 * (so each of those has one Miss mark). Returns the Debrief.
 */
function fly(
  stage: SectorStage,
  { stepsPerKey, missAt = [] }: { stepsPerKey: number; missAt?: number[] },
) {
  if (missAt.length > 0 && stage.sampleText.includes(WRONG_KEY)) {
    throw new Error(`${stage.id} has the key a Miss presses, so it can't miss`);
  }
  const game = newGame();
  startStage(game, stage.id);
  typeTextWithMissMarks(game, stage.sampleText, missAt, { stepsPerKey });
  return { game, debrief: debriefOf(game) };
}

/** The first `count` characters of a text, as the ones that carry a Miss mark. */
const firstMarks = (count: number) =>
  Array.from({ length: count }, (_, index) => index);

const stageOne = (() => {
  const stage = getStageById(STAGE_ID);
  if (!stage) throw new Error(`No Stage ${STAGE_ID}`);
  return stage;
})();

describe('Stars from accuracy and WPM', () => {
  it('a fast, clean Run earns 3 Stars, and pays Credits and the Profile', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60 });

    expect(game.getState().screen).toBe('debrief');
    const debrief = debriefOf(game);
    expect(debrief.wpm).toBeCloseTo(stageWpm(60), 6); // 76 / 5 over 59.5 s = 15.3
    expect(debrief.accuracy).toBe(100);
    expect(debrief.score).toBe(44300);
    expect(debrief.starsEarned).toBe(3);
    // 100 + 75 per Star + score / 200 (221.5 rounds up)
    expect(debrief.creditsEarned).toBe(100 + 3 * 75 + 222);
    expect(debrief.isNewHighScore).toBe(true);
    expect(debrief.newStarsAwarded).toBe(3);

    const profile = game.getState().profile;
    expect(profile.totalCredits).toBe(547);
    expect(profile.totalStars).toBe(3);
    expect(profile.totalCharactersTyped).toBe(77);
    expect(profile.totalMissMarks).toBe(0);
    expect(profile.stagesProgress[STAGE_ID]).toMatchObject({
      completed: true,
      starsEarned: 3,
      highScore: 44300,
      timesPlayed: 1,
    });
    // The Profile keeps the exact WPM too.
    expect(profile.stagesProgress[STAGE_ID]?.bestWpm).toBeCloseTo(
      stageWpm(60),
      6,
    );
  });

  it('a slower Run loses the 3rd Star, then the 2nd, on WPM alone', () => {
    const { twoStarWpm, threeStarWpm } = stageOne.starThresholds;

    const slower = startedGame();
    clearStage(slower, { seconds: 90 });
    expect(debriefOf(slower).wpm).toBeCloseTo(stageWpm(90), 6);
    // If a Star bar moves, this test must be rebuilt rather than go quiet.
    expect(debriefOf(slower).wpm).toBeGreaterThanOrEqual(twoStarWpm);
    expect(debriefOf(slower).wpm).toBeLessThan(threeStarWpm);
    expect(debriefOf(slower).accuracy).toBe(100);
    expect(debriefOf(slower).starsEarned).toBe(2);

    const slowest = startedGame();
    clearStage(slowest, { seconds: 100 });
    expect(debriefOf(slowest).wpm).toBeCloseTo(stageWpm(100), 6);
    expect(debriefOf(slowest).wpm).toBeLessThan(twoStarWpm);
    expect(debriefOf(slowest).starsEarned).toBe(1);
  });

  it('on every Sector Stage, 1 Star needs no speed and 2 and 3 Stars need that Stage’s own WPM bars', () => {
    // Each pace is a step either side of a bar (see `justOver`), so a Stage
    // whose bar the game did not read from its own data fails here.
    const wrong: string[] = [];
    for (const stage of stages) {
      const { twoStarWpm: two, threeStarWpm: three } = stage.starThresholds;
      const paces: Array<[string, number, number]> = [
        ['crawling', CRAWL, 1],
        ['just under the 2-Star WPM', justUnder(two), 1],
        ['just over the 2-Star WPM', justOver(two), 2],
        ['just under the 3-Star WPM', justUnder(three), 2],
        ['just over the 3-Star WPM', justOver(three), 3],
      ];
      for (const [pace, stepsPerKey, stars] of paces) {
        const { debrief } = fly(stage, { stepsPerKey });
        // The Run really was at the pace, with nothing in the way of the Stars.
        if (
          debrief.accuracy !== 100 ||
          Math.abs(debrief.wpm - 720 / stepsPerKey) > 1e-6
        ) {
          wrong.push(`${stage.id} ${pace}: flew at ${debrief.wpm} WPM`);
        } else if (debrief.starsEarned !== stars) {
          wrong.push(
            `${stage.id} ${pace} (${debrief.wpm.toFixed(2)} WPM): ${debrief.starsEarned} Stars, wanted ${stars}`,
          );
        }
      }
    }
    expect(wrong).toEqual([]);
  }, 30_000);

  it('wrong keys on one character count as one Miss mark, so four of them keep the 3rd Star', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60, missesFirst: 4 });
    const debrief = debriefOf(game);
    expect(debrief.accuracy).toBeCloseTo((76 * 100) / 77); // 1 of 77 characters marked
    // The wrong keys come first, so the clock starts with them, at Run Time 0.
    expect(debrief.wpm).toBeCloseTo(stageWpm(60, 4), 6); // 15.2
    expect(debrief.starsEarned).toBe(3);
  });

  it('Miss marks lower accuracy and the Stars with it, even at a fast pace', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60, missMarks: 3 });
    const debrief = debriefOf(game);
    expect(debrief.accuracy).toBeCloseTo((74 * 100) / 77); // 3 of 77 characters marked
    // Wrong keys take nothing off the WPM: it is the clean Run's.
    expect(debrief.wpm).toBeCloseTo(stageWpm(60), 6);
    expect(debrief.starsEarned).toBe(2); // 3 Stars needs 98%
  });
});

describe('the accuracy bars', () => {
  // The same on every Stage: 90% for 1 Star, 95% for 2, 98% for 3.

  /** A Stage whose text is a multiple of 10 characters, so a Run can be at exactly 90%. */
  const tenthsStage = stages.find(
    (stage) =>
      lengthOf(stage) % 10 === 0 && !stage.sampleText.includes(WRONG_KEY),
  );

  it('exactly 90% accuracy earns 1 Star, at any speed', () => {
    if (!tenthsStage)
      throw new Error('No Stage has a multiple of 10 characters');
    const marks = lengthOf(tenthsStage) / 10;

    const { debrief } = fly(tenthsStage, {
      stepsPerKey: CRAWL,
      missAt: firstMarks(marks),
    });

    expect(debrief.accuracy).toBeCloseTo(90, 9);
    expect(debrief.wpm).toBeLessThan(tenthsStage.starThresholds.twoStarWpm);
    expect(debrief.starsEarned).toBe(1);
  });

  it('just under 90% earns no Star, however fast the Run', () => {
    if (!tenthsStage)
      throw new Error('No Stage has a multiple of 10 characters');
    const marks = lengthOf(tenthsStage) / 10 + 1;

    const { debrief } = fly(tenthsStage, {
      stepsPerKey: FAST,
      missAt: firstMarks(marks),
    });

    expect(debrief.accuracy).toBeLessThan(90);
    expect(debrief.wpm).toBeGreaterThan(
      tenthsStage.starThresholds.threeStarWpm,
    );
    expect(debrief.starsEarned).toBe(0);
  });

  it('95% accuracy with the Stage’s 2-Star WPM earns 2 Stars, and just under 95% earns 1', () => {
    const pace = justOver(stageOne.starThresholds.twoStarWpm);
    const marks = mostMarksKeeping(stageOne, 95);

    const enough = fly(stageOne, {
      stepsPerKey: pace,
      missAt: firstMarks(marks),
    });
    expect(enough.debrief.accuracy).toBeGreaterThanOrEqual(95);
    expect(enough.debrief.wpm).toBeGreaterThan(
      stageOne.starThresholds.twoStarWpm,
    );
    expect(enough.debrief.starsEarned).toBe(2);

    const short = fly(stageOne, {
      stepsPerKey: pace,
      missAt: firstMarks(marks + 1),
    });
    expect(short.debrief.accuracy).toBeLessThan(95);
    expect(short.debrief.starsEarned).toBe(1);
  });

  it('98% accuracy with the Stage’s 3-Star WPM earns 3 Stars, and just under 98% earns 2', () => {
    const pace = justOver(stageOne.starThresholds.threeStarWpm);
    const marks = mostMarksKeeping(stageOne, 98);

    const enough = fly(stageOne, {
      stepsPerKey: pace,
      missAt: firstMarks(marks),
    });
    expect(enough.debrief.accuracy).toBeGreaterThanOrEqual(98);
    expect(enough.debrief.wpm).toBeGreaterThan(
      stageOne.starThresholds.threeStarWpm,
    );
    expect(enough.debrief.starsEarned).toBe(3);

    const short = fly(stageOne, {
      stepsPerKey: pace,
      missAt: firstMarks(marks + 1),
    });
    expect(short.debrief.accuracy).toBeLessThan(98);
    expect(short.debrief.starsEarned).toBe(2);
  });

  it('98% accuracy below the Stage’s 2-Star WPM earns only 1 Star', () => {
    const { debrief } = fly(stageOne, {
      stepsPerKey: justUnder(stageOne.starThresholds.twoStarWpm),
      missAt: firstMarks(mostMarksKeeping(stageOne, 98)),
    });

    expect(debrief.accuracy).toBeGreaterThanOrEqual(98);
    expect(debrief.wpm).toBeLessThan(stageOne.starThresholds.twoStarWpm);
    expect(debrief.starsEarned).toBe(1);
  });

  // The Stars compare the exact accuracy: a Run that rounds up to a bar but
  // falls short of it earns the lower Star. Each bar needs a Stage and a
  // number of Miss marks where that happens, so they are searched for.
  it.each([
    { bar: 90, short: 0, enough: 1 },
    { bar: 95, short: 1, enough: 2 },
    { bar: 98, short: 2, enough: 3 },
  ])(
    'compares the exact accuracy to the $bar% bar, so a Run that rounds up to it but falls short earns $short Stars',
    ({ bar, short, enough }) => {
      const found = stages
        .filter((stage) => !stage.sampleText.includes(WRONG_KEY))
        .map((stage) => ({
          stage,
          marks: mostMarksKeeping(stage, bar) + 1,
        }))
        .find(
          ({ stage, marks }) =>
            accuracyOf(lengthOf(stage), marks) < bar &&
            Math.round(accuracyOf(lengthOf(stage), marks)) >= bar,
        );
      if (!found)
        throw new Error(`No Stage rounds up to ${bar}% and misses it`);
      const { stage, marks } = found;

      const flyNear = (count: number) =>
        fly(stage, { stepsPerKey: FAST, missAt: firstMarks(count) }).debrief;

      const belowBar = flyNear(marks);
      expect(belowBar.accuracy).toBeCloseTo(accuracyOf(lengthOf(stage), marks));
      expect(belowBar.accuracy).toBeLessThan(bar);
      expect(belowBar.wpm).toBeGreaterThanOrEqual(
        stage.starThresholds.threeStarWpm,
      );
      expect(belowBar.starsEarned).toBe(short);

      const atBar = flyNear(marks - 1);
      expect(atBar.accuracy).toBeGreaterThanOrEqual(bar);
      expect(atBar.starsEarned).toBe(enough);
    },
  );

  it('a Streak is no bar: a Run with its Streak broken again and again still earns 3 Stars', () => {
    // The longest Stage can take three Miss marks and stay over 98%. They are
    // spread through the text, so no Streak is longer than a quarter of it.
    const longest = stages
      .filter((stage) => !stage.sampleText.includes(WRONG_KEY))
      .reduce((a, b) => (lengthOf(b) > lengthOf(a) ? b : a));
    const characters = lengthOf(longest);
    const marks = mostMarksKeeping(longest, 98);
    expect(marks).toBeGreaterThanOrEqual(3);
    const missAt = Array.from({ length: marks }, (_, index) =>
      Math.floor(((index + 1) * characters) / (marks + 1)),
    );

    const { game, debrief } = fly(longest, { stepsPerKey: FAST, missAt });

    const { bestStreak } = game.getState().profile.stagesProgress[longest.id];
    expect(bestStreak).toBeLessThan(characters / 2);
    expect(debrief.accuracy).toBeGreaterThanOrEqual(98);
    expect(debrief.wpm).toBeGreaterThanOrEqual(
      longest.starThresholds.threeStarWpm,
    );
    expect(debrief.starsEarned).toBe(3);
  });

  it('the Streak at the end of the Run is no bar either: one wrong key just before the last character still earns 3 Stars', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60, missBeforeLast: true });
    const debrief = debriefOf(game);
    expect(debrief.accuracy).toBeGreaterThanOrEqual(98);
    expect(debrief.starsEarned).toBe(3);
  });
});

describe('what a clear pays and keeps', () => {
  it('compares the exact WPM, so a Run that rounds up to a bar but falls short of it earns the lower Star', () => {
    const bar = stageOne.starThresholds.threeStarWpm;
    // A Run of `seconds` has 76 / 5 words over (seconds * 60 - 30) steps of
    // Typing Time (see `clearStage`). Take the whole seconds either side of
    // the bar: one just under it, which rounds up to it, and one at it.
    const stepsAtBar = (expectedWpm(CHARACTERS, 3600) * 3600) / bar;
    const exact = (seconds: number) => stageWpm(seconds);
    const shortSeconds = Math.ceil((stepsAtBar + 30) / 60);
    const enoughSeconds = shortSeconds - 1;
    // If a Star bar moves, this test must be rebuilt rather than go quiet.
    expect(exact(shortSeconds)).toBeLessThan(bar);
    expect(Math.round(exact(shortSeconds))).toBeGreaterThanOrEqual(bar);
    expect(exact(enoughSeconds)).toBeGreaterThanOrEqual(bar);

    const fly = (seconds: number) => {
      const game = startedGame();
      clearStage(game, { seconds });
      return debriefOf(game);
    };

    const enough = fly(enoughSeconds);
    expect(enough.wpm).toBeCloseTo(exact(enoughSeconds), 6);
    expect(enough.starsEarned).toBe(3);

    const short = fly(shortSeconds);
    expect(short.wpm).toBeCloseTo(exact(shortSeconds), 6);
    expect(short.starsEarned).toBe(2);
  });

  it('a 0-Star clear still pays Credits and counts as completed', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60, missMarks: 12 });

    const debrief = debriefOf(game);
    expect(debrief.starsEarned).toBe(0);
    // 100 for the clear and score / 200, with no Star bonus.
    expect(debrief.creditsEarned).toBe(100 + Math.round(debrief.score / 200));
    const profile = game.getState().profile;
    expect(profile.totalCredits).toBe(debrief.creditsEarned);
    expect(profile.totalStars).toBe(0);
    expect(profile.totalMissMarks).toBe(12);
    expect(profile.stagesProgress[STAGE_ID]).toMatchObject({
      completed: true,
      starsEarned: 0,
      timesPlayed: 1,
    });
  });

  it('a worse replay keeps the best result and awards no new Stars', () => {
    const game = newGame({
      stagesProgress: {
        [STAGE_ID]: stageProgress(STAGE_ID, 3, {
          highScore: 50000,
          bestWpm: 20,
          bestStreak: 77,
          timesPlayed: 1,
        }),
      },
    });
    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 90 }); // 2 Stars

    const debrief = debriefOf(game);
    expect(debrief.starsEarned).toBe(2);
    expect(debrief.newStarsAwarded).toBe(0);
    expect(debrief.isNewHighScore).toBe(false);
    expect(debrief.creditsEarned).toBe(100 + 2 * 75 + 222); // Credits are paid on every clear

    const profile = game.getState().profile;
    expect(profile.stagesProgress[STAGE_ID]).toMatchObject({
      starsEarned: 3,
      highScore: 50000,
      bestWpm: 20,
      timesPlayed: 2,
    });
    expect(profile.totalStars).toBe(3);
  });
});
