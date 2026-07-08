/**
 * @typedef {Object} PricingRow
 * @property {string} name
 * @property {number=} price
 * @property {number=} premium
 * @property {number=} rate
 * @property {number=} pricePerLF
 * @property {number=} finLF
 */

/**
 * @typedef {Object} PricingTables
 * @property {PricingRow[]} woodwork
 * @property {PricingRow[]} construction
 * @property {PricingRow[]} wood
 * @property {PricingRow[]} upgrades
 * @property {PricingRow[]} countertops
 * @property {PricingRow[]} finishing
 * @property {PricingRow[]} installType
 */

/**
 * @typedef {Object} QuoteProject
 * @property {string|number} id
 * @property {string} name
 * @property {string} address
 * @property {string=} contactName
 * @property {string=} contactPhone
 * @property {string=} email
 * @property {string=} bidDate
 * @property {string|number=} deliveryAmount
 * @property {boolean=} noDelivery
 * @property {boolean=} taxEnabled
 * @property {string|number=} taxRate
 */

/**
 * @typedef {Object} QuoteRoom
 * @property {string} name
 * @property {Array<Object>} cabinetry
 * @property {Array<Object>} upgrades
 * @property {Array<Object>} countertops
 * @property {Array<Object>} finishing
 * @property {Object} install
 */

export {}
