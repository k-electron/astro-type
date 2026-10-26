import { describe, expect, it } from 'vitest';
import { renderGame, screen } from './harness';

describe('leaving the page mid-Run', () => {
  it('pauses the Run when the window loses focus', () => {
    const player = renderGame({ text: 'ff jj' });
    player.type('f');

    player.blur();

    expect(screen.getByRole('dialog', { name: 'Mission Paused' })).toBeTruthy();
  });

  it('pauses the Run when the tab is hidden', () => {
    const player = renderGame({ text: 'ff jj' });

    player.hideTab();

    expect(screen.getByRole('dialog', { name: 'Mission Paused' })).toBeTruthy();
  });

  it('does not pause on Academy Home', () => {
    const player = renderGame();

    player.blur();
    player.hideTab();

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

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
