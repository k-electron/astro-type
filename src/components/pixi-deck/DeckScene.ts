import { Container, Graphics, Sprite } from 'pixi.js';
import {
  FINGER_COLOR_MAP,
  FINGER_LANES,
  getNoteLaneAndFinger,
  KEY_FINGER_MAP,
} from '../../data/curriculum';
import type { KeySpec } from '../../data/keyboardLayout';
import { trailColor } from '../../game/catalog';
import { STEP_MS } from '../../game/clock';
import type { Judgement } from '../../game/createGame';
import type { GameStoreState } from '../../game/gameStore';
import { pulseOpacity } from './animation';
import { DeckEffects } from './DeckEffects';
import { DroneView } from './DroneView';
import type { DroneMotion } from './droneMotion';
import { makeText } from './draw';
import { HandView, type HandState } from './HandView';
import { hitPopupColor } from './hitPopups';
import { KeyView, keycapLabel } from './KeyView';
import { ShipView } from './ShipView';
import { boxGlow, releaseBoxGlow } from './textures';
import {
  computeLayout,
  droneTop,
  keyId,
  type Layout,
  STAGE_HEIGHT,
  TRENCH_H,
} from './layout';

export interface DeckSceneOptions {
  resolution: number;
  /** The live game, read straight from the store. */
  getState: () => GameStoreState;
  /** A keycap was clicked. */
  onPressKey: (key: KeySpec) => void;
}

/**
 * The Action Deck's drawing: the keyboard, the hands, the trench and the
 * Drones. A plain object outside React, drawn into the PixiJS stage it is
 * given. It reads the store each time it is drawn and keeps no copy of the game.
 *
 * Layers, bottom to top, as the DOM deck stacks them: the guidance beam,
 * chassis, hands, keycaps, trench, Drones, the ship, and the effects (lasers,
 * explosions, popups) over everything.
 *
 * Everything that moves on its own (the ship, the explosions, the thrusters
 * and lights) runs on effect time: `update` is told how much of it passed
 * since the last frame, and none passes while the Run is paused.
 */
export class DeckScene {
  readonly root = new Container();
  /** The keyboard's two drop shadows (0 -8px 30px at 80 %, 0 10px 30px at 90 %). */
  private readonly chassisShadows = [new Sprite(), new Sprite()];
  private shadowSize: { w: number; h: number } | null = null;
  private readonly chassis = new Graphics();
  private readonly keyLayer = new Container();
  private readonly trench = new Graphics();
  private readonly trenchLabels = new Container();
  /** The trench's pulsing dot. */
  private readonly trenchDot = new Graphics();
  private readonly droneLayer = new Container();
  private readonly hands: { left: HandView; right: HandView };
  private readonly keys = new Map<string, KeyView>();
  private readonly drones = new Map<string, DroneView>();
  private readonly ship = new ShipView();
  private readonly effects: DeckEffects;
  private layout: Layout | null = null;
  /** Effect time, in milliseconds: what the looping decoration is a function of. */
  private timeMs = 0;
  private stateKey = '';
  private stage: GameStoreState['currentStage'] | null = null;
  private size = { width: 0, height: STAGE_HEIGHT };

  constructor(private readonly options: DeckSceneOptions) {
    const { resolution } = options;
    this.hands = {
      left: new HandView('left', resolution),
      right: new HandView('right', resolution),
    };
    this.keyLayer.sortableChildren = true;
    this.droneLayer.sortableChildren = true;
    // Only keycaps and Drones are read out by the accessibility layer. Telling
    // PixiJS the rest holds nothing accessible keeps its per-frame walk short.
    this.chassis.accessibleChildren = false;
    this.trench.accessibleChildren = false;
    this.trenchLabels.accessibleChildren = false;
    this.trenchDot.accessibleChildren = false;
    this.effects = new DeckEffects({ resolution });
    for (const shadow of this.chassisShadows) {
      shadow.anchor.set(0.5);
      shadow.tint = '#000000';
    }
    this.chassisShadows[0].alpha = 0.8;
    this.chassisShadows[1].alpha = 0.9;
    this.root.addChild(
      this.ship.beam,
      ...this.chassisShadows,
      this.chassis,
      this.hands.left.root,
      this.hands.right.root,
      this.keyLayer,
      this.trench,
      this.trenchLabels,
      this.trenchDot,
      this.droneLayer,
      this.ship.ship,
      this.effects.root,
    );
  }

  /** Is an effect still playing? */
  get effectsActive(): boolean {
    return this.effects.active;
  }

  /** Stop every effect at once (a new Run, or the Run abandoned). */
  clearEffects(): void {
    this.effects.clear();
    this.ship.reset();
  }

