import { describe, it, expect } from "vitest";
import {
  cartLinesDiscountsGenerateRun as run,
  calculateApplicableCartTotal,
  calculateTieredDiscount,
} from "./cart_lines_discounts_generate_run";

const CONFIG = {
  excludedTags: ["bts2026-partial"],
  fullExclusions: ["bts2026-full"],
  tieredDiscounts: {
    10000: 1000,
    20000: 2000,
    40000: 4000,
    80000: 8000,
    135000: 13500,
    200000: 22500,
  },
};

function line(id, amount, { excluded = false, full = false, custom = false } = {}) {
  return {
    id: `gid://shopify/CartLine/${id}`,
    quantity: 1,
    cost: { totalAmount: { amount: String(amount), currencyCode: "CAD" } },
    merchandise: custom
      ? { __typename: "CustomProduct" }
      : {
          __typename: "ProductVariant",
          id: `gid://shopify/ProductVariant/${id}`,
          product: {
            handle: `p${id}`,
            isGiftCard: false,
            hasExcludedTag: excluded,
            hasFullyExcludedTag: full,
          },
        },
  };
}

const input = (lines, overrides = {}) => ({
  cart: { lines },
  discount: {
    discountClasses: ["PRODUCT"],
    metafield: { value: JSON.stringify(CONFIG) },
  },
  ...overrides,
});

describe("cartLinesDiscountsGenerateRun", () => {
  it("returns no operations without configuration", () => {
    expect(
      run({ cart: { lines: [line(1, 3000)] }, discount: { discountClasses: ["PRODUCT"], metafield: null } })
    ).toEqual({ operations: [] });
  });

  it("returns no operations when PRODUCT class is not enabled", () => {
    expect(
      run(input([line(1, 3000)], { discount: { discountClasses: ["ORDER"], metafield: { value: JSON.stringify(CONFIG) } } }))
    ).toEqual({ operations: [] });
  });

  it("tolerates malformed configuration", () => {
    expect(
      run(input([line(1, 3000)], { discount: { discountClasses: ["PRODUCT"], metafield: { value: "nope" } } }))
    ).toEqual({ operations: [] });
  });

  it("applies the top tier ($225 off) to a $3995 machine", () => {
    expect(run(input([line(1, 3995)]))).toEqual({
      operations: [
        {
          productDiscountsAdd: {
            selectionStrategy: "ALL",
            candidates: [
              {
                targets: [{ cartLine: { id: "gid://shopify/CartLine/1" } }],
                value: { fixedAmount: { amount: "225.00" } },
              },
            ],
          },
        },
      ],
    });
  });

  it("gives nothing below the lowest tier", () => {
    expect(run(input([line(1, 99.99)]))).toEqual({ operations: [] });
  });

  it("spreads the discount proportionally across discountable lines", () => {
    const result = run(input([line(1, 1500), line(2, 500)])); // total 2000 → tier 200000 → $225
    const c = result.operations[0].productDiscountsAdd.candidates;
    expect(c.map((x) => x.value.fixedAmount.amount)).toEqual(["168.75", "56.25"]);
  });

  it("partially excluded lines count toward the tier but get no discount", () => {
    const result = run(input([line(1, 2699, { excluded: true }), line(2, 100)]));
    const c = result.operations[0].productDiscountsAdd.candidates;
    expect(c).toHaveLength(1);
    expect(c[0].targets[0].cartLine.id).toBe("gid://shopify/CartLine/2");
    // tier from 2799 → $225, capped at the discountable total ($100)
    expect(c[0].value.fixedAmount.amount).toBe("100.00");
  });

  it("fully excluded lines neither count nor get discounted", () => {
    expect(run(input([line(1, 5000, { full: true }), line(2, 50)]))).toEqual({ operations: [] });
  });

  it("ignores custom products", () => {
    expect(calculateApplicableCartTotal({ lines: [line(1, 100, { custom: true }), line(2, 200)] })).toBe(20000);
  });
});

describe("calculateTieredDiscount", () => {
  it("picks the highest threshold met", () => {
    expect(calculateTieredDiscount(200000, CONFIG.tieredDiscounts)).toBe(22500);
    expect(calculateTieredDiscount(199999, CONFIG.tieredDiscounts)).toBe(13500);
    expect(calculateTieredDiscount(10000, CONFIG.tieredDiscounts)).toBe(1000);
    expect(calculateTieredDiscount(9999, CONFIG.tieredDiscounts)).toBe(0);
    expect(calculateTieredDiscount(50000, undefined)).toBe(0);
  });
});
