export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** An ISO-8601 encoded UTC date time string. Example value: `"2019-07-03T20:47:55Z"`. */
  DateTime: { input: any; output: any; }
  /**
   * A signed decimal number, which supports arbitrary precision and is serialized as a string.
   * Example value: "29.99".
   */
  Decimal: { input: any; output: any; }
  /** Represents a URL. */
  URL: { input: any; output: any; }
};

/** An attribute associated with the cart. */
export type AttributeInput = {
  /** The key of the attribute. */
  key: Scalars['String']['input'];
  /** The value of the attribute. */
  value?: InputMaybe<Scalars['String']['input']>;
};

/** Information about the buyer that is interacting with the cart. */
export type CartBuyerIdentityInput = {
  /** The country where the buyer is located. */
  countryCode?: InputMaybe<CountryCode>;
  /** The customer account associated with the cart. */
  customer?: InputMaybe<CustomerInput>;
  /** The email address of the buyer that is interacting with the cart. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** The phone number of the buyer that is interacting with the cart. */
  phone?: InputMaybe<Scalars['String']['input']>;
};

/** The estimated costs that the buyer will pay at checkout. */
export type CartCostInput = {
  /** The estimated amount, before taxes and discounts, for the customer to pay. */
  subtotalAmount: MoneyV2Input;
  /** The estimated total amount for the customer to pay. */
  totalAmount: MoneyV2Input;
  /** The estimated duty amount for the customer to pay at checkout. */
  totalDutyAmount?: InputMaybe<MoneyV2Input>;
  /** The estimated tax amount for the customer to pay at checkout. */
  totalTaxAmount?: InputMaybe<MoneyV2Input>;
};

/** Information about the options available for one or more line items to be delivered to a specific address. */
export type CartDeliveryGroupInput = {
  /** A list of cart lines for the delivery group. */
  cartLines: Array<CartLineInput>;
  /** The destination address for the delivery group. */
  deliveryAddress?: InputMaybe<MailingAddressInput>;
  /** The delivery options available for the delivery group. */
  deliveryOptions: Array<CartDeliveryOptionInput>;
  /** The ID for the delivery group. */
  id: Scalars['ID']['input'];
  /** The selected delivery option for the delivery group. */
  selectedDeliveryOption?: InputMaybe<CartDeliveryOptionInput>;
};

/** Information about a delivery option. */
export type CartDeliveryOptionInput = {
  /** The code of the delivery option. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** The method for the delivery option. */
  deliveryMethodType: DeliveryMethodType;
  /** The description of the delivery option. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The estimated cost for the delivery option. */
  estimatedCost: MoneyV2Input;
  /** The unique identifier of the delivery option. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** The title of the delivery option. */
  title: Scalars['String']['input'];
};

/** The discounts that have been applied to the cart line. */
export type CartDiscountAllocationInput = {
  /** The discounted amount that has been applied to the cart line. */
  discountedAmount: MoneyV2Input;
};

/** The discount codes applied to the cart. */
export type CartDiscountCodeInput = {
  /** Whether the discount code is applicable to the cart's current contents. */
  applicable: Scalars['Boolean']['input'];
  /** The code for the discount. */
  code: Scalars['String']['input'];
};

/** The estimated costs that the buyer will pay at checkout. */
export type CartEstimatedCostInput = {
  /** The estimated amount, before taxes and discounts, for the customer to pay. */
  subtotalAmount: MoneyV2Input;
  /** The estimated total amount for the customer to pay. */
  totalAmount: MoneyV2Input;
  /** The estimated duty amount for the customer to pay at checkout. */
  totalDutyAmount?: InputMaybe<MoneyV2Input>;
  /** The estimated tax amount for the customer to pay at checkout. */
  totalTaxAmount?: InputMaybe<MoneyV2Input>;
};

/**
 * A cart represents the merchandise that a buyer intends to purchase,
 * and the estimated cost associated with the cart.
 */
