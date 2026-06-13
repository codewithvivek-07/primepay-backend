const { db } = require('../models/db');

/**
 * GET /api/transactions
 * List/search transactions with optional filters
 */
async function getTransactions(req, res) {
  try {
    const { status, orderId, utr } = req.query;

    const filter = {};
    if (status && ['PENDING', 'SUCCESS', 'FAILURE'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }
    if (orderId) filter.orderId = orderId;
    if (utr) filter.utr = utr;

    const transactions = await db.findAll(filter);

    return res.json({
      success: true,
      count: transactions.length,
      transactions: transactions.map(t => ({
        orderId: t.orderId,
        amount: t.amount,
        status: t.status,
        utr: t.utr,
        customerMobile: t.customerMobile,
        createdAt: t.createdAt,
        completedAt: t.completedAt
      }))
    });
  } catch (err) {
    console.error('Get transactions error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch transactions.' });
  }
}

/**
 * GET /api/dashboard/stats
 * Returns summary statistics
 */
async function getStats(req, res) {
  try {
    const stats = await db.stats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('Get stats error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch statistics.' });
  }
}

/**
 * GET /api/transactions/export
 * Export all transactions as CSV
 */
async function exportCSV(req, res) {
  try {
    const transactions = await db.findAll({});

    const headers = ['Order ID', 'Amount', 'Status', 'UTR', 'Customer Mobile', 'Created At', 'Completed At'];
    const rows = transactions.map(t => [
      t.orderId,
      t.amount,
      t.status,
      t.utr || '',
      t.customerMobile || '',
      t.createdAt ? new Date(t.createdAt).toISOString() : '',
      t.completedAt ? new Date(t.completedAt).toISOString() : ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="primepay-transactions-${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    return res.status(500).json({ success: false, message: 'Unable to export transactions.' });
  }
}

/**
 * GET /api/transactions/:orderId
 * Get single transaction details (for receipts)
 */
async function getTransaction(req, res) {
  try {
    const { orderId } = req.params;
    const txn = await db.findOne(orderId);

    if (!txn) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    return res.json({
      success: true,
      transaction: {
        orderId: txn.orderId,
        amount: txn.amount,
        status: txn.status,
        utr: txn.utr,
        customerMobile: txn.customerMobile,
        createdAt: txn.createdAt,
        completedAt: txn.completedAt
      }
    });
  } catch (err) {
    console.error('Get transaction error:', err);
    return res.status(500).json({ success: false, message: 'Unable to fetch transaction.' });
  }
}

module.exports = { getTransactions, getStats, exportCSV, getTransaction };
