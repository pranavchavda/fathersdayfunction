import { Page, Layout, Text, Card, BlockStack, Link } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <Page>
      <TitleBar title="iDrinkCoffee.com Internal Apps" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Available Functions
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    <Link url="/app/tiered-coupon">Tiered Discount</Link> - Create tiered discounts based on cart value
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <Link url="/app/extensions/free-gift/dashboard">Father's Day Free Gift</Link> - Add free gifts to cart based on specific criteria
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Roadmap
                  </Text>
                  <Text as="p" variant="bodyMd">
                    The only feature currently active is the ability to create a
                    tiered discount, over time, this app will be the central hub
                    for all shopify functions deployed to iDrinkCoffee.com and
                    other shopify stores managed by IDC. 
                    </Text>

                    <Text as = "p" variant="bodyMd">
                      Inactive (WIP) features include:
                    </Text>

                    <Text as="ul">
                      <li>Max Discount Configuration for Coupons</li>
                      <li>Combo Discounts</li>
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