export type CartInput = {
  /** The attributes associated with the cart. Attributes are represented as key-value pairs. */
  attribute?: InputMaybe<AttributeInput>;
  /** Information about the buyer that is interacting with the cart. */
  buyerIdentity?: InputMaybe<CartBuyerIdentityInput>;
  /** The URL of the checkout for the cart. */
  checkoutUrl?: InputMaybe<Scalars['URL']['input']>;
  /** The estimated costs that the buyer will pay at checkout. */
  cost: CartCostInput;
  /** The date and time when the cart was created. */
  createdAt: Scalars['DateTime']['input'];
  /**
   * The delivery groups available for the cart, based on the buyer identity default
   * delivery address preference or the default address of the logged-in customer.
   */
  deliveryGroups: Array<CartDeliveryGroupInput>;
  /** The discounts that have been applied to the entire cart. */
  discountAllocations: Array<CartDiscountAllocationInput>;
  /** The case-insensitive discount codes that the customer added at checkout. */
  discountCodes: Array<CartDiscountCodeInput>;
  /** The estimated costs that the buyer will pay at checkout. */
  estimatedCost: CartEstimatedCostInput;
  /** A globally-unique identifier. */
  id: Scalars['ID']['input'];
  /** A list of lines containing information about the items the customer intends to purchase. */
  lines: Array<CartLineInput>;
  /**
   * A note that is associated with the cart. For example, the note can be a
   * personalized message to the buyer.
   */
  note?: InputMaybe<Scalars['String']['input']>;
  /** The total number of items in the cart. */
  totalQuantity: Scalars['Int']['input'];
  /** The date and time when the cart was updated. */
  updatedAt: Scalars['DateTime']['input'];
};

/** The cost of the merchandise line that the buyer will pay at checkout. */
export type CartLineCostInput = {
  /** The amount of the merchandise line. */
  amountPerQuantity: MoneyV2Input;
  /** The compare at amount of the merchandise line. */
  compareAtAmountPerQuantity?: InputMaybe<MoneyV2Input>;
  /** The cost of the merchandise line before line-level discounts. */
  subtotalAmount: MoneyV2Input;
  /** The total cost of the merchandise line. */
  totalAmount: MoneyV2Input;
};

/** The estimated cost of the merchandise line that the buyer will pay at checkout. */
export type CartLineEstimatedCostInput = {
  /** The amount of the merchandise line. */
  amount: MoneyV2Input;
  /** The compare at amount of the merchandise line. */
  compareAtAmount?: InputMaybe<MoneyV2Input>;
  /** The estimated cost of the merchandise line before discounts. */
  subtotalAmount: MoneyV2Input;
  /** The estimated total cost of the merchandise line. */
  totalAmount: MoneyV2Input;
};

/** Represents information about the merchandise in the cart. */
export type CartLineInput = {
  /** An attribute associated with the cart line. */
  attribute?: InputMaybe<AttributeInput>;
  /** The attributes associated with the cart line. Attributes are represented as key-value pairs. */
  attributes: Array<AttributeInput>;
  /** The cost of the merchandise that the buyer will pay for at checkout. */
  cost: CartLineCostInput;
  /** The discounts that have been applied to the cart line. */
  discountAllocations: Array<CartDiscountAllocationInput>;
  /** The estimated cost of the merchandise that the buyer will pay for at checkout. */
  estimatedCost: CartLineEstimatedCostInput;
  /** A globally-unique identifier. */
  id: Scalars['ID']['input'];
  /** The merchandise that the buyer intends to purchase. */
  merchandise: MerchandiseInput;
  /** The quantity of the merchandise that the customer intends to purchase. */
  quantity: Scalars['Int']['input'];
  /**
   * The selling plan associated with the cart line and the effect that each
   * selling plan has on variants when they're purchased.
   */
  sellingPlanAllocation?: InputMaybe<SellingPlanAllocationInput>;
};

/** A cart operation. */
export type CartOperation = ExpandOperation | MergeOperation | UpdateOperation;

/** The cart transform output type. */
export type CartTransform = {
  __typename?: 'CartTransform';
  /** The metafield associated with the cart transform. */
  metafield?: Maybe<Metafield>;
};

/** A cart transform error. */
export type CartTransformError = {
  __typename?: 'CartTransformError';
  /** The error code. */
  code: CartTransformErrorCode;
  /** The error message. */
  message: Scalars['String']['output'];
};

/** The error codes for cart transform errors. */
export enum CartTransformErrorCode {
  /** The cart line was not found. */
  CartLineNotFound = 'CART_LINE_NOT_FOUND',
  /** The input is invalid. */
  InvalidInput = 'INVALID_INPUT',
  /** The operation is invalid. */
  InvalidOperation = 'INVALID_OPERATION',
  /** The merchandise was not found. */
  MerchandiseNotFound = 'MERCHANDISE_NOT_FOUND',
  /** The operation failed. */
  OperationFailed = 'OPERATION_FAILED'
}

