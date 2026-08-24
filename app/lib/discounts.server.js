/**
 * Read the app's own discounts (automatic + code) with the function that backs
 * each. Used by the dashboard and by every capability page.
 */
const APP_DISCOUNTS_QUERY = `#graphql
  query AppDiscounts($first: Int!, $after: String) {
    discountNodes(first: $first, after: $after, query: "type:app", sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        discount {
          __typename
          ... on DiscountAutomaticApp {
            title
            status
            startsAt
            endsAt
            createdAt
            discountClasses
            appDiscountType { functionId title }
          }
          ... on DiscountCodeApp {
            title
            status
            startsAt
            endsAt
            createdAt
            discountClasses
            usageLimit
            asyncUsageCount
            codes(first: 3) { nodes { code } }
            appDiscountType { functionId title }
          }
        }
      }
    }
  }
`;

/**
 * @param {import("@shopify/shopify-app-remix/server").AdminApiContext} admin
 * @param {{ functionId?: string, limit?: number }} [opts]
 */
export async function fetchAppDiscounts(admin, opts = {}) {
  const limit = opts.limit ?? 100;
  const results = [];
  let after = null;
  while (results.length < limit) {
    const response = await admin.graphql(APP_DISCOUNTS_QUERY, {
      variables: { first: Math.min(50, limit - results.length), after },
    });
    const body = await response.json();
    const connection = body?.data?.discountNodes;
    if (!connection) break;
    for (const node of connection.nodes) {
      const d = node.discount;
      if (!d?.appDiscountType) continue;
      if (opts.functionId && d.appDiscountType.functionId !== opts.functionId) continue;
      results.push({
        id: node.id,
        legacyId: node.id.split("/").pop(),
        method: d.__typename === "DiscountCodeApp" ? "code" : "automatic",
        title: d.title,
        status: d.status,
        startsAt: d.startsAt,
        endsAt: d.endsAt,
        createdAt: d.createdAt,
        discountClasses: d.discountClasses || [],
        codes: d.codes?.nodes?.map((c) => c.code) || [],
        usageCount: d.asyncUsageCount ?? null,
        usageLimit: d.usageLimit ?? null,
        functionId: d.appDiscountType.functionId,
        functionTitle: d.appDiscountType.title,
      });
    }
    if (!connection.pageInfo.hasNextPage) break;
    after = connection.pageInfo.endCursor;
  }
  return results;
}

// adminDiscountUrl lives in ./admin-urls.js (client-safe) so components can use it.
