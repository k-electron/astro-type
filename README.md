# astro-type

A browser typing game that teaches touch typing. Drones fall down the Action Deck, each carrying one character, and you type them as they reach the Strike Line.

**Play it: https://astro-type.k-electron.workers.dev**

The capitalised terms are defined in [`GLOSSARY.md`](GLOSSARY.md).

## What the game does

- **Curriculum:** 7 Sectors of 4 Stages each, 28 Stages in all. Each Stage is a fixed text with its own goal. A cleared Run earns the Stage 0 to 3 Stars, from accuracy, WPM and Streak, and a Stage keeps its best. The 28 Stages give at most 84 Stars, and Stars open new Sectors.
- **Galaxy Map:** where you pick a Stage from the Sectors.
- **Flight Deck:** where a Run is played. It shows the HUD (score, Multiplier, WPM, accuracy, Streak, shields), the text prompt and the Action Deck, with the lanes, Drones, keyboard and the hands showing which finger to use.
- **Judgement:** each keystroke is a Perfect, Great or Good hit by how close the Drone was to the Strike Line, or a Miss for a wrong key.
- **Streak, Multiplier and Overdrive:** correct keystrokes in a row build the Streak, which raises the Multiplier from x1 to x4. Correct keystrokes also fill the Overdrive meter, and a full meter starts Overdrive, which doubles the score of each hit. A Miss resets the Streak and ends Overdrive unless a shield absorbs it.
- **Debrief:** when a Run is cleared, it shows the result, the Stars earned and the Credits paid.
- **Hangar:** spend Credits on Upgrades (shields, reactor, sensors) and Cosmetics (a trail theme or an audio core).
- **Analytics:** lifetime totals (highest speed, accuracy, words typed, practice time), hand balance and a per-key accuracy heatmap, with exporting and importing a Backup.
- **Free Flight:** set up a Stage from your own text and a target WPM.
- **Sound:** sound effects and the beat are synthesized with the Web Audio API. There are no audio files.
- **Your data:** your Profile is saved in this browser's localStorage. There are no accounts and no analytics.

## Controls

| Action                                                    | Control                                      |
| :-------------------------------------------------------- | :------------------------------------------- |
| Type a Drone's character                                  | The matching key on your keyboard            |
| Type it with the mouse or touch                           | Click or tap a key on the on-screen keyboard |
| Pause a running Run                                       | `Esc`, or the Pause button in the HUD        |
| Resume from the Pause Menu                                | `Esc`, or the Resume Flight button           |
| Close a menu (Galaxy Map, Hangar, Analytics, Free Flight) | `Esc`, or its own Back to ... button         |
| Hide or show the key legends on the on-screen keyboard    | Hide Deck / Show Deck in the HUD             |
| Show or hide the hands                                    | The Hands button in the Action Deck header   |

A Run also pauses when the tab or window loses focus. The Pause Menu offers resume, restart, view the Galaxy Map, and exit to Academy Home.

## Stack

React, Tailwind CSS, PixiJS for the Action Deck, a Zustand store for the game's data and an XState machine for the screens, built with Vite. The built `dist/` is served as static assets from Cloudflare Workers. The package manager is pnpm.

## Development

Use the Node version in `.node-version` and the pnpm version in `package.json`.

```bash
pnpm install
pnpm dev        # Vite dev server on http://localhost:3000
pnpm check      # typecheck, Biome and the unit and DOM tests
pnpm verify     # every check before a push; needs Docker and Chromium (see docs/agents/testing.md)
```

`pnpm exec playwright install chromium` installs Chromium for the browser tests. The other scripts are in `package.json`.

## License

MIT. See [LICENSE](LICENSE).
