import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  DataTable,
  FormLayout,
  InlineStack,
  Link,
  Text,
  TextField,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useMemo, useState } from "react";
import { authenticate } from "../shopify.server";
import { CAPABILITY_BY_KEY } from "../lib/capabilities";
import { adminDiscountUrl } from "../lib/admin-urls";
import { fetchAppDiscounts } from "../lib/discounts.server";
import { CapabilityPage } from "../components/CapabilityPage";

const CAPABILITY = CAPABILITY_BY_KEY["tiered-sale"];

const LAST_CONFIG_QUERY = `#graphql
  query TieredSaleConfig($id: ID!) {
    discountNode(id: $id) {
      id
      metafield(namespace: "product-discount", key: "function-configuration") {
        value
      }
    }
  }
`;

/** "YYYY-MM-DDTHH:MM" for a datetime-local input. */
function toDateTimeLocal(date) {
  return date.toISOString().slice(0, 16);
}

/** { "200000": 22500 } → "200000:22500,..." (highest tier first). */
function tiersToString(tiers) {
  if (!tiers || typeof tiers !== "object") return "";
  return Object.entries(tiers)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([threshold, discount]) => `${threshold}:${discount}`)
    .join(",");
}

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const discounts = await fetchAppDiscounts(admin, {
    functionId: CAPABILITY.functionId,
  });

  let lastSale = null;
  const latest = discounts[0];
  if (latest) {
    try {
      const response = await admin.graphql(LAST_CONFIG_QUERY, {
        variables: { id: latest.id },
      });
      const body = await response.json();
      const raw = body?.data?.discountNode?.metafield?.value;
      const config = raw ? JSON.parse(raw) : null;
      if (config) {
        lastSale = {
          id: latest.id,
          title: latest.title,
          status: latest.status,
          startsAt: latest.startsAt,
          endsAt: latest.endsAt,
          excludedTags: (config.excludedTags || []).join(","),
          fullExclusions: (config.fullExclusions || []).join(","),
          tieredDiscounts: tiersToString(config.tieredDiscounts),
          usdTieredDiscounts: tiersToString(config.usdTieredDiscounts),
        };
      }
    } catch {
      lastSale = null;
    }
  }

  const now = new Date();
  const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return json({
    shop: session.shop,
    discounts,
    lastSale,
    defaults: {
      startDate: toDateTimeLocal(now),
      endDate: toDateTimeLocal(inAWeek),
    },
  });
};

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
        discountClasses: [PRODUCT]
        combinesWith: {orderDiscounts: false, productDiscounts: false, shippingDiscounts: false}
      }) {
        automaticAppDiscount {
          discountId
          title
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

const TIER_EXAMPLE =
  "200000:22500,135000:13500,80000:8000,40000:4000,20000:2000,10000:1000";

const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

/**
 * Client-side mirror of the action's parser, but tolerant: returns the parsed
 * rows plus a list of problems so the form can block a submit that would
 * otherwise fail on the server.
 */
function parseTiers(value) {
  const rows = [];
  const problems = [];
  const trimmed = value.trim();
  if (!trimmed) {
    return { rows, problems: ["Add at least one tier."] };
  }
  trimmed.split(",").forEach((pair, index) => {
    const [threshold, discount, ...rest] = pair.split(":");
    const t = Number.parseInt(threshold?.trim() ?? "", 10);
    const d = Number.parseInt(discount?.trim() ?? "", 10);
    if (
      rest.length > 0 ||
      !/^\d+$/.test(threshold?.trim() ?? "") ||
      !/^\d+$/.test(discount?.trim() ?? "")
    ) {
      problems.push(
        `Tier ${index + 1} ("${pair.trim()}") must be threshold:discount in cents.`,
      );
      return;
    }
    if (d > t) {
      problems.push(
        `Tier ${index + 1}: the discount (${cad.format(d / 100)}) is larger than the threshold (${cad.format(t / 100)}).`,
      );
    }
    rows.push({ threshold: t, discount: d });
  });
  rows.sort((a, b) => b.threshold - a.threshold);
  return { rows, problems };
}

function TierPreview({ rows }) {
  if (rows.length === 0) return null;
  return (
    <Box
      borderWidth="025"
      borderColor="border"
      borderRadius="200"
      overflowX="auto"
    >
      <DataTable
        columnContentTypes={["text", "text"]}
        headings={["Cart total", "Discount"]}
        rows={rows.map((row) => [
          `${cad.format(row.threshold / 100)}+`,
          `${cad.format(row.discount / 100)} off`,
        ])}
        increasedTableDensity
      />
    </Box>
  );
}

function ResultBanner({ data, adminUrlFor, onDismiss }) {
  if (!data) return null;
  const payload = data.response?.data?.discountAutomaticAppCreate;
  const graphqlErrors = data.response?.errors;
  const userErrors = payload?.userErrors || [];
  const created = payload?.automaticAppDiscount;

  if (created?.discountId) {
    return (
      <Banner
        title={`Created "${created.title}"`}
        tone="success"
        onDismiss={onDismiss}
      >
        <p>
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
      e.field ? `${[].concat(e.field).join(".")}: ${e.message}` : e.message,
    ),
    ...(graphqlErrors || []).map((e) => e.message),
  ];
  return (
    <Banner
      title="The sale was not created"
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

export default function TieredSalePage() {
  const { shop, discounts, lastSale, defaults } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const adminUrlFor = (id) => adminDiscountUrl(shop, id);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [excludedTags, setExcludedTags] = useState("");
  const [fullExclusions, setFullExclusions] = useState("");
  const [tieredDiscounts, setTieredDiscounts] = useState("");
  const [usdTieredDiscounts, setUsdTieredDiscounts] = useState("");
  const [usdMirrorsCad, setUsdMirrorsCad] = useState(true);
  const [showResult, setShowResult] = useState(false);

  const isSubmitting = fetcher.state !== "idle";
  const result = fetcher.data;
  const createdId =
    result?.response?.data?.discountAutomaticAppCreate?.automaticAppDiscount
      ?.discountId;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setShowResult(true);
      if (createdId) shopify.toast.show("Tiered sale created");
    }
  }, [fetcher.state, fetcher.data, createdId, shopify]);

  const cadTiers = useMemo(() => parseTiers(tieredDiscounts), [tieredDiscounts]);
  const usdTiers = useMemo(
    () => parseTiers(usdTieredDiscounts),
    [usdTieredDiscounts],
  );

  const handleTiersChange = (value) => {
    setTieredDiscounts(value);
    if (usdMirrorsCad) setUsdTieredDiscounts(value);
  };
  const handleUsdTiersChange = (value) => {
    setUsdMirrorsCad(false);
    setUsdTieredDiscounts(value);
  };

  const dateProblem =
    startDate && endDate && endDate <= startDate
      ? "The end date must be after the start date."
      : null;

  const canSubmit =
    !isSubmitting &&
    title.trim().length > 0 &&
    !!startDate &&
    !!endDate &&
    !dateProblem &&
    cadTiers.problems.length === 0 &&
    usdTiers.problems.length === 0;

  const prefillFromLastSale = () => {
    if (!lastSale) return;
    setExcludedTags(lastSale.excludedTags);
    setFullExclusions(lastSale.fullExclusions);
    setTieredDiscounts(lastSale.tieredDiscounts);
    setUsdTieredDiscounts(lastSale.usdTieredDiscounts || lastSale.tieredDiscounts);
    setUsdMirrorsCad(
      !lastSale.usdTieredDiscounts ||
        lastSale.usdTieredDiscounts === lastSale.tieredDiscounts,
    );
    if (!title) setTitle(lastSale.title);
    shopify.toast.show(`Copied the configuration from "${lastSale.title}"`);
  };

  const aside = (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          Prefill from the last sale
        </Text>
        {lastSale ? (
          <>
            <BlockStack gap="100">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                {lastSale.title}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {lastSale.status.charAt(0) +
                  lastSale.status.slice(1).toLowerCase()}
                {lastSale.startsAt
                  ? ` · from ${new Date(lastSale.startsAt).toLocaleDateString("en-CA")}`
                  : ""}
                {lastSale.endsAt
                  ? ` to ${new Date(lastSale.endsAt).toLocaleDateString("en-CA")}`
                  : ""}
              </Text>
              {lastSale.tieredDiscounts && (
                <Text as="p" variant="bodySm" tone="subdued">
                  {parseTiers(lastSale.tieredDiscounts).rows.length} tiers ·{" "}
                  {lastSale.excludedTags
                    ? lastSale.excludedTags.split(",").length
                    : 0}{" "}
                  excluded tags ·{" "}
                  {lastSale.fullExclusions
                    ? lastSale.fullExclusions.split(",").length
                    : 0}{" "}
                  full exclusions
                </Text>
              )}
            </BlockStack>
            <Text as="p" variant="bodySm">
              Copies the tiers and tag exclusions into the form. The title and
              dates stay as they are so you can set the new window.
            </Text>
            <Box>
              <Button onClick={prefillFromLastSale}>Use this configuration</Button>
            </Box>
          </>
        ) : (
          <Text as="p" tone="subdued">
            No previous tiered sale was found, so there is nothing to copy yet.
          </Text>
        )}
      </BlockStack>
    </Card>
  );

  return (
    <CapabilityPage
      capabilityKey="tiered-sale"
      discounts={discounts}
      adminUrlFor={adminUrlFor}
      aside={aside}
    >
      <BlockStack gap="400">
        {showResult && (
          <ResultBanner
            data={result}
            adminUrlFor={adminUrlFor}
            onDismiss={() => setShowResult(false)}
          />
        )}
        <Card>
          <fetcher.Form method="post">
            <FormLayout>
              <Text as="h2" variant="headingMd">
                New tiered sale
              </Text>

              <TextField
                label="Title"
                name="title"
                autoComplete="off"
                value={title}
                onChange={setTitle}
                placeholder="Back to School Sale – Up to $225 Off"
                helpText="Shown to customers in the cart and at checkout."
                requiredIndicator
              />

              <FormLayout.Group>
                <TextField
                  label="Starts"
                  name="startDate"
                  type="datetime-local"
                  autoComplete="off"
                  value={startDate}
                  onChange={setStartDate}
                  requiredIndicator
                />
                <TextField
                  label="Ends"
                  name="endDate"
                  type="datetime-local"
                  autoComplete="off"
                  value={endDate}
                  onChange={setEndDate}
                  error={dateProblem || undefined}
                  requiredIndicator
                />
              </FormLayout.Group>

              <TextField
                label="Tiers"
                name="tieredDiscounts"
                autoComplete="off"
                value={tieredDiscounts}
                onChange={handleTiersChange}
                placeholder={TIER_EXAMPLE}
                multiline={2}
                monospaced
                helpText={
                  <>
                    Comma-separated <code>threshold:discount</code> pairs, both in
                    cents. <code>200000:22500</code> means carts of $2,000 or more
                    get $225 off. Example for the "Up to $225 off" sale:{" "}
                    <code>{TIER_EXAMPLE}</code>
                  </>
                }
                error={
                  tieredDiscounts.trim() && cadTiers.problems.length > 0
                    ? cadTiers.problems[0]
                    : undefined
                }
                requiredIndicator
              />
              <TierPreview rows={cadTiers.rows} />

              <TextField
                label="USD tiers"
                name="usdTieredDiscounts"
                autoComplete="off"
                value={usdTieredDiscounts}
                onChange={handleUsdTiersChange}
                multiline={2}
                monospaced
                helpText="Same format as above. The function does not apply a separate USD schedule today, so this is kept identical to the tiers above unless you edit it. It still has to be a valid tier list."
                error={
                  usdTieredDiscounts.trim() && usdTiers.problems.length > 0
                    ? usdTiers.problems[0]
                    : undefined
                }
                connectedRight={
                  !usdMirrorsCad ? (
                    <Button
                      onClick={() => {
                        setUsdMirrorsCad(true);
                        setUsdTieredDiscounts(tieredDiscounts);
                      }}
                    >
                      Match tiers
                    </Button>
                  ) : undefined
                }
                requiredIndicator
              />

              <TextField
                label="Excluded tags"
                name="excludedTags"
                autoComplete="off"
                value={excludedTags}
                onChange={setExcludedTags}
                placeholder="la-marzocco,lelit,acaia,jura,openbox"
                helpText="Comma-separated product tags. These products still count toward the cart total but get none of the discount (typical for MAP brands and open box)."
              />
              <TextField
                label="Fully excluded tags"
                name="fullExclusions"
                autoComplete="off"
                value={fullExclusions}
                onChange={setFullExclusions}
                placeholder="breville,baratza,fellow,gift_card"
                helpText="Comma-separated product tags. These products neither count toward the tier nor receive any discount."
              />

              <InlineStack gap="300" blockAlign="center">
                <Button
                  variant="primary"
                  submit
                  loading={isSubmitting}
                  disabled={!canSubmit}
                >
                  Create tiered sale
                </Button>
                <Text as="span" variant="bodySm" tone="subdued">
                  Creates an automatic discount that does not combine with
                  other discounts.
                </Text>
              </InlineStack>
            </FormLayout>
          </fetcher.Form>
        </Card>
      </BlockStack>
    </CapabilityPage>
  );
}
