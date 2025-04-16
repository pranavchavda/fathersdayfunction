/**
 * @typedef {Object} RunInput
 * @property {Cart} cart - The cart object
 */

/**
 * @typedef {Object} Cart
 * @property {CartLine[]} lines - The cart lines
 * @property {CartCost} cost - The cart cost
 */

/**
 * @typedef {Object} CartLine
 * @property {string} id - The cart line ID
 * @property {number} quantity - The quantity
 * @property {Merchandise} merchandise - The merchandise
 * @property {LineCost} cost - The line cost
 */

/**
 * @typedef {Object} Merchandise
 * @property {string} __typename - The type name
 * @property {string} id - The merchandise ID
 * @property {Product} product - The product
 */

/**
 * @typedef {Object} Product
 * @property {string} id - The product ID
 * @property {string} title - The product title
 * @property {CollectionConnection} collections - The collections
 * @property {string[]} tags - The product tags
 */

/**
 * @typedef {Object} CollectionConnection
 * @property {CollectionEdge[]} edges - The collection edges
 */

/**
 * @typedef {Object} CollectionEdge
 * @property {Collection} node - The collection node
 */

/**
 * @typedef {Object} Collection
 * @property {string} id - The collection ID
 */

/**
 * @typedef {Object} LineCost
 * @property {Money} totalAmount - The total amount
 */

/**
 * @typedef {Object} CartCost
 * @property {Money} subtotalAmount - The subtotal amount
 * @property {Money} totalAmount - The total amount
 */

/**
 * @typedef {Object} Money
 * @property {string} amount - The amount
 * @property {string} currencyCode - The currency code
 */

/**
 * @typedef {Object} FunctionRunResult
 * @property {Operation[]} operations - The operations to perform
 */

/**
 * @typedef {Object} Operation
 * @property {AddOperation} [add] - Add operation
 * @property {RemoveOperation} [remove] - Remove operation
 */

/**
 * @typedef {Object} AddOperation
 * @property {string} merchandiseId - The merchandise ID to add
 * @property {number} quantity - The quantity to add
 * @property {Attribute[]} [attributes] - The attributes
 */

/**
 * @typedef {Object} RemoveOperation
 * @property {string} id - The cart line ID to remove
 */

/**
 * @typedef {Object} Attribute
 * @property {string} key - The attribute key
 * @property {string} value - The attribute value
 */
