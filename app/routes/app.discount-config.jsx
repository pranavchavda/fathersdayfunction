import { useState } from "react";
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
  List,
  Text,
  TextField,
} from "@shopify/polaris";
import { DeleteIcon, PlusIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { CapabilityPage } from "../components/CapabilityPage";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
    query {
      shop {
        id
        metafield(namespace: "custom_discount_allocator", key: "config") {
          id
          value
          updatedAt
        }
      }
    }
  `
  );
  const body = await response.json();
  const shop = body?.data?.shop;

  let savedRules = null;
  let parseError = null;
  if (shop?.metafield?.value) {
    try {
      const parsed = JSON.parse(shop.metafield.value);
      savedRules = Array.isArray(parsed?.discountRules)
        ? parsed.discountRules
        : [];
    } catch (error) {
      parseError = "The saved configuration is not valid JSON.";
    }
  }

  return json({
    shopId: shop?.id ?? null,
    metafield: shop?.metafield ?? null,
    savedRules,
    parseError,
  });
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const discountRules = JSON.parse(formData.get("discountRules"));
  const shopId = formData.get("shopId");

  try {
    const response = await admin.graphql(
      `#graphql
      mutation updateDiscountMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId: shopId,
              namespace: "custom_discount_allocator",
              key: "config",
              value: JSON.stringify({ discountRules }),
              type: "json",
            },
          ],
        },
      }
    );

    const responseJson = await response.json();
    const payload = responseJson?.data?.metafieldsSet;
    const userErrors = [
      ...(payload?.userErrors || []),
      ...(responseJson?.errors || []).map((e) => ({
        field: null,
        message: e.message,
      })),
    ];
    if (userErrors.length > 0) {
      return json({ success: false, userErrors });
    }
    return json({
      success: true,
      metafields: payload?.metafields ?? [],
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating metafield:", error);
    return json({
      success: false,
      userErrors: [
        { field: null, message: error?.message || "Failed to update metafield" },
      ],
    });
  }
}

/** Shape used by the form: strings for the inputs, prefixes as one text. */
function toFormRules(rules) {
  return (rules || []).map((rule) => ({
    maxDiscount:
      rule.maxDiscount === null || rule.maxDiscount === undefined
        ? ""
        : String(rule.maxDiscount),
    prefixes: Array.isArray(rule.prefixes) ? rule.prefixes.join(", ") : "",
  }));
}

/** Shape written to the metafield (unchanged: { maxDiscount, prefixes[] }). */
function toStoredRules(rows) {
  return rows.map((row) => ({
    maxDiscount: parseFloat(row.maxDiscount),
    prefixes: row.prefixes
      .split(",")
      .map((prefix) => prefix.trim())
      .filter(Boolean),
  }));
}

function rowErrors(row) {
  const errors = {};
  const max = parseFloat(row.maxDiscount);
  if (!Number.isFinite(max) || max <= 0) {
    errors.maxDiscount = "Enter a maximum amount";
  }
  if (row.prefixes.split(",").map((p) => p.trim()).filter(Boolean).length === 0) {
    errors.prefixes = "Enter at least one code prefix";
  }
  return errors;
}

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ResultBanner({ result }) {
  if (!result) return null;
  if (result.success) {
    return (
      <Banner tone="success" title="Configuration saved">
        <Text as="p">
          The shop metafield custom_discount_allocator.config was updated
          {result.savedAt ? ` at ${formatDate(result.savedAt)}` : ""}.
        </Text>
      </Banner>
    );
  }
  return (
    <Banner tone="critical" title="The configuration was not saved">
      <List type="bullet">
        {(result.userErrors || []).map((error, index) => (
          <List.Item key={index}>
            {error.field?.length ? `${error.field.join(".")}: ` : ""}
            {error.message}
          </List.Item>
        ))}
      </List>
    </Banner>
  );
}

