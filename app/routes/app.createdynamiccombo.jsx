import { json } from "@remix-run/node";
import {
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
  TextField,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
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

  const response = await admin.graphql(
    `#graphql
      mutation discountAutomaticAppCreate($title: String!, $startDate: DateTime!, $endDate: DateTime!) {
        discountAutomaticAppCreate(
          automaticAppDiscount: {
            title: $title,
            functionId: "d5959567-bcf6-433e-9610-4973bd50470b",
            startsAt: $startDate,
            endsAt: $endDate
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

  console.log(response);
  return json(response);
};

export default function DiscountForm() {
  const app = useAppBridge();
  const navigation = useNavigation();
  const [title, setTitle] = useState("Dynamic Combo Discount");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0] + "T00:00:00"
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0] + "T23:59:59"
  );

  const nav = useNavigation();
  const actionData = useActionData();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const location = useLocation();

  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

  useEffect(() => {
    if (actionData?.discountAutomaticAppCreate?.automaticAppDiscount) {
      shopify.Toast.create(app, {
        message: "Discount created",
      }).dispatch(shopify.Toast.Action.SHOW);
    }
  }, [actionData, shopify, app]);

  const handleSubmit = (event) => {
    const formData = new FormData(event.target);
    submit(formData, { replace: true, method: "POST" });
  };

  const handleTitleChange = (value) => {
    setTitle(value);
  };

  const handleStartDateChange = (value) => {
    setStartDate(value);
  };

  const handleEndDateChange = (value) => {
    setEndDate(value);
  };

  return (
    <Page>
      <TitleBar title="Create a Combo Discount" />
      <Layout>
        <Layout.Section>
          <Card>
            <fetcher.Form onSubmit={handleSubmit}>
              <BlockStack gap="300">
                <Text as="h1" variant="headingLg">
                  Create a Combo Discount
                </Text>
                <Text as="p" variant="bodyMd">
                  This discount applies when a cart contains both a machine and
                  a grinder, each with a specified discount value in their
                  product metafield.
                </Text>
                <TextField
                  label="Title"
                  name="title"
                  value={title}
                  onChange={handleTitleChange}
                />

                <TextField
                  label="Start Date"
                  name="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={handleStartDateChange}
                />
                <TextField
                  label="End Date"
                  name="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={handleEndDateChange}
                />

                <Button submit primary loading={isLoading}>
                  {fetcher.data?.automaticAppDiscount?.discountId
                    ? "Update"
                    : "Create"}
                </Button>
                <Text as="p" variant="bodyMd">
                  A confirmation message will appear when the discount is
                  created successfully. You can check the discount in the
                  Shopify admin to confirm if the discount is created.
                </Text>
                {actionData && <pre>{JSON.stringify(actionData, null, 2)}</pre>}
                {actionData?.query && (
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">
                      GraphQL Query:
                    </Text>
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {actionData.query}
                    </pre>
                  </BlockStack>
                )}
              </BlockStack>
              {actionData?.discountAutomaticAppCreate?.userErrors?.length >
                0 && (
                <BlockStack gap="200">
                  {actionData.discountAutomaticAppCreate.userErrors.map(
                    (error, index) => (
                      <Text key={index} color="critical">
                        {error.message}
                      </Text>
                    )
                  )}
                </BlockStack>
              )}
            </fetcher.Form>
          </Card>
        </Layout.Section>
        <Layout.Section secondary>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Instructions
              </Text>
              <Text as="p" variant="bodyMd">
                To set up the combo discount, make sure each product has the
                appropriate tags and metafields:
              </Text>
              <ul>
                <li>
                  **Machine products** should have the tag
                  `combo-builder-machine`.
                </li>
                <li>
                  **Grinder products** should have the tag
                  `combo-builder-grinder`.
                </li>
                <li>
                  Both should have a metafield in the `custom` namespace with
                  the key `combodiscountvalue` and type `integer`, representing
                  the discount amount to apply.
                </li>
              </ul>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
