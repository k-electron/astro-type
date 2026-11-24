import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/analytics/days';
import { MIN_DAYS_FOR_PICTURE } from '../../src/analytics/journeySentence';
import { STAR_ACCURACY_BARS } from '../../src/game/rules';
import { RHYTHM_STRIP } from '../../src/screens/debriefLabels';
import {
  BEST_DAY_LABEL,
  dailyAccuracyExplanation,
  journeySentence,
  LETTER_SPEED_STRIP,
  letterSpeedText,
  NOTHING_TO_SHOW_YET,
  shiftHandExplanation,
  SHIFT_HAND_STRIP,
  TIMELINE_HEADING,
  timelineRebuilding,
} from '../../src/screens/journeyLabels';
import { EIGHT_WEEKS_OF_PLAY } from '../shared/beginnerTypist';
import { daysAgo, flown, lettersAt } from '../shared/logbooks';
import { fullLogbook } from '../shared/saves';
import { ACCURACY_STRIP } from '../shared/screens';
import { TEST_DAY } from '../shared/testHelpers';
import { renderGame, screen, within } from './harness';

// Analytics opens with the Journey's plain sentence, then the last 8 weeks.

const TIMELINE = () => screen.queryByRole('region', { name: TIMELINE_HEADING });

describe('the sentence Analytics opens with', () => {
  it('says there is nothing to show yet, and shows no timeline, before any Run is cleared', () => {
    const player = renderGame({});
    player.openHeader('Analytics');

    expect(screen.getByText(NOTHING_TO_SHOW_YET)).toBeTruthy();
    expect(TIMELINE()).toBeNull();
  });

  it('tells a regular player how many days they have played, the furthest Sector they reached and their trickiest key', () => {
    const player = renderGame({ profile: { logbook: fullLogbook() } });
    player.openHeader('Analytics');

    // fullLogbook is the beginner typist's 8 weeks of play, with a Stage of Sector 1 on some of the days.
    const sentence = screen.getByText(/ days of play /).textContent ?? '';
    expect(sentence).toContain(`In ${EIGHT_WEEKS_OF_PLAY.length} days of play`);
    expect(sentence).toContain(sectorName('s1-l1'));
    expect(sentence).toMatch(/Your trickiest key now is /);
  });

  it('welcomes a returning player back and says how long they have been away', () => {
    const player = renderGame({
      profile: { logbook: fullLogbook() },
      today: addDays(TEST_DAY, 100),
    });
    player.openHeader('Analytics');

    expect(
      screen.getByText(
        journeySentence({
          kind: 'rebuilding',
          away: { days: 100, atLeast: false },
        }),
      ),
    ).toBeTruthy();
  });

  it('does not welcome a new player back on their first day', () => {
    const player = renderGame({ text: 'ff jj' });
    player.type('ff jj');
    player.clickHeader(/Analytics/);

    expect(
      screen.getByText(journeySentence({ kind: 'rebuilding', away: null })),
    ).toBeTruthy();
  });
});

describe('the timeline of the last 8 weeks', () => {
  it('has a strip each for letter speed, accuracy, Rhythm and Shift hand, over the sentence and the totals', () => {
    const player = renderGame({ profile: { logbook: fullLogbook() } });
    player.openHeader('Analytics');

    const timeline = TIMELINE();
    expect(timeline).toBeTruthy();
    for (const name of [
      LETTER_SPEED_STRIP,
      ACCURACY_STRIP,
      RHYTHM_STRIP,
      SHIFT_HAND_STRIP,
    ]) {
      expect(
        screen.getByRole('region', { name }),
        `the ${name} strip`,
      ).toBeTruthy();
    }
  });

  it('is rebuilding, not drawn from old numbers, for a player who has been away', () => {
    const player = renderGame({
      profile: { logbook: fullLogbook() },
      today: addDays(TEST_DAY, 100),
    });
    player.openHeader('Analytics');

    expect(TIMELINE()).toBeTruthy();
    expect(screen.getByText(timelineRebuilding(true))).toBeTruthy();
    expect(
      screen.queryByRole('region', { name: LETTER_SPEED_STRIP }),
    ).toBeNull();
  });

  it("says each strip's guides when it is hovered, so no guide's value hides on a crowded axis", () => {
    const player = renderGame({ profile: { logbook: fullLogbook() } });
    player.openHeader('Analytics');

    fireEvent.mouseEnter(screen.getByRole('region', { name: ACCURACY_STRIP }));
    expect(
      screen.getByText(dailyAccuracyExplanation(STAR_ACCURACY_BARS)),
    ).toBeTruthy();

    fireEvent.mouseEnter(
      screen.getByRole('region', { name: SHIFT_HAND_STRIP }),
    );
    expect(screen.getByText(shiftHandExplanation())).toBeTruthy();
  });
});

function sectorName(stageId: string): string {
  // The sector a Stage was flown in, as the fold copies it into the Logbook.
  const logbook = fullLogbook();
  const run = logbook.runs.find((each) => each.where?.stage.id === stageId);
  if (!run?.where) throw new Error(`${stageId} was not flown in the Logbook`);
  return run.where.sector.name;
}

describe('the picture that is not drawn yet', () => {
  const REBUILDING = /rebuil/i;

  it('is never called rebuilding for a new player, who has nothing to rebuild', () => {
    const player = renderGame({
      profile: {
        logbook: flown(
          [1, 0].map((back) => ({
            day: daysAgo(back),
            log: lettersAt(51, 12),
          })),
        ),
      },
    });
    player.openHeader('Analytics');

    expect(document.body.textContent).not.toMatch(REBUILDING);
    expect(
      screen.getAllByText(
        new RegExp(`build(s)? up after ${MIN_DAYS_FOR_PICTURE} days`),
      ).length,
    ).toBeGreaterThan(1);
  });

  it('is rebuilding for a player who has been away', () => {
    const player = renderGame({
      profile: { logbook: fullLogbook() },
      today: addDays(TEST_DAY, 100),
    });
    player.openHeader('Analytics');

    expect(document.body.textContent).toMatch(REBUILDING);
  });
});

describe('a speed reads the same on every screen of the Journey', () => {
  // 51 letters 52 steps apart is 13.85 WPM: a screen that rounds up says 14.
  const SPEED = 13.85;
  const logbook = flown(
    [2, 1, 0].map((back) => ({ day: daysAgo(back), log: lettersAt(51, 52) })),
  );

  it('rounds the same down in the sentence, the Best Day and the timeline', () => {
    const player = renderGame({ profile: { logbook } });
    player.openHeader('Analytics');

    const sentence = screen.getByText(/ days of play /).textContent ?? '';
    expect(sentence).toContain(`about ${letterSpeedText(SPEED)}`);
    const bestDay = screen.getByText(BEST_DAY_LABEL).parentElement;
    expect(bestDay?.textContent).toMatch(/13\s*WPM/);
    // The strip reads the latest day beside its name.
    expect(
      within(
        screen.getByRole('region', { name: LETTER_SPEED_STRIP }),
      ).getByText(/13\s*WPM/),
    ).toBeTruthy();
  });
});
