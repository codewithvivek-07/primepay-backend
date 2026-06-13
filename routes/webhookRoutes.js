const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhookController');

// POST /api/tranzupi-webhook - receives payment notifications from TranzUPI
router.post('/tranzupi-webhook', handleWebhook);

module.exports = router;
