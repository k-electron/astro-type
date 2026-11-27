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
