// // @ts-check

// /**
//  * @typedef {import("../generated/api").RunInput} RunInput
//  * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
//  */

// /**
//  * @type {FunctionRunResult}
//  */
// const NO_CHANGES = {
//   operations: [],
// };

// /**
//  * @param {RunInput} input
//  * @returns {FunctionRunResult}
//  */
// export function run(input) {
//   return NO_CHANGES;
// };
export function run(input) {
  const operations = [];

  for (const line of input.cart.lines) {
    if (line.merchandise.__typename === "ProductVariant") {
      const bundleProductIds = line.merchandise.product.metafield?.value;

      if (bundleProductIds) {
        const bundledItems = JSON.parse(bundleProductIds);
        const expandedCartItems = [
          {
            merchandiseId: line.merchandise.id,
            quantity: line.quantity,
          },
          ...bundledItems.map((id) => ({
            merchandiseId: id,
            quantity: line.quantity,
          })),
        ];

        operations.push({
          expand: {
            cartLineId: line.id,
            title: `${line.merchandise.product.title} Bundle`,
            expandedCartItems: expandedCartItems,
          },
        });
      }
    }
  }

  return operations.length > 0 ? { operations } : { operations: [] };
}
