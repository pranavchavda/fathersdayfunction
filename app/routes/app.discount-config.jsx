// import { useState, useCallback } from "react";
// import {
//   Page,
//   Layout,
//   Form,
//   FormLayout,
//   TextField,
//   Button,
//   Card,
//   Icon,
//   BlockStack,
//   Text,
// } from "@shopify/polaris";
// import { PlusIcon, MinusIcon } from "@shopify/polaris-icons";
// import { useActionData } from "@remix-run/react";
// import { json } from "@remix-run/node";
// import { authenticate } from "../shopify.server";

// export async function action({ request }) {
//   const { admin } = await authenticate.admin(request);
//   const formData = await request.formData();
//   const discountRules = JSON.parse(formData.get("discountRules"));

//   try {
//     const response = await admin.graphql(
//       `#graphql
//       mutation updateDiscountMetafield($metafields: [MetafieldsSetInput!]!) {
//         metafieldsSet(metafields: $metafields) {
//           metafields {
//             id
//             namespace
//             key
//             value
//           }
//           userErrors {
//             field
//             message
//           }
//         }
//       }`,
//       {
//         variables: {
//           metafields: [
//             {
//               ownerId: "gid://shopify/Shop/70288998639",
//               namespace: "custom_discount_allocator",
//               key: "config",
//               value: JSON.stringify({ discountRules }),
//               type: "json",
//             },
//           ],
//         },
//       },
//     );

//     const responseJson = await response.json();
//     return json({
//       success: true,
//       metafields: responseJson.data.metafieldsSet.metafields,
//     });
//   } catch (error) {
//     console.error("Error updating metafield:", error);
//     return json({ success: false, error: "Failed to update metafield" });
//   }
// }

// export default function DiscountConfig() {
//   const [discountRules, setDiscountRules] = useState([
//     { maxDiscount: 50, prefixes: ["SUMMER", "WINTER"] },
//   ]);
//   const actionData = useActionData();

//   const handleSubmit = useCallback(
//     async (event) => {
//       event.preventDefault();
//       const formData = new FormData();
//       formData.append("discountRules", JSON.stringify(discountRules));
//       await fetch("/app/discount-config", {
//         method: "POST",
//         body: formData,
//       });
//     },
//     [discountRules],
//   );

//   const handleAddRule = useCallback(() => {
//     setDiscountRules([...discountRules, { maxDiscount: 0, prefixes: [] }]);
//   }, [discountRules]);

//   const handleDeleteRule = useCallback(
//     (index) => {
//       setDiscountRules(discountRules.filter((_, i) => i !== index));
//     },
//     [discountRules],
//   );

//   return (
//     <Page title="Discount Configuration">
//       <Layout>
//         <Layout.Section>
//           <Card sectioned>
//             <Form onSubmit={handleSubmit}>
//               <FormLayout>
//                 <BlockStack vertical>
//                   {discountRules.map((rule, index) => (
//                     <Card key={index} sectioned>
//                       <BlockStack alignment="center">
//                         <BlockStack>
//                           <Text variation="strong">
//                             Discount Rule {index + 1}
//                           </Text>
//                         </BlockStack>
//                         <Button
//                           icon={MinusIcon}
//                           plain
//                           onClick={() => handleDeleteRule(index)}
//                         />
//                       </BlockStack>
//                       <FormLayout>
//                         <TextField
//                           label="Maximum Discount"
//                           type="number"
//                           value={rule.maxDiscount}
//                           onChange={(value) =>
//                             setDiscountRules(
//                               discountRules.map((r, i) =>
//                                 i === index
//                                   ? { ...r, maxDiscount: parseFloat(value) }
//                                   : r,
//                               ),
//                             )
//                           }
//                         />
//                         <TextField
//                           label="Discount Code Prefixes (comma-separated)"
//                           value={rule.prefixes.join(", ")}
//                           onChange={(value) =>
//                             setDiscountRules(
//                               discountRules.map((r, i) =>
//                                 i === index
//                                   ? {
//                                       ...r,
//                                       prefixes: value
//                                         .split(",")
//                                         .map((prefix) => prefix.trim()),
//                                     }
//                                   : r,
//                               ),
//                             )
//                           }
//                         />
//                       </FormLayout>
//                     </Card>
//                   ))}
//                 </BlockStack>
//                 <Button onClick={handleAddRule}>
//                   <Icon source={PlusIcon} color="base" />
//                   Add Discount Rule
//                 </Button>
//                 <Button submit primary>
//                   Save Configuration
//                 </Button>
//               </FormLayout>
//             </Form>
//             {actionData?.success && <p>Metafield updated successfully!</p>}
//             {actionData?.error && <p>{actionData.error}</p>}
//           </Card>
//         </Layout.Section>
//         <Layout.Section>
//           <pre style={{ margin: 0 }}>{JSON.stringify(actionData, null, 2)}</pre>
//         </Layout.Section>
//       </Layout>
//     </Page>
//   );
// }
import { useState, useCallback, useEffect, Suspense } from "react";
import {
  Page,
  Layout,
  Form,
  FormLayout,
  TextField,
  Button,
  Card,
  Icon,
  BlockStack,
  Text,
  Banner,
} from "@shopify/polaris";
import { PlusIcon, MinusIcon } from "@shopify/polaris-icons";
import {
  Await,
  useActionData,
  useFetcher,
  useLoaderData,
  useAsyncValue,
} from "@remix-run/react";
import { json, defer } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const data = await admin.graphql(
    `#graphql
    query {
      shop {
        id
        metafield(namespace: "custom_discount_allocator", key: "config") {
          id
          value
        }
      }
    }
  `,
  );
  return defer(await data.json());
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
      },
    );

    const responseJson = await response.json();
    return json({
      success: true,
      metafields: responseJson.data.metafieldsSet.metafields,
    });
  } catch (error) {
    console.error("Error updating metafield:", error);
    return json({ success: false, error: "Failed to update metafield" });
  }
}

