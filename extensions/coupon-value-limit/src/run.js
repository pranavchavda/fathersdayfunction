export function run(input) {
  const discounts = input.discounts;
  const cartLines = input.cart.lines;
  const shopConfig = JSON.parse(input.shop.metafield?.value || "{}");
  const { maxDiscount, prefixes } = shopConfig;

  let totalDiscount = 0;
  const lineDiscounts = cartLines.map((line) => ({
    cartLineId: line.id,
    quantity: line.quantity,
    allocations: [],
  }));
  const displayableErrors = [];

  for (const discount of discounts) {
    for (const proposal of discount.discountProposals) {
      const discountCode = discount.code;
      const matchingPrefix = prefixes.find((prefix) =>
        discountCode.startsWith(prefix),
      );

      if (matchingPrefix) {
        for (const target of proposal.targets) {
          const lineIndex = cartLines.findIndex(
            (line) => line.id === target.cartLineId,
          );
          const line = cartLines[lineIndex];
          const linePrice = line.cost.amountPerQuantity.amount;

          let lineDiscount;
          if (proposal.value.__typename === "FixedAmount") {
            lineDiscount = proposal.value.appliesToEachItem
              ? proposal.value.amount * target.quantity
              : proposal.value.amount;
          } else if (proposal.value.__typename === "Percentage") {
            lineDiscount =
              (linePrice * target.quantity * proposal.value.value) / 100;
          }

          if (maxDiscount && totalDiscount + lineDiscount > maxDiscount) {
            lineDiscount = maxDiscount - totalDiscount;
            displayableErrors.push({
              discountId: discount.id,
              reason: "Maximum discount limit reached for the cart",
            });
          }

          if (lineDiscount > 0) {
            lineDiscounts[lineIndex].allocations.push({
              discountProposalId: proposal.handle,
              amount: lineDiscount,
            });
            totalDiscount += lineDiscount;
          }

          if (maxDiscount && totalDiscount >= maxDiscount) {
            break;
          }
        }
      }
    }
  }

  return {
    lineDiscounts: lineDiscounts.filter((line) => line.allocations.length > 0),
    displayableErrors,
  };
}
