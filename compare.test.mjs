import { strict as assert } from 'node:assert';
import { test } from 'node:test';
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