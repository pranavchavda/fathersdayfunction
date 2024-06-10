import { json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useNavigation,
  useSubmit,
  useFetcher,
  useLocation,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  TextField,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

// const metaValue = JSON.stringify({
//   excludedTags: [
//     "la-marzocco",
//     "lelit",
//     "acaia",
//     "jura",
//     "latte-art-factory",
//     "puqpress",
//     "YGroup_coffeebox",
//     "ecm",
//     "profitec",
//     "miele",
//     "openbox",
//   ],
//   fullExclusions: [
//     "ascaso",
//     "baratza",
//     "breville",
//     "fellow",
//     "codyscody",
//     "YGroup_Stark",
//     "YGroup_ekk43",
//     "YGroup_H1",
//     "YGroup_Scody",
//     "YGroup_cody",
//     "YGroup_DolceVita",
//     "gift_card",
//     "fd2024flash",
//   ],
//   tieredDiscounts: {
//     2000: 225,
//     1350: 135,
//     800: 80,
//     400: 40,
//     200: 20,
//     100: 10,
//   },
//   usdTieredDiscounts: {
//     2000: 225,
//     1350: 135,
//     800: 80,
//     400: 40,
//     200: 20,
//     100: 10,
//   },
// });

// export const action = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
//   const formData = await request.formData();
//   const title = formData.get("title") ?? "Tier discount";
//   const startDate = formData.get("startDate") ?? "2022-06-22T00:00:00";
//   const endDate = formData.get("endDate") ?? "2022-06-22T23:59:59";
//     // we'll get metaValue from the form now that we know it works

//   const metaFieldValue = JSON.stringify(metaValue);

//   const response = await admin.graphql(
//     `#graphql
//     mutation {
//       discountAutomaticAppCreate(automaticAppDiscount: {
//         title: "${title}",
//         functionId: "f23d62fa-40f7-49bc-9329-86e1fc269e7e",
//         startsAt: "${startDate}",
//         metafields: {namespace: "product-discount", key: "function-configuration", value: ${metaFieldValue}, type: "json"},
//         endsAt: "${endDate}",

//       }) {
//          automaticAppDiscount {
//           discountId
//           status

//          }
//          userErrors {
//           field
//           message
//          }
//       }
//     },

//     `,
//   );

//   const responseJson = await response.json();

//   return json({
//     response: responseJson,
//   });
// console log the mutation response
//};
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const title = formData.get("title") ?? "Tier discount";
  const startDate = formData.get("startDate") ?? "2022-06-22T00:00:00";
  const endDate = formData.get("endDate") ?? "2022-06-22T23:59:59";

  // Get metafield values from the form
  const excludedTags =
    formData
      .get("excludedTags")
      ?.split(",")
      .map((tag) => tag.trim()) || [];
  const fullExclusions =
    formData
      .get("fullExclusions")
      ?.split(",")
      .map((tag) => tag.trim()) || [];

  // Parse tiered discounts from key-value pairs
  const parseTieredDiscounts = (discountsString) => {
    const discounts = {};
    discountsString.split(",").forEach((pair) => {
      const [key, value] = pair.split(":");
      discounts[key.trim()] = parseInt(value.trim(), 10);
    });
    return discounts;
  };

  const tieredDiscounts = parseTieredDiscounts(
    formData.get("tieredDiscounts") || "",
  );
  const usdTieredDiscounts = parseTieredDiscounts(
    formData.get("usdTieredDiscounts") || "",
  );

  const metaValue = {
    excludedTags,
    fullExclusions,
    tieredDiscounts,
    usdTieredDiscounts,
  };

  const response = await admin.graphql(
    `#graphql
    mutation CreateDiscount($title: String!, $startDate: DateTime!, $endDate: DateTime!, $metaFieldValue: String!) {
      discountAutomaticAppCreate(automaticAppDiscount: {
        title: $title
        functionId: "f23d62fa-40f7-49bc-9329-86e1fc269e7e"
        startsAt: $startDate
        metafields: {namespace: "product-discount", key: "function-configuration", value: $metaFieldValue, type: "json"}
        endsAt: $endDate
      }) {
        automaticAppDiscount {
          discountId
          status
        }
        userErrors {
          field
          message
        }
      }
    }
    `,
    {
      variables: {
        title,
        startDate,
        endDate,
        metaFieldValue: JSON.stringify(metaValue),
      },
    },
  );

  const responseJson = await response.json();

  return json({
    response: responseJson,
  });
};
export default function Index() {
  const nav = useNavigation();
  const actionData = useActionData();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const location = useLocation();

  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

  useEffect(() => {
    if (actionData?.response?.automaticAppDiscount?.discountId) {
      // shopify.toast.show("Discount created");

      // prevent redirection on button click
      nav.replace(nav.pathname);
      // show the toast message
      shopify.toast.show("Discount created");
    }
  }, [actionData, shopify, nav]);

  const handleSubmit = (event) => {
    // event.preventDefault();
    const formData = new FormData(event.target);
    submit(formData, { replace: true, method: "POST" });
  };
  const [title, setTitle] = useState("Tier discount");
  const [startDate, setStartDate] = useState("2022-06-22T00:00:00");
  const [endDate, setEndDate] = useState("2022-06-22T23:59:59");
  const [excludedTags, setExcludedTags] = useState("");
  const [fullExclusions, setFullExclusions] = useState("");
  const [tieredDiscounts, setTieredDiscounts] = useState("");
  const [usdTieredDiscounts, setUsdTieredDiscounts] = useState("");
  const metaValue = {
    excludedTags,
    fullExclusions,
    tieredDiscounts,
    usdTieredDiscounts,
  };
  const metaFieldValue = JSON.stringify({ metaValue });

  return (
    <Page>
      <TitleBar title="Create a new Tiered Discount" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Create a Discount
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Fill in the details below to create a discount using the
                    Shopify Admin GraphQL API.
                  </Text>
                  <Text variant="headingSm">
                    Note that separate USD tiers aren't implemented, they are
                    the same as the regular ones. Note when adding tiers, the
                    key is the minimum amount and the value is the discount
                    amount - ALL IN CENTS.
                  </Text>
                </BlockStack>
                <fetcher.Form onSubmit={handleSubmit}>
                  <BlockStack gap="200">
                    <TextField
                      label="Title"
                      name="title"
                      inputMode="text"
                      onChange={(value) => setTitle(value)}
                      value={title}
                      helpText="The title of the discount."
                    />
                    <TextField
                      label="Start Date"
                      name="startDate"
                      type="datetime-local"
                      onChange={(value) => setStartDate(value)}
                      value={startDate}
                    />
                    <TextField
                      label="End Date"
                      name="endDate"
                      type="datetime-local"
                      onChange={(value) => setEndDate(value)}
                      value={endDate}
                    />
                    <TextField
                      label="Excluded Tags"
                      name="excludedTags"
                      value={excludedTags}
                      onChange={setExcludedTags}
                      helpText="Enter comma-separated tags to exclude from the discount."
                    />
                    <TextField
                      label="Full Exclusions"
                      name="fullExclusions"
                      value={fullExclusions}
                      onChange={setFullExclusions}
                      helpText="Enter comma-separated tags for full exclusion from the discount."
                    />
                    <TextField
                      label="Tiered Discounts"
                      name="tieredDiscounts"
                      value={tieredDiscounts}
                      onChange={setTieredDiscounts}
                      helpText="Enter tiered discounts IN CENTS as key-value pairs, e.g., 200000:22500,135000:13500"
                    />
                    <TextField
                      label="USD Tiered Discounts"
                      name="usdTieredDiscounts"
                      value={usdTieredDiscounts}
                      onChange={setUsdTieredDiscounts}
                      helpText="Enter USD tiered discounts IN CENTS as key-value pairs, e.g., 2000:22500,135000:13500"
                    />

                    <InlineStack gap="300">
                      <Button loading={isLoading} submit>
                        Create Discount
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </fetcher.Form>
                {actionData?.response && (
                  <>
                    <Text as="h3" variant="headingMd">
                      Discount Creation Response (JSON)
                    </Text>
                    <Box
                      padding="400"
                      background="bg-surface-active"
                      borderWidth="025"
                      borderRadius="200"
                      borderColor="border"
                      overflowX="scroll"
                    >
                      <pre style={{ margin: 0 }}>
                        <code>{JSON.stringify(actionData, null, 2)}</code>

                        <code>
                          {`
                          mutation {
                            discountAutomaticAppCreate(automaticAppDiscount: {
                              title: "${title}",
                              functionId: "f23d62fa-40f7-49bc-9329-86e1fc269e7e",
                              startsAt: "${startDate}",
                              metafields: {namespace: "product-discount", key: "function-configuration", value: ${metaFieldValue}, type: "json"},
                              endsAt: "${endDate}",
                            }) {
                              automaticAppDiscount {
                                discountId
                                status
                              }
                              userErrors {
                                field
                                message
                              }
                            }
                          }
                          `}
                        </code>
                      </pre>
                    </Box>
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    App template specs
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Framework
                      </Text>
                      <Link
                        url="https://remix.run"
                        target="_blank"
                        removeUnderline
                      >
                        Remix
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Database
                      </Text>
                      <Link
                        url="https://www.prisma.io/"
                        target="_blank"
                        removeUnderline
                      >
                        Prisma
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Interface
                      </Text>
                      <span>
                        <Link
                          url="https://polaris.shopify.com"
                          target="_blank"
                          removeUnderline
                        >
                          Polaris
                        </Link>
                        {", "}
                        <Link
                          url="https://shopify.dev/docs/apps/tools/app-bridge"
                          target="_blank"
                          removeUnderline
                        >
                          App Bridge
                        </Link>
                      </span>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        API
                      </Text>
                      <Link
                        url="https://shopify.dev/docs/api/admin-graphql"
                        target="_blank"
                        removeUnderline
                      >
                        GraphQL API
                      </Link>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Next steps
                  </Text>
                  <List>
                    <List.Item>
                      Build an{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/getting-started/build-app-example"
                        target="_blank"
                        removeUnderline
                      >
                        {" "}
                        example app
                      </Link>{" "}
                      to get started
                    </List.Item>
                    <List.Item>
                      Explore Shopify’s API with{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
                        target="_blank"
                        removeUnderline
                      >
                        GraphiQL
                      </Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
