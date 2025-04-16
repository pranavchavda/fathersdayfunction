# Free Gift Function Configuration Guide

This guide explains how to use the custom configuration interface for the Free Gift Function extension. This interface allows you to easily set up and manage your Father's Day promotion by configuring when and how free gifts are added to customer carts.

## Accessing the Configuration Interface

1. In your Shopify admin, navigate to **Apps** and open your app
2. Click on the **Extensions** tab
3. Find the **Free Gift** extension and click on it
4. You'll be taken to the dashboard overview

## Dashboard Overview

The dashboard provides a quick overview of your current free gift configuration:

- **Current Configuration**: Shows your configured settings including minimum cart value, eligible collections, tags, and the selected free gift
- **How It Works**: Explains the basic workflow of the free gift function
- **Configure Button**: Takes you to the detailed configuration page

## Configuring the Free Gift Function

From the dashboard, click the **Configure** or **Edit Configuration** button to access the detailed configuration page.

### Cart Criteria Settings

This section allows you to define when customers will receive a free gift:

1. **Minimum Cart Value**:
   - Set the minimum amount customers must spend to qualify for a free gift
   - Example: Enter "50.00" to require a $50 minimum purchase

2. **Eligible Collections**:
   - Select specific product collections that qualify for the free gift
   - Click "Add Collections" to open a selection modal
   - Select collections from the list
   - Selected collections appear as tags that can be removed if needed
   - Customers must purchase from these collections to qualify

3. **Eligible Tag**:
   - Enter a product tag that qualifies for the free gift
   - Customers must purchase products with this tag to qualify
   - Example: Enter "fathers-day" to require products with this tag

### Free Gift Settings

This section allows you to define what free gift will be added to qualifying carts:

1. **Selected Gift**:
   - Click "Select Free Gift" to open the product selection modal
   - Browse your store's products and select a specific variant to offer as the free gift
   - The selected product and variant will be displayed with its price
   - You can change the selection at any time

2. **Gift Quantity**:
   - Set how many of the free gift item will be added to qualifying carts
   - Default is 1, but you can increase this for more generous promotions

## Saving Your Configuration

After making your selections, click the **Save** button at the top of the page to apply your configuration. A success message will appear when your settings are saved.

## How the Free Gift Function Works

Once configured, the free gift function will automatically:

1. Check each cart against your configured criteria
2. Add the specified free gift when criteria are met
3. Remove the free gift if criteria are no longer met (e.g., if items are removed from cart)
4. Apply the free gift with a price of $0.00

## Testing Your Configuration

After saving your configuration, you should test it to ensure it works as expected:

1. Open your store's frontend in a new browser tab
2. Add products to your cart that meet your configured criteria
3. Verify that the free gift is automatically added to your cart
4. Try removing items to fall below the criteria and verify the free gift is removed

## Troubleshooting

If the free gift is not being added to carts as expected:

1. Verify your configuration settings are saved correctly
2. Check that the minimum cart value is not set too high
3. Ensure the selected collections or tags match your products
4. Confirm the free gift product variant is in stock and available

## Need Help?

If you encounter any issues with the free gift function configuration, please contact your developer or Shopify support for assistance.
