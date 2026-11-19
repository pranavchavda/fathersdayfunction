/**
 * Server helpers for the Bundles & free gifts page.
 *
 * A "bundle parent" is any product carrying the BUNDLE_TAG tag. Its
 * configuration lives in three product metafields read by the `bundler`
 * cart transform (and by the Hydrogen storefront):
 *   custom.bundle_product_ids        list.variant_reference  – always-added gifts
 *   custom.bundle_product_quantities list.number_integer     – per-unit qty, index-aligned
 *   custom.bundle_choice_ids         list.variant_reference  – customer picks ONE
 * plus their `_us` twins (same types), which are the ONLY set the bundler
 * reads for carts in the US market. The unsuffixed set is the only one read
 * everywhere else. There is no fallback between the two.
 */

import { BUNDLE_TAG, METAFIELDS, US_SUFFIX } from "./bundles.js";

const VARIANT_FIELDS = `#graphql
  fragment BundleVariant on ProductVariant {
    id
    title
    displayName
    product { id title }
  }
`;

const PRODUCT_FIELDS = `#graphql
  ${VARIANT_FIELDS}
  fragment BundleProduct on Product {
    id
    title
    status
    featuredMedia { preview { image { url } } }
    gifts: metafield(namespace: "custom", key: "bundle_product_ids") {
      value
      references(first: 25) { nodes { ...BundleVariant } }
    }
    quantities: metafield(namespace: "custom", key: "bundle_product_quantities") {
      value
    }
    choices: metafield(namespace: "custom", key: "bundle_choice_ids") {
      value
      references(first: 25) { nodes { ...BundleVariant } }
    }
    usGifts: metafield(namespace: "custom", key: "bundle_product_ids_us") {
      value
      references(first: 25) { nodes { ...BundleVariant } }
    }
    usQuantities: metafield(namespace: "custom", key: "bundle_product_quantities_us") {
      value
    }
    usChoices: metafield(namespace: "custom", key: "bundle_choice_ids_us") {
      value
      references(first: 25) { nodes { ...BundleVariant } }
    }
  }
`;

const PARENTS_QUERY = `#graphql
  ${PRODUCT_FIELDS}
  query BundleParents($query: String!, $after: String) {
    products(first: 100, after: $after, query: $query, sortKey: TITLE) {
      pageInfo { hasNextPage endCursor }
      nodes { ...BundleProduct }
    }
  }
`;

const PRODUCTS_BY_ID_QUERY = `#graphql
  ${PRODUCT_FIELDS}
  query BundleProductsById($ids: [ID!]!) {
    nodes(ids: $ids) { ...BundleProduct }
  }
`;

function parseList(value) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function label(v) {
  return v.displayName || [v.product?.title, v.title].filter(Boolean).join(" – ");
}

/** Resolve one gift set (ids + quantities + choices metafields). */
function toSet(giftsField, quantitiesField, choicesField) {
  const quantities = parseList(quantitiesField?.value);
  const giftNodes = giftsField?.references?.nodes ?? [];
  const choiceNodes = choicesField?.references?.nodes ?? [];
  return {
    gifts: parseList(giftsField?.value).map((id, i) => {
      const v = giftNodes.find((n) => n.id === id);
      const q = parseInt(quantities[i], 10);
      return {
        id,
        label: v ? label(v) : `${id} (missing variant)`,
        quantity: Number.isInteger(q) && q > 0 ? q : 1,
      };
    }),
    choices: parseList(choicesField?.value).map((id) => {
      const v = choiceNodes.find((n) => n.id === id);
      return { id, label: v ? label(v) : `${id} (missing variant)` };
    }),
  };
}

/** Map a BundleProduct node to the row shape the page renders. */
function toRow(node) {
  return {
    id: node.id,
    title: node.title,
    status: node.status,
    image: node.featuredMedia?.preview?.image?.url ?? null,
    // default set (every market except the US)
    ...toSet(node.gifts, node.quantities, node.choices),
    // US-market set
    us: toSet(node.usGifts, node.usQuantities, node.usChoices),
  };
}

async function gql(admin, query, variables) {
  const response = await admin.graphql(query, { variables });
  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join("; "));
  }
  return body.data;
}

/**
 * All products tagged as bundle parents, with their resolved configuration.
 * NOTE: `tag:` search is served by Shopify's search index, which lags a few
 * seconds behind writes — callers that just changed a product should merge
 * `fetchProductsByIds` results over this list.
 */
