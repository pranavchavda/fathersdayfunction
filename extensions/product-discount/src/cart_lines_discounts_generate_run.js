// @ts-check

/**
 * Tiered "spend X get $Y off" automatic discount (Discount Function API).
 *
 * Configuration lives on the discount's metafield
 * `product-discount.function-configuration`:
 *   {
 *     excludedTags:      [tag...]  // line counts toward the tier but gets no discount
 *     fullExclusions:    [tag...]  // line neither counts nor gets a discount
 *     tieredDiscounts:   { "<threshold cents>": <discount cents>, ... }
 *     usdTieredDiscounts: { ... }  // reserved; not applied (matches legacy behaviour)
 *   }
 * The input query receives `excludedTags` / `fullExclusions` as variables
 * (the discount's metafield is read as `$excludedTags` / `$fullExclusions` by
 * Shopify's input-query variable mapping); the function itself only needs the
 * boolean results.
 *
 * Behaviour is identical to the legacy purchase.product-discount.run version:
 * the tier is chosen from the eligible cart total and the discount amount is
 * spread proportionally over the discountable lines as fixed amounts. The only
 * change is that targets are cart lines instead of product variants, which the
 * new API requires.
 *
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunInput} Input
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} Result
 */

/** @type {Result} */
const NO_DISCOUNT = { operations: [] };

/**
 * @param {Input["cart"]["lines"][number]} line
 * @returns {number} line total in cents
 */
function lineTotalCents(line) {
  return Math.round(parseFloat(line.cost.totalAmount.amount) * 100);
}

/**
 * Cart total that counts toward the tier: everything except custom products
 * and fully excluded products.
 * @param {Input["cart"]} cart
 * @returns {number} cents
 */
export function calculateApplicableCartTotal(cart) {
  let total = 0;
  for (const line of cart?.lines || []) {
    if (line.merchandise.__typename !== "ProductVariant") continue;
    if (line.merchandise.product.hasFullyExcludedTag) continue;
    total += lineTotalCents(line);
  }
  return total;
}

/**
 * Highest tier whose threshold the applicable total meets.
 * @param {number} applicableCartTotal cents
 * @param {Record<string, number> | undefined} tieredDiscounts
 * @returns {number} discount in cents
 */
export function calculateTieredDiscount(applicableCartTotal, tieredDiscounts) {
  if (!tieredDiscounts || typeof tieredDiscounts !== "object") return 0;
  const thresholds = Object.keys(tieredDiscounts)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a);
  for (const threshold of thresholds) {
    if (applicableCartTotal >= threshold) {
      const value = Number(tieredDiscounts[threshold]);
      return Number.isFinite(value) && value > 0 ? value : 0;
    }
  }
  return 0;
}

/**
 * Spread the discount proportionally over discountable lines.
 * @param {Input["cart"]} cart
 * @param {number} discountAmount cents
 */
export function buildCandidates(cart, discountAmount) {
  if (discountAmount <= 0) return [];

  const discountableLines = (cart?.lines || []).filter((line) => {
    if (line.merchandise.__typename !== "ProductVariant") return false;
    const product = line.merchandise.product;
    return !product.hasExcludedTag && !product.hasFullyExcludedTag;
  });
  if (discountableLines.length === 0) return [];

  const discountableTotal = discountableLines.reduce(
    (sum, line) => sum + lineTotalCents(line),
    0
  );
  if (discountableTotal <= 0) return [];

  const proportion = Math.min(discountAmount / discountableTotal, 1);

  return discountableLines.map((line) => {
    const cents = lineTotalCents(line) * proportion;
    return {
      targets: [{ cartLine: { id: line.id } }],
      value: { fixedAmount: { amount: (cents / 100).toFixed(2) } },
    };
  });
}

/**
 * @param {Input} input
 * @returns {Result}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const classes = input?.discount?.discountClasses || [];
  if (!classes.includes("PRODUCT")) return NO_DISCOUNT;

  const raw = input?.discount?.metafield?.value;
  if (!raw) return NO_DISCOUNT;

  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    return NO_DISCOUNT;
  }

  const applicableCartTotal = calculateApplicableCartTotal(input.cart);
  const discountAmount = calculateTieredDiscount(
    applicableCartTotal,
    config?.tieredDiscounts
  );
  const candidates = buildCandidates(input.cart, discountAmount);
  if (candidates.length === 0) return NO_DISCOUNT;

  return {
    operations: [
      {
        productDiscountsAdd: {
          selectionStrategy: "ALL",
          candidates,
        },
      },
    ],
  };
}
