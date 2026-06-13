const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique order ID
 * Format: PPY-XXXXXXXX-XXXX (timestamp + random suffix)
 */
function generateOrderId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().split('-')[0].toUpperCase();
  return `PPY${timestamp}${random}`;
}

module.exports = { generateOrderId };