/** The input object for the cart transform function. */
export type CartTransformInput = {
  /** The cart to transform. */
  cart: CartInput;
  /** The cart transform metafield. */
  cartTransform?: InputMaybe<CartTransformMetafieldInput>;
};

/** The cart transform metafield input. */
export type CartTransformMetafieldInput = {
  /** Returns a metafield by namespace and key that belongs to the resource. */
  metafield?: InputMaybe<MetafieldInput>;
};

/** The cart transform function result. */
export type CartTransformResult = {
  __typename?: 'CartTransformResult';
  /** The errors that occurred during the cart transform. */
  errors?: Maybe<Array<CartTransformError>>;
  /** The operations to be applied to the cart. */
  operations: Array<CartOperation>;
};

/** A container for all the information required to checkout items and pay. */
export type CheckoutInput = {
  /** The date and time when the checkout was completed. */
  completedAt?: InputMaybe<Scalars['DateTime']['input']>;
  /** The date and time when the checkout was created. */
  createdAt: Scalars['DateTime']['input'];
  /** The email attached to this checkout. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** A globally-unique identifier. */
  id: Scalars['ID']['input'];
  /** The date and time when the checkout was last updated. */
  updatedAt: Scalars['DateTime']['input'];
  /** The URL for the checkout's web page. */
  webUrl: Scalars['URL']['input'];
};

/** A collection represents a grouping of products that a shop owner can create to organize them or make their shops easier to browse. */
export type CollectionInput = {
  /**
   * A human-friendly unique string for the collection automatically generated from its title.
   * Limit of 255 characters.
   */
  handle: Scalars['String']['input'];
  /** A globally-unique identifier. */
  id: Scalars['ID']['input'];
  /** The metafield associated with the resource. */
  metafield?: InputMaybe<MetafieldInput>;
  /** The collection's name. Limit of 255 characters. */
  title: Scalars['String']['input'];
  /** The date and time when the collection was last modified. */
  updatedAt: Scalars['DateTime']['input'];
};

/** The ISO 3166-1 alpha-2 country code. */
export enum CountryCode {
  /** Canada. */
  Ca = 'CA',
  /** United Kingdom. */
  Gb = 'GB',
  /** United States. */
  Us = 'US'
}

/** Currency codes. */
export enum CurrencyCode {
  /** Australian Dollars (AUD). */
  Aud = 'AUD',
  /** Canadian Dollars (CAD). */
  Cad = 'CAD',
  /** Euro (EUR). */
  Eur = 'EUR',
  /** United Kingdom Pounds (GBP). */
  Gbp = 'GBP',
  /** Japanese Yen (JPY). */
  Jpy = 'JPY',
  /** United States Dollars (USD). */
  Usd = 'USD'
}

/** Information about a customer of the shop. */
export type CustomerInput = {
  /** The customer's email address. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** The customer's first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** A unique identifier for the customer. */
  id: Scalars['ID']['input'];
  /** The customer's most recently updated, incomplete checkout. */
  lastIncompleteCheckout?: InputMaybe<CheckoutInput>;
  /** The customer's last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** The customer's phone number. */
  phone?: InputMaybe<Scalars['String']['input']>;
};

/** The method by which the delivery option is made available. */
export enum DeliveryMethodType {
  /** A delivery that is picked up at a local store. */
  Local = 'LOCAL',
  /** A delivery that doesn't need to be shipped or picked up. */
  None = 'NONE',
  /** A delivery that is picked up. */
  Pickup = 'PICKUP',
  /** A delivery that is picked up at a retail store. */
  Retail = 'RETAIL',
  /** A delivery that is shipped. */
  Shipping = 'SHIPPING'
}

/** A delivery profile is a group of shipping options that can be offered to buyers. */
export type DeliveryProfileInput = {
  /** A globally-unique identifier. */
  id: Scalars['ID']['input'];
  /** The name of the delivery profile. */
  name: Scalars['String']['input'];
};

/** A cart line expand operation. */
export type ExpandOperation = {
  __typename?: 'ExpandOperation';
  /** The ID of the cart line. */
  cartLineId: Scalars['ID']['output'];
  /** The expanded cart items. */
  expandedCartItems: Array<ExpandedCartItem>;
  /** The title of the expanded cart line. */
  title?: Maybe<Scalars['String']['output']>;
};

