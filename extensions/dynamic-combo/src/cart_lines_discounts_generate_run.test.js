import { describe, it, expect } from "vitest";
import { cartLinesDiscountsGenerateRun as run } from "./cart_lines_discounts_generate_run";

const line = (id, { machine = false, grinder = false, openbox = false, value = null } = {}) => ({
  id: `gid://shopify/CartLine/${id}`,
  quantity: 1,
  cost: { subtotalAmount: { amount: "1000", currencyCode: "CAD" } },
  merchandise: { __typename: "ProductVariant", id: `gid://shopify/ProductVariant/${id}`, product: { id: `gid://shopify/Product/${id}`, hasMachineTag: machine, hasGrinderTag: grinder, hasOpenboxTag: openbox, comboDiscountValue: value == null ? null : { value: String(value) } } },
});
const input = (lines, discountClasses = ["PRODUCT"]) => ({ cart: { lines }, discount: { discountClasses } });

describe("dynamic-combo", () => {
  it("discounts a machine+grinder pair by their metafield values", () => {
    const r = run(input([line(1, { machine: true, value: 79 }), line(2, { grinder: true, value: 21 })]));
    expect(r.operations[0].productDiscountsAdd.candidates).toEqual([
      { targets: [{ cartLine: { id: "gid://shopify/CartLine/1" } }], value: { fixedAmount: { amount: "79" } }, message: "Combo Discount: 79" },
      { targets: [{ cartLine: { id: "gid://shopify/CartLine/2" } }], value: { fixedAmount: { amount: "21" } }, message: "Combo Discount: 21" },
    ]);
  });
  it("needs both values > 0, ignores openbox, pairs 1:1", () => {
    expect(run(input([line(1, { machine: true, value: 79 }), line(2, { grinder: true })]))).toEqual({ operations: [] });
    expect(run(input([line(1, { machine: true, value: 79, openbox: true }), line(2, { grinder: true, value: 21 })]))).toEqual({ operations: [] });
    const r = run(input([line(1, { machine: true, value: 79 }), line(2, { machine: true, value: 50 }), line(3, { grinder: true, value: 21 })]));
    expect(r.operations[0].productDiscountsAdd.candidates).toHaveLength(2);
  });
  it("nothing without PRODUCT class", () => {
    expect(run(input([line(1, { machine: true, value: 79 }), line(2, { grinder: true, value: 21 })], []))).toEqual({ operations: [] });
  });
});
