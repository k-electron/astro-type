# Analytics is its own module beside the game

What the game measures about the player's typing lives in `src/analytics/`, next to `src/curriculum/`. From `src/curriculum/` it imports only the key and finger table, never the Sectors and Stages, and nothing in it imports `src/game/`. It is a handful of pure functions with no state of its own:

- one adds a Keystroke to a Run's Flight log;
- one folds a cleared Run into the Logbook;
- one works out a Run's report for the Debrief;
- one works out the journey's report for Analytics;
- and the schema of the Logbook's part of the Save.

The game's store still holds the data and calls these functions, so ADR-0001 and ADR-0003 stand. `strike` builds each Keystroke, the Profile folds the Run at the clear, and screens read the reports.

We chose this over a folder inside `src/game/` so the measures can't reach into the Run's rules. With the module apart, a new Stage, Sector, key or generated practice Stage needs no change in analytics, and the next phase can choose practice from the Logbook without touching the game. Before this, the per-key counting was spread across `strike`, the Profile's result merge and the Analytics screen's own sums.

## Consequences

- The Logbook is the Profile's analytics: today's `keyAnalytics` and lifetime totals move into it, and the Profile keeps Stars, Credits, Cosmetics, settings and Stage progress. Analytics owns the Logbook's schema, but `SAVE_VERSION` stays in `schemas.ts`, and any change to the Logbook's schema raises it.
- Inside the module there is one file per measure (keys, Letter pairs, Mix-ups, Shift side, Runs), each owning its slice of the schema, its part of the fold and its part of both reports. A new measure is a new file plus one line where they're combined. There's no plugin registry: nothing else calls it.
- A Run's report is worked out once, at the clear, and rides on the Debrief result; the Flight log is never saved. The journey's report is worked out by the Analytics screen from the Logbook, so a settings change doesn't recompute it.
- Its tests sit at its interface, per ADR-0002, plus one journey through the `Game`.
- The Logbook records how the player types, not their progress, so a revamp of the Stages, storyline or progression changes neither the module nor its data. It is keyed by characters, Letter pairs, dates and Runs. Each cleared Run brings a copy of where it was flown (its Sector's and Stage's ids and names as they were that day, or none for practice), and nothing is looked up in the curriculum later: a Sector's place in the journey is the day it was first reached, and the keys it brought in are the keys first typed in it. Stars, score and gates never enter it.
