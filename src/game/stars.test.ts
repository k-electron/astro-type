import { describe, expect, it } from 'vitest';
import { stageProgress } from '../../tests/shared/saves';
import { getStageById } from '../curriculum/curriculum';
import {
  clearStage,
  miss,
  newGame,
  STAGE_ID,
  startedGame,
  startStage,
  typeText,
} from '../../tests/shared/testHelpers';

/**
 * Stars, Credits and the Profile after clearing Stage 1 (s1-l1), read from the Debrief.
 * Its thresholds: 1 Star at 85% accuracy; 2 Stars at 10 WPM and 92%; 3 Stars at
 * 14 WPM, 97% and a best Streak of 14. Every Stage clear types the 77-character
 * sample text, so WPM is set by the Run Time and accuracy by the number of Misses.
 */

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
    expect(debrief.wpm).toBe(15); // 77 correct keys / 5 per word / 1 minute = 15.4
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
    expect(profile.totalKeystrokes).toBe(77);
    expect(profile.totalErrors).toBe(0);
    expect(profile.stagesProgress[STAGE_ID]).toMatchObject({
      completed: true,
      starsEarned: 3,
      highScore: 44300,
      timesPlayed: 1,
    });
  });

  it('a slower Run loses the 3rd Star, then the 2nd, on WPM alone', () => {
    const slower = startedGame();
    clearStage(slower, { seconds: 90 }); // 10.3 WPM
    expect(debriefOf(slower).wpm).toBe(10);
    expect(debriefOf(slower).accuracy).toBe(100);
    expect(debriefOf(slower).starsEarned).toBe(2);

    const slowest = startedGame();
    clearStage(slowest, { seconds: 100 }); // 9.2 WPM
    expect(debriefOf(slowest).wpm).toBe(9);
    expect(debriefOf(slowest).starsEarned).toBe(1);
  });

  it('Misses lower accuracy and the Stars with it, even at a fast pace', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60, missesFirst: 4 });
    const debrief = debriefOf(game);
    expect(debrief.accuracy).toBe(95); // 77 of 81
    expect(debrief.wpm).toBe(15); // wrong keys cost WPM too: (77 - 4) / 5 = 14.6
    expect(debrief.starsEarned).toBe(2); // 3 Stars needs 97%
  });

  it('accuracy is judged as the percentage the Debrief shows', () => {
    const justEnough = startedGame();
    clearStage(justEnough, { seconds: 60, missesFirst: 14 });
    expect(debriefOf(justEnough).accuracy).toBe(85);
    expect(debriefOf(justEnough).starsEarned).toBe(1);

    const notEnough = startedGame();
    clearStage(notEnough, { seconds: 60, missesFirst: 15 });
    expect(debriefOf(notEnough).accuracy).toBe(84);
    expect(debriefOf(notEnough).starsEarned).toBe(0);
  });

  it('a 0-Star clear still pays Credits and counts as completed', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60, missesFirst: 15 });

    expect(debriefOf(game).creditsEarned).toBe(100 + 222); // no Star bonus
    const profile = game.getState().profile;
    expect(profile.totalCredits).toBe(322);
    expect(profile.totalStars).toBe(0);
    expect(profile.totalErrors).toBe(15);
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
    // Star: two Misses, one a third of the way through and one at two thirds,
    // keep accuracy at 97% and the Streak at 19, with the typing fast enough.
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
