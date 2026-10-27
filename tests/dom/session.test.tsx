import { describe, expect, it } from 'vitest';
import { renderGame, screen } from './harness';

describe('reloading the page', () => {
  it('brings back what the game saved and drops the Run', () => {
    const player = renderGame({ text: 'ff jj' });
    player.type('ff jj');
    const credits = screen.getByTitle(/Starship Credits/).textContent;
    expect(credits).not.toBe('0Cr');

    player.reload();

    expect(screen.getByTitle(/Starship Credits/).textContent).toBe(credits);
    expect(
      screen.getByRole('heading', { name: /Cosmic Touch Typing/ }),
    ).toBeTruthy();
  });
});

describe('the Action Deck header', () => {
  it('shows the Hands toggle, which flips when pressed', () => {
    const player = renderGame({ text: 'ff jj' });
    expect(screen.getByRole('button', { name: /Hands: ON/ })).toBeTruthy();

    player.click(/Hands: ON/);

    expect(screen.getByRole('button', { name: /Hands: OFF/ })).toBeTruthy();
  });
});
