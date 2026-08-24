import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineStack,
  Link,
  Tag,
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

const CAPABILITY = CAPABILITY_BY_KEY["capped-coupon"];

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
  const percentageDiscount = formData.get("percentageDiscount") ?? "10";
  const maximumDiscountAmount = formData.get("maximumDiscountAmount") ?? "200";
  const eligibleCollectionIds = JSON.parse(
    formData.get("eligibleCollectionIds") ?? "[]"
  );
  // Read for parity with the tiered coupon; the mutation below sends
  // `usageLimit: null` and the form no longer exposes the field.
  // eslint-disable-next-line no-unused-vars
  const usageLimit = formData.get("usageLimit") ?? null;
  const appliesOncePerCustomer =
    formData.get("appliesOncePerCustomer") === "true" ? true : false;
  const combinesWithOrderDiscounts =
    formData.get("combinesWithOrderDiscounts") === "true" ? true : false;
  const combinesWithProductDiscounts =
    formData.get("combinesWithProductDiscounts") === "true" ? true : false;
  const combinesWithShippingDiscounts =
    formData.get("combinesWithShippingDiscounts") === "true" ? true : false;

  // Function configuration stored on the discount's metafield
  const discountConfig = {
    percentage_discount: percentageDiscount,
    maximum_discount_amount: maximumDiscountAmount,
    eligibleCollectionIds,
  };

  const metafieldValue = JSON.stringify(discountConfig);

  const response = await admin.graphql(
    `#graphql
    mutation discountCodeAppCreate($codeAppDiscount: DiscountCodeAppInput!) {
      discountCodeAppCreate(codeAppDiscount: $codeAppDiscount) {
        codeAppDiscount {
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
        codeAppDiscount: {
          title,
          code,
          functionId: "e1df1996-03c6-4053-9ba6-49efda23424e",
          discountClasses: ["PRODUCT"],
          startsAt,
          endsAt,
          appliesOncePerCustomer: appliesOncePerCustomer,
          combinesWith: {
            orderDiscounts: combinesWithOrderDiscounts,
            productDiscounts: combinesWithProductDiscounts,
            shippingDiscounts: combinesWithShippingDiscounts,
          },
          usageLimit: null,
          metafields: [
            {
              namespace: "discount_code",
              key: "function_configuration",
              type: "json",
              value: metafieldValue,
            },
          ],
        },
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

export default function CappedCouponPage() {
  const { shop, discounts, defaults } = useLoaderData();
  const fetcher = useFetcher();
  const app = useAppBridge();
  const adminUrlFor = (id) => adminDiscountUrl(shop, id);

  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [startsAt, setStartsAt] = useState(defaults.startsAt);
  const [endsAt, setEndsAt] = useState(defaults.endsAt);
  const [percentageDiscount, setPercentageDiscount] = useState("10");
  const [maximumDiscountAmount, setMaximumDiscountAmount] = useState("200");
  // [{ id: "gid://shopify/Collection/…", title }]
  const [collections, setCollections] = useState([]);
  const [appliesOncePerCustomer, setAppliesOncePerCustomer] = useState(false);
  const [combinesWithOrderDiscounts, setCombinesWithOrderDiscounts] =
    useState(true);
  const [combinesWithProductDiscounts, setCombinesWithProductDiscounts] =
    useState(true);
  const [combinesWithShippingDiscounts, setCombinesWithShippingDiscounts] =
    useState(true);
  const [pickerError, setPickerError] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const isSubmitting = fetcher.state !== "idle";
  const createdId = fetcher.data?.data?.discountCodeAppCreate?.codeAppDiscount
    ?.discountId;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setShowResult(true);
      if (createdId) app.toast.show("Discount code created");
    }
  }, [fetcher.state, fetcher.data, createdId, app]);

  const handleOpenPicker = async () => {
    setPickerError(null);
    try {
      const selected = await app.resourcePicker({
        type: "collection",
        multiple: true,
        selectionIds: collections.map((c) => ({ id: c.id })),
        filters: {
          query: "",
        },
      });

      // App Bridge v4 resolves `undefined` when the picker is cancelled and
      // otherwise resolves the selection array (`.selection` is a deprecated
      // alias of the same array).
      if (!selected) {
        return;
      }
      const selection = Array.isArray(selected)
        ? selected
        : selected.selection || [];

      const picked = selection.map((collection) => ({
        id: `gid://shopify/Collection/${collection.id.split("/").pop()}`,
        title: collection.title,
      }));
      setCollections(picked);
    } catch (error) {
      setPickerError(
        error?.message || "The collection picker could not be opened."
      );
    }
  };

  const removeCollection = (id) =>
    setCollections((current) => current.filter((c) => c.id !== id));

  const percentageNumber = Number(percentageDiscount);
  const capNumber = Number(maximumDiscountAmount);
  const percentageProblem =
    !percentageDiscount ||
    !Number.isFinite(percentageNumber) ||
    percentageNumber <= 0 ||
    percentageNumber > 100
      ? "Enter a percentage between 0 and 100."
      : null;
  const capProblem =
    !maximumDiscountAmount || !Number.isFinite(capNumber) || capNumber <= 0
      ? "Enter an amount greater than 0."
      : null;
  const dateProblem =
    startsAt && endsAt && endsAt <= startsAt
      ? "The end date must be after the start date."
      : null;

  const canSubmit =
    !isSubmitting &&
    title.trim().length > 0 &&
    code.trim().length > 0 &&
    !!startsAt &&
    !dateProblem &&
    !percentageProblem &&
    !capProblem &&
    collections.length > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append(
      "eligibleCollectionIds",
      JSON.stringify(collections.map((c) => c.id))
    );
    // The action treats a missing end date as "no end date"; an empty string
    // would be sent to Shopify as an invalid DateTime.
    if (!formData.get("endsAt")) formData.delete("endsAt");
    fetcher.submit(formData, { method: "post" });
  };

  const cadOrUsd = (n) =>
    Number.isFinite(n) ? `$${n.toLocaleString("en-CA")}` : "";
  const breakEven =
    !percentageProblem && !capProblem
      ? (capNumber / percentageNumber) * 100
      : null;

  return (
    <CapabilityPage
      capabilityKey="capped-coupon"
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
              <Text as="h2" variant="headingMd">
                New capped coupon
              </Text>

              <FormLayout.Group>
                <TextField
                  label="Title"
                  name="title"
                  autoComplete="off"
                  value={title}
                  onChange={setTitle}
                  placeholder="Accessories 15% off, max $50"
                  helpText="Internal name shown in the Discounts list."
                  requiredIndicator
                />
                <TextField
                  label="Discount code"
                  name="code"
                  autoComplete="off"
                  value={code}
                  onChange={(value) => setCode(value.toUpperCase())}
                  placeholder="ACCESSORIES15"
                  helpText="What customers type at checkout."
                  monospaced
                  requiredIndicator
                />
              </FormLayout.Group>

              <FormLayout.Group>
                <TextField
                  label="Percentage off"
                  name="percentageDiscount"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  suffix="%"
                  autoComplete="off"
                  value={percentageDiscount}
                  onChange={setPercentageDiscount}
                  error={percentageProblem || undefined}
                  requiredIndicator
                />
                <TextField
                  label="Maximum discount"
                  name="maximumDiscountAmount"
                  type="number"
                  min={0}
                  step={1}
                  prefix="$"
                  autoComplete="off"
                  value={maximumDiscountAmount}
                  onChange={setMaximumDiscountAmount}
                  helpText={
                    breakEven
                      ? `Store currency, per order. The cap kicks in once eligible items total more than ${cadOrUsd(Math.round(breakEven))}.`
                      : "Store currency, per order."
                  }
                  error={capProblem || undefined}
                  requiredIndicator
                />
              </FormLayout.Group>

              <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Eligible collections
                  </Text>
                  <Button onClick={handleOpenPicker}>
                    {collections.length > 0
                      ? "Change collections"
                      : "Select collections"}
                  </Button>
                </InlineStack>
                {collections.length > 0 ? (
                  <InlineStack gap="200" wrap>
                    {collections.map((c) => (
                      <Tag key={c.id} onRemove={() => removeCollection(c.id)}>
                        {c.title}
                      </Tag>
                    ))}
                  </InlineStack>
                ) : (
                  <Text as="p" variant="bodySm" tone="subdued">
                    Only products in the selected collections are discounted.
                    Pick at least one.
                  </Text>
                )}
                {pickerError && (
                  <Text as="p" variant="bodySm" tone="critical">
                    {pickerError}
                  </Text>
                )}
              </BlockStack>

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

              <Checkbox
                label="Limit to one use per customer"
                name="appliesOncePerCustomer"
                value="true"
                checked={appliesOncePerCustomer}
                onChange={setAppliesOncePerCustomer}
              />

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
