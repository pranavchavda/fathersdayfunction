// DiscountForm.jsx

import { json } from "@remix-run/node";
import { useActionData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  FormLayout,
  Checkbox,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useState } from "react";

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
  const usageLimit = formData.get("usageLimit") ?? null; // Add usage limit if needed
  const appliesOncePerCustomer =
    formData.get("appliesOncePerCustomer") === "true" ? true : false;
  const combinesWithOrderDiscounts =
    formData.get("combinesWithOrderDiscounts") === "true" ? true : false;
  const combinesWithProductDiscounts =
    formData.get("combinesWithProductDiscounts") === "true" ? true : false;
  const combinesWithShippingDiscounts =
    formData.get("combinesWithShippingDiscounts") === "true" ? true : false;

  // Prepare the metafield value if needed
  // For example, if you have some configuration to pass to your function
  const functionConfiguration = formData.get("functionConfiguration") ?? null;

  // Build the `codeAppDiscount` input object
  const codeAppDiscount = {
    code,
    title,
    startsAt,
    endsAt,
    functionId: "7ee3f064-c7d5-4371-9bb5-66dd55a24ae7", // Replace with your actual function ID
    appliesOncePerCustomer,
    combinesWith: {
      orderDiscounts: combinesWithOrderDiscounts,
      productDiscounts: combinesWithProductDiscounts,
      shippingDiscounts: combinesWithShippingDiscounts,
    },
  };

  // Add `usageLimit` if it's provided
  if (usageLimit) {
    codeAppDiscount.usageLimit = parseInt(usageLimit, 10);
  }

  // Add `metafields` if function configuration is provided
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

  // Create the discount code via GraphQL mutation
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

  return json(response);
};

export default function DiscountForm() {
  const actionData = useActionData();
  const submit = useSubmit();

  const [title, setTitle] = useState("Discount Code");
  const [code, setCode] = useState("DISCOUNT");
  const [startsAt, setStartsAt] = useState(
    new Date().toISOString().split(".")[0]
  );
  const [endsAt, setEndsAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [appliesOncePerCustomer, setAppliesOncePerCustomer] = useState(false);
  const [combinesWithOrderDiscounts, setCombinesWithOrderDiscounts] =
    useState(true);
  const [combinesWithProductDiscounts, setCombinesWithProductDiscounts] =
    useState(true);
  const [combinesWithShippingDiscounts, setCombinesWithShippingDiscounts] =
    useState(true);
  const [functionConfiguration, setFunctionConfiguration] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    submit(formData, { method: "post" });
  };

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
                  label="Start Date"
                  name="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(value) => setStartsAt(value)}
                />
                <TextField
                  label="End Date"
                  name="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(value) => setEndsAt(value)}
                  helpText="Leave blank for no end date"
                />
                <TextField
                  label="Usage Limit"
                  name="usageLimit"
                  type="number"
                  value={usageLimit}
                  onChange={(value) => setUsageLimit(value)}
                  helpText="Optional. Maximum number of times this discount code can be used."
                />
                <FormLayout.Group>
                  <Checkbox
                    label="Applies Once Per Customer"
                    checked={appliesOncePerCustomer}
                    onChange={(value) => setAppliesOncePerCustomer(value)}
                    name="appliesOncePerCustomer"
                  />
                </FormLayout.Group>
                <FormLayout.Group title="Combines With">
                  <Checkbox
                    label="Order Discounts"
                    checked={combinesWithOrderDiscounts}
                    onChange={(value) => setCombinesWithOrderDiscounts(value)}
                    name="combinesWithOrderDiscounts"
                  />
                  <Checkbox
                    label="Product Discounts"
                    checked={combinesWithProductDiscounts}
                    onChange={(value) => setCombinesWithProductDiscounts(value)}
                    name="combinesWithProductDiscounts"
                  />
                  <Checkbox
                    label="Shipping Discounts"
                    checked={combinesWithShippingDiscounts}
                    onChange={(value) =>
                      setCombinesWithShippingDiscounts(value)
                    }
                    name="combinesWithShippingDiscounts"
                  />
                </FormLayout.Group>
                <TextField
                  label="Function Configuration (JSON)"
                  name="functionConfiguration"
                  value={functionConfiguration}
                  onChange={(value) => setFunctionConfiguration(value)}
                  multiline
                  disabled={true}
                  helpText="Ignore this field. It's for internal use only."
                />
                <Button submit primary>
                  Create Discount Code
                </Button>
              </FormLayout>
            </form>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card sectioned>
            <Text variant="headingMd" as="h4">
              How it works
            </Text>
            <Text as="p">
              This app creates a discount code that applies a tiered discount to
              the cart. When the user inputs the discount code at checkout, it
              checks the product's metafield to see what discount percentage to
              apply.
            </Text>
            <Text as="p">To set the discount percentage for each product:</Text>
            <ul style={{ marginLeft: "20px", listStyle: "disc" }}>
              <Text as="li">Go to the product's edit page</Text>
              <Text as="li">Add a metafield with:</Text>
              <Text as="li" textStyle="subdued">
                namespace: "custom"
              </Text>
              <Text as="li" textStyle="subdued">
                key: "discount_percentage"
              </Text>
              <Text as="li" textStyle="subdued">
                value: number (e.g., 20 for 20% off)
              </Text>
            </ul>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
