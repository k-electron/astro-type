# PROTOTYPE: what the Detour generator builds

Throwaway, never merged. Answers [What the generator builds](https://github.com/k-electron/astro-type/issues/189) on the map [Phase 3](https://github.com/k-electron/astro-type/issues/175).

- `generator.js`: the pure generator (one Detour request in, one Stage out; integer-only seeded random numbers).
- `build.mjs`: the ahead-of-time step: Word list from SCOWL sizes 10/20/35 (a stand-in for the decided SCOWL + 12dicts list), vetted with obscenity plus a stand-in topic list, and vetted made-up words for Sector 1 Waypoints.
- `template.html` + `assemble.mjs` → `index.html` (the page; the generator is inlined).
- `path.json`: the Waypoints, from `prototype/path-outline`.

Rebuild the data (not committed; derived from SCOWL):

```sh
npm i obscenity@0.4.5
node build.mjs <SCOWL 2020.12.07 final/ dir> > data.js
node assemble.mjs   # writes index.html and data.json
```

Then open `index.html` beside `data.js`.

## Walkthrough videos

`video/`: 14 narrated videos of generated Detour Stages played in the real game (through Free Flight) by a model learner tuned to each point on the Path (`typist.mjs`, after `beginner.ts` on `prototype/debrief-flight-log`). `script.mjs` holds what each video plays and says; `record.mjs` records one with Playwright (dev server on :3000, voice from macOS `say`); `post.py` fast-forwards the long stretches and muxes the voice with Homebrew ffmpeg; `page.mjs` writes the page. `one.sh <id>` does one video end to end. The MP4s are not committed (private artifact).