/** An expanded cart item. */
export type ExpandedCartItem = {
  __typename?: 'ExpandedCartItem';
  /** The ID of the merchandise. */
  merchandiseId: Scalars['ID']['output'];
  /** The price adjustment for the cart line item. */
  price?: Maybe<ExpandedCartItemPriceAdjustment>;
  /** The quantity of the merchandise. */
  quantity: Scalars['Int']['output'];
};

/** A price adjustment to apply to an expanded cart item. */
export type ExpandedCartItemPriceAdjustment = {
  __typename?: 'ExpandedCartItemPriceAdjustment';
  /** The price adjustment to apply to the expanded cart item. */
  adjustment: ExpandedCartItemPriceAdjustmentValue;
};

/** A price adjustment value to apply to an expanded cart item. */
export type ExpandedCartItemPriceAdjustmentValue = FixedPricePerUnit;

/** A fixed price adjustment to apply to a merged cart line. */
export type FixedPrice = {
  __typename?: 'FixedPrice';
  /** The fixed price amount for the merged cart line in presentment currency. */
  amount: Scalars['Decimal']['output'];
  /** The currency code of the fixed price amount. */
  currencyCode: CurrencyCode;
};

/** A fixed price per unit adjustment to apply to an expanded cart item. */
export type FixedPricePerUnit = {
  __typename?: 'FixedPricePerUnit';
  /** The fixed price amount per quantity of the expanded cart item in presentment currency. */
  amount: Scalars['Decimal']['output'];
  /** The currency code of the fixed price amount. */
  currencyCode: CurrencyCode;
};

