/**
 * Server helpers for the Bundles & free gifts page.
 *
 * A "bundle parent" is any product carrying the BUNDLE_TAG tag. Its
 * configuration lives in three product metafields read by the `bundler`
 * cart transform (and by the Hydrogen storefront):
 *   custom.bundle_product_ids        list.variant_reference  – always-added gifts
 *   custom.bundle_product_quantities list.number_integer     – per-unit qty, index-aligned
 *   custom.bundle_choice_ids         list.variant_reference  – customer picks ONE
 */

import { BUNDLE_TAG, METAFIELDS } from "./bundles";

const VARIANT_FIELDS = `#graphql
  fragment BundleVariant on ProductVariant {
    id
    title
    displayName
    product { id title }
  }
`;

const PARENTS_QUERY = `#graphql
  ${VARIANT_FIELDS}
  query BundleParents($query: String!, $after: String) {
    products(first: 100, after: $after, query: $query, sortKey: TITLE) {
      pageInfo { hasNextPage endCursor }
      nodes {
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
      }
    }
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

async function gql(admin, query, variables) {
  const response = await admin.graphql(query, { variables });
  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join("; "));
  }
  return body.data;
}

/** All products tagged as bundle parents, with their resolved configuration. */
export async function fetchBundleParents(admin) {
  const products = [];
  let after = null;
  do {
    const data = await gql(admin, PARENTS_QUERY, { query: `tag:${BUNDLE_TAG}`, after });
    const page = data.products;
    for (const node of page.nodes) {
      const quantities = parseList(node.quantities?.value);
      const giftIds = parseList(node.gifts?.value);
      const giftNodes = node.gifts?.references?.nodes ?? [];
      products.push({
        id: node.id,
        title: node.title,
        status: node.status,
        image: node.featuredMedia?.preview?.image?.url ?? null,
        gifts: giftIds.map((id, i) => {
          const v = giftNodes.find((n) => n.id === id);
          const q = parseInt(quantities[i], 10);
          return {
            id,
            label: v ? label(v) : `${id} (missing variant)`,
            quantity: Number.isInteger(q) && q > 0 ? q : 1,
          };
        }),
        choices: parseList(node.choices?.value).map((id) => {
          const v = (node.choices?.references?.nodes ?? []).find((n) => n.id === id);
          return { id, label: v ? label(v) : `${id} (missing variant)` };
        }),
      });
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return products;
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
 * Write the bundle configuration to every product and tag it.
 * Empty lists delete the corresponding metafield rather than storing `[]`.
 * @param {{ productIds: string[], gifts: {id: string, quantity: number}[], choiceIds: string[] }} config
 */
export async function applyBundle(admin, { productIds, gifts, choiceIds }) {
  const sets = [];
  const deletes = [];
  for (const ownerId of productIds) {
    if (gifts.length) {
      sets.push(
        {
          ownerId,
          namespace: "custom",
          key: "bundle_product_ids",
          type: "list.variant_reference",
          value: JSON.stringify(gifts.map((g) => g.id)),
        },
        {
          ownerId,
          namespace: "custom",
          key: "bundle_product_quantities",
          type: "list.number_integer",
          value: JSON.stringify(gifts.map((g) => g.quantity)),
        }
      );
    } else {
      deletes.push(
        { ownerId, namespace: "custom", key: "bundle_product_ids" },
        { ownerId, namespace: "custom", key: "bundle_product_quantities" }
      );
    }
    if (choiceIds.length) {
      sets.push({
        ownerId,
        namespace: "custom",
        key: "bundle_choice_ids",
        type: "list.variant_reference",
        value: JSON.stringify(choiceIds),
      });
    } else {
      deletes.push({ ownerId, namespace: "custom", key: "bundle_choice_ids" });
    }
  }
  if (sets.length) await metafieldsSet(admin, sets);
  if (deletes.length) await metafieldsDelete(admin, deletes);
  await tags(admin, "tagsAdd", productIds);
  return { count: productIds.length };
}

/** Delete all three metafields and drop the tag. */
export async function removeBundle(admin, productIds) {
  await metafieldsDelete(
    admin,
    productIds.flatMap((ownerId) =>
      METAFIELDS.map((m) => ({ ownerId, namespace: "custom", key: m.key }))
    )
  );
  await tags(admin, "tagsRemove", productIds);
  return { count: productIds.length };
}
