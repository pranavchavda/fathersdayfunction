import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import { useCallback, useState, useEffect } from "react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  TextField,
  Banner,
  Tag,
  Modal,
  LegacyCard,
  DataTable,
  EmptyState,
  Toast,
  Frame,
} from "@shopify/polaris";
// Remove authentication requirement
// import { authenticate } from "../../shopify.server";
import { 
  getFreeGiftConfiguration, 
  getShopifyCollections, 
  getShopifyProducts,
  saveFreeGiftConfiguration
} from "../../models/free-gift-configuration.server";

export const loader = async ({ request }) => {
  // Remove authentication requirement
  // const { admin } = await authenticate.admin(request);

  // For now, return mock data until we fix the GraphQL error
  const configuration = await getFreeGiftConfiguration(null);
  const collections = await getShopifyCollections(null);
  const products = await getShopifyProducts(null);

  return json({
    configuration,
    collections,
    products
  });
};

export const action = async ({ request }) => {
  // Remove authentication requirement
  // const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const configuration = {
    minimum_cart_value: formData.get("minimum_cart_value"),
    eligible_collection_ids: JSON.parse(formData.get("eligible_collection_ids") || "[]"),
    eligible_tag: formData.get("eligible_tag"),
    free_gift_variant_id: formData.get("free_gift_variant_id"),
    free_gift_quantity: formData.get("free_gift_quantity")
  };

  // Save configuration using the updated server function
  const result = await saveFreeGiftConfiguration(null, configuration);
  return json(result);
};

