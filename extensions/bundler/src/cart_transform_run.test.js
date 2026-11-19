import { describe, it, expect } from "vitest";
import { cartTransformRun as run } from "./cart_transform_run";

const MACHINE = "gid://shopify/ProductVariant/1001";
const COFFEE = "gid://shopify/ProductVariant/44345736462370";
const SCALE = "gid://shopify/ProductVariant/2002";
const VANILLA = "gid://shopify/ProductVariant/44697343557666";
const CARAMEL = "gid://shopify/ProductVariant/44697342804002";

function line({
  id = "gid://shopify/CartLine/1",
  quantity = 1,
  amount = "1999.00",
  ids,
  quantities,
  choiceIds,
  choice,
  usIds,
  usQuantities,
  usChoiceIds,
  typename = "ProductVariant",
} = {}) {
  return {
    id,
    quantity,
    cost: { amountPerQuantity: { amount } },
    bundleChoice: choice === undefined ? null : { value: choice },
    merchandise: {
      __typename: typename,
      id: MACHINE,
      product: {
        id: "gid://shopify/Product/1",
        title: "Test Machine",
        bundleProductIds: ids === undefined ? null : { value: ids },
        bundleProductQuantities:
          quantities === undefined ? null : { value: quantities },
        bundleChoiceIds: choiceIds === undefined ? null : { value: choiceIds },
        bundleProductIdsUs: usIds === undefined ? null : { value: usIds },
        bundleProductQuantitiesUs:
          usQuantities === undefined ? null : { value: usQuantities },
        bundleChoiceIdsUs:
          usChoiceIds === undefined ? null : { value: usChoiceIds },
      },
    },
  };
}

const fixed = (amount) => ({
  adjustment: { fixedPricePerUnit: { amount } },
});

