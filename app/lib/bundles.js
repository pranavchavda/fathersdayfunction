/**
 * Client-safe constants for the Bundles & free gifts capability.
 * (Route components must not import *.server.js modules.)
 */
export const BUNDLE_TAG = "bundle-parent";

export const METAFIELDS = [
  { key: "bundle_product_ids", type: "list.variant_reference" },
  { key: "bundle_product_quantities", type: "list.number_integer" },
  { key: "bundle_choice_ids", type: "list.variant_reference" },
];
