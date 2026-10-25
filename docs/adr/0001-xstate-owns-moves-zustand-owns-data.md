# XState owns moves, Zustand owns data

The XState machine is the only authority on which screen is showing and what phase the Run is in (running, paused, cleared, abandoned). Zustand holds data only: the live Run, the Debrief result and the profile, with no copy of the screen. UI sends the machine what the player did, not where to go, and every side effect caused by a move (beat start/stop, combo reset, setting up or abandoning a Run, scoring, saving and fanfare on clear) runs inside the machine's handling of that move, through named store actions. We chose this because the old seam ran side effects in the store first and then sent an event the machine could silently drop, which left modals stuck and the beat playing behind menus.

## Consequences

- The store never sets the screen; it reads the machine's Run phase only to gate data changes (for example, ignoring keystrokes unless the Run is running).
- Typing the last character only reports "Run cleared"; the result is computed and saved when the machine moves to the Debrief, so the Debrief can never open without a result.
- A move the machine refuses is a bug: it changes nothing on screen, warns in dev builds, and fails any test that triggers it.
- Player-driven effects outside a move (keystroke judgement and sounds, settings toggles, Hangar purchases) stay in the store.
