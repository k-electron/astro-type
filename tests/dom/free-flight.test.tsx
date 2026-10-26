import { describe, expect, it } from 'vitest';
import { renderGame, screen } from './harness';

describe('Free Flight', () => {
  it('shows the Debrief, with its buttons, when the text is typed to the end', () => {
    const player = renderGame();
    player.launchFreeFlight('ff jj');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    expect(screen.queryByText(/Mission Debriefing/)).toBeNull();

    player.type('ff jj');

    expect(screen.getByText(/Mission Debriefing/)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Free Flight Drill',
    );
    for (const name of ['Replay', 'Galaxy Map', 'Main Menu']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    // A Free Flight has no next Stage to go on to.
    expect(screen.queryByRole('button', { name: 'Next Mission' })).toBeNull();
  });

  it('does not clear the Run one character short', () => {
    const player = renderGame({ text: 'ff jj' });

    player.type('ff j');

    expect(screen.queryByText(/Mission Debriefing/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });
});
