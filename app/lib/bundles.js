/**
 * Client-safe constants for the Bundles & free gifts capability.
 * (Route components must not import *.server.js modules.)
 */
export const BUNDLE_TAG = "bundle-parent";

export const METAFIELDS = [
  { key: "bundle_product_ids", type: "list.variant_reference" },
  { key: "bundle_product_quantities", type: "list.number_integer" },
  { key: "bundle_choice_ids", type: "list.variant_reference" },
  // US-market twins: the bundler reads ONLY these for carts in the US market
  // and ONLY the unsuffixed ones everywhere else (no fallback either way).
  { key: "bundle_product_ids_us", type: "list.variant_reference" },
  { key: "bundle_product_quantities_us", type: "list.number_integer" },
  { key: "bundle_choice_ids_us", type: "list.variant_reference" },
];

/** Metafield key suffix for the US-market set. */
export const US_SUFFIX = "_us";

/** True when a row's US set is identical to its default set. */
export function usSameAsDefault(row) {
  const sig = (set) =>
    JSON.stringify([
      (set?.gifts || []).map((g) => [g.id, g.quantity]),
      (set?.choices || []).map((c) => c.id),
    ]);
  return sig(row) === sig(row?.us);
}
