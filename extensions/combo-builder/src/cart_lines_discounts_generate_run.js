// @ts-check

/**
 * Tiered machine + grinder combo discount (Discount Function API).
 *
 * Config on the discount metafield `combo-discount.function-configuration`:
 *   [ [ { price: <combined price threshold>, discount: <amount off> } ], ... ]
 * (each tier is a one-element array — legacy shape, preserved). For every
 * machine/grinder pair (tags `combo-builder-machine` / `combo-builder-grinder`,
 * open-box ignored) where the grinder costs at least 20% of the machine, the
 * highest tier whose threshold the combined price meets is taken off the pair.
 * Same behaviour as the legacy purchase.product-discount.run version; the
 * fixed amount now targets the two cart lines (Shopify splits it across them).
 *
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunInput} Input
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} Result
 */

/** @type {Result} */
const NO_DISCOUNT = { operations: [] };

/**
 * @param {unknown} raw metafield value
 * @returns {{ price: number, discount: number }[]}
 */
export function parseTiers(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((tier) => (Array.isArray(tier) ? tier[0] : tier))
    .filter((t) => t && Number.isFinite(Number(t.price)) && Number.isFinite(Number(t.discount)))
    .map((t) => ({ price: Number(t.price), discount: Number(t.discount) }));
}

/**
 * @param {number} machinePrice
 * @param {number} grinderPrice
 * @param {{ price: number, discount: number }[]} tiers
 */
export function calculateComboDiscount(machinePrice, grinderPrice, tiers) {
  if (grinderPrice < machinePrice * 0.2) return 0;
  const total = machinePrice + grinderPrice;
  let amount = 0;
  for (const tier of tiers) {
    if (total >= tier.price) amount = tier.discount;
  }
  return amount;
}

/**
 * @param {Input} input
 * @returns {Result}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const classes = input?.discount?.discountClasses || [];
  if (!classes.includes("PRODUCT")) return NO_DISCOUNT;

  const tiers = parseTiers(input?.discount?.metafield?.value);
  if (tiers.length === 0) return NO_DISCOUNT;

  const machines = [];
  const grinders = [];
  for (const line of input.cart?.lines || []) {
    if (line.merchandise.__typename !== "ProductVariant") continue;
    const product = line.merchandise.product;
    if (product.hasOpenboxTag) continue;
    if (product.hasMachineTag) machines.push(line);
    else if (product.hasGrinderTag) grinders.push(line);
  }

  const candidates = [];
  const pairs = Math.min(machines.length, grinders.length);
  for (let i = 0; i < pairs; i++) {
    const machine = machines[i];
    const grinder = grinders[i];
    const amount = calculateComboDiscount(
      parseFloat(machine.cost.subtotalAmount.amount),
      parseFloat(grinder.cost.subtotalAmount.amount),
      tiers
    );
    if (amount > 0) {
      candidates.push({
        targets: [{ cartLine: { id: machine.id } }, { cartLine: { id: grinder.id } }],
        value: { fixedAmount: { amount: amount.toString() } },
        message: `Combo Discount: ${amount}`,
      });
    }
  }
  if (candidates.length === 0) return NO_DISCOUNT;

  return {
    operations: [{ productDiscountsAdd: { selectionStrategy: "ALL", candidates } }],
  };
}
