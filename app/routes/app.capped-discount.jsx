// DiscountForm.jsx

import { json } from "@remix-run/node";
import { useActionData, useFetcher, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  FormLayout,
  Text,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useState } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
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

  // Prepare the discount configuration
  const discountConfig = {
    percentage_discount: percentageDiscount,
    maximum_discount_amount: maximumDiscountAmount,
    eligibleCollectionIds,
  };

  const metafieldValue = JSON.stringify(discountConfig);

  // Create the discount code via GraphQL mutation
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
          functionId: "e1df1996-03c6-4053-9ba6-49efda23424e", // Replace with your actual function ID
          startsAt,
          endsAt,
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: true,
          },
          appliesOncePerCustomer: false,
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

  return json(response);
};

export default function DiscountForm() {
  const actionData = useActionData();
  const submit = useSubmit();
  const app = useAppBridge();
  const [title, setTitle] = useState("Discount Code");
  const [code, setCode] = useState("DISCOUNT");
  const [startsAt, setStartsAt] = useState(
    new Date().toISOString().split(".")[0]
  );
  const [endsAt, setEndsAt] = useState("");
  const [percentageDiscount, setPercentageDiscount] = useState("10");
  const [maximumDiscountAmount, setMaximumDiscountAmount] = useState("200");
  const [eligibleCollections, setEligibleCollections] = useState([]);
  const [selectedCollectionNames, setSelectedCollectionNames] = useState([]);

  const handleOpenPicker = async () => {
    try {
      const selected = await app.resourcePicker({
        type: "collection",
        multiple: true,
        initialSelectionIds: eligibleCollections, // Preselect if any
        selectionIds: eligibleCollections,
        filters: {
          // Optional: Add filters or other options here
          query: "",
        },
      });

      if (selected.action === "cancel") {
        // User canceled the picker
        return;
      }

      const selectedIds = selected.selection.map(
        (collection) =>
          `gid://shopify/Collection/${collection.id.split("/").pop()}`
      );
      const selectedNames = selected.selection.map(
        (collection) => collection.title
      );

      setEligibleCollections(selectedIds);
      setSelectedCollectionNames(selectedNames);
    } catch (error) {
      console.error("Error selecting collections:", error);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append(
      "eligibleCollectionIds",
      JSON.stringify(eligibleCollections)
    );
    submit(formData, { method: "post" });
    app.toast.show("Code added (check discounts tab to confirm)");
  };

  const fetcher = useFetcher();

  return (
    <Page>
      <TitleBar title="Create Discount Code" />
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <form onSubmit={handleSubmit}>
              <FormLayout>
                <TextField
                  label="Title"
                  name="title"
                  value={title}
                  onChange={(value) => setTitle(value)}
                />
                <TextField
                  label="Discount Code"
                  name="code"
                  value={code}
                  onChange={(value) => setCode(value)}
                />
                <TextField
                  label="Percentage Discount"
                  name="percentageDiscount"
                  type="number"
                  value={percentageDiscount}
                  onChange={(value) => setPercentageDiscount(value)}
                />
                <TextField
                  label="Maximum Discount Amount"
                  name="maximumDiscountAmount"
                  type="number"
                  value={maximumDiscountAmount}
                  onChange={(value) => setMaximumDiscountAmount(value)}
                  helpText="The maximum total discount amount in the store's currency."
                />
                <Button onClick={handleOpenPicker} primary>
                  Select Eligible Collections
                </Button>
                <TextField
                  label="Selected Collections"
                  value={selectedCollectionNames.join(", ")}
                  disabled
                  multiline
                />
                <TextField
                  label="Start Date"
                  name="startsAt"
                  type="datetime-local"
                  requiredIndicator
                  value={startsAt}
                  onChange={(value) => setStartsAt(value)}
                />
                <TextField
                  label="End Date"
                  name="endsAt"
                  requiredIndicator
                  type="datetime-local"
                  value={endsAt}
                  onChange={(value) => setEndsAt(value)}
                  helpText="Leave blank for no end date"
                />
                <Button submit primary>
                  Create Discount Code
                </Button>
              </FormLayout>
            </form>
          </Card>
        </Layout.Section>
        <Layout.Section secondary>
          <Card sectioned>
            <Text variant="headingMd">Instructions</Text>
            <Text variant="bodyMd">
              - **Eligible Collections**: Click the button to select collections
              that are eligible for this discount.
            </Text>
            <Text variant="bodyMd">
              - **Percentage Discount**: Enter the percentage discount to apply
              to eligible products.
            </Text>
            <Text variant="bodyMd">
              - **Maximum Discount Amount**: Set the maximum total discount
              amount that can be applied per order.
            </Text>
            <Text variant="bodyMd">
              - **Note**: You can find collection IDs in the Shopify Admin URL
              when viewing a collection.
            </Text>
          </Card>
        </Layout.Section>

        {/*Below, we'll show a list of disocunt codes that belong to this app */}
        <Layout.Section>
          <Card sectioned>
            <Text variant="headingMd" as="h2">
              Active Discount Codes
            </Text>
            {actionData?.data?.discountCodeAppCreate?.codeAppDiscount && (
              <div style={{ marginTop: "1rem" }}>
                <Text variant="bodyMd" as="p" color="success">
                  Successfully created discount code:{" "}
                  {
                    actionData.data.discountCodeAppCreate.codeAppDiscount.codes
                      .nodes[0].code
                  }
                </Text>
              </div>
            )}
            {actionData?.data?.discountCodeAppCreate?.userErrors?.length >
              0 && (
              <div style={{ marginTop: "1rem" }}>
                <Text variant="bodyMd" as="p" color="critical">
                  Error creating discount code:{" "}
                  {actionData.data.discountCodeAppCreate.userErrors[0].message}
                </Text>
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
