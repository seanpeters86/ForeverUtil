import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Effect } from 'effect';
import { fetchItemIndex, fetchWowheadItem, qualityFromTooltip, searchItemIndex, shouldSearchAsYouType } from './src/wowhead.ts';

test('loads and validates Forever item data', async () => {
  let url;
  const fetcher = async input => {
    url = input;
    return new Response(JSON.stringify({ name: 'Item', tooltip: '<span>Stats</span>', icon: 'icon', quality: 5 }));
  };
  const item = await Effect.runPromise(fetchWowheadItem('19019', undefined, fetcher));
  assert.equal(item.name, 'Item');
  assert.equal(item.quality, 5);
  assert.match(url, /item\/19019\?dataEnv=16&locale=0$/);
});

test('rejects failed and malformed responses', async () => {
  await assert.rejects(Effect.runPromise(fetchWowheadItem('1', undefined, async () => new Response('', { status: 404 }))));
  await assert.rejects(Effect.runPromise(fetchWowheadItem('1', undefined, async () => new Response(JSON.stringify({ error: 'Not found' })))));
});

test('requests the selected bonus', async () => {
  let url;
  const fetcher = async input => {
    url = new URL(input);
    return new Response(JSON.stringify({ name: 'Honed Stiletto', tooltip: '<span>Stats</span>' }));
  };
  await Effect.runPromise(fetchWowheadItem('15242', '12721:12345', fetcher));
  assert.equal(url.searchParams.get('bonus'), '12721:12345');
  assert.equal(url.searchParams.get('dataEnv'), '16');
});

test('loads and searches Forever item names', async () => {
  const fetcher = async () => new Response(JSON.stringify([
    { itemId: 1, name: 'Fine Stiletto', iconName: null },
    { itemId: 15242, name: 'Honed Stiletto', iconName: 'inv_weapon_shortblade_01', tooltipHtml: '<!--nstart--><b class="q2">Honed Stiletto</b><!--nend-->' },
    { itemId: 2, name: 'Stiletto', iconName: 'icon' },
  ]));
  const index = await Effect.runPromise(fetchItemIndex(fetcher));
  assert.equal(index.find(item => item.itemId === 15242).quality, 2);
  assert.equal(qualityFromTooltip('<!--nstart--><b class="q5">Thunderfury</b>'), 5);
  assert.equal(qualityFromTooltip('<!--nstart--><b class="q3">Rare item</b>'), 3);
  assert.equal(qualityFromTooltip('<!--nstart--><b class="q4">Epic item</b>'), 4);
  assert.equal(qualityFromTooltip('<!--nstart--><b class="q7">Heirloom item</b>'), 7);
  assert.equal(qualityFromTooltip('<!--nstart--><b class="q9">Unknown item</b>'), undefined);
  assert.equal(qualityFromTooltip('<span class="q2">Equip effect</span>'), undefined);
  assert.deepEqual(searchItemIndex('stiletto', index).map(item => item.itemId), [2, 1, 15242]);
  assert.deepEqual(searchItemIndex('h', index), []);
  assert.deepEqual(searchItemIndex('unknown', index), []);
});

test('reports an unavailable or invalid search index', async () => {
  await assert.rejects(Effect.runPromise(fetchItemIndex(async () => new Response('', { status: 503 }))));
  await assert.rejects(Effect.runPromise(fetchItemIndex(async () => new Response(JSON.stringify([{ itemId: 'invalid' }])))));
});

test('only searches item names automatically after two characters', () => {
  assert.equal(shouldSearchAsYouType(' a '), false);
  assert.equal(shouldSearchAsYouType(' ho '), true);
  assert.equal(shouldSearchAsYouType('15242'), false);
  assert.equal(shouldSearchAsYouType('https://www.wowhead.com/forever/item=15242'), false);
  assert.equal(shouldSearchAsYouType('www.wowhead.com/forever/item=15242'), false);
});