import { Application } from 'pixi.js';
import { game, onFrame } from '../../appGame';
import type { KeySpec } from '../../data/keyboardLayout';
import { STEP_MS } from '../../game/clock';
import { isJudgement } from '../../game/moments';
import { DeckScene } from './DeckScene';
import { resetPlumeGradients } from './DroneView';
import { DroneMotion } from './droneMotion';
import { FxClock } from './fxClock';
import { resetKeyGradients } from './KeyView';
import { STAGE_HEIGHT } from './layout';
import { resetTextures } from './textures';

/** Give up waiting for fonts after this long, so a blocked font request can't stall the deck. */
const FONT_WAIT_MS = 2000;

/** Keys that hold no character; clicking their keycaps does nothing. */
const MODIFIER_KEYS = new Set([
  'ShiftLeft',
  'ShiftRight',
  'CapsLock',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
]);

/**
 * A click on a keycap is a key press. It sends the same keydown and keyup the
 * keyboard would, so it goes through the game's own handling and Judgement.
 */
function pressKeycap(spec: KeySpec): void {
  if (MODIFIER_KEYS.has(spec.key)) return;
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: spec.key, bubbles: true }),
  );
  setTimeout(() => {
    window.dispatchEvent(
      new KeyboardEvent('keyup', { key: spec.key, bubbles: true }),
    );
  }, 100);
}

async function fontsReady(): Promise<void> {
  // Text is drawn with whatever font is loaded when it is created.
  const loaded = Promise.all([
    // The weights the deck's text asks for (see `deckWeight`).
    document.fonts.load('500 16px "JetBrains Mono"'),
    document.fonts.load('400 16px "JetBrains Mono"'),
  ]).then(() => undefined);
  const timeout = new Promise<void>((resolve) =>
    setTimeout(resolve, FONT_WAIT_MS),
  );
  await Promise.race([loaded, timeout]).catch(() => undefined);
}

/**
 * The one PixiJS Application for the whole session. It is made on the first
 * Flight Deck and kept; on Academy Home its wrapper is taken out of the page
 * and nothing is drawn.
 *
 * It draws from the Run clock's frame loop: every frame while the Run is
 * running, and while the Run is paused (or cleared) only when something the
 * deck shows changes. PixiJS's own ticker is off, so nothing draws on its own.
 */
class DeckSession {
  /** Holds the canvas and PixiJS's accessibility layer. Moves between pages; the canvas never leaves it. */
  readonly wrapper = document.createElement('div');
  private readonly canvas = document.createElement('canvas');
  private app: Application | null = null;
  private scene: DeckScene | null = null;
  private readonly motion = new DroneMotion();
  private readonly fxClock = new FxClock();
  private readonly resizeObserver: ResizeObserver;
  private size: { width: number; height: number } | null = null;
  private visible = false;
  private dirty = true;
  private wasRunning = false;
  /** How far into a step the last drawn frame was. A frozen deck redraws at this. */
  private lastFraction = 0;
  /** After a pause, hold the picture where it was until the first step. */
  private holdFraction: number | null = null;
  private lastRunTime = 0;

