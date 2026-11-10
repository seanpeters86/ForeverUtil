# ForeverUtil

A World of Warcraft Forever toolkit built with TypeScript 7, Effect 4, and Vite. The item comparison tool scores two items using editable stat weights, including a Subtlety - Questing rogue preset. Comparisons and custom weights are stored locally in the browser.

## Use

Search results appear as you type at least two characters of an item name. Select an item in the app, or submit a Wowhead URL or item ID. Wowhead URLs retain their `bonus` IDs; bonus IDs can also be entered in the optional field (separate multiple IDs with colons). Stats can also be entered manually. Hover over an imported item's name or icon for its Wowhead tooltip. Imports use Wowhead's Forever dataset and require a network connection.

Name search loads the community-maintained [Forever item cache](https://github.com/Napalmsteak/WoW-Classic-Item-Caches) on first use (approximately 19 MB uncompressed), then keeps it in memory for the session. It primarily covers uncommon-or-better gear, so it may not contain every item or be fully up to date. A Wowhead URL or item ID can be used for items missing from the index. Item data and icons are from Blizzard Entertainment and Wowhead; the search index is unofficial.

The appearance follows your system's light or dark preference until you choose a mode with the theme button. Your choice is saved in the browser.

Scores sum stat values multiplied by their weights, plus weapon DPS multiplied by the selected hand's weight. The default 9.81 main-hand and 1.92 off-hand EP per weapon DPS are editable estimates from a [SixtySim level-60 pre-raid benchmark](https://sixtysim.com/guides/rogue/subtlety/stats/), not validated questing weights. Compare weapons for the same hand. Melee weapon DPS and speed are imported from Wowhead; weapon DPS can also be entered manually. Ranged weapons are not imported as melee weapon DPS.

The separate combat effects of weapon speed and type, poisons, procs, set bonuses, gems, enchants, caps, and other effects are not modeled. A DPS-only estimate can rank weapons incorrectly, especially when speeds differ. Verify imported stats against the tooltip and use a character-specific simulation for a more reliable comparison.

## My gear

Paste an export from the [SimC addon](https://github.com/simulationcraft/simc-addon) into **My gear** to compare equipped items and gear listed in bags by slot. Importing replaces the saved gear list, but does not change the two-item comparison or weights. Add candidates using a name, Wowhead URL, or ID; remove items individually or refresh their Wowhead data. Gear references are saved locally, and item data is reloaded when the page opens.

Weapons are evaluated as distinct items in compatible hands, using the same editable weights as Item compare. The best pair is an estimate, not a character simulation: verify class, level, proficiency and other restrictions in game. Results are provisional while any item in the slot is unresolved. Unsupported weapon types, two-handers, ranged DPS, unique restrictions, unmodeled SimC modifiers, failed lookups, and bonuses that cannot be verified are excluded from ranking and shown in the list. Multiple bonuses require manual verification. For rings and trinkets, the highest individual score does not determine the best legal pair. Enchants and other export modifiers are not applied, and item levels or scaling encoded in modifiers may differ from the displayed base item.

## Run locally

Install Node.js 22.18 or newer, then run:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Run `npm test` for the focused tests and `npm run build` for type checking and a production build in `dist`.

## Deploy to GitHub Pages

In the repository's **Settings > Pages**, set the source to **GitHub Actions**. Push to `main` or `master` to run the included test, build, and deployment workflow. The site will be available at `https://<username>.github.io/ForeverUtil/` once the workflow completes.

World of Warcraft is a trademark of Blizzard Entertainment. Item information and tooltips are provided by Wowhead.