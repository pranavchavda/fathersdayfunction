module.exports = {
  apps: [{
    name: "shopify-remix-app",
    script: "npm",
    args: "run start",
    env: {
      NODE_ENV: "production",
      SHOPIFY_APP_URL: "https://tier-discount.idrinkcoffee.com",
      SHOPIFY_API_KEY: "YOUR_SHOPIFY_API_KEY",
      SHOPIFY_API_SECRET: "YOUR_SHOPIFY_API_SECRET",
      SCOPES: "YOUR_APP_SCOPES",
      PORT: "3000"
    },
  }]
};