  constructor() {
    this.wrapper.style.cssText = 'position:absolute;inset:0;overflow:hidden;';
    this.wrapper.appendChild(this.canvas);
    this.canvas.style.display = 'block';

    this.resizeObserver = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box && box.width > 0 && box.height > 0) {
        this.setSize(box.width, box.height);
      }
    });
    this.resizeObserver.observe(this.wrapper);

    game.store.subscribe((state, previous) => {
      if (state.fallingNotes !== previous.fallingNotes) {
        // A step moves the Run clock; a hit or a new Run does not.
        const runTime = game.getRunTime();
        const stepped = runTime !== this.lastRunTime;
        this.lastRunTime = runTime;
        this.motion.update(state.fallingNotes, stepped);
        if (stepped) this.holdFraction = null;
      }
      // While nothing is drawing on its own, redraw when what the deck shows changes.
      if (
        state.fallingNotes !== previous.fallingNotes ||
        state.lastPressedKey !== previous.lastPressedKey ||
        state.currentStage !== previous.currentStage ||
        state.performance.currentCharIndex !==
          previous.performance.currentCharIndex ||
        state.profile.handsVisible !== previous.profile.handsVisible ||
        state.profile.keyboardVisible !== previous.profile.keyboardVisible
      ) {
        this.dirty = true;
      }
    });
    // Each Judgement fires the ship exactly once, in the lane it landed on.
    game.onMoment((moment) => {
      if (isJudgement(moment)) this.scene?.judge(moment);
    });
    onFrame((fraction) => this.frame(fraction));

    void this.start();
  }

  private async start(): Promise<void> {
    await fontsReady();
    const app = new Application();
    await app.init({
      canvas: this.canvas,
      width: this.size?.width ?? 1280,
      height: this.size?.height ?? STAGE_HEIGHT,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      // The Run clock's frame loop draws; PixiJS's ticker stays off.
      autoStart: false,
      preference: 'webgl',
      // Not "on after Tab", and not "off at the first mouse move": the layer
      // is for every player, all the time.
      accessibilityOptions: {
        enabledByDefault: false,
        activateOnTab: false,
        deactivateOnMouseMove: false,
      },
    });
    // Turned on here, not by `enabledByDefault`: PixiJS 8.22 switches its
    // per-frame update off again when it activates during `init` with the
    // canvas already in the page.
    app.renderer.accessibility.setAccessibilityEnabled(true);
    const layer = app.renderer.accessibility.div;
    layer?.setAttribute('data-deck-a11y', '');
    // Clicking a keycap's button must not give it focus: Enter would then
    // press that keycap again.
    layer?.addEventListener('mousedown', (event) => event.preventDefault());

    this.app = app;
    this.scene = new DeckScene({
      resolution: app.renderer.resolution,
      getState: () => game.store.getState(),
      onPressKey: pressKeycap,
    });
    app.stage.addChild(this.scene.root);
    if (this.size) this.setSize(this.size.width, this.size.height);
    this.dirty = true;
  }

  private setSize(width: number, height: number): void {
    this.size = { width, height };
    if (!this.app || !this.scene) return;
    this.app.renderer.resize(width, height);
    this.scene.resize(width, height);
    this.dirty = true;
  }

  /** Put the deck in the page, inside `slot`, and start drawing it. */
  attach(slot: HTMLElement): void {
    slot.appendChild(this.wrapper);
    this.visible = true;
    this.dirty = true;
    // Also covers the first attach, before the observer has fired.
    const width = slot.clientWidth;
    const height = slot.clientHeight;
    if (width > 0 && height > 0) this.setSize(width, height);
  }

  /** Take the deck out of the page (Academy Home). The Application stays. */
  detach(): void {
    this.visible = false;
    this.wrapper.remove();
  }

  private frame(stepFraction: number): void {
    const { app, scene } = this;
    const phase = game.getPhase();
    const running = phase === 'running';
    if (running && !this.wasRunning) this.holdFraction = this.lastFraction;
    this.wasRunning = running;

    // Effects run on the Run clock: none of it passes while the Run is paused.
    const reading = this.fxClock.advance({
      phase,
      runSteps: game.getRunTime() / STEP_MS,
      fraction: stepFraction,
      wallMs: performance.now(),
    });
    // Even with the deck off the page: a new Run's signal is only given once.
    if (reading.newRun || phase === 'abandoned' || phase === 'none') {
      this.scene?.clearEffects();
    }
    if (!app || !scene || !this.visible) return;
    // A cleared Run's last explosion plays out behind the Debrief.
    const playingOut = phase === 'cleared' && scene.effectsActive;
    if (!running && !playingOut && !this.dirty) return;

    const fraction = running
      ? (this.holdFraction ?? stepFraction)
      : this.lastFraction;
    this.lastFraction = fraction;
    this.dirty = false;
    scene.update(this.motion, fraction, reading.d);
    app.render();
  }

  /** For hot reload: drop what the renderer owns. */
  destroy(): void {
    resetKeyGradients();
    resetPlumeGradients();
    resetTextures();
    this.app?.destroy(true, { children: true });
  }
}

let session: DeckSession | null = null;

/** The session's deck, made on first use. */
export function getDeckSession(): DeckSession {
  session ??= new DeckSession();
  return session;
}
