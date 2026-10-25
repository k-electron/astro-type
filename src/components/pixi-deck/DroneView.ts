import { Container, Graphics, Rectangle, type Text } from 'pixi.js';
import type { KeySpec } from '../../data/keyboardLayout';
import { makeText, rgba } from './draw';

/**
 * One Drone: the hull, its wings, the character on it and the accent bar.
 * (Thrusters, ping lights and lock-on brackets are Action Deck effects and come
 * with them.)
 *
 * The position is set by the scene each frame. The shapes are redrawn only
 * when the Drone's size, its place in the queue or its lane colour changes.
 */
export class DroneView {
  readonly root = new Container();
  private readonly visual = new Container();
  private readonly body = new Graphics();
  private readonly tags = new Container();
  private readonly main: Text;
  private sub: Text | null = null;
  private signature = '';
  private readonly isSpace: boolean;

  constructor(
    readonly id: string,
    char: string,
    private readonly keycap: KeySpec,
    private readonly resolution: number,
  ) {
    this.isSpace = char === ' ';
    this.visual.accessibleChildren = false;
    this.visual.addChild(this.body, this.tags);
    this.root.addChild(this.visual);
    this.main = makeText(
      this.isSpace ? '␣ SPACE' : keycap.display,
      18,
      '700',
      '#ffffff',
      resolution,
    );
    this.visual.addChild(this.main);
    if (keycap.subDisplay && !this.isSpace) {
      this.sub = makeText(keycap.subDisplay, 12, '700', '#cbd5e1', resolution);
      this.visual.addChild(this.sub);
    }

    // Accessibility layer: "Drone F". A Drone is something to read, not press:
    // not a tab stop and never in the way of a click.
    const label = this.isSpace ? 'Drone Space' : `Drone ${keycap.display}`;
    this.root.accessible = true;
    this.root.accessibleType = 'div';
    this.root.accessibleHint = label;
    this.root.accessibleText = label;
    this.root.accessiblePointerEvents = 'none';
    this.root.eventMode = 'static';
    this.root.tabIndex = -1;
  }

  /** Match the keycap beneath it and the Drone's place in the queue. */
  update(w: number, h: number, queueIndex: number, laneColor: string): void {
    const first = queueIndex === 0;
    const signature = `${w}|${h}|${first}|${laneColor}`;
    if (signature === this.signature) return;
    this.signature = signature;

    const { isSpace } = this;
    const g = this.body;
    g.clear();
    const accent = isSpace ? '#10b981' : laneColor;
    // The lip under the hull (0 4px 0 #020617) and the glow ring of the lead.
    g.roundRect(-w / 2, -h / 2 + (first ? 4 : 3), w, h, 8).fill('#020617');
    if (first) {
      g.roundRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 14).fill({
        color: accent,
        alpha: 0.1,
      });
      g.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 11).fill({
        color: accent,
        alpha: 0.12,
      });
    }
    g.roundRect(-w / 2, -h / 2, w, h, 8)
      .fill({
        color: first ? '#020617' : '#0f172a',
        alpha: first ? 0.95 : 0.9,
      })
      .stroke({
        width: first ? 2 : 1,
        color: first ? laneColor : rgba(laneColor, 0.5),
        alignment: 1,
      });
    g.moveTo(-w / 2 + 6, -h / 2 + 1.5)
      .lineTo(w / 2 - 6, -h / 2 + 1.5)
      .stroke({ width: 1, color: '#ffffff', alpha: first ? 0.4 : 0.1 });
    // The wings.
    const wingW = isSpace ? 16 : 14;
    const wingH = isSpace ? 24 : 20;
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -w / 2 - wingW : w / 2;
      g.roundRect(x0, -wingH / 2, wingW, wingH, 6)
        .fill('#020617')
        .stroke({ width: 2, color: isSpace ? '#10b981' : laneColor });
    }
    // The accent bar along the bottom.
    g.roundRect(
      -w / 2 + 4,
      h / 2 - (first ? 4 : 2),
      w - 8,
      first ? 4 : 2,
      2,
    ).fill({ color: laneColor, alpha: first ? 1 : 0.75 });

    const display = this.keycap.display;
    this.main.style.fill = first ? '#ffffff' : '#f1f5f9';
    this.main.style.fontSize = isSpace
      ? first
        ? 18
        : 16
      : display.length > 3
        ? 12
        : display.length > 1
          ? 14
          : first
            ? 24
            : 18;
    if (this.sub) {
      this.sub.style.fill = first ? laneColor : '#cbd5e1';
      this.sub.position.set(0, -12);
      this.main.position.set(0, 7);
    } else {
      this.main.position.set(0, 1);
    }

    for (const child of this.tags.removeChildren()) child.destroy();
    if (isSpace && first) {
      // "HOSTILE FLAGSHIP  ␣ SPACE  LOCK" across the command bridge.
      const left = makeText(
        'HOSTILE FLAGSHIP',
        9,
        '700',
        '#34d399',
        this.resolution,
        { letterSpacing: 1.8 },
      );
      const right = makeText('LOCK', 9, '700', '#34d399', this.resolution, {
        letterSpacing: 1.8,
      });
      const pad = 6;
      const gap = 8;
      const leftW = left.width + pad * 2;
      const rightW = right.width + pad * 2;
      const mainW = this.main.width;
      const x = -(leftW + gap + mainW + gap + rightW) / 2;
      const plates = new Graphics();
      for (const [px, pw] of [
        [x, leftW],
        [x + leftW + gap + mainW + gap, rightW],
      ]) {
        plates
          .roundRect(px, -8, pw, 16, 3)
          .fill({ color: '#022c22', alpha: 0.8 })
          .stroke({ width: 1, color: '#10b981', alpha: 0.4 });
      }
      left.position.set(x + leftW / 2, 0);
      this.main.position.set(x + leftW + gap + mainW / 2, 1);
      right.position.set(x + leftW + gap + mainW + gap + rightW / 2, 0);
      this.tags.addChild(plates, left, right);
    }

    // The a11y layer positions its element from this rectangle.
    this.root.hitArea = new Rectangle(-w / 2, -h / 2, w, h);
  }
}