function CurrentConfigCard({ metafield, savedRules, parseError }) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Saved configuration
          </Text>
          {savedRules && savedRules.length > 0 ? (
            <Badge tone="success">{`${savedRules.length} rule${
              savedRules.length === 1 ? "" : "s"
            }`}</Badge>
          ) : (
            <Badge>Not configured</Badge>
          )}
        </InlineStack>
        {parseError && (
          <Text as="p" tone="critical">
            {parseError}
          </Text>
        )}
        {savedRules && savedRules.length > 0 ? (
          <BlockStack gap="200">
            {savedRules.map((rule, index) => (
              <BlockStack key={index} gap="050">
                <Text as="span" variant="bodySm" fontWeight="semibold">
                  Up to ${Number(rule.maxDiscount).toLocaleString("en-CA")} off
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  Codes starting with{" "}
                  {(rule.prefixes || []).length
                    ? rule.prefixes.join(", ")
                    : "(none)"}
                </Text>
              </BlockStack>
            ))}
          </BlockStack>
        ) : (
          !parseError && (
            <Text as="p" tone="subdued">
              No limits are saved on this shop yet.
            </Text>
          )
        )}
        {metafield?.updatedAt && (
          <Text as="p" variant="bodySm" tone="subdued">
            Last saved {formatDate(metafield.updatedAt)}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}

export default function CouponValueLimitPage() {
  const { shopId, metafield, savedRules, parseError } = useLoaderData();
  const fetcher = useFetcher();

  const [rows, setRows] = useState(() => toFormRules(savedRules));

  const isSubmitting = fetcher.state !== "idle";
  const errorsByRow = rows.map(rowErrors);
  const hasErrors = errorsByRow.some((e) => Object.keys(e).length > 0);
  const canSubmit = Boolean(shopId) && !hasErrors;

  const updateRow = (index, patch) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));
  const addRow = () => setRows([...rows, { maxDiscount: "", prefixes: "" }]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    const formData = new FormData();
    formData.set("discountRules", JSON.stringify(toStoredRules(rows)));
    formData.set("shopId", shopId);
    fetcher.submit(formData, { method: "POST" });
  };

  return (
    <CapabilityPage
      capabilityKey="coupon-value-limit"
      aside={
        <CurrentConfigCard
          metafield={metafield}
          savedRules={savedRules}
          parseError={parseError}
        />
      }
    >
      <BlockStack gap="400">
        <Banner tone="info" title="Developer-preview API">
          <Text as="p">
            This capability uses Shopify's Discounts Allocator API, which is
            still a developer preview. It may not be active on every store, so
            confirm the limit takes effect in a test checkout after saving.
          </Text>
        </Banner>
        <ResultBanner result={fetcher.data} />
        <Card>
          <fetcher.Form method="post" onSubmit={handleSubmit}>
            <BlockStack gap="500">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">
                  Discount limits
                </Text>
                <Text as="p" tone="subdued">
                  Each rule caps the total a cart can receive from discount codes
                  that start with one of its prefixes. Saving replaces the whole
                  configuration.
                </Text>
              </BlockStack>

              {rows.length === 0 && (
                <Text as="p" tone="subdued">
                  No rules yet — add one below.
                </Text>
              )}

              {rows.map((row, index) => (
                <Box key={index}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingSm">
                        Rule {index + 1}
                      </Text>
                      <Button
                        icon={DeleteIcon}
                        variant="tertiary"
                        tone="critical"
                        accessibilityLabel={`Remove rule ${index + 1}`}
                        onClick={() => removeRow(index)}
                      />
                    </InlineStack>
                    <FormLayout>
                      <FormLayout.Group>
                        <TextField
                          label="Maximum discount per cart"
                          type="number"
                          min="0"
                          step="1"
                          prefix="$"
                          value={row.maxDiscount}
                          onChange={(value) =>
                            updateRow(index, { maxDiscount: value })
                          }
                          autoComplete="off"
                          requiredIndicator
                          error={errorsByRow[index].maxDiscount}
                        />
                        <TextField
                          label="Discount code prefixes"
                          value={row.prefixes}
                          onChange={(value) =>
                            updateRow(index, { prefixes: value })
                          }
                          placeholder="SUMMER, WINTER"
                          helpText="Comma-separated. A code matches when it starts with any prefix."
                          autoComplete="off"
                          requiredIndicator
                          error={errorsByRow[index].prefixes}
                        />
                      </FormLayout.Group>
                    </FormLayout>
                    {index < rows.length - 1 && <Divider />}
                  </BlockStack>
                </Box>
              ))}

              <InlineStack align="space-between" blockAlign="center">
                <Button icon={PlusIcon} onClick={addRow}>
                  Add rule
                </Button>
                <Button
                  submit
                  variant="primary"
                  loading={isSubmitting}
                  disabled={!canSubmit}
                >
                  Save configuration
                </Button>
              </InlineStack>
            </BlockStack>
          </fetcher.Form>
        </Card>
      </BlockStack>
    </CapabilityPage>
  );
}
