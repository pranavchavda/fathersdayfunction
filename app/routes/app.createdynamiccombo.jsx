import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Divider,
  FormLayout,
  InlineStack,
  Link,
  List,
  Text,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { CapabilityPage } from "../components/CapabilityPage";
import { CAPABILITY_BY_KEY } from "../lib/capabilities";
import { adminDiscountUrl } from "../lib/admin-urls";
import { fetchAppDiscounts } from "../lib/discounts.server";

const CAPABILITY = CAPABILITY_BY_KEY["dynamic-combo"];

const COMBO_PRODUCTS_QUERY = `#graphql
  query ComboProducts($query: String!) {
    products(first: 10, query: $query, sortKey: TITLE) {
      pageInfo { hasNextPage }
      nodes {
        id
        title
        status
        metafield(namespace: "custom", key: "combodiscountvalue") { value }
      }
    }
  }
`;

async function fetchComboProducts(admin, tag) {
  const response = await admin.graphql(COMBO_PRODUCTS_QUERY, {
    variables: { query: `tag:${tag}` },
  });
  const body = await response.json();
  const connection = body?.data?.products;
  return {
    hasMore: Boolean(connection?.pageInfo?.hasNextPage),
    products: (connection?.nodes || []).map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      value: p.metafield?.value ?? null,
    })),
  };
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const [discounts, machines, grinders] = await Promise.all([
    fetchAppDiscounts(admin, { functionId: CAPABILITY.functionId }),
    fetchComboProducts(admin, "combo-builder-machine"),
    fetchComboProducts(admin, "combo-builder-grinder"),
  ]);
  return json({ shop: session.shop, discounts, machines, grinders });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const title = formData.get("title") ?? "Dynamic Combo discount";
  const startDate =
    formData.get("startDate") ??
    new Date().toISOString().split("T")[0] + "T00:00:00";
  const endDate =
    formData.get("endDate") ??
    new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0] + "T23:59:59";

  try {
    const response = await admin.graphql(
      `#graphql
      mutation discountAutomaticAppCreate($title: String!, $startDate: DateTime!, $endDate: DateTime!) {
        discountAutomaticAppCreate(
          automaticAppDiscount: {
            title: $title,
            functionId: "d5959567-bcf6-433e-9610-4973bd50470b",
            startsAt: $startDate,
            endsAt: $endDate,
            discountClasses: [PRODUCT],
            combinesWith: {orderDiscounts: false, productDiscounts: false, shippingDiscounts: false}
          }
        ) {
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
        },
      }
    );

    const body = await response.json();
    const payload = body?.data?.discountAutomaticAppCreate;
    const graphqlErrors = (body?.errors || []).map((e) => ({
      field: null,
      message: e.message,
    }));
    return json({
      title,
      discount: payload?.automaticAppDiscount ?? null,
      userErrors: [...(payload?.userErrors || []), ...graphqlErrors],
    });
  } catch (error) {
    return json({
      title,
      discount: null,
      userErrors: [
        { field: null, message: error?.message || "Failed to create discount" },
      ],
    });
  }
};

function toDateTimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function ResultBanner({ result, adminUrlFor }) {
  if (!result) return null;

  if (result.discount?.discountId) {
    const status = result.discount.status || "";
    return (
      <Banner
        tone="success"
        title={`Created “${result.title}”`}
      >
        <BlockStack gap="200">
          <InlineStack gap="200" blockAlign="center">
            <Text as="span">Status</Text>
            <Badge tone={status === "ACTIVE" ? "success" : "attention"}>
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </Badge>
          </InlineStack>
          <Link url={adminUrlFor(result.discount.discountId)} target="_blank">
            Open the discount in Shopify admin
          </Link>
        </BlockStack>
      </Banner>
    );
  }

  if (result.userErrors?.length) {
    return (
      <Banner tone="critical" title="The discount was not created">
        <List type="bullet">
          {result.userErrors.map((error, index) => (
            <List.Item key={index}>
              {error.field?.length ? `${error.field.join(".")}: ` : ""}
              {error.message}
            </List.Item>
          ))}
        </List>
      </Banner>
    );
  }

  return null;
}

function ComboProductList({ heading, tag, data }) {
  return (
    <BlockStack gap="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingSm">
          {heading}
        </Text>
        <Text as="span" variant="bodySm" tone="subdued">
          tag: {tag}
        </Text>
      </InlineStack>
      {data.products.length === 0 ? (
        <Text as="p" tone="subdued">
          No products carry this tag yet.
        </Text>
      ) : (
        <BlockStack gap="100">
          {data.products.map((product) => {
            const value = Number(product.value);
            const eligible = product.value != null && value > 0;
            return (
              <InlineStack
                key={product.id}
                align="space-between"
                blockAlign="center"
                gap="200"
                wrap={false}
              >
                <InlineStack gap="100" blockAlign="center" wrap={false}>
                  <Text as="span" variant="bodySm" truncate>
                    {product.title}
                  </Text>
                  {product.status !== "ACTIVE" && (
                    <Badge size="small">
                      {product.status.charAt(0) +
                        product.status.slice(1).toLowerCase()}
                    </Badge>
                  )}
                </InlineStack>
                {eligible ? (
                  <Badge tone="success">{`$${value.toLocaleString("en-CA")} off`}</Badge>
                ) : product.value == null ? (
                  <Badge tone="critical">no value</Badge>
                ) : (
                  <Badge tone="attention">{`$${product.value} — skipped`}</Badge>
                )}
              </InlineStack>
            );
          })}
        </BlockStack>
      )}
      {data.hasMore && (
        <Text as="p" variant="bodySm" tone="subdued">
          Showing the first 10.
        </Text>
      )}
    </BlockStack>
  );
}

export default function DynamicComboPage() {
  const { shop, discounts, machines, grinders } = useLoaderData();
  const fetcher = useFetcher();
  const adminUrlFor = (id) => adminDiscountUrl(shop, id);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Defaults (now → +7 days) are filled in on the client so the merchant's
  // local time is used and server/client markup stays identical.
  useEffect(() => {
    setStartDate(toDateTimeLocal(new Date()));
    setEndDate(toDateTimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
  }, []);

  const isSubmitting = fetcher.state !== "idle";
  const titleError =
    title.length > 0 && title.trim().length === 0
      ? "Title cannot be blank"
      : undefined;
  const dateError =
    startDate && endDate && endDate <= startDate
      ? "End date must be after the start date"
      : undefined;
  const canSubmit =
    title.trim().length > 0 && startDate && endDate && !dateError;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);
    fetcher.submit(formData, { method: "POST" });
  };

  const aside = (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Products ready for combos
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            What the discount would take off each product today, from
            custom.combodiscountvalue.
          </Text>
        </BlockStack>
        <ComboProductList
          heading="Machines"
          tag="combo-builder-machine"
          data={machines}
        />
        <Divider />
        <ComboProductList
          heading="Grinders"
          tag="combo-builder-grinder"
          data={grinders}
        />
        <Box>
          <Button url="shopify://admin/products" target="_top" size="slim">
            Edit products
          </Button>
        </Box>
      </BlockStack>
    </Card>
  );

  return (
    <CapabilityPage
      capabilityKey="dynamic-combo"
      discounts={discounts}
      adminUrlFor={adminUrlFor}
      aside={aside}
    >
      <BlockStack gap="400">
        <ResultBanner result={fetcher.data} adminUrlFor={adminUrlFor} />
        <Card>
          <fetcher.Form method="post" onSubmit={handleSubmit}>
            <BlockStack gap="400">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">
                  New dynamic combo discount
                </Text>
                <Text as="p" tone="subdued">
                  Only a title and an active window are needed — the amounts
                  come from the products themselves.
                </Text>
              </BlockStack>
              <FormLayout>
                <TextField
                  label="Title"
                  name="title"
                  value={title}
                  onChange={setTitle}
                  placeholder="Boxing Week Combo Discount"
                  helpText="Shown to customers in the cart and at checkout."
                  autoComplete="off"
                  requiredIndicator
                  error={titleError}
                />
                <FormLayout.Group>
                  <TextField
                    label="Starts"
                    name="startDate"
                    type="datetime-local"
                    value={startDate}
                    onChange={setStartDate}
                    autoComplete="off"
                    requiredIndicator
                  />
                  <TextField
                    label="Ends"
                    name="endDate"
                    type="datetime-local"
                    value={endDate}
                    onChange={setEndDate}
                    autoComplete="off"
                    requiredIndicator
                    error={dateError}
                  />
                </FormLayout.Group>
              </FormLayout>
              <InlineStack align="end">
                <Button
                  submit
                  variant="primary"
                  loading={isSubmitting}
                  disabled={!canSubmit}
                >
                  Create discount
                </Button>
              </InlineStack>
            </BlockStack>
          </fetcher.Form>
        </Card>
      </BlockStack>
    </CapabilityPage>
  );
}
