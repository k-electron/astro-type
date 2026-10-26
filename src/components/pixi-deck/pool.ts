/**
 * A pool of objects made once and reused, so an explosion takes its sparks
 * from a free list instead of allocating a hundred new ones. `active` is what
 * is alive; `acquire` returns null once `cap` objects exist and all are in use,
 * and the effect that wanted one simply goes without.
 */
export class Pool<T> {
  readonly active: T[] = [];
  private readonly spare: T[] = [];
  private created = 0;

  constructor(
    private readonly make: () => T,
    private readonly cap: number,
  ) {}

  acquire(): T | null {
    let item = this.spare.pop();
    if (item === undefined) {
      if (this.created >= this.cap) return null;
      this.created++;
      item = this.make();
    }
    this.active.push(item);
    return item;
  }

  /** Give back `active[index]`. Order of `active` is not kept. */
  releaseAt(index: number): T {
    const item = this.active[index];
    const last = this.active.pop() as T;
    if (index < this.active.length) this.active[index] = last;
    this.spare.push(item);
    return item;
  }

  /** Give everything back. `each` sees every released object first. */
  clear(each?: (item: T) => void): void {
    while (this.active.length > 0) {
      const item = this.releaseAt(this.active.length - 1);
      each?.(item);
    }
  }

  /** Every object the pool has ever made, alive or spare. */
  forEachCreated(each: (item: T) => void): void {
    for (const item of this.active) each(item);
    for (const item of this.spare) each(item);
  }
}
