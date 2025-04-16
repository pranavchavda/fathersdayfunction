import { describe, it, expect, beforeEach } from 'vitest';
import { run } from './run';

// Helper function to create mock cart data
function createMockCart(options = {}) {
  const {
    subtotalAmount = "0.00",
    currencyCode = "USD",
    lines = []
  } = options;
  
  return {
    lines,
    cost: {
      subtotalAmount: {
        amount: subtotalAmount,
        currencyCode
      },
      totalAmount: {
        amount: subtotalAmount,
        currencyCode
      }
    }
  };
}

// Helper function to create mock cart line
function createMockCartLine(options = {}) {
  const {
    id = "gid://shopify/CartLine/1",
    variantId = "gid://shopify/ProductVariant/1",
    productId = "gid://shopify/Product/1",
    title = "Test Product",
    quantity = 1,
    amount = "10.00",
    currencyCode = "USD",
    collections = [],
    tags = []
  } = options;
  
  return {
    id,
    quantity,
    merchandise: {
      __typename: "ProductVariant",
      id: variantId,
      product: {
        id: productId,
        title,
        collections: {
          edges: collections.map(id => ({
            node: {
              id
            }
          }))
        },
        tags
      }
    },
    cost: {
      totalAmount: {
        amount,
        currencyCode
      }
    }
  };
}

// Helper function to create mock metafield
function createMockMetafield(value) {
  return {
    value: JSON.stringify(value)
  };
}

