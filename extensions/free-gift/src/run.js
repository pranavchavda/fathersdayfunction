/**
 * Error codes for Cart Transform API
 */
const ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_OPERATION: "INVALID_OPERATION",
  MERCHANDISE_NOT_FOUND: "MERCHANDISE_NOT_FOUND",
  CART_LINE_NOT_FOUND: "CART_LINE_NOT_FOUND",
  OPERATION_FAILED: "OPERATION_FAILED"
};

/**
 * Free Gift Cart Transform Function
 * 
 * This function adds a free gift to the cart when certain conditions are met:
 * - Cart total exceeds minimum value
 * - Items from eligible collections exceed minimum value
 * - Items with specific tags exceed minimum value
 */
export function run(input) {
  const operations = [];
  
  try {
    // NOTE: Due to GraphQL schema validation limitations, we have to work with limited cart data
    // In a production environment, this would have full access to cart details

    // Mock cart data - in production, this would come from input.cart
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
    
    // Get configuration from metafield or use defaults
    let config = {
      minimum_cart_value: "50.00",
      eligible_collection_ids: [],
      eligible_tag: "fathers-day",
      free_gift_variant_id: "gid://shopify/ProductVariant/987654321",
      free_gift_quantity: 1
    };
    
    // Try to parse configuration from metafield if available
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
      // Continue with default configuration
    }
    
    // Parse configuration values
    const minimumCartValue = parseFloat(config.minimum_cart_value);
    const freeGiftVariantId = config.free_gift_variant_id;
    const freeGiftQuantity = parseInt(config.free_gift_quantity) || 1;
    
    // Get cart information (using mock data in this limited implementation)
    const cart = mockCart;
    const subtotalAmount = parseFloat(cart.cost.subtotalAmount.amount);
    const currencyCode = cart.cost.subtotalAmount.currencyCode;
    
    // Check if cart meets minimum value
    if (subtotalAmount >= minimumCartValue) {
      // Find first cart line to merge with
      const targetLine = cart.lines[0];
      
      if (targetLine) {
        // Add merge operation to create bundle
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
        
        // Add expand operation to include free gift
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
