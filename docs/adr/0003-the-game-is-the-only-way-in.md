# The `Game` is the only way in

Everything outside `src/game/` talks to the game through the `Game` that `createGame` returns: it reads with `getState()` and `subscribe`, acts with `send`, `pressKey` and the Profile commands, and hears what just happened with `onMoment`. The Zustand store and the machine's actor are private to it. Sound and the Action Deck are attached from outside, and the real adapters (the sound engine, localStorage, the browser's keys and frames) are only built by the composition root, `src/app/`. We chose this because the screens used to reach into the store, `App` pushed the settings into the sound engine, sound went through a 19-method port, and the keyboard, the sound and the deck were wired by imperative glue spread over several modules: no test or reader could say what the game's surface was, and each of those paths could disagree with the others.

## What goes through the one door

- **One settled snapshot.** `getState()` is the Run, the Profile, the screen, the Run phase and the rest, settled as ADR-0001 amends. Screens read it and send what the player did.
- **Sound is state plus cues.** Everything continuous (mute, volumes, theme, Synthesizer Voice, whether the beat plays, its Overdrive layer) is derived from the snapshot and synced to the sound port when it changes; each moment maps to its one-shot cues. The port is `{ sync, play }`, and the silent one is two no-ops.
- **One moments channel.** `onMoment` announces each Judgement, Overdrive's ignition, the Stage clear, an Upgrade bought and a trail equipped. A moment is heard once the move that made it has settled, so `getState()` already shows its effects. Sound plays its cues first, then the other listeners (the Action Deck) hear it. Neither looks up the key table to find a hit's lane or finger.
- **The keyboard and the deck attach from outside.** The keyboard adapter owns keys, Esc and focus loss, and passes every keydown on, because which keys count is the game's call. An Esc a UI element swallowed for itself is not the game's; the contract is in `src/app/attachKeyboard.ts`. The deck gets the game from the provider the composition root fills; nothing below it imports the app's game. Keycap clicks are key presses.

## The shape behind it

- The rules own the whole keystroke and the whole step as pure functions over one Run state. The Run module applies a result in one `set`, tells its moments, and only then reports `cleared` to the machine, so nothing re-enters the Run mid-keystroke.
- One store is built from a Run module and a Profile module, with one direction: Run → Profile. The Run reads the Profile live on each call and hands it a cleared Stage's result. The Profile imports nothing from the Run or the machine.
- The one step that crosses lives in the `Game`, which holds both: wipe and reset go back to the first Stage unless a Run is on show.

## Consequences

- A test builds its own `createGame`, sets up and plays it through the same door as the app, and reads `getState()`; there is no second interface to keep in step. A silent or recording sound adapter replaces the engine, so the sound tests check the state and cues the player would hear, not the engine's calls.
- Screens may still import pure helpers and constants from `src/game/` and `src/curriculum/`. They never reach the store, and what they import has no state.
- Adding behaviour means a method on the `Game`, a moment or a field of the snapshot, then its screen. That is more steps than calling into the store was; the gain is that the surface is one file to read and one test setup.
