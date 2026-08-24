/**
 * Registry of everything this app can do. Used by the dashboard, the nav and
 * every capability page so copy, routes and function IDs live in one place.
 *
 * `kind`:
 *   automatic       – creates a DiscountAutomaticApp backed by a function
 *   code            – creates a DiscountCodeApp backed by a function
 *   cart-transform  – always-on, configured through product metafields
 *   allocator       – shop-level configuration for the discounts allocator
 */
export const CAPABILITIES = [
  {
    key: "tiered-sale",
    title: "Tiered Sale",
    shortTitle: "Tiered Sale",
    route: "/app/create-discount",
    kind: "automatic",
    functionId: "f23d62fa-40f7-49bc-9329-86e1fc269e7e",
    functionHandle: "product-discount",
    summary:
      "Site-wide “spend X, get $Y off” automatic sale. The discount grows in tiers with the cart total and is spread across the eligible items.",
    howItWorks: [
      "Tiers map a minimum cart total (in cents) to a fixed discount (in cents), e.g. 200000 → 22500 means $225 off from $2,000.",
      "Products tagged with an excluded tag still count toward the tier but receive no discount; fully-excluded tags neither count nor get discounted.",
      "The discount is split proportionally over the discountable lines so the order shows the reduction per item.",
      "Only one automatic product discount applies to a cart; deactivate the previous sale before starting a new one.",
    ],
    configSource:
      "Discount metafield product-discount.function-configuration (set by this form).",
    examples: ["Back to School Sale – Up to $225 Off", "Father's Day tiers", "Anniversary sale"],
  },
  {
    key: "dynamic-combo",
    title: "Dynamic Combo Discount",
    shortTitle: "Dynamic Combo",
    route: "/app/createdynamiccombo",
    kind: "automatic",
    functionId: "d5959567-bcf6-433e-9610-4973bd50470b",
    functionHandle: "dynamic-combo",
    summary:
      "Machine + grinder pairs get a per-product amount off, read from each product's combodiscountvalue metafield.",
    howItWorks: [
      "Machines carry the tag combo-builder-machine, grinders combo-builder-grinder; open-box items are ignored.",
      "Each product's custom.combodiscountvalue (whole dollars) is taken off that product when it is paired.",
      "Both products in a pair need a value greater than 0; pairs are matched in cart order.",
      "The discount itself needs no configuration — only a title and dates.",
    ],
    configSource: "Product tags + product metafield custom.combodiscountvalue.",
    examples: ["Boxing Week Combo Discount", "Canada Day Combo Builder"],
  },
  {
    key: "combo-builder",
    title: "Combo Builder (tiered)",
    shortTitle: "Combo Builder",
    route: "/app/create-combo",
    kind: "automatic",
    functionId: "8afdad2b-981b-4f8c-84db-ebf2bda1c537",
    functionHandle: "combo-builder",
    summary:
      "Machine + grinder pairs get a tiered amount off based on their combined price. Powers the storefront combo builder.",
    howItWorks: [
      "Same tags as the dynamic combo (combo-builder-machine / combo-builder-grinder, open-box ignored).",
      "The grinder must cost at least 20% of the machine to qualify.",
      "Tiers map a combined price to a discount; the highest tier met wins and the amount is split across the pair.",
    ],
    configSource:
      "Discount metafield combo-discount.function-configuration (set by this form).",
    examples: ["Storefront combo builder (currently decommissioned)"],
  },
  {
    key: "tiered-coupon",
    title: "Tiered Coupon",
    shortTitle: "Tiered Coupon",
    route: "/app/tiered-coupon",
    kind: "code",
    functionId: "7ee3f064-c7d5-4371-9bb5-66dd55a24ae7",
    functionHandle: "tiered-coupon",
    summary:
      "A discount code where each product decides its own percentage off through the discount_percentage metafield.",
    howItWorks: [
      "Set custom.discount_percentage on products (whole number, e.g. 15 = 15% off).",
      "Products without the metafield are not discounted, even when the code is applied.",
      "Useful for brand-specific or MAP-aware coupons where the percentage differs per product.",
    ],
    configSource: "Product metafield custom.discount_percentage.",
    examples: ["SHHHGM"],
  },
  {
    key: "capped-coupon",
    title: "Capped Coupon",
    shortTitle: "Capped Coupon",
    route: "/app/capped-discount",
    kind: "code",
    functionId: "e1df1996-03c6-4053-9ba6-49efda23424e",
    functionHandle: "capped-discount",
    summary:
      "A percentage-off code limited to selected collections and capped at a maximum dollar amount.",
    howItWorks: [
      "Pick the eligible collections; only products in them are discounted.",
      "If the percentage would exceed the cap, the rate is scaled down so the total discount equals the cap.",
    ],
    configSource:
      "Discount metafield discount_code.function_configuration (set by this form).",
    examples: [],
  },
  {
    key: "coupon-value-limit",
    title: "Coupon Value Limit",
    shortTitle: "Coupon Value Limit",
    route: "/app/discount-config",
    kind: "allocator",
    functionId: null,
    functionHandle: "coupon-value-limit",
    summary:
      "Shop-wide caps on how much any discount code can take off a cart (Discounts Allocator, developer-preview API).",
    howItWorks: [
      "Configuration is stored on the shop metafield custom_discount_allocator.config.",
      "Shopify's Discounts Allocator API is still developer-preview; it may not run on every store.",
    ],
    configSource: "Shop metafield custom_discount_allocator.config.",
    examples: [],
  },
  {
    key: "bundles",
    title: "Bundles & free gifts",
    shortTitle: "Bundles",
    route: null,
    kind: "cart-transform",
    functionId: null,
    functionHandle: "bundler",
    summary:
      "Always on. A product that lists other variants in its bundle_product_ids metafield is expanded in the cart into the product plus those items at $0.",
    howItWorks: [
      "On the parent product set custom.bundle_product_ids (variants) and, optionally, custom.bundle_product_quantities (index-aligned quantities, default 1).",
      "The parent keeps its full price; every bundled item is priced at $0 in cart, checkout and the order.",
      "Quantities scale with the parent line (2 machines → 4 bags).",
      "Nothing to create here — edit the product metafields in the product admin.",
    ],
    configSource:
      "Product metafields custom.bundle_product_ids and custom.bundle_product_quantities.",
    examples: ["2 × Essential Espresso with a machine", "Jura E8 milk accessories"],
  },
];

export const CAPABILITY_BY_KEY = Object.fromEntries(
  CAPABILITIES.map((c) => [c.key, c])
);

export const CAPABILITY_BY_FUNCTION_ID = Object.fromEntries(
  CAPABILITIES.filter((c) => c.functionId).map((c) => [c.functionId, c])
);

export const KIND_LABEL = {
  automatic: "Automatic discount",
  code: "Discount code",
  "cart-transform": "Cart transform",
  allocator: "Shop configuration",
};
