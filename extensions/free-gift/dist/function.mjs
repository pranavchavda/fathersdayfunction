function I(f) {
  const i = [], { cart: n } = f, e = {
    minimum_cart_value: 50,
    eligible_collection_ids: ["gid://shopify/Collection/123456789"],
    eligible_tag: "fathers-day",
    free_gift_variant_id: "gid://shopify/ProductVariant/987654321",
    free_gift_quantity: 1
  }, o = parseFloat(e.minimum_cart_value), g = e.eligible_collection_ids || [], _ = e.eligible_tag, a = e.free_gift_variant_id, m = parseInt(e.free_gift_quantity) || 1, p = parseFloat(n.cost.subtotalAmount.amount);
  let s = 0, c = 0, l = !1, r = null;
  for (const t of n.lines)
    if (t.merchandise.__typename === "ProductVariant") {
      if (t.merchandise.id === a) {
        l = !0, r = t.id;
        continue;
      }
      const b = (t.merchandise.product.collections?.edges || []).some(
        (y) => g.includes(y.node.id)
      ), h = (t.merchandise.product.tags || []).includes(_), u = parseFloat(t.cost.totalAmount.amount);
      b && (s += u), h && (c += u);
    }
  const d = p >= o || s >= o || c >= o;
  return d && !l ? i.push({
    add: {
      merchandiseId: a,
      quantity: m,
      attributes: [
        {
          key: "_free_gift",
          value: "true"
        }
      ]
    }
  }) : !d && l && i.push({
    remove: {
      id: r
    }
  }), {
    operations: i
  };
}
export {
  I as run
};
