// run.js

import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const { cart, discountNode } = input;

  // Initialize discountConfig
  let discountConfig = {};

  // Check if metafield exists and parse it
  if (discountNode.metafield?.value) {
    try {
      discountConfig = JSON.parse(discountNode.metafield.value);
      console.log("Parsed discount configuration:", discountConfig);
    } catch (error) {
      console.error("Invalid metafield JSON:", error);
      return {
        discounts: [],
        discountApplicationStrategy: DiscountApplicationStrategy.All,
      };
    }
  } else {
    console.error("Metafield not found.");
    return {
      discounts: [],
      discountApplicationStrategy: DiscountApplicationStrategy.All,
    };
  }

  // Extract variables from discountConfig
  const percentageDiscount = parseFloat(discountConfig.percentage_discount);
  const maximumDiscountAmount = parseFloat(
    discountConfig.maximum_discount_amount
  );
  const eligibleCollectionIds = discountConfig.eligibleCollectionIds; // Array of collection IDs

  console.log("Percentage Discount:", percentageDiscount);
  console.log("Maximum Discount Amount:", maximumDiscountAmount);
  console.log("Eligible Collection IDs:", eligibleCollectionIds);

  // Validate discount configuration
  if (
    isNaN(percentageDiscount) ||
    percentageDiscount <= 0 ||
    isNaN(maximumDiscountAmount) ||
    maximumDiscountAmount <= 0 ||
    !Array.isArray(eligibleCollectionIds) ||
    eligibleCollectionIds.length === 0
  ) {
    console.error("Invalid discount configuration.");
    return {
      discounts: [],
      discountApplicationStrategy: DiscountApplicationStrategy.All,
    };
  }

  const eligibleLines = [];
  let totalEligibleAmount = 0;

  // Iterate over cart lines to identify eligible lines
  for (const line of cart.lines) {
    const merchandise = line.merchandise;
    if (merchandise.__typename !== "ProductVariant") {
      continue;
    }

    const product = merchandise.product;
    const isInEligibleCollection = product.inAnyCollection;

    console.log(
      `Product ID: ${product.id}, In Eligible Collection: ${isInEligibleCollection}`
    );

    if (!isInEligibleCollection) {
      continue; // Skip products not in eligible collections
    }

    const lineTotal = parseFloat(line.cost.totalAmount.amount);
    eligibleLines.push(line);
    totalEligibleAmount += lineTotal;
  }

  console.log("Total Eligible Amount:", totalEligibleAmount);

  if (totalEligibleAmount === 0) {
    console.log("No eligible cart lines found for discount.");
    return {
      discounts: [],
      discountApplicationStrategy: DiscountApplicationStrategy.All,
    };
  }

  // Calculate the applicable discount percentage
  let applicableDiscountPercentage = percentageDiscount;

  const totalPotentialDiscount =
    (totalEligibleAmount * percentageDiscount) / 100;

  if (totalPotentialDiscount > maximumDiscountAmount) {
    applicableDiscountPercentage =
      (maximumDiscountAmount / totalEligibleAmount) * 100;
    console.log(
      `Adjusted discount percentage to ${applicableDiscountPercentage.toFixed(
        2
      )}% to cap at ${maximumDiscountAmount}`
    );
  } else {
    console.log(
      `Using original discount percentage of ${applicableDiscountPercentage}%`
    );
  }

  // Create discount targets
  const discountTargets = eligibleLines.map((line) => ({
    cartLine: {
      id: line.id,
    },
  }));

  // Create a single discount object
  const discount = {
    targets: discountTargets,
    value: {
      percentage: {
        value: applicableDiscountPercentage.toFixed(6), // Convert to decimal
      },
    },
    message: `Discount (${applicableDiscountPercentage.toFixed(2)}% off)`,
  };

  console.log(
    `Applying discount: ${applicableDiscountPercentage.toFixed(2)}% to ${
      eligibleLines.length
    } cart lines`
  );

  console.log(
    "Total Discount Amount Applied:",
    applicableDiscountPercentage * totalEligibleAmount
  );

  return {
    discounts: [discount],
    discountApplicationStrategy: DiscountApplicationStrategy.All,
  };
}
