/**
 * Example script for setting up metafields for the Free Gift Cart Transform function
 * 
 * This script demonstrates how to use the Shopify Admin API to:
 * 1. Create a Cart Transform
 * 2. Set metafields on the Cart Transform for configuration
 * 
 * Prerequisites:
 * - Node.js installed
 * - Shopify API access with appropriate scopes
 * - A Shopify store with the Free Gift app installed
 */

// Import required libraries
// In a real implementation, you would use @shopify/shopify-api
// For demonstration purposes, we're using a simplified approach
const fetch = require('node-fetch');

// Configuration
const SHOP_DOMAIN = 'your-store.myshopify.com';
const ACCESS_TOKEN = 'your_admin_api_access_token';
const API_VERSION = '2024-10';

// GraphQL endpoint
const GRAPHQL_URL = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

// Headers for API requests
const headers = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': ACCESS_TOKEN
};

/**
 * Create a Cart Transform
 * @returns {Promise<string>} The ID of the created Cart Transform
 */
async function createCartTransform() {
  const query = `
    mutation cartTransformCreate {
      cartTransformCreate(
        cartTransform: {
          title: "Free Gift Cart Transform",
          description: "Adds a free gift to the cart based on specific criteria",
          enabled: true,
          apiVersion: "${API_VERSION}"
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
    }
  `;

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    
    if (data.data.cartTransformCreate.userErrors.length > 0) {
      throw new Error(`User errors: ${JSON.stringify(data.data.cartTransformCreate.userErrors)}`);
    }
    
    return data.data.cartTransformCreate.cartTransform.id;
  } catch (error) {
    console.error('Error creating Cart Transform:', error);
    throw error;
  }
}

/**
 * Set metafields on a Cart Transform
 * @param {string} cartTransformId - The ID of the Cart Transform
 * @param {object} configuration - The configuration to store in metafields
 * @returns {Promise<void>}
 */
async function setCartTransformMetafields(cartTransformId, configuration) {
  // Convert configuration to JSON string
  const configurationJson = JSON.stringify(configuration);
  
  const query = `
    mutation metafieldSet {
      metafieldSet(
        metafield: {
          ownerId: "${cartTransformId}",
          namespace: "cart_transform",
          key: "function_configuration",
          type: "json",
          value: ${JSON.stringify(configurationJson)}
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
    }
  `;

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    
    if (data.data.metafieldSet.userErrors.length > 0) {
      throw new Error(`User errors: ${JSON.stringify(data.data.metafieldSet.userErrors)}`);
    }
    
    console.log('Metafields set successfully:', data.data.metafieldSet.metafield);
  } catch (error) {
    console.error('Error setting metafields:', error);
    throw error;
  }
}

/**
 * Main function to set up the Cart Transform and its metafields
 */
async function setupFreeGiftCartTransform() {
  try {
    // Sample configuration
    const configuration = {
      minimum_cart_value: "100.00",
      eligible_collection_ids: ["gid://shopify/Collection/123456789"],
      eligible_tag: "fathers-day",
      free_gift_variant_id: "gid://shopify/ProductVariant/987654321",
      free_gift_quantity: "1"
    };
    
    console.log('Creating Cart Transform...');
    const cartTransformId = await createCartTransform();
    console.log('Cart Transform created with ID:', cartTransformId);
    
    console.log('Setting metafields...');
    await setCartTransformMetafields(cartTransformId, configuration);
    console.log('Setup completed successfully!');
    
    console.log('\nTo update the configuration in the future, use the following Cart Transform ID:');
    console.log(cartTransformId);
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

// Run the setup
setupFreeGiftCartTransform();
