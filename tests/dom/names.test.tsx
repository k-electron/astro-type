import { describe, expect, it } from 'vitest';
import { type Player, renderGame, screen, within } from './harness';
import { BANNED_NAME } from '../shared/names';
import { clearedStages } from '../shared/saves';

// One name for each thing: the game says Streak and Overdrive, never combo,
// hyperspace or warp (GLOSSARY.md: Streak, Multiplier and Overdrive each list
// those as words to avoid). Each test walks one screen a player can reach and
// reads every piece of text on it.
//
// Not here, because a DOM has no head and no canvas: the page's <title> and
// the names the Action Deck's canvas gives its Drones and keycaps. The browser
// journey J4 reads those on the real page. The hit popups' text is checked
// against the same words in hitPopups.test.ts.

/** The attributes that put words in front of a player, a screen reader or a tooltip. */
const NAMING_ATTRIBUTES = ['aria-label', 'title', 'alt', 'placeholder'];

/**
 * Every piece of text on the screen as it is now: each text node on its own
 * (so neighbours are never glued into a new word), and the accessible names,
 * tooltips, image descriptions and placeholders.
 */
function textOnScreen(): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    found.push(node.textContent ?? '');
  }
  for (const element of document.body.querySelectorAll('*')) {
    for (const attribute of NAMING_ATTRIBUTES) {
      found.push(element.getAttribute(attribute) ?? '');
    }
  }
  return [...new Set(found.map((line) => line.trim()).filter(Boolean))];
}

/**
 * Fails with the offending lines when the screen uses a banned word. A screen
 * that is not the one meant would pass by saying nothing, so `onThisScreen`
 * is something that must be there to read.
 */
function expectNoBannedNames(onThisScreen: string | RegExp) {
  const lines = textOnScreen();
  expect(
    lines.some((line) =>
      typeof onThisScreen === 'string'
        ? line.includes(onThisScreen)
        : onThisScreen.test(line),
    ),
    `the screen should say ${onThisScreen}`,
  ).toBe(true);
  expect(
    lines.filter((line) => BANNED_NAME.test(line)),
    'text that uses combo, hyperspace or warp',
  ).toEqual([]);
}

/** Types enough of the first Stage that Overdrive turns on. */
function startOverdrive(player: Player) {
  player.click('Start Mission');
  player.typePrompt({ characters: 32 });
  // The "Overdrive Meter" is always there; the badge reads OVERDRIVE x2 only
  // while Overdrive is on.
  expect(
    within(screen.getByRole('region', { name: 'HUD' })).getByText(
      /^OVERDRIVE x\d+$/,
    ),
  ).toBeTruthy();
}

describe('the glossary names', () => {
  it('Academy Home uses them', () => {
    renderGame();

    expectNoBannedNames('Begin Home Row Mission');
  });

  it('the Flight Deck uses them, and the HUD shows the Streak', () => {
    const player = renderGame();
    player.click('Start Mission');
    player.typePrompt({ characters: 6 });

    const hud = within(screen.getByRole('region', { name: 'HUD' }));
    expect(hud.getByText(/^Streak$/i)).toBeTruthy();
    expect(hud.getByText(/^Streak$/i).parentElement?.textContent).toMatch(
      /Streak\s*6/i,
    );
    expectNoBannedNames('Pause');
  });

  it('the Flight Deck after a Miss uses them', () => {
    const player = renderGame();
    player.click('Start Mission');
    player.typePrompt({ characters: 6 });
    player.press('z');
    player.step(30);

    expect(screen.getByRole('region', { name: 'HUD' }).textContent).toMatch(
      /Streak\s*0/i,
    );
    expectNoBannedNames('Pause');
  });

  it('the HUD shows an Overdrive label while Overdrive is active', () => {
    const player = renderGame();

    startOverdrive(player);

    expect(
      within(screen.getByRole('region', { name: 'HUD' })).getByText(
        /^Streak$/i,
      ),
    ).toBeTruthy();
    expectNoBannedNames(/^OVERDRIVE x\d+$/);
  });

  it('the Pause Menu uses them, with Overdrive active behind it', () => {
    const player = renderGame();
    startOverdrive(player);

    player.click('Pause');

    expect(screen.getByRole('dialog', { name: 'Mission Paused' })).toBeTruthy();
    expectNoBannedNames('Mission Paused');
  });

  it('the Galaxy Map uses them', () => {
    renderGame().openHeader('Sectors');

    expectNoBannedNames('Flight Sectors & Missions');
  });

  it('the Hangar uses them', () => {
    renderGame().openHeader('Hangar');

    expectNoBannedNames('Starship Hangar Upgrades');
  });

  it('Analytics uses them', () => {
    renderGame().openHeader('Analytics');

    expectNoBannedNames('Typing Analytics & Heatmap');
  });

  it('Analytics uses them once a Run has been played', () => {
    const player = renderGame();
    player.click('Start Mission');
    player.typePrompt();
    player.openHeader('Analytics');

    expectNoBannedNames('Typing Analytics & Heatmap');
  });

  it('Free Flight uses them', () => {
    renderGame().openHeader('Free Flight');

    expectNoBannedNames('Custom Typing Practice');
  });

  it('the audio settings use them', () => {
    const player = renderGame();

    player.click('Open Audio Flight Deck Settings');

    expectNoBannedNames('Flight Audio Station');
  });

  it('the Debrief of a 3-star Stage, with its Sector unlock, uses them', () => {
    // 3 Stars already: clearing Stage 1 for 3 more takes the fleet to 6,
    // which opens Sector 02, so the Debrief's unlock notice is on screen.
    const player = renderGame({ profile: clearedStages({ 's1-l2': 3 }) });
    player.click('Start Mission');
    player.typePrompt();

    expect(screen.getByText(/New Sector Unlocked/)).toBeTruthy();
    expectNoBannedNames(/Mission Debriefing/);
  });

  it('the Debrief of a Free Flight, cleared with Misses, uses them', () => {
    const player = renderGame({ text: 'abcdef' });
    player.press('x');
    player.press('y');
    player.typePrompt();

    expect(screen.getByText(/Mission Debriefing/)).toBeTruthy();
    expectNoBannedNames(/Mission Debriefing/);
  });

  it('the Hangar opened from the Flight Deck uses them', () => {
    const player = renderGame();
    startOverdrive(player);

    player.openHeader('Hangar');

    expect(
      screen.getByRole('heading', { name: 'Starship Hangar Upgrades' }),
    ).toBeTruthy();
    expectNoBannedNames('Starship Hangar Upgrades');
  });
});
