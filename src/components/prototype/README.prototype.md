# Prototype: can a PixiJS Action Deck match today's look and feel? (#9)

Throwaway. Lives on `prototype/pixi-action-deck`, never on `main`. The only change
to existing files is `export` on `KeySpec`/`KEYBOARD_ROWS` and the swap in `App.tsx`.

## Run it

```
pnpm dev            # then open one of:
/?variant=dom       today's Action Deck (reference)
/?variant=pixi      PixiJS Action Deck (same frame, DOM header bar kept)
/?variant=overlay   Pixi at 55% over the live DOM deck
/?variant=diff      Pixi blended with `difference` over the DOM deck (identical = black)
```

Start a Stage, then flip with the bar at the bottom. No arrow-key shortcuts: arrows
would count as typed keys. `window.__pixiProbe` exposes frame count, fps, Drone and
keycap rects for checks.

## Verdict: yes, with the conditions below

Measured in a real browser (Chromium on an Apple M4, Metal), not SwiftShader.

| Check | Result |
| --- | --- |
| Renders every frame, Drones move | 149 of 150 animation frames rendered at 60 fps; Drones glide into place on Stage start. On screen: the `diff` variant shot 150 ms after `startStage` shows no double-imaged Drones, only text anti-aliasing residue. (Computed Drone `top` also matches the DOM to 0.000 px, but both sides run the same formula, so that proves the formula was copied, not what was drawn.) |
| Layout | all 60 keycaps within 1.21 px of the DOM at 1100, 1280, 1440 and 1920 px wide; hands on and off, including the narrow case (1100 px: deck 772 px wide with hands, 896 px without) loaded fresh, toggled live, and after a live resize; hand panels at the exact same spot |
| Timing | identical mapping, because Pixi reads the store's `yPercent`; the clock is the store's 60 Hz `setInterval`, not Pixi's ticker |
| Clicking keycaps | 6 of 6 real mouse clicks on the Pixi canvas advanced the Stage with PERFECT hits; same synthetic `KeyboardEvent` path as today |
| Frame time while typing (DPR 2, 30 keys, explosions overlapping) | Pixi: steady 16.7 ms, 0 frames over 25 ms at every speed. DOM deck: ~60 WPM (200 ms/key) avg 27 ms, 117 of 247 frames over 25 ms, worst 166 ms; ~100 WPM (120 ms/key) avg 31 ms, 96 of 138 over 25 ms; a 300 WPM stress (40 ms/key) avg 42-46 ms. The cost is in the DOM deck component (both variants re-render `App` at 60 Hz) |
| Retina text | crisp at DPR 2 in both; Pixi legends are slightly lighter in weight than the DOM's |
| Victory modal + confetti | `canvas-confetti`'s own fixed canvas (z-100) draws above the modal; the blurred Pixi deck behind it keeps rendering at 60 fps |
| Bundle | main chunk 570 kB -> 896 kB (gzip 161 -> 260 kB) with a plain `pixi.js` import; not tuned |

One machine (M4), driven by Playwright keypresses; feel and smoothness still need Karim playing it on his own display.

## Where each effect lives

Rule: anchored to something inside the Action Deck -> PixiJS. Belongs to the page or
a modal -> DOM.

| Effect | Home |
| --- | --- |
| Lasers, muzzle flash, lock-on brackets | PixiJS |
| Explosions: flash, debris, sparks, crystals, shockwaves, vaporising Drone | PixiJS |
| Rating popups ("DRONE DESTROYED! +100", "WRONG KEY") | PixiJS (pooled `Text`) |
| Ship, guidance beam, Drone thrusters and lights, keycap glow | PixiJS |
| Flight Deck header bar (Hands toggle, WARP badge, streak) | DOM |
| HUD, text prompt, modals | DOM |
| Starfield / hyperwarp background | its own page-wide canvas, unchanged; the Pixi canvas is transparent |
| Victory confetti | DOM side, its own fixed canvas above the modal |

Nothing needs to cross the boundary in pixels today: no effect leaves the stage.
Pixi -> HUD/score goes through the store.

## What this found (for #10, #12, #13 and the build)

- **Hits must be event-driven.** `lastPressedKey` is cleared on keyup, so a per-frame
  read can miss the wrong key for a MISS laser. The scene uses `useGameStore.subscribe`.
- **Mount one Application for the session.** Destroying one logs
  `[BindGroup] ... destroyed while still bound` (once per unmount, harmless but noisy);
  rapid variant switching otherwise left no leaks, one canvas, 60 fps.
- **Compute layout, don't measure it.** The DOM deck's active keycap gets `border-2` and
  `scale-1.02`, which nudges its neighbours up to ~1.2 px on every keystroke; a computed
  layout is stable. Needs the stage width only (sm: constants copied from the DOM deck).
- **The original FX are frame-coupled** (per-frame constants), so they run 2x speed on a
  120 Hz display. The Pixi port scales by delta time.
- **Store ticks, not time, move the Drones** (fixed step per tick). On a 120 Hz display
  each tick shows for 2 frames; interpolating between ticks is a #12 question.
- **Glows**: `BlurFilter` + additive blend on a layer was enough; no `pixi-filters`.
  Dashed strokes are not native in v8 (small helper). Gradients own textures: per app.
- **Fonts**: wait for `document.fonts.load` before creating `Text`; set
  `resolution: devicePixelRatio, autoDensity: true`.
- **Known gaps vs DOM (polish, not blockers)**: hand halo pulse animation, Drone wings
  are closed boxes (DOM has three sides), 1 px text anti-aliasing differences, no
  drop-shadows under the hand panels or deck.
- **Out of scope here**: phone/tablet layout (out of scope for v1), `prefers-reduced-motion`,
  keyboard focus/a11y of keycaps (canvas keycaps have none; the DOM deck's are divs too).
