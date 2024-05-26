// // @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

// /**
//  * @typedef {import("../generated/api").RunInput} RunInput
//  * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
//  * @typedef {import("../generated/api").Discount} Discount
//  */

// // Hardcoded values for now (can be moved to metafields later)

const EXCLUDED_TAGS = [
  "la-marzocco",
  "lelit",
  "acaia",
  "jura",
  "latte-art-factory",
  "puqpress",
  "YGroup_coffeebox",
  "ecm",
  "profitec",
  "miele",
].map((tag) => tag.toLowerCase());

const FULL_EXCLUSIONS = [
  "ascaso",
  "baratza",
  "breville",
  "fellow",
  "codyscody",
  "YGroup_Stark",
  "YGroup_ekk43",
  "YGroup_H1",
  "YGroup_Scody",
  "YGroup_cody",
  "YGroup_DolceVita",
  "gift_card",
  "openbox",
].map((tag) => tag.toLowerCase());

const TIERED_DISCOUNTS = {
  200000: 22500,
  135000: 13500,
  80000: 8000,
  40000: 4000,
  20000: 2000,
  10000: 1000,
};

/**
 * Calculates the applicable cart total for discounts, excluding ineligible items.
 *
 * @param {RunInput["cart"]} cart The cart object from the Function input.
 * @returns {number} The total price of eligible items in cents.
 */
// export default function calculateApplicableCartTotal(cart) {
//   let total = 0;

//   for (const line of cart?.lines || []) {
//     if (line.merchandise.__typename === "CustomProduct") {
//       continue; // Skip custom products
//     }
//     const productTags = line.merchandise.product.hasTags.filter(
//       (tagObj) => tagObj.hasTag,
//     );
//     // Check for full exclusions first
//     const isFullyExcluded = FULL_EXCLUSIONS.some((excludedTag) =>
//       productTags.some((tagObj) => tagObj.tag.toLowerCase() === excludedTag),
//     );

//     if (isFullyExcluded) {
//       continue; // Skip to the next line item
//     }

//     console.log("fully", isFullyExcluded);

//     total += line.cost.totalAmount.amount * 100; // Convert to cents
//     console.log("total", total);
//   }

//   console.log("lasttotal", total);

//   return total;
// }
/**
 * Calculates the applicable cart total for discounts, excluding ineligible items.
 *
 * @param {RunInput["cart"]} cart The cart object from the Function input.
 * @returns {number} The total price of eligible items in cents.
 */
export default function calculateApplicableCartTotal(cart) {
  let total = 0;

  for (const line of cart?.lines || []) {
    if (line.merchandise.__typename === "CustomProduct") {
      continue; // Skip custom products
    }

    const productTags = line.merchandise.product.hasTags.filter(
      (tagObj) => tagObj.hasTag,
    );

    // Check for full exclusions first
    const isFullyExcluded = FULL_EXCLUSIONS.some((excludedTag) =>
      productTags.some((tagObj) => tagObj.tag.toLowerCase() === excludedTag),
    );
    console.log("isFullyExcluded", JSON.stringify(isFullyExcluded));

    if (isFullyExcluded) {
      continue; // Skip to the next line item
    }

    if (!isFullyExcluded) {
      total += line.cost.totalAmount.amount * 100; // Convert to cents
    }
  }

  return total;
}

/**
 * Determines the tiered discount amount based on the applicable cart total.
 *
 * @param {number} applicableCartTotal The total price of eligible items in cents.
 * @returns {number} The discount amount in cents.
 */
function calculateTieredDiscount(applicableCartTotal) {
  const thresholds = Object.keys(TIERED_DISCOUNTS)
    .map(Number)
    .sort((a, b) => b - a); // Sort thresholds in descending order

  for (const threshold of thresholds) {
    if (applicableCartTotal >= threshold) {
      return TIERED_DISCOUNTS[threshold]; // Return discount in cents
    }
  }

  return 0; // No discount if below the lowest threshold
}

/**
 * Applies the calculated discount proportionally to all eligible items in the cart.
 *
 * @param {RunInput["cart"]} cart The cart object from the Function input.
 * @param {number} discountAmount The total discount amount to apply in cents.
 * @returns {Discount[]} An array of Shopify discount objects.
 */
/**
 * Applies the calculated discount proportionally to all eligible items in the cart.
 *
 * @param {RunInput["cart"]} cart The cart object from the Function input.
 * @param {number} discountAmount The total discount amount to apply in cents.
 * @returns {Discount[]} An array of Shopify discount objects.
 */
/**
 * Applies the calculated discount proportionally to all eligible items in the cart.
 *
 * @param {RunInput["cart"]} cart The cart object from the Function input.
 * @param {number} discountAmount The total discount amount to apply in cents.
 * @returns {Discount[]} An array of Shopify discount objects.
 */
function applyTieredDiscount(cart, discountAmount) {
  if (discountAmount <= 0) {
    return []; // No discount to apply
  }

  const discountableItems = cart.lines.filter((line) => {
    if (line.merchandise.__typename === "CustomProduct") {
      return false; // Skip custom products
    }

    const productTags = line.merchandise.product.hasTags;

    const isExcluded =
      EXCLUDED_TAGS.some((excludedTag) =>
        productTags.some(
          (tagObj) => tagObj.tag.toLowerCase() === excludedTag && tagObj.hasTag,
        ),
      ) ||
      FULL_EXCLUSIONS.some((excludedTag) =>
        productTags.some(
          (tagObj) => tagObj.tag.toLowerCase() === excludedTag && tagObj.hasTag,
        ),
      );

    console.log("isExcluded", JSON.stringify(isExcluded));

    return !isExcluded;
  });

  if (discountableItems.length === 0) {
    return []; // No discountable items
  }

  const totalDiscountableAmount = discountableItems.reduce(
    (total, line) => total + line.cost.totalAmount.amount * 100, // Convert to cents
    0,
  );

  console.log("totalDiscountableAmount", totalDiscountableAmount);

  let discountProportion = discountAmount / totalDiscountableAmount;

  // Ensure discount proportion does not exceed 1
  discountProportion = Math.min(discountProportion, 1);

  return discountableItems.map((line) => {
    const discount = line.cost.totalAmount.amount * 100 * discountProportion; // Convert to cents

    const fixedDiscount = (discount / 100).toFixed(2); // Convert back to dollars

    return {
      targets: [
        {
          productVariant: {
            id:
              line.merchandise.__typename === "ProductVariant"
                ? line.merchandise.id
                : "null",
          },
        },
      ],
      value: {
        fixedAmount: fixedDiscount
          ? { amount: fixedDiscount }
          : { amount: undefined },
      },
    };
  });
}
/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */

export function run(input) {
  const applicableCartTotal = calculateApplicableCartTotal(input.cart);
  console.log("applicableCartTotal", applicableCartTotal);
  const discountAmount = calculateTieredDiscount(applicableCartTotal);
  console.log("discountAmount", discountAmount);
  const discounts = applyTieredDiscount(input.cart, discountAmount);
  console.log("discounts", JSON.stringify(discounts));

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.All,
    discounts: discounts,
  };
}
