import { describe, expect, it } from 'vitest';
import { BANNED_NAME } from '../shared/names';
import { clearedStages, RETURNING_PLAYER } from '../shared/saves';
import {
  BEGIN_HOME_ROW,
  DEBRIEF_TITLE,
  HUD_NAME,
  LAUNCH_STAGE,
  MENU_HEADINGS,
  PAUSE_MENU_NAME,
  PRACTICE_TIME,
  START_STAGE,
  STREAK_ALARMS,
  WIPE_SECTORS_LINE,
  YOUR_TEXT,
} from '../shared/screens';
import { type Player, renderGame, screen, within } from './harness';
import { OPEN_AUDIO_PANEL } from '../../src/screens/audioLabels';

// One name for each thing: the game says what GLOSSARY.md says. It never says
// combo, hyperspace or warp (Streak, Multiplier and Overdrive), mission,
// highway, note, debriefing, main menu, cockpit, drill, custom practice or
// rating (Stage and Run, Action Deck, Drone, Debrief, Academy Home, Flight
// Deck, Free Flight, Stars): BANNED_NAME in tests/shared/names.ts has them
// all. Each test walks one screen a player can reach and reads every piece of
// text on it.
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
    'text that uses a name the Glossary drops (see BANNED_NAME)',
  ).toEqual([]);
}

/** Types enough of the first Stage that Overdrive turns on. */
function startOverdrive(player: Player) {
  player.click(START_STAGE);
  player.typePrompt({ characters: 32 });
  // The "Overdrive Meter" is always there; the badge reads OVERDRIVE x2 only
  // while Overdrive is on.
  expect(
    within(screen.getByRole('region', { name: HUD_NAME })).getByText(
      /^OVERDRIVE x\d+$/,
    ),
  ).toBeTruthy();
}

describe('the glossary names', () => {
  it('Academy Home uses them', () => {
    renderGame();

    expectNoBannedNames(BEGIN_HOME_ROW);
  });

  it('the Flight Deck uses them, and the HUD shows the Streak', () => {
    const player = renderGame();
    player.click(START_STAGE);
    player.typePrompt({ characters: 6 });

    const hud = within(screen.getByRole('region', { name: HUD_NAME }));
    expect(hud.getByText(/^Streak$/i)).toBeTruthy();
    expect(hud.getByText(/^Streak$/i).parentElement?.textContent).toMatch(
      /Streak\s*6/i,
    );
    expectNoBannedNames('Pause');
  });

  it('the Flight Deck after a Miss uses them', () => {
    const player = renderGame();
    player.click(START_STAGE);
    player.typePrompt({ characters: 6 });
    player.press('z');
    player.step(30);

    expect(screen.getByRole('region', { name: HUD_NAME }).textContent).toMatch(
      /Streak\s*0/i,
    );
    expectNoBannedNames('Pause');
  });

  it('the HUD shows an Overdrive label while Overdrive is active', () => {
    const player = renderGame();

    startOverdrive(player);

    expect(
      within(screen.getByRole('region', { name: HUD_NAME })).getByText(
        /^Streak$/i,
      ),
    ).toBeTruthy();
    expectNoBannedNames(/^OVERDRIVE x\d+$/);
  });

  it('the Pause Menu uses them, with Overdrive active behind it', () => {
    const player = renderGame();
    startOverdrive(player);

    player.click('Pause');

    expect(screen.getByRole('dialog', { name: PAUSE_MENU_NAME })).toBeTruthy();
    expectNoBannedNames(PAUSE_MENU_NAME);
  });

  it('the Galaxy Map uses them', () => {
    // A Save with a Stage cleared: its card offers Replay Stage, the others
    // Launch Stage.
    renderGame({ profile: RETURNING_PLAYER }).openHeader('Galaxy Map');

    expectNoBannedNames(LAUNCH_STAGE);
  });

  it('the Galaxy Map opened over a paused Run uses them', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click(START_STAGE);
    player.typePrompt({ characters: 3 });
    player.openHeader('Galaxy Map');

    expectNoBannedNames(LAUNCH_STAGE);
  });

  it('the Wipe confirmation uses them', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Galaxy Map');
    player.click(/^Wipe Achievements/);

    expectNoBannedNames(WIPE_SECTORS_LINE);
  });

  it('the Factory Reset confirmation uses them', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');
    player.click('Factory Reset');

    expectNoBannedNames('Confirm Reset');
  });

  it('the Hangar uses them', () => {
    renderGame().openHeader('Hangar');

    expectNoBannedNames(MENU_HEADINGS.Hangar);
  });

  it('Analytics uses them', () => {
    renderGame().openHeader('Analytics');

    expectNoBannedNames(MENU_HEADINGS.Analytics);
  });

  it('Analytics uses them once a Run has been played', () => {
    const player = renderGame();
    player.click(START_STAGE);
    player.typePrompt();
    player.openHeader('Analytics');

    expectNoBannedNames(MENU_HEADINGS.Analytics);
  });

  it('Free Flight uses them', () => {
    renderGame().openHeader('Free Flight');

    expectNoBannedNames(YOUR_TEXT);
  });

  it('the audio settings use them', () => {
    const player = renderGame();

    player.click(OPEN_AUDIO_PANEL);

    expectNoBannedNames('Flight Audio Station');
  });

  it('the Debrief of a 3-star Stage, with its Sector unlock, uses them', () => {
    // 3 Stars already: clearing Stage 1 for 3 more takes the fleet to 6,
    // which opens Sector 02, so the Debrief's unlock notice is on screen.
    const player = renderGame({ profile: clearedStages({ 's1-l2': 3 }) });
    player.click(START_STAGE);
    player.typePrompt();

    expect(screen.getByText(/New Sector Unlocked/)).toBeTruthy();
    expectNoBannedNames(DEBRIEF_TITLE);
  });

  it('the Debrief of a Free Flight, cleared with Misses, uses them', () => {
    const player = renderGame({ text: 'abcdef' });
    player.press('x');
    player.press('y');
    player.typePrompt();

    expect(screen.getByText(DEBRIEF_TITLE)).toBeTruthy();
    expectNoBannedNames(DEBRIEF_TITLE);
  });

  it('the Hangar opened from the Flight Deck uses them', () => {
    const player = renderGame();
    startOverdrive(player);

    player.openHeader('Hangar');

    expect(
      screen.getByRole('heading', { name: MENU_HEADINGS.Hangar }),
    ).toBeTruthy();
    expectNoBannedNames(MENU_HEADINGS.Hangar);
  });

  it('keeps the names the Glossary has no quarrel with: Streak alarms and Practice Time', () => {
    const player = renderGame();

    player.click(OPEN_AUDIO_PANEL);
    expect(document.body.textContent).toContain(STREAK_ALARMS);
    player.openHeader('Analytics');
    expect(document.body.textContent).toContain(PRACTICE_TIME);
  });
});
