import { beforeAll, describe, expect, it } from 'vitest';
import { addDays } from '../../src/analytics/days';
import {
  EMPTY_LOGBOOK,
  foldRun,
  type Logbook,
} from '../../src/analytics/logbook';
import {
  CURRICULUM_SECTORS,
  maxStarsOf,
} from '../../src/curriculum/curriculum';
import { entryStars, LOGBOOK_HEADING } from '../../src/screens/journeyLabels';
import { evenly, logOf } from '../shared/flightLog';
import { beginnerLogbook } from '../shared/beginnerTypist';
import { clearedStages } from '../shared/saves';
import { TEST_DAY } from '../shared/testHelpers';
import { renderGame, screen, within } from './harness';

// Analytics' logbook: one entry for each Sector flown, in the order first
// reached, with its Stars read live. (The timeline's click that jumps to a
// entry needs a drawn strip, which a DOM has none of: the play-check covers it.)

const [ORION, ANDROMEDA] = CURRICULUM_SECTORS;
const stageOf = (sector: (typeof CURRICULUM_SECTORS)[number]) =>
  sector.stages[0].id;

let logbook: Logbook;
beforeAll(() => {
  // Andromeda is flown first, then Orion, then a Free Flight: the order of
  // the entries is the order they were reached, not the curriculum's.
  logbook = beginnerLogbook([
    { daysAgo: 12, stageId: stageOf(ANDROMEDA) },
    { daysAgo: 9, stageId: stageOf(ORION) },
    { daysAgo: 6 },
    { daysAgo: 3, stageId: stageOf(ANDROMEDA) },
  ]);
});

const progress = clearedStages({
  [ORION.stages[0].id]: 3,
  [ORION.stages[1].id]: 1,
  [ANDROMEDA.stages[0].id]: 2,
});

const entries = () =>
  within(screen.getByRole('region', { name: LOGBOOK_HEADING })).getAllByRole(
    'article',
  );
const nameOf = (entry: HTMLElement) =>
  within(entry).getByRole('heading').textContent;

describe('the logbook on Analytics', () => {
  it('has one entry for each Sector flown, in the order they were first reached, with its Stars as they are now', () => {
    const player = renderGame({ profile: { logbook, ...progress } });
    player.openHeader('Analytics');

    const shown = entries();
    expect(shown.map(nameOf)).toEqual([ANDROMEDA.name, ORION.name]);
    expect(
      within(shown[0]).getByText(entryStars(2, maxStarsOf(ANDROMEDA))),
    ).toBeTruthy();
    expect(
      within(shown[1]).getByText(entryStars(4, maxStarsOf(ORION))),
    ).toBeTruthy();
  });

  it('has no entry for a Free Flight, and none before a Sector is flown', () => {
    const freeFlights = beginnerLogbook([{ daysAgo: 2 }, { daysAgo: 1 }]);
    const player = renderGame({ profile: { logbook: freeFlights } });
    player.openHeader('Analytics');

    expect(screen.queryByRole('region', { name: LOGBOOK_HEADING })).toBeNull();
  });

  it('keeps a entry, with no Stars, for a Sector the game no longer has', () => {
    const gone = foldRun(
      EMPTY_LOGBOOK,
      logOf('abc', evenly('abc', 12)),
      {
        where: {
          sector: { id: 'sector-lost', name: 'Lost Reach' },
          stage: { id: 'lost-1', name: 'Lost One' },
        },
        runSteps: 600,
        wpm: 20,
        accuracy: 100,
        rhythm: 90,
      },
      TEST_DAY,
    );
    const player = renderGame({ profile: { logbook: gone } });
    player.openHeader('Analytics');

    const [entry] = entries();
    expect(nameOf(entry)).toBe('Lost Reach');
    expect(within(entry).queryByText(/Stars/)).toBeNull();
  });

  it('survives a Wipe Stars, which leaves it with 0 Stars', () => {
    const player = renderGame({ profile: { logbook, ...progress } });
    player.openHeader('Analytics');

    player.click('Wipe Stars');
    player.click('Confirm Wipe');

    const shown = entries();
    expect(shown.map(nameOf)).toEqual([ANDROMEDA.name, ORION.name]);
    expect(
      within(shown[0]).getByText(entryStars(0, maxStarsOf(ANDROMEDA))),
    ).toBeTruthy();
  });

  it('is still there for a player who has been away, whose timeline is rebuilding', () => {
    const player = renderGame({
      profile: { logbook, ...progress },
      today: addDays(TEST_DAY, 100),
    });
    player.openHeader('Analytics');

    expect(entries().map(nameOf)).toEqual([ANDROMEDA.name, ORION.name]);
  });
});
