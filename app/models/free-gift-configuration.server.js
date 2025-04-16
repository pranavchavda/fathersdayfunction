import { json } from "@remix-run/node";

/**
 * Helper function to save free gift function configuration
 * This centralizes the configuration update logic for reuse across routes
 */
export async function saveFreeGiftConfiguration(admin, configuration) {
  try {
    // If admin is not provided (when authentication is removed), return mock success
    if (!admin) {
      console.log("Mock saving configuration:", configuration);
      return {
        status: "success"
      };
    }
    
    // First, get the Cart Transform ID
    const cartTransformResponse = await admin.graphql(
      `query GetCartTransforms {
        cartTransforms(first: 10) {
          edges {
            node {
              id
              title
            }
          }
        }
      }`
    );
    
    const cartTransformJson = await cartTransformResponse.json();
    const cartTransforms = cartTransformJson.data?.cartTransforms?.edges || [];
    
    // Find the Free Gift Cart Transform or use the first one
    let cartTransformId = null;
    for (const edge of cartTransforms) {
      if (edge.node.title.toLowerCase().includes("free gift")) {
        cartTransformId = edge.node.id;
        break;
      }
    }
    
    // If no matching Cart Transform found, create one
    if (!cartTransformId && cartTransforms.length > 0) {
      cartTransformId = cartTransforms[0].node.id;
    }
    
    // If still no Cart Transform, create one
    if (!cartTransformId) {
      const createResponse = await admin.graphql(
        `mutation cartTransformCreate {
          cartTransformCreate(
            cartTransform: {
              title: "Free Gift Cart Transform",
              description: "Adds a free gift to the cart based on specific criteria",
              enabled: true
            }
          ) {
            cartTransform {
              id
            }
            userErrors {
              field
              message
            }
          }
        }`
      );
      
      const createJson = await createResponse.json();
      cartTransformId = createJson.data?.cartTransformCreate?.cartTransform?.id;
      
      if (!cartTransformId) {
        const errors = createJson.data?.cartTransformCreate?.userErrors || [];
        return {
          status: "error",
          errors
        };
      }
    }
    
    // Now set the metafield on the Cart Transform
    const metafieldResponse = await admin.graphql(
      `mutation metafieldSet($ownerId: ID!, $namespace: String!, $key: String!, $value: String!) {
        metafieldSet(
          metafield: {
            ownerId: $ownerId,
            namespace: $namespace,
            key: $key,
            type: "json",
            value: $value
          }
        ) {
          metafield {
            id
            namespace
            key
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          ownerId: cartTransformId,
          namespace: "cart_transform",
          key: "function_configuration",
          value: JSON.stringify(configuration)
        }
      }
    );
    
    const metafieldJson = await metafieldResponse.json();
    const userErrors = metafieldJson.data?.metafieldSet?.userErrors || [];
    
    if (userErrors.length > 0) {
      return {
        status: "error",
        errors: userErrors
      };
    }
    
    return {
      status: "success"
    };
  } catch (error) {
    console.error("Error updating configuration:", error);
    return {
      status: "error",
      message: error.message
    };
  }
}

/**
 * Helper function to fetch free gift function configuration
 * This centralizes the configuration retrieval logic for reuse across routes
 */
export async function getFreeGiftConfiguration(admin) {
  // Default configuration to return if we can't fetch from API
  const defaultConfig = {
    minimum_cart_value: "50.00",
    eligible_collection_ids: [],
    eligible_tag: "",
    free_gift_variant_id: "",
    free_gift_quantity: "1"
  };
  
  // If admin is not provided (when authentication is removed), return default config
  if (!admin) {
    console.log("Returning default configuration (no admin provided)");
    return defaultConfig;
  }
  
  try {
    // First, get the Cart Transform ID
    const cartTransformResponse = await admin.graphql(
      `query GetCartTransforms {
        cartTransforms(first: 10) {
          edges {
            node {
              id
              title
              metafields(first: 10) {
                edges {
                  node {
                    namespace
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }`
    );
    
    const cartTransformJson = await cartTransformResponse.json();
    const cartTransforms = cartTransformJson.data?.cartTransforms?.edges || [];
    
    // Find the Free Gift Cart Transform or use the first one
    let configMetafield = null;
    for (const edge of cartTransforms) {
      const metafields = edge.node.metafields?.edges || [];
      for (const metaEdge of metafields) {
        if (metaEdge.node.namespace === "cart_transform" && metaEdge.node.key === "function_configuration") {
          configMetafield = metaEdge.node;
          break;
        }
      }
      if (configMetafield) break;
    }
    
    // If metafield found, parse the configuration
    if (configMetafield && configMetafield.value) {
      try {
        const parsedConfig = JSON.parse(configMetafield.value);
        return {
          ...defaultConfig,
          ...parsedConfig
        };
      } catch (parseError) {
        console.error("Error parsing configuration metafield:", parseError);
      }
    }
    
    // Return default if no valid configuration found
    return defaultConfig;
  } catch (error) {
    console.error("Error fetching configuration:", error);
    return defaultConfig;
  }
}

/**
 * Helper function to fetch collections for the configuration interface
 */
export async function getShopifyCollections(admin) {
  // If admin is not provided (when authentication is removed), return mock data
  if (!admin) {
    console.log("Returning mock collections (no admin provided)");
    return [
      { id: "gid://shopify/Collection/123456789", title: "Summer Collection" },
      { id: "gid://shopify/Collection/987654321", title: "Father's Day Collection" },
      { id: "gid://shopify/Collection/456789123", title: "Best Sellers" }
    ];
  }
  
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
    return responseJson.data.collections.edges.map(edge => ({
      id: edge.node.id,
      title: edge.node.title
    }));
  } catch (error) {
    console.error("Error fetching collections:", error);
    return [];
  }
}

/**
 * Helper function to fetch products for the configuration interface
 */
export async function getShopifyProducts(admin) {
  // If admin is not provided (when authentication is removed), return mock data
  if (!admin) {
    console.log("Returning mock products (no admin provided)");
    return [
      {
        id: "gid://shopify/Product/123456",
        title: "Father's Day Special Gift",
        variants: [
          {
            id: "gid://shopify/ProductVariant/987654321",
            title: "Default",
            price: "19.99",
            image: "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
          }
        ]
      },
      {
        id: "gid://shopify/Product/234567",
        title: "Premium Gift Set",
        variants: [
          {
            id: "gid://shopify/ProductVariant/876543210",
            title: "Small",
            price: "24.99",
            image: "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
          },
          {
            id: "gid://shopify/ProductVariant/765432109",
            title: "Large",
            price: "34.99",
            image: "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png"
          }
        ]
      }
    ];
  }
  
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
    return responseJson.data.products.edges.map(edge => ({
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
    return [];
  }
}