  /** The stage changed size. */
  resize(width: number, height: number): void {
    this.size = { width, height };
    this.applyLayout(this.options.getState().profile.handsVisible);
  }

  private applyLayout(hands: boolean): void {
    const { width, height } = this.size;
    if (width <= 0) return;
    const { resolution, onPressKey } = this.options;
    const layout = computeLayout(width, height, hands);
    this.layout = layout;
    this.stateKey = '';
    this.ship.snap();

    for (const [id, rect] of layout.keys) {
      const existing = this.keys.get(id);
      if (existing) {
        existing.place(rect);
        continue;
      }
      const view = new KeyView(
        rect,
        resolution,
        keycapLabel(rect.spec),
        onPressKey,
      );
      this.keys.set(id, view);
      this.keyLayer.addChild(view.root);
    }

    const c = this.chassis;
    c.clear();
    c.roundRect(layout.deckX, layout.deckY, layout.deckW, layout.deckH, 16)
      .fill({ color: '#020617', alpha: 0.95 })
      .stroke({ width: 2, color: '#1e293b', alignment: 1 });
    c.moveTo(layout.deckX + 16, layout.deckY + 1)
      .lineTo(layout.deckX + layout.deckW - 16, layout.deckY + 1)
      .stroke({ width: 1.5, color: '#475569', alpha: 0.4 });

    // The keyboard's shadows follow its size; the texture of the old size goes.
    const previous = this.shadowSize;
    if (
      !previous ||
      previous.w !== layout.deckW ||
      previous.h !== layout.deckH
    ) {
      if (previous) releaseBoxGlow(previous.w, previous.h, 16, 30);
      this.shadowSize = { w: layout.deckW, h: layout.deckH };
    }
    const shadowTexture = boxGlow(layout.deckW, layout.deckH, 16, 30).texture;
    const centreX = layout.deckX + layout.deckW / 2;
    const centreY = layout.deckY + layout.deckH / 2;
    this.chassisShadows.forEach((shadow, i) => {
      shadow.texture = shadowTexture;
      shadow.position.set(centreX, centreY + (i === 0 ? -8 : 10));
    });

    this.hands.left.setPosition(layout.handLeft.x, layout.handLeft.y);
    this.hands.right.setPosition(layout.handRight.x, layout.handRight.y);
    this.hands.left.root.visible = this.hands.right.root.visible = hands;

    this.drawTrench(layout);
  }

  private drawTrench(layout: Layout): void {
    const { resolution } = this.options;
    const { trench } = layout;
    const g = this.trench;
    g.clear();
    g.roundRect(trench.x, trench.y, trench.w, TRENCH_H, 12)
      .fill({ color: '#020617', alpha: 0.9 })
      .stroke({ width: 1, color: '#1e293b', alpha: 0.8, alignment: 1 });
    const midY = trench.y + TRENCH_H / 2;
    this.trenchDot.clear();
    this.trenchDot.circle(trench.x + 17, midY, 3).fill('#22d3ee');
    for (const child of this.trenchLabels.removeChildren()) child.destroy();
    const left = makeText(
      'INTERCEPTOR DEFENSE RAIL // ACTIVE KEY VECTOR',
      8,
      '700',
      '#64748b',
      resolution,
      { letterSpacing: 0.8 },
    );
    left.anchor.set(0, 0.5);
    left.position.set(trench.x + 26, midY);
    // "BATTERY ARMED" and its arrow: no letter spacing, the arrow a size larger, 4 px apart.
    const arrow = makeText('▲', 10, '700', '#22d3ee', resolution);
    arrow.anchor.set(1, 0.5);
    arrow.position.set(trench.x + trench.w - 14, midY);
    const armed = makeText('BATTERY ARMED', 8, '700', '#22d3ee', resolution);
    armed.anchor.set(1, 0.5);
    armed.position.set(arrow.x - arrow.width - 4, midY);
    this.trenchLabels.addChild(left, armed, arrow);

    // The mag-lev guide line: 1.5 px, clear at both ends and 40 % cyan in the
    // middle, running between the two labels and not through them.
    const from = left.x + left.width + 2;
    const to = armed.x - armed.width - 2;
    const step = 4;
    for (let x = from; x < to; x += step) {
      const u = (x + step / 2 - trench.x) / trench.w;
      const alpha = 0.4 * (1 - Math.abs(2 * u - 1));
      g.rect(x, midY - 0.75, Math.min(step, to - x), 1.5).fill({
        color: '#06b6d4',
        alpha,
      });
    }
  }

