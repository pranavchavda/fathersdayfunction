// @ts-check

/**
 * Capped percentage code discount (Discount Function API).
 *
 * Config on the discount metafield `discount_code.function_configuration`:
 *   { percentage_discount, maximum_discount_amount, eligibleCollectionIds: [gid...] }
 * Lines in any eligible collection get `percentage_discount` off; if the total
 * discount would exceed `maximum_discount_amount`, the percentage is scaled
 * down so the cap holds. Same behaviour as the legacy
 * purchase.product-discount.run version; targets are now cart lines.
 *
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunInput} Input
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} Result
 */

/** @type {Result} */
const NO_DISCOUNT = { operations: [] };

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

  const percentageDiscount = parseFloat(config?.percentage_discount);
  const maximumDiscountAmount = parseFloat(config?.maximum_discount_amount);
  const eligibleCollectionIds = config?.eligibleCollectionIds;
  if (
    !Number.isFinite(percentageDiscount) ||
    percentageDiscount <= 0 ||
    !Number.isFinite(maximumDiscountAmount) ||
    maximumDiscountAmount <= 0 ||
    !Array.isArray(eligibleCollectionIds) ||
    eligibleCollectionIds.length === 0
  ) {
    return NO_DISCOUNT;
  }

  const eligibleLines = [];
  let totalEligibleAmount = 0;
  for (const line of input.cart?.lines || []) {
    if (line.merchandise.__typename !== "ProductVariant") continue;
    if (!line.merchandise.product.inAnyCollection) continue;
    eligibleLines.push(line);
    totalEligibleAmount += parseFloat(line.cost.totalAmount.amount);
  }
  if (eligibleLines.length === 0 || totalEligibleAmount <= 0) return NO_DISCOUNT;

  let applicablePercentage = percentageDiscount;
  const potential = (totalEligibleAmount * percentageDiscount) / 100;
  if (potential > maximumDiscountAmount) {
    applicablePercentage = (maximumDiscountAmount / totalEligibleAmount) * 100;
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          selectionStrategy: "ALL",
          candidates: [
            {
              targets: eligibleLines.map((line) => ({ cartLine: { id: line.id } })),
              value: { percentage: { value: applicablePercentage.toFixed(6) } },
              message: `Discount (${applicablePercentage.toFixed(2)}% off)`,
            },
          ],
        },
      },
    ],
  };
}
