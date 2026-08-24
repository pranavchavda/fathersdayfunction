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
import { DeleteIcon, PlusIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { CapabilityPage } from "../components/CapabilityPage";
import { CAPABILITY_BY_KEY } from "../lib/capabilities";
import { adminDiscountUrl } from "../lib/admin-urls";
import { fetchAppDiscounts } from "../lib/discounts.server";

const CAPABILITY = CAPABILITY_BY_KEY["combo-builder"];

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const discounts = await fetchAppDiscounts(admin, {
    functionId: CAPABILITY.functionId,
  });
  return json({ shop: session.shop, discounts });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const title = formData.get("title") ?? "Combo discount";
  const startDate =
    formData.get("startDate") ??
    new Date().toISOString().split("T")[0] + "T00:00:00";
  const endDate =
    formData.get("endDate") ??
    new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0] + "T23:59:59";
  const comboTiers = formData.get("comboTiers") ?? "";

  // Legacy metafield shape the function expects: [[{price, discount}], ...]
  const jsonTiers = comboTiers.split(",").map((tier) => {
    const [price, discount] = tier.split(":");
    return [
      {
        price: parseFloat(price),
        discount: parseFloat(discount),
      },
    ];
  });

  try {
    const response = await admin.graphql(
      `#graphql
        mutation discountAutomaticAppCreate ($title: String!, $startDate: DateTime!, $endDate: DateTime!, $metaFieldValue: String!) {
            discountAutomaticAppCreate(automaticAppDiscount: {
                title: $title,
                functionId: "8afdad2b-981b-4f8c-84db-ebf2bda1c537",
                startsAt: $startDate,
                endsAt: $endDate,
                metafields: {namespace: "combo-discount", key: "function-configuration", value: $metaFieldValue, type: "json"},
                discountClasses: [PRODUCT],
                combinesWith: {orderDiscounts: false, productDiscounts: false, shippingDiscounts: false}
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
          metaFieldValue: JSON.stringify(jsonTiers),
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

const DEFAULT_TIERS = [
  { price: "1500", discount: "250" },
  { price: "2000", discount: "350" },
  { price: "3500", discount: "650" },
  { price: "6000", discount: "1000" },
];

function toDateTimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function money(value) {
  return `$${Number(value).toLocaleString("en-CA")}`;
}

/** Rows with a positive numeric price and discount, sorted by threshold. */
function normaliseTiers(rows) {
  return rows
    .map((row) => ({
      price: parseFloat(row.price),
      discount: parseFloat(row.discount),
    }))
    .filter(
      (t) =>
        Number.isFinite(t.price) &&
        Number.isFinite(t.discount) &&
        t.price > 0 &&
        t.discount > 0
    )
    .sort((a, b) => a.price - b.price);
}

/** Per-field validation for one tier row; an all-empty row is ignored. */
function rowErrors(row) {
  const price = parseFloat(row.price);
  const discount = parseFloat(row.discount);
  if (row.price === "" && row.discount === "") return {};
  if (!Number.isFinite(price) || price <= 0) {
    return { price: "Enter a combined price" };
  }
  if (!Number.isFinite(discount) || discount <= 0) {
    return { discount: "Enter an amount off" };
  }
  if (discount >= price) {
    return { discount: "Must be less than the combined price" };
  }
  return {};
}

function ResultBanner({ result, adminUrlFor }) {
  if (!result) return null;

  if (result.discount?.discountId) {
    const status = result.discount.status || "";
    return (
      <Banner tone="success" title={`Created “${result.title}”`}>
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

function TierPreview({ tiers }) {
  if (tiers.length === 0) {
    return (
      <Text as="p" tone="subdued">
        Add at least one tier to see the preview.
      </Text>
    );
  }
  return (
    <BlockStack gap="100">
      {tiers.map((tier, index) => (
        <InlineStack key={`${tier.price}-${index}`} gap="200" blockAlign="center">
          <Text as="span" variant="bodySm">
            {money(tier.price)}+ combined
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            →
          </Text>
          <Badge tone="success">{`${money(tier.discount)} off`}</Badge>
        </InlineStack>
      ))}
    </BlockStack>
  );
}

export default function ComboBuilderPage() {
  const { shop, discounts } = useLoaderData();
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
  const [rows, setRows] = useState(DEFAULT_TIERS);

  const tiers = normaliseTiers(rows);
  const isSubmitting = fetcher.state !== "idle";
  const hasRowErrors = rows.some(
    (row) => Object.keys(rowErrors(row)).length > 0
  );
  const dateError =
    startDate && endDate && endDate <= startDate
      ? "End date must be after the start date"
      : undefined;
  const canSubmit =
    title.trim().length > 0 &&
    startDate &&
    endDate &&
    !dateError &&
    !hasRowErrors &&
    tiers.length > 0;

  const updateRow = (index, patch) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));
  const addRow = () => setRows([...rows, { price: "", discount: "" }]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);
    formData.set(
      "comboTiers",
      tiers.map((t) => `${t.price}:${t.discount}`).join(",")
    );
    fetcher.submit(formData, { method: "POST" });
  };

  const aside = (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          Tier preview
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          The highest tier the pair's combined price reaches is applied, split
          across the machine and the grinder.
        </Text>
        <TierPreview tiers={tiers} />
      </BlockStack>
    </Card>
  );

  return (
    <CapabilityPage
      capabilityKey="combo-builder"
      discounts={discounts}
      adminUrlFor={adminUrlFor}
      aside={aside}
    >
      <BlockStack gap="400">
        <ResultBanner result={fetcher.data} adminUrlFor={adminUrlFor} />
        <Card>
          <fetcher.Form method="post" onSubmit={handleSubmit}>
            <BlockStack gap="500">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  New tiered combo discount
                </Text>
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
              </BlockStack>

              <Divider />

              <BlockStack gap="300">
                <BlockStack gap="100">
                  <Text as="h3" variant="headingSm">
                    Tiers
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Combined machine + grinder price (before discounts) and the
                    dollar amount off the pair. Tiers are saved in ascending
                    order of price.
                  </Text>
                </BlockStack>
                {rows.map((row, index) => {
                  const errors = rowErrors(row);
                  return (
                    <Box key={index}>
                      <InlineStack gap="300" blockAlign="start" wrap={false}>
                        <Box width="100%">
                          <TextField
                            label="Combined price of at least"
                            labelHidden={index !== 0}
                            type="number"
                            min="0"
                            step="1"
                            prefix="$"
                            value={row.price}
                            onChange={(value) => updateRow(index, { price: value })}
                            autoComplete="off"
                            error={errors.price}
                          />
                        </Box>
                        <Box width="100%">
                          <TextField
                            label="Amount off"
                            labelHidden={index !== 0}
                            type="number"
                            min="0"
                            step="1"
                            prefix="$"
                            value={row.discount}
                            onChange={(value) =>
                              updateRow(index, { discount: value })
                            }
                            autoComplete="off"
                            error={errors.discount}
                          />
                        </Box>
                        <Box paddingBlockStart={index === 0 ? "600" : "0"}>
                          <Button
                            icon={DeleteIcon}
                            variant="tertiary"
                            tone="critical"
                            accessibilityLabel={`Remove tier ${index + 1}`}
                            onClick={() => removeRow(index)}
                            disabled={rows.length === 1}
                          />
                        </Box>
                      </InlineStack>
                    </Box>
                  );
                })}
                <Box>
                  <Button icon={PlusIcon} onClick={addRow}>
                    Add tier
                  </Button>
                </Box>
              </BlockStack>

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