  /**
   * Bring the scene up to date with the store, with Drones drawn `fraction` of
   * the way through the Run clock's current step and the effects `d` steps of
   * 1/60 s on (zero while paused, which redraws the same picture). Call
   * before rendering.
   */
  update(motion: DroneMotion, fraction: number, d: number): void {
    const state = this.options.getState();
    const hands = state.profile.handsVisible;
    if (!this.layout || this.layout.hands !== hands) this.applyLayout(hands);
    const layout = this.layout;
    if (!layout) return;

    this.timeMs += d * STEP_MS;
    this.updateKeysAndHands(state, layout);
    for (const view of this.keys.values()) view.animate(this.timeMs);
    this.hands.left.animate(this.timeMs);
    this.hands.right.animate(this.timeMs);
    this.trenchDot.alpha = pulseOpacity(this.timeMs);
    this.updateDrones(state, layout, motion, fraction);
    this.updateShip(state, layout, d);
    if (d > 0) this.effects.advance(d);
    this.effects.draw();
  }

  private updateShip(state: GameStoreState, layout: Layout, d: number): void {
    const text = state.currentStage.sampleText;
    const activeChar = text[state.performance.currentCharIndex] || null;
    const rect = activeChar ? layout.keys.get(keyId(activeChar)) : undefined;
    const lane = activeChar ? getNoteLaneAndFinger(activeChar).lane : null;
    // No lane for the next character: the beam takes the equipped trail's colour.
    const color =
      (lane !== null && FINGER_LANES[lane]?.color) ||
      trailColor(state.profile.upgrades.equippedTrailTheme);
    this.ship.update({
      targetX: rect ? rect.cx : null,
      color,
      shipY: layout.shipY,
      d,
    });
  }

  /**
   * A Judgement happened: fire the ship. A hit sends twin lasers up the lane to
   * the Drone that was just typed; a Miss, or a shield absorbing one, sends a
   * red laser to the wrong keycap. Called from the event, so the Drone's view
   * is still on the deck, exactly where the player last saw it.
   */
  judge(judgement: Judgement): void {
    const layout = this.layout;
    if (!layout) return;
    const state = this.options.getState();
    const originY = layout.shipY - 14;

    if (judgement.type === 'hit') {
      const char = judgement.key;
      const rect = layout.keys.get(keyId(char));
      if (!rect) return;
      const isSpace = char === ' ';
      const lastHit = state.performance.lastHitDrone;
      let view = lastHit?.id ? this.drones.get(lastHit.id) : undefined;
      if (!view) {
        for (const candidate of this.drones.values()) {
          if (candidate.char === char) {
            view = candidate;
            break;
          }
        }
      }
      // The laser flies to the Drone's top edge; with no Drone in view, to the Strike Line.
      const topY = view
        ? view.root.y - rect.h / 2
        : droneTop(0, lastHit?.yPercent ?? 84, layout.deckY);
      const info = KEY_FINGER_MAP[char] || KEY_FINGER_MAP[char.toLowerCase()];
      const laneColor = info ? FINGER_COLOR_MAP[info.finger] : '#38bdf8';
      const grade = judgement.grade;
      const hitColor = hitPopupColor({
        grade,
        isSpace,
        overdrive: judgement.overdrive,
      });
      this.ship.fire(false, 0);
      this.effects.fireHit({
        x: rect.cx,
        y: topY,
        w: rect.w,
        h: rect.h,
        originY,
        isSpace,
        grade,
        points: judgement.points,
        overdrive: judgement.overdrive,
        display: rect.spec.display,
        laneColor,
        hitColor,
      });
      return;
    }

    // A Miss, or a shield that took it: the ship fires at the key that was struck.
    const pressed = judgement.key;
    const pressedRect = layout.keys.get(keyId(pressed));
    const text = state.currentStage.sampleText;
    const activeChar = text[state.performance.currentCharIndex] || null;
    const expected = activeChar
      ? layout.keys.get(keyId(activeChar))
      : undefined;
    const shipX = expected ? expected.cx : this.ship.x;
    const x = pressedRect
      ? pressedRect.cx
      : shipX + (Math.random() > 0.5 ? 90 : -90);
    const y = pressedRect ? pressedRect.cy : layout.deckY + 30;
    const dx = x - shipX;
    const dy = y - originY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    this.ship.fire(true, Math.atan2(dx, -dy) * (180 / Math.PI));
    this.effects.fireMiss({
      fromX: shipX,
      fromY: originY,
      x,
      y,
      w: pressedRect ? pressedRect.w : 40,
      h: pressedRect ? pressedRect.h : 36,
      normalX: -dy / distance,
      normalY: dx / distance,
      distance,
      keyName:
        pressed === ' '
          ? 'SPACE'
          : pressed
            ? pressed.toUpperCase()
            : 'WRONG KEY',
    });
  }

