import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Box,
  Button,
  InlineStack,
  Icon,
  Banner,
} from "@shopify/polaris";
import { GiftCardIcon } from "@shopify/polaris-icons";
import { getFreeGiftConfiguration } from "../../models/free-gift-configuration.server";

export const loader = async ({ request }) => {
  // Remove authentication requirement
  // const { admin } = await authenticate.admin(request);
  
  // Get configuration using the updated server function
  const configuration = await getFreeGiftConfiguration(null);

  return json({
    configuration
  });
};

export default function FreeGiftDashboard() {
  const { configuration } = useLoaderData();
  
  const hasConfiguration = configuration && 
    (configuration.minimum_cart_value || 
     (configuration.eligible_collection_ids && configuration.eligible_collection_ids.length > 0) ||
     configuration.eligible_tag ||
     configuration.free_gift_variant_id);

  return (
    <Page
      title="Free Gift Function"
      primaryAction={{
        content: "Configure",
        url: "/app/extensions/free-gift",
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <InlineStack gap="400" align="center">
                <Icon source={GiftCardIcon} color="base" />
                <Text as="h2" variant="headingLg">
                  Father's Day Free Gift
                </Text>
              </InlineStack>
              
              <Text as="p" variant="bodyMd">
                This extension automatically adds a free gift to the cart when customers meet specific criteria.
                Configure the extension to set up your Father's Day promotion.
              </Text>
              
              <Box paddingBlockStart="400">
                {hasConfiguration ? (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Current Configuration
                    </Text>
                    
                    {configuration.minimum_cart_value && (
                      <Box paddingBlockStart="200">
                        <Text as="p" variant="bodyMd">
                          <Text as="span" fontWeight="bold">Minimum Cart Value:</Text> ${configuration.minimum_cart_value}
                        </Text>
                      </Box>
                    )}
                    
                    {configuration.eligible_collection_ids && configuration.eligible_collection_ids.length > 0 && (
                      <Box paddingBlockStart="200">
                        <Text as="p" variant="bodyMd">
                          <Text as="span" fontWeight="bold">Eligible Collections:</Text> {configuration.eligible_collection_ids.length} collection(s) selected
                        </Text>
                      </Box>
                    )}
                    
                    {configuration.eligible_tag && (
                      <Box paddingBlockStart="200">
                        <Text as="p" variant="bodyMd">
                          <Text as="span" fontWeight="bold">Eligible Tag:</Text> {configuration.eligible_tag}
                        </Text>
                      </Box>
                    )}
                    
                    {configuration.free_gift_variant_id && (
                      <Box paddingBlockStart="200">
                        <Text as="p" variant="bodyMd">
                          <Text as="span" fontWeight="bold">Free Gift:</Text> Product variant ID: {configuration.free_gift_variant_id}
                        </Text>
                      </Box>
                    )}
                    
                    {configuration.free_gift_quantity && (
                      <Box paddingBlockStart="200">
                        <Text as="p" variant="bodyMd">
                          <Text as="span" fontWeight="bold">Gift Quantity:</Text> {configuration.free_gift_quantity}
                        </Text>
                      </Box>
                    )}
                    
                    <Box paddingBlockStart="400">
                      <Button primary url="/app/extensions/free-gift">
                        Edit Configuration
                      </Button>
                    </Box>
                  </BlockStack>
                ) : (
                  <BlockStack gap="400" align="center">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      The free gift function is not configured yet.
                    </Text>
                    <Button primary url="/app/extensions/free-gift">
                      Configure Now
                    </Button>
                  </BlockStack>
                )}
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                How It Works
              </Text>
              
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">1.</Text> Set a minimum cart value, eligible collections, or product tag
                </Text>
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">2.</Text> Select a product variant to offer as a free gift
                </Text>
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">3.</Text> When customers meet the criteria, the free gift is automatically added to their cart
                </Text>
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">4.</Text> If customers no longer meet the criteria, the free gift is automatically removed
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Implementation Details
              </Text>
              
              <Banner tone="info">
                This free gift function uses Shopify's Cart Transform API with proper operation structure and metafields-based configuration.
              </Banner>
              
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">• Cart Transform API:</Text> Uses merge and expand operations to add free gifts as components
                </Text>
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">• Metafields Configuration:</Text> Settings are stored in Cart Transform metafields for persistence
                </Text>
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">• WebAssembly Output:</Text> Function is compiled to WebAssembly for optimal performance
                </Text>
                <Text as="p" variant="bodyMd">
                  <Text as="span" fontWeight="bold">• Error Handling:</Text> Comprehensive error handling for all edge cases
                </Text>
              </BlockStack>
              
              <Box paddingBlockStart="300">
                <Button url="/app/extensions/free-gift/documentation">
                  View Documentation
                </Button>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
