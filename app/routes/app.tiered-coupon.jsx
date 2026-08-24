import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  Collapsible,
  FormLayout,
  InlineStack,
  Link,
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import { CAPABILITY_BY_KEY } from "../lib/capabilities";
import { adminDiscountUrl } from "../lib/admin-urls";
import { fetchAppDiscounts } from "../lib/discounts.server";
import { CapabilityPage } from "../components/CapabilityPage";

const CAPABILITY = CAPABILITY_BY_KEY["tiered-coupon"];

/** "YYYY-MM-DDTHH:MM" for a datetime-local input. */
function toDateTimeLocal(date) {
  return date.toISOString().slice(0, 16);
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const discounts = await fetchAppDiscounts(admin, {
    functionId: CAPABILITY.functionId,
  });
  const now = new Date();
  const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return json({
    shop: session.shop,
    discounts,
    defaults: {
      startsAt: toDateTimeLocal(now),
      endsAt: toDateTimeLocal(inAWeek),
    },
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const title = formData.get("title") ?? "Discount Code";
  const code = formData.get("code") ?? "DISCOUNT";
  const startsAt = formData.get("startsAt") ?? new Date().toISOString();
  const endsAt = formData.get("endsAt") ?? null;
  const usageLimit = formData.get("usageLimit") ?? null;
  const appliesOncePerCustomer =
    formData.get("appliesOncePerCustomer") === "true" ? true : false;
  const combinesWithOrderDiscounts =
    formData.get("combinesWithOrderDiscounts") === "true" ? true : false;
  const combinesWithProductDiscounts =
    formData.get("combinesWithProductDiscounts") === "true" ? true : false;
  const combinesWithShippingDiscounts =
    formData.get("combinesWithShippingDiscounts") === "true" ? true : false;

  // Optional JSON passed through to the function's metafield (legacy field).
  const functionConfiguration = formData.get("functionConfiguration") ?? null;

  const codeAppDiscount = {
    code,
    title,
    startsAt,
    endsAt,
    functionId: "7ee3f064-c7d5-4371-9bb5-66dd55a24ae7",
    discountClasses: ["PRODUCT"],
    appliesOncePerCustomer,
    combinesWith: {
      orderDiscounts: combinesWithOrderDiscounts,
      productDiscounts: combinesWithProductDiscounts,
      shippingDiscounts: combinesWithShippingDiscounts,
    },
  };

  if (usageLimit) {
    codeAppDiscount.usageLimit = parseInt(usageLimit, 10);
  }

  if (functionConfiguration) {
    codeAppDiscount.metafields = [
      {
        namespace: "discount_code",
        key: "function_configuration",
        type: "json",
        value: functionConfiguration,
      },
    ];
  }

  const response = await admin.graphql(
    `#graphql
    mutation discountCodeAppCreate($codeAppDiscount: DiscountCodeAppInput!) {
      discountCodeAppCreate(codeAppDiscount: $codeAppDiscount) {
        codeAppDiscount {
          discountId
          title
          appDiscountType {
            description
            functionId
          }
          combinesWith {
            orderDiscounts
            productDiscounts
            shippingDiscounts
          }
          codes(first: 100) {
            nodes {
              code
            }
          }
          status
          usageLimit
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
        codeAppDiscount,
      },
    }
  );

  return json(await response.json());
};

function ResultBanner({ data, adminUrlFor, onDismiss }) {
  if (!data) return null;
  const payload = data.data?.discountCodeAppCreate;
  const created = payload?.codeAppDiscount;
  const userErrors = payload?.userErrors || [];
  const graphqlErrors = data.errors || [];

  if (created?.discountId) {
    const codes = created.codes?.nodes?.map((c) => c.code) || [];
    return (
      <Banner
        title={`Created "${created.title}"`}
        tone="success"
        onDismiss={onDismiss}
      >
        <p>
          {codes.length > 0 ? `Code ${codes.join(", ")} · ` : ""}
          Status: {created.status}.{" "}
          <Link url={adminUrlFor(created.discountId)} target="_blank">
            Open in Discounts
          </Link>
        </p>
      </Banner>
    );
  }

  const messages = [
    ...userErrors.map((e) =>
      e.field ? `${[].concat(e.field).join(".")}: ${e.message}` : e.message
    ),
    ...graphqlErrors.map((e) => e.message),
  ];
  return (
    <Banner
      title="The discount code was not created"
      tone="critical"
      onDismiss={onDismiss}
    >
      {messages.length > 0 ? (
        <ul>
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : (
        <p>Shopify returned no discount and no error details.</p>
      )}
    </Banner>
  );
}

export default function TieredCouponPage() {
  const { shop, discounts, defaults } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const adminUrlFor = (id) => adminDiscountUrl(shop, id);

  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [startsAt, setStartsAt] = useState(defaults.startsAt);
  const [endsAt, setEndsAt] = useState(defaults.endsAt);
  const [usageLimit, setUsageLimit] = useState("");
  const [appliesOncePerCustomer, setAppliesOncePerCustomer] = useState(false);
  const [combinesWithOrderDiscounts, setCombinesWithOrderDiscounts] =
    useState(true);
  const [combinesWithProductDiscounts, setCombinesWithProductDiscounts] =
    useState(true);
  const [combinesWithShippingDiscounts, setCombinesWithShippingDiscounts] =
    useState(true);
  const [functionConfiguration, setFunctionConfiguration] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const isSubmitting = fetcher.state !== "idle";
  const createdId = fetcher.data?.data?.discountCodeAppCreate?.codeAppDiscount
    ?.discountId;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setShowResult(true);
      if (createdId) shopify.toast.show("Discount code created");
    }
  }, [fetcher.state, fetcher.data, createdId, shopify]);

  let configProblem = null;
  if (functionConfiguration.trim()) {
    try {
      JSON.parse(functionConfiguration);
    } catch {
      configProblem = "Must be valid JSON (or leave it empty).";
    }
  }
  const dateProblem =
    startsAt && endsAt && endsAt <= startsAt
      ? "The end date must be after the start date."
      : null;
  const usageLimitProblem =
    usageLimit && !/^[1-9]\d*$/.test(usageLimit)
      ? "Must be a whole number greater than 0."
      : null;

  const canSubmit =
    !isSubmitting &&
    title.trim().length > 0 &&
    code.trim().length > 0 &&
    !!startsAt &&
    !dateProblem &&
    !usageLimitProblem &&
    !configProblem;

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // The action treats a missing end date as "no end date"; an empty string
    // would be sent to Shopify as an invalid DateTime.
    if (!formData.get("endsAt")) formData.delete("endsAt");
    if (!formData.get("usageLimit")) formData.delete("usageLimit");
    if (!String(formData.get("functionConfiguration") ?? "").trim()) {
      formData.delete("functionConfiguration");
    }
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <CapabilityPage
      capabilityKey="tiered-coupon"
      discounts={discounts}
      adminUrlFor={adminUrlFor}
    >
      <BlockStack gap="400">
        {showResult && (
          <ResultBanner
            data={fetcher.data}
            adminUrlFor={adminUrlFor}
            onDismiss={() => setShowResult(false)}
          />
        )}
        <Card>
          <form onSubmit={handleSubmit}>
            <FormLayout>
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">
                  New tiered coupon
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  The percentage is not set here. Each product decides its own
                  rate through the <code>custom.discount_percentage</code>{" "}
                  metafield (a whole number, e.g. 15 for 15% off); products
                  without it are not discounted even when the code is applied.
                </Text>
              </BlockStack>

              <FormLayout.Group>
                <TextField
                  label="Title"
                  name="title"
                  autoComplete="off"
                  value={title}
                  onChange={setTitle}
                  placeholder="Sage Grinder Promo"
                  helpText="Internal name shown in the Discounts list."
                  requiredIndicator
                />
                <TextField
                  label="Discount code"
                  name="code"
                  autoComplete="off"
                  value={code}
                  onChange={(value) => setCode(value.toUpperCase())}
                  placeholder="SHHHGM"
                  helpText="What customers type at checkout."
                  monospaced
                  requiredIndicator
                />
              </FormLayout.Group>

              <FormLayout.Group>
                <TextField
                  label="Starts"
                  name="startsAt"
                  type="datetime-local"
                  autoComplete="off"
                  value={startsAt}
                  onChange={setStartsAt}
                  requiredIndicator
                />
                <TextField
                  label="Ends"
                  name="endsAt"
                  type="datetime-local"
                  autoComplete="off"
                  value={endsAt}
                  onChange={setEndsAt}
                  helpText="Clear this to leave the code open-ended."
                  error={dateProblem || undefined}
                />
              </FormLayout.Group>

              <FormLayout.Group>
                <TextField
                  label="Usage limit"
                  name="usageLimit"
                  type="number"
                  min={1}
                  autoComplete="off"
                  value={usageLimit}
                  onChange={setUsageLimit}
                  helpText="Total number of times the code can be used. Leave empty for unlimited."
                  error={usageLimitProblem || undefined}
                />
                <Box paddingBlockStart="600">
                  <Checkbox
                    label="Limit to one use per customer"
                    name="appliesOncePerCustomer"
                    value="true"
                    checked={appliesOncePerCustomer}
                    onChange={setAppliesOncePerCustomer}
                  />
                </Box>
              </FormLayout.Group>

              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Combines with
                </Text>
                <InlineStack gap="400" wrap>
                  <Checkbox
                    label="Order discounts"
                    name="combinesWithOrderDiscounts"
                    value="true"
                    checked={combinesWithOrderDiscounts}
                    onChange={setCombinesWithOrderDiscounts}
                  />
                  <Checkbox
                    label="Product discounts"
                    name="combinesWithProductDiscounts"
                    value="true"
                    checked={combinesWithProductDiscounts}
                    onChange={setCombinesWithProductDiscounts}
                  />
                  <Checkbox
                    label="Shipping discounts"
                    name="combinesWithShippingDiscounts"
                    value="true"
                    checked={combinesWithShippingDiscounts}
                    onChange={setCombinesWithShippingDiscounts}
                  />
                </InlineStack>
              </BlockStack>

              <BlockStack gap="200">
                <Box>
                  <Button
                    variant="plain"
                    disclosure={advancedOpen ? "up" : "down"}
                    onClick={() => setAdvancedOpen((open) => !open)}
                    ariaExpanded={advancedOpen}
                    ariaControls="tiered-coupon-advanced"
                  >
                    Advanced
                  </Button>
                </Box>
                <Collapsible
                  id="tiered-coupon-advanced"
                  open={advancedOpen}
                  transition={{ duration: "150ms", timingFunction: "ease-in-out" }}
                >
                  <TextField
                    label="Function configuration (JSON)"
                    name="functionConfiguration"
                    autoComplete="off"
                    value={functionConfiguration}
                    onChange={setFunctionConfiguration}
                    multiline={3}
                    monospaced
                    placeholder="{}"
                    helpText="Legacy. Stored on the discount as discount_code.function_configuration. The tiered coupon function reads product metafields, not this value, so it is normally left empty."
                    error={configProblem || undefined}
                  />
                </Collapsible>
              </BlockStack>

              <Box>
                <Button
                  variant="primary"
                  submit
                  loading={isSubmitting}
                  disabled={!canSubmit}
                >
                  Create discount code
                </Button>
              </Box>
            </FormLayout>
          </form>
        </Card>
      </BlockStack>
    </CapabilityPage>
  );
}
