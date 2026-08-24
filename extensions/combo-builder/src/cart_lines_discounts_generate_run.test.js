import { describe, it, expect } from "vitest";
import { cartLinesDiscountsGenerateRun as run, parseTiers, calculateComboDiscount } from "./cart_lines_discounts_generate_run";

const TIERS = JSON.stringify([[{ price: 1500, discount: 100 }], [{ price: 3000, discount: 250 }]]);
const line = (id, amount, { machine = false, grinder = false, openbox = false } = {}) => ({
  id: `gid://shopify/CartLine/${id}`,
  quantity: 1,
  cost: { subtotalAmount: { amount: String(amount), currencyCode: "CAD" } },
  merchandise: { __typename: "ProductVariant", id: `gid://shopify/ProductVariant/${id}`, product: { id: `gid://shopify/Product/${id}`, hasMachineTag: machine, hasGrinderTag: grinder, hasOpenboxTag: openbox } },
});
const input = (lines, value = TIERS, discountClasses = ["PRODUCT"]) => ({ cart: { lines }, discount: { discountClasses, metafield: value === null ? null : { value } } });

describe("combo-builder", () => {
  it("parses the legacy nested tier shape", () => {
    expect(parseTiers(TIERS)).toEqual([{ price: 1500, discount: 100 }, { price: 3000, discount: 250 }]);
    expect(parseTiers("junk")).toEqual([]);
    expect(parseTiers(null)).toEqual([]);
  });
  it("picks the highest tier met and requires grinder ≥ 20% of machine", () => {
    const tiers = parseTiers(TIERS);
    expect(calculateComboDiscount(2500, 600, tiers)).toBe(250);
    expect(calculateComboDiscount(1200, 400, tiers)).toBe(100);
    expect(calculateComboDiscount(2500, 400, tiers)).toBe(0);
  });
  it("targets both lines of the pair with one fixed amount", () => {
    const r = run(input([line(1, 2500, { machine: true }), line(2, 600, { grinder: true })]));
    expect(r.operations[0].productDiscountsAdd.candidates).toEqual([
      { targets: [{ cartLine: { id: "gid://shopify/CartLine/1" } }, { cartLine: { id: "gid://shopify/CartLine/2" } }], value: { fixedAmount: { amount: "250" } }, message: "Combo Discount: 250" },
    ]);
  });
  it("nothing without config, pair, or PRODUCT class", () => {
    expect(run(input([line(1, 2500, { machine: true }), line(2, 600, { grinder: true })], null))).toEqual({ operations: [] });
    expect(run(input([line(1, 2500, { machine: true })]))).toEqual({ operations: [] });
    expect(run(input([line(1, 2500, { machine: true }), line(2, 600, { grinder: true })], TIERS, []))).toEqual({ operations: [] });
  });
});
