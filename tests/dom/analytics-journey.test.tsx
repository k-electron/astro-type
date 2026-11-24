import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/analytics/days';
import { STAR_ACCURACY_BARS } from '../../src/game/rules';
import { RHYTHM_STRIP } from '../../src/screens/debriefLabels';
import {
  dailyAccuracyExplanation,
  journeySentence,
  LETTER_SPEED_STRIP,
  NOTHING_TO_SHOW_YET,
  shiftHandExplanation,
  SHIFT_HAND_STRIP,
  TIMELINE_HEADING,
  TIMELINE_REBUILDING,
} from '../../src/screens/journeyLabels';
import { EIGHT_WEEKS_OF_PLAY } from '../shared/beginnerTypist';
import { fullLogbook } from '../shared/saves';
import { ACCURACY_STRIP } from '../shared/screens';
import { TEST_DAY } from '../shared/testHelpers';
import { renderGame, screen } from './harness';

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

    // fullLogbook is 8 weeks of play with 23 days played, and a Stage of Sector 1 on some of them.
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
    expect(screen.getByText(TIMELINE_REBUILDING)).toBeTruthy();
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
