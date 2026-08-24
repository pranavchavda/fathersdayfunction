# CLAUDE.md — iDrinkCoffee Functions

Shopify app **"iDrinkCoffee Functions"** (handle `tiered-discounts-idc`, client_id `5b89e0a11165b3550c6a323daad996f1`).
Embedded admin UI (Remix) + seven Shopify Functions used by idrinkcoffee.com.
Despite the repo name, this is the general-purpose functions app, not just Father's Day.

**Stack:** Remix 2.17 · React 18 · Polaris 13 · @shopify/shopify-app-remix 3.8 (Admin API 2025-10) · Prisma 6 (SQLite sessions) · Shopify Functions in JS (javy) on API **2026-01** · pnpm 11 · @shopify/cli 4.

## Functions

| Extension | Target | Trigger / config | Used by |
|---|---|---|---|
| `bundler` | `cart.transform.run` | product metafields `custom.bundle_product_ids` (list.variant_reference) + optional `custom.bundle_product_quantities` (list.number_integer, index-aligned). Expands the line into parent (own price) + gifts at **$0** via `fixedPricePerUnit`. | Free-gift-with-machine promos (e.g. 2× Essential Espresso), Jura accessory bundles. Not the "Complete Your Setup" add-ons — those are `custom.bundle_products` handled by the *combodiscounts* app. |
| `product-discount` | `cart.lines.discounts.generate.run` | discount metafield `product-discount.function-configuration` `{excludedTags, fullExclusions, tieredDiscounts{thresholdCents: discountCents}, usdTieredDiscounts}`; input-query variables from the same metafield. Tiered "spend X get $Y off", spread proportionally as fixed amounts. | Seasonal automatic sales ("Up to $225 off"). Route `app/create-discount`. |
| `dynamic-combo` | same | product tags `combo-builder-machine` / `combo-builder-grinder`, per-product `custom.combodiscountvalue`; open-box excluded. | Machine+grinder combo sales. Route `app/createdynamiccombo`. |
| `combo-builder` | same | tags as above + discount metafield `combo-discount.function-configuration` (tier list, legacy nested shape). Backs the Hydrogen combo builder (currently decommissioned). | Route `app/create-combo`. |
| `tiered-coupon` | same | code discount; per-product `custom.discount_percentage` (number_integer = % off). | Route `app/tiered-coupon`. |
| `capped-discount` | same | code discount; metafield `discount_code.function_configuration` `{percentage_discount, maximum_discount_amount, eligibleCollectionIds}`; input-query variables from it. | Route `app/capped-discount`. |
| `coupon-value-limit` | `purchase.discounts-allocator.run` (**unstable**) | shop metafield `custom_discount_allocator.config`. The Discounts Allocator API is dev-preview only; there is no stable version. Kept as-is. | Route `app/discount-config`. |

All discount functions check `discount.discountClasses` includes `PRODUCT` and return `{operations: []}` otherwise — so every create mutation in `app/routes` MUST pass `discountClasses: [PRODUCT]` (they do). Existing discounts created under the legacy API already carry `[PRODUCT]`.

Function IDs are stable per extension (production): product-discount `f23d62fa-40f7-49bc-9329-86e1fc269e7e`, dynamic-combo `d5959567-bcf6-433e-9610-4973bd50470b`, tiered-coupon `7ee3f064-c7d5-4371-9bb5-66dd55a24ae7`, capped-discount `e1df1996-03c6-4053-9ba6-49efda23424e`, combo-builder `8afdad2b-981b-4f8c-84db-ebf2bda1c537` (hardcoded in the routes).

## Commands

```bash
pnpm install                                   # root + all extensions (workspace)
pnpm build                                     # Remix production build
cd extensions/<name> && npx vitest run         # unit tests (pure functions, no wasm)
npx shopify app function build --path extensions/<name>   # typegen + wasm
npx shopify app function run --path extensions/<name> --export <toml export> --input /abs/path/input.json --json
npx shopify app dev --store idrinkcoffee-dev.myshopify.com   # dev-store preview (pushes draft extensions)
npx shopify app deploy --allow-updates --message "..."       # PRODUCTION: releases ALL 7 functions at once
```

Always prefix CLI/pnpm commands with `npm_config_dangerously_allow_all_builds=true` — pnpm ≥10 blocks esbuild's postinstall and the Shopify CLI runs `pnpm install`/`pnpm exec graphql-code-generator` inside each extension dir, where root `pnpm-workspace.yaml` `allowBuilds` isn't consulted.

## Deploying

- **Functions:** `shopify app deploy` is all-or-nothing across the app's extensions and validates every `api_version` against Shopify's support window (~12 months). Keep all extensions on a supported version or nothing deploys. Verify afterwards with Storefront `cartCreate` checks (line `discountAllocations` / `lineComponents`).
- **Admin app:** runs on the Linode box `root@139.177.197.236` at `/var/www/html/fathersdayfunction`, pm2 process `shopify-remix-app` (`pnpm start`, port 3000, nginx site `tier-discounts` → https://tier-discount.idrinkcoffee.com). Deploy = `git pull && pnpm install && pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm build && pm2 restart shopify-remix-app`. Back up `prisma/dev.sqlite` first — it holds the live offline sessions.
- `.env` on the server: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SCOPES`, `SHOPIFY_APP_URL`.

## Gotchas

- A thrown error inside a function blocks every cart on the store — parse metafields defensively and return no-ops.
- Discount API targets are cart lines only (no `productVariant` targets); input queries must select line `id`.
- `combodiscounts` (github.com/pranavchavda/combodiscounts, app "christmas-combos") is the sibling app on the same server; it owns `bundle_products` add-on discounts, POS-only codes and the Sweetbird sample picker.
- `pnpm lint` is broken by `@remix-run/eslint-config`'s jest rule on extension tests; use `pnpm exec eslint app/`.
