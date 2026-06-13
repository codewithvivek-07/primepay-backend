const express = require('express');
const router = express.Router();
const { createOrder, getOrderStatus } = require('../controllers/orderController');

// POST /api/create-order - create a new payment order + QR
router.post('/create-order', createOrder);

// GET /api/order-status/:orderId - poll payment status
router.get('/order-status/:orderId', getOrderStatus);

module.exports = router;