export async function fetchBundleParents(admin) {
  const products = [];
  let after = null;
  do {
    const data = await gql(admin, PARENTS_QUERY, { query: `tag:${BUNDLE_TAG}`, after });
    const page = data.products;
    products.push(...page.nodes.map(toRow));
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return products;
}

/** Direct (index-free) read of specific products, in the same row shape. */
export async function fetchProductsByIds(admin, ids) {
  const rows = [];
  for (const batch of chunk(ids, 50)) {
    const data = await gql(admin, PRODUCTS_BY_ID_QUERY, { ids: batch });
    rows.push(...data.nodes.filter(Boolean).map(toRow));
  }
  return rows;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function metafieldsSet(admin, metafields) {
  for (const batch of chunk(metafields, 25)) {
    const data = await gql(
      admin,
      `#graphql
      mutation SetBundleMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }`,
      { metafields: batch }
    );
    const errors = data.metafieldsSet.userErrors;
    if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  }
}

async function metafieldsDelete(admin, identifiers) {
  for (const batch of chunk(identifiers, 25)) {
    const data = await gql(
      admin,
      `#graphql
      mutation DeleteBundleMetafields($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) {
          userErrors { field message }
        }
      }`,
      { metafields: batch }
    );
    const errors = data.metafieldsDelete.userErrors;
    if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  }
}

async function tags(admin, mutation, productIds) {
  for (const id of productIds) {
    const data = await gql(
      admin,
      `#graphql
      mutation BundleTag($id: ID!, $tags: [String!]!) {
        ${mutation}(id: $id, tags: $tags) {
          userErrors { message }
        }
      }`,
      { id, tags: [BUNDLE_TAG] }
    );
    const errors = data[mutation].userErrors;
    if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  }
}

/**
 * Queue the writes for one gift set on one product. Empty lists delete the
 * corresponding metafield rather than storing `[]`.
 */
function planSet(ownerId, suffix, { gifts, choiceIds }, sets, deletes) {
  const key = (base) => `${base}${suffix}`;
  if (gifts.length) {
    sets.push(
      {
        ownerId,
        namespace: "custom",
        key: key("bundle_product_ids"),
        type: "list.variant_reference",
        value: JSON.stringify(gifts.map((g) => g.id)),
      },
      {
        ownerId,
        namespace: "custom",
        key: key("bundle_product_quantities"),
        type: "list.number_integer",
        value: JSON.stringify(gifts.map((g) => g.quantity)),
      }
    );
  } else {
    deletes.push(
      { ownerId, namespace: "custom", key: key("bundle_product_ids") },
      { ownerId, namespace: "custom", key: key("bundle_product_quantities") }
    );
  }
  if (choiceIds.length) {
    sets.push({
      ownerId,
      namespace: "custom",
      key: key("bundle_choice_ids"),
      type: "list.variant_reference",
      value: JSON.stringify(choiceIds),
    });
  } else {
    deletes.push({ ownerId, namespace: "custom", key: key("bundle_choice_ids") });
  }
}

/**
 * Write the bundle configuration to every product and tag it.
 * `gifts` / `choiceIds` are the default set (every market except the US);
 * `us` is the US-market set. An empty set deletes its metafields, which is
 * how "no gift in that market" is expressed. Omit `us` to leave the US
 * metafields untouched.
 * @param {{
 *   productIds: string[],
 *   gifts: {id: string, quantity: number}[],
 *   choiceIds: string[],
 *   us?: { gifts: {id: string, quantity: number}[], choiceIds: string[] },
 * }} config
 */
export async function applyBundle(admin, { productIds, gifts, choiceIds, us }) {
  const sets = [];
  const deletes = [];
  for (const ownerId of productIds) {
    planSet(ownerId, "", { gifts, choiceIds }, sets, deletes);
    if (us) planSet(ownerId, US_SUFFIX, us, sets, deletes);
  }
  if (sets.length) await metafieldsSet(admin, sets);
  if (deletes.length) await metafieldsDelete(admin, deletes);
  await tags(admin, "tagsAdd", productIds);
  return { count: productIds.length, products: await fetchProductsByIds(admin, productIds) };
}

/** Delete every bundle metafield (both sets) and drop the tag. */
export async function removeBundle(admin, productIds) {
  await metafieldsDelete(
    admin,
    productIds.flatMap((ownerId) =>
      METAFIELDS.map((m) => ({ ownerId, namespace: "custom", key: m.key }))
    )
  );
  await tags(admin, "tagsRemove", productIds);
  return { count: productIds.length, removedIds: productIds };
}
