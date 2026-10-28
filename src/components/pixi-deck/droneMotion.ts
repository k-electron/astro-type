import type { FallingNote } from '../../game/rules';

/**
 * Smooths Drone motion between Run clock steps. The store moves Drones in
 * fixed steps of 1/60 s; a 120 Hz display draws two frames per step. Drawing
 * a point between the last two steps makes the Drones glide instead.
 *
 * Only the store's `yPercent` is smoothed, then mapped to pixels the way the
 * DOM deck does, so a Drone at rest sits exactly where the DOM deck puts it.
 * The deck is drawn one step behind the game at most, which a player can't see
 * and the rules never read: Judgement uses the real `yPercent`.
 */
export class DroneMotion {
  private previous = new Map<string, number>();
  private current = new Map<string, number>();

  /**
   * The Drones changed. `stepped` is true when the Run clock took a step, so
   * the Drones glide from where they were. Any other change (the Run starting,
   * a hit sending the lead away) leaves the Drones that stay gliding as before
   * and puts new ones where they are.
   */
  update(drones: readonly FallingNote[], stepped: boolean): void {
    const next = new Map<string, number>();
    for (const drone of drones) next.set(drone.id, drone.yPercent);
    // A Drone the deck hasn't seen before has nowhere to glide from.
    this.previous = new Map(
      drones.map((d) => [
        d.id,
        (stepped ? this.current : this.previous).get(d.id) ?? d.yPercent,
      ]),
    );
    this.current = next;
  }

  /** Where to draw a Drone, `fraction` of the way from its last step to its latest. */
  yPercent(id: string, fraction: number): number | undefined {
    const now = this.current.get(id);
    if (now === undefined) return undefined;
    const before = this.previous.get(id) ?? now;
    return before + (now - before) * fraction;
  }
}
