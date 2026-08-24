// @ts-check

/**
 * Per-product percentage code discount (Discount Function API).
 *
 * Each cart line whose product has `custom.discount_percentage` (a percentage,
 * e.g. "15" for 15% off) gets that percentage off. Products without the
 * metafield are untouched. Same behaviour as the legacy
 * purchase.product-discount.run version (whose message text was garbled by a
 * ×100 artefact — now it reads "Discount (15% off)").
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

  const candidates = [];
  for (const line of input.cart?.lines || []) {
    if (line.merchandise.__typename !== "ProductVariant") continue;
    const percent = parseFloat(line.merchandise.product.discountPercentage?.value ?? "");
    if (!Number.isFinite(percent) || percent <= 0) continue;
    candidates.push({
      targets: [{ cartLine: { id: line.id } }],
      value: { percentage: { value: percent.toFixed(6) } },
      message: `Discount (${percent}% off)`,
    });
  }
  if (candidates.length === 0) return NO_DISCOUNT;

  return {
    operations: [{ productDiscountsAdd: { selectionStrategy: "ALL", candidates } }],
  };
}
