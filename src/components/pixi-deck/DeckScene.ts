import { Container, Graphics } from 'pixi.js';
import { FINGER_LANES, KEY_FINGER_MAP } from '../../data/curriculum';
import type { KeySpec } from '../../data/keyboardLayout';
import type { GameStoreState } from '../../game/gameStore';
import { DroneView } from './DroneView';
import type { DroneMotion } from './droneMotion';
import { makeText } from './draw';
import { HandView, type HandState } from './HandView';
import { KeyView, keycapLabel } from './KeyView';
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
 * Layers, bottom to top: chassis, hands, keycaps, trench, Drones. The Action
 * Deck effects (guidance beam, ship, lasers, explosions, popups) go in as
 * their own layers.
 */
export class DeckScene {
  readonly root = new Container();
  private readonly chassis = new Graphics();
  private readonly keyLayer = new Container();
  private readonly trench = new Graphics();
  private readonly trenchLabels = new Container();
  private readonly droneLayer = new Container();
  private readonly hands: { left: HandView; right: HandView };
  private readonly keys = new Map<string, KeyView>();
  private readonly drones = new Map<string, DroneView>();
  private layout: Layout | null = null;
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
    this.root.addChild(
      this.chassis,
      this.hands.left.root,
      this.hands.right.root,
      this.keyLayer,
      this.trench,
      this.trenchLabels,
      this.droneLayer,
    );
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
    g.moveTo(trench.x, trench.y + TRENCH_H / 2)
      .lineTo(trench.x + trench.w, trench.y + TRENCH_H / 2)
      .stroke({ width: 1.5, color: '#06b6d4', alpha: 0.3 });
    g.circle(trench.x + 17, trench.y + TRENCH_H / 2, 3).fill('#22d3ee');
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
    left.position.set(trench.x + 26, trench.y + TRENCH_H / 2);
    const right = makeText('BATTERY ARMED ▲', 8, '700', '#22d3ee', resolution, {
      letterSpacing: 0.8,
    });
    right.anchor.set(1, 0.5);
    right.position.set(trench.x + trench.w - 14, trench.y + TRENCH_H / 2);
    this.trenchLabels.addChild(left, right);
  }

  /**
   * Bring the scene up to date with the store, with Drones drawn `fraction` of
   * the way through the Run clock's current step. Call before rendering.
   */
  update(motion: DroneMotion, fraction: number): void {
    const state = this.options.getState();
    const hands = state.profile.handsVisible;
    if (!this.layout || this.layout.hands !== hands) this.applyLayout(hands);
    const layout = this.layout;
    if (!layout) return;

    this.updateKeysAndHands(state, layout);
    this.updateDrones(state, layout, motion, fraction);
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
