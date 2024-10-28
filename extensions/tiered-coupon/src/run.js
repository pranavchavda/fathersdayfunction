import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const { cart } = input;

  const discounts = [];

  cart.lines.forEach((line) => {
    const merchandise = line.merchandise;
    if (merchandise.__typename !== "ProductVariant") {
      return;
    }

    const product = merchandise.product;

    const discountPercentageMetafield = product.discountPercentage;
    let discountPercentage = 0;

    // Parse the discount percentage from the product metafield
    if (discountPercentageMetafield?.value) {
      discountPercentage = parseFloat(discountPercentageMetafield.value * 100);
    }

    // Skip if no valid discount percentage is found
    if (isNaN(discountPercentage) || discountPercentage <= 0) {
      return;
    }

    // Calculate the discount amount
    const lineTotal = parseFloat(line.cost.totalAmount.amount);
    const discountAmount = (lineTotal * discountPercentage) / 100;

    // Apply the discount to the cart line
    discounts.push({
      targets: [
        {
          cartLine: {
            id: line.id,
          },
        },
      ],
      value: {
        percentage: {
          value: (discountPercentage / 100).toFixed(6),
        },
      },
      message: `Discount (${discountPercentage}% off)`,
    });
  });

  return {
    discounts: discounts,
    discountApplicationStrategy: DiscountApplicationStrategy.All,
  };
}
