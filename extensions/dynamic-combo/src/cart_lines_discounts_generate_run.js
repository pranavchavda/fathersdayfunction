// @ts-check

/**
 * Dynamic machine + grinder combo discount (Discount Function API).
 *
 * Machines are tagged `combo-builder-machine`, grinders `combo-builder-grinder`;
 * open-box items are ignored. Each machine/grinder pair in the cart gets the
 * fixed amount stored on each product's `custom.combodiscountvalue` metafield
 * (both must be > 0). Same behaviour as the legacy
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

  const machines = [];
  const grinders = [];
  for (const line of input.cart?.lines || []) {
    if (line.merchandise.__typename !== "ProductVariant") continue;
    const product = line.merchandise.product;
    if (product.hasOpenboxTag) continue;
    const entry = {
      line,
      discountValue: parseFloat(product.comboDiscountValue?.value ?? "0") || 0,
    };
    if (product.hasMachineTag) machines.push(entry);
    else if (product.hasGrinderTag) grinders.push(entry);
  }

  const candidates = [];
  const pairs = Math.min(machines.length, grinders.length);
  for (let i = 0; i < pairs; i++) {
    const machine = machines[i];
    const grinder = grinders[i];
    if (machine.discountValue > 0 && grinder.discountValue > 0) {
      candidates.push({
        targets: [{ cartLine: { id: machine.line.id } }],
        value: { fixedAmount: { amount: machine.discountValue.toString() } },
        message: `Combo Discount: ${machine.discountValue}`,
      });
      candidates.push({
        targets: [{ cartLine: { id: grinder.line.id } }],
        value: { fixedAmount: { amount: grinder.discountValue.toString() } },
        message: `Combo Discount: ${grinder.discountValue}`,
      });
    }
  }
  if (candidates.length === 0) return NO_DISCOUNT;

  return {
    operations: [{ productDiscountsAdd: { selectionStrategy: "ALL", candidates } }],
  };
}