describe('Free Gift Function', () => {
  describe('Basic Functionality', () => {
    it('should add free gift when cart value meets minimum threshold', () => {
      // Create a cart with value above the minimum threshold
      const cart = createMockCart({
        subtotalAmount: "100.00",
        lines: [
          createMockCartLine({
            id: "line1",
            amount: "100.00"
          })
        ]
      });
      
      // Create input with cart and configuration
      const input = {
        cart,
        cartTransform: {
          metafield: createMockMetafield({
            minimum_cart_value: "50.00",
            free_gift_variant_id: "gid://shopify/ProductVariant/987654321",
            free_gift_quantity: "1"
          })
        }
      };
      
      // Run the function
      const result = run(input);
      
      // Verify operations
      expect(result.operations).toHaveLength(2);
      expect(result.operations[0].merge).toBeDefined();
      expect(result.operations[1].expand).toBeDefined();
      expect(result.operations[1].expand.expandedCartItems).toHaveLength(2);
      expect(result.operations[1].expand.expandedCartItems[1].merchandiseId).toBe("gid://shopify/ProductVariant/987654321");
      expect(result.operations[1].expand.expandedCartItems[1].quantity).toBe(1);
      expect(result.operations[1].expand.expandedCartItems[1].price.adjustment.fixedPricePerUnit.amount).toBe("0.00");
    });
    
    it('should not add free gift when cart value is below minimum threshold', () => {
      // Create a cart with value below the minimum threshold
      const cart = createMockCart({
        subtotalAmount: "25.00",
        lines: [
          createMockCartLine({
            id: "line1",
            amount: "25.00"
          })
        ]
      });
      
      // Create input with cart and configuration
      const input = {
        cart,
        cartTransform: {
          metafield: createMockMetafield({
            minimum_cart_value: "50.00",
            free_gift_variant_id: "gid://shopify/ProductVariant/987654321",
            free_gift_quantity: "1"
          })
        }
      };
      
      // Run the function
      const result = run(input);
      
      // Verify no operations
      expect(result.operations).toHaveLength(0);
    });
  });
  
  describe('Collection-based Criteria', () => {
    it('should add free gift when collection items meet minimum threshold', () => {
      // Create a cart with collection items above the minimum threshold
      const cart = createMockCart({
        subtotalAmount: "75.00",
        lines: [
          createMockCartLine({
            id: "line1",
            amount: "75.00",
            collections: ["gid://shopify/Collection/123456789"]
          })
        ]
      });
      
      // Create input with cart and configuration
      const input = {
        cart,
        cartTransform: {
          metafield: createMockMetafield({
            minimum_cart_value: "50.00",
            eligible_collection_ids: ["gid://shopify/Collection/123456789"],
            free_gift_variant_id: "gid://shopify/ProductVariant/987654321",
            free_gift_quantity: "1"
          })
        }
      };
      
      // Run the function
      const result = run(input);
      
      // Verify operations
      expect(result.operations).toHaveLength(2);
      expect(result.operations[0].merge).toBeDefined();
      expect(result.operations[1].expand).toBeDefined();
    });
  });
  
  describe('Tag-based Criteria', () => {
    it('should add free gift when tagged items meet minimum threshold', () => {
      // Create a cart with tagged items above the minimum threshold
      const cart = createMockCart({
        subtotalAmount: "60.00",
        lines: [
          createMockCartLine({
            id: "line1",
            amount: "60.00",
            tags: ["fathers-day"]
          })
        ]
      });
      
      // Create input with cart and configuration
      const input = {
        cart,
        cartTransform: {
          metafield: createMockMetafield({
            minimum_cart_value: "50.00",
            eligible_tag: "fathers-day",
            free_gift_variant_id: "gid://shopify/ProductVariant/987654321",
            free_gift_quantity: "1"
          })
        }
      };
      
      // Run the function
      const result = run(input);
      
      // Verify operations
      expect(result.operations).toHaveLength(2);
      expect(result.operations[0].merge).toBeDefined();
      expect(result.operations[1].expand).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid input', () => {
      // Create invalid input (missing cart)
      const input = {};
      
      // Run the function
      const result = run(input);
      
      // Verify error
      expect(result.operations).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors[0].code).toBe("INVALID_INPUT");
    });
    
    it('should handle invalid configuration', () => {
      // Create a cart
      const cart = createMockCart({
        subtotalAmount: "100.00",
        lines: [
          createMockCartLine({
            id: "line1",
            amount: "100.00"
          })
        ]
      });
      
      // Create input with cart and invalid configuration (missing free gift variant ID)
      const input = {
        cart,
        cartTransform: {
          metafield: createMockMetafield({
            minimum_cart_value: "50.00",
            // Missing free_gift_variant_id
            free_gift_quantity: "1"
          })
        }
      };
      
      // Run the function
      const result = run(input);
      
      // Verify error
      expect(result.operations).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors[0].code).toBe("INVALID_INPUT");
    });
    
    it('should handle empty cart', () => {
      // Create an empty cart
      const cart = createMockCart({
        subtotalAmount: "0.00",
        lines: []
      });
      
      // Create input with cart and configuration
      const input = {
        cart,
        cartTransform: {
          metafield: createMockMetafield({
            minimum_cart_value: "50.00",
            free_gift_variant_id: "gid://shopify/ProductVariant/987654321",
            free_gift_quantity: "1"
          })
        }
      };
      
      // Run the function
      const result = run(input);
      
      // Verify error (no suitable cart line)
      expect(result.operations).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors[0].code).toBe("CART_LINE_NOT_FOUND");
    });
  });
  
  describe('Metafield Configuration', () => {
    it('should use default configuration when metafield is not available', () => {
      // Create a cart with value above the default minimum threshold
      const cart = createMockCart({
        subtotalAmount: "100.00",
        lines: [
          createMockCartLine({
            id: "line1",
            amount: "100.00"
          })
        ]
      });
      
      // Create input with cart but no metafield
      const input = {
        cart
        // No cartTransform
      };
      
      // Run the function
      const result = run(input);
      
      // Verify operations (should use default configuration)
      expect(result.operations).toHaveLength(2);
      expect(result.operations[0].merge).toBeDefined();
      expect(result.operations[1].expand).toBeDefined();
      expect(result.operations[1].expand.expandedCartItems[1].merchandiseId).toBe("gid://shopify/ProductVariant/987654321");
    });
    
    it('should handle invalid metafield JSON', () => {
      // Create a cart
      const cart = createMockCart({
        subtotalAmount: "100.00",
        lines: [
          createMockCartLine({
            id: "line1",
            amount: "100.00"
          })
        ]
      });
      
      // Create input with cart and invalid metafield JSON
      const input = {
        cart,
        cartTransform: {
          metafield: {
            value: "invalid-json"
          }
        }
      };
      
      // Run the function
      const result = run(input);
      
      // Verify operations (should use default configuration)
      expect(result.operations).toHaveLength(2);
      expect(result.operations[0].merge).toBeDefined();
      expect(result.operations[1].expand).toBeDefined();
    });
  });
});