describe("bundler cart transform", () => {
  it("returns no operations for an empty / missing input", () => {
    expect(run({})).toEqual({ operations: [] });
    expect(run({ cart: { lines: [] } })).toEqual({ operations: [] });
  });

  it("ignores lines without a bundle metafield", () => {
    expect(run({ cart: { lines: [line()] } })).toEqual({ operations: [] });
    expect(run({ cart: { lines: [line({ ids: "[]" })] } })).toEqual({
      operations: [],
    });
  });

  it("ignores non-variant merchandise", () => {
    const result = run({
      cart: { lines: [line({ typename: "CustomProduct", ids: `["${COFFEE}"]` })] },
    });
    expect(result).toEqual({ operations: [] });
  });

  it("legacy config (ids only) → one of each gift, parent at full price, gifts at $0", () => {
    const result = run({
      cart: { lines: [line({ ids: JSON.stringify([COFFEE, SCALE]) })] },
    });
    expect(result).toEqual({
      operations: [
        {
          lineExpand: {
            cartLineId: "gid://shopify/CartLine/1",
            title: "Test Machine Bundle",
            expandedCartItems: [
              { merchandiseId: MACHINE, quantity: 1, price: fixed("1999.00") },
              { merchandiseId: COFFEE, quantity: 1, price: fixed("0.00") },
              { merchandiseId: SCALE, quantity: 1, price: fixed("0.00") },
            ],
          },
        },
      ],
    });
  });

  it("uses bundle_product_quantities for per-gift quantities", () => {
    const result = run({
      cart: {
        lines: [
          line({ ids: JSON.stringify([COFFEE]), quantities: JSON.stringify([2]) }),
        ],
      },
    });
    expect(result.operations[0].lineExpand.expandedCartItems).toEqual([
      { merchandiseId: MACHINE, quantity: 1, price: fixed("1999.00") },
      { merchandiseId: COFFEE, quantity: 2, price: fixed("0.00") },
    ]);
  });

  it("accepts string entries in the quantities list (Shopify list.number_integer)", () => {
    const result = run({
      cart: {
        lines: [
          line({
            ids: JSON.stringify([COFFEE, SCALE]),
            quantities: JSON.stringify(["2", "1"]),
          }),
        ],
      },
    });
    const items = result.operations[0].lineExpand.expandedCartItems;
    expect(items[1].quantity).toBe(2);
    expect(items[2].quantity).toBe(1);
  });

  it("defaults to 1 when the quantities list is short or has bad values", () => {
    const result = run({
      cart: {
        lines: [
          line({
            ids: JSON.stringify([COFFEE, SCALE]),
            quantities: JSON.stringify([0]),
          }),
        ],
      },
    });
    const items = result.operations[0].lineExpand.expandedCartItems;
    expect(items[1].quantity).toBe(1);
    expect(items[2].quantity).toBe(1);
  });

  it("scales gift quantity with the parent line quantity", () => {
    const result = run({
      cart: {
        lines: [
          line({
            quantity: 2,
            ids: JSON.stringify([COFFEE]),
            quantities: JSON.stringify([2]),
          }),
        ],
      },
    });
    expect(result.operations[0].lineExpand.expandedCartItems).toEqual([
      { merchandiseId: MACHINE, quantity: 2, price: fixed("1999.00") },
      { merchandiseId: COFFEE, quantity: 4, price: fixed("0.00") },
    ]);
  });

  it("uses the line's presentment price (e.g. USD market) for the parent", () => {
    const result = run({
      cart: { lines: [line({ amount: "1450.5", ids: JSON.stringify([COFFEE]) })] },
    });
    expect(result.operations[0].lineExpand.expandedCartItems[0].price).toEqual(
      fixed("1450.5")
    );
  });

  it("never lets a malformed metafield take the function down", () => {
    const result = run({
      cart: {
        lines: [
          line({ id: "gid://shopify/CartLine/bad", ids: "not json" }),
          line({ id: "gid://shopify/CartLine/ok", ids: JSON.stringify([COFFEE]) }),
        ],
      },
    });
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].lineExpand.cartLineId).toBe("gid://shopify/CartLine/ok");
  });

  it("drops a gift id that points at the parent itself and non-variant ids", () => {
    const result = run({
      cart: {
        lines: [
          line({
            ids: JSON.stringify([MACHINE, "gid://shopify/Product/9", COFFEE]),
          }),
        ],
      },
    });
    const items = result.operations[0].lineExpand.expandedCartItems;
    expect(items.map((i) => i.merchandiseId)).toEqual([MACHINE, COFFEE]);
  });

  describe("customer choice (_bundle_choice + bundle_choice_ids)", () => {
    const SYRUPS = JSON.stringify([VANILLA, CARAMEL]);

    it("adds the chosen variant at $0 alongside the fixed gifts", () => {
      const result = run({
        cart: {
          lines: [
            line({
              ids: JSON.stringify([COFFEE]),
              quantities: JSON.stringify([2]),
              choiceIds: SYRUPS,
              choice: VANILLA,
            }),
          ],
        },
      });
      expect(result.operations[0].lineExpand.expandedCartItems).toEqual([
        { merchandiseId: MACHINE, quantity: 1, price: fixed("1999.00") },
        { merchandiseId: COFFEE, quantity: 2, price: fixed("0.00") },
        { merchandiseId: VANILLA, quantity: 1, price: fixed("0.00") },
      ]);
    });

    it("expands a choice-only product (no fixed gifts) once a choice is made", () => {
      const noChoice = run({ cart: { lines: [line({ choiceIds: SYRUPS })] } });
      expect(noChoice).toEqual({ operations: [] });

      const chosen = run({
        cart: { lines: [line({ choiceIds: SYRUPS, choice: CARAMEL })] },
      });
      expect(chosen.operations[0].lineExpand.expandedCartItems).toEqual([
        { merchandiseId: MACHINE, quantity: 1, price: fixed("1999.00") },
        { merchandiseId: CARAMEL, quantity: 1, price: fixed("0.00") },
      ]);
    });

    it("scales the choice with the parent quantity", () => {
      const result = run({
        cart: {
          lines: [line({ quantity: 3, choiceIds: SYRUPS, choice: VANILLA })],
        },
      });
      expect(result.operations[0].lineExpand.expandedCartItems[1]).toEqual({
        merchandiseId: VANILLA,
        quantity: 3,
        price: fixed("0.00"),
      });
    });

    it("ignores 'declined', blanks and values not on the allow-list", () => {
      const gifts = JSON.stringify([COFFEE]);
      for (const choice of ["declined", "", "  ", SCALE, "gid://shopify/Product/1"]) {
        const result = run({
          cart: { lines: [line({ ids: gifts, choiceIds: SYRUPS, choice })] },
        });
        const items = result.operations[0].lineExpand.expandedCartItems;
        expect(items.map((i) => i.merchandiseId)).toEqual([MACHINE, COFFEE]);
      }
      // Choice-only product + bad value → not a bundle at all.
      expect(
        run({ cart: { lines: [line({ choiceIds: SYRUPS, choice: SCALE })] } })
      ).toEqual({ operations: [] });
    });

    it("ignores a choice when the product has no allow-list", () => {
      const result = run({
        cart: { lines: [line({ ids: JSON.stringify([COFFEE]), choice: VANILLA })] },
      });
      const items = result.operations[0].lineExpand.expandedCartItems;
      expect(items.map((i) => i.merchandiseId)).toEqual([MACHINE, COFFEE]);
    });

    it("never duplicates the parent or a fixed gift through the choice", () => {
      const result = run({
        cart: {
          lines: [
            line({
              ids: JSON.stringify([COFFEE]),
              choiceIds: JSON.stringify([COFFEE, MACHINE, VANILLA]),
              choice: COFFEE,
            }),
          ],
        },
      });
      const items = result.operations[0].lineExpand.expandedCartItems;
      expect(items.map((i) => i.merchandiseId)).toEqual([MACHINE, COFFEE]);
    });

    it("a malformed allow-list does not break the fixed gifts", () => {
      const result = run({
        cart: {
          lines: [
            line({ ids: JSON.stringify([COFFEE]), choiceIds: "nope", choice: VANILLA }),
          ],
        },
      });
      expect(result.operations).toHaveLength(1);
    });
  });

  describe("country split (_us metafields)", () => {
    const inCountry = (isoCode, ...lines) => ({
      localization: { country: { isoCode } },
      cart: { lines },
    });
    const items = (result) =>
      result.operations[0].lineExpand.expandedCartItems.map((i) => [
        i.merchandiseId,
        i.quantity,
        i.price.adjustment.fixedPricePerUnit.amount,
      ]);
    const both = {
      ids: JSON.stringify([COFFEE]),
      quantities: "[2]",
      usIds: JSON.stringify([SCALE]),
      usQuantities: "[3]",
    };

    it("US carts get the _us gifts and quantities", () => {
      expect(items(run(inCountry("US", line(both))))).toEqual([
        [MACHINE, 1, "1999.00"],
        [SCALE, 3, "0.00"],
      ]);
    });

    it("CA and other countries get the default gifts", () => {
      for (const c of ["CA", "GB"]) {
        expect(items(run(inCountry(c, line(both))))).toEqual([
          [MACHINE, 1, "1999.00"],
          [COFFEE, 2, "0.00"],
        ]);
      }
    });

    it("missing localization behaves like the default set", () => {
      expect(items(run({ cart: { lines: [line(both)] } }))).toEqual([
        [MACHINE, 1, "1999.00"],
        [COFFEE, 2, "0.00"],
      ]);
    });

    it("no fallback: a US cart without _us metafields gets no gift", () => {
      const l = line({ ids: JSON.stringify([COFFEE]) });
      expect(run(inCountry("US", l))).toEqual({ operations: [] });
    });

    it("no fallback: a CA cart with only _us metafields gets no gift", () => {
      const l = line({ usIds: JSON.stringify([SCALE]) });
      expect(run(inCountry("CA", l))).toEqual({ operations: [] });
    });

    it("the choice allow-list is per country", () => {
      const l = (choice) =>
        line({
          choiceIds: JSON.stringify([VANILLA]),
          usChoiceIds: JSON.stringify([CARAMEL]),
          choice,
        });
      expect(items(run(inCountry("US", l(CARAMEL))))).toEqual([
        [MACHINE, 1, "1999.00"],
        [CARAMEL, 1, "0.00"],
      ]);
      expect(run(inCountry("US", l(VANILLA)))).toEqual({ operations: [] });
      expect(items(run(inCountry("CA", l(VANILLA))))).toEqual([
        [MACHINE, 1, "1999.00"],
        [VANILLA, 1, "0.00"],
      ]);
      expect(run(inCountry("CA", l(CARAMEL)))).toEqual({ operations: [] });
    });

    it("a malformed _us metafield only drops that line", () => {
      const bad = line({ usIds: "{not json" });
      const good = line({
        id: "gid://shopify/CartLine/2",
        usIds: JSON.stringify([SCALE]),
      });
      expect(run(inCountry("US", bad, good)).operations).toHaveLength(1);
    });
  });
});
