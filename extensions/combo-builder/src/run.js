import { DiscountApplicationStrategy } from "../generated/api";

export function run(input) {
  const { cart } = input;
  const currencyCode = cart.cost.subtotalAmount.currencyCode;

  const machines = [];
  const grinders = [];

  // Categorize items based on new boolean properties
  cart.lines.forEach((line) => {
    if (line.merchandise.__typename === "ProductVariant") {
      const product = line.merchandise.product;
      if (!product.hasOpenboxTag) {
        if (product.hasMachineTag) {
          machines.push(line);
        } else if (product.hasGrinderTag) {
          grinders.push(line);
        }
      }
    }
  });

  const pairsCount = Math.min(machines.length, grinders.length);
  const discounts = [];
  const metafieldObject = JSON.parse(input.discountNode.metafield.value);
  // metafield json example:
  // [[{\"price\":1500,\"discount\":250}],[{\"price\":2000,\"discount\":350}],[{\"price\":3500,\"discount\":650}],[{\"price\":6000,\"discount\":1000}]]
  console.log(metafieldObject);
  // Calculate discount based on total price and eligibility
  function calculateComboDiscount(machinePrice, grinderPrice) {
    if (grinderPrice < machinePrice * 0.2) return 0; // Grinder not eligible

    const totalPrice = machinePrice + grinderPrice;
    // if (totalPrice >= 6000) return 1000;
    // if (totalPrice >= 3500) return 650;
    // if (totalPrice >= 2000) return 350;
    // if (totalPrice >= 1500) return 250;
    // return 0; // No discount for totals under 1500
    const tierValues = metafieldObject.map((tier) => tier[0].price);
    console.log("Tier values: ", tierValues);
    const discountValues = metafieldObject.map((tier) => tier[0].discount);
    console.log("Discount values: ", discountValues);
    let discountAmount = 0;
    for (let i = 0; i < tierValues.length; i++) {
      if (totalPrice >= tierValues[i]) {
        discountAmount = discountValues[i];
      }
    }
    return discountAmount;
  }
  // Apply combo discounts
  for (let i = 0; i < pairsCount; i++) {
    const machineItem = machines[i];
    const grinderItem = grinders[i];

    // const machinePrice = machineItem.cost.subtotalAmount.amount;
    // const grinderPrice = grinderItem.cost.subtotalAmount.amount;
    // ensure they are numbers
    const machinePrice = parseFloat(machineItem.cost.subtotalAmount.amount);
    const grinderPrice = parseFloat(grinderItem.cost.subtotalAmount.amount);

    console.log("Machine price: ", machinePrice);
    console.log("Grinder price: ", grinderPrice);

    const discountAmount = calculateComboDiscount(machinePrice, grinderPrice);

    console.log("Discount amount: ", discountAmount);

    if (discountAmount > 0) {
      discounts.push({
        value: { fixedAmount: { amount: discountAmount } },
        targets: [
          { productVariant: { id: machineItem.merchandise.id } },
          { productVariant: { id: grinderItem.merchandise.id } },
        ],
        message: `Combo Discount: ${discountAmount}`,
      });
    }
  }

  return {
    discounts: discounts,
    discountApplicationStrategy: DiscountApplicationStrategy.All,
  };
}
