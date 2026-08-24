import { describe, it, expect } from "vitest";
import { cartLinesDiscountsGenerateRun as run } from "./cart_lines_discounts_generate_run";

const cfg = (o = {}) =>
  JSON.stringify({
    percentage_discount: "10",
    maximum_discount_amount: "50",
    eligibleCollectionIds: ["gid://shopify/Collection/1"],
    ...o,
  });
const line = (id, amount, eligible = true) => ({
  id: `gid://shopify/CartLine/${id}`,
  quantity: 1,
  cost: { totalAmount: { amount: String(amount), currencyCode: "CAD" } },
  merchandise: { __typename: "ProductVariant", id: `gid://shopify/ProductVariant/${id}`, product: { id: `gid://shopify/Product/${id}`, inAnyCollection: eligible } },
});
const input = (lines, value = cfg(), discountClasses = ["PRODUCT"]) => ({
  cart: { lines, cost: { totalAmount: { amount: "0", currencyCode: "CAD" } } },
  discount: { discountClasses, metafield: value === null ? null : { value } },
});

describe("capped-discount", () => {
  it("no config / bad config / wrong class → nothing", () => {
    expect(run(input([line(1, 100)], null))).toEqual({ operations: [] });
    expect(run(input([line(1, 100)], "x"))).toEqual({ operations: [] });
    expect(run(input([line(1, 100)], cfg({ eligibleCollectionIds: [] })))).toEqual({ operations: [] });
    expect(run(input([line(1, 100)], cfg(), ["ORDER"]))).toEqual({ operations: [] });
  });
  it("applies the full percentage under the cap", () => {
    const r = run(input([line(1, 100), line(2, 200, false)]));
    const c = r.operations[0].productDiscountsAdd.candidates[0];
    expect(c.targets).toEqual([{ cartLine: { id: "gid://shopify/CartLine/1" } }]);
    expect(c.value.percentage.value).toBe("10.000000");
  });
  it("scales the percentage down to respect the cap", () => {
    const r = run(input([line(1, 1000)])); // 10% = 100 > cap 50 → 5%
    expect(r.operations[0].productDiscountsAdd.candidates[0].value.percentage.value).toBe("5.000000");
    expect(r.operations[0].productDiscountsAdd.candidates[0].message).toBe("Discount (5.00% off)");
  });
  it("ignores carts with no eligible lines", () => {
    expect(run(input([line(1, 100, false)]))).toEqual({ operations: [] });
  });
});