export default function FreeGiftConfiguration() {
  const { configuration, collections, products } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [minimumCartValue, setMinimumCartValue] = useState(
    configuration.minimum_cart_value || "50.00"
  );
  const [eligibleCollectionIds, setEligibleCollectionIds] = useState(
    configuration.eligible_collection_ids || []
  );
  const [eligibleTag, setEligibleTag] = useState(
    configuration.eligible_tag || ""
  );
  const [freeGiftVariantId, setFreeGiftVariantId] = useState(
    configuration.free_gift_variant_id || ""
  );
  const [freeGiftQuantity, setFreeGiftQuantity] = useState(
    configuration.free_gift_quantity || "1"
  );

  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  
  const [toastActive, setToastActive] = useState(false);
  const [toastContent, setToastContent] = useState("");
  const [toastError, setToastError] = useState(false);

  // Initialize selected collections from configuration
  useEffect(() => {
    if (eligibleCollectionIds.length > 0) {
      const selected = collections.filter(collection => 
        eligibleCollectionIds.includes(collection.id)
      );
      setSelectedCollections(selected);
    }
  }, [collections, eligibleCollectionIds]);

  // Initialize selected product and variant from configuration
  useEffect(() => {
    if (freeGiftVariantId) {
      for (const product of products) {
        const variant = product.variants.find(v => v.id === freeGiftVariantId);
        if (variant) {
          setSelectedProduct(product);
          setSelectedVariant(variant);
          break;
        }
      }
    }
  }, [products, freeGiftVariantId]);
  
  // Show toast notification when action completes
  useEffect(() => {
    if (actionData) {
      if (actionData.status === "success") {
        setToastContent("Configuration saved successfully");
        setToastError(false);
        setToastActive(true);
      } else if (actionData.status === "error") {
        setToastContent("Error saving configuration: " + (actionData.message || "Unknown error"));
        setToastError(true);
        setToastActive(true);
      }
    }
  }, [actionData]);

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.append("minimum_cart_value", minimumCartValue);
    formData.append("eligible_collection_ids", JSON.stringify(eligibleCollectionIds));
    formData.append("eligible_tag", eligibleTag);
    formData.append("free_gift_variant_id", freeGiftVariantId);
    formData.append("free_gift_quantity", freeGiftQuantity);

    submit(formData, { method: "post" });
  }, [
    minimumCartValue,
    eligibleCollectionIds,
    eligibleTag,
    freeGiftVariantId,
    freeGiftQuantity,
    submit
  ]);

  const handleCollectionSelect = (collectionId) => {
    const collection = collections.find(c => c.id === collectionId);
    if (collection) {
      setSelectedCollections([...selectedCollections, collection]);
      setEligibleCollectionIds([...eligibleCollectionIds, collection.id]);
    }
    setIsCollectionModalOpen(false);
  };

  const handleRemoveCollection = (collectionId) => {
    setSelectedCollections(selectedCollections.filter(c => c.id !== collectionId));
    setEligibleCollectionIds(eligibleCollectionIds.filter(id => id !== collectionId));
  };

  const handleVariantSelect = (productId, variantId) => {
    const product = products.find(p => p.id === productId);
    const variant = product?.variants.find(v => v.id === variantId);
    
    if (product && variant) {
      setSelectedProduct(product);
      setSelectedVariant(variant);
      setFreeGiftVariantId(variant.id);
    }
    
    setIsProductModalOpen(false);
  };

  const collectionsNotSelected = collections.filter(
    collection => !eligibleCollectionIds.includes(collection.id)
  );

  const collectionRows = collectionsNotSelected.map(collection => [
    collection.title,
    <Button onClick={() => handleCollectionSelect(collection.id)}>Add</Button>
  ]);

  const toggleToast = useCallback(() => setToastActive((active) => !active), []);

  return (
    <Frame>
      <Page
        title="Free Gift Configuration"
        backAction={{ content: "Dashboard", url: "/app/extensions/free-gift/dashboard" }}
        primaryAction={{
          content: "Save",
          onAction: handleSave,
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Cart Criteria
                </Text>
                
                <TextField
                  label="Minimum Cart Value"
                  type="number"
                  value={minimumCartValue}
                  onChange={setMinimumCartValue}
                  autoComplete="off"
                  prefix="$"
                  helpText="Customers will receive a free gift when their cart value exceeds this amount"
                />

                <Box>
                  <Text as="h3" variant="headingMd">
                    Eligible Collections
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Customers will receive a free gift when they purchase items from these collections
                  </Text>
                  
                  <Box paddingBlock="400">
                    {selectedCollections.length > 0 ? (
                      <InlineStack gap="200" wrap>
                        {selectedCollections.map(collection => (
                          <Tag key={collection.id} onRemove={() => handleRemoveCollection(collection.id)}>
                            {collection.title}
                          </Tag>
                        ))}
                      </InlineStack>
                    ) : (
                      <Banner tone="info">
                        No collections selected. Add collections to make them eligible for the free gift.
                      </Banner>
                    )}
                  </Box>
                  
                  <Button onClick={() => setIsCollectionModalOpen(true)}>
                    Add Collections
                  </Button>
                </Box>

                <TextField
                  label="Eligible Tag"
                  value={eligibleTag}
                  onChange={setEligibleTag}
                  autoComplete="off"
                  helpText="Customers will receive a free gift when they purchase items with this tag"
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Free Gift Settings
                </Text>
                
                <Box>
                  <Text as="h3" variant="headingMd">
                    Selected Gift
                  </Text>
                  
                  {selectedVariant ? (
                    <Box paddingBlock="400">
                      <InlineStack gap="400" align="center">
                        <Box>
                          <Text as="p" variant="bodyMd" fontWeight="bold">
                            {selectedProduct.title} - {selectedVariant.title}
                          </Text>
                          <Text as="p" variant="bodyMd">
                            Price: ${selectedVariant.price}
                          </Text>
                        </Box>
                        <Button onClick={() => setIsProductModalOpen(true)}>
                          Change
                        </Button>
                      </InlineStack>
                    </Box>
                  ) : (
                    <Box paddingBlock="400">
                      <Banner tone="warning">
                        No free gift selected. Please select a product variant to offer as a free gift.
                      </Banner>
                      <Box paddingBlockStart="400">
                        <Button onClick={() => setIsProductModalOpen(true)}>
                          Select Free Gift
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>

                <TextField
                  label="Gift Quantity"
                  type="number"
                  value={freeGiftQuantity}
                  onChange={setFreeGiftQuantity}
                  autoComplete="off"
                  min="1"
                  helpText="Number of free gift items to add to the cart"
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  How It Works
                </Text>
                <Text as="p" variant="bodyMd">
                  This free gift function uses Shopify's Cart Transform API to automatically add a free gift to the customer's cart when certain conditions are met.
                </Text>
                <Text as="p" variant="bodyMd">
                  The free gift will be added as a component of an existing cart item with a price of $0.00, making it truly free for the customer.
                </Text>
                <Text as="p" variant="bodyMd">
                  The configuration is stored using metafields on the Cart Transform object, ensuring it persists across app restarts.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Collection Selection Modal */}
        <Modal
          open={isCollectionModalOpen}
          onClose={() => setIsCollectionModalOpen(false)}
          title="Select Collections"
          primaryAction={{
            content: "Cancel",
            onAction: () => setIsCollectionModalOpen(false),
          }}
        >
          <Modal.Section>
            {collectionsNotSelected.length > 0 ? (
              <LegacyCard>
                <DataTable
                  columnContentTypes={["text", "text"]}
                  headings={["Collection", "Action"]}
                  rows={collectionRows}
                />
              </LegacyCard>
            ) : (
              <EmptyState
                heading="No collections available"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>All collections have been selected already.</p>
              </EmptyState>
            )}
          </Modal.Section>
        </Modal>

        {/* Product Selection Modal */}
        <Modal
          open={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title="Select Free Gift"
          primaryAction={{
            content: "Cancel",
            onAction: () => setIsProductModalOpen(false),
          }}
        >
          <Modal.Section>
            {products.length > 0 ? (
              <BlockStack gap="400">
                {products.map(product => (
                  <Card key={product.id}>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd">
                        {product.title}
                      </Text>
                      
                      {product.variants.map(variant => (
                        <Box key={variant.id} paddingBlockEnd="200">
                          <InlineStack gap="200" align="center">
                            <Text as="span" variant="bodyMd">
                              {variant.title} - ${variant.price}
                            </Text>
                            <Button 
                              onClick={() => handleVariantSelect(product.id, variant.id)}
                              size="slim"
                            >
                              Select
                            </Button>
                          </InlineStack>
                        </Box>
                      ))}
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            ) : (
              <EmptyState
                heading="No products available"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>No products found in your store.</p>
              </EmptyState>
            )}
          </Modal.Section>
        </Modal>
        
        {toastActive && (
          <Toast
            content={toastContent}
            error={toastError}
            onDismiss={toggleToast}
            duration={4000}
          />
        )}
      </Page>
    </Frame>
  );
}
