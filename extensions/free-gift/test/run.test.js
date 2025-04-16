/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { run } from '../src/run';

describe('Free Gift Function', () => {
  let mockInput;
  
  beforeEach(() => {
    // Setup a basic mock input with an empty cart
    mockInput = {
      cart: {
        lines: [],
        cost: {
          subtotalAmount: {
            amount: '0.00',
            currencyCode: 'USD'
          },
          totalAmount: {
            amount: '0.00',
            currencyCode: 'USD'
          }
        }
      }
    };
  });

  it('should not add a free gift when cart is empty', () => {
    const result = run(mockInput);
    expect(result.operations).toEqual([]);
  });

  it('should add a free gift when cart value exceeds minimum threshold', () => {
    // Setup cart with sufficient value
    mockInput.cart.cost.subtotalAmount.amount = '60.00';
    mockInput.cart.lines = [
      {
        id: 'gid://shopify/CartLine/1',
        quantity: 1,
        merchandise: {
          __typename: 'ProductVariant',
          id: 'gid://shopify/ProductVariant/123',
          product: {
            id: 'gid://shopify/Product/123',
            title: 'Test Product',
            collections: {
              edges: []
            },
            tags: []
          }
        },
        cost: {
          totalAmount: {
            amount: '60.00',
            currencyCode: 'USD'
          }
        }
      }
    ];

    const result = run(mockInput);
    
    expect(result.operations.length).toBe(1);
    expect(result.operations[0].add).toBeDefined();
    expect(result.operations[0].add.merchandiseId).toBe('gid://shopify/ProductVariant/987654321');
  });

  it('should add a free gift when collection-specific items exceed threshold', () => {
    // Setup cart with collection-specific items
    mockInput.cart.cost.subtotalAmount.amount = '60.00';
    mockInput.cart.lines = [
      {
        id: 'gid://shopify/CartLine/1',
        quantity: 1,
        merchandise: {
          __typename: 'ProductVariant',
          id: 'gid://shopify/ProductVariant/123',
          product: {
            id: 'gid://shopify/Product/123',
            title: 'Test Product',
            collections: {
              edges: [
                {
                  node: {
                    id: 'gid://shopify/Collection/123456789'
                  }
                }
              ]
            },
            tags: []
          }
        },
        cost: {
          totalAmount: {
            amount: '60.00',
            currencyCode: 'USD'
          }
        }
      }
    ];

    const result = run(mockInput);
    
    expect(result.operations.length).toBe(1);
    expect(result.operations[0].add).toBeDefined();
    expect(result.operations[0].add.merchandiseId).toBe('gid://shopify/ProductVariant/987654321');
  });

  it('should add a free gift when tag-specific items exceed threshold', () => {
    // Setup cart with tag-specific items
    mockInput.cart.cost.subtotalAmount.amount = '60.00';
    mockInput.cart.lines = [
      {
        id: 'gid://shopify/CartLine/1',
        quantity: 1,
        merchandise: {
          __typename: 'ProductVariant',
          id: 'gid://shopify/ProductVariant/123',
          product: {
            id: 'gid://shopify/Product/123',
            title: 'Test Product',
            collections: {
              edges: []
            },
            tags: ['fathers-day']
          }
        },
        cost: {
          totalAmount: {
            amount: '60.00',
            currencyCode: 'USD'
          }
        }
      }
    ];

    const result = run(mockInput);
    
    expect(result.operations.length).toBe(1);
    expect(result.operations[0].add).toBeDefined();
    expect(result.operations[0].add.merchandiseId).toBe('gid://shopify/ProductVariant/987654321');
  });

  it('should remove free gift when cart no longer meets criteria', () => {
    // Setup cart with insufficient value but containing the free gift
    mockInput.cart.cost.subtotalAmount.amount = '40.00';
    mockInput.cart.lines = [
      {
        id: 'gid://shopify/CartLine/1',
        quantity: 1,
        merchandise: {
          __typename: 'ProductVariant',
          id: 'gid://shopify/ProductVariant/123',
          product: {
            id: 'gid://shopify/Product/123',
            title: 'Test Product',
            collections: {
              edges: []
            },
            tags: []
          }
        },
        cost: {
          totalAmount: {
            amount: '40.00',
            currencyCode: 'USD'
          }
        }
      },
      {
        id: 'gid://shopify/CartLine/2',
        quantity: 1,
        merchandise: {
          __typename: 'ProductVariant',
          id: 'gid://shopify/ProductVariant/987654321', // This is the free gift
          product: {
            id: 'gid://shopify/Product/456',
            title: 'Free Gift',
            collections: {
              edges: []
            },
            tags: []
          }
        },
        cost: {
          totalAmount: {
            amount: '0.00',
            currencyCode: 'USD'
          }
        }
      }
    ];

    const result = run(mockInput);
    
    expect(result.operations.length).toBe(1);
    expect(result.operations[0].remove).toBeDefined();
    expect(result.operations[0].remove.id).toBe('gid://shopify/CartLine/2');
  });
});
