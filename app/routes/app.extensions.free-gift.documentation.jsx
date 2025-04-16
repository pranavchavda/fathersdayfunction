import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
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
} from "@shopify/polaris";
import { GiftCardMajor } from "@shopify/polaris-icons";
// Remove authentication requirement
// import { authenticate } from "../../shopify.server";
import { getFreeGiftConfiguration } from "../../models/free-gift-configuration.server";

export const loader = async ({ request }) => {
  // Remove authentication requirement
  // const { admin } = await authenticate.admin(request);

  // For now, return empty configuration until we fix the GraphQL error
  const configuration = {
    minimum_cart_value: "",
    eligible_collection_ids: [],
    eligible_tag: "",
    free_gift_variant_id: "",
    free_gift_quantity: "1"
  };

  return json({
    configuration
  });
};

export default function FreeGiftDocumentation() {
  return (
    <Page
      title="Free Gift Documentation"
      backAction={{ content: "Dashboard", url: "/app/extensions/free-gift/dashboard" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingLg">
                Free Gift Function Configuration Guide
              </Text>
              
              <Text as="p" variant="bodyMd">
                This guide explains how to use the custom configuration interface for the Free Gift Function extension. 
                This interface allows you to easily set up and manage your Father's Day promotion by configuring when 
                and how free gifts are added to customer carts.
              </Text>
              
              <Text as="h3" variant="headingMd">
                Accessing the Configuration Interface
              </Text>
              
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  1. In your Shopify admin, navigate to <strong>Apps</strong> and open your app
                </Text>
                <Text as="p" variant="bodyMd">
                  2. Click on the <strong>Extensions</strong> tab
                </Text>
                <Text as="p" variant="bodyMd">
                  3. Find the <strong>Free Gift</strong> extension and click on it
                </Text>
                <Text as="p" variant="bodyMd">
                  4. You'll be taken to the dashboard overview
                </Text>
              </BlockStack>
              
              <Text as="h3" variant="headingMd">
                Dashboard Overview
              </Text>
              
              <Text as="p" variant="bodyMd">
                The dashboard provides a quick overview of your current free gift configuration:
              </Text>
              
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  • <strong>Current Configuration</strong>: Shows your configured settings including minimum cart value, eligible collections, tags, and the selected free gift
                </Text>
                <Text as="p" variant="bodyMd">
                  • <strong>How It Works</strong>: Explains the basic workflow of the free gift function
                </Text>
                <Text as="p" variant="bodyMd">
                  • <strong>Configure Button</strong>: Takes you to the detailed configuration page
                </Text>
              </BlockStack>
              
              <Text as="h3" variant="headingMd">
                Configuring the Free Gift Function
              </Text>
              
              <Text as="p" variant="bodyMd">
                From the dashboard, click the <strong>Configure</strong> or <strong>Edit Configuration</strong> button to access the detailed configuration page.
              </Text>
              
              <Text as="h4" variant="headingSm">
                Cart Criteria Settings
              </Text>
              
              <Text as="p" variant="bodyMd">
                This section allows you to define when customers will receive a free gift:
              </Text>
              
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <strong>1. Minimum Cart Value</strong>:
                </Text>
                <Text as="p" variant="bodyMd" padding="200">
                  • Set the minimum amount customers must spend to qualify for a free gift<br />
                  • Example: Enter "50.00" to require a $50 minimum purchase
                </Text>
                
                <Text as="p" variant="bodyMd">
                  <strong>2. Eligible Collections</strong>:
                </Text>
                <Text as="p" variant="bodyMd" padding="200">
                  • Select specific product collections that qualify for the free gift<br />
                  • Click "Add Collections" to open a selection modal<br />
                  • Select collections from the list<br />
                  • Selected collections appear as tags that can be removed if needed<br />
                  • Customers must purchase from these collections to qualify
                </Text>
                
                <Text as="p" variant="bodyMd">
                  <strong>3. Eligible Tag</strong>:
                </Text>
                <Text as="p" variant="bodyMd" padding="200">
                  • Enter a product tag that qualifies for the free gift<br />
                  • Customers must purchase products with this tag to qualify<br />
                  • Example: Enter "fathers-day" to require products with this tag
                </Text>
              </BlockStack>
              
              <Text as="h4" variant="headingSm">
                Free Gift Settings
              </Text>
              
              <Text as="p" variant="bodyMd">
                This section allows you to define what free gift will be added to qualifying carts:
              </Text>
              
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  <strong>1. Selected Gift</strong>:
                </Text>
                <Text as="p" variant="bodyMd" padding="200">
                  • Click "Select Free Gift" to open the product selection modal<br />
                  • Browse your store's products and select a specific variant to offer as the free gift<br />
                  • The selected product and variant will be displayed with its price<br />
                  • You can change the selection at any time
                </Text>
                
                <Text as="p" variant="bodyMd">
                  <strong>2. Gift Quantity</strong>:
                </Text>
                <Text as="p" variant="bodyMd" padding="200">
                  • Set how many of the free gift item will be added to qualifying carts<br />
                  • Default is 1, but you can increase this for more generous promotions
                </Text>
              </BlockStack>
              
              <Text as="h3" variant="headingMd">
                Saving Your Configuration
              </Text>
              
              <Text as="p" variant="bodyMd">
                After making your selections, click the <strong>Save</strong> button at the top of the page to apply your configuration. 
                A success message will appear when your settings are saved.
              </Text>
              
              <Text as="h3" variant="headingMd">
                How the Free Gift Function Works
              </Text>
              
              <Text as="p" variant="bodyMd">
                Once configured, the free gift function will automatically:
              </Text>
              
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  1. Check each cart against your configured criteria
                </Text>
                <Text as="p" variant="bodyMd">
                  2. Add the specified free gift when criteria are met
                </Text>
                <Text as="p" variant="bodyMd">
                  3. Remove the free gift if criteria are no longer met (e.g., if items are removed from cart)
                </Text>
                <Text as="p" variant="bodyMd">
                  4. Apply the free gift with a price of $0.00
                </Text>
              </BlockStack>
              
              <Box paddingBlockStart="400">
                <Button primary url="/app/extensions/free-gift">
                  Configure Free Gift
                </Button>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
