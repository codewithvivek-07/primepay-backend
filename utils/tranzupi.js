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
      console.log('--- TranzUPI API Request debug ---');
      console.log('TRANZUPI_BASE_URL:', TRANZUPI_BASE_URL);
      console.log('TRANZUPI_TOKEN configured:', !!TRANZUPI_TOKEN);
      if (TRANZUPI_TOKEN) {
        console.log('TRANZUPI_TOKEN length:', TRANZUPI_TOKEN.length);
        console.log('TRANZUPI_TOKEN format:', TRANZUPI_TOKEN.substring(0, 4) + '...' + TRANZUPI_TOKEN.substring(TRANZUPI_TOKEN.length - 4));
      }
      
      const payload = {
        customer_mobile,
        user_token: TRANZUPI_TOKEN,
        amount,
        order_id,
        redirect_url,
        remark1: remark1 || '',
        remark2: remark2 || ''
      };
      
      console.log('Sending payload:', {
        ...payload,
        user_token: TRANZUPI_TOKEN ? (TRANZUPI_TOKEN.substring(0, 4) + '...' + TRANZUPI_TOKEN.substring(TRANZUPI_TOKEN.length - 4)) : 'MISSING'
      });

      const response = await axios.post(
        `${TRANZUPI_BASE_URL}/api/create-order`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );
      console.log('TranzUPI response data:', response.data);
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
      console.log('--- TranzUPI checkOrderStatus debug ---');
      console.log('order_id:', order_id);
      const payload = {
        user_token: TRANZUPI_TOKEN,
        order_id
      };
      console.log('Sending check status payload:', {
        ...payload,
        user_token: TRANZUPI_TOKEN ? (TRANZUPI_TOKEN.substring(0, 4) + '...' + TRANZUPI_TOKEN.substring(TRANZUPI_TOKEN.length - 4)) : 'MISSING'
      });
      const response = await axios.post(
        `${TRANZUPI_BASE_URL}/api/check-order-status`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );
      console.log('TranzUPI check status response:', response.data);
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
