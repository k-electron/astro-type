# astro-type

A browser typing game that teaches touch typing. Drones fall down the Action Deck, each carrying one character, and the player types them as they reach the Strike Line. The words and terms below are defined in [`GLOSSARY.md`](GLOSSARY.md).

## What the game does

- **Curriculum:** 7 Sectors of 4 Stages each, 28 Stages in all. Each Stage is a fixed text with its own goal. A cleared Run earns the Stage 0 to 3 Stars, from accuracy, WPM and Streak, and a Stage keeps its best. Stars open new Sectors, up to 84 in total.
- **Galaxy Map:** where the player picks a Stage from the Sectors.
- **Flight Deck:** where a Run is played. It shows the HUD (score, Multiplier, WPM, accuracy, Streak), the text prompt and the Action Deck, with the lanes, Drones, keyboard and the hands showing which finger to use.
- **Judgement:** each keystroke is a Perfect, Great or Good hit by how close the Drone was to the Strike Line, or a Miss for a wrong key.
- **Streak, Multiplier and Overdrive:** correct keystrokes in a row build the Streak, which raises the Multiplier from x1 to x4. Correct keystrokes also fill the Overdrive meter, and a full meter starts Overdrive, which doubles the score of each hit. A Miss resets the Streak and ends Overdrive unless a shield absorbs it.
- **Debrief:** when a Run is cleared, it shows the result, the Stars earned and the Credits paid.
- **Hangar:** spend Credits on Upgrades (shields, reactor, sensors) and Cosmetics (a trail theme or an audio core).
- **Analytics:** lifetime totals (best speed, accuracy, words typed, practice time), hand balance and a per-key accuracy heatmap, with exporting and importing a Backup.
- **Free Flight:** set up a Stage from your own text, a target speed and how fast the Drones fall.
- **Sound:** sound effects and music are synthesized with the Web Audio API. There are no audio files.
- **Your data:** the Profile is saved in this browser's localStorage. There are no accounts and no analytics.

## Controls

| Action                                                    | Control                                        |
| :-------------------------------------------------------- | :--------------------------------------------- |
| Type a Drone's character                                  | The matching key on your keyboard              |
| Type it with the mouse or touch                           | Click or tap a key on the on-screen keyboard   |
| Pause a running Run                                       | `Esc`, or the Pause button in the HUD          |
| Resume from the Pause Menu                                | `Esc`, or the Resume Flight button             |
| Close a menu (Galaxy Map, Hangar, Analytics, Free Flight) | `Esc`, or its own Close, Back or Cancel button |
| Hide or show the key legends on the on-screen keyboard    | Hide Deck / Show Deck in the HUD               |
| Show or hide the hands                                    | The Hands button in the Action Deck header     |

A Run also pauses when the tab or window loses focus. The Pause Menu offers resume, restart, and exit to the Galaxy Map or Academy Home.

## Stack

React, Tailwind CSS, a Zustand store for the game's data and an XState machine for the screens, built with Vite. The built `dist/` is served as static assets from Cloudflare Workers. The package manager is pnpm.

## Development

Use the Node version in `.node-version` and the pnpm version pinned in `package.json`.

```bash
pnpm install
pnpm dev        # Vite dev server on http://localhost:3000
pnpm build      # production build into dist/
pnpm preview    # serve dist/ locally
pnpm test       # unit tests (Vitest)
pnpm test:browser   # browser tests (Playwright)
pnpm typecheck  # tsc --noEmit
pnpm check      # Biome; fails on errors only
pnpm fix        # apply Biome's safe fixes and formatting
pnpm verify     # typecheck, check, test, build and test:browser: what CI runs
pnpm smoke <url>    # check that a deployed URL serves the app and a Stage starts
```

The browser tests need Chromium, which `pnpm exec playwright install chromium` installs.

## Deploying

Every push to `main` runs `pnpm verify` in GitHub Actions. If it passes, the build is deployed to https://astro-type.k-electron.workers.dev and smoke-tested there. Pull requests run the checks without deploying.

## License

MIT. See [LICENSE](LICENSE).
