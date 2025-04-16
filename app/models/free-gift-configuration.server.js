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
    
    const response = await admin.graphql(
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
    
    const responseJson = await response.json();
    const userErrors = responseJson.data?.functionConfigurationUpdate?.userErrors || [];
    
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
    // Updated query to match the expected schema
    // Instead of using extensionByHandle which doesn't exist, we'll use a more generic approach
    const response = await admin.graphql(
      `query GetFunctions {
        app {
          functions(first: 10) {
            edges {
              node {
                id
                title
                apiType
                apiVersion
              }
            }
          }
        }
      }`
    );
    
    const responseJson = await response.json();
    console.log("Functions response:", JSON.stringify(responseJson, null, 2));
    
    // For now, return the default configuration
    // In a production environment, you would parse the response and find the right function
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
  // If admin is not provided (when authentication is removed), return empty array
  if (!admin) {
    console.log("Returning empty collections (no admin provided)");
    return [];
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
  // If admin is not provided (when authentication is removed), return empty array
  if (!admin) {
    console.log("Returning empty products (no admin provided)");
    return [];
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
