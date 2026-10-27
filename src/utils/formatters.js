/**
 * Indian Numbering and Currency Formatters.
 * Formats monetary amounts in Indian Rupees (INR, ₹).
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Format a number into Indian Rupee currency string.
 * Example: 1499 -> "₹1,499", 25000 -> "₹25,000"
 * @param {number|string} amount
 * @returns {string}
 */
export function formatINR(amount) {
  const num = Number(amount);
  if (Number.isNaN(num)) return '₹0';
  return inrFormatter.format(Math.round(num));
}

/**
 * Format Indian numbering with commas without currency symbol.
 * Example: 200000 -> "2,00,000"
 * @param {number|string} val
 * @returns {string}
 */
export function formatIndianNumber(val) {
  const num = Number(val);
  if (Number.isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(Math.round(num));
}
