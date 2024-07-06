// app/components/DiscountForm.jsx
import { json } from "@remix-run/node";
import {
  Form,
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
  Box,
  List,
  Link,
  InlineStack,
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
    const startDate = formData.get("startDate") ?? // today 
    new Date().toISOString().split("T")[0] + "T00:00:00";
    const endDate = formData.get("endDate") ?? "2022-06-22T23:59:59";
    const percentage = parseFloat(formData.get("percentage") ?? 0);
    const jsonTiers = formData.get("jsonTiers") ?? "[]";

    const discount = {
        title,
        value: {
            percentage: parseFloat(formData.get("percentage") ?? 0),
        },
        startsAt: startDate,
        endsAt: endDate,
        };
    // const fetcher = useFetcher();
    // const response = await fetcher(CREATE_DISCOUNT_MUTATION, {
    //     variables: { discount },
    // });
console.log("jsonTiers: ", jsonTiers);
    const response = await admin.graphql(
        `#graphql
        mutation discountAutomaticAppCreate {
            discountAutomaticAppCreate(automaticAppDiscount: {
                title: "${title}",
                functionId: "8afdad2b-981b-4f8c-84db-ebf2bda1c537",
                startsAt: "${startDate}",
                endsAt: "${endDate}",
                metafields: {namespace: "$app:combo-discount", key: "function-configuration", value: "${jsonTiers}", type: "json"}

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
    );

    return json(response);
}

export default function DiscountForm() {
  const app = useAppBridge();
  const navigation = useNavigation();
  const [percentage, setPercentage] = useState(0);
  const [title, setTitle] = useState("Combo Discount");
  const [startDate, setStartDate] = useState("2022-06-22T00:00:00");
  const [endDate, setEndDate] = useState("2022-06-22T23:59:59");
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
      nav.replace(nav.pathname);
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
    }

    const handleTitleChange = (value) => {
        setTitle(value);
    }

    const handleStartDateChange = (value) => {
        setStartDate(value);
    }

    const handleEndDateChange = (value) => {
        setEndDate(value);
    }

    const handleComboTiersChange = (value) => {
       // we'll convert the string to a JSON array
       const tiers = value.split(",");
        const jsonTiers = tiers.map((tier) => {
            const [price, discount] = tier.split(":");
            return JSON.stringify({ price: parseFloat(price), discount: parseFloat(discount) });
        }
        );
        setComboTiers(value);  
        setJsonTiers(jsonTiers);      
       
    }

    return (
        <Page>
            <TitleBar title="Create a Combo Discount" />
            <Layout>
                <Layout.Section>
                    <Card>
                        <fetcher.Form onSubmit={handleSubmit}>
                            <BlockStack gap="300">
                                <TextField
                                    label="Title"
                                    name="title"
                                    value={title}
                                    onChange={handleTitleChange}
                                />
                                <TextField
                                    label="Percentage"
                                    name="percentage"
                                    type="number"
                                    value={percentage}
                                    onChange={handlePercentageChange}
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
                                    helpText="Enter the tiers for the combo discount in the format: 1500:250,2000:350,3500:650,6000:1000 (total price:discount)"

                                />

                                <Button submit primary loading={isLoading}>
                                    Create Discount
                                </Button>
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
                                Create a combo discount to apply a percentage discount to a pair of products.
                            </Text>
                            <Text as="p" variant="bodyMd">
                                The discount will be applied to the pair of products that have the same prefix in their tags.
                            </Text>
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
// app/components/DiscountForm.jsx