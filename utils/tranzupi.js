const axios = require('axios');

const TRANZUPI_BASE_URL = process.env.TRANZUPI_BASE_URL || 'https://tranzupi.com';
const TRANZUPI_TOKEN = process.env.TRANZUPI_TOKEN;

/**
 * TranzUPI API client.
 * All requests go through the backend - token is NEVER exposed to frontend.
 */
const tranzupi = {
  /**
   * Create a new payment order with TranzUPI
   * @param {Object} params - { customer_mobile, amount, order_id, redirect_url, remark1, remark2 }
   * @returns {Object} TranzUPI response data
   */
  async createOrder({ customer_mobile, amount, order_id, redirect_url, remark1, remark2 }) {
    try {
      const response = await axios.post(
        `${TRANZUPI_BASE_URL}/api/create-order`,
        {
          customer_mobile,
          user_token: TRANZUPI_TOKEN,
          amount,
          order_id,
          redirect_url,
          remark1: remark1 || '',
          remark2: remark2 || ''
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );
      return { success: true, data: response.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data || err.message,
        status: err.response?.status || 500
      };
    }
  },

  /**
   * Check order status with TranzUPI
   * @param {String} order_id
   * @returns {Object} TranzUPI response data
   */
  async checkOrderStatus(order_id) {
    try {
      const response = await axios.post(
        `${TRANZUPI_BASE_URL}/api/check-order-status`,
        {
          user_token: TRANZUPI_TOKEN,
          order_id
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );
      return { success: true, data: response.data };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data || err.message,
        status: err.response?.status || 500
      };
    }
  }
};

module.exports = tranzupi;