  private updateKeysAndHands(state: GameStoreState, layout: Layout): void {
    const { performance, currentStage, lastPressedKey } = state;
    const keyboardVisible = state.profile.keyboardVisible;
    const text = currentStage.sampleText;
    const stateKey = `${currentStage.id}|${performance.currentCharIndex}|${lastPressedKey}|${keyboardVisible}|${text.length}`;
    if (stateKey === this.stateKey && currentStage === this.stage) return;
    this.stateKey = stateKey;
    this.stage = currentStage;

    const index = performance.currentCharIndex;
    const activeChar = text[index] || null;
    const previousChar = index > 0 ? text[index - 1] : null;
    const nextChar = index + 1 < text.length ? text[index + 1] : null;
    const info = activeChar
      ? KEY_FINGER_MAP[activeChar] ||
        KEY_FINGER_MAP[activeChar.toLowerCase()] ||
        null
      : null;
    const smartThumb = smartThumbHand(previousChar, lastPressedKey, nextChar);
    const targetId = activeChar ? keyId(activeChar) : null;
    const shiftNeeded = info?.shiftRequired ?? false;
    const shiftHand = info?.recommendedShiftHand ?? null;
    const pressedId = lastPressedKey ? keyId(lastPressedKey) : null;

    for (const [id, view] of this.keys) {
      const key = view.rect.spec.key;
      view.draw({
        target: targetId === id,
        modifier:
          shiftNeeded &&
          ((shiftHand === 'left' && key === 'ShiftLeft') ||
            (shiftHand === 'right' && key === 'ShiftRight')),
        pressed: pressedId === id,
        blind: !keyboardVisible,
        keyboardVisible,
        smartThumb,
      });
    }

    if (layout.hands) {
      const mainHand = info?.hand ?? null;
      const space = activeChar === ' ';
      const handState = (side: 'left' | 'right'): HandState => ({
        activeFinger:
          mainHand === side ? (info?.finger ?? null) : space ? 'THUMB' : null,
        activeKeyDisplay:
          mainHand === side
            ? activeChar === ' '
              ? '␣'
              : activeChar
            : space
              ? ' '
              : null,
        modifierFinger:
          shiftNeeded && shiftHand === side
            ? side === 'left'
              ? 'LEFT_PINKY'
              : 'RIGHT_PINKY'
            : null,
        modifierLabel: shiftNeeded && shiftHand === side ? 'SHIFT' : null,
        thumbRole: space
          ? smartThumb === side
            ? 'primary'
            : 'secondary'
          : null,
      });
      this.hands.left.draw(handState('left'));
      this.hands.right.draw(handState('right'));
    }
  }

  private updateDrones(
    state: GameStoreState,
    layout: Layout,
    motion: DroneMotion,
    fraction: number,
  ): void {
    const { resolution } = this.options;
    const seen = new Set<string>();
    state.fallingNotes.forEach((note, index) => {
      if (note.status === 'PROCESSED') return;
      const rect = layout.keys.get(keyId(note.char));
      // A character with no keycap of its own (a shifted symbol) has no Drone,
      // as in the DOM deck.
      if (!rect) return;
      let view = this.drones.get(note.id);
      if (!view) {
        view = new DroneView(note.id, note.char, rect.spec, resolution);
        this.drones.set(note.id, view);
        this.droneLayer.addChild(view.root);
      }
      seen.add(note.id);
      const yPercent = motion.yPercent(note.id, fraction) ?? note.yPercent;
      const top = droneTop(index, yPercent, layout.deckY);
      view.root.position.set(rect.cx, top + rect.h / 2);
      view.root.zIndex = index === 0 ? 30 : 20;
      view.update(
        rect.w,
        rect.h,
        index,
        FINGER_LANES[note.lane]?.color || '#06b6d4',
      );
      view.animate(this.timeMs);
    });
    for (const [id, view] of this.drones) {
      if (!seen.has(id)) {
        view.root.destroy({ children: true });
        this.drones.delete(id);
      }
    }
  }
}

/**
 * Which thumb is free for Space: the one on the side of the hand that did
 * not just type, judged from the previous character, then the next.
 */
function smartThumbHand(
  previousChar: string | null,
  lastPressedKey: string | null,
  nextChar: string | null,
): 'left' | 'right' {
  const opposite = (char: string | null) => {
    if (!char || char === ' ') return null;
    const info = KEY_FINGER_MAP[char] || KEY_FINGER_MAP[char.toLowerCase()];
    if (!info) return null;
    return info.hand === 'left'
      ? 'right'
      : info.hand === 'right'
        ? 'left'
        : null;
  };
  const previous =
    previousChar ||
    (lastPressedKey && lastPressedKey.length === 1 ? lastPressedKey : null);
  return opposite(previous) || opposite(nextChar) || 'right';
}
