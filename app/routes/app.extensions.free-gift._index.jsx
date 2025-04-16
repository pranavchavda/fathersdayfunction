import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { useCallback, useState } from "react";
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
} from "@shopify/polaris";
import { authenticate } from "../../../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch current configuration
  let configuration = {};
  try {
    const response = await admin.graphql(
      `query GetFunctionConfiguration {
        app {
          extensionByHandle(handle: "free-gift") {
            ... on FunctionExtension {
              configuration
            }
          }
        }
      }`
    );
    const responseJson = await response.json();
    configuration = responseJson.data.app.extensionByHandle?.configuration || {};
  } catch (error) {
    console.error("Error fetching configuration:", error);
    configuration = {
      minimum_cart_value: "50.00",
      eligible_collection_ids: [],
      eligible_tag: "",
      free_gift_variant_id: "",
      free_gift_quantity: "1"
    };
  }

  // Fetch collections for dropdown
  let collections = [];
  try {
    const response = await admin.graphql(
      `query GetCollections {
        collections(first: 50) {
          edges {
            node {
              id
              title
            }
          }
        }
      }`
    );
    const responseJson = await response.json();
    collections = responseJson.data.collections.edges.map(edge => ({
      id: edge.node.id,
      title: edge.node.title
    }));
  } catch (error) {
    console.error("Error fetching collections:", error);
  }

  // Fetch products for free gift selection
  let products = [];
  try {
    const response = await admin.graphql(
      `query GetProducts {
        products(first: 50) {
          edges {
            node {
              id
              title
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      }`
    );
    const responseJson = await response.json();
    products = responseJson.data.products.edges.map(edge => ({
      id: edge.node.id,
      title: edge.node.title,
      variants: edge.node.variants.edges.map(variantEdge => ({
        id: variantEdge.node.id,
        title: variantEdge.node.title,
        price: variantEdge.node.price,
        image: variantEdge.node.image?.url
      }))
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
  }

  return json({
    configuration,
    collections,
    products
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const configuration = {
    minimum_cart_value: formData.get("minimum_cart_value"),
    eligible_collection_ids: JSON.parse(formData.get("eligible_collection_ids") || "[]"),
    eligible_tag: formData.get("eligible_tag"),
    free_gift_variant_id: formData.get("free_gift_variant_id"),
    free_gift_quantity: formData.get("free_gift_quantity")
  };

  try {
    await admin.graphql(
      `mutation UpdateFunctionConfiguration($functionId: ID!, $configuration: JSON!) {
        functionConfigurationUpdate(
          functionId: $functionId,
          configuration: $configuration
        ) {
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          functionId: "free-gift",
          configuration
        }
      }
    );
    return json({ status: "success" });
  } catch (error) {
    console.error("Error updating configuration:", error);
    return json({ status: "error", error: error.message });
  }
};

export default function FreeGiftConfiguration() {
  const { configuration, collections, products } = useLoaderData();
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

  // Initialize selected collections from configuration
  useState(() => {
    if (eligibleCollectionIds.length > 0) {
      const selected = collections.filter(collection => 
        eligibleCollectionIds.includes(collection.id)
      );
      setSelectedCollections(selected);
    }
  }, []);

  // Initialize selected product and variant from configuration
  useState(() => {
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
  }, []);

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

  const productRows = products.map(product => [
    product.title,
    <Button onClick={() => setIsProductModalOpen(true)}>Select Variant</Button>
  ]);

  return (
    <Page
      title="Free Gift Configuration"
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
    </Page>
  );
}
