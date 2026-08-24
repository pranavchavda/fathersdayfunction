/** Client-safe helpers for building Shopify admin URLs. */

/** Shopify admin URL for a discount node id (gid://shopify/Discount…Node/123). */
export function adminDiscountUrl(shop, discountId) {
  const store = String(shop).replace(".myshopify.com", "");
  return `https://admin.shopify.com/store/${store}/discounts/${String(discountId).split("/").pop()}`;
}
