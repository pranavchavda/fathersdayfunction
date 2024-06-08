import { Page, Layout, Text, Card, BlockStack } from "@shopify/polaris";
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
            <Card>See Link on the left to create a new Tiered Discount</Card>
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
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
