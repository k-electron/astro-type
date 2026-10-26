import { describe, expect, it } from 'vitest';
import { type HeaderButton, renderGame, screen } from './harness';

/** Each header button that opens a screen, and the heading of that screen. */
const MENUS: [Exclude<HeaderButton, 'Home'>, string][] = [
  ['Sectors', 'Flight Sectors & Missions'],
  ['Hangar', 'Starship Hangar Upgrades'],
  ['Analytics', 'Typing Analytics & Heatmap'],
  ['Free Flight', 'Custom Typing Practice'],
];

describe('the header', () => {
  it.each(MENUS)(
    '%s, pressed twice, leaves one Back button',
    (button, heading) => {
      const player = renderGame();

      player.openHeader(button);
      player.openHeader(button);

      expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
      expect(screen.getAllByRole('button', { name: /^Back to / })).toHaveLength(
        1,
      );
    },
  );

  it('Back, after the same button was pressed twice, returns to Academy Home', () => {
    const player = renderGame();
    player.openHeader('Hangar');
    player.openHeader('Hangar');

    player.click('Back to Academy');

    expect(
      screen.getByRole('heading', { name: /Cosmic Touch Typing/ }),
    ).toBeTruthy();
  });
});
