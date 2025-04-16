/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

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
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // Initialize operations array to store cart modifications
  const operations = [];
  
  try {
    // Extract cart data from input
    const { cart, cartTransform } = input;
    
    // Validate input
    if (!cart || !cart.lines || !cart.cost) {
      return {
        operations: [],
        errors: [{
          code: ERROR_CODES.INVALID_INPUT,
          message: "Invalid cart data in input"
        }]
      };
    }
    
    // Get cart configuration from metafield
    let config = {
      minimum_cart_value: "50.00",
      eligible_collection_ids: ["gid://shopify/Collection/123456789"],
      eligible_tag: "fathers-day",
      free_gift_variant_id: "gid://shopify/ProductVariant/987654321",
      free_gift_quantity: "1"
    };
    
    // Try to parse configuration from metafield if available
    try {
      if (cartTransform?.metafield?.value) {
        const metafieldValue = JSON.parse(cartTransform.metafield.value);
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
    const eligibleCollectionIds = config.eligible_collection_ids || [];
    const eligibleTag = config.eligible_tag;
    const freeGiftVariantId = config.free_gift_variant_id;
    const freeGiftQuantity = parseInt(config.free_gift_quantity) || 1;
    
    // Validate configuration
    if (!freeGiftVariantId) {
      return {
        operations: [],
        errors: [{
          code: ERROR_CODES.INVALID_INPUT,
          message: "Free gift variant ID is required in configuration"
        }]
      };
    }
    
    if (isNaN(minimumCartValue) || minimumCartValue < 0) {
      return {
        operations: [],
        errors: [{
          code: ERROR_CODES.INVALID_INPUT,
          message: "Minimum cart value must be a non-negative number"
        }]
      };
    }
    
    if (isNaN(freeGiftQuantity) || freeGiftQuantity <= 0) {
      return {
        operations: [],
        errors: [{
          code: ERROR_CODES.INVALID_INPUT,
          message: "Free gift quantity must be a positive integer"
        }]
      };
    }
    
    // Calculate cart total
    const cartTotal = parseFloat(cart.cost.subtotalAmount.amount);
    
    // Calculate total value of items from eligible collections
    let eligibleCollectionTotal = 0;
    
    // Calculate total value of items with eligible tag
    let eligibleTagTotal = 0;
    
    // Check if free gift is already in cart
    let freeGiftLineId = null;
    let freeGiftLine = null;
    
    // Track expanded lines that contain our free gift
    let expandedLinesWithFreeGift = [];
    
    // Process cart lines
    for (const line of cart.lines) {
      if (line.merchandise.__typename === "ProductVariant") {
        // Check if this line is the free gift
        if (line.merchandise.id === freeGiftVariantId) {
          freeGiftLine = line;
          freeGiftLineId = line.id;
          continue;
        }
        
        // Check for collection membership
        const productCollections = line.merchandise.product.collections?.edges || [];
        const isInEligibleCollection = productCollections.some(edge => 
          eligibleCollectionIds.includes(edge.node.id)
        );
        
        // Check for tag membership
        const productTags = line.merchandise.product.tags || [];
        const hasEligibleTag = productTags.includes(eligibleTag);
        
        // Calculate line total
        const lineTotal = parseFloat(line.cost.totalAmount.amount);
        
        // Add to collection total if applicable
        if (isInEligibleCollection) {
          eligibleCollectionTotal += lineTotal;
        }
        
        // Add to tag total if applicable
        if (hasEligibleTag) {
          eligibleTagTotal += lineTotal;
        }
      }
    }
    
    // Determine if free gift should be added based on criteria
    const shouldAddFreeGift = 
      cartTotal >= minimumCartValue || 
      eligibleCollectionTotal >= minimumCartValue || 
      eligibleTagTotal >= minimumCartValue;
    
    // Add or remove free gift based on criteria
    if (shouldAddFreeGift) {
      // If the free gift is not already in the cart as a standalone item
      if (!freeGiftLine) {
        // Find a suitable cart line to merge with the free gift
        // Preferably one that contributed to meeting the criteria
        let targetLine = null;
        
        // First try to find a line from an eligible collection
        if (eligibleCollectionTotal >= minimumCartValue) {
          targetLine = cart.lines.find(line => {
            if (line.merchandise.__typename !== "ProductVariant") return false;
            const productCollections = line.merchandise.product.collections?.edges || [];
            return productCollections.some(edge => eligibleCollectionIds.includes(edge.node.id));
          });
        }
        
        // If no line from eligible collection, try to find a line with eligible tag
        if (!targetLine && eligibleTagTotal >= minimumCartValue) {
          targetLine = cart.lines.find(line => {
            if (line.merchandise.__typename !== "ProductVariant") return false;
            const productTags = line.merchandise.product.tags || [];
            return productTags.includes(eligibleTag);
          });
        }
        
        // If still no target line, use any line in the cart
        if (!targetLine && cart.lines.length > 0) {
          targetLine = cart.lines.find(line => 
            line.merchandise.__typename === "ProductVariant" && 
            line.merchandise.id !== freeGiftVariantId
          );
        }
        
        if (targetLine) {
          try {
            // Use merge operation to create a bundle with the free gift
            operations.push({
              merge: {
                cartLineIds: [targetLine.id],
                parentVariantId: targetLine.merchandise.id,
                title: `${targetLine.merchandise.product.title} with Free Gift`,
                price: {
                  adjustment: {
                    fixedPrice: {
                      amount: targetLine.cost.totalAmount.amount,
                      currencyCode: targetLine.cost.totalAmount.currencyCode
                    }
                  }
                }
              }
            });
            
            // Then use expand operation to add the free gift as a component
            operations.push({
              expand: {
                cartLineId: targetLine.id,
                title: `${targetLine.merchandise.product.title} with Free Gift`,
                expandedCartItems: [
                  {
                    // Original item
                    merchandiseId: targetLine.merchandise.id,
                    quantity: targetLine.quantity
                  },
                  {
                    // Free gift item
                    merchandiseId: freeGiftVariantId,
                    quantity: freeGiftQuantity,
                    price: {
                      adjustment: {
                        fixedPricePerUnit: {
                          amount: "0.00",
                          currencyCode: cart.cost.subtotalAmount.currencyCode
                        }
                      }
                    }
                  }
                ]
              }
            });
          } catch (error) {
            console.error("Error creating operations:", error);
            return {
              operations: [],
              errors: [{
                code: ERROR_CODES.OPERATION_FAILED,
                message: "Failed to create cart operations: " + error.message
              }]
            };
          }
        } else {
          // No suitable target line found
          return {
            operations: [],
            errors: [{
              code: ERROR_CODES.CART_LINE_NOT_FOUND,
              message: "No suitable cart line found to add free gift"
            }]
          };
        }
      }
    } else {
      // If free gift criteria are not met but the free gift is in the cart,
      // we can't directly remove it with Cart Transform API.
      // Instead, we would need to track which lines were expanded with free gifts
      // and revert them to their original state.
      
      // This would require more complex state tracking which is beyond the scope
      // of this implementation. In a real-world scenario, you would need to:
      // 1. Track which lines were expanded with free gifts (e.g., using line attributes)
      // 2. When criteria are no longer met, expand those lines again but without the free gift
      
      // For now, we'll leave this empty as the proper solution would require
      // additional tracking mechanisms.
    }
    
    // Return operations
    return {
      operations
    };
  } catch (error) {
    console.error("Unexpected error in free gift function:", error);
    return {
      operations: [],
      errors: [{
        code: ERROR_CODES.OPERATION_FAILED,
        message: "Unexpected error: " + error.message
      }]
    };
  }
}
