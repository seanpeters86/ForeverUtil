# ForeverUtil Agent Guidelines

## Project

- ForeverUtil is a static World of Warcraft Forever toolkit deployed to GitHub Pages. Keep it usable under a repository subpath and do not require a server, credentials, or secrets in the browser without an explicit decision to change the architecture.
- The app uses TypeScript 7, Vite, Effect 4, and Lucide. Follow the existing patterns in `src/compare.ts`, `src/wowhead.ts`, and `src/app.ts`; use `DESIGN.md` for UI work.
- Preserve existing comparisons, custom weights, and theme preferences across upgrades. Migrate stored data deliberately and avoid overwriting user-entered stats while refreshing remote data.

## Item Data and Scoring

- Use Wowhead's Forever environment (`dataEnv=16`) for item tooltips and preserve selected bonus IDs in imports and links. Name search uses the community Forever item index described in `README.md`; it is not a complete or authoritative catalog.
- Treat missing, unsupported, or unresolved item data as unknown, not as zero. Validate random-enchantment bonuses and weapon-hand compatibility before presenting a definitive comparison; avoid silently reporting a failed bonus as applied.
- Keep weapon DPS weights configurable and identify them as estimates. The default main-hand and off-hand weights come from a level-60 benchmark, not a validated questing simulation. Do not imply that DPS-only scores account for speed effects, weapon type, procs, poisons, or set bonuses.
- Keep item searches and imports independent between the two panels. Prevent stale asynchronous responses from replacing newer input or another panel's results.

## Verification and Deployment

- Use Node.js 22.18 or newer and npm. Run `npm ci` for a clean install, `npm test` for regression tests, and `npm run build` for strict type checking and the Pages bundle.
- Add focused tests for scoring, tooltip parsing, bonus IDs, and missing-data behavior when those paths change. For UI changes, verify keyboard and pointer interactions at desktop and mobile widths in light and dark themes.
- GitHub Pages must use the GitHub Actions source and publish `dist`; retain relative asset paths for the `/ForeverUtil/` subpath. See `README.md` and `.github/workflows/pages.yml`.