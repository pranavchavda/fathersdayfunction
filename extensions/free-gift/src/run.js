/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // Initialize operations array to store cart modifications
  const operations = [];
  
  // Extract cart data from input
  const { cart } = input;
  
  // Get cart configuration from metafield or environment
  // For testing, we'll hardcode the configuration
  const config = {
    minimum_cart_value: 50.00,
    eligible_collection_ids: ["gid://shopify/Collection/123456789"],
    eligible_tag: "fathers-day",
    free_gift_variant_id: "gid://shopify/ProductVariant/987654321",
    free_gift_quantity: 1
  };
  
  // Parse configuration values
  const minimumCartValue = parseFloat(config.minimum_cart_value);
  const eligibleCollectionIds = config.eligible_collection_ids || [];
  const eligibleTag = config.eligible_tag;
  const freeGiftVariantId = config.free_gift_variant_id;
  const freeGiftQuantity = parseInt(config.free_gift_quantity) || 1;
  
  // Calculate cart total
  const cartTotal = parseFloat(cart.cost.subtotalAmount.amount);
  
  // Calculate total value of items from eligible collections
  let eligibleCollectionTotal = 0;
  
  // Calculate total value of items with eligible tag
  let eligibleTagTotal = 0;
  
  // Check if free gift is already in cart
  let freeGiftAlreadyInCart = false;
  let freeGiftLineId = null;
  
  // Process cart lines
  for (const line of cart.lines) {
    if (line.merchandise.__typename === "ProductVariant") {
      // Check if this line is the free gift
      if (line.merchandise.id === freeGiftVariantId) {
        freeGiftAlreadyInCart = true;
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
  if (shouldAddFreeGift && !freeGiftAlreadyInCart) {
    // Add free gift to cart
    operations.push({
      add: {
        merchandiseId: freeGiftVariantId,
        quantity: freeGiftQuantity,
        attributes: [
          {
            key: "_free_gift",
            value: "true"
          }
        ]
      }
    });
  } else if (!shouldAddFreeGift && freeGiftAlreadyInCart) {
    // Remove free gift from cart
    operations.push({
      remove: {
        id: freeGiftLineId
      }
    });
  }
  
  // Return operations
  return {
    operations
  };
}
