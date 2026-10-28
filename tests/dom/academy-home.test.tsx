import { describe, expect, it } from 'vitest';
import { clearedStages } from '../shared/saves';
import {
  ACADEMY_HOME_HEADING,
  BEGIN_HOME_ROW,
  HUD_NAME,
  START_STAGE,
} from '../shared/screens';
import { renderGame, screen } from './harness';

describe('Academy Home', () => {
  it('starts Stage 1 when the player presses Start Stage', () => {
    const player = renderGame();
    expect(
      screen.getByRole('heading', { name: ACADEMY_HOME_HEADING }),
    ).toBeTruthy();

    expect(screen.queryByRole('region', { name: HUD_NAME })).toBeNull();

    player.clickHeader(START_STAGE);

    // The Flight Deck: the HUD and the text prompt are showing.
    expect(screen.getByRole('region', { name: HUD_NAME })).toBeTruthy();
    // Stage 1 types "f j f j ff jj ..."; the prompt shows each space as ␣.
    expect(screen.getByLabelText('Text prompt').textContent).toContain(
      'f␣j␣f␣j␣ff␣jj␣fff␣jjj',
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: ACADEMY_HOME_HEADING }),
    ).toBeNull();
  });

  it('begins the first Stage with Begin Home Row', () => {
    const player = renderGame();

    player.click(BEGIN_HOME_ROW);

    expect(screen.getByRole('region', { name: HUD_NAME })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });

  it('shows the Stars of a player who has already cleared a Stage', () => {
    renderGame({ profile: clearedStages({ 's1-l1': 2 }) });

    expect(screen.getByText(/2 Stars Earned/)).toBeTruthy();
  });
});
