// ../../node_modules/.pnpm/javy@0.1.1/node_modules/javy/dist/index.js
var r = /* @__PURE__ */ ((t) => (t[t.Stdin = 0] = "Stdin", t[t.Stdout = 1] = "Stdout", t[t.Stderr = 2] = "Stderr", t))(r || {});

// ../../node_modules/.pnpm/javy@0.1.1/node_modules/javy/dist/fs/index.js
function o(i) {
  let r2 = new Uint8Array(1024), e = 0;
  for (; ; ) {
    const t = Javy.IO.readSync(i, r2.subarray(e));
    if (t < 0)
      throw Error("Error while reading from file descriptor");
    if (t === 0)
      return r2.subarray(0, e + t);
    if (e += t, e === r2.length) {
      const n = new Uint8Array(r2.length * 2);
      n.set(r2), r2 = n;
    }
  }
}
function l(i, r2) {
  for (; r2.length > 0; ) {
    const e = Javy.IO.writeSync(i, r2);
    if (e < 0)
      throw Error("Error while writing to file descriptor");
    if (e === 0)
      throw Error("Could not write all contents in buffer to file descriptor");
    r2 = r2.subarray(e);
  }
}

// ../../node_modules/.pnpm/@shopify+shopify_function@0.1.0_@babel+core@7.25.2_@types+node@20.16.4_javy@0.1.1/node_modules/@shopify/shopify_function/run.ts
function run_default(userfunction) {
  const input_data = o(r.Stdin);
  const input_str = new TextDecoder("utf-8").decode(input_data);
  const input_obj = JSON.parse(input_str);
  const output_obj = userfunction(input_obj);
  const output_str = JSON.stringify(output_obj);
  const output_data = new TextEncoder().encode(output_str);
  l(r.Stdout, output_data);
}

// src/run.js
var ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_OPERATION: "INVALID_OPERATION",
  MERCHANDISE_NOT_FOUND: "MERCHANDISE_NOT_FOUND",
  CART_LINE_NOT_FOUND: "CART_LINE_NOT_FOUND",
  OPERATION_FAILED: "OPERATION_FAILED"
};
function run(input) {
  const operations = [];
  try {
    const mockCart = {
      id: "gid://shopify/Cart/1",
      lines: [
        {
          id: "gid://shopify/CartLine/1",
          quantity: 1,
          merchandise: {
            __typename: "ProductVariant",
            id: "gid://shopify/ProductVariant/123456"
          },
          cost: {
            totalAmount: {
              amount: "100.00",
              currencyCode: "USD"
            }
          }
        }
      ],
      cost: {
        subtotalAmount: {
          amount: "100.00",
          currencyCode: "USD"
        }
      }
    };
    let config = {
      minimum_cart_value: "50.00",
      eligible_collection_ids: [],
      eligible_tag: "fathers-day",
      free_gift_variant_id: "gid://shopify/ProductVariant/987654321",
      free_gift_quantity: 1
    };
    try {
      if (input?.cartTransform?.metafield?.value) {
        const metafieldValue = JSON.parse(input.cartTransform.metafield.value);
        config = {
          ...config,
          ...metafieldValue
        };
      }
    } catch (error) {
      console.error("Error parsing metafield configuration:", error);
    }
    const minimumCartValue = parseFloat(config.minimum_cart_value);
    const freeGiftVariantId = config.free_gift_variant_id;
    const freeGiftQuantity = parseInt(config.free_gift_quantity) || 1;
    const cart = mockCart;
    const subtotalAmount = parseFloat(cart.cost.subtotalAmount.amount);
    const currencyCode = cart.cost.subtotalAmount.currencyCode;
    if (subtotalAmount >= minimumCartValue) {
      const targetLine = cart.lines[0];
      if (targetLine) {
        operations.push({
          merge: {
            cartLineIds: [targetLine.id],
            parentVariantId: targetLine.merchandise.id,
            title: "Your Purchase with Free Gift",
            price: {
              adjustment: {
                fixedPrice: {
                  amount: targetLine.cost.totalAmount.amount,
                  currencyCode
                }
              }
            }
          }
        });
        operations.push({
          expand: {
            cartLineId: targetLine.id,
            title: "Your Purchase with Free Gift",
            expandedCartItems: [
              {
                merchandiseId: targetLine.merchandise.id,
                quantity: targetLine.quantity
              },
              {
                merchandiseId: freeGiftVariantId,
                quantity: freeGiftQuantity,
                price: {
                  adjustment: {
                    fixedPricePerUnit: {
                      amount: "0.00",
                      currencyCode
                    }
                  }
                }
              }
            ]
          }
        });
      }
    }
    return { operations };
  } catch (error) {
    console.error("Error in free gift function:", error);
    return {
      operations: [],
      errors: [{
        code: ERROR_CODES.OPERATION_FAILED,
        message: "Unexpected error: " + error.message
      }]
    };
  }
}

// <stdin>
function run2() {
  return run_default(run);
}
export {
  run2 as run
};
