import { json } from "@remix-run/node";
import { authenticate } from "../../shopify.server";

/**
 * Helper function to save free gift function configuration
 * This centralizes the configuration update logic for reuse across routes
 */
export async function saveFreeGiftConfiguration(admin, configuration) {
  try {
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
    return responseJson.data.app.extensionByHandle?.configuration || {
      minimum_cart_value: "50.00",
      eligible_collection_ids: [],
      eligible_tag: "",
      free_gift_variant_id: "",
      free_gift_quantity: "1"
    };
  } catch (error) {
    console.error("Error fetching configuration:", error);
    return {
      minimum_cart_value: "50.00",
      eligible_collection_ids: [],
      eligible_tag: "",
      free_gift_variant_id: "",
      free_gift_quantity: "1"
    };
  }
}

/**
 * Helper function to fetch collections for the configuration interface
 */
export async function getShopifyCollections(admin) {
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
