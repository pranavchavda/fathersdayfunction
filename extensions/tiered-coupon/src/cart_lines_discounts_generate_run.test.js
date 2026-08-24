import { describe, it, expect } from "vitest";
import { cartLinesDiscountsGenerateRun as run } from "./cart_lines_discounts_generate_run";

const line = (id, pct) => ({
  id: `gid://shopify/CartLine/${id}`,
  quantity: 1,
  cost: { totalAmount: { amount: "100", currencyCode: "CAD" } },
  merchandise: { __typename: "ProductVariant", id: `gid://shopify/ProductVariant/${id}`, product: { id: `gid://shopify/Product/${id}`, discountPercentage: pct == null ? null : { value: String(pct) } } },
});
const input = (lines, discountClasses = ["PRODUCT"]) => ({ cart: { lines }, discount: { discountClasses, metafield: null } });

describe("tiered-coupon", () => {
  it("discounts only lines whose product carries discount_percentage", () => {
    const r = run(input([line(1, 15), line(2, null), line(3, "0"), line(4, "abc")]));
    const c = r.operations[0].productDiscountsAdd.candidates;
    expect(c).toEqual([
      { targets: [{ cartLine: { id: "gid://shopify/CartLine/1" } }], value: { percentage: { value: "15.000000" } }, message: "Discount (15% off)" },
    ]);
  });
  it("nothing when no line qualifies or class missing", () => {
    expect(run(input([line(1, null)]))).toEqual({ operations: [] });
    expect(run(input([line(1, 15)], ["ORDER"]))).toEqual({ operations: [] });
  });
});
