import { describe, it, expect } from "vitest";
import { run } from "./run";

/**
 * @typedef {import("../generated/api").FunctionResult} FunctionResult
 */

describe("product discounts function", () => {
  it("returns no discounts without configuration", () => {
    const result = run({
      discountNode: {
        metafield: null,
      },
    });
    const expected = /** @type {FunctionResult} */ ({
      discounts: [],
      discountApplicationStrategy: "ALL",
    });

    expect(result).toEqual(expected);
  });
});

describe("calculateApplicableCartTotal", () => {
  it("calculates the applicable cart total correctly", () => {
    const cart = {
      lines: [
        {
          merchandise: {
            __typename: "Product",
            product: {
              hasTags: [
                { tag: "la-marzocco", hasTag: true },
                { tag: "breville", hasTag: true },
              ],
            },
            cost: {
              totalAmount: {
                amount: 100,
              },
            },
          },
        },
        {
          merchandise: {
            __typename: "CustomProduct",
          },
        },
        {
          merchandise: {
            __typename: "Product",
            product: {
              hasTags: [
                { tag: "jura", hasTag: true },
                { tag: "fellow", hasTag: true },
              ],
            },
            cost: {
              totalAmount: {
                amount: 200,
              },
            },
          },
          merchandise: {
            __typename: "Product",
            product: {
              hasTags: [
                { tag: "ramu", hasTag: false },
                { tag: "kaka", hasTag: false },
              ],
            },
            cost: {
              totalAmount: {
                amount: 200,
              },
            },
          },
        },
      ],
    };

    const result = run({ cart });
    const expected = 300; // 100 + 200

    expect(result).toEqual(expected);
  });
});
