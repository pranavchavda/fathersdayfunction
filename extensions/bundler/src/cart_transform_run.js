// @ts-check

/**
 * Bundler cart transform.
 *
 * Any cart line whose product carries `custom.bundle_product_ids`
 * (list.variant_reference) is expanded into the parent variant plus the
 * referenced "gift" variants.
 *
 * - `custom.bundle_product_quantities` (list.number_integer, optional) is
 *   index-aligned with `bundle_product_ids` and gives the per-parent-unit
 *   quantity of each gift. Missing / shorter list / invalid entries → 1.
 * - Every expanded item gets a `fixedPricePerUnit`: the parent keeps its own
 *   presentment price, gifts are 0. Because all components are fixed-priced,
 *   Shopify prices the bundle as the sum of the components, so the machine
 *   shows at full price and the gifts show as $0 in cart, checkout and the
 *   order (instead of prorating the parent price across the components).
 *
 * @typedef {import("../generated/api").CartTransformRunInput} RunInput
 * @typedef {import("../generated/api").CartTransformRunResult} FunctionRunResult
 */

/** Shopify caps `ExpandedItem.quantity` at 2000. */
const MAX_EXPANDED_QUANTITY = 2000;

/** @type {FunctionRunResult} */
const NO_CHANGES = { operations: [] };

/**
 * Parse a list metafield value (JSON array) into an array of GIDs.
 * @param {string | null | undefined} value
 * @returns {string[]}
 */
function parseVariantIds(value) {
  if (!value) return [];
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (id) => typeof id === "string" && id.startsWith("gid://shopify/ProductVariant/")
  );
}

/**
 * Parse a list.number_integer metafield value into positive integers.
 * Entries that are missing or invalid resolve to 1.
 * @param {string | null | undefined} value
 * @param {number} length
 * @returns {number[]}
 */
function parseQuantities(value, length) {
  /** @type {unknown[]} */
  let parsed = [];
  if (value) {
    try {
      const json = JSON.parse(value);
      if (Array.isArray(json)) parsed = json;
    } catch {
      parsed = [];
    }
  }
  return Array.from({ length }, (_, i) => {
    const n = Number(parsed[i]);
    return Number.isInteger(n) && n > 0 ? n : 1;
  });
}

/**
 * @param {string} amount
 * @returns {{ adjustment: { fixedPricePerUnit: { amount: string } } }}
 */
function fixedPrice(amount) {
  return { adjustment: { fixedPricePerUnit: { amount } } };
}

/**
 * Build the expand operation for one cart line, or null if the line is not a
 * bundle parent (or its configuration is unusable).
 * @param {RunInput["cart"]["lines"][number]} line
 */
function buildExpandOperation(line) {
  const merchandise = line.merchandise;
  if (merchandise.__typename !== "ProductVariant") return null;

  const product = merchandise.product;
  const giftIds = parseVariantIds(product.bundleProductIds?.value).filter(
    (id) => id !== merchandise.id
  );
  if (giftIds.length === 0) return null;

  const giftQuantities = parseQuantities(
    product.bundleProductQuantities?.value,
    giftIds.length
  );

  const parentPrice = line.cost?.amountPerQuantity?.amount;
  if (parentPrice === undefined || parentPrice === null) return null;

  const expandedCartItems = [
    {
      merchandiseId: merchandise.id,
      quantity: line.quantity,
      price: fixedPrice(String(parentPrice)),
    },
  ];

  for (let i = 0; i < giftIds.length; i++) {
    const quantity = Math.min(
      giftQuantities[i] * line.quantity,
      MAX_EXPANDED_QUANTITY
    );
    expandedCartItems.push({
      merchandiseId: giftIds[i],
      quantity,
      price: fixedPrice("0.00"),
    });
  }

  return {
    lineExpand: {
      cartLineId: line.id,
      title: `${product.title} Bundle`,
      expandedCartItems,
    },
  };
}

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function cartTransformRun(input) {
  const lines = input?.cart?.lines;
  if (!Array.isArray(lines) || lines.length === 0) return NO_CHANGES;

  const operations = [];
  for (const line of lines) {
    // A malformed metafield on one product must never take the whole cart
    // transform down (a thrown error blocks every cart on the store).
    try {
      const operation = buildExpandOperation(line);
      if (operation) operations.push(operation);
    } catch {
      // skip this line
    }
  }

  return operations.length > 0 ? { operations } : NO_CHANGES;
}
