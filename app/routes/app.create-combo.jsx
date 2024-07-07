// app/components/DiscountForm.jsx
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

// const CREATE_DISCOUNT_MUTATION = `
//   mutation discountAutomaticAppCreate($discount: DiscountAutomaticAppInput!) {
//     discountAutomaticAppCreate(automaticAppDiscount: $discount) {
//       automaticAppDiscount {
//         id
//       }
//       userErrors {
//         field
//         message
//       }
//     }
//   }
// `;

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const title = formData.get("title") ?? "Combo discount";
  const startDate =
    formData.get("startDate") ?? // today
    new Date().toISOString().split("T")[0] + "T00:00:00";
  const endDate =
    formData.get("endDate") ?? // today + 1 week
    new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0] + "T23:59:59";
  // const percentage = parseFloat(formData.get("percentage") ?? 0);
  const comboTiers = formData.get("comboTiers") ?? "";

  const jsonTiers = comboTiers.split(",").map((tier) => {
    const [price, discount] = tier.split(":");
    return [
      {
        price: parseFloat(price),
        discount: parseFloat(discount),
      },
    ];
  });

  // const discount = {
  //   title,
  //   value: {
  //     percentage: parseFloat(formData.get("percentage") ?? 0),
  //   },
  //   startsAt: startDate,
  //   endsAt: endDate,
  // };
  // const fetcher = useFetcher();
  // const response = await fetcher(CREATE_DISCOUNT_MUTATION, {
  //     variables: { discount },
  // });
  console.log("jsonTiers: ", jsonTiers);
  const response = await admin.graphql(
    `#graphql
        mutation discountAutomaticAppCreate ($title: String!, $startDate: DateTime!, $endDate: DateTime!, $metaFieldValue: String!) {
            discountAutomaticAppCreate(automaticAppDiscount: {
                # title: "${title}",
                # functionId: "8afdad2b-981b-4f8c-84db-ebf2bda1c537",
                # startsAt: "${startDate}",
                # endsAt: "${endDate}",
                # metafields: {namespace: "combo-discount", key: "function-configuration", value: ${jsonTiers}, type: "json"},
                title: $title,
                functionId: "8afdad2b-981b-4f8c-84db-ebf2bda1c537",
                startsAt: $startDate,
                endsAt: $endDate,
                metafields: {namespace: "combo-discount", key: "function-configuration", value: $metaFieldValue, type: "json"},


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

  return json(response);
};

export default function DiscountForm() {
  const app = useAppBridge();
  const navigation = useNavigation();
  const [percentage, setPercentage] = useState(0);
  const [title, setTitle] = useState("Combo Discount");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0] + "T00:00:00"
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0] + "T23:59:59"
  );
  const [comboTiers, setComboTiers] = useState("");
  const [jsonTiers, setJsonTiers] = useState("[]");

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
      //   nav.replace(nav.pathname);
      // show the toast message
      shopify.toast.show("Discount created");
    }
  }, [actionData, shopify, nav]);

  const handleSubmit = (event) => {
    // event.preventDefault();
    const formData = new FormData(event.target);
    submit(formData, { replace: true, method: "POST" });
  };

  const handlePercentageChange = (value) => {
    setPercentage(value);
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

  const handleComboTiersChange = (value) => {
    // we'll convert the string to a JSON array
    const tiers = value.split(",");
    const jsonTiers = tiers.map((tier) => {
      const [price, discount] = tier.split(":");
      return JSON.stringify({
        price: parseFloat(price),
        discount: parseFloat(discount),
      });
    });
    console.log(comboTiers);
    setComboTiers(value);
    setJsonTiers(jsonTiers);
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
                  This form creates a combo tier discount
                </Text>
                <Text as="p" variant="bodyMd">
                  This discount will be applied to a pair of products, one of
                  which must the tag 'combo-builder-machine' and the other
                  should have 'combo-builder-grinder'. The total discount will
                  be split between the two products.
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
                <TextField
                  label="Combo Tiers"
                  name="comboTiers"
                  value={comboTiers}
                  onChange={handleComboTiersChange}
                  requiredIndicator
                  pattern="^(\d+:\d+)(,\d+:\d+)*$"
                  helpText="Enter the tiers for the combo discount in the format: 1500:250,2000:350,3500:650,6000:1000 (total price:discount)"
                />

                <Button submit primary loading={isLoading}>
                  {fetcher.data?.automaticAppDiscount?.discountId
                    ? "Update"
                    : "Create"}
                </Button>
                <Text as="p" variant="bodyMd">
                  A confirmation message will not show even if the discount is
                  created successfully. You can check the discount in the
                  Shopify admin to confirm if the discount is created.
                </Text>
              </BlockStack>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  {actionData?.response ? (
                    <Text>
                      Discount created with ID{" "}
                      {actionData.response.automaticAppDiscount.discountId}
                    </Text>
                  ) : null}
                </Text>
              </BlockStack>
            </fetcher.Form>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Combo Discount
              </Text>
              <Text as="p" variant="bodyMd">
                Create a combo discount to apply a flat value dollar amount
                discount to a pair of products.
              </Text>
              <Text as="p" variant="bodyMd">
                Eligible products must have the tags 'combo-builder-machine' and
                'combo-builder-grinder' and thus be a part of the combo builder
                feature.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
// app/components/DiscountForm.jsx
