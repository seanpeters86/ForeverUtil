import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { bestWeaponPair, bonusChangesItem, parseSimcExport, tooltipSlot } from './src/simc.ts';

test('parses equipped and bag gear without treating other comments as items', () => {
  const items = parseSimcExport(`# Dagger (30)
off_hand=,id=15242,bonus_id=12721/12345,enchant_id=15
bag1=,id=5573
### Gear from Bags
# Wingblade (24)
# main_hand=,id=6504
### Additional Character Info
# main_hand=,id=999`);
  assert.deepEqual(items, [
    { id: '15242', bonus: '12721:12345', slot: 'off_hand', name: 'Dagger', equipped: true, modifiers: ['enchant_id=15'] },
    { id: '6504', slot: 'main_hand', name: 'Wingblade', equipped: false, modifiers: [] },
  ]);
});
import { compareScores, defaultWeaponWeights, defaultWeights, emptyStats, itemIdFromInput, itemReferenceFromInput, parseTooltipStats, parseTooltipWeapon, scoreItem } from './src/compare.ts';

test('scores stats with the provided weights', () => {
  assert.equal(scoreItem({ ...emptyStats(), agility: 10, expertise: 5 }, defaultWeights()), 28.6);
});

test('identifies the higher displayed score and ties', () => {
  assert.deepEqual(compareScores(64.8, 72.82), { winner: 1, difference: 8.02 });
  assert.deepEqual(compareScores(72.82, 64.8), { winner: 0, difference: 8.02 });
  assert.deepEqual(compareScores(10.001, 10.004), { winner: null, difference: 0 });
});

test('extracts item IDs from Wowhead links and rejects other hosts', () => {
  assert.equal(itemIdFromInput('19019'), '19019');
  assert.equal(itemIdFromInput('https://www.wowhead.com/forever/item=19019/thunderfury'), '19019');
  assert.equal(itemIdFromInput('https://www.wowhead.com/forever/item/thunderfury-19019'), '19019');
  assert.equal(itemIdFromInput('https://example.com/item=19019'), null);
});

test('parses base and equip stat markers without counting other effects', () => {
  const stats = parseTooltipStats('<span><!--stat3-->+12 Agility</span><span>Equip: Increases attack power by <!--rtg38-->24.</span><span><!--rtg32-->8 critical strike rating</span><!--rtg%32-->1.2%');
  assert.equal(stats.agility, 12);
  assert.equal(stats.attackPower, 24);
  assert.equal(stats.crit, 8);
});

test('preserves bonus IDs from Wowhead URLs', () => {
  assert.deepEqual(itemReferenceFromInput('https://www.wowhead.com/forever/item=15242/honed-stiletto?bonus=12721'), { id: '15242', bonus: '12721' });
  assert.deepEqual(itemReferenceFromInput('https://www.wowhead.com/forever/item=15242?bonus=12721:12345'), { id: '15242', bonus: '12721:12345' });
  assert.equal(itemReferenceFromInput('https://www.wowhead.com/forever/item=15242?bonus=bad'), null);
});

test('scores weapon DPS using the selected hand weight', () => {
  const stats = { ...emptyStats(), agility: 3 };
  const weights = defaultWeaponWeights();
  assert.ok(Math.abs(scoreItem(stats, defaultWeights(), 15.71, weights.mainHand) - 159.2151) < 0.00001);
  assert.ok(Math.abs(scoreItem(stats, defaultWeights(), 15.71, weights.offHand) - 35.2632) < 0.00001);
  assert.equal(scoreItem(stats, defaultWeights()), 5.1);
});

test('parses melee weapon DPS and speed without treating armor or ranged weapons as melee weapons', () => {
  assert.deepEqual(parseTooltipWeapon('<!--scstart2:15--><span>Dagger</span><!--spd-->1.40<!--dps-->(15.71 damage per second)'), { dps: 15.71, speed: 1.4 });
  assert.equal(parseTooltipWeapon('<!--stat3-->+3 Agility'), null);
  assert.equal(parseTooltipWeapon('<!--dps-->(15.71 damage per second)'), undefined);
  assert.equal(parseTooltipWeapon('<!--scstart2:2--><span>Bow</span><!--dps-->(18.00 damage per second)'), undefined);
  assert.equal(parseTooltipWeapon('<!--scstart2:15--><span>Dagger</span><!--dps-->(0 damage per second)'), undefined);
  assert.equal(parseTooltipWeapon('<!--scstart2:15--><span>Dagger</span>'), undefined);
});

test('validates weapon hands and chooses distinct items using both hand weights', () => {
  assert.deepEqual(tooltipSlot('<table><tr><td>One-Hand</td><th>Dagger</th></tr></table>'), { group: 'weapons', hand: 'both' });
  assert.deepEqual(tooltipSlot('<td>Main Hand</td>'), { group: 'weapons', hand: 'main' });
  assert.equal(tooltipSlot('<td>Unknown</td>'), null);
  const stats = emptyStats();
  const weapons = [{ key: 0, hand: 'both', dps: 20, stats }, { key: 1, hand: 'main', dps: 19, stats }, { key: 2, hand: 'both', dps: 10, stats }];
  const best = bestWeaponPair(weapons, defaultWeights(), defaultWeaponWeights());
  assert.equal(best.main, 1);
  assert.equal(best.off, 0);
  assert.ok(Math.abs(best.score - 224.79) < 0.00001);
  assert.equal(bestWeaponPair(weapons.slice(0, 1), defaultWeights(), defaultWeaponWeights()), null);
});

test('detects whether a requested bonus changed visible item data', () => {
  const base = '<!--nstart--><b>Stiletto</b><!--nend--><!--stat3-->+2';
  assert.equal(bonusChangesItem(base, base), false);
  assert.equal(bonusChangesItem(base.replace('+2', '+3'), base), true);
});

test('keeps invalid bonus IDs unresolved instead of silently applying them', () => {
  assert.deepEqual(parseSimcExport('# Sword (20)\nmain_hand=,id=5,bonus_id=bad'), [
    { id: '5', slot: 'main_hand', name: 'Sword', equipped: true, modifiers: ['bonus_id=bad'] },
  ]);
  assert.deepEqual(parseSimcExport('### Additional Character Info\n# main_hand=,id=5'), []);
});