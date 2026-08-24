import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  Grid,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { CAPABILITIES, KIND_LABEL } from "../lib/capabilities";
import { fetchAppDiscounts } from "../lib/discounts.server";
import { adminDiscountUrl } from "../lib/admin-urls";
import { DiscountsTable } from "../components/DiscountsTable";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const discounts = await fetchAppDiscounts(admin, { limit: 100 });
  return json({ shop: session.shop, discounts });
};

const KIND_TONE = {
  automatic: "info",
  code: "magic",
  "cart-transform": "success",
  allocator: undefined,
};

function CapabilityCard({ capability, discounts }) {
  const active = discounts.filter((d) => d.status === "ACTIVE").length;
  const scheduled = discounts.filter((d) => d.status === "SCHEDULED").length;

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="start" wrap={false}>
          <BlockStack gap="100">
            <Text as="h3" variant="headingMd">
              {capability.title}
            </Text>
            <Badge tone={KIND_TONE[capability.kind]}>
              {KIND_LABEL[capability.kind]}
            </Badge>
          </BlockStack>
          {capability.functionId && (
            <InlineStack gap="100">
              {active > 0 && <Badge tone="success">{`${active} active`}</Badge>}
              {scheduled > 0 && (
                <Badge tone="attention">{`${scheduled} scheduled`}</Badge>
              )}
              {active === 0 && scheduled === 0 && <Badge>Idle</Badge>}
            </InlineStack>
          )}
          {capability.kind === "cart-transform" && (
            <Badge tone="success">Always on</Badge>
          )}
        </InlineStack>
        <Text as="p" variant="bodyMd">
          {capability.summary}
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          {capability.configSource}
        </Text>
        <Box>
          {capability.route ? (
            <Button url={capability.route} variant="primary">
              {capability.kind === "allocator" ? "Configure" : "Create"}
            </Button>
          ) : (
            <Button url="shopify://admin/products" target="_top">
              Open products
            </Button>
          )}
        </Box>
      </BlockStack>
    </Card>
  );
}

export default function Index() {
  const { shop, discounts } = useLoaderData();
  const adminUrlFor = (id) => adminDiscountUrl(shop, id);
  const active = discounts.filter((d) => d.status === "ACTIVE");

  return (
    <Page
      title="iDrinkCoffee Functions"
      subtitle="Sales, combos, coupons and bundles powered by Shopify Functions."
    >
      <TitleBar title="iDrinkCoffee Functions" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <InlineStack gap="600" wrap>
                <BlockStack gap="050">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Active app discounts
                  </Text>
                  <Text as="span" variant="headingLg">
                    {active.length}
                  </Text>
                </BlockStack>
                <BlockStack gap="050">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Automatic
                  </Text>
                  <Text as="span" variant="headingLg">
                    {active.filter((d) => d.method === "automatic").length}
                  </Text>
                </BlockStack>
                <BlockStack gap="050">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Codes
                  </Text>
                  <Text as="span" variant="headingLg">
                    {active.filter((d) => d.method === "code").length}
                  </Text>
                </BlockStack>
                <BlockStack gap="050">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Functions deployed
                  </Text>
                  <Text as="span" variant="headingLg">
                    {CAPABILITIES.length}
                  </Text>
                </BlockStack>
              </InlineStack>
            </Card>
          </Layout.Section>
        </Layout>

        <BlockStack gap="300">
          <Text as="h2" variant="headingLg">
            What this app can do
          </Text>
          <Grid columns={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}>
            {CAPABILITIES.map((capability) => (
              <Grid.Cell key={capability.key}>
                <CapabilityCard
                  capability={capability}
                  discounts={discounts.filter(
                    (d) => d.functionId === capability.functionId
                  )}
                />
              </Grid.Cell>
            ))}
          </Grid>
        </BlockStack>

        <DiscountsTable
          discounts={discounts}
          adminUrlFor={adminUrlFor}
          title="Discounts created with this app"
          emptyMessage="No discounts have been created with this app yet. Use one of the capabilities above to create the first one."
        />
        <Box paddingBlockEnd="600" />
      </BlockStack>
    </Page>
  );
}
