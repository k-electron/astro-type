import { describe, expect, it } from 'vitest';
import { clearStage, newGame, STAGE_ID, startedGame } from './testHelpers';

/**
 * Stars, Credits and the Profile after clearing Stage 1 (s1-l1), read from the Debrief.
 * Its thresholds: 1 Star at 85% accuracy; 2 Stars at 10 WPM and 92%; 3 Stars at
 * 14 WPM, 97% and a best Streak of 14. Every Stage clear types the 77-character
 * sample text, so WPM is set by the Run Time and accuracy by the number of Misses.
 */

function debriefOf(game: ReturnType<typeof startedGame>) {
  const debrief = game.getDebrief();
  if (!debrief) throw new Error('expected a Debrief after clearing the Stage');
  return debrief;
}

describe('Stars from WPM, accuracy and Streak', () => {
  it('a fast, clean Run earns 3 Stars, and pays Credits and the Profile', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60 });

    expect(game.getScreen()).toBe('debrief');
    const debrief = debriefOf(game);
    expect(debrief.wpm).toBe(15); // 77 correct keys / 5 per word / 1 minute = 15.4
    expect(debrief.accuracy).toBe(100);
    expect(debrief.maxStreak).toBe(77);
    expect(debrief.score).toBe(44300);
    expect(debrief.starsEarned).toBe(3);
    // 100 + 75 per Star + score / 200 (221.5 rounds up)
    expect(debrief.creditsEarned).toBe(100 + 3 * 75 + 222);
    expect(debrief.isNewHighScore).toBe(true);
    expect(debrief.newStarsAwarded).toBe(3);

    const profile = game.getProfile();
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
    const profile = game.getProfile();
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
    expect(debrief.maxStreak).toBe(76);
    expect(debrief.starsEarned).toBe(3);
  });

  it('the 3rd Star also needs the Streak: the same clean Run falls to 2 Stars when the Streak asked is out of reach', () => {
    // On the real Stage, accuracy always trips before the Streak can, so give the
    // Stage a Streak longer than the text to see the Streak gate on its own.
    const stage = startedGame().getRun().currentStage;
    if (!stage) throw new Error('expected a current Stage');
    const strictStage = {
      ...stage,
      starThresholds: { ...stage.starThresholds, threeStarMinStreak: 78 },
    };

    const game = newGame();
    game.startStage(strictStage);
    clearStage(game, { seconds: 60 });
    const debrief = debriefOf(game);
    expect(debrief.wpm).toBe(15);
    expect(debrief.accuracy).toBe(100);
    expect(debrief.maxStreak).toBe(77);
    expect(debrief.starsEarned).toBe(2);
  });

  it('a worse replay keeps the best result and awards no new Stars', () => {
    const game = newGame({
      stagesProgress: {
        [STAGE_ID]: {
          stageId: STAGE_ID,
          completed: true,
          starsEarned: 3,
          highScore: 50000,
          bestWpm: 20,
          bestAccuracy: 100,
          bestStreak: 77,
          timesPlayed: 1,
        },
      },
    });
    game.startStage(STAGE_ID);
    clearStage(game, { seconds: 90 }); // 2 Stars

    const debrief = debriefOf(game);
    expect(debrief.starsEarned).toBe(2);
    expect(debrief.newStarsAwarded).toBe(0);
    expect(debrief.isNewHighScore).toBe(false);
    expect(debrief.creditsEarned).toBe(100 + 2 * 75 + 222); // Credits are paid on every clear

    const profile = game.getProfile();
    expect(profile.stagesProgress[STAGE_ID]).toMatchObject({
      starsEarned: 3,
      highScore: 50000,
      bestWpm: 20,
      timesPlayed: 2,
    });
    expect(profile.totalStars).toBe(3);
  });
});