export default function DiscountConfig() {
  //   const { shopId, metafield } = useLoaderData();
  const data = useLoaderData();
  const shopId = data?.data?.shop?.id;
  const metafield = data?.data?.shop?.metafield;
  const [discountRules, setDiscountRules] = useState([]);
  const actionData = useActionData();
  const asyncValue = useAsyncValue();

  useEffect(() => {
    if (metafield?.value) {
      const parsedMetafield = JSON.parse(metafield.value);
      setDiscountRules(parsedMetafield.discountRules || []);
    }
  }, [metafield]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const formData = new FormData();
      formData.append("discountRules", JSON.stringify(discountRules));
      formData.append("shopId", shopId);
      await fetch("/app/discount-config", {
        method: "POST",
        body: formData,
      });
    },
    [discountRules, shopId],
  );

  const handleAddRule = useCallback(() => {
    setDiscountRules([...discountRules, { maxDiscount: 0, prefixes: [] }]);
  }, [discountRules]);

  const handleDeleteRule = useCallback(
    (index) => {
      setDiscountRules(discountRules.filter((_, i) => i !== index));
    },
    [discountRules],
  );

  return (
    <Page title="Discount Configuration">
      <Layout>
        <Layout.Section>
          <Text>Current Configuration</Text>
          <Card sectioned>
            <Text>Shop ID: {shopId}</Text>
            <Text>Metafield Value: {JSON.stringify(metafield)}</Text>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card sectioned>
            <Form onSubmit={handleSubmit}>
              <FormLayout>
                <BlockStack vertical>
                  {discountRules.map((rule, index) => (
                    <Card key={index} sectioned>
                      <BlockStack alignment="center">
                        <BlockStack>
                          <Text variation="strong">
                            Discount Rule {index + 1}
                          </Text>
                        </BlockStack>
                        <Button
                          icon={MinusIcon}
                          plain
                          onClick={() => handleDeleteRule(index)}
                        />
                      </BlockStack>
                      <FormLayout>
                        <TextField
                          label="Maximum Discount"
                          type="number"
                          value={rule.maxDiscount}
                          onChange={(value) =>
                            setDiscountRules(
                              discountRules.map((r, i) =>
                                i === index
                                  ? { ...r, maxDiscount: parseFloat(value) }
                                  : r,
                              ),
                            )
                          }
                        />
                        <TextField
                          label="Discount Code Prefixes (comma-separated)"
                          value={rule.prefixes.join(", ")}
                          onChange={(value) =>
                            setDiscountRules(
                              discountRules.map((r, i) =>
                                i === index
                                  ? {
                                      ...r,
                                      prefixes: value
                                        .split(",")
                                        .map((prefix) => prefix.trim()),
                                    }
                                  : r,
                              ),
                            )
                          }
                        />
                      </FormLayout>
                    </Card>
                  ))}
                </BlockStack>
                <Button onClick={handleAddRule}>
                  <Icon source={PlusIcon} color="base" />
                  Add Discount Rule
                </Button>
                <Button submit primary>
                  Save Configuration
                </Button>
              </FormLayout>
            </Form>
            {actionData?.success && (
              <Banner status="success">Metafield updated successfully!</Banner>
            )}
            {actionData?.error && (
              <Banner status="critical">{actionData.error}</Banner>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
