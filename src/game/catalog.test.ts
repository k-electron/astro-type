import { describe, expect, it } from 'vitest';
import { entriesOf, MAX_UPGRADE_LEVEL } from './catalog';

// The highest level the Save accepts is the length of the first Upgrade's
// price list. An Upgrade with a longer list would have a level that can be
// bought but that the Save refuses, which would make the whole Save unreadable
// on the next load.
describe('the catalog', () => {
  it('gives every Upgrade the same number of levels, which the Save accepts', () => {
    for (const upgrade of entriesOf('upgrade')) {
      expect(upgrade.prices, upgrade.name).toHaveLength(MAX_UPGRADE_LEVEL);
    }
  });
});
