import { describe, expect, it } from 'vitest';
import { entriesOf, MAX_UPGRADE_LEVEL } from './catalog';

// The highest level the Save accepts is the first Upgrade's price list. An
// Upgrade with more levels than that could be bought past what the Save
// accepts, which would make the whole Save unreadable on the next load.
describe('the catalog', () => {
  it('prices every level of an Upgrade that the Save accepts, and no other', () => {
    for (const upgrade of entriesOf('upgrade')) {
      expect(upgrade.prices, upgrade.name).toHaveLength(MAX_UPGRADE_LEVEL);
    }
  });
});
