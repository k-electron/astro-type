import { describe, expect, it } from 'vitest';
import { stageProgress } from '../../tests/shared/saves';
import { getStageById } from '../curriculum/curriculum';
import {
  clearStage,
  clearStageTypingSteps,
  expectedWpm,
  miss,
  newGame,
  STAGE_ID,
  startedGame,
  startStage,
  typeText,
  typeTextWithMissMarks,
} from '../../tests/shared/testHelpers';

/**
 * Stars, Credits and the Profile after clearing Stage 1 (s1-l1), read from the Debrief.
 * Its thresholds: 1 Star at 85% accuracy; 2 Stars at 10 WPM and 92%; 3 Stars at
 * 14 WPM, 97% and a best Streak of 14. Every Stage clear types the 77-character
 * sample text, so WPM is set by the Typing Time (see `clearStage`) and accuracy
 * by the number of characters carrying a Miss mark. Stars compare the exact
 * accuracy and the exact WPM to the Star bars; only the screens round them down.
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

describe('Stars from WPM, accuracy and Streak', () => {
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
    const slower = startedGame();
    clearStage(slower, { seconds: 90 }); // 10.2 WPM
    expect(debriefOf(slower).wpm).toBeCloseTo(stageWpm(90), 6);
    expect(debriefOf(slower).accuracy).toBe(100);
    expect(debriefOf(slower).starsEarned).toBe(2);

    const slowest = startedGame();
    clearStage(slowest, { seconds: 100 }); // 9.2 WPM
    expect(debriefOf(slowest).wpm).toBeCloseTo(stageWpm(100), 6);
    expect(debriefOf(slowest).starsEarned).toBe(1);
  });

  it('Miss marks lower accuracy and the Stars with it, even at a fast pace', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60, missMarks: 4 });
    const debrief = debriefOf(game);
    expect(debrief.accuracy).toBeCloseTo((73 * 100) / 77); // 4 of 77 characters marked
    // Wrong keys take nothing off the WPM: it is the clean Run's.
    expect(debrief.wpm).toBeCloseTo(stageWpm(60), 6);
    expect(debrief.starsEarned).toBe(2); // 3 Stars needs 97%
  });

  it('wrong keys on one character count as one Miss mark, so four of them keep the 3rd Star', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60, missesFirst: 4 });
    const debrief = debriefOf(game);
    expect(debrief.accuracy).toBeCloseTo((76 * 100) / 77); // 1 of 77 characters marked
    // The wrong keys come first, so the clock starts with them, at Run Time 0.
    expect(debrief.wpm).toBeCloseTo(stageWpm(60, 4), 6); // 15.2
    expect(debrief.starsEarned).toBe(3);
  });

  it('a Star bar is reached at its accuracy and missed just under it', () => {
    const justEnough = startedGame();
    clearStage(justEnough, { seconds: 60, missMarks: 11 });
    expect(debriefOf(justEnough).accuracy).toBeCloseTo((66 * 100) / 77); // 85.7
    expect(debriefOf(justEnough).starsEarned).toBe(1);

    const notEnough = startedGame();
    clearStage(notEnough, { seconds: 60, missMarks: 12 });
    expect(debriefOf(notEnough).accuracy).toBeCloseTo((65 * 100) / 77); // 84.4
    expect(debriefOf(notEnough).starsEarned).toBe(0);
  });

  it('compares the exact accuracy, so a Run that rounds up to a bar but falls short of it earns the lower Star', () => {
    // Stage s1-l2 has 87 characters. 3 Miss marks leave 84 clean: 96.55%,
    // which rounds to its 97% bar for the 3rd Star without reaching it.
    // 2 Miss marks leave 97.70%, which does.
    const stage = getStageById('s1-l2');
    if (!stage) throw new Error('No Stage s1-l2');
    const characters = Array.from(stage.sampleText).length;
    const bar = stage.starThresholds.threeStarAccuracy;
    const exact = (marks: number) => ((characters - marks) * 100) / characters;
    // If a Star bar moves, this test must be rebuilt rather than go quiet.
    expect(exact(3)).toBeLessThan(bar);
    expect(Math.round(exact(3))).toBeGreaterThanOrEqual(bar);
    expect(exact(2)).toBeGreaterThanOrEqual(bar);

    const fly = (marks: number) => {
      const game = newGame();
      startStage(game, stage.id);
      typeTextWithMissMarks(
        game,
        stage.sampleText,
        Array.from({ length: marks }, (_, i) => i),
        { stepsPerKey: 20 },
      );
      return debriefOf(game);
    };

    const enough = fly(2);
    expect(enough.accuracy).toBeCloseTo(exact(2));
    expect(enough.wpm).toBeGreaterThanOrEqual(
      stage.starThresholds.threeStarWpm,
    );
    expect(enough.starsEarned).toBe(3);

    const short = fly(3);
    expect(short.accuracy).toBeCloseTo(exact(3));
    expect(short.wpm).toBeGreaterThanOrEqual(stage.starThresholds.threeStarWpm);
    expect(short.starsEarned).toBe(2);
  });

  it('compares the exact WPM, so a Run that rounds up to a bar but falls short of it earns the lower Star', () => {
    const stage = getStageById(STAGE_ID);
    if (!stage) throw new Error(`No Stage ${STAGE_ID}`);
    const bar = stage.starThresholds.threeStarWpm;
    // A Run of 66 s is 13.9 WPM, which rounds to the 14 WPM bar without
    // reaching it; 65 s is 14.1, which does.
    const exact = (seconds: number) => stageWpm(seconds);
    // If a Star bar moves, this test must be rebuilt rather than go quiet.
    expect(exact(66)).toBeLessThan(bar);
    expect(Math.round(exact(66))).toBeGreaterThanOrEqual(bar);
    expect(exact(65)).toBeGreaterThanOrEqual(bar);

    const fly = (seconds: number) => {
      const game = startedGame();
      clearStage(game, { seconds });
      return debriefOf(game);
    };

    const enough = fly(65);
    expect(enough.wpm).toBeCloseTo(exact(65), 6);
    expect(enough.starsEarned).toBe(3);

    const short = fly(66);
    expect(short.wpm).toBeCloseTo(exact(66), 6);
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

  it('the 3rd Star counts the best Streak of the Run, not the Streak at the end', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60, missBeforeLast: true });
    const debrief = debriefOf(game);
    expect(debrief.starsEarned).toBe(3);
  });

  it('the 3rd Star also needs the Streak: a Run that clears every other bar falls to 2 Stars when the Streak stays short of it', () => {
    // On Stage 1 accuracy trips before the Streak can. Stage s5-l1 (57
    // characters) asks 96% accuracy, 28 WPM and a Streak of 20 for its 3rd
    // Star: two Miss marks, one a third of the way through and one at two
    // thirds, keep accuracy at 96.5% and the Streak at 19, with the typing
    // fast enough.
    const stage = getStageById('s5-l1');
    if (!stage) throw new Error('No Stage s5-l1');
    const text = stage.sampleText;
    const third = Math.floor(text.length / 3);
    const STEPS_PER_KEY = 20;
    const fly = (missesAt: number[]) => {
      const game = newGame();
      startStage(game, stage.id);
      let from = 0;
      for (const at of [...missesAt, text.length]) {
        typeText(game, text.slice(from, at), STEPS_PER_KEY);
        if (at < text.length) miss(game);
        from = at;
      }
      return {
        debrief: debriefOf(game),
        bestStreak: game.getState().profile.stagesProgress[stage.id].bestStreak,
      };
    };

    const clean = fly([]);
    expect(clean.bestStreak).toBe(text.length);
    expect(clean.debrief.starsEarned).toBe(3);

    const { debrief: short, bestStreak } = fly([third, 2 * third]);
    expect(short.accuracy).toBeGreaterThanOrEqual(
      stage.starThresholds.threeStarAccuracy,
    );
    expect(short.wpm).toBeGreaterThanOrEqual(stage.starThresholds.threeStarWpm);
    expect(bestStreak).toBeLessThan(stage.starThresholds.threeStarMinStreak);
    expect(short.starsEarned).toBe(2);
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