/** Represents an image resource. */
export type ImageInput = {
  /** A word or phrase to share the nature or contents of an image. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** The original height of the image in pixels. Returns `null` if the image is not hosted by Shopify. */
  height?: InputMaybe<Scalars['Int']['input']>;
  /** A unique identifier for the image. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** The location of the original image as a URL. */
  originalSrc: Scalars['URL']['input'];
  /** The location of the image as a URL. */
  src: Scalars['URL']['input'];
  /** The original width of the image in pixels. Returns `null` if the image is not hosted by Shopify. */
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** The root query type. */
export type Input = {
  __typename?: 'Input';
  /** The cart transform for the function. */
  cartTransform?: Maybe<CartTransform>;
};

/** Represents a mailing address for customers and shipping. */
export type MailingAddressInput = {
  /** The first line of the address. Typically the street address or PO Box number. */
  address1?: InputMaybe<Scalars['String']['input']>;
  /** The second line of the address. Typically the number of the apartment, suite, or unit. */
  address2?: InputMaybe<Scalars['String']['input']>;
  /** The name of the city, district, village, or town. */
  city?: InputMaybe<Scalars['String']['input']>;
  /** The name of the customer's company or organization. */
  company?: InputMaybe<Scalars['String']['input']>;
  /** The name of the country. */
  country?: InputMaybe<Scalars['String']['input']>;
  /**
   * The two-letter code for the country of the address.
   * For example, US.
   */
  countryCodeV2?: InputMaybe<CountryCode>;
  /** The first name of the customer. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** A formatted version of the address. */
  formatted: Array<Scalars['String']['input']>;
  /** A comma-separated list of the values for city, province, and country. */
  formattedArea?: InputMaybe<Scalars['String']['input']>;
  /** A globally-unique identifier. */
  id: Scalars['ID']['input'];
  /** The last name of the customer. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** The latitude coordinate of the customer address. */
  latitude?: InputMaybe<Scalars['Float']['input']>;
  /** The longitude coordinate of the customer address. */
  longitude?: InputMaybe<Scalars['Float']['input']>;
  /** The full name of the customer, based on firstName and lastName. */
  name?: InputMaybe<Scalars['String']['input']>;
  /**
   * A unique phone number for the customer.
   * Formatted using E.164 standard. For example, +16135551111.
   */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** The region of the address, such as the province, state, or district. */
  province?: InputMaybe<Scalars['String']['input']>;
  /**
   * The two-letter code for the region.
   * For example, ON.
   */
  provinceCode?: InputMaybe<Scalars['String']['input']>;
  /** The zip or postal code of the address. */
  zip?: InputMaybe<Scalars['String']['input']>;
};

/** Represents information about the merchandise in the cart. */
export type MerchandiseInput = {
  /** The product variant. */
  productVariant?: InputMaybe<ProductVariantInput>;
};

/** A cart line merge operation. */
export type MergeOperation = {
  __typename?: 'MergeOperation';
  /** The IDs of the cart lines to merge. */
  cartLineIds: Array<Scalars['ID']['output']>;
  /** The ID of the parent variant. */
  parentVariantId: Scalars['ID']['output'];
  /** The price adjustment for the merged cart line. */
  price?: Maybe<MergeOperationPriceAdjustment>;
  /** The title of the merged cart line. */
  title?: Maybe<Scalars['String']['output']>;
};

/** A price adjustment to apply to a merged cart line. */
export type MergeOperationPriceAdjustment = {
  __typename?: 'MergeOperationPriceAdjustment';
  /** The price adjustment to apply to the merged cart line. */
  adjustment: MergeOperationPriceAdjustmentValue;
};

/** A price adjustment value to apply to a merged cart line. */
export type MergeOperationPriceAdjustmentValue = FixedPrice;

/**
 * A metafield is a key-value pair that can be attached to various resources in the
 * Shopify ecosystem. It can store custom information.
 */
export type Metafield = {
  __typename?: 'Metafield';
  /** The date and time when the metafield was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The description of a metafield. */
  description?: Maybe<Scalars['String']['output']>;
  /** A globally-unique identifier. */
  id: Scalars['ID']['output'];
  /** The key name for a metafield. */
  key: Scalars['String']['output'];
  /** The namespace for a metafield. */
  namespace: Scalars['String']['output'];
  /** The type of resource that the metafield is attached to. */
  parentResource: MetafieldParentResource;
  /** The type of data stored in the metafield. */
  type: Scalars['String']['output'];
  /** The date and time when the metafield was updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The value of a metafield. */
  value: Scalars['String']['output'];
};

/**
 * A metafield is a key-value pair that can be attached to various resources in the
 * Shopify ecosystem. It can store custom information.
 */
export type MetafieldInput = {
  /** The date and time when the metafield was created. */
  createdAt: Scalars['DateTime']['input'];
  /** The description of a metafield. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** A globally-unique identifier. */
  id: Scalars['ID']['input'];
  /** The key name for a metafield. */
  key: Scalars['String']['input'];
  /** The namespace for a metafield. */
  namespace: Scalars['String']['input'];
  /** The type of resource that the metafield is attached to. */
  parentResource: MetafieldParentResourceInput;
  /** The type of data stored in the metafield. */
  type: Scalars['String']['input'];
  /** The date and time when the metafield was updated. */
  updatedAt: Scalars['DateTime']['input'];
  /** The value of a metafield. */
  value: Scalars['String']['input'];
};

/** A resource that the metafield belongs to. */
export type MetafieldParentResource = {
  __typename?: 'MetafieldParentResource';
  /** The type of resource that the metafield belongs to. */
  type: MetafieldParentResourceType;
};

/** A resource that the metafield belongs to. */
export type MetafieldParentResourceInput = {
  /** The type of resource that the metafield belongs to. */
  type: MetafieldParentResourceType;
};

/** The resource type that the metafield belongs to. */
export enum MetafieldParentResourceType {
  /** The metafield belongs to a cart transform. */
  CartTransform = 'CART_TRANSFORM',
  /** The metafield belongs to a collection. */
  Collection = 'COLLECTION',
  /** The metafield belongs to a company location. */
  CompanyLocation = 'COMPANY_LOCATION',
  /** The metafield belongs to a customer. */
  Customer = 'CUSTOMER',
  /** The metafield belongs to a product. */
  Product = 'PRODUCT',
  /** The metafield belongs to a product image. */
  ProductImage = 'PRODUCT_IMAGE',
  /** The metafield belongs to a product variant. */
  ProductVariant = 'PRODUCT_VARIANT'
}

/** A monetary value with currency. */
export type MoneyV2Input = {
  /** Decimal money amount. */
  amount: Scalars['Decimal']['input'];
  /** Currency of the money. */
  currencyCode: CurrencyCode;
};

/** The root mutation type. */
export type MutationRoot = {
  __typename?: 'MutationRoot';
  /** A placeholder field. */
  placeholder?: Maybe<Scalars['Boolean']['output']>;
};

/** Information about pagination in a connection. */
export type PageInfoInput = {
  /** Indicates if there are more pages to fetch. */
  hasNextPage: Scalars['Boolean']['input'];
  /** Indicates if there are any pages prior to the current page. */
  hasPreviousPage: Scalars['Boolean']['input'];
};

/** An auto-generated type for paginating through multiple ProductCollections. */
export type ProductCollectionConnectionInput = {
  /** A list of edges. */
  edges: Array<ProductCollectionEdgeInput>;
  /** Information to aid in pagination. */
  pageInfo: PageInfoInput;
};

/** An auto-generated type which holds one ProductCollection and a cursor during pagination. */
export type ProductCollectionEdgeInput = {
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['input'];
  /** The item at the end of ProductCollectionEdge. */
  node: CollectionInput;
};

/**
 * A product represents an individual item for sale in a Shopify store. Products are often physical, but they don't have to be.
 * For example, a digital download (such as a movie, music or ebook file) also qualifies as a product, as do services (such as equipment rental, work for hire, customization of another product or an extended warranty).
 */
export type ProductInput = {
  /** A list of collections that this product belongs to. */
  collections?: InputMaybe<ProductCollectionConnectionInput>;
  /** The date and time when the product was created. */
  createdAt: Scalars['DateTime']['input'];
  /**
   * A human-friendly unique string for the Product automatically generated from its title.
   * They are used by the Liquid templating language to refer to objects.
   */
  handle: Scalars['String']['input'];
  /** A globally-unique identifier. */
  id: Scalars['ID']['input'];
  /** The metafield associated with the resource. */
  metafield?: InputMaybe<MetafieldInput>;
  /** The product type specified by the merchant. */
  productType: Scalars['String']['input'];
  /** The date and time when the product was published to the channel. */
  publishedAt: Scalars['DateTime']['input'];
  /** A categorization that a product can be tagged with, commonly used for filtering and searching. */
  tags: Array<Scalars['String']['input']>;
  /** The product's title. */
  title: Scalars['String']['input'];
  /** The date and time when the product was last modified. */
  updatedAt: Scalars['DateTime']['input'];
  /**
   * Find a product's variant based on its selected options.
   * This is useful for converting a user's selection of product options into a single matching variant.
   * If there is not a variant for the selected options, `null` will be returned.
   */
  variantBySelectedOptions?: InputMaybe<ProductVariantInput>;
  /** List of the product's variants. */
  variants?: InputMaybe<ProductVariantConnectionInput>;
  /** The product's vendor name. */
  vendor: Scalars['String']['input'];
};

/** An auto-generated type for paginating through multiple ProductVariants. */
export type ProductVariantConnectionInput = {
  /** A list of edges. */
  edges: Array<ProductVariantEdgeInput>;
  /** Information to aid in pagination. */
  pageInfo: PageInfoInput;
};

/** An auto-generated type which holds one ProductVariant and a cursor during pagination. */
export type ProductVariantEdgeInput = {
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['input'];
  /** The item at the end of ProductVariantEdge. */
  node: ProductVariantInput;
};

/** A product variant represents a different version of a product, such as differing sizes or differing colors. */
export type ProductVariantInput = {
  /** Indicates if the product variant is available for sale. */
  availableForSale: Scalars['Boolean']['input'];
  /** The barcode (for example, ISBN, UPC, or GTIN) associated with the variant. */
  barcode?: InputMaybe<Scalars['String']['input']>;
  /**
   * The compare at price of the variant. This can be used to mark a variant as on
   * sale, when `compareAtPrice` is higher than `price`.
   */
  compareAtPrice?: InputMaybe<MoneyV2Input>;
  /** The date and time when the variant was created. */
  createdAt: Scalars['DateTime']['input'];
  /** The delivery profile for the variant. */
  deliveryProfile?: InputMaybe<DeliveryProfileInput>;
  /**
   * The display name of the variant, based on product options. If there is only
   * one variant, the display name will be blank.
   */
  displayName: Scalars['String']['input'];
  /** A globally-unique identifier. */
  id: Scalars['ID']['input'];
  /** The featured image for the variant. */
  image?: InputMaybe<ImageInput>;
  /** The metafield associated with the resource. */
  metafield?: InputMaybe<MetafieldInput>;
  /** The product that this variant belongs to. */
  product: ProductInput;
  /** The total sellable quantity of the variant for online sales channels. */
  quantityAvailable?: InputMaybe<Scalars['Int']['input']>;
  /** The SKU (stock keeping unit) associated with the variant. */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** The title of the product variant. */
  title: Scalars['String']['input'];
  /** The weight of the product variant in the unit system specified with `weight_unit`. */
  weight?: InputMaybe<Scalars['Float']['input']>;
  /** Unit of measurement for weight. */
  weightUnit: WeightUnit;
};

/** The input fields for a selected option. */
export type SelectedOptionInput = {
  /** The product option's name. */
  name: Scalars['String']['input'];
  /** The product option's value. */
  value: Scalars['String']['input'];
};

/**
 * Represents an association between a variant and a selling plan. Selling plan
 * allocations describe the options offered for each variant, and the price of the
 * variant when purchased with a selling plan.
 */
export type SellingPlanAllocationInput = {
  /**
   * A list of price adjustments, with a maximum of two. When there are two, the
   * first price adjustment goes into effect at the time of purchase, while the
   * second one starts after a certain number of orders. A price adjustment
   * represents how a selling plan affects pricing when a variant is purchased with
   * a selling plan. Prices display in the customer's currency if the shop is
   * configured for it.
   */
  priceAdjustments: Array<SellingPlanAllocationPriceAdjustmentInput>;
  /**
   * A representation of how products and variants can be sold and purchased. For
   * example, an individual selling plan could be '6 weeks of prepaid granola,
   * delivered weekly'.
   */
  sellingPlan: SellingPlanInput;
};

/** The resulting prices for variants when they're purchased with a specific selling plan. */
export type SellingPlanAllocationPriceAdjustmentInput = {
  /**
   * The effective price for a single delivery. For example, for a prepaid
   * subscription plan that includes 6 deliveries at the price of $48.00, the per
   * delivery price is $8.00.
   */
  perDeliveryPrice: MoneyV2Input;
  /**
   * The price of the variant when it's purchased with a selling plan For example,
   * for a prepaid subscription plan that includes 6 deliveries of $10.00 granola,
   * where the customer gets 20% off, the price is 6 x $10.00 x 0.80 = $48.00.
   */
  price: MoneyV2Input;
};

/** Represents how products and variants can be sold and purchased. */
export type SellingPlanInput = {
  /** The description of the selling plan. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** A globally-unique identifier. */
  id: Scalars['ID']['input'];
  /** Returns a metafield by namespace and key that belongs to the resource. */
  metafield?: InputMaybe<MetafieldInput>;
  /** The name of the selling plan. For example, '6 weeks of prepaid granola, delivered weekly'. */
  name: Scalars['String']['input'];
  /** Whether purchasing the selling plan will result in multiple deliveries. */
  recurringDeliveries: Scalars['Boolean']['input'];
};

/** A cart line update operation. */
export type UpdateOperation = {
  __typename?: 'UpdateOperation';
  /** The ID of the cart line. */
  cartLineId: Scalars['ID']['output'];
  /** The price adjustment for the updated cart line. */
  price?: Maybe<UpdateOperationPriceAdjustment>;
  /** The title of the updated cart line. */
  title?: Maybe<Scalars['String']['output']>;
};

/** A price adjustment to apply to an updated cart line. */
export type UpdateOperationPriceAdjustment = {
  __typename?: 'UpdateOperationPriceAdjustment';
  /** The price adjustment to apply to the updated cart line. */
  adjustment: UpdateOperationPriceAdjustmentValue;
};

/** A price adjustment value to apply to an updated cart line. */
export type UpdateOperationPriceAdjustmentValue = FixedPricePerUnit;

/** Units of measurement for weight. */
export enum WeightUnit {
  /** Metric system unit of mass. */
  Grams = 'GRAMS',
  /** 1 kilogram equals 1000 grams. */
  Kilograms = 'KILOGRAMS',
  /** Imperial system unit of mass. */
  Ounces = 'OUNCES',
  /** 1 pound equals 16 ounces. */
  Pounds = 'POUNDS'
}

export type RunInputVariables = Exact<{ [key: string]: never; }>;


export type RunInput = { __typename?: 'Input', cartTransform?: { __typename: 'CartTransform' } | null };
