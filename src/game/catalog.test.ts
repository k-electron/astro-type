import { describe, expect, it } from 'vitest';
import { entriesOf } from './catalog';
import { MAX_UPGRADE_LEVEL } from './schemas';

// The number of levels is written twice: as a price for each level in the
// catalog, and as the highest level the Save accepts. A third level that can
// be bought but not saved (or the reverse) would be lost on the next reload.
describe('the catalog', () => {
  it('prices every level of an Upgrade that the Save accepts, and no other', () => {
    for (const upgrade of entriesOf('upgrade')) {
      expect(upgrade.prices, upgrade.name).toHaveLength(MAX_UPGRADE_LEVEL);
    }
  });
});
