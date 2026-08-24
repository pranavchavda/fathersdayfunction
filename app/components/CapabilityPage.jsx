import {
  Badge,
  BlockStack,
  Box,
  Card,
  InlineStack,
  Layout,
  List,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { CAPABILITY_BY_KEY, KIND_LABEL } from "../lib/capabilities";
import { DiscountsTable } from "./DiscountsTable";

/**
 * Shared shell for every capability page: title, "how it works" side panel,
 * the page's own form (children) and the discounts already created with the
 * capability's function.
 *
 * @param {{
 *   capabilityKey: string,
 *   discounts?: Array<any>,
 *   adminUrlFor?: (id: string) => string,
 *   children: React.ReactNode,
 *   aside?: React.ReactNode,
 * }} props
 */
export function CapabilityPage({
  capabilityKey,
  discounts,
  adminUrlFor,
  children,
  aside,
}) {
  const capability = CAPABILITY_BY_KEY[capabilityKey];

  return (
    <Page
      title={capability.title}
      subtitle={capability.summary}
      backAction={{ content: "Home", url: "/app" }}
      titleMetadata={<Badge>{KIND_LABEL[capability.kind]}</Badge>}
    >
      <TitleBar title={capability.title} />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>{children}</Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    How it works
                  </Text>
                  <List type="bullet">
                    {capability.howItWorks.map((item) => (
                      <List.Item key={item}>{item}</List.Item>
                    ))}
                  </List>
                  <Box paddingBlockStart="100">
                    <Text as="p" variant="bodySm" tone="subdued">
                      Configuration: {capability.configSource}
                    </Text>
                    {capability.functionId && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Function: {capability.functionHandle}
                      </Text>
                    )}
                  </Box>
                </BlockStack>
              </Card>
              {aside}
            </BlockStack>
          </Layout.Section>
        </Layout>
        {discounts && adminUrlFor && (
          <DiscountsTable
            discounts={discounts}
            adminUrlFor={adminUrlFor}
            title={`Discounts using ${capability.title}`}
            showFunction={false}
          />
        )}
      </BlockStack>
      <Box paddingBlockEnd="600" />
    </Page>
  );
}

export function StatusSummary({ discounts }) {
  const active = discounts.filter((d) => d.status === "ACTIVE");
  return (
    <InlineStack gap="200">
      <Badge tone={active.length ? "success" : undefined}>
        {active.length} active
      </Badge>
      <Badge>{discounts.length} total</Badge>
    </InlineStack>
  );
}
