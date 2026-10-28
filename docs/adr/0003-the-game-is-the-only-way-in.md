# The `Game` is the only way in

Everything outside `src/game/` talks to the game through the `Game` that `createGame` returns: `getState()` and `subscribe` to read, `send`, `pressKey`, `releaseKey`, `step`, `changeSettings`, `buy`, `importBackup`, `wipeAchievements` and `resetProgress` to act, and `onMoment` to hear what just happened. The Zustand store and the machine's actor are private to it. Sound and the Action Deck are attached from outside, and the real adapters (the sound engine, localStorage, the browser's keys and frames) are only built by the composition root, `src/app/`. We chose this because the screens used to reach into the store, `App` pushed the settings into the sound engine, sound went through a 19-method port, and the keyboard, the sound and the deck were wired by imperative glue spread over several modules: no test or reader could say what the game's surface was, and each of those paths could disagree with the others.

## What goes through the one door

- **One settled snapshot.** `getState()` is the Run, the Profile, the screen, the Run phase and the rest, settled as ADR-0001 amends. Screens read it with `useGameState(selector)` and send what the player did.
- **Sound is state plus cues.** `soundStateOf(profile, phase, run)` derives everything continuous (mute, volumes, theme, Synthesizer Voice, whether the beat plays, its Overdrive layer), and the `Game` calls `sync` when it changes. `cueFor(moment)` maps a moment to its one-shot cues for `play`. The sound port is `{ sync, play }`; the silent one is two no-ops. The engine in `src/audio/` is the real adapter, and `App` never imports it.
- **One moments channel.** `onMoment` announces each Judgement (a hit with its grade, points, Overdrive flag and the Drone's id, lane and finger; a Miss; a shield), Overdrive's ignition, the Stage clear, an Upgrade bought and a trail equipped. A moment is heard once the move that made it has settled, so `getState()` already shows its effects. Sound plays its cues first, then the other listeners (the Action Deck) hear it. Neither looks up the key table to find a hit's lane or finger.
- **The keyboard and the deck attach from outside.** `attachKeyboard(game, window)` owns keys, Esc and focus loss (blur, tab hidden). Which keys count is the game's call, so it passes every keydown on with its modifiers. Its Esc contract: the listener is on `window`, so a UI element that uses Esc for itself swallows it with `preventDefault()` on the keydown; an Esc nobody swallowed is the game's. The deck gets `{ game, onFrame }` from `GameProvider`, which the composition root fills; nothing below it imports the app's game. Keycap clicks call `pressKey` and `releaseKey`.

## The shape behind it

- The rules own the whole keystroke and the whole step as pure functions over one `RunState`: `strike` (Judgement, scoring, Streak, Overdrive, shields) and `tick` (Drone motion, telemetry). The Run module applies a result in one `set`, tells its moments, and only then reports `cleared` to the machine, so nothing re-enters the Run mid-keystroke.
- One store is built from a Run module and a Profile module, with one direction: Run → Profile. The Run reads the Profile through `loadoutOf`, live on each call, and hands it a cleared Stage's result. The Profile imports nothing from the Run or the machine.
- The one step that crosses lives in the `Game`, which holds both: wipe and reset go back to the first Stage unless a Run is on show.

## Consequences

- A test builds its own `createGame`, sets up and plays it through the same door as the app, and reads `getState()`; there is no second interface to keep in step. `silentSound` or a recording adapter replaces the engine, so the sound tests check the state and cues the player would hear, not the engine's calls.
- A new sound setting is a schema field, a `SoundState` field with its line in `soundStateOf`, and one line in the adapter's `sync`. A new one-shot is a moment, a `cueFor` case and a case in the adapter's `play`. Nothing else knows.
- `buy` returns whether it bought or equipped something, so a caller can tell a refusal from a purchase (only tests read it today; the Hangar just calls it). A Synthesizer Voice raises no moment; it is sound state and just starts sounding.
- Screens may still import pure helpers and constants from `src/game/` and `src/curriculum/` (`isSectorUnlocked`, the catalog, `overdriveScoreFactor`). They never reach the store, and what they import has no state.
- Adding behaviour means a method on the `Game`, a moment or a field of the snapshot, then its screen. That is more steps than calling into the store was; the gain is that the surface is one file to read (`game.ts`) and one test setup.
