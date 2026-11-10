import { Effect, Schema } from 'effect';

const WowheadResponse = Schema.Struct({
  name: Schema.String,
  tooltip: Schema.String,
  icon: Schema.optional(Schema.String),
  quality: Schema.optional(Schema.Number),
});

const SearchEntry = Schema.Struct({
  itemId: Schema.Number,
  name: Schema.String,
  iconName: Schema.optional(Schema.NullOr(Schema.String)),
  tooltipHtml: Schema.optional(Schema.String),
});

export type SearchItem = { itemId: number; name: string; iconName?: string | null | undefined; quality?: number | undefined };

export function shouldSearchAsYouType(input: string): boolean {
  const query = input.trim();
  return query.length >= 2 && !/^\d+$/.test(query) && !/^(?:https?:|www\.)/i.test(query);
}

export function qualityFromTooltip(tooltip: string): number | undefined {
  const marker = tooltip.match(/<!--nstart-->\s*<b\b[^>]*\bclass=["'][^"']*\bq([0-7])\b/i);
  return marker?.[1] === undefined ? undefined : Number(marker[1]);
}

export function fetchItemIndex(fetcher: typeof fetch = fetch) {
  return Effect.tryPromise({
    try: async () => {
      const response = await fetcher('https://raw.githubusercontent.com/Napalmsteak/WoW-Classic-Item-Caches/main/Forever%20Cache.json');
      if (!response.ok) throw new Error('Search index unavailable');
      return response.json() as Promise<unknown>;
    },
    catch: cause => new Error('Could not load item search index', { cause }),
  }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(SearchEntry))),
    Effect.map(items => items.map(item => ({ itemId: item.itemId, name: item.name, iconName: item.iconName, quality: qualityFromTooltip(item.tooltipHtml ?? '') }))),
  );
}

export function searchItemIndex(query: string, items: readonly SearchItem[]): SearchItem[] {
  const search = query.trim().toLocaleLowerCase();
  if (search.length < 2) return [];
  return items.filter(item => item.name.toLocaleLowerCase().includes(search))
    .sort((left, right) => {
      const leftName = left.name.toLocaleLowerCase();
      const rightName = right.name.toLocaleLowerCase();
      return Number(rightName.startsWith(search)) - Number(leftName.startsWith(search)) || leftName.localeCompare(rightName);
    });
}

export function fetchWowheadItem(id: string, bonus?: string, fetcher: typeof fetch = fetch) {
  return Effect.tryPromise({
    try: async signal => {
      const url = new URL(`https://nether.wowhead.com/tooltip/item/${encodeURIComponent(id)}`);
      url.searchParams.set('dataEnv', '16');
      url.searchParams.set('locale', '0');
      if (bonus) url.searchParams.set('bonus', bonus);
      const response = await fetcher(url.toString(), { signal });
      if (!response.ok) throw new Error('Item not found');
      return response.json() as Promise<unknown>;
    },
    catch: cause => new Error('Could not load item from Wowhead', { cause }),
  }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(WowheadResponse)),
    Effect.flatMap(item => item.name && item.tooltip ? Effect.succeed(item) : Effect.fail(new Error('Invalid item response'))),
  );
}