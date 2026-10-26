import { describe, expect, it } from 'vitest';
import { renderGame, screen } from './harness';

describe('Academy Home', () => {
  it('starts Stage 1 when the player presses Start Mission', () => {
    const player = renderGame();
    expect(
      screen.getByRole('heading', { name: /AstroType: Cosmic Touch Typing/ }),
    ).toBeTruthy();

    expect(screen.queryByRole('region', { name: 'HUD' })).toBeNull();

    player.click('Start Mission');

    // The Flight Deck: the HUD and the text prompt are showing.
    expect(screen.getByRole('region', { name: 'HUD' })).toBeTruthy();
    // Stage 1 types "f j f j ff jj ..."; the prompt shows each space as ␣.
    expect(screen.getByLabelText('Text prompt').textContent).toContain(
      'f␣j␣f␣j␣ff␣jj␣fff␣jjj',
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: /AstroType: Cosmic Touch Typing/ }),
    ).toBeNull();
  });

  it('shows the Stars of a player who has already cleared a Stage', () => {
    renderGame({
      profile: {
        stagesProgress: {
          's1-l1': {
            stageId: 's1-l1',
            completed: true,
            starsEarned: 2,
            highScore: 22150,
            bestWpm: 31,
            bestAccuracy: 100,
            bestStreak: 40,
            timesPlayed: 2,
            lastPlayedAt: 1792904921385,
          },
        },
      },
    });

    expect(screen.getByText(/2 Stars Earned/)).toBeTruthy();
  });
});
