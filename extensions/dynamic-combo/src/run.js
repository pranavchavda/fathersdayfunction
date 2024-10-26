import { DiscountApplicationStrategy } from "../generated/api";

export function run(input) {
  const { cart } = input;
  const currencyCode = cart.cost.subtotalAmount.currencyCode;

  const machines = [];
  const grinders = [];

  // Categorize items based on tags and collect discount values from metafields
  cart.lines.forEach((line) => {
    if (line.merchandise.__typename === "ProductVariant") {
      const product = line.merchandise.product;
      if (!product.hasOpenboxTag) {
        if (product.hasMachineTag) {
          machines.push({
            line,
            discountValue: parseFloat(product.comboDiscountValue?.value || 0),
          });
        } else if (product.hasGrinderTag) {
          grinders.push({
            line,
            discountValue: parseFloat(product.comboDiscountValue?.value || 0),
          });
        }
      }
    }
  });

  const pairsCount = Math.min(machines.length, grinders.length);
  const discounts = [];

  // Apply combo discounts
  for (let i = 0; i < pairsCount; i++) {
    const machineItem = machines[i];
    const grinderItem = grinders[i];

    const machineDiscount = machineItem.discountValue;
    const grinderDiscount = grinderItem.discountValue;

    // Apply discounts if both have discount amounts
    if (machineDiscount > 0 && grinderDiscount > 0) {
      // Apply discount to machine
      discounts.push({
        value: { fixedAmount: { amount: machineDiscount.toString() } },
        targets: [{ productVariant: { id: machineItem.line.merchandise.id } }],
        message: `Combo Discount: ${machineDiscount}`,
      });

      // Apply discount to grinder
      discounts.push({
        value: { fixedAmount: { amount: grinderDiscount.toString() } },
        targets: [{ productVariant: { id: grinderItem.line.merchandise.id } }],
        message: `Combo Discount: ${grinderDiscount}`,
      });
    }
  }

  return {
    discounts: discounts,
    discountApplicationStrategy: DiscountApplicationStrategy.All,
  };
}
