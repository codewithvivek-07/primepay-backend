const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getStats,
  exportCSV,
  getTransaction
} = require('../controllers/transactionController');

// GET /api/dashboard/stats - summary stats
router.get('/dashboard/stats', getStats);

// GET /api/transactions/export - export CSV (must be before /:orderId)
router.get('/transactions/export', exportCSV);

// GET /api/transactions - list/search transactions
router.get('/transactions', getTransactions);

// GET /api/transactions/:orderId - single transaction
router.get('/transactions/:orderId', getTransaction);

module.exports = router;
