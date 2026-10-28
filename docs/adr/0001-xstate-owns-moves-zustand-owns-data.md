# XState owns moves, Zustand owns data

The XState machine is the only authority on which screen is showing and what phase the Run is in (running, paused, cleared, abandoned). Zustand holds data only: the live Run, the Debrief result and the profile, with no copy of the screen. UI sends the machine what the player did, not where to go, and every side effect caused by a move (beat start/stop, combo reset, setting up or abandoning a Run, scoring, saving and fanfare on clear) runs inside the machine's handling of that move, through named store actions. We chose this because the old seam ran side effects in the store first and then sent an event the machine could silently drop, which left modals stuck and the beat playing behind menus.

## Consequences

- The store never sets the screen; it reads the machine's Run phase only to gate data changes (for example, ignoring keystrokes unless the Run is running).
- Typing the last character only reports "Run cleared"; the result is computed and saved when the machine moves to the Debrief, so the Debrief can never open without a result.
- A move the machine refuses is a bug: it changes nothing on screen, warns in dev builds, and fails any test that triggers it.
- Player-driven effects outside a move (keystroke judgement and sounds, settings toggles, Hangar purchases) stay in the store.

## Amended 2026-10-27 (phase B restructure)

The decision stands: the machine owns the moves and the store owns the data. The restructure made the line between them a rule you can apply, and changed how they are joined.
- **The test is "who reads it to decide?"** The machine's context holds what its guards and transitions read: the screen, the Run phase (running, paused, cleared, abandoned), the openers stack and the current screen's parameters (they ride on their `OPEN_*` event and show in the snapshot as `screenParams`). The store holds what the rules read and write: the live Run and the Profile. Overdrive is the worked example. It is on or off, which looks like machine state, but no guard reads it, so it lives in the Run.
- **One named crossing.** The `hasNextStage` guard reads the current Stage, which is the Run's. Nothing else in the machine reads the store.
- **The machine declares its effects; the `Game` provides them.** The machine names each effect action (`beginRun`, `abandonRun`, `recordResult`, `releasePressedKey`…) and the `hasNextStage` guard in `setup`, and `createGame` fills them in with `machine.provide`. An effect nobody provided throws, so it can't quietly do nothing. The forwarding interface the machine used to call the store through is gone.
- **One settled snapshot.** A move can touch the machine and the store several times (a clear starts in the store, goes through the machine and ends in the store). `getState()` changes once per move, after both have settled, and `subscribe` fires once per change. A screen never sees the machine and the store disagree.
- **Sound is no longer a machine effect.** The beat starting and stopping and the fanfare on a clear used to be effects of a move. Now the beat is part of the sound state derived from the snapshot, and the fanfare is a cue for the `cleared` moment, so the machine's effects are only the Run's data moves (ADR-0003).
- **Player-driven effects outside a move** (keystrokes, settings, purchases) are still not machine moves, but they now go through the `Game` too. The store is private to it (ADR-0003).
